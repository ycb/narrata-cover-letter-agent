import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { callOpenAI } from '../_shared/pipeline-utils.ts';
import { elog } from '../_shared/log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FINAL_CHECK_MODEL = 'gpt-5.2';
const MAX_TEXT_CHARS = 18000;

const SYSTEM_INSTRUCTION = [
  'You are performing a final editorial review of a cover letter that has already been evaluated as “Strong.”',
  '',
  'Evaluate the cover letter holistically against the job description to identify high-leverage changes that materially reduce interview risk.',
  '',
  'First determine whether any changes are warranted at all. Most strong letters require no edits.',
  '',
  'For each paragraph, answer YES or NO:',
  '- Does this paragraph already perform its intended function effectively?',
  '- Is there a concrete hiring risk if it remains unchanged?',
  '',
  'If all answers are NO risk / YES effective → STOP.',
  '',
  'Only paragraphs flagged as YES: risk exists are eligible for suggested edits.',
  'If no hard risks exist, you may surface ONE strategic improvement that strengthens a JD-critical capability or clarifies ownership scope. Otherwise return no changes.',
  '',
  'Before suggesting any change, first determine whether the sentence already performs its intended function effectively.',
  'If it does, you must not suggest an alternative phrasing.',
  '',
  'If the suggested change does not introduce a new, concrete hiring signal OR remove a real hiring risk, it must not be surfaced.',
  '',
  'A suggestion is valid only if it does at least one of the following:',
  '- Makes an existing metric more salient (without rewording it)',
  '- Clarifies ownership scope where ambiguity exists',
  '- Resolves a potential misinterpretation',
  '- Eliminates redundancy across paragraphs',
  '- Corrects a sentence that undermines seniority (hedging, softness, apology)',
  '- Adds a missing JD-critical capability signal using evidence already in the letter',
  '',
  'If none apply → return “No changes recommended — the letter is already well-calibrated.”',
  '',
  'Do not force suggestions. Avoid micro-edits (single-word swaps) unless they fix a concrete error or credibility risk.',
  '',
  'Intended function by section:',
  '- Opening paragraph → establish seniority + scope + role fit',
  '- Anchor paragraphs → prove claims with evidence tied to JD-critical capabilities',
  '- Closing → summarize fit + mission alignment; do NOT introduce new achievements or metrics',
  '',
  'Hard Constraints',
  '- Do NOT rewrite the cover letter',
  '- Do NOT add new stories, examples, or experience',
  '- Do NOT change paragraph order or overall structure',
  '- Do NOT introduce new metrics or claims unless already present verbatim',
  '- Do NOT introduce metrics in the closing',
  '- Do NOT suggest stylistic rewrites that alter tone or positioning',
  '- Do NOT repeat the same issue type across multiple paragraphs',
  '- Limit to at most one suggestion per paragraph',
  '- Prefer adding or replacing a full sentence that strengthens a JD-critical signal using existing evidence',
  '',
  'Task',
  'Identify up to 3 selective opportunities where a change would materially increase persuasion or reduce hiring risk.',
  '',
  'If no such opportunities exist, explicitly state:',
  '“No changes recommended — the letter is already well-calibrated.”',
  '',
  'Focus only on:',
  '- opening strength (only if vague, generic, or misaligned with the JD)',
  '- emphasis and prioritization',
  '- clarity',
  '- redundancy',
  '- word economy',
  '',
  'Explicitly Avoid',
  '- Generic encouragement',
  '- Mission restatement',
  '- Additional qualifications',
  '- Reframing role fit',
  '- Stylistic rewording, tone amplification, or synonym substitution',
  '',
  'Allowed Categories Only',
  '- Missing emphasis on a JD-critical capability',
  '- Redundant phrasing across paragraphs',
  '- A sentence that weakens senior signal (e.g., hedging, softness)',
  '- A missed opportunity to anchor an existing metric more clearly',
  '',
  'Output Format (Strict)',
  '',
  'Return a cleanly formatted list (no bold labels, no YES/NO fields).',
  '',
  'Start with a single line:',
  '(N) Suggestions found',
  '',
  'Then for each suggestion use this exact format:',
  '1. [Paragraph label]: “[Quoted excerpt]”',
  'Use the provided paragraph labels exactly (e.g., "Paragraph 2: Introduction").',
  '',
  'Issue:',
  '[1–2 sentences]',
  '',
  'Suggestion: [1–2 sentences]',
  '=============================================================',
  '[Replacement text only]',
  '=============================================================',
  '',
  'Separate each suggestion with a line containing exactly 12 hyphens:',
  '------------',
  '',
  'Each suggestion must include:',
  '- What to change (reference the specific sentence or paragraph)',
  '- Why this change would improve alignment with the role or reduce hiring risk',
  '- Suggested replacement text (max 1–2 sentences)',
  '',
  'Do NOT include summaries, conclusions, or follow-up questions.',
].join('\n');

