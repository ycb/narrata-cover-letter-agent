/**
 * Apply migration 014: Add evidence fields to user_levels table
 * 
 * This migration adds JSONB columns to store evidence collected for PM level assessment:
 * - evidence_by_competency
 * - level_evidence  
 * - role_archetype_evidence
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
  console.log('🔄 Applying migration 014: Add evidence fields to user_levels...\n');
  
  // Read the migration SQL
  const migrationPath = path.join(__dirname, '../supabase/migrations/014_add_evidence_fields.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  try {
    // Try to execute via RPC if available, otherwise provide manual instructions
    // Note: ALTER TABLE typically requires service_role key or direct SQL execution
    
    console.log('📋 Migration SQL:');
    console.log('─'.repeat(70));
    console.log(migrationSQL);
    console.log('─'.repeat(70));
    console.log('\n⚠️  Note: This migration requires elevated permissions.');
    console.log('   Attempting to apply via Supabase client...\n');
    
    // Try to execute each statement separately
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.includes('ALTER TABLE') || statement.includes('CREATE INDEX') || statement.includes('COMMENT')) {
        try {
          // Try using RPC if available
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          if (error) {
            console.log(`⚠️  Could not execute via RPC: ${error.message}`);
            console.log('   This statement needs to be run manually in Supabase SQL Editor\n');
          } else {
            console.log(`✅ Executed: ${statement.substring(0, 60)}...`);
          }
        } catch (err: any) {
          console.log(`⚠️  Could not execute: ${err.message}`);
        }
      }
    }
    
    console.log('\n📋 Manual Application Required:');
    console.log('   Please run the migration SQL in your Supabase SQL Editor:');
    console.log(`   File: ${migrationPath}\n`);
    console.log('   Or copy the SQL above and run it in Supabase Dashboard > SQL Editor\n');
    
    // Verify the columns exist
    console.log('🔍 Verifying migration...');
    const { data, error } = await supabase
      .from('user_levels')
      .select('evidence_by_competency, level_evidence, role_archetype_evidence')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Migration not applied - columns do not exist yet');
        console.log('   Please run the SQL manually in Supabase SQL Editor\n');
      } else {
        console.log(`⚠️  Could not verify: ${error.message}`);
      }
    } else {
      console.log('✅ Migration appears to be applied - columns exist!');
      console.log('   Evidence fields are now available in user_levels table\n');
    }
    
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    console.log('\n📋 Please apply manually in Supabase SQL Editor (see SQL above)\n');
  }
}

applyMigration().catch(console.error);

