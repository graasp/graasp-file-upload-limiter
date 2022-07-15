import fastify from 'fastify';

import { ItemTaskManager } from '@graasp/sdk';
import { TaskRunner } from 'graasp-test';

import plugin from '../src/plugin';
import { GraaspFileUploadLimiterOptions } from '../src/utils/types';

const build = async ({
  runner,
  itemTaskManager,
  options,
}: {
  runner: TaskRunner;
  itemTaskManager: ItemTaskManager;
  options?: GraaspFileUploadLimiterOptions;
}) => {
  const app = fastify();

  app.decorate('items', { taskManager: itemTaskManager });

  app.decorate('taskRunner', runner);
  await app.register(plugin, options);

  return app;
};
export default build;
