import { FastifyPluginAsync } from 'fastify';

import { Item, Member, PreHookHandlerType } from '@graasp/sdk';

import { FileUploadLimiterDbService } from './db-service';
import { DEFAULT_MAX_STORAGE } from './utils/constants';
import { FileSizeNotFound, StorageExceeded } from './utils/errors';
import { GraaspFileUploadLimiterOptions } from './utils/types';
import { getFileSize } from './utils/utils';

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

  // check the user has enough storage to create a new item given its size
  // get the complete storage
  const checkRemainingStorage: PreHookHandlerType<Item> = async (item, actor, { handler }) => {
    // enabled only on given item type
    if (item.type !== itemType) return;

    let size = 0;
    try {
      size = getFileSize(item.extra, sizePath);
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

  // prehook on create handled in plugin-file-item

  // register pre copy handler to prevent file creation when allowed storage is exceeded
  const copyItemTaskName = iTM.getCopyTaskName();
  runner.setTaskPreHookHandler(copyItemTaskName, checkRemainingStorage);
};

export default plugin;
