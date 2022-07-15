import { Actor, DatabaseTransactionHandler, Member, TaskStatus } from '@graasp/sdk';

import { FileUploadLimiterDbService as DbService } from '../db-service';
import { BaseTask } from './base-task';

export type GetMemberStorageTaskInputType = { memberId: string; itemType: string };

export class GetMemberStorageTask extends BaseTask<Actor, number> {
  dS: DbService;

  get name(): string {
    return GetMemberStorageTask.name;
  }

  input: GetMemberStorageTaskInputType;
  getInput: () => GetMemberStorageTaskInputType;

  constructor(member: Member, dbService: DbService, input: GetMemberStorageTaskInputType) {
    super(member);
    this.dS = dbService;
    this.input = input;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = TaskStatus.RUNNING;

    // todo: fetch total storage from Redis
    const { memberId, itemType } = this.input;

    const storage = await this.dS.getMemberStorage({ memberId, itemType }, handler);

    this._result = storage;
    this.status = TaskStatus.OK;
  }
}
