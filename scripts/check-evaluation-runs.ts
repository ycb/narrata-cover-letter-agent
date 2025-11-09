/**
 * Check evaluation_runs table to understand synthetic profile data
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

async function main() {
  console.log(`🔍 Checking evaluation_runs table...\n`);

  // Check all evaluation runs
  const { data: allRuns, error: allError } = await supabase
    .from('evaluation_runs')
    .select('*')
    .limit(20);

  if (allError) {
    console.error('❌ Error fetching evaluation runs:', allError);
    return;
  }

  console.log(`📊 Total evaluation runs: ${allRuns?.length || 0}\n`);

  // Check synthetic profile runs specifically
  const syntheticRuns = allRuns?.filter(run =>
    run.file_type?.startsWith('P0') ||
    run.file_type?.match(/^P\d+$/)
  ) || [];

  console.log(`🤖 Synthetic profile runs: ${syntheticRuns.length}\n`);

  if (syntheticRuns.length > 0) {
    console.log('Sample synthetic runs:');
    syntheticRuns.slice(0, 5).forEach(run => {
      console.log(`   Profile: ${run.file_type}`);
      console.log(`   User ID: ${run.user_id}`);
      console.log(`   Created: ${new Date(run.created_at).toLocaleDateString()}`);
      console.log(`   User Type: ${run.user_type || 'N/A'}`);
      console.log('   ---');
    });
  }

  // Get unique user_ids from synthetic runs
  const uniqueUserIds = [...new Set(syntheticRuns.map(r => r.user_id))];
  console.log(`\n👥 Unique user IDs with synthetic runs: ${uniqueUserIds.length}`);
  uniqueUserIds.forEach(uid => {
    const isTestUser = uid === TEST_USER_ID;
    console.log(`   ${uid} ${isTestUser ? '← TEST USER' : ''}`);
  });

  // Check if test user has ANY evaluation runs
  const testUserRuns = allRuns?.filter(r => r.user_id === TEST_USER_ID) || [];
  console.log(`\n🎯 Test user evaluation runs: ${testUserRuns.length}`);

  if (testUserRuns.length > 0) {
    console.log('   File types:');
    testUserRuns.forEach(run => {
      console.log(`      - ${run.file_type} (${new Date(run.created_at).toLocaleDateString()})`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Findings:');
  if (syntheticRuns.length > 0 && !syntheticRuns.some(r => r.user_id === TEST_USER_ID)) {
    console.log('   ⚠️  Synthetic profiles exist but NOT for the test user');
    console.log('   They belong to a different user account');
  } else if (syntheticRuns.length === 0) {
    console.log('   ❌ No synthetic profile evaluation runs found in database');
  } else {
    console.log('   ✅ Test user has synthetic profile evaluation runs');
  }
  console.log();
}

main().catch(console.error);
