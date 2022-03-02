import { Actor, DatabaseTransactionHandler, Member } from 'graasp';
import { FileUploadLimiterDbService } from '../db-service';
import { DEFAULT_MAX_STORAGE } from '../utils/constants';
import { StorageExceeded } from '../utils/errors';
import { BaseTask } from './base-task';

export type CheckMemberStorageTaskInputType = { memberId: string; itemType: string };

export class CheckMemberStorageTask extends BaseTask<Actor, boolean> {
  dS: FileUploadLimiterDbService;
  maxMemberStorage: number;

  get name(): string {
    return CheckMemberStorageTask.name;
  }

  input: CheckMemberStorageTaskInputType;
  getInput: () => CheckMemberStorageTaskInputType;

  constructor(
    member: Member,
    dbService: FileUploadLimiterDbService,
    input: CheckMemberStorageTaskInputType,
  ) {
    super(member);
    this.dS = dbService;
    this.input = input;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    // todo: fetch total storage from Redis
    const { memberId, itemType } = this.input;

    const storage = await this.dS.getMemberStorage({ memberId, itemType }, handler);

    // throw if member storage exceeds maximum allowed
    if (storage > this.maxMemberStorage) {
      throw new StorageExceeded();
    }

    // todo: check depending on member subscription
    this._result = storage < DEFAULT_MAX_STORAGE;
    this.status = 'OK';
  }
}
