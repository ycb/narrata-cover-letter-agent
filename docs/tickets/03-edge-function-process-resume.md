## Summary
Create Supabase Edge Function `process-resume` to run two LLM stages (skeleton, skills) in the background and stream results via database writes and `processing_stage` updates.

## Problem
Resume parsing currently blocks in the browser. We need a background function that writes `work_items` and `user_skills` while updating `sources.processing_stage` so the UI can stream progress.

## Files to create/modify
- Create: `supabase/functions/process-resume/index.ts`

## Step-by-step implementation details
1) Create the file `supabase/functions/process-resume/index.ts`.
2) Use Supabase Edge pattern with `ctx.waitUntil` (no global `EdgeRuntime` usage).
3) Implement two stages:
   - Stage 1 (skeleton): extract work history → upsert `companies` → insert `work_items` → set stage `skeleton`
   - Stage 2 (skills): extract skills → upsert `user_skills` → set stage `skills`
4) On completion: set `processing_stage='complete'` and `processing_status='completed'`.
5) Do not write telemetry fields in MVP. Keep the schema minimal.

### Entry point
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req, ctx) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceId, userId } = await req.json();

    // Basic auth presence check (edge functions are typically secured by anon key + RLS)
    if (!req.headers.get('Authorization')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: corsHeaders 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Background work
    ctx.waitUntil(processResumeAsync(supabase, sourceId, userId, openaiKey));

    return new Response(
      JSON.stringify({ success: true, message: 'Processing started', sourceId }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('process-resume error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Async processing and helpers
```typescript
async function processResumeAsync(
  supabase: any,
  sourceId: string,
  userId: string,
  openaiKey: string
) {
  try {
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('raw_text, file_name')
      .eq('id', sourceId)
      .single();

    if (sourceError || !source?.raw_text) {
      throw new Error('Source not found or no text');
    }

    const resumeText = source.raw_text;

    // Stage 1
    await updateStage(supabase, sourceId, 'skeleton');
    const skeletonResult = await callOpenAI(openaiKey, {
      messages: [{ role: 'user', content: buildSkeletonPrompt(resumeText) }],
      maxTokens: 2000,
      temperature: 0.3
    });
    const skeleton = parseJSON(skeletonResult);
    await insertWorkItems(supabase, userId, sourceId, skeleton.workHistory || []);

    // Stage 2
    await updateStage(supabase, sourceId, 'skills');
    const skillsResult = await callOpenAI(openaiKey, {
      messages: [{ role: 'user', content: buildSkillsPrompt(resumeText) }],
      maxTokens: 1500,
      temperature: 0.3
    });
    const skills = parseJSON(skillsResult);
    await insertSkills(supabase, userId, sourceId, skills.skills || []);

    // Complete
    await supabase
      .from('sources')
      .update({
        processing_stage: 'complete',
        processing_status: 'completed',
        structured_data: { workHistory: skeleton.workHistory, skills: skills.skills }
      })
      .eq('id', sourceId);
  } catch (error: any) {
    console.error('[process-resume] Error:', error);
    await supabase
      .from('sources')
      .update({
        processing_stage: 'error',
        processing_status: 'failed',
        processing_error: error.message
      })
      .eq('id', sourceId);
  }
}

async function updateStage(supabase: any, sourceId: string, stage: string) {
  await supabase
    .from('sources')
    .update({ processing_stage: stage, updated_at: new Date().toISOString() })
    .eq('id', sourceId);
}

async function insertWorkItems(
  supabase: any,
  userId: string,
  sourceId: string,
  workHistory: any[]
) {
  if (!workHistory?.length) return;

  const companies = workHistory.map(wh => ({ name: wh.company }));
  const { data: companiesData } = await supabase
    .from('companies')
    .upsert(companies, { onConflict: 'name', ignoreDuplicates: true })
    .select('id, name');

  const companyMap = new Map(companiesData?.map((c: any) => [c.name, c.id]) || []);

  const workItems = workHistory.map(wh => ({
    user_id: userId,
    source_id: sourceId,
    company_id: companyMap.get(wh.company),
    title: wh.title,
    start_date: wh.startDate,
    end_date: wh.endDate,
    description: wh.description || null
  }));

  await supabase.from('work_items').insert(workItems);
}

async function insertSkills(
  supabase: any,
  userId: string,
  sourceId: string,
  skills: any[]
) {
  if (!skills?.length) return;

  const skillRecords = skills.flatMap((cat: any) =>
    (cat.items || []).map((item: string) => ({
      user_id: userId,
      source_id: sourceId,
      skill: item,
      category: cat.category,
      source_type: 'resume'
    }))
  );

  if (skillRecords.length) {
    await supabase
      .from('user_skills')
      .upsert(skillRecords, { onConflict: 'user_id,skill', ignoreDuplicates: true });
  }
}

async function callOpenAI(apiKey: string, options: {
  messages: Array<{ role: string; content: string }>;
  maxTokens: number;
  temperature: number;
}) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: options.messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

function parseJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) return JSON.parse(match[1]);
    throw new Error('Failed to parse JSON response');
  }
}

function buildSkeletonPrompt(text: string): string {
  return `Extract work history from this resume. Return JSON:
{
  "workHistory": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "description": "Brief role description (1-2 sentences)"
    }
  ]
}

Rules:
- Extract EVERY role
- Use YYYY-MM-DD format (use -01-01 for year-only)
- For current roles: endDate = null
- description should be brief, not bullet points

Resume:
${text}`;
}

function buildSkillsPrompt(text: string): string {
  return `Extract skills from this resume. Return JSON:
{
  "skills": [
    { "category": "Technical", "items": ["Python", "SQL", "AWS"] },
    { "category": "Product", "items": ["Roadmapping", "A/B Testing"] }
  ]
}

Rules:
- Group skills into 3-5 categories
- Each category should have 3-10 items
- Categories: Technical, Product, Leadership, Domain, Tools (adapt as needed)

Resume:
${text}`;
}
```

## Acceptance criteria
- Edge function deploys and returns HTTP 202 immediately.
- Stages proceed in order: `skeleton` → `skills` → `complete` (or `error`).
- `work_items` and `user_skills` are inserted as appropriate.

## QA steps
- Trigger via POST `{ sourceId, userId }` with a valid session token in `Authorization`.
- Observe realtime updates for `sources` and `work_items`.
- Verify final `processing_stage='complete'` and `processing_status='completed'`.

