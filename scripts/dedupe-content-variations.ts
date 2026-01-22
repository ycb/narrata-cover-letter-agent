#!/usr/bin/env ts-node

/**
 * Dedupe content_variations by normalized content.
 *
 * Usage:
 *   ts-node scripts/dedupe-content-variations.ts [--user <user_id>] [--apply]
 *
 * Examples:
 *   ts-node scripts/dedupe-content-variations.ts --user d3937780-28ec-4221-8bfb-2bb0f670fd52 --apply
 *   ts-node scripts/dedupe-content-variations.ts --apply
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables:');
  console.error('  VITE_SUPABASE_URL:', SUPABASE_URL ? 'ok' : 'missing');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type VariationRow = {
  id: string;
  user_id: string;
  parent_entity_type: string;
  parent_entity_id: string;
  content: string;
  filled_gap_id: string | null;
  gap_tags: string[] | null;
  job_description_id: string | null;
  target_job_title: string | null;
  target_company: string | null;
  times_used: number | null;
  created_at: string | null;
  updated_at: string | null;
};

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const userIndex = args.findIndex((arg) => arg === '--user');
const userId = userIndex >= 0 ? args[userIndex + 1] : null;

const normalizeContent = (value: string): string => value.replace(/\s+/g, ' ').trim().toLowerCase();

const getSortScore = (row: VariationRow) => {
  const timesUsed = row.times_used ?? 0;
  const hasGap = row.filled_gap_id ? 1 : 0;
  const hasJobContext = row.job_description_id ? 1 : 0;
  const updatedAt = row.updated_at || row.created_at || '';
  const updatedScore = updatedAt ? new Date(updatedAt).getTime() : 0;
  return {
    score: hasGap * 1000 + timesUsed * 10 + hasJobContext,
    updatedScore,
  };
};

const fetchBatch = async (from: number, to: number): Promise<VariationRow[]> => {
  let query = supabase
    .from('content_variations')
    .select(
      'id,user_id,parent_entity_type,parent_entity_id,content,filled_gap_id,gap_tags,job_description_id,target_job_title,target_company,times_used,created_at,updated_at',
    )
    .order('created_at', { ascending: true })
    .range(from, to);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch content_variations: ${error.message}`);
  }
  return (data || []) as VariationRow[];
};

const run = async () => {
  console.log('Content variations dedupe');
  if (userId) {
    console.log(`User scope: ${userId}`);
  } else {
    console.log('User scope: all users');
  }
  console.log(`Mode: ${apply ? 'apply' : 'dry-run'}`);

  const rows: VariationRow[] = [];
  const batchSize = 1000;
  let offset = 0;
  while (true) {
    const batch = await fetchBatch(offset, offset + batchSize - 1);
    rows.push(...batch);
    if (batch.length < batchSize) break;
    offset += batchSize;
  }

  console.log(`Loaded ${rows.length} variations`);

  const groups = new Map<string, VariationRow[]>();
  rows.forEach((row) => {
    const normalized = normalizeContent(row.content || '');
    if (!normalized) return;
    const key = `${row.parent_entity_type}|${row.parent_entity_id}|${normalized}`;
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  });

  const duplicateGroups = Array.from(groups.values()).filter((group) => group.length > 1);
  console.log(`Duplicate groups: ${duplicateGroups.length}`);

  const idsToDelete: string[] = [];
  let mergedTagsCount = 0;

  for (const group of duplicateGroups) {
    const sorted = group.sort((a, b) => {
      const scoreA = getSortScore(a);
      const scoreB = getSortScore(b);
      if (scoreA.score !== scoreB.score) return scoreB.score - scoreA.score;
      return scoreB.updatedScore - scoreA.updatedScore;
    });

    const keeper = sorted[0];
    const others = sorted.slice(1);
    idsToDelete.push(...others.map((row) => row.id));

    const mergedTags = Array.from(
      new Set([
        ...(keeper.gap_tags ?? []),
        ...others.flatMap((row) => row.gap_tags ?? []),
      ]),
    );

    if (mergedTags.length > (keeper.gap_tags ?? []).length) {
      mergedTagsCount += 1;
      if (apply) {
        await supabase.from('content_variations').update({ gap_tags: mergedTags }).eq('id', keeper.id);
      }
    }
  }

  console.log(`Duplicate rows: ${idsToDelete.length}`);
  console.log(`Keepers updated with merged tags: ${mergedTagsCount}`);

  if (!apply) {
    console.log('Dry-run complete. Re-run with --apply to delete duplicates.');
    return;
  }

  const chunkSize = 200;
  for (let i = 0; i < idsToDelete.length; i += chunkSize) {
    const chunk = idsToDelete.slice(i, i + chunkSize);
    const { error } = await supabase.from('content_variations').delete().in('id', chunk);
    if (error) {
      throw new Error(`Failed to delete duplicates: ${error.message}`);
    }
  }

  console.log('Duplicates deleted.');
};

run().catch((error) => {
  console.error('Dedupe failed:', error);
  process.exit(1);
});
