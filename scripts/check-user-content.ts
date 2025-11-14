/**
 * Check what content exists for the test user
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
  console.log(`🔍 Checking content for user: ${TEST_USER_ID}\n`);

  // Check sources
  const { data: sources, error: sourcesError } = await supabase
    .from('sources')
    .select('id, file_name, file_type, created_at')
    .eq('user_id', TEST_USER_ID);

  if (sourcesError) {
    console.error('❌ Error fetching sources:', sourcesError);
  } else {
    console.log(`📄 Sources: ${sources?.length || 0}`);
    sources?.forEach(s => {
      console.log(`   - ${s.file_name} (${s.file_type}) - ${new Date(s.created_at).toLocaleDateString()}`);
    });
  }

  // Check work items
  const { data: workItems, error: workItemsError } = await supabase
    .from('work_items')
    .select('id, title, source_id')
    .eq('user_id', TEST_USER_ID);

  if (workItemsError) {
    console.error('❌ Error fetching work_items:', workItemsError);
  } else {
    console.log(`\n💼 Work Items: ${workItems?.length || 0}`);
    if (workItems && workItems.length > 0) {
      console.log(`   First 5: ${workItems.slice(0, 5).map(w => w.title).join(', ')}`);
    }
  }

  // Check approved content (stories)
  const { data: stories, error: storiesError } = await supabase
    .from('approved_content')
    .select('id, title, status')
    .eq('user_id', TEST_USER_ID);

  if (storiesError) {
    console.error('❌ Error fetching stories:', storiesError);
  } else {
    const approved = stories?.filter(s => s.status === 'approved') || [];
    console.log(`\n📚 Approved Stories: ${approved.length} / ${stories?.length || 0} total`);
  }

  // Check companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name')
    .eq('user_id', TEST_USER_ID);

  if (companiesError) {
    console.error('❌ Error fetching companies:', companiesError);
  } else {
    console.log(`\n🏢 Companies: ${companies?.length || 0}`);
    if (companies && companies.length > 0) {
      console.log(`   ${companies.map(c => c.name).join(', ')}`);
    }
  }

  console.log('\n' + '='.repeat(60));

  if (!sources || sources.length === 0) {
    console.log('\n⚠️  ISSUE: No sources found!');
    console.log('   PM Levels requires at least one source (resume/cover letter/LinkedIn)');
    console.log('   The user needs to upload files or import LinkedIn data.');
  } else {
    console.log('\n✅ User has sources - PM Levels analysis should work');
  }

  console.log();
}

main().catch(console.error);
