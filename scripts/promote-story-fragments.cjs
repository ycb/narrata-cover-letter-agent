/**
 * Utility: promote all pending story fragments for a user back into `stories`.
 *
 * Usage:
 *   node scripts/promote-story-fragments.cjs <USER_ID>
 *
 * Requires:
 *   - VITE_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');

const envVars = {};
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
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function promoteFragmentsForUser(userId) {
  console.log(`Promoting story fragments for user ${userId}`);

  const { data: fragments, error } = await supabase
    .from('story_fragments')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  if (!fragments || fragments.length === 0) {
    console.log('No pending fragments found.');
    return;
  }

  let promoted = 0;

  for (const fragment of fragments) {
    if (!fragment.work_item_id) {
      console.warn(`Fragment ${fragment.id} has no work_item_id; skipping`);
      continue;
    }

    const storyPayload = {
      user_id: fragment.user_id,
      work_item_id: fragment.work_item_id,
      title: fragment.title || 'Resume fragment',
      content: fragment.content || '',
      status: 'draft',
      confidence: 'medium',
      tags: fragment.tags || [],
      times_used: 0,
      last_used: null,
      embedding: null,
      created_at: fragment.created_at,
      updated_at: fragment.updated_at,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('stories')
      .insert(storyPayload)
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error(`Failed to insert story for fragment ${fragment.id}:`, insertError);
      continue;
    }

    const { error: updateError } = await supabase
      .from('story_fragments')
      .update({
        status: 'promoted',
        converted_story_id: inserted.id,
        converted_at: new Date().toISOString(),
      })
      .eq('id', fragment.id);

    if (updateError) {
      console.error(`Failed to mark fragment ${fragment.id} promoted:`, updateError);
      continue;
    }

    promoted += 1;
    console.log(`Promoted fragment ${fragment.id} → story ${inserted.id}`);
  }

  console.log(`Done. Promoted ${promoted} of ${fragments.length} fragments.`);
}

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node scripts/promote-story-fragments.cjs <USER_ID>');
    process.exit(1);
  }

  try {
    await promoteFragmentsForUser(userId);
    process.exit(0);
  } catch (err) {
    console.error('Promotion failed:', err);
    process.exit(1);
  }
}

main();
