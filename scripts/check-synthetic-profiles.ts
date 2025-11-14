/**
 * Check synthetic profiles and their content
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
  console.log(`🔍 Checking synthetic profiles for user: ${TEST_USER_ID}\n`);

  // Check synthetic_users table
  const { data: syntheticUsers, error } = await supabase
    .from('synthetic_users')
    .select('*')
    .eq('parent_user_id', TEST_USER_ID);

  if (error) {
    console.error('❌ Error fetching synthetic users:', error);
    return;
  }

  console.log(`👥 Synthetic Profiles: ${syntheticUsers?.length || 0}\n`);

  if (!syntheticUsers || syntheticUsers.length === 0) {
    console.log('⚠️  No synthetic profiles found');
    console.log('   They may need to be created first');
    return;
  }

  // Check each profile
  for (const profile of syntheticUsers.slice(0, 3)) {
    console.log(`\n📋 Profile: ${profile.profile_id}`);
    console.log(`   Name: ${profile.full_name}`);
    console.log(`   Created: ${new Date(profile.created_at).toLocaleDateString()}`);

    // Check sources for this profile
    const { data: sources } = await supabase
      .from('sources')
      .select('id, file_name')
      .eq('user_id', TEST_USER_ID)
      .ilike('file_name', `${profile.profile_id}%`);

    console.log(`   Sources: ${sources?.length || 0}`);
    if (sources && sources.length > 0) {
      sources.forEach(s => console.log(`      - ${s.file_name}`));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 To run PM Levels for a synthetic profile:');
  console.log('   Use the profile_id (e.g., "P00", "P01")');
  console.log('   Example: analyzeUserLevel(userId, undefined, undefined, undefined, "P00")');
  console.log();
}

main().catch(console.error);
