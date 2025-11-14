/**
 * Check if user_levels table exists and inspect its structure
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserLevelsTable() {
  console.log('🔍 Checking user_levels table...\n');

  // Check if table exists by trying to select from it
  const { data, error } = await supabase
    .from('user_levels')
    .select('*')
    .limit(1);

  if (error) {
    if (error.message.includes('does not exist') || error.code === '42P01') {
      console.log('❌ Table "user_levels" does NOT exist');
      console.log('\n📝 To create it, apply the migration:');
      console.log('   supabase/migrations/013_pm_levels_schema.sql\n');
      return false;
    } else {
      console.error('❌ Error querying user_levels:', error);
      return false;
    }
  }

  console.log('✅ Table "user_levels" EXISTS');
  console.log(`📊 Current row count: ${data?.length || 0}`);

  if (data && data.length > 0) {
    console.log('\n📋 Sample row:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('\n📭 Table is empty - no PM Levels assessments yet');
  }

  // Get table structure
  const { data: columns, error: columnsError } = await supabase
    .rpc('get_table_columns', { table_name: 'user_levels' })
    .single();

  if (!columnsError && columns) {
    console.log('\n🏗️  Table structure:');
    console.log(columns);
  }

  return true;
}

async function checkTestUser() {
  const testUserId = 'c7f68bb8-1070-4601-b8d8-767185f3e8a7';

  console.log(`\n👤 Checking PM Levels for test user: ${testUserId}\n`);

  const { data, error } = await supabase
    .from('user_levels')
    .select('*')
    .eq('user_id', testUserId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('📭 No PM Levels assessment found for test user');
      console.log('   Run analysis to generate one');
      return null;
    }
    console.error('❌ Error fetching user level:', error);
    return null;
  }

  console.log('✅ PM Levels assessment found!');
  console.log('\n📊 Assessment details:');
  console.log(`   Level: ${data.inferred_level}`);
  console.log(`   Confidence: ${(data.confidence * 100).toFixed(1)}%`);
  console.log(`   Scope Score: ${(data.scope_score * 100).toFixed(1)}%`);
  console.log(`   Last Run: ${data.last_run_timestamp}`);

  if (data.competency_scores) {
    console.log('\n🎯 Competency Scores:');
    console.log(`   Execution: ${data.competency_scores.execution}/3`);
    console.log(`   Customer Insight: ${data.competency_scores.customer_insight}/3`);
    console.log(`   Strategy: ${data.competency_scores.strategy}/3`);
    console.log(`   Influence: ${data.competency_scores.influence}/3`);
  }

  return data;
}

async function main() {
  const tableExists = await checkUserLevelsTable();

  if (tableExists) {
    await checkTestUser();
  }

  console.log('\n✨ Check complete!\n');
}

main().catch(console.error);
