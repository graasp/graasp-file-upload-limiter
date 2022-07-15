import { Member } from '@graasp/sdk';

import { FileUploadLimiterDbService } from './db-service';
import {
  CheckMemberStorageTask,
  CheckMemberStorageTaskInputType,
} from './tasks/check-member-storage-task';
import {
  GetMemberStorageTask,
  GetMemberStorageTaskInputType,
} from './tasks/get-member-storage-task';

export class FileUploadLimiterTaskManager {
  dbService: FileUploadLimiterDbService;

  constructor(dbService: FileUploadLimiterDbService) {
    this.dbService = dbService;
  }

  createGetMemberStorageTask(member: Member, input: GetMemberStorageTaskInputType) {
    return new GetMemberStorageTask(member, this.dbService, input);
  }

  createCheckMemberStorageTask(member: Member, input: CheckMemberStorageTaskInputType) {
    return new CheckMemberStorageTask(member, this.dbService, input);
  }
}
