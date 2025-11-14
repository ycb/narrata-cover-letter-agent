import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
const envVars: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = envVars['VITE_SUPABASE_URL'];
const SUPABASE_ANON_KEY = envVars['VITE_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  try {
    // Find parent user
    const { data: parentProfile, error: parentError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'narrata.ai@gmail.com')
      .single();
    
    if (parentError || !parentProfile) {
      console.error('Error finding parent user:', parentError);
      return;
    }
    
    console.log(`Parent user: ${parentProfile.email} (${parentProfile.id})\n`);
    
    // Find P01 sources
    const { data: sources } = await supabase
      .from('sources')
      .select('id, file_name')
      .eq('user_id', parentProfile.id)
      .like('file_name', 'P01_%');
    
    console.log(`Found ${sources?.length || 0} P01 sources`);
    if (sources && sources.length > 0) {
      sources.forEach(s => console.log(`  - ${s.file_name}`));
    }
    
    if (!sources || sources.length === 0) {
      console.log('\nNo P01 sources found');
      return;
    }
    
    const sourceIds = sources.map(s => s.id);
    
    // Get work items and companies
    const { data: workItems } = await supabase
      .from('work_items')
      .select('id, title, company_id, companies(id, name, company_stage, maturity)')
      .eq('user_id', parentProfile.id)
      .in('source_id', sourceIds);
    
    console.log(`\nFound ${workItems?.length || 0} work items`);
    
    // Extract unique companies
    const companiesMap = new Map();
    workItems?.forEach(wi => {
      if (wi.companies) {
        const comp = wi.companies as any;
        if (!companiesMap.has(comp.id)) {
          companiesMap.set(comp.id, comp);
        }
      }
    });
    
    const companies = Array.from(companiesMap.values());
    
    console.log(`\n=== P01 Companies Maturity Data ===\n`);
    if (companies.length === 0) {
      console.log('No companies found');
      return;
    }
    
    companies.forEach((c: any) => {
      console.log(`${c.name}:`);
      console.log(`  Stage: ${c.company_stage || 'NULL (not set)'}`);
      console.log(`  Maturity: ${c.maturity || 'NULL (not set)'}`);
      console.log('');
    });
    
    const withMaturity = companies.filter((c: any) => c.maturity).length;
    const withStage = companies.filter((c: any) => c.company_stage).length;
    
    console.log(`\nSummary:`);
    console.log(`  Total companies: ${companies.length}`);
    console.log(`  With maturity: ${withMaturity}`);
    console.log(`  With stage: ${withStage}`);
    console.log(`  Without maturity data: ${companies.length - withMaturity}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
