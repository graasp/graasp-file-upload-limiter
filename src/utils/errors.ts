import { GraaspErrorDetails, GraaspError } from 'graasp';
import { StatusCodes } from 'http-status-codes';
import { FAILURE_MESSAGES } from '@graasp/translations';

export class GraaspFileUploadLimiterError implements GraaspError {
  name: string;
  code: string;
  message: string;
  statusCode?: number;
  data?: unknown;
  origin: 'plugin' | string;

  constructor({ code, statusCode, message }: GraaspErrorDetails, data?: unknown) {
    this.name = code;
    this.code = code;
    this.message = message;
    this.statusCode = statusCode;
    this.data = data;
    this.origin = 'plugin';
  }
}

export class StorageExceeded extends GraaspFileUploadLimiterError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GFULERR001',
        statusCode: StatusCodes.INSUFFICIENT_STORAGE,
        message: FAILURE_MESSAGES.STORAGE_EXCEEDED,
      },
      data,
    );
  }
}

export class FileSizeNotFound extends GraaspFileUploadLimiterError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GFULERR002',
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        message: FAILURE_MESSAGES.FILE_SIZE_NOT_FOUND,
      },
      data,
    );
  }
}
