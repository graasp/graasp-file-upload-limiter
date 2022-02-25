import { FastifyPluginAsync } from 'fastify';
import { Item, Member, PreHookHandlerType } from 'graasp';
import { FileUploadLimiterDbService } from './db-service';
import { DEFAULT_MAX_STORAGE } from './utils/constants';
import { FileSizeNotFound, StorageExceeded } from './utils/errors';
import { GraaspFileUploadLimiterOptions } from './utils/types';

const plugin: FastifyPluginAsync<GraaspFileUploadLimiterOptions> = async (fastify, options) => {
  const {
    items: { taskManager: iTM },
    taskRunner: runner,
  } = fastify;
  const { type: itemType, sizePath, maxMemberStorage = DEFAULT_MAX_STORAGE } = options;

  if (!itemType || !sizePath) {
    throw new Error('graasp-file-upload-limiter: missing plugin options');
  }

  const dbService = new FileUploadLimiterDbService(sizePath);

  const getFileSize = (extra): number => {
    const properties = sizePath.split('.');
    const sizeField = properties.reduce((prev, curr) => prev?.[curr], extra);

    if (Number.isInteger(sizeField)) {
      return sizeField;
    }

    throw new FileSizeNotFound();
  };

  // check the user has enough storage to create a new item given its size
  // get the complete storage
  const checkRemainingStorage: PreHookHandlerType<Item> = async (item, actor, { handler }) => {
    // enabled only on given item type
    if (item.type !== itemType) return;

    let size = 0;
    try {
      size = getFileSize(item.extra);
    } catch (e) {
      // s3 file item might not contain file size at creation
      if (!(e instanceof FileSizeNotFound)) {
        throw e;
      }
    }
    const { id: memberId } = actor as Member;

    const currentStorage = await dbService.getMemberStorage({ memberId, itemType }, handler);

    if (currentStorage + size > maxMemberStorage) {
      throw new StorageExceeded();
    }
  };

  // prehook on create if handled in plugin-file-item

  // register pre copy handler to prevent file creation when allowed storage is exceeded
  const copyItemTaskName = iTM.getCopyTaskName();
  runner.setTaskPreHookHandler(copyItemTaskName, checkRemainingStorage);
};

export default plugin;
