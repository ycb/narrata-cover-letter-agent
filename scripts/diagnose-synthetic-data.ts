#!/usr/bin/env tsx
/**
 * Diagnostic script to check synthetic profile data in Supabase
 * Checks sources, work_items, and their linkage
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseProfile(profileId: string, userId: string) {
  console.log(`\n🔍 Diagnosing Profile: ${profileId}`);
  console.log('=' .repeat(60));
  
  // 1. Check sources
  const { data: sources, error: sourcesError } = await supabase
    .from('sources')
    .select('id, file_name, file_type, processing_status, created_at')
    .eq('user_id', userId)
    .like('file_name', `${profileId}_%`)
    .order('created_at', { ascending: false });
  
  if (sourcesError) {
    console.error('❌ Error fetching sources:', sourcesError);
    return;
  }
  
  console.log(`\n📄 Sources (${sources?.length || 0}):`);
  if (sources && sources.length > 0) {
    const sourceIds = sources.map(s => s.id);
    console.log('Source IDs:', sourceIds);
    sources.forEach(s => {
      console.log(`  - ${s.file_name} (${s.file_type}) [${s.processing_status}]`);
      console.log(`    ID: ${s.id}`);
    });
    
    // 2. Check work_items with source_id matching these sources
    const { data: workItems, error: workItemsError } = await supabase
      .from('work_items')
      .select('id, title, company_id, source_id, user_id, created_at')
      .eq('user_id', userId)
      .in('source_id', sourceIds);
    
    if (workItemsError) {
      console.error('❌ Error fetching work_items:', workItemsError);
    } else {
      console.log(`\n💼 Work Items with matching source_id (${workItems?.length || 0}):`);
      if (workItems && workItems.length > 0) {
        workItems.forEach(wi => {
          console.log(`  - ${wi.title || 'Untitled'} (source_id: ${wi.source_id})`);
        });
      } else {
        console.log('  ⚠️  No work_items found with matching source_id');
        
        // Check if work_items exist at all for this user
        const { data: allWorkItems } = await supabase
          .from('work_items')
          .select('id, title, source_id, created_at')
          .eq('user_id', userId)
          .limit(10);
        
        console.log(`\n📊 Total work_items for user (any source): ${allWorkItems?.length || 0}`);
        if (allWorkItems && allWorkItems.length > 0) {
          const withSourceId = allWorkItems.filter(wi => wi.source_id).length;
          const withoutSourceId = allWorkItems.length - withSourceId;
          console.log(`  - ${withSourceId} with source_id, ${withoutSourceId} without`);
          
          // Show first few
          console.log('\n  Sample work_items:');
          allWorkItems.slice(0, 5).forEach(wi => {
            console.log(`    - ${wi.title || 'Untitled'} [source_id: ${wi.source_id || 'NULL'}]`);
          });
        }
      }
    }
    
    // 3. Check evaluation_runs to see processing status
    const { data: evalRuns, error: evalError } = await supabase
      .from('evaluation_runs')
      .select('id, source_id, file_type, processing_status, total_latency_ms, created_at')
      .in('source_id', sourceIds)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (evalError) {
      console.error('❌ Error fetching evaluation_runs:', evalError);
    } else {
      console.log(`\n📈 Evaluation Runs (${evalRuns?.length || 0}):`);
      if (evalRuns && evalRuns.length > 0) {
        evalRuns.forEach(er => {
          console.log(`  - ${er.file_type} [${er.processing_status}] (${er.total_latency_ms}ms)`);
          console.log(`    source_id: ${er.source_id}`);
        });
      }
    }
  } else {
    console.log('  ⚠️  No sources found for this profile');
  }
}

async function main() {
  const userId = process.argv[2] || 'c7f68bb8-1070-4601-b8d8-767185f3e8a7';
  const profileId = process.argv[3] || 'P04';
  
  console.log(`\n🔬 Synthetic Data Diagnostic Tool`);
  console.log(`User ID: ${userId}`);
  console.log(`Profile ID: ${profileId}`);
  
  // Diagnose specific profile
  await diagnoseProfile(profileId, userId);
  
  // Also check P01 since it was recently re-uploaded
  if (profileId !== 'P01') {
    console.log('\n\n');
    await diagnoseProfile('P01', userId);
  }
  
  console.log('\n✅ Diagnostic complete\n');
}

main().catch(console.error);