function mergeSections(sections: any[]): string {
  return sections
    .slice()
    .sort((a, b) => {
      const orderA = typeof a?.order === 'number' ? a.order : 0;
      const orderB = typeof b?.order === 'number' ? b.order : 0;
      return orderA - orderB;
    })
    .map((section, index) => {
      const content =
        typeof section?.content === 'string'
          ? section.content.trim()
          : typeof section?.text === 'string'
          ? section.text.trim()
          : '';
      if (!content) return '';
      const rawType = typeof section?.type === 'string' ? section.type : '';
      const rawSlug = typeof section?.slug === 'string' ? section.slug : '';
      const label = typeof section?.title === 'string' && section.title.trim().length > 0
        ? section.title.trim()
        : rawSlug || rawType || `Section ${index + 1}`;
      const typeLabel = rawType || rawSlug ? ` (${rawType || rawSlug})` : '';
      return `Paragraph ${index + 1}: ${label}${typeLabel}\n${content}`;
    })
    .filter((chunk) => chunk.length > 0)
    .join('\n\n');
}

function truncateText(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  return `${text.slice(0, MAX_TEXT_CHARS)}\n...`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    const envModel = Deno.env.get('FINAL_CHECK_MODEL') ?? Deno.env.get('MODEL');

    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Supabase environment not configured' }, 500);
    }
    if (!openAiApiKey) {
      return json({ error: 'OPENAI_API_KEY not configured' }, 500);
    }

    const supabaseAuth = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return json({ error: 'Invalid auth token' }, 401);
    }

    const body = await req.json().catch(() => null);
    const draftId = body?.draftId;
    if (!draftId || typeof draftId !== 'string') {
      return json({ error: 'draftId is required' }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: draft, error: draftError } = await supabase
      .from('cover_letters')
      .select('id, user_id, job_description_id, sections')
      .eq('id', draftId)
      .single();

    if (draftError || !draft) {
      return json({ error: 'Draft not found' }, 404);
    }

    if (draft.user_id !== user.id) {
      return json({ error: 'Forbidden' }, 403);
    }

    if (!draft.job_description_id) {
      return json({ error: 'Draft missing job description' }, 422);
    }

    const { data: job, error: jobError } = await supabase
      .from('job_descriptions')
      .select('content')
      .eq('id', draft.job_description_id)
      .single();

    if (jobError || !job) {
      return json({ error: 'Job description not found' }, 404);
    }

    const sections = Array.isArray(draft.sections) ? draft.sections : [];
    const mergedDraft = mergeSections(sections);

    if (!mergedDraft.trim()) {
      return json({ error: 'Draft content is empty' }, 422);
    }

    const jobContent = typeof job.content === 'string' ? job.content : '';
    if (!jobContent.trim()) {
      return json({ error: 'Job description content is empty' }, 422);
    }

    const userMessage = [
      'Full Cover Letter:',
      truncateText(mergedDraft),
      '',
      'Full Job Description:',
      truncateText(jobContent),
    ].join('\n');

    const response = await callOpenAI({
      apiKey: openAiApiKey,
      model: envModel || FINAL_CHECK_MODEL,
      temperature: 0.2,
      maxCompletionTokens: 900,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: userMessage },
      ],
    });

    const content = response?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return json({ error: 'No suggestions returned' }, 500);
    }

    return json({ suggestions: content, model: envModel || FINAL_CHECK_MODEL }, 200);
  } catch (error) {
    try {
      const message =
        (error && typeof error === 'object' && 'message' in error && (error as any).message) ||
        String(error);
      elog.error('final_check_failed', { message });
      return json({ error: message }, 500);
    } catch {
      // no-op
    }
    return json({ error: 'Internal server error' }, 500);
  }
}

if (import.meta.main) {
  serve(handler);
}
