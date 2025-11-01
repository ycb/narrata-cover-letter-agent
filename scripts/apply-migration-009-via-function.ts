import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env
const envPath = path.join(__dirname, '../.env');
let SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
let SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
let SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (key === 'VITE_SUPABASE_URL') SUPABASE_URL = value;
      if (key === 'VITE_SUPABASE_ANON_KEY') SUPABASE_ANON_KEY = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY' || key === 'VITE_SUPABASE_SERVICE_ROLE_KEY') {
        SUPABASE_SERVICE_ROLE_KEY = value;
      }
    }
  });
}

// Try with service role key first, fall back to anon key
const serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(
  SUPABASE_URL,
  serviceRoleKey || SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function applyMigration() {
  console.log('🔄 Applying migration 009 via SQL function...\n');
  
  // First, try to create a function that can execute the ALTER TABLE
  // This needs to be done in Supabase SQL Editor first
  
  try {
    // Check if the function exists
    const { data: funcCheck, error: funcError } = await supabase.rpc('apply_migration_009');
    
    if (funcError && funcError.code === 'PGRST202') {
      console.log('📋 SQL function does not exist yet.');
      console.log('   Please create it first in Supabase SQL Editor:\n');
      console.log('─'.repeat(70));
      console.log(`
-- Create function to apply migration 009
CREATE OR REPLACE FUNCTION public.apply_migration_009()
RETURNS jsonb AS $$
BEGIN
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS goals TEXT;
  
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS user_voice TEXT;
  
  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Migration 009 applied successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
      `);
      console.log('─'.repeat(70));
      console.log('\n   After creating the function, run this script again.\n');
      return;
    }
    
    // If function exists, call it
    const { data, error } = await supabase.rpc('apply_migration_009');
    
    if (error) {
      console.error('❌ Error:', error);
      console.log('\n📋 Please apply manually in Supabase SQL Editor (see below)\n');
      console.log('─'.repeat(70));
      console.log('ALTER TABLE public.profiles');
      console.log('  ADD COLUMN IF NOT EXISTS goals TEXT;');
      console.log('');
      console.log('ALTER TABLE public.profiles');
      console.log('  ADD COLUMN IF NOT EXISTS user_voice TEXT;');
      console.log('─'.repeat(70));
      return;
    }
    
    console.log('✅ Migration 009 applied successfully!');
    console.log('   - Added goals column to profiles');
    console.log('   - Added user_voice column to profiles');
    
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    console.log('\n📋 Manual application required. Run this in Supabase SQL Editor:\n');
    console.log('ALTER TABLE public.profiles');
    console.log('  ADD COLUMN IF NOT EXISTS goals TEXT;');
    console.log('');
    console.log('ALTER TABLE public.profiles');
    console.log('  ADD COLUMN IF NOT EXISTS user_voice TEXT;');
  }
}

applyMigration().catch(console.error);

