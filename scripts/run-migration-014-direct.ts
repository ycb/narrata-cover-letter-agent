/**
 * Run migration 014 directly
 * This script attempts to execute the migration SQL
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

async function runMigration() {
  console.log('🔄 Running migration 014: Add evidence fields...\n');
  
  // Read migration SQL
  const migrationPath = path.join(__dirname, '../supabase/migrations/014_add_evidence_fields.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  // Split into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));
  
  console.log(`📋 Executing ${statements.length} SQL statements...\n`);
  
  // Try to execute via Supabase REST API using Management API
  // Note: This typically requires service_role key
  try {
    // First, try to create a temporary function via RPC
    const createFunctionSQL = `
CREATE OR REPLACE FUNCTION public.temp_apply_migration_014()
RETURNS jsonb AS $$
BEGIN
  ${statements.join(';')};
  RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Try executing via HTTP request to Supabase Management API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ sql: migrationSQL })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Migration applied successfully!');
      console.log(result);
      return;
    } else {
      const error = await response.text();
      console.log('⚠️  Direct API call failed:', error);
    }
  } catch (err: any) {
    console.log('⚠️  Error:', err.message);
  }
  
  // Fallback: Print SQL for manual execution
  console.log('\n📋 Manual Execution Required:');
  console.log('   Please run the following SQL in Supabase SQL Editor:\n');
  console.log('─'.repeat(70));
  console.log(migrationSQL);
  console.log('─'.repeat(70));
  console.log('\n   Or use the Supabase MCP tools if available.\n');
}

runMigration().catch(console.error);

