#!/usr/bin/env ts-node

/**
 * Migration script to populate work_items, stories, and companies tables
 * from sources.structured_data for users where migration didn't run during upload.
 * 
 * Usage:
 *   ts-node scripts/migrate-user-work-history.ts <user_id> <source_id>
 * 
 * Example:
 *   ts-node scripts/migrate-user-work-history.ts d3937780-28ec-4221-8bfb-2bb0f670fd52 c085335a-186e-42a7-a589-63ac15324150
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

interface WorkHistoryItem {
  id: string;
  title: string;
  company: string;
  companyDescription?: string;
  companyTags?: string[];
  roleTags?: string[];
  startDate: string | null;
  endDate: string | null;
  current?: boolean;
  location?: string;
  roleSummary?: string;
  outcomeMetrics?: any[];
  stories?: any[];
}

async function migrateUserWorkHistory(userId: string, sourceId: string) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔄 Work History Migration Script');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`User ID:   ${userId}`);
  console.log(`Source ID: ${sourceId}`);
  console.log('');

  // Step 1: Fetch source data
  console.log('📥 Step 1: Fetching source data...');
  const { data: source, error: sourceError } = await supabase
    .from('sources')
    .select('id, user_id, structured_data, source_type, file_name, created_at')
    .eq('id', sourceId)
    .eq('user_id', userId)
    .single();

  if (sourceError || !source) {
    console.error('❌ Error fetching source:', sourceError);
    process.exit(1);
  }

  console.log(`✅ Found source: ${source.file_name} (${source.source_type})`);
  
  const structuredData = source.structured_data as any;
  
  if (!structuredData?.workHistory || !Array.isArray(structuredData.workHistory)) {
    console.error('❌ No workHistory found in structured_data');
    console.log('Structured data keys:', Object.keys(structuredData || {}));
    process.exit(1);
  }

  console.log(`✅ Found ${structuredData.workHistory.length} work history items`);
  console.log('');

  // Step 2: Check existing data
  console.log('🔍 Step 2: Checking for existing data...');
  const { count: existingWorkItems } = await supabase
    .from('work_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: existingStories } = await supabase
    .from('stories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  console.log(`Current work_items: ${existingWorkItems || 0}`);
  console.log(`Current stories: ${existingStories || 0}`);
  
  if (existingWorkItems && existingWorkItems > 0) {
    console.log('⚠️  Warning: User already has work items. Continue anyway? (y/n)');
    // For script, we'll continue - in production you'd want confirmation
  }
  console.log('');

  // Step 3: Prepare data for insertion
  console.log('🔧 Step 3: Preparing data for insertion...');
  
  const normalizeCompanyName = (name: string) => name.trim().toLowerCase();
  const companyIdMap = new Map<string, string>();
  
  // Build unique company payloads (deduped by normalized name)
  const companyPayloads: any[] = [];
  const seenCompanies = new Set<string>();
  
  for (const workItem of structuredData.workHistory) {
    if (!workItem.company) continue;
    const norm = normalizeCompanyName(workItem.company);
    
    // Skip if already added to payload
    if (seenCompanies.has(norm)) continue;
    seenCompanies.add(norm);
    
    companyPayloads.push({
      name: workItem.company,
      description: workItem.companyDescription || '',
      tags: workItem.companyTags || [],
      user_id: userId,
    });
  }

  console.log(`📦 Prepared ${companyPayloads.length} unique companies`);

  // Step 4: Insert companies
  console.log('');
  console.log('💾 Step 4: Inserting companies...');
  
  if (companyPayloads.length > 0) {
    const { data: upsertedCompanies, error: companiesErr } = await supabase
      .from('companies')
      .upsert(companyPayloads, { onConflict: 'user_id,name' })
      .select('id, name');

    if (companiesErr) {
      console.error('❌ Error inserting companies:', companiesErr);
      process.exit(1);
    }

    // Build company ID map
    (upsertedCompanies || []).forEach((company: any) => {
      companyIdMap.set(normalizeCompanyName(company.name), company.id);
    });

    console.log(`✅ Inserted/updated ${upsertedCompanies?.length || 0} companies`);
  }

  // Step 5: Insert work items
  console.log('');
  console.log('💾 Step 5: Inserting work items...');
  
  const workItemPayloads: any[] = [];
  const workItemIdMap = new Map<string, string>(); // temp ID -> db ID
  const skippedWorkItems: string[] = [];
  
  structuredData.workHistory.forEach((workItem: WorkHistoryItem, index: number) => {
    if (!workItem.company) {
      skippedWorkItems.push(`${workItem.title || 'Unknown'} (no company)`);
      return;
    }
    
    const companyId = companyIdMap.get(normalizeCompanyName(workItem.company));
    if (!companyId) {
      console.warn(`⚠️  No company ID found for: ${workItem.company}`);
      skippedWorkItems.push(`${workItem.title} at ${workItem.company} (company not found)`);
      return;
    }

    // Parse dates properly - convert string "null" or invalid dates to null
    const parseDate = (dateStr: any) => {
      if (!dateStr || dateStr === 'null' || dateStr === 'Invalid Date') return null;
      return dateStr;
    };
    
    const startDate = parseDate(workItem.startDate);
    
    // Skip work items without start_date (required field)
    if (!startDate) {
      skippedWorkItems.push(`${workItem.title} at ${workItem.company} (no start date)`);
      console.warn(`⚠️  Skipping work item with no start_date: ${workItem.title} at ${workItem.company}`);
      return;
    }

    const tempId = `temp_${index}`;
    
    workItemPayloads.push({
      user_id: userId,
      company_id: companyId,
      title: workItem.title || 'Unknown Role',
      description: workItem.roleSummary || '',
      tags: workItem.roleTags || [],
      start_date: startDate,
      end_date: workItem.current ? null : parseDate(workItem.endDate),
      source_id: sourceId,
      metrics: workItem.outcomeMetrics || [],
      achievements: [], // Will be populated from stories
    });
  });

  console.log(`📦 Prepared ${workItemPayloads.length} work items`);
  if (skippedWorkItems.length > 0) {
    console.log(`⚠️  Skipped ${skippedWorkItems.length} work items due to missing data:`);
    skippedWorkItems.forEach(item => console.log(`   - ${item}`));
  }

  const { data: insertedWorkItems, error: workItemsErr } = await supabase
    .from('work_items')
    .insert(workItemPayloads)
    .select('id, title, company_id');

  if (workItemsErr) {
    console.error('❌ Error inserting work items:', workItemsErr);
    process.exit(1);
  }

  console.log(`✅ Inserted ${insertedWorkItems?.length || 0} work items`);

  // Build work item ID map
  (insertedWorkItems || []).forEach((item: any, index: number) => {
    workItemIdMap.set(`temp_${index}`, item.id);
  });

  // Step 6: Insert stories
  console.log('');
  console.log('💾 Step 6: Inserting stories...');
  
  const storyPayloads: any[] = [];
  let totalStories = 0;
  
  structuredData.workHistory.forEach((workItem: WorkHistoryItem, workIndex: number) => {
    const workItemId = workItemIdMap.get(`temp_${workIndex}`);
    if (!workItemId) return;

    const stories = workItem.stories || [];
    totalStories += stories.length;

    stories.forEach((story: any) => {
      // Build content from STAR format if available
      let content = story.content || story.summary || '';
      if (story.star && !content) {
        const parts = [];
        if (story.star.situation) parts.push(`Situation: ${story.star.situation}`);
        if (story.star.task) parts.push(`Task: ${story.star.task}`);
        if (story.star.action) parts.push(`Action: ${story.star.action}`);
        if (story.star.result) parts.push(`Result: ${story.star.result}`);
        content = parts.join('\n\n');
      }
      
      storyPayloads.push({
        user_id: userId,
        work_item_id: workItemId,
        source_id: sourceId,
        title: story.title || 'Untitled Achievement',
        content: content,
        status: 'approved',
        confidence: 'high',
        tags: story.tags || [],
        metrics: story.metrics || [],
        times_used: 0,
        last_used: null,
        source_type: 'resume',
      });
    });
  });

  console.log(`📦 Prepared ${storyPayloads.length} stories`);

  if (storyPayloads.length > 0) {
    const { data: insertedStories, error: storiesErr } = await supabase
      .from('stories')
      .insert(storyPayloads)
      .select('id, title');

    if (storiesErr) {
      console.error('❌ Error inserting stories:', storiesErr);
      process.exit(1);
    }

    console.log(`✅ Inserted ${insertedStories?.length || 0} stories`);
  }

  // Step 7: Verify results
  console.log('');
  console.log('✅ Step 7: Verifying results...');
  
  const { count: finalWorkItems } = await supabase
    .from('work_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: finalStories } = await supabase
    .from('stories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: finalCompanies } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 Migration Complete!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Companies:   ${existingWorkItems || 0} → ${finalCompanies || 0} (+${(finalCompanies || 0) - (existingWorkItems || 0)})`);
  console.log(`Work Items:  ${existingWorkItems || 0} → ${finalWorkItems || 0} (+${(finalWorkItems || 0) - (existingWorkItems || 0)})`);
  console.log(`Stories:     ${existingStories || 0} → ${finalStories || 0} (+${(finalStories || 0) - (existingStories || 0)})`);
  console.log('═══════════════════════════════════════════════════════════');
}

// Run the migration
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: ts-node scripts/migrate-user-work-history.ts <user_id> <source_id>');
  console.error('');
  console.error('Example:');
  console.error('  ts-node scripts/migrate-user-work-history.ts \\');
  console.error('    d3937780-28ec-4221-8bfb-2bb0f670fd52 \\');
  console.error('    c085335a-186e-42a7-a589-63ac15324150');
  process.exit(1);
}

const [userId, sourceId] = args;

migrateUserWorkHistory(userId, sourceId)
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
