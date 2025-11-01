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

const SUPABASE_URL = envVars['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = envVars['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY!;

// Note: This might require service_role key for ALTER TABLE operations
// If this fails, you'll need to run it in Supabase SQL Editor

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyMigration() {
  console.log('🔄 Applying migration 009: Add goals and user_voice columns to profiles...\n');
  
  try {
    // Try to add columns using SQL function call
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.profiles
          ADD COLUMN IF NOT EXISTS goals TEXT;

        ALTER TABLE public.profiles
          ADD COLUMN IF NOT EXISTS user_voice TEXT;
      `
    });

    if (error) {
      console.error('❌ Error applying migration:', error);
      console.log('\n📋 Manual Application Required:');
      console.log('The migration requires elevated permissions.');
      console.log('Please run this SQL in your Supabase SQL Editor:\n');
      console.log('-- Migration 009: Add goals and user_voice columns');
      console.log('ALTER TABLE public.profiles');
      console.log('  ADD COLUMN IF NOT EXISTS goals TEXT;');
      console.log('');
      console.log('ALTER TABLE public.profiles');
      console.log('  ADD COLUMN IF NOT EXISTS user_voice TEXT;');
      return;
    }

    console.log('✅ Migration 009 applied successfully!');
    console.log('   - Added goals column to profiles');
    console.log('   - Added user_voice column to profiles');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    console.log('\n📋 Please apply manually in Supabase SQL Editor (see above)');
  }
}

applyMigration().catch(console.error);

