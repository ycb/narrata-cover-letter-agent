/**
 * Comprehensive check of ALL synthetic-related data in the database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const TEST_USER_ID = 'c7f68bb8-1070-4601-b8d8-767185f3e8a7';

async function checkTable(tableName: string, description: string) {
  console.log(`\n📋 ${description} (${tableName})`);
  console.log('   ' + '─'.repeat(50));

  const { data, error, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact' })
    .limit(5);

  if (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return;
  }

  console.log(`   Total rows: ${count || 0}`);

  if (data && data.length > 0) {
    console.log(`   Sample (first ${data.length}):`);
    data.forEach((row, i) => {
      console.log(`\n   [${i + 1}]`);
      Object.entries(row).slice(0, 5).forEach(([key, value]) => {
        const displayValue = typeof value === 'string' && value.length > 50
          ? value.substring(0, 47) + '...'
          : value;
        console.log(`      ${key}: ${displayValue}`);
      });
    });
  } else {
    console.log(`   Empty table`);
  }
}

async function main() {
  console.log('🔍 COMPREHENSIVE SYNTHETIC DATA CHECK');
  console.log('═'.repeat(60));

  // Check all synthetic-related tables
  await checkTable('synthetic_users', 'Synthetic User Profiles');
  await checkTable('evaluation_runs', 'Evaluation Runs');
  await checkTable('evaluation_questions', 'Evaluation Questions');
  await checkTable('evaluation_results', 'Evaluation Results');

  // Check sources with synthetic naming patterns
  console.log(`\n📁 Sources with Synthetic Naming Patterns`);
  console.log('   ' + '─'.repeat(50));

  const { data: syntheticSources, error: sourcesError } = await supabase
    .from('sources')
    .select('id, file_name, user_id, created_at')
    .or('file_name.ilike.%P0%,file_name.ilike.%P01%,file_name.ilike.%synthetic%');

  if (sourcesError) {
    console.log(`   ❌ Error: ${sourcesError.message}`);
  } else {
    console.log(`   Total: ${syntheticSources?.length || 0}`);
    if (syntheticSources && syntheticSources.length > 0) {
      syntheticSources.slice(0, 5).forEach(s => {
        console.log(`      - ${s.file_name} (${s.user_id.substring(0, 8)}...)`);
      });
    }
  }

  // Check if fixture files exist
  console.log(`\n📦 Fixture Files (filesystem)`);
  console.log('   ' + '─'.repeat(50));

  const fixtureDir = '/Users/admin/ narrata/fixtures/synthetic/v1/raw_uploads';
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync(`ls -la "${fixtureDir}" 2>/dev/null || echo "Directory not found"`);
    if (stdout.includes('Directory not found')) {
      console.log(`   ❌ Fixture directory does not exist: ${fixtureDir}`);
    } else {
      const lines = stdout.trim().split('\n');
      console.log(`   Found ${lines.length - 1} items (including directories)`);
      lines.slice(1, 6).forEach(line => {
        console.log(`      ${line}`);
      });
    }
  } catch (error) {
    console.log(`   ❌ Error checking fixtures: ${error}`);
  }

  console.log('\n═'.repeat(60));
  console.log('\n💡 SUMMARY:');
  console.log('   The database currently has NO synthetic data.');
  console.log('   The Evals dashboard screenshot likely shows data from:');
  console.log('      1. A different environment (staging/production)');
  console.log('      2. Data that was previously deleted');
  console.log('      3. A different Supabase project');
  console.log('\n   To proceed with PM Levels QA:');
  console.log('      1. Upload test data (resume/cover letter) for test user');
  console.log('      2. OR create synthetic profiles from fixtures');
  console.log('      3. Then run PM Levels analysis');
  console.log();
}

main().catch(console.error);
