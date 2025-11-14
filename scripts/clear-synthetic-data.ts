/**
 * Clear Synthetic Data Script
 * 
 * Clears all synthetic user data including:
 * - user_levels (PM Levels assessments)
 * - sources, work_items, companies
 * - gaps, approved_content
 * - evaluation_runs
 * - synthetic_users table (routine QA cleanup)
 * 
 * Usage:
 *   npm run test:clear-synthetic
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file manually for Node.js
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

// Configuration
const SUPABASE_URL = envVars['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = envVars['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY!;
const TEST_USER_EMAIL = envVars['VITE_TEST_EMAIL'] || envVars['TEST_USER_EMAIL'] || process.env.VITE_TEST_EMAIL || process.env.TEST_USER_EMAIL!;
const TEST_USER_PASSWORD = envVars['VITE_TEST_PASSWORD'] || envVars['TEST_USER_PASSWORD'] || process.env.VITE_TEST_PASSWORD || process.env.TEST_USER_PASSWORD!;

if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
  console.error('Missing test credentials!');
  process.exit(1);
}

/**
 * Authenticate with Supabase and get access token
 */
async function authenticate(): Promise<{ userId: string, accessToken: string }> {
  console.log('🔐 Authenticating...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD
  });
  
  if (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
  
  if (!data.session?.access_token) {
    throw new Error('No access token received');
  }
  
  console.log(`✅ Authenticated as ${data.user.email} (${data.user.id})`);
  return {
    userId: data.user.id,
    accessToken: data.session.access_token
  };
}

/**
 * Clear all synthetic user data
 */
async function clearSyntheticData(userId: string, accessToken: string): Promise<void> {
  console.log(`🗑️  Clearing all synthetic data for user ${userId}...`);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
  
  // Delete in dependency order (child tables first)
  const tables = [
    'user_levels',      // PM Levels assessments
    'gaps',             // Gap detection results
    'approved_content', // Stories/content
    'work_items',       // Work history items
    'companies',        // Companies
    'evaluation_runs',  // Evaluation tracking
    'linkedin_profiles', // LinkedIn data
    'sources',          // Uploaded files metadata
    'synthetic_users'   // Synthetic user profiles (routine QA cleanup)
  ];
  
  let clearedCount = 0;
  let errorCount = 0;
  
  for (const table of tables) {
    try {
      const { error, count } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        // For synthetic_users, try deleting by parent_user_id
        if (table === 'synthetic_users') {
          const { error: syntheticError } = await supabase
            .from('synthetic_users')
            .delete()
            .eq('parent_user_id', userId);
          
          if (syntheticError) {
            console.warn(`⚠️  Failed to clear ${table}:`, syntheticError.message);
            errorCount++;
          } else {
            console.log(`  ✅ Cleared ${table}`);
            clearedCount++;
          }
        } else {
          console.warn(`⚠️  Failed to clear ${table}:`, error.message);
          errorCount++;
        }
      } else {
        console.log(`  ✅ Cleared ${table}${count ? ` (${count} rows)` : ''}`);
        clearedCount++;
      }
    } catch (err: any) {
      console.warn(`⚠️  Error clearing ${table}:`, err.message);
      errorCount++;
    }
  }
  
  console.log(`\n✅ Synthetic data cleared: ${clearedCount} tables, ${errorCount} errors`);
}

/**
 * Main function
 */
async function main() {
  try {
    const { userId, accessToken } = await authenticate();
    await clearSyntheticData(userId, accessToken);
    console.log('\n✅ Clear complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

