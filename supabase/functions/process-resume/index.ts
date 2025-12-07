import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

    if (!req.headers.get('Authorization')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: corsHeaders 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await processResumeWithFullPrompt(supabase, sourceId, userId, openaiKey);

    return new Response(
      JSON.stringify({ success: true, message: 'Processing complete', sourceId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[process-resume] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Process resume using the FULL prompt from src/prompts/resumeAnalysis.ts
 * This ensures we get complete data extraction (same as main branch)
 */
async function processResumeWithFullPrompt(
  supabase: any,
  sourceId: string,
  userId: string,
  openaiKey: string
) {
  try {
    const t0 = Date.now();
    let llmMs = 0;
    let dbMs = 0;

    // Fetch source
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('raw_text, file_name')
      .eq('id', sourceId)
      .single();

    if (sourceError || !source?.raw_text) {
      throw new Error('Source not found or no text');
    }

    const resumeText = source.raw_text;

    // Stage 1: Extracting (update UI)
    console.log('[process-resume] Stage: Extracting work history...');
    await updateStage(supabase, sourceId, 'extracting');

    // Stage 2: Analyzing with FULL prompt (same as main)
    console.log('[process-resume] Stage: Running FULL LLM analysis...');
    await updateStage(supabase, sourceId, 'analyzing');

    const llmStart = Date.now();
    const fullAnalysis = await analyzeResumeWithLLM(resumeText, openaiKey);
    llmMs = Date.now() - llmStart;

    console.log(`[process-resume] LLM analysis complete:`, {
      companies: fullAnalysis.workHistory?.length || 0,
      stories: fullAnalysis.workHistory?.flatMap((wh: any) => wh.stories || []).length || 0,
      skills: fullAnalysis.skills?.length || 0
    });

    // Stage 3: Saving to database
    console.log('[process-resume] Stage: Saving to database...');
    await updateStage(supabase, sourceId, 'saving');

    const dbStart = Date.now();
    await saveStructuredDataToDatabase(supabase, userId, sourceId, fullAnalysis);
    dbMs = Date.now() - dbStart;

    // Stage 4: Complete
    const totalMs = Date.now() - t0;
    await supabase
      .from('sources')
      .update({
        processing_stage: 'complete',
        processing_status: 'completed',
        structured_data: fullAnalysis,
        llm_latency_ms: llmMs,
        db_latency_ms: dbMs,
        total_processing_ms: totalMs
      })
      .eq('id', sourceId);

    console.log(`[process-resume] Complete: ${totalMs}ms (LLM: ${llmMs}ms, DB: ${dbMs}ms)`);

    // Log to evaluation_runs
    try {
      await supabase.from('evaluation_runs').insert({
        user_id: userId,
        session_id: sourceId,
        source_id: sourceId,
        file_type: 'resume',
        llm_analysis_latency_ms: llmMs,
        database_save_latency_ms: dbMs,
        total_latency_ms: totalMs,
        model: 'gpt-4o-mini'
      });
    } catch (e) {
      console.warn('[process-resume] Failed to insert evaluation_runs:', e);
    }
  } catch (error: any) {
    console.error('[process-resume] Processing failed:', error);
    await supabase
      .from('sources')
      .update({
        processing_stage: 'error',
        processing_status: 'failed',
        processing_error: error.message
      })
      .eq('id', sourceId);
    throw error;
  }
}

async function updateStage(supabase: any, sourceId: string, stage: string) {
  await supabase
    .from('sources')
    .update({ processing_stage: stage, updated_at: new Date().toISOString() })
    .eq('id', sourceId);
}

/**
 * Call OpenAI with the FULL resume analysis prompt
 * This is the SAME prompt used in main branch (src/prompts/resumeAnalysis.ts)
 */
async function analyzeResumeWithLLM(resumeText: string, openaiKey: string): Promise<any> {
  const prompt = buildResumeAnalysisPrompt(resumeText);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  // Parse JSON response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in LLM response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Build the FULL resume analysis prompt
 * This is copied from src/prompts/resumeAnalysis.ts to ensure Edge function uses EXACT same prompt
 */
function buildResumeAnalysisPrompt(resumeText: string): string {
  return `
You are analyzing a resume to extract structured data for a job application platform.
Your goal is to create a rich, searchable profile with stories, metrics, and thematic tags.

CRITICAL: EXTRACTION ONLY - NO CONTENT CREATION
- Extract text VERBATIM from the resume. Do NOT paraphrase, summarize, or rewrite.
- Preserve exact numbers: "20m users" stays "20m users", NOT "millions of users"
- Preserve exact phrasing: copy sentences directly, don't rephrase
- The only "creation" allowed is: tags, date formatting, and metric type classification
- If something isn't in the resume, leave it empty. Do NOT invent or infer content.

Resume Text:
${resumeText}

Return ONLY valid JSON with this exact structure. ALL FIELDS ARE REQUIRED:

{
  "contactInfo": {
    "email": "email@example.com or null",
    "phone": "phone number or null",
    "linkedin": "https://linkedin.com/in/username or null",
    "website": "https://website.com or null",
    "github": "https://github.com/username or null",
    "substack": "https://username.substack.com or null"
  },
  "location": "City, State, Country or null",
  "summary": "Professional summary (1-2 sentences) or empty string",
  "workHistory": [
    {
      "id": "1",
      "company": "Company Name",
      "companyDescription": "REQUIRED: 1-2 sentences describing what this company does. ALWAYS provide this field.",
      "title": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "current": true,
      "location": "City, State or null",
      "companyTags": ["SaaS", "B2B", "PLG"],
      "roleTags": ["growth", "activation", "experimentation", "startup"],
      "roleSummary": "EXTRACT verbatim from resume. Do NOT paraphrase.",
      "outcomeMetrics": [
        {
          "value": "+22%",
          "context": "Week-2 activation improvement",
          "type": "increase",
          "parentType": "role"
        }
      ],
      "stories": [
        {
          "id": "1",
          "title": "Brief story title (5-8 words)",
          "content": "Full text exactly as written",
          "problem": "What challenge or opportunity (optional)",
          "action": "What was done (optional)",
          "outcome": "What resulted (optional)",
          "tags": ["experimentation", "activation", "analytics"],
          "linkedToRole": true,
          "company": "Company Name",
          "titleRole": "Job Title",
          "metrics": [
            {
              "value": "+22%",
              "context": "Week-2 activation",
              "type": "increase",
              "parentType": "story"
            }
          ]
        }
      ]
    }
  ],
  "education": [
    {
      "id": "1",
      "institution": "University Name",
      "degree": "MS/BS/PhD/etc",
      "field": "Major/Field of Study",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "gpa": "GPA or null"
    }
  ],
  "skills": [
    {
      "category": "Product Management",
      "items": ["User Research", "A/B Testing", "SQL"]
    }
  ],
  "certifications": [],
  "publications": [],
  "awards": []
}

CRITICAL RULES:
1. Extract ALL resume bullets as stories (place in stories[] array)
2. Extract standalone metrics as outcomeMetrics[] (no story context)
3. Do NOT duplicate metrics between stories and outcomeMetrics
4. Use exact text from resume - do NOT paraphrase
5. Always include companyTags and roleTags
6. Set current=true for current roles
7. Extract roleSummary verbatim if present in resume
`;
}

/**
 * Save structured data to database
 * This replicates the logic from FileUploadService.processStructuredData()
 */
async function saveStructuredDataToDatabase(
  supabase: any,
  userId: string,
  sourceId: string,
  structuredData: any
) {
  const workHistory = structuredData.workHistory || [];

  for (const wh of workHistory) {
    try {
      // 1. Create or find company
      let companyId: string | null = null;
      const companyName = (wh.company || '').trim();

      if (companyName) {
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', userId)
          .eq('name', companyName)
          .maybeSingle();

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { data: newCompany } = await supabase
            .from('companies')
            .insert({
              user_id: userId,
              name: companyName,
              description: wh.companyDescription || '',
              tags: wh.companyTags || []
            })
            .select('id')
            .single();

          companyId = newCompany?.id || null;
        }
      }

      // 2. Create work_item
      const { data: workItem } = await supabase
        .from('work_items')
        .insert({
          user_id: userId,
          company_id: companyId,
          source_id: sourceId,
          title: wh.title || '',
          description: wh.roleSummary || '',
          start_date: wh.startDate || null,
          end_date: wh.endDate || null,
          location: wh.location || null,
          tags: wh.roleTags || [],
          metrics: wh.outcomeMetrics || [],
          is_current: wh.current || false
        })
        .select('id')
        .single();

      const workItemId = workItem?.id;

      // 3. Create stories for this role
      const stories = wh.stories || [];
      for (const story of stories) {
        await supabase
          .from('stories')
          .insert({
            user_id: userId,
            work_item_id: workItemId,
            source_id: sourceId,
            title: story.title || '',
            content: story.content || '',
            problem: story.problem || null,
            action: story.action || null,
            outcome: story.outcome || null,
            tags: story.tags || [],
            metrics: story.metrics || []
          });
      }

      console.log(`[process-resume] Created work_item ${workItemId} with ${stories.length} stories`);
    } catch (error) {
      console.error(`[process-resume] Error saving work history item:`, error);
      // Continue processing other items
    }
  }

  // 4. Save skills
  const skills = structuredData.skills || [];
  for (const skillCategory of skills) {
    try {
      await supabase
        .from('user_skills')
        .insert({
          user_id: userId,
          category: skillCategory.category,
          skills: skillCategory.items || []
        });
    } catch (error) {
      console.error(`[process-resume] Error saving skills:`, error);
    }
  }

  console.log(`[process-resume] Database save complete`);
}

