/**
 * Deduplicate stories for a user
 * 
 * Strategy:
 * 1. Group stories by title (exact match)
 * 2. For each group, keep the best version (longest content, highest confidence)
 * 3. Delete duplicates
 * 4. Then do fuzzy matching on remaining stories
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Story {
  id: string;
  title: string;
  content: string;
  confidence: string;
  work_item_id: string;
  created_at: string;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

function scoreStory(story: Story): number {
  let score = 0;
  
  // Length score (longer is better, up to a point)
  const contentLength = story.content.length;
  if (contentLength > 100) score += 2;
  if (contentLength > 200) score += 2;
  if (contentLength > 300) score += 1;
  
  // Confidence score
  if (story.confidence === 'high') score += 3;
  else if (story.confidence === 'medium') score += 2;
  else score += 1;
  
  // Has numbers (metrics)
  if (/\d+/.test(story.content)) score += 2;
  
  // Has percentage or dollar sign
  if (/[%$]/.test(story.content)) score += 1;
  
  return score;
}

async function deduplicateStoriesForUser(userId: string, dryRun: boolean = true) {
  console.log(`\n🔍 Fetching stories for user ${userId}...`);
  
  const { data: stories, error } = await supabase
    .from('stories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching stories:', error);
    return;
  }
  
  if (!stories || stories.length === 0) {
    console.log('No stories found');
    return;
  }
  
  console.log(`📊 Found ${stories.length} stories`);
  
  // Step 1: Group by exact title match
  const titleGroups = new Map<string, Story[]>();
  for (const story of stories) {
    const normalized = normalizeTitle(story.title);
    if (!titleGroups.has(normalized)) {
      titleGroups.set(normalized, []);
    }
    titleGroups.get(normalized)!.push(story);
  }
  
  console.log(`📋 Found ${titleGroups.size} unique titles`);
  
  // Step 2: For each group, keep the best one
  const toKeep = new Set<string>();
  const toDelete = new Set<string>();
  
  for (const [title, group] of titleGroups) {
    if (group.length === 1) {
      toKeep.add(group[0].id);
      continue;
    }
    
    // Sort by score (highest first)
    group.sort((a, b) => scoreStory(b) - scoreStory(a));
    
    // Keep the best one
    toKeep.add(group[0].id);
    
    // Mark the rest for deletion
    for (let i = 1; i < group.length; i++) {
      toDelete.add(group[i].id);
    }
    
    console.log(`  📌 "${title}": keeping 1 of ${group.length} (deleted ${group.length - 1})`);
  }
  
  // Step 3: Fuzzy matching on remaining stories
  const remaining = stories.filter(s => toKeep.has(s.id));
  console.log(`\n🔎 Fuzzy matching on ${remaining.length} remaining stories...`);
  
  for (let i = 0; i < remaining.length; i++) {
    if (toDelete.has(remaining[i].id)) continue;
    
    for (let j = i + 1; j < remaining.length; j++) {
      if (toDelete.has(remaining[j].id)) continue;
      
      const similarity = calculateSimilarity(remaining[i].content, remaining[j].content);
      
      if (similarity > 0.7) {
        // Very similar - keep the better one
        const scoreI = scoreStory(remaining[i]);
        const scoreJ = scoreStory(remaining[j]);
        
        if (scoreI >= scoreJ) {
          toDelete.add(remaining[j].id);
          toKeep.delete(remaining[j].id);
          console.log(`  🔗 Merged similar stories (${(similarity * 100).toFixed(0)}% match): keeping "${remaining[i].title}"`);
        } else {
          toDelete.add(remaining[i].id);
          toKeep.delete(remaining[i].id);
          console.log(`  🔗 Merged similar stories (${(similarity * 100).toFixed(0)}% match): keeping "${remaining[j].title}"`);
          break;
        }
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Keeping: ${toKeep.size} stories`);
  console.log(`  ❌ Deleting: ${toDelete.size} stories`);
  console.log(`  📉 Reduction: ${((toDelete.size / stories.length) * 100).toFixed(1)}%`);
  
  if (dryRun) {
    console.log(`\n⚠️  DRY RUN - No changes made`);
    console.log(`Run with --execute to actually delete duplicates`);
    return;
  }
  
  // Step 4: Delete duplicates
  if (toDelete.size > 0) {
    console.log(`\n🗑️  Deleting ${toDelete.size} duplicate stories...`);
    
    const deleteIds = Array.from(toDelete);
    const batchSize = 100;
    
    for (let i = 0; i < deleteIds.length; i += batchSize) {
      const batch = deleteIds.slice(i, i + batchSize);
      const { error: deleteError } = await supabase
        .from('stories')
        .delete()
        .in('id', batch);
      
      if (deleteError) {
        console.error(`Error deleting batch ${i / batchSize + 1}:`, deleteError);
      } else {
        console.log(`  ✅ Deleted batch ${i / batchSize + 1} (${batch.length} stories)`);
      }
    }
    
    console.log(`\n✅ Deduplication complete!`);
    console.log(`Final count: ${toKeep.size} stories`);
  }
}

// Main
const userId = process.argv[2];
const execute = process.argv.includes('--execute');

if (!userId) {
  console.error('Usage: tsx scripts/dedupe-stories.ts <user_id> [--execute]');
  console.error('Example: tsx scripts/dedupe-stories.ts 015fa3cb-5f3b-4c64-be18-2c3ef811bcca --execute');
  process.exit(1);
}

deduplicateStoriesForUser(userId, !execute)
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
