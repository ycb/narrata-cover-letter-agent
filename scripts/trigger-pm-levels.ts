#!/usr/bin/env tsx

/**
 * Trigger PM Levels analysis for a user.
 * 
 * Usage:
 *   tsx scripts/trigger-pm-levels.ts <user_id>
 * 
 * Example:
 *   tsx scripts/trigger-pm-levels.ts d3937780-28ec-4221-8bfb-2bb0f670fd52
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function triggerPMLevels(userId: string) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧠 PM Levels Analysis Script');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`User ID: ${userId}`);
  console.log('');

  // Step 1: Verify user has work history
  console.log('📋 Step 1: Checking work history...');
  const { data: workItems, error: workItemsError } = await supabase
    .from('work_items')
    .select('id, title')
    .eq('user_id', userId);

  if (workItemsError) {
    console.error('❌ Error fetching work items:', workItemsError);
    process.exit(1);
  }

  if (!workItems || workItems.length === 0) {
    console.error('❌ No work items found for user. Upload resume first.');
    process.exit(1);
  }

  console.log(`✅ Found ${workItems.length} work items`);
  console.log('');

  // Step 2: Import and run PM Levels service
  console.log('🔧 Step 2: Running PM Levels analysis...');
  const startTime = Date.now();

  try {
    const { PMLevelsService } = await import('../src/services/pmLevelsService.js');
    const pmService = new PMLevelsService();

    const result = await pmService.analyzeUserLevel(
      userId,
      undefined, // targetLevel
      undefined, // roleType
      {
        sessionId: `pm-level-script-${Date.now()}`,
        triggerReason: 'manual-script',
        runType: 'initial'
      }
    );

    const durationMs = Date.now() - startTime;
    console.log(`✅ Analysis complete in ${durationMs}ms`);
    console.log('');

    if (result) {
      console.log('📊 Results:');
      console.log(`   Level: ${result.level || 'Unknown'}`);
      console.log(`   Confidence: ${result.confidence || 'Unknown'}`);
      console.log(`   Primary Role: ${result.primaryRole || 'Unknown'}`);
      if (result.evidence && result.evidence.length > 0) {
        console.log(`   Evidence items: ${result.evidence.length}`);
      }
    } else {
      console.warn('⚠️  Analysis returned no result');
    }
  } catch (error) {
    console.error('❌ Error running PM Levels analysis:', error);
    throw error;
  }
  console.log('');

  // Step 3: Verify result saved to database
  console.log('✅ Step 3: Verifying results...');
  const { data: userLevel, error: levelError } = await supabase
    .from('user_levels')
    .select('id, inferred_level, confidence, role_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (levelError) {
    console.error('❌ Error fetching user level:', levelError);
  } else if (userLevel) {
    console.log('✅ Result saved to user_levels table:');
    console.log(`   ID: ${userLevel.id}`);
    console.log(`   Level: ${userLevel.inferred_level}`);
    console.log(`   Confidence: ${userLevel.confidence}`);
    console.log(`   Role Types: ${userLevel.role_type?.join(', ') || 'None'}`);
    console.log(`   Created: ${userLevel.created_at}`);
  } else {
    console.warn('⚠️  No entry found in user_levels table (analysis may have failed)');
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 PM Levels Analysis Complete!');
  console.log('═══════════════════════════════════════════════════════════');
}

// Run the script
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: tsx scripts/trigger-pm-levels.ts <user_id>');
  console.error('');
  console.error('Example:');
  console.error('  tsx scripts/trigger-pm-levels.ts d3937780-28ec-4221-8bfb-2bb0f670fd52');
  process.exit(1);
}

const [userId] = args;

triggerPMLevels(userId)
  .then(() => {
    console.log('');
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
