import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  // Be permissive here to avoid preflight mismatches from browsers
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Vary': 'Origin'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const { sourceId, userId } = await req.json();

    // Basic auth presence check
    if (!req.headers.get('Authorization')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: corsHeaders 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Fall back to blocking execution in this runtime (ctx.waitUntil not available)
    await processResumeAsync(supabase, sourceId, userId, openaiKey);
    return new Response(
      JSON.stringify({ success: true, message: 'Processing complete', sourceId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('process-resume error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processResumeAsync(
  supabase: any,
  sourceId: string,
  userId: string,
  openaiKey: string
) {
  try {
    const t0 = Date.now();
    let stage1Ms = 0;
    let stage2Ms = 0;
    let dbMs = 0;

    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('raw_text, file_name')
      .eq('id', sourceId)
      .single();

    if (sourceError || !source?.raw_text) {
      throw new Error('Source not found or no text');
    }

    const resumeText = source.raw_text;

    // Stage 1: Skeleton
    console.log('[process-resume] Stage 1: Extracting work history...');
    await updateStage(supabase, sourceId, 'skeleton');

    const s1start = Date.now();
    const skeletonResult = await callOpenAI(openaiKey, {
      messages: [{ role: 'user', content: buildSkeletonPrompt(resumeText) }],
      maxTokens: 2000,
      temperature: 0.3
    });
    stage1Ms = Date.now() - s1start;
    const skeleton = parseJSON(skeletonResult);
    console.log(`[process-resume] Stage 1 complete: ${skeleton.workHistory?.length || 0} roles`);
    {
      const dbStart = Date.now();
      await insertWorkItems(supabase, userId, sourceId, skeleton.workHistory || []);
      dbMs += Date.now() - dbStart;
    }

    // Stage 2: Skills
    console.log('[process-resume] Stage 2: Extracting skills...');
    await updateStage(supabase, sourceId, 'skills');

    const s2start = Date.now();
    const skillsResult = await callOpenAI(openaiKey, {
      messages: [{ role: 'user', content: buildSkillsPrompt(resumeText) }],
      maxTokens: 1500,
      temperature: 0.3
    });
    stage2Ms = Date.now() - s2start;
    const skills = parseJSON(skillsResult);
    console.log(`[process-resume] Stage 2 complete: ${skills.skills?.length || 0} categories`);
    {
      const dbStart = Date.now();
      await insertSkills(supabase, userId, sourceId, skills.skills || []);
      dbMs += Date.now() - dbStart;
    }

    // Complete
    const totalMs = Date.now() - t0;
    await supabase
      .from('sources')
      .update({
        processing_stage: 'complete',
        processing_status: 'completed',
        structured_data: { workHistory: skeleton.workHistory, skills: skills.skills },
        llm_latency_ms: stage1Ms + stage2Ms,
        db_latency_ms: dbMs,
        total_processing_ms: totalMs
      })
      .eq('id', sourceId);

    // Log to evaluation_runs for visibility in dashboard (best-effort)
    try {
      await supabase.from('evaluation_runs').insert({
        user_id: userId,
        session_id: sourceId,
        source_id: sourceId,
        file_type: 'resume',
        llm_analysis_latency_ms: stage1Ms + stage2Ms,
        database_save_latency_ms: dbMs,
        total_latency_ms: totalMs,
        model: 'gpt-4o-mini'
      });
    } catch (e) {
      console.warn('[process-resume] Failed to insert evaluation_runs:', e);
    }
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

  // Normalize date into YYYY-MM-DD when possible
  const normalizeDate = (d: string | null | undefined): string | null => {
    if (!d) return null;
    const s = String(d).trim();
    if (!s) return null;
    // YYYY
    const y = s.match(/^(\\d{4})$/);
    if (y) return `${y[1]}-01-01`;
    // YYYY-MM
    const ym = s.match(/^(\\d{4})-(\\d{2})$/);
    if (ym) return `${ym[1]}-${ym[2]}-01`;
    // YYYY/MM or MM/YYYY
    const ym2 = s.match(/^(\\d{4})\\/(\\d{1,2})$/);
    if (ym2) return `${ym2[1]}-${String(ym2[2]).padStart(2, '0')}-01`;
    const my2 = s.match(/^(\\d{1,2})\\/(\\d{4})$/);
    if (my2) return `${my2[2]}-${String(my2[1]).padStart(2, '0')}-01`;
    // YYYY-MM-DD (pass through)
    const ymd = s.match(/^\\d{4}-\\d{2}-\\d{2}$/);
    if (ymd) return s;
    return null;
  };

  // Insert per-role to avoid batch failure; ensure company exists first
  for (const wh of workHistory as any[]) {
    try {
      const companyName = (wh.company || '').trim();
      const title = (wh.title || '').trim();
      const start = normalizeDate(wh.startDate);
      const end = normalizeDate(wh.endDate);
      if (!companyName || !title || !start) continue;

      const companyId = await ensureCompanyId(supabase, companyName);
      if (!companyId) {
        console.warn('[process-resume] skip role due to missing companyId', companyName);
        continue;
      }

      const { error: wiErr } = await supabase.from('work_items').insert({
        user_id: userId,
        source_id: sourceId,
        company_id: companyId,
        title,
        start_date: start,
        end_date: end,
        description: wh.description || null
      });
      if (wiErr) console.error('[process-resume] work_items insert error:', wiErr);
    } catch (e) {
      console.error('[process-resume] insert role error:', e);
    }
  }
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
    // Insert skills once per run; avoid ON CONFLICT because table may lack a matching unique index
    const { error } = await supabase.from('user_skills').insert(skillRecords);
    if (error) {
      console.warn('[process-resume] user_skills insert error:', error);
    }
  }
}

// Get-or-create a company row and return its id
async function ensureCompanyId(supabase: any, name: string): Promise<string | null> {
  const trimmed = String(name).trim();
  if (!trimmed) return null;
  let { data: found, error: selErr } = await supabase
    .from('companies')
    .select('id')
    .eq('name', trimmed)
    .limit(1)
    .maybeSingle();
  if (selErr) found = null;
  if (found?.id) return found.id;

  const { data: inserted, error: insErr } = await supabase
    .from('companies')
    .insert({ name: trimmed })
    .select('id')
    .single();
  if (!insErr && inserted?.id) return inserted.id;

  // Race or unique violation: re-select
  let { data: again } = await supabase
    .from('companies')
    .select('id')
    .eq('name', trimmed)
    .limit(1)
    .maybeSingle();
  return again?.id || null;
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


