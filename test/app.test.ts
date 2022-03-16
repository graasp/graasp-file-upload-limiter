import { DatabaseTransactionHandler } from 'graasp';
import { TaskRunner, ItemTaskManager } from 'graasp-test';
import { DEFAULT_MAX_STORAGE } from '../src/utils/constants';
import { FileUploadLimiterDbService } from '../src/db-service';
import build from './app';
import { DEFAULT_SIZE_PATH, DEFAULT_TYPE, GRAASP_ACTOR, MOCK_ITEM } from './fixtures';
import { StorageExceeded } from '../src/utils/errors';

const runner = new TaskRunner();
const itemTaskManager = new ItemTaskManager();

const buildMockHandler = (getMemberStorageValue: number = 1) =>
  ({
    query: async () => ({ rows: [{ sum: getMemberStorageValue }] }),
  } as unknown as DatabaseTransactionHandler);

const buildOptions = ({
  type = DEFAULT_TYPE,
  sizePath = DEFAULT_SIZE_PATH,
  maxMemberStorage,
}: {
  type?: string;
  sizePath?: string;
  maxMemberStorage?: number;
} = {}) => ({
  runner,
  itemTaskManager,
  options: { type, sizePath, maxMemberStorage },
});

describe('Plugin File Upload Limiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(TaskRunner.prototype, 'runSingleSequence').mockImplementation(async (tasks) => {
      return tasks[0]?.getResult();
    });
  });

  describe('Options', () => {
    beforeEach(() => {
      jest.spyOn(runner, 'setTaskPostHookHandler').mockImplementation(() => {
        // do nothing
      });
      jest.spyOn(runner, 'setTaskPreHookHandler').mockImplementation(() => {
        // do nothing
      });
    });
    it('Valid options should resolve', async () => {
      const app = await build(buildOptions());
      expect(app).toBeTruthy();
    });
    it('Invalid type should throw', async () => {
      expect(async () => await build(buildOptions({ type: null }))).rejects.toThrow(Error);
    });
    it('Invalid sizePath should throw', async () => {
      expect(async () => await build(buildOptions({ sizePath: null }))).rejects.toThrow(Error);
    });
  });

  describe('Copy prehook handler', () => {
    // eslint-disable-next-line quotes
    it("Copying an item check member storage, and proceed since it's smaller", (done) => {
      const getStorageMock = jest.spyOn(FileUploadLimiterDbService.prototype, 'getMemberStorage');

      jest.spyOn(runner, 'setTaskPreHookHandler').mockImplementation(async (name, fn) => {
        if (name === itemTaskManager.getCopyTaskName()) {
          const storage = DEFAULT_MAX_STORAGE - MOCK_ITEM.extra.file.size - 1;
          await fn(MOCK_ITEM, GRAASP_ACTOR, { handler: buildMockHandler(storage), log: undefined });
          expect(getStorageMock).toHaveBeenCalled();
          done();
        }
      });

      build(buildOptions());
    });
    it('Throws if exceed storage', (done) => {
      jest.spyOn(runner, 'setTaskPreHookHandler').mockImplementation(async (name, fn) => {
        if (name === itemTaskManager.getCopyTaskName()) {
          const storage = DEFAULT_MAX_STORAGE;
          expect(
            fn(MOCK_ITEM, GRAASP_ACTOR, { handler: buildMockHandler(storage), log: undefined }),
          ).rejects.toBeInstanceOf(StorageExceeded);

          done();
        }
      });

      build(buildOptions());
    });
  });
});
