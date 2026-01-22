import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { buildResumeAnalysisPrompt } from '../../../src/prompts/resumeAnalysis.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ProgressEvent =
  | 'start' // server received request
  | 'text_loaded' // raw text available
  | 'analyzing' // OpenAI call in flight
  | 'analysis_complete' // structured_data ready
  | 'persisting' // writing companies/work_items/stories
  | 'gaps_queued' // background gap detection trigger
  | 'complete'
  | 'error';

const formatSSE = (event: ProgressEvent, data: Record<string, unknown>) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function callOpenAI({
  apiKey,
  model,
  prompt,
  maxTokens,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  maxTokens?: number;
}) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: maxTokens ?? 3000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI response missing content');
  }

  return JSON.parse(content);
}

/**
 * Persist resume structured data into companies/work_items/stories tables.
 * Mirrors existing client logic but runs server-side.
 */
async function persistResumeStructuredData(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sourceId: string,
  structuredData: any
) {
  if (!structuredData?.workHistory || !Array.isArray(structuredData.workHistory)) {
    return;
  }

  for (const workItem of structuredData.workHistory) {
    if (!workItem?.title || !workItem?.company) {
      continue;
    }

    // Upsert company
    let companyId: string | undefined;
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .eq('name', workItem.company)
      .maybeSingle();

    if (existingCompany?.id) {
      companyId = existingCompany.id;
      const updates: Record<string, unknown> = {};
      if (workItem.companyDescription) updates.description = workItem.companyDescription;
      if (Array.isArray(workItem.companyTags)) updates.tags = workItem.companyTags;
      if (Object.keys(updates).length > 0) {
        await supabase.from('companies').update(updates).eq('id', companyId);
      }
    } else {
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          user_id: userId,
          name: workItem.company,
          description: workItem.companyDescription || '',
          tags: workItem.companyTags || [],
        })
        .select('id')
        .single();
      if (companyError) {
        console.error('Failed to create company', companyError);
        continue;
      }
      companyId = newCompany?.id;
    }

    if (!companyId) continue;

    // Find existing work item (company + title + overlapping dates)
    const { data: candidateWorkItems } = await supabase
      .from('work_items')
      .select('id, start_date, end_date')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('title', workItem.title.trim());

    const workItemStartDate = workItem.startDate ? new Date(workItem.startDate) : null;
    const workItemEndDate =
      workItem.endDate === 'Present' || workItem.endDate === 'Current' || workItem.current === true
        ? null
        : workItem.endDate
        ? new Date(workItem.endDate)
        : null;

    let workItemId: string | undefined;
    const overlapping = (candidateWorkItems || []).find((candidate: any) => {
      const start = candidate.start_date ? new Date(candidate.start_date) : null;
      const end = candidate.end_date ? new Date(candidate.end_date) : null;
      if (!workItemStartDate || !start) return false;
      const startDiffDays = Math.abs(start.getTime() - workItemStartDate.getTime()) / (1000 * 60 * 60 * 24);
      if (!workItemEndDate && !end) return startDiffDays < 90;
      if (!workItemEndDate || !end) return startDiffDays < 90;
      const endDiffDays = Math.abs(end.getTime() - workItemEndDate.getTime()) / (1000 * 60 * 60 * 24);
      return startDiffDays < 90 && endDiffDays < 90;
    });

    if (overlapping?.id) {
      workItemId = overlapping.id;
      await supabase
        .from('work_items')
        .update({
          description: workItem.roleSummary || workItem.description || '',
          achievements:
            workItem.outcomeMetrics?.map((m: any) => `${m.value || ''} ${m.context || ''}`).filter(Boolean) ||
            workItem.achievements ||
            [],
          tags: workItem.roleTags || workItem.tags || [],
          metrics:
            Array.isArray(workItem.outcomeMetrics) && workItem.outcomeMetrics.length > 0
              ? workItem.outcomeMetrics.map((m: any) => ({ ...m, parentType: m.parentType || 'role' }))
              : [],
          source_id: sourceId,
        })
        .eq('id', workItemId);
    } else {
      const { data: newWorkItem, error: workItemError } = await supabase
        .from('work_items')
        .insert({
          user_id: userId,
          company_id: companyId,
          title: workItem.title.trim(),
          start_date: workItem.startDate || null,
          end_date: workItemEndDate,
          description: workItem.roleSummary || workItem.description || '',
          achievements:
            workItem.outcomeMetrics?.map((m: any) => `${m.value || ''} ${m.context || ''}`).filter(Boolean) ||
            workItem.achievements ||
            [],
          tags: workItem.roleTags || workItem.tags || [],
          metrics:
            Array.isArray(workItem.outcomeMetrics) && workItem.outcomeMetrics.length > 0
              ? workItem.outcomeMetrics.map((m: any) => ({ ...m, parentType: m.parentType || 'role' }))
              : [],
          source_id: sourceId,
        })
        .select('id')
        .single();
      if (workItemError) {
        console.error('Failed to create work item', workItemError);
        continue;
      }
      workItemId = newWorkItem?.id;
    }

    if (!workItemId) continue;

    if (!workItem.stories || !Array.isArray(workItem.stories) || workItem.stories.length === 0) {
      continue;
    }

    for (const story of workItem.stories) {
      if (!story?.content && !story?.title) {
        continue;
      }

      const storyTitle = story.title || story.content?.substring(0, 100);
      const { data: existingStory } = await supabase
        .from('stories')
        .select('id')
        .eq('work_item_id', workItemId)
        .eq('title', storyTitle)
        .maybeSingle();

      if (existingStory?.id) {
        continue;
      }

      const storyMetrics = Array.isArray(story.metrics)
        ? story.metrics.map((m: any) => ({ ...m, parentType: m.parentType || 'story' }))
        : [];

      await supabase.from('stories').insert({
        user_id: userId,
        work_item_id: workItemId,
        company_id: companyId,
        title: storyTitle,
        content: story.content || '',
        tags: story.tags || [],
        metrics: storyMetrics,
        source_id: sourceId,
      });
    }
  }
}

