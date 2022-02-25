import { DatabaseTransactionHandler } from 'graasp';
import { sql } from 'slonik';
import { DECIMAL } from './utils/constants';

export class FileUploadLimiterDbService {
  sizePath: string;

  constructor(sizePath: string) {
    this.sizePath = sizePath;
  }

  getMemberStorage(
    args: { memberId: string; itemType: string },
    transactionHandler: DatabaseTransactionHandler,
  ): Promise<number> {
    const { memberId, itemType } = args;

    // select all file extra for given member
    const properties = this.sizePath.split('.');
    const propertiesPath = sql.join(properties, sql`->`);
    return (
      transactionHandler
        .query(
          sql`
          SELECT 
          SUM((extra->${propertiesPath})::int)
          FROM item 
          WHERE item.type = ${itemType} AND item.creator = ${memberId}`,
        )
        // sum up
        .then(({ rows }) => parseInt(rows[0].sum, DECIMAL))
    );
  }
}
