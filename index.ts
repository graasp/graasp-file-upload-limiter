import { FastifyPluginAsync } from "fastify";
import { sql } from "slonik";
import { Item, Member, PreHookHandlerType } from "graasp";

const DEFAULT_MAX_STORAGE = 1024 * 1024 * 100; // 100MB;

interface GraaspFileUploadLimiterOptions {
  /** Item type to target (ex: 'file', 's3File') */
  type: string;
  /** Chain of property names to the file size (ex: 'extra.s3File.size')  */
  sizePath: string;
  /** Maximum storage size for a user in bytes (default to 100MB)  */
  maxMemberStorage?: number;
}

type MemberExtra = {
  storage: {
    total: number;
  };
};

class StorageExceeded extends Error {
  message = "The allowed storage is full";
  name = "StorageExceededError";
  origin = "plugin";
  code = 507;
}

const plugin: FastifyPluginAsync<GraaspFileUploadLimiterOptions> = async (fastify, options) => {
  const {
    items: { taskManager },
    taskRunner: runner,
    db,
  } = fastify;
  const { type: itemType, sizePath, maxMemberStorage = DEFAULT_MAX_STORAGE } = options;

  if (!itemType || !sizePath) {
    throw new Error("graasp-file-upload-limiter: missing plugin options");
  }

  const getFileSize = (item): number => {
    const properties = sizePath.split(".");
    const sizeField = properties.reduce((prev, curr) => prev?.[curr], item);

    if (Number.isInteger(sizeField)) {
      return sizeField;
    }

    throw new Error("sizePath does not lead to a size number");
  };

  const getMemberStorage = (id: string) => {
    // todo: fetch total storage from Redis

    // -- the following solution is failing because it cannot extract property from jsonb
    // const column = sql.join(["extra", "file", "size"], sql`->`);
    // return db.pool
    //   .oneFirst<string>(
    //     sql`
    //        SELECT
    //        SUM((${column})) as size
    //        FROM item
    //        WHERE item.type ='file' AND item.creator = ${id}`
    //   )
    //   .then((size) => parseInt(size, 10) || 0);

    // select all file extra for given member
    return (
      db.pool
        .query<any>(
          sql`
            SELECT extra
            FROM item 
            WHERE item.type =${itemType} AND item.creator = ${id}`
        )
        // sum up
        .then(({ rows }) => rows.reduce((acc, item) => getFileSize(item) + acc, 0))
    );
  };

  // check the user has enough storage to create a new item given its size
  // get the complete storage
  const checkRemainingStorage: PreHookHandlerType<Item> = async (item, actor) => {
    // enabled only on given item type
    if (item.type !== itemType) return;

    const size = getFileSize(item);

    const { id: memberId } = actor as Member<MemberExtra>;
    const currentStorage = await getMemberStorage(memberId);

    if (currentStorage + size > maxMemberStorage) {
      throw new StorageExceeded();
    }
  };

  // register pre create handler to prevent file creation when allowed storage is exceeded
  const createItemTaskName = taskManager.getCreateTaskName();
  runner.setTaskPreHookHandler(createItemTaskName, checkRemainingStorage);

  // register pre copy handler to prevent file creation when allowed storage is exceeded
  const copyItemTaskName = taskManager.getCopyTaskName();
  runner.setTaskPreHookHandler(copyItemTaskName, checkRemainingStorage);
};

export default plugin;
