/**
 * Pre-analyze JD Edge Function
 * 
 * PERFORMANCE OPTIMIZATION: Run JD analysis as soon as user pastes JD,
 * before they click "Generate cover letter". This hides 15-25s of latency.
 * 
 * The main cover-letter pipeline will check for cached analysis and skip
 * the jdAnalysis stage if already computed.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { elog } from '../_shared/log.ts';
import { 
  streamJsonFromLLM, 
  fetchJobDescription,
  extractJdRequirementSummary,
  type RoleInsightsPayload,
} from '../_shared/pipeline-utils.ts';
import {
  buildJdRolePrompt,
  roleInsightsSchema,
  sanitizeRoleInsights,
  type RawRoleInsights,
} from '../_shared/pipelines/cover-letter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase environment not configured');
    }
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Verify user token
    const supabaseAuth = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => null);
    const jobDescriptionId = body?.jobDescriptionId;
    
    if (!jobDescriptionId || typeof jobDescriptionId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'jobDescriptionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch JD
    const jd = await fetchJobDescription(supabase, jobDescriptionId);
    if (!jd) {
      return new Response(
        JSON.stringify({ error: 'Job description not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already analyzed (skip if fresh analysis exists)
    const existingAnalysis = jd.analysis as Record<string, unknown> | null;
    if (existingAnalysis?.roleInsights && existingAnalysis?.analyzedAt) {
      const analyzedAt = new Date(existingAnalysis.analyzedAt as string);
      const ageMs = Date.now() - analyzedAt.getTime();
      const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
      
      if (ageMs < CACHE_TTL_MS) {
        elog.info('[preanalyze-jd] Using cached analysis', { 
          jobDescriptionId, 
          cacheAgeMs: ageMs 
        });
        return new Response(
          JSON.stringify({ 
            status: 'cached',
            roleInsights: existingAnalysis.roleInsights,
            jdRequirementSummary: existingAnalysis.jdRequirementSummary,
            analyzedAt: existingAnalysis.analyzedAt,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    elog.info('[preanalyze-jd] Starting JD analysis', { jobDescriptionId });

    // Run JD analysis (roleInsights)
    const jdText = jd.raw_text || jd.content || '';
    const jdTitle = jd.role || 'Unknown Role';
    const companyName = jd.company || 'Unknown Company';

    const rolePrompt = buildJdRolePrompt(jdTitle, companyName, jdText);
    
    let roleInsights: RoleInsightsPayload | null = null;
    
    const rawResult = await streamJsonFromLLM<RawRoleInsights>({
      apiKey: openaiApiKey,
      prompt: rolePrompt,
      schema: roleInsightsSchema,
    });
    
    roleInsights = sanitizeRoleInsights(rawResult);

    // Extract requirement summary
    const jdRequirementSummary = extractJdRequirementSummary(jd);

    // Store analysis in job_descriptions.analysis column
    const analysisPayload = {
      roleInsights,
      jdRequirementSummary,
      analyzedAt: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
    };

    const { error: updateError } = await supabase
      .from('job_descriptions')
      .update({ analysis: analysisPayload })
      .eq('id', jobDescriptionId);

    if (updateError) {
      elog.error('[preanalyze-jd] Failed to save analysis', { error: updateError });
      // Don't fail the request - analysis was computed successfully
    }

    const latencyMs = Date.now() - startTime;
    elog.info('[preanalyze-jd] Analysis complete', { 
      jobDescriptionId, 
      latencyMs,
      hasRoleInsights: !!roleInsights,
    });

    return new Response(
      JSON.stringify({ 
        status: 'analyzed',
        roleInsights,
        jdRequirementSummary,
        analyzedAt: analysisPayload.analyzedAt,
        latencyMs,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    elog.error('[preanalyze-jd] Error', { error: message });
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

