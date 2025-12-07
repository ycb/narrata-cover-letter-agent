/**
 * Stories Generation Service
 * 
 * Generates stories for work_items that don't have them yet.
 * Called after:
 * - Resume processing completes (Edge function creates skeleton work_items)
 * - LinkedIn merge completes (adds enriched LinkedIn work_items)
 */

import { supabase } from '@/lib/supabase';

interface WorkItemForStoryGeneration {
  id: string;
  company_id: string;
  company_name: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  metrics: any[];
}

/**
 * Generate stories for work_items that don't have stories yet
 * Uses OpenAI to extract achievement-based stories from role descriptions
 */
export async function generateStoriesForWorkItems(
  userId: string,
  sourceId: string,
  openaiApiKey?: string
): Promise<{ storiesCreated: number; errors: string[] }> {
  console.log(`[StoriesGen] Generating stories for user ${userId}, source ${sourceId}`);
  
  let storiesCreated = 0;
  const errors: string[] = [];

  try {
    // 1. Fetch all work_items for this source that don't have stories yet
    const { data: workItems, error: workItemsError } = await supabase
      .from('work_items')
      .select(`
        id,
        company_id,
        title,
        description,
        start_date,
        end_date,
        metrics,
        companies!inner(name)
      `)
      .eq('user_id', userId)
      .eq('source_id', sourceId);

    if (workItemsError) {
      errors.push(`Failed to fetch work_items: ${workItemsError.message}`);
      return { storiesCreated: 0, errors };
    }

    if (!workItems || workItems.length === 0) {
      console.log('[StoriesGen] No work_items found for this source');
      return { storiesCreated: 0, errors };
    }

    console.log(`[StoriesGen] Found ${workItems.length} work_items to process`);

    // 2. For each work_item, check if it already has stories
    for (const wi of workItems) {
      const workItem = wi as any;
      const { count: existingStoriesCount } = await supabase
        .from('stories')
        .select('id', { count: 'exact', head: true })
        .eq('work_item_id', workItem.id);

      if (existingStoriesCount && existingStoriesCount > 0) {
        console.log(`[StoriesGen] Work item ${workItem.id} already has ${existingStoriesCount} stories, skipping`);
        continue;
      }

      // 3. Generate stories from the description if present
      if (!workItem.description || workItem.description.trim().length < 50) {
        console.log(`[StoriesGen] Work item ${workItem.id} has insufficient description, skipping story generation`);
        continue;
      }

      try {
        const generatedStories = await generateStoriesFromDescription(
          workItem.description,
          workItem.title,
          workItem.companies.name,
          openaiApiKey
        );

        // 4. Insert generated stories
        for (const story of generatedStories) {
          const { data: insertedStory, error: storyError } = await supabase
            .from('stories')
            .insert({
              user_id: userId,
              work_item_id: workItem.id,
              company_id: workItem.company_id,
              title: story.title,
              content: story.content,
              tags: story.tags || [],
              metrics: story.metrics || [],
              source_id: sourceId
            })
            .select('id')
            .single();

          if (storyError) {
            errors.push(`Failed to insert story for work_item ${workItem.id}: ${storyError.message}`);
          } else {
            storiesCreated++;
            console.log(`[StoriesGen] ✅ Created story: ${insertedStory?.id} for work_item ${workItem.id}`);
          }
        }
      } catch (genError) {
        const errorMsg = genError instanceof Error ? genError.message : 'Unknown error';
        errors.push(`Failed to generate stories for work_item ${workItem.id}: ${errorMsg}`);
      }
    }

    console.log(`[StoriesGen] Complete: ${storiesCreated} stories created, ${errors.length} errors`);
    return { storiesCreated, errors };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Stories generation failed: ${errorMsg}`);
    return { storiesCreated, errors };
  }
}

/**
 * Use OpenAI to extract achievement-based stories from a role description
 */
async function generateStoriesFromDescription(
  description: string,
  roleTitle: string,
  companyName: string,
  openaiApiKey?: string
): Promise<Array<{ title: string; content: string; tags: string[]; metrics: any[] }>> {
  // If no API key provided, try to get from env
  const apiKey = openaiApiKey || import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_KEY;
  
  if (!apiKey) {
    console.warn('[StoriesGen] No OpenAI API key available, skipping story generation');
    return [];
  }

  const prompt = `Extract achievement-based stories from this role description.

Role: ${roleTitle} at ${companyName}
Description: ${description}

Rules:
- Extract 1-3 concrete stories with measurable outcomes
- Each story should have: action, context, and result
- Focus on specific achievements, not general responsibilities
- Extract metrics where present (%, $, time saved, users impacted, etc.)
- Return empty array if no clear stories are present

Return JSON:
{
  "stories": [
    {
      "title": "Brief story title (max 100 chars)",
      "content": "Full story with context, action, and result (1-3 sentences)",
      "tags": ["skill", "domain", "outcome"],
      "metrics": [{"value": "50%", "context": "increase in user engagement", "type": "increase"}]
    }
  ]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    const stories = parsed.stories || [];

    // Strip sentences with numbers not present in source description to reduce hallucinated metrics
    const sourceNumbers = Array.from(description.match(/\d[\d.,]*/g) || []);
    const sourceHasNumber = (num: string) => sourceNumbers.some(n => n === num || description.includes(num));

    return stories.map((s: any) => {
      const sentences = (s.content || '').split(/(?<=[.!?])\s+/);
      const filtered = sentences.filter((sent: string) => {
        const nums = sent.match(/\d[\d.,]*/g) || [];
        if (nums.length === 0) return true;
        return nums.every(sourceHasNumber);
      });
      return {
        title: s.title || roleTitle,
        content: filtered.join(' ').trim() || s.content,
        tags: s.tags || [],
        metrics: [], // drop LLM metrics to avoid fabricated numbers
      };
    });
  } catch (error) {
    console.error('[StoriesGen] Error calling OpenAI:', error);
    return [];
  }
}
