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

async function checkWorkItems() {
  const { data: { user } } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD
  });

  console.log('\n=== Checking work_items ===');
  const { data: workItems, error: wiError } = await supabase
    .from('work_items')
    .select('id, title, source_id, user_id, created_at')
    .eq('user_id', user.id)
    .limit(10);

  if (wiError) {
    console.error('Error:', wiError);
  } else {
    console.log(`Found ${workItems?.length || 0} work_items total`);
    workItems?.forEach(wi => console.log(`  - ${wi.title} (source_id: ${wi.source_id || 'NULL'})`));
  }

  console.log('\n=== Checking P01 sources ===');
  const { data: sources } = await supabase
    .from('sources')
    .select('id, file_name, structured_data, processing_status')
    .eq('user_id', user.id)
    .like('file_name', 'P01_%')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`Found ${sources?.length || 0} P01 sources:`);
  sources?.forEach(s => {
    const sd = s.structured_data as any;
    const hasWorkHistory = sd?.workHistory && Array.isArray(sd.workHistory) && sd.workHistory.length > 0;
    const workHistoryCount = hasWorkHistory ? sd.workHistory.length : 0;
    console.log(`  - ${s.file_name}`);
    console.log(`    Status: ${s.processing_status}`);
    console.log(`    Has workHistory: ${hasWorkHistory} (${workHistoryCount} entries)`);
    console.log(`    Source ID: ${s.id.substring(0, 8)}...`);
  });

  console.log('\n=== Checking if work_items should exist ===');
  const resumeSource = sources?.find(s => s.file_name.includes('resume'));
  if (resumeSource) {
    const sd = resumeSource.structured_data as any;
    if (sd?.workHistory && Array.isArray(sd.workHistory)) {
      console.log(`Resume source has ${sd.workHistory.length} workHistory entries`);
      console.log('Sample entry:', JSON.stringify(sd.workHistory[0], null, 2).substring(0, 200) + '...');
    } else {
      console.log('Resume source has NO workHistory in structured_data');
    }
  } else {
    console.log('No resume source found for P01');
  }
}

checkWorkItems().catch(console.error);

