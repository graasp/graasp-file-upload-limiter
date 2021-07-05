import { FastifyPluginAsync } from "fastify";
import { DatabaseTransactionConnectionType, sql } from "slonik";
import { DatabaseTransactionHandler, Item, Member, PreHookHandlerType, UnknownExtra } from "graasp";

const DEFAULT_MAX_STORAGE = 1024 * 1024 * 100; // 100MB;

interface GraaspFileUploadLimiterOptions {
  /** Item type to target (ex: 'file', 's3File') */
  type: string;
  /** Chain of property names to the file size (ex: 's3File.size')
   * size must be defined in extra
   */
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
  } = fastify;
  const { type: itemType, sizePath, maxMemberStorage = DEFAULT_MAX_STORAGE } = options;

  if (!itemType || !sizePath) {
    throw new Error("graasp-file-upload-limiter: missing plugin options");
  }

  const getFileSize = (extra: UnknownExtra): number => {
    const properties = sizePath.split(".");
    const sizeField = properties.reduce(
      (prev: UnknownExtra | { [key: string]: any } | undefined, curr: string) => prev?.[curr],
      extra
    );

    if (Number.isInteger(sizeField)) {
      return parseInt(sizeField as string);
    }

    throw new Error("sizePath does not lead to a size number");
  };

  const getMemberStorage = (
    id: string,
    handler: DatabaseTransactionConnectionType
  ): Promise<number> => {
    // todo: fetch total storage from Redis

    // select all file extra for given member
    const properties = sizePath.split(".");
    const propertiesPath = sql.join(properties, sql`->`);
    return (
      handler
        .query(
          sql`
            SELECT 
            SUM((extra->${propertiesPath})::int)
            FROM item 
            WHERE item.type =${itemType} AND item.creator = ${id}`
        )
        // sum up
        .then(({ rows }) => rows[0].sum as number)
    );
  };

  // check the user has enough storage to create a new item given its size
  // get the complete storage
  const checkRemainingStorage: PreHookHandlerType<Item> = async (item, actor, { handler }) => {
    // enabled only on given item type and if extra is defined
    if (item.type !== itemType || !item.extra) return;

    if (!handler) {
      throw new Error("handler is not defined");
    }

    const size = getFileSize(item.extra);

    const { id: memberId } = actor as Member<MemberExtra>;
    const currentStorage = await getMemberStorage(memberId, handler);

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
