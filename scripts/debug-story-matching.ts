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

const supabase = createClient(
  envVars['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL!,
  envVars['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY!
);

async function debug() {
  const { data: { user } } = await supabase.auth.signInWithPassword({
    email: envVars['VITE_TEST_EMAIL'] || process.env.VITE_TEST_EMAIL!,
    password: envVars['VITE_TEST_PASSWORD'] || process.env.VITE_TEST_PASSWORD!
  });

  // Check companies
  const { data: companies } = await supabase.from('companies').select('id, name').eq('user_id', user.id);
  console.log('\n=== Companies ===');
  companies?.forEach(c => console.log(`  - ${c.name} (${c.id.substring(0, 8)}...)`));

  // Check work_items
  const { data: workItems } = await supabase
    .from('work_items')
    .select('id, title, company_id')
    .eq('user_id', user.id);
  console.log('\n=== Work Items ===');
  workItems?.forEach(wi => {
    const company = companies?.find(c => c.id === wi.company_id);
    console.log(`  - ${wi.title} at ${company?.name || 'Unknown'} (${wi.id.substring(0, 8)}...)`);
  });

  // Check cover letter source structured_data
  const { data: sources } = await supabase
    .from('sources')
    .select('id, file_name, structured_data')
    .eq('user_id', user.id)
    .ilike('file_name', '%cover%')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (sources && sources.length > 0) {
    const sd = sources[0].structured_data as any;
    console.log('\n=== Cover Letter Stories ===');
    if (sd?.stories && Array.isArray(sd.stories)) {
      for (let idx = 0; idx < sd.stories.length; idx++) {
        const story = sd.stories[idx];
        console.log(`\nStory ${idx + 1}:`);
        console.log(`  Title: ${story.title || '(no title)'}`);
        console.log(`  Company: ${story.company || '(null)'}`);
        console.log(`  TitleRole: ${story.titleRole || '(null)'}`);
        console.log(`  Content: ${(story.content || story.summary || '').substring(0, 100)}...`);
        
        // Test company extraction
        const storyText = story.content || story.title || story.summary || '';
        const flowhubMatch = storyText.match(/(?:at|from|while at|during my time at|working at)\s+(FlowHub|flowhub)/i);
        console.log(`  FlowHub mention: ${flowhubMatch ? flowhubMatch[1] : 'NOT FOUND'}`);
        
        // Check if company exists
        if (story.company || flowhubMatch) {
          const companyName = story.company || flowhubMatch?.[1];
          const { data: foundCompany } = await supabase
            .from('companies')
            .select('id, name')
            .ilike('name', companyName)
            .eq('user_id', user.id)
            .single();
          console.log(`  Company lookup: ${foundCompany ? `FOUND (${foundCompany.name})` : 'NOT FOUND'}`);
        }
      }
    } else {
      console.log('  No stories in structured_data');
    }
  } else {
    console.log('\n=== No cover letter source found ===');
  }
}

debug().catch(console.error);

