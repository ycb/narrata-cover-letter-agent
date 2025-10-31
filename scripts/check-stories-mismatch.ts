import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = envVars['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = envVars['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY!;
const TEST_USER_EMAIL = envVars['VITE_TEST_EMAIL'] || process.env.VITE_TEST_EMAIL!;
const TEST_USER_PASSWORD = envVars['VITE_TEST_PASSWORD'] || process.env.VITE_TEST_PASSWORD!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkStories() {
  const { data: { user } } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD
  });

  console.log('\n=== All approved_content (stories) ===');
  const { data: stories, error } = await supabase
    .from('approved_content')
    .select('id, title, work_item_id, company_id, source_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  stories?.forEach(story => {
    console.log(`\nStory: "${story.title || '(no title)'}"`);
    console.log(`  ID: ${story.id}`);
    console.log(`  work_item_id: ${story.work_item_id || 'NULL'}`);
    console.log(`  company_id: ${story.company_id || 'NULL'}`);
    console.log(`  source_id: ${story.source_id?.substring(0, 8) || 'NULL'}...`);
  });

  // Check which sources these come from
  if (stories && stories.length > 0) {
    const sourceIds = [...new Set(stories.map(s => s.source_id).filter(Boolean))];
    console.log(`\n=== Checking sources ===`);
    for (const sourceId of sourceIds) {
      const { data: source } = await supabase
        .from('sources')
        .select('id, file_name, file_type')
        .eq('id', sourceId)
        .single();
      
      if (source) {
        const storiesFromSource = stories.filter(s => s.source_id === sourceId);
        console.log(`\nSource: ${source.file_name} (${source.file_type})`);
        console.log(`  Stories: ${storiesFromSource.length}`);
        storiesFromSource.forEach(s => {
          console.log(`    - "${s.title || '(no title)'}" (work_item_id: ${s.work_item_id || 'NULL'})`);
        });
      }
    }
  }

  // Check work_items
  console.log(`\n=== Checking work_items ===`);
  const { data: workItems } = await supabase
    .from('work_items')
    .select('id, title, company_id, source_id')
    .eq('user_id', user.id);

  console.log(`Total work_items: ${workItems?.length || 0}`);
  workItems?.forEach(wi => {
    console.log(`  - "${wi.title}" (id: ${wi.id}, source_id: ${wi.source_id?.substring(0, 8)}...)`);
  });

  // Find stories without work_item_id
  const orphanedStories = stories?.filter(s => !s.work_item_id);
  if (orphanedStories && orphanedStories.length > 0) {
    console.log(`\n⚠️  Found ${orphanedStories.length} stories WITHOUT work_item_id:`);
    orphanedStories.forEach(s => {
      console.log(`  - "${s.title || '(no title)'}" (source_id: ${s.source_id?.substring(0, 8)}...)`);
    });
  }
}

checkStories().catch(console.error);

