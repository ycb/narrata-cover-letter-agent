import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to read from .env or use environment variables
const envPath = path.join(__dirname, '../.env');
let SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
let SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  });
  SUPABASE_URL = envVars['VITE_SUPABASE_URL'] || SUPABASE_URL;
  SUPABASE_ANON_KEY = envVars['VITE_SUPABASE_ANON_KEY'] || SUPABASE_ANON_KEY;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyMigration() {
  console.log('🔍 Checking if migration 009 columns exist...\n');
  
  try {
    // Query information_schema to check if columns exist
    const { data, error } = await supabase.rpc('check_profile_columns', {});
    
    if (error) {
      // Fallback: try to query profiles table structure indirectly
      console.log('⚠️  Could not check via RPC. Trying direct query...\n');
      
      // Try a simple SELECT to see if columns exist (will error if they don't)
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('goals, user_voice')
        .limit(1);
      
      if (testError) {
        if (testError.message.includes('goals') || testError.message.includes('user_voice')) {
          console.log('❌ Migration 009 NOT applied - columns missing');
          console.log('\n📋 Please apply the migration in Supabase SQL Editor:');
          console.log('\n' + '─'.repeat(60));
          console.log('ALTER TABLE public.profiles');
          console.log('  ADD COLUMN IF NOT EXISTS goals TEXT;');
          console.log('');
          console.log('ALTER TABLE public.profiles');
          console.log('  ADD COLUMN IF NOT EXISTS user_voice TEXT;');
          console.log('─'.repeat(60) + '\n');
          return false;
        }
      } else {
        console.log('✅ Migration 009 applied - columns exist!');
        return true;
      }
    } else {
      console.log('✅ Migration 009 verified');
      return true;
    }
  } catch (err: any) {
    console.error('❌ Error checking migration:', err.message);
    console.log('\n📋 To verify manually, run this in Supabase SQL Editor:');
    console.log('SELECT column_name FROM information_schema.columns');
    console.log("WHERE table_name = 'profiles' AND column_name IN ('goals', 'user_voice');");
    return false;
  }
}

verifyMigration().catch(console.error);

