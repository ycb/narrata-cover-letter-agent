#!/usr/bin/env tsx
/**
 * Admin script to trigger PM Levels analysis using service role (bypasses RLS)
 * 
 * Usage:
 *   npm run trigger:pm-levels:admin d3937780-28ec-4221-8bfb-2bb0f670fd52
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('   VITE_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

// Create admin client with service role (bypasses RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function triggerPMLevelsForUser(userId: string) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧠 PM Levels Analysis Script (ADMIN MODE - bypasses RLS)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('User ID:', userId);
  console.log('');

  try {
    // Step 1: Verify user has work history
    console.log('📋 Step 1: Checking work history...');
    const { data: workItems, error: workError } = await supabaseAdmin
      .from('work_items')
      .select('id, title, company_id')
      .eq('user_id', userId);

    if (workError) {
      console.error('❌ Error fetching work items:', workError);
      return;
    }

    console.log(`✅ Found ${workItems?.length || 0} work items`);
    if (!workItems || workItems.length === 0) {
      console.log('⚠️  No work history found. PM Levels requires work history.');
      return;
    }

    console.log('');

    // Step 2: Fetch all required data (using service role)
    console.log('📊 Step 2: Fetching user content...');
    
    const [sourcesRes, storiesRes, companiesRes] = await Promise.all([
      supabaseAdmin
        .from('sources')
        .select('id, source_type, raw_text, structured_data, file_name, created_at')
        .eq('user_id', userId)
        .eq('processing_status', 'completed'),
      
      supabaseAdmin
        .from('stories')
        .select('id, title, content, tags, metrics, work_item_id, company, title_role, created_at')
        .eq('user_id', userId),
      
      supabaseAdmin
        .from('companies')
        .select('id, name, description, tags, created_at')
        .eq('user_id', userId)
    ]);

    const sources = sourcesRes.data || [];
    const stories = storiesRes.data || [];
    const companies = companiesRes.data || [];

    console.log(`   Sources: ${sources.length}`);
    console.log(`   Stories: ${stories.length}`);
    console.log(`   Companies: ${companies.length}`);
    console.log(`   Work Items: ${workItems.length}`);
    console.log('');

    // Step 3: Call the edge function to create PM Levels job
    console.log('🔧 Step 3: Creating PM Levels job via edge function...');
    
    const edgeResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        type: 'pmLevels',
        userId: userId,
        options: {
          sessionId: `pm-level-admin-${Date.now()}`,
          triggerReason: 'manual-admin-script',
          runType: 'initial'
        }
      })
    });

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text();
      console.error('❌ Edge function failed:', edgeResponse.status, errorText);
      return;
    }

    const jobResult = await edgeResponse.json();
    console.log('✅ Job created:', jobResult.jobId);
    console.log('');

    // Step 4: Wait for job to complete and check result
    console.log('⏳ Step 4: Waiting for job to complete...');
    
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    let jobData = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: job } = await supabaseAdmin
        .from('jobs')
        .select('id, status, type, result')
        .eq('id', jobResult.jobId)
        .single();

      if (job?.status === 'complete') {
        jobData = job;
        break;
      } else if (job?.status === 'failed') {
        console.error('❌ Job failed');
        return;
      }

      attempts++;
      process.stdout.write('.');
    }

    console.log('');

    if (!jobData) {
      console.log('⚠️  Job timeout (still running after 30s)');
      console.log('   Check jobs table manually for result');
      return;
    }

    // Step 5: Display result
    console.log('✅ Step 5: Job complete!');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 PM Levels Result:');
    console.log('═══════════════════════════════════════════════════════════');
    
    const result = jobData.result as any;
    
    if (result.inferred_level) {
      console.log('🎯 Level Code:', result.inferred_level);
      console.log('🎯 Level Display:', result.level_display || result.currentLevel);
      console.log('🎯 Confidence:', result.confidence);
      console.log('🎯 Competency Scores:', JSON.stringify(result.competency_scores || result.competencies, null, 2));
      console.log('🎯 Scope Score:', result.scope_score);
      
      if (result.nextLevel) {
        console.log('📈 Next Level:', result.nextLevel);
      }
    } else {
      console.log('⚠️  No level result in job data');
      console.log('Raw result:', JSON.stringify(result, null, 2));
    }

    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Main execution
const userId = process.argv[2];

if (!userId) {
  console.error('Usage: npm run trigger:pm-levels:admin <user-id>');
  process.exit(1);
}

triggerPMLevelsForUser(userId)
  .then(() => {
    console.log('✅ Script complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
