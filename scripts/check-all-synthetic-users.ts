/**
 * Check ALL synthetic users in the database (not filtered by parent)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('L Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const TEST_USER_ID = 'c7f68bb8-1070-4601-b8d8-767185f3e8a7';

async function main() {
  console.log(`= Checking ALL synthetic users in database...\n`);

  // Check synthetic_users table WITHOUT parent filter
  const { data: allSynthetic, error: allError } = await supabase
    .from('synthetic_users')
    .select('*')
    .limit(20);

  if (allError) {
    console.error('L Error fetching synthetic users:', allError);
    return;
  }

  const count = allSynthetic?.length || 0;
  console.log(`=e Total Synthetic Users: ${count}\n`);

  if (!allSynthetic || allSynthetic.length === 0) {
    console.log('†  No synthetic users found in database');
    return;
  }

  // Show sample
  console.log('Sample synthetic users:');
  allSynthetic.slice(0, 10).forEach(profile => {
    const isTestUser = profile.parent_user_id === TEST_USER_ID;
    console.log(`   ${profile.profile_id} - ${profile.full_name || 'N/A'}`);
    console.log(`      Parent ID: ${profile.parent_user_id}${isTestUser ? ' ê TEST USER' : ''}`);
    console.log(`      Created: ${new Date(profile.created_at).toLocaleDateString()}`);
    console.log();
  });

  // Check if test user has any
  const testUserProfiles = allSynthetic.filter(p => p.parent_user_id === TEST_USER_ID);
  console.log(`\n Profiles for test user: ${testUserProfiles.length}`);

  if (testUserProfiles.length > 0) {
    console.log('   Profile IDs:', testUserProfiles.map(p => p.profile_id).join(', '));
  }

  // Get unique parent_user_ids
  const uniqueParents = [...new Set(allSynthetic.map(p => p.parent_user_id))];
  console.log(`\n=  Unique parent users: ${uniqueParents.length}`);
  uniqueParents.forEach(id => {
    const countForParent = allSynthetic.filter(p => p.parent_user_id === id).length;
    const isTest = id === TEST_USER_ID;
    console.log(`   ${id.substring(0, 8)}...: ${countForParent} profiles${isTest ? ' ê TEST USER' : ''}`);
  });

  console.log();
}

main().catch(console.error);
