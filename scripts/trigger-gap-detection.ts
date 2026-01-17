#!/usr/bin/env tsx

/**
 * Trigger gap detection for a user's work history, stories, and saved sections.
 * 
 * Usage:
 *   tsx scripts/trigger-gap-detection.ts <user_id>
 * 
 * Example:
 *   tsx scripts/trigger-gap-detection.ts d3937780-28ec-4221-8bfb-2bb0f670fd52
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

// Import gap detection service
// Note: This requires building the service or using tsx/ts-node with proper module resolution
async function detectGaps(userId: string) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 Gap Detection Script');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`User ID: ${userId}`);
  console.log('');

  const { GapDetectionService } = await import('../src/services/gapDetectionService.js');
  const allGaps: any[] = [];

  // Step 1: Detect gaps for work items
  console.log('📋 Step 1: Detecting work item gaps...');
  const { data: workItems, error: workItemsError } = await supabase
    .from('work_items')
    .select('id, title, description, metrics, start_date, end_date, tags')
    .eq('user_id', userId);

  if (workItemsError) {
    console.error('❌ Error fetching work items:', workItemsError);
  } else if (workItems && workItems.length > 0) {
    console.log(`   Found ${workItems.length} work items`);
    
    for (const item of workItems) {
      try {
        // ✅ Correct signature: detectWorkItemGaps(userId, workItemId, workItemData, stories?)
        const gaps = await GapDetectionService.detectWorkItemGaps(
          userId,
          item.id,
          {
            title: item.title,
            description: item.description || '',
            metrics: item.metrics || [],
            startDate: item.start_date,
            endDate: item.end_date,
            tags: item.tags || []
          }
        );
        allGaps.push(...gaps);
        if (gaps.length > 0) {
          console.log(`   ✓ ${item.title}: ${gaps.length} gap(s)`);
        }
      } catch (error) {
        console.error(`   ✗ Error detecting gaps for ${item.title}:`, error);
      }
    }
  } else {
    console.log('   No work items found');
  }
  console.log('');

  // Step 2: Detect gaps for stories
  console.log('📖 Step 2: Detecting story gaps...');
  const { data: stories, error: storiesError } = await supabase
    .from('stories')
    .select('id, title, content, metrics, work_item_id')
    .eq('user_id', userId);

  if (storiesError) {
    console.error('❌ Error fetching stories:', storiesError);
  } else if (stories && stories.length > 0) {
    console.log(`   Found ${stories.length} stories`);
    
    for (const story of stories) {
      try {
        // ✅ Correct signature: detectStoryGaps(userId, story, workItemId?)
        const gaps = await GapDetectionService.detectStoryGaps(
          userId,
          {
            id: story.id,
            title: story.title,
            content: story.content,
            metrics: story.metrics || []
          },
          story.work_item_id || undefined
        );
        allGaps.push(...gaps);
        if (gaps.length > 0) {
          console.log(`   ✓ ${story.title}: ${gaps.length} gap(s)`);
        }
      } catch (error) {
        console.error(`   ✗ Error detecting gaps for ${story.title}:`, error);
      }
    }
  } else {
    console.log('   No stories found');
  }
  console.log('');

  // Step 3: Detect gaps for saved sections
  console.log('📝 Step 3: Detecting saved section gaps...');
  const { data: sections, error: sectionsError } = await supabase
    .from('saved_sections')
    .select('id, type, content, title')
    .eq('user_id', userId);

  if (sectionsError) {
    console.error('❌ Error fetching saved sections:', sectionsError);
  } else if (sections && sections.length > 0) {
    console.log(`   Found ${sections.length} saved sections`);
    
    for (const section of sections) {
      try {
        // ✅ Map database types to expected types
        const typeMapping: Record<string, 'intro' | 'paragraph' | 'closer' | 'signature'> = {
          'intro': 'intro',
          'body': 'paragraph',
          'closer': 'closer',
          'signature': 'signature'
        };
        
        const mappedType = typeMapping[section.type] || 'paragraph';
        
        const gaps = await GapDetectionService.detectCoverLetterSectionGaps(
          userId,
          {
            id: section.id,
            type: mappedType,
            content: section.content,
            title: section.title
          }
        );
        allGaps.push(...gaps);
        if (gaps.length > 0) {
          console.log(`   ✓ ${section.title}: ${gaps.length} gap(s)`);
        }
      } catch (error) {
        console.error(`   ✗ Error detecting gaps for ${section.title}:`, error);
      }
    }
  } else {
    console.log('   No saved sections found');
  }
  console.log('');

  // Step 4: Save all gaps
  console.log('💾 Step 4: Saving gaps...');
  if (allGaps.length > 0) {
    try {
      await GapDetectionService.saveGaps(allGaps, SUPABASE_SERVICE_ROLE_KEY);
      console.log(`✅ Saved ${allGaps.length} gaps to database`);
    } catch (error) {
      console.error('❌ Error saving gaps:', error);
      throw error;
    }
  } else {
    console.log('   No gaps to save');
  }
  console.log('');

  // Step 5: Verify results
  console.log('✅ Step 5: Verifying results...');
  const { count: gapCount } = await supabase
    .from('gaps')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 Gap Detection Complete!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total gaps in database: ${gapCount || 0}`);
  console.log('═══════════════════════════════════════════════════════════');
}

// Run the script
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: tsx scripts/trigger-gap-detection.ts <user_id>');
  console.error('');
  console.error('Example:');
  console.error('  tsx scripts/trigger-gap-detection.ts d3937780-28ec-4221-8bfb-2bb0f670fd52');
  process.exit(1);
}

const [userId] = args;

detectGaps(userId)
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
