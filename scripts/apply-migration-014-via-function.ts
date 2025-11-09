/**
 * Apply migration 014 via SQL function
 * Creates a function that can execute the ALTER TABLE statements
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file
const envFile = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
const envVars: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = envVars['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = envVars['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyMigration() {
  console.log('🔄 Applying migration 014 via SQL function...\n');
  
  // First, create the function (this needs to be done in Supabase SQL Editor first)
  const functionSQL = `
-- Create function to apply migration 014
CREATE OR REPLACE FUNCTION public.apply_migration_014()
RETURNS jsonb AS $$
BEGIN
  ALTER TABLE public.user_levels
    ADD COLUMN IF NOT EXISTS evidence_by_competency JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS level_evidence JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS role_archetype_evidence JSONB DEFAULT '{}'::jsonb;

  COMMENT ON COLUMN public.user_levels.evidence_by_competency IS 'JSONB object mapping each competency dimension to supporting stories and evidence';
  COMMENT ON COLUMN public.user_levels.level_evidence IS 'JSONB object with resume evidence, story evidence, and leveling framework analysis';
  COMMENT ON COLUMN public.user_levels.role_archetype_evidence IS 'JSONB object mapping role types to evidence of specialization match';

  CREATE INDEX IF NOT EXISTS idx_user_levels_evidence_competency ON public.user_levels USING GIN (evidence_by_competency);
  CREATE INDEX IF NOT EXISTS idx_user_levels_evidence_level ON public.user_levels USING GIN (level_evidence);
  CREATE INDEX IF NOT EXISTS idx_user_levels_evidence_role ON public.user_levels USING GIN (role_archetype_evidence);

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Migration 014 applied successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  try {
    // Check if the function exists
    const { data: funcCheck, error: funcError } = await supabase.rpc('apply_migration_014');
    
    if (funcError && funcError.code === 'PGRST202') {
      console.log('📋 SQL function does not exist yet.');
      console.log('   Please create it first in Supabase SQL Editor:\n');
      console.log('─'.repeat(70));
      console.log(functionSQL);
      console.log('─'.repeat(70));
      console.log('\n   After creating the function, run this script again.\n');
      return;
    }
    
    // If function exists, call it
    const { data, error } = await supabase.rpc('apply_migration_014');
    
    if (error) {
      console.error('❌ Error:', error);
      console.log('\n📋 Please apply manually in Supabase SQL Editor\n');
      return;
    }
    
    console.log('✅ Migration 014 applied successfully!');
    console.log('   - Added evidence_by_competency column');
    console.log('   - Added level_evidence column');
    console.log('   - Added role_archetype_evidence column');
    console.log('   - Created GIN indexes for JSONB columns');
    
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    console.log('\n📋 Please apply manually in Supabase SQL Editor\n');
  }
}

applyMigration().catch(console.error);

