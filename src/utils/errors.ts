export class StorageExceeded extends Error {
  message = 'The allowed storage is full';
  name = 'StorageExceededError';
  origin = 'plugin';
  code = 507;
}

export class FileSizeNotFound extends Error {
  message = 'The file size is not correctly defined';
  name = 'FileSizeNotFound';
  origin = 'plugin';
  code = 500;
}
