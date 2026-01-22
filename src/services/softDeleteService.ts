import { supabase } from '@/lib/supabase';

type ArchiveRecordInput = {
  userId: string;
  sourceTable: string;
  sourceId: string;
  sourceData: Record<string, unknown>;
  deletedBy?: string;
  purgeAfterDays?: number;
  client?: any;
};

type ArchiveRowsInput = {
  userId: string;
  sourceTable: string;
  rows: Record<string, unknown>[];
  sourceIdKey?: string;
  sourceIdResolver?: (row: Record<string, unknown>) => string | undefined;
  deletedBy?: string;
  purgeAfterDays?: number;
  client?: any;
};

export class SoftDeleteService {
  static async archiveRows({
    userId,
    sourceTable,
    rows,
    sourceIdKey,
    sourceIdResolver,
    deletedBy,
    purgeAfterDays,
    client
  }: ArchiveRowsInput): Promise<void> {
    if (!userId || !sourceTable || rows.length === 0) {
      return;
    }

    const purgeAfter =
      typeof purgeAfterDays === 'number'
        ? new Date(Date.now() + purgeAfterDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    const resolveSourceId = (row: Record<string, unknown>) => {
      if (sourceIdResolver) {
        return sourceIdResolver(row);
      }
      if (sourceIdKey && row[sourceIdKey] != null) {
        return String(row[sourceIdKey]);
      }
      if (row.id != null) {
        return String(row.id);
      }
      if (row.source_id != null) {
        return String(row.source_id);
      }
      return undefined;
    };

    const payload = rows
      .map((row) => {
        const sourceId = resolveSourceId(row);
        if (!sourceId) return null;
        const rowUserId = (row as any).user_id ?? userId;
        return {
          user_id: rowUserId,
          source_table: sourceTable,
          source_id: sourceId,
          source_data: row,
          deleted_by: deletedBy ?? rowUserId,
          ...(purgeAfter ? { purge_after: purgeAfter } : {})
        };
      })
      .filter(Boolean);

    if (payload.length === 0) {
      return;
    }

    const db = client ?? supabase;
    const { error } = await (db.from('deleted_records') as any).insert(payload);

    if (error) {
      console.error('[SoftDeleteService] Failed to archive deleted records:', error);
      throw error;
    }
  }

  static async archiveRecord({
    userId,
    sourceTable,
    sourceId,
    sourceData,
    deletedBy,
    purgeAfterDays,
    client
  }: ArchiveRecordInput): Promise<void> {
    if (!userId || !sourceTable || !sourceId) {
      throw new Error('Missing required fields for archive record');
    }

    await this.archiveRows({
      userId,
      sourceTable,
      rows: [sourceData],
      sourceIdResolver: () => sourceId,
      deletedBy,
      purgeAfterDays,
      client
    });
  }
}
