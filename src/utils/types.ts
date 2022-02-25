export interface GraaspFileUploadLimiterOptions {
  /** Item type to target (ex: 'file', 's3File') */
  type: string;
  /** Chain of property names to the file size (ex: 's3File.size')
   * size must be defined in extra
   */
  sizePath: string;
  /** Maximum storage size for a user in bytes (default to 100MB)  */
  maxMemberStorage?: number;
}

export type MemberExtra = {
  storage: {
    total: number;
  };
};
