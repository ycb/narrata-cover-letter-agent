/**
 * Backfill helper: move legacy resume/linkedin stories into the new story_fragments table.
 * This keeps the existing story body for reference while removing the raw rows that flood gap detection.
 *
 * Usage:
 *   npm run ts-node scripts/migrate-resume-stories-to-fragments.ts
 *
 * Requires:
 *   - VITE_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const envPath = path.join(__dirname, '../.env');

const envVars: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  const contents = fs.readFileSync(envPath, 'utf-8');
  contents.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });
}

const SUPABASE_URL = envVars['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  envVars['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BATCH_SIZE = 200;
const SOURCE_TYPES = ['resume', 'linkedin'];

async function migrateStories() {
  let totalMigrated = 0;
  while (true) {
    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .in('source_type', SOURCE_TYPES)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      throw error;
    }

    if (!stories || stories.length === 0) {
      break;
    }

    const storyIds = stories.map((story) => story.id);
    const { data: existingFragments } = await supabase
      .from('story_fragments')
      .select('id, converted_story_id')
      .in('converted_story_id', storyIds);
    const alreadyLinked = new Set(existingFragments?.map((fragment) => fragment.converted_story_id));

    const fragmentPayloads = stories
      .filter((story) => !alreadyLinked.has(story.id))
      .map((story) => ({
        user_id: story.user_id,
        work_item_id: story.work_item_id,
        source_id: story.source_id,
        source_type: story.source_type || 'resume',
        title: story.title || 'Untitled fragment',
        content: story.content || '',
        narrative_hints: story.tags || [],
        metrics: story.metrics || [],
        tags: story.tags || [],
        status: 'pending' as const,
        converted_story_id: story.id,
        created_at: story.created_at,
        updated_at: story.updated_at,
      }));

    if (fragmentPayloads.length > 0) {
      const { error: insertError } = await supabase
        .from('story_fragments')
        .insert(fragmentPayloads);
      if (insertError) {
        throw insertError;
      }
      totalMigrated += fragmentPayloads.length;
      console.log(`✅ Inserted ${fragmentPayloads.length} fragments (batch)`);
    }

    if (storyIds.length > 0) {
      await supabase
        .from('content_variations')
        .delete()
        .eq('parent_entity_type', 'approved_content')
        .in('parent_entity_id', storyIds);

      await supabase
        .from('gaps')
        .delete()
        .eq('entity_type', 'approved_content')
        .in('entity_id', storyIds);

      await supabase
        .from('stories')
        .delete()
        .in('id', storyIds);

      console.log(`🧹 Removed ${storyIds.length} legacy stories + related gaps/variations`);
    }
  }

  console.log(`🎯 Migration complete – ${totalMigrated} fragments inserted`);
}

migrateStories().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
