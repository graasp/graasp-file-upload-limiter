import { FileSizeNotFound } from './errors';

export const getFileSize = (extra, sizePath): number => {
  const properties = sizePath.split('.');
  const sizeField = properties.reduce((prev, curr) => prev?.[curr], extra);

  if (Number.isInteger(sizeField)) {
    return sizeField;
  }

  throw new FileSizeNotFound();
};
