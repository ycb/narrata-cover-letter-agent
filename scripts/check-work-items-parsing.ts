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

  const { data: workItems, error } = await supabase
    .from('work_items')
    .select('id, title, start_date, end_date, company_id, source_id, description')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('=== All work_items ===');
  workItems?.forEach(item => {
    const titleDisplay = item.title?.trim() || '(EMPTY/NULL)';
    console.log(`ID: ${item.id}`);
    console.log(`  Title: "${titleDisplay}"`);
    console.log(`  Dates: ${item.start_date} - ${item.end_date || 'NULL'}`);
    console.log(`  Company ID: ${item.company_id}`);
    console.log(`  Source ID: ${item.source_id?.substring(0, 8)}...`);
    console.log(`  Description: ${item.description?.substring(0, 50) || '(empty)'}...`);
    console.log('');
  });
  
  const { data: companies } = await supabase.from('companies').select('id, name').order('created_at');
  console.log('=== Companies ===');
  companies?.forEach(c => console.log(`ID: ${c.id}, Name: ${c.name}`));
  
  // Check for duplicates (same company, overlapping dates, empty or matching titles)
  console.log('\n=== Checking for duplicate work_items ===');
  const groupedByCompany = workItems?.reduce((acc, item) => {
    if (!acc[item.company_id]) acc[item.company_id] = [];
    acc[item.company_id].push(item);
    return acc;
  }, {} as Record<string, typeof workItems>);
  
  Object.entries(groupedByCompany || {}).forEach(([companyId, items]) => {
    if (items.length > 1) {
      console.log(`\nCompany ${companyId} has ${items.length} work_items:`);
      items.forEach(item => {
        console.log(`  - "${item.title || '(empty)'}" (${item.start_date} - ${item.end_date || 'NULL'})`);
      });
      
      // Check for empty titles
      const emptyTitles = items.filter(item => !item.title || item.title.trim() === '');
      if (emptyTitles.length > 0) {
        console.log(`  ⚠️  ${emptyTitles.length} work_item(s) with empty/null title!`);
      }
      
      // Check for overlapping dates
      items.forEach((item1, i) => {
        items.slice(i + 1).forEach(item2 => {
          if (item1.start_date === item2.start_date && 
              (item1.end_date || 'NULL') === (item2.end_date || 'NULL')) {
            console.log(`  ⚠️  Duplicate dates found: "${item1.title || '(empty)'}" and "${item2.title || '(empty)'}"`);
          }
        });
      });
    }
  });
}

checkWorkItems().catch(console.error);

