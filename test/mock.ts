import { Item } from 'graasp';
import { ItemMembershipTaskManager, TaskRunner, Task } from 'graasp-test';
import TaskManager from '../src/task-manager';

export const mockcreateGetOfItemTaskSequence = (
  data: Partial<Item> | Error,
  shouldThrow?: boolean,
): jest.SpyInstance => {
  const mockCreateTask = jest
    .spyOn(ItemMembershipTaskManager.prototype, 'createGetOfItemTaskSequence')
    .mockImplementation(() => {
      return [new Task(data), new Task(data)];
    });
  jest.spyOn(TaskRunner.prototype, 'runSingleSequence').mockImplementation(async () => {
    if (shouldThrow) throw data;
    return data;
  });
  return mockCreateTask;
};

export const mockCreateUploadFileTask = (data: boolean | Error): jest.SpyInstance => {
  const mockTask = jest
    .spyOn(TaskManager.prototype, 'createUploadFileTask')
    .mockImplementation(() => {
      return new Task(data);
    });
  return mockTask;
};

export const mockCreateDownloadFileTask = (data: boolean | Error): jest.SpyInstance => {
  const mockTask = jest
    .spyOn(TaskManager.prototype, 'createDownloadFileTask')
    .mockImplementation(() => {
      return new Task(data);
    });
  return mockTask;
};