// Lightweight gap detection to mirror client GapDetectionService outputs.
// NOTE: This is heuristic and should be kept aligned with client logic for parity.
async function runGapDetection(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sourceId: string
) {
  try {
    // Load work items and stories for this source
    const { data: workItems, error: workItemsError } = await supabase
      .from('work_items')
      .select('id, title, description, metrics')
      .eq('user_id', userId)
      .eq('source_id', sourceId);

    if (workItemsError) {
      console.error('Gap detection: failed to load work_items', workItemsError);
      return;
    }

    const workItemIds = (workItems || []).map((w: any) => w.id);
    let stories: any[] = [];

    if (workItemIds.length > 0) {
      const { data: storyRows, error: storiesError } = await supabase
        .from('stories')
        .select('id, title, content, metrics, work_item_id')
        .in('work_item_id', workItemIds)
        .eq('user_id', userId);
      if (storiesError) {
        console.error('Gap detection: failed to load stories', storiesError);
      } else {
        stories = storyRows || [];
      }
    }

    // Clear previous gaps for these entities to avoid duplicates
    if (workItemIds.length > 0 || stories.length > 0) {
      const storyIds = stories.map((s: any) => s.id);
      const gapFilter = [
        workItemIds.length > 0
          ? `and(entity_type.eq.work_item,entity_id.in.(${workItemIds.map((id: string) => `"${id}"`).join(',')}))`
          : '',
        storyIds.length > 0
          ? `and(entity_type.eq.approved_content,entity_id.in.(${storyIds.map((id: string) => `"${id}"`).join(',')}))`
          : '',
      ]
        .filter(Boolean)
        .join(',');

      if (gapFilter) {
        const { data: gapRows, error: gapFetchError } = await supabase
          .from('gaps')
          .select('*')
          .or(gapFilter);

        if (gapFetchError) {
          console.error('Gap detection: failed to load gaps for archive', gapFetchError);
        } else if (gapRows && gapRows.length > 0) {
          const purgeAfter = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
          const payload = gapRows.map((row: any) => ({
            user_id: row.user_id ?? userId,
            source_table: 'gaps',
            source_id: String(row.id),
            source_data: row,
            deleted_by: userId,
            purge_after: purgeAfter
          }));

          const { error: archiveError } = await supabase
            .from('deleted_records')
            .insert(payload);

          if (archiveError) {
            console.error('Gap detection: failed to archive gaps', archiveError);
          }
        }

        const { error: deleteError } = await supabase
          .from('gaps')
          .delete()
          .or(gapFilter);

        if (deleteError) {
          console.error('Gap detection: failed to clear old gaps', deleteError);
        }
      }
    }

    const gaps: any[] = [];

    const hasMetric = (metrics?: any[]) =>
      Array.isArray(metrics) && metrics.length > 0;

    const looksGeneric = (text?: string) => {
      if (!text) return true;
      const trimmed = text.trim();
      if (trimmed.length < 40) return true;
      const genericPatterns = /(responsible for|worked on|helped with|assisted)/i;
      return genericPatterns.test(trimmed);
    };

    const hasNumbers = (text?: string) => /\d|%|\$|million|thousand|k\b/i.test(text || '');

    const storyMap = new Map<string, any[]>();
    for (const story of stories) {
      const list = storyMap.get(story.work_item_id) || [];
      list.push(story);
      storyMap.set(story.work_item_id, list);
    }

    for (const work of workItems || []) {
      // Role description gaps
      if (!work.description || work.description.trim().length < 40 || looksGeneric(work.description)) {
        gaps.push({
          user_id: userId,
          entity_type: 'work_item',
          entity_id: work.id,
          gap_type: 'best_practice',
          gap_category: 'incomplete_role_description',
          severity: 'medium',
          description: 'Role description is missing or too generic',
        });
      }

      // Role metrics gaps
      if (!hasMetric(work.metrics)) {
        gaps.push({
          user_id: userId,
          entity_type: 'work_item',
          entity_id: work.id,
          gap_type: 'best_practice',
          gap_category: 'missing_role_metrics',
          severity: 'medium',
          description: 'Add quantified outcome metrics for this role',
        });
      }

      const roleStories = storyMap.get(work.id) || [];
      for (const story of roleStories) {
        // Story completeness
        if (!story.content || story.content.trim().length < 40) {
          gaps.push({
            user_id: userId,
            entity_type: 'approved_content',
            entity_id: story.id,
            gap_type: 'data_quality',
            gap_category: 'incomplete_story',
            severity: 'high',
            description: 'Story is empty or too short',
          });
          continue;
        }

        // Missing metrics
        if (!hasMetric(story.metrics) && !hasNumbers(story.content)) {
          gaps.push({
            user_id: userId,
            entity_type: 'approved_content',
            entity_id: story.id,
            gap_type: 'best_practice',
            gap_category: 'missing_metrics',
            severity: 'medium',
            description: 'Story has no quantified metrics',
          });
        }

        // Generic content
        if (looksGeneric(story.content)) {
          gaps.push({
            user_id: userId,
            entity_type: 'approved_content',
            entity_id: story.id,
            gap_type: 'best_practice',
            gap_category: 'generic_story',
            severity: 'medium',
            description: 'Story is too generic; add specifics and impact',
          });
        }
      }
    }

    if (gaps.length > 0) {
      const { error: insertError } = await supabase.from('gaps').insert(gaps);
      if (insertError) {
        console.error('Gap detection: failed to insert gaps', insertError);
      } else {
        console.log(`Gap detection: inserted ${gaps.length} gaps`);
      }
    }

    await supabase
      .from('sources')
      .update({ processing_stage: 'gaps_complete' })
      .eq('id', sourceId)
      .eq('user_id', userId);
  } catch (err) {
    console.error('Gap detection error:', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const openaiModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';

  if (!supabaseUrl || !supabaseKey) {
    return respond(500, { error: 'Supabase environment variables are missing' });
  }

  if (!openaiKey) {
    return respond(500, { error: 'OPENAI_API_KEY is not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Create SSE stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const send = async (event: ProgressEvent, data: Record<string, unknown>) => {
    await writer.write(encoder.encode(formatSSE(event, data)));
  };

  try {
    const body = await req.json();
    const { userId, sourceId, resumeText } = body || {};

    if (!userId || !sourceId) {
      await send('error', { message: 'userId and sourceId are required' });
      writer.close();
      return respond(400, { error: 'Missing required fields' });
    }

    await send('start', {
      message: 'Resume processing started',
      sourceId,
      progress: 5,
      stage: 'starting',
    });

    // Mark initial stage to keep parity with client stage tracking
    await supabase
      .from('sources')
      .update({ processing_stage: 'starting', processing_status: 'processing' })
      .eq('id', sourceId)
      .eq('user_id', userId);

    let rawText = resumeText;
    if (!rawText) {
      const { data: sourceRecord, error: sourceError } = await supabase
        .from('sources')
        .select('raw_text')
        .eq('id', sourceId)
        .eq('user_id', userId)
        .maybeSingle();

      if (sourceError || !sourceRecord?.raw_text) {
        await send('error', { message: 'Raw text not found for source', details: sourceError?.message });
        writer.close();
        return respond(404, { error: 'Raw text not found for source' });
      }
      rawText = sourceRecord.raw_text;
    }

    await send('text_loaded', { progress: 15, message: 'Text loaded', stage: 'extracting' });

    await supabase
      .from('sources')
      .update({ processing_stage: 'extracting' })
      .eq('id', sourceId)
      .eq('user_id', userId);

    // Build full prompt (no truncation)
    const prompt = buildResumeAnalysisPrompt(rawText);

    await send('analyzing', { progress: 40, message: 'Analyzing with AI...', stage: 'analyzing' });
    await supabase
      .from('sources')
      .update({ processing_stage: 'analyzing' })
      .eq('id', sourceId)
      .eq('user_id', userId);

    const structuredData = await callOpenAI({
      apiKey: openaiKey,
      model: openaiModel,
      prompt,
      maxTokens: 5000,
    });

    await send('analysis_complete', { progress: 60, message: 'Analysis complete', stage: 'structuring' });

    // Persist structured data on source
    await supabase
      .from('sources')
      .update({
        structured_data: structuredData,
        processing_stage: 'structured',
        processing_status: 'processing',
      })
      .eq('id', sourceId)
      .eq('user_id', userId);

    await send('persisting', { progress: 75, message: 'Saving resume data', stage: 'saving' });

    await persistResumeStructuredData(supabase, userId, sourceId, structuredData);

    // Queue gap detection in background (non-blocking) to mirror client behavior.
    await supabase
      .from('sources')
      .update({ processing_stage: 'gaps_pending' })
      .eq('id', sourceId)
      .eq('user_id', userId);

    // Run gap detection asynchronously
    runGapDetection(supabase, userId, sourceId)
      .catch((e) => console.error('Gap detection async error:', e));

    await send('gaps_queued', { progress: 85, message: 'Gap detection queued', stage: 'gaps_queued' });

    await supabase
      .from('sources')
      .update({ processing_stage: 'complete', processing_status: 'completed' })
      .eq('id', sourceId)
      .eq('user_id', userId);

    await send('complete', { progress: 100, message: 'Resume processed', sourceId, stage: 'complete' });
  } catch (error) {
    console.error('process-resume-v2 error:', error);
    await send('error', { message: error.message || 'Unexpected error' });
  } finally {
    writer.close();
  }

  return new Response(readable, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});
