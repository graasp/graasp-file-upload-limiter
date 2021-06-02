import { FastifyPluginAsync } from "fastify";
import { Actor, Item, Member, PostHookHandlerType, PreHookHandlerType, UnknownExtra } from "graasp";

interface GraaspS3FileItemOptions {
  type: string;
  sizePath: string;
}

type MemberExtra = {
  storage: {
    total: number;
  };
};

const DEFAULT_MAX_STORAGE = 1024 * 1024 * 1024 * 15; // 15GB;

class StorageExceeded extends Error {
  message = "The allowed storage is full";
  name = "StorageExceededError";
  origin = "plugin";
  code = 507;
}

const plugin: FastifyPluginAsync<GraaspS3FileItemOptions> = async (fastify, options) => {
  const {
    items: { taskManager },
    members: { taskManager: mTaskManager, dbService: mDbService },
    taskRunner: runner,
    log,
  } = fastify;
  const { type: itemType, sizePath } = options;

  if (!itemType || !sizePath) {
    throw new Error("graasp-file-upload-limiter: missing plugin options");
  }

  const getMemberStorageFromExtra = (extra: MemberExtra) => extra?.storage?.total || 0;

  const getFileSize = (item: Partial<Item<UnknownExtra>>): number => {
    const properties = sizePath.split(".");
    const sizeField = properties.reduce((prev, curr) => prev?.[curr], item);

    if (Number.isInteger(sizeField)) {
      return sizeField;
    }

    throw new Error("sizePath does not lead to a size number");
  };

  // increase the actor storage by the given item size
  const increaseStorage: PostHookHandlerType<Item<UnknownExtra>> = async (item, actor) => {
    const { type } = item;

    // enabled only on given item type
    if (type !== itemType) return;

    const size = getFileSize(item);
    // the file size is not available
    if (size <= 0) return;

    const member = actor as Member<MemberExtra>;
    let currentStorage = getMemberStorageFromExtra(member.extra);

    const task = mTaskManager.createUpdateTask(actor, actor.id, {
      extra: { storage: { total: currentStorage + size } },
    });
    runner.runSingle(task, log);
  };

  // decrease the actor storage by the given item size
  const decreaseStorage: PostHookHandlerType<Item<UnknownExtra>> = async (item, actor) => {
    const { type } = item;

    // enabled only on given item type
    if (type !== itemType) return;

    const size = getFileSize(item);
    // the file size is not available
    if (size <= 0) return;

    const { id, extra: memberExtra } = actor as Member<MemberExtra>;
    let currentStorage = getMemberStorageFromExtra(memberExtra);

    const task = mTaskManager.createUpdateTask(actor, id, {
      extra: { storage: { total: Math.max(currentStorage - size, 0) } },
    });
    runner.runSingle(task, log);
  };

  // check the user has enough storage to create a new item given its size
  // the item might not contain a size,
  // in this case this function will throw an error only when the storage is exceeded
  const checkRemainingStorage: PreHookHandlerType<Item<UnknownExtra>> = async (item, actor) => {
    // enabled only on given item type
    if (item.type !== itemType) return;

    const size = getFileSize(item);

    const { extra: memberExtra } = actor as Member<MemberExtra>;
    let currentStorage = getMemberStorageFromExtra(memberExtra);

    if (currentStorage + size > DEFAULT_MAX_STORAGE) {
      throw new StorageExceeded();
    }
  };

  // register pre create handler to prevent file creation when allowed storage is exceeded
  // register pre create handler to increase member storage total size
  const createItemTaskName = taskManager.getCreateTaskName();
  runner.setTaskPreHookHandler<Item<UnknownExtra>>(createItemTaskName, checkRemainingStorage);
  runner.setTaskPostHookHandler<Item<UnknownExtra>>(createItemTaskName, increaseStorage);

  // register post update handler to increase member storage total size
  // this case happens for s3 when the file size is available after upload only
  // in this case the user might exceed its given storage but will be prevented to upload on item create
  const updateItemTaskName = taskManager.getUpdateTaskName();
  runner.setTaskPostHookHandler<Item<UnknownExtra>>(
    updateItemTaskName,
    async (item, actor, handlers, data) => {
      // trigger this hook only if the size is shoved into the item

      const itemData = data as Partial<Item<UnknownExtra>>;
      const size = getFileSize(itemData);
      if (!size) return;

      await increaseStorage({ ...item, ...itemData }, actor, handlers, data);
    }
  );

  // register pre copy handler to prevent file creation when allowed storage is exceeded
  // register post copy handler to increase member storage total size
  const copyItemTaskName = taskManager.getCopyTaskName();
  runner.setTaskPreHookHandler<Item<UnknownExtra>>(copyItemTaskName, checkRemainingStorage);
  runner.setTaskPostHookHandler<Item<UnknownExtra>>(copyItemTaskName, increaseStorage);

  // register post delete handler to decrease member storage total size
  const deleteItemTaskName = taskManager.getDeleteTaskName();
  runner.setTaskPostHookHandler<Item<UnknownExtra>>(deleteItemTaskName, decreaseStorage);
};

export default plugin;
