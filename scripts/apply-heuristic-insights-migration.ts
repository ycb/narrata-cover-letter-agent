/**
 * Apply heuristic_insights column migration
 * Phase 1: Agent D - Heuristic Gap Detection
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
  console.log('🔄 Running migration: Add heuristic_insights column...\n');

  // Read migration SQL
  const migrationPath = path.join(__dirname, '../supabase/migrations/20251119_add_heuristic_insights_column.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📋 Migration SQL:\n');
  console.log('─'.repeat(70));
  console.log(migrationSQL);
  console.log('─'.repeat(70));

  // Try to execute via Supabase REST API
  try {
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
      console.log('\n✅ Migration applied successfully!');
      console.log(result);
      return;
    } else {
      const error = await response.text();
      console.log('\n⚠️  Direct API call failed:', error);
    }
  } catch (err: any) {
    console.log('\n⚠️  Error:', err.message);
  }

  // Fallback: Print instructions
  console.log('\n📋 Manual Execution Required:');
  console.log('   Please run the migration SQL above in one of these ways:\n');
  console.log('   1. Supabase Dashboard → SQL Editor → paste and run');
  console.log('   2. Use psql if available');
  console.log('   3. Use Supabase MCP tools\n');
}

runMigration().catch(console.error);
