import { StatusCodes } from 'http-status-codes';

import { ErrorFactory } from '@graasp/sdk';
import { FAILURE_MESSAGES } from '@graasp/translations';

import { PLUGIN_NAME } from './constants';

const GraaspError = ErrorFactory(PLUGIN_NAME);

export class StorageExceeded extends GraaspError {
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

export class FileSizeNotFound extends GraaspError {
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
