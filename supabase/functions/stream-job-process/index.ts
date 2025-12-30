import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { elog } from '../_shared/log.ts';
import { executeCoverLetterPipeline } from '../_shared/pipelines/cover-letter.ts';
import { executeOnboardingPipeline } from '../_shared/pipelines/onboarding.ts';
import { executePMLevelsPipeline } from '../_shared/pipelines/pm-levels.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user's JWT token (do not trust presence of Authorization header alone)
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      elog.error('[stream-job-process] Auth validation failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid auth token', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin privileges (for support/debug tools)
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const isAdmin = profileRow?.role === 'admin';

    // Parse request body
    const { jobId, retryStage } = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing jobId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    elog.info('[stream-job-process] Processing job:', jobId);

    // Fetch job from database
    let jobQuery = supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId);
    if (!isAdmin) {
      jobQuery = jobQuery.eq('user_id', user.id);
    }

    const { data: job, error: jobError } = await jobQuery.single();

    if (jobError || !job) {
      elog.error('[stream-job-process] Job not found:', jobError);
      return new Response(
        JSON.stringify({ error: 'Job not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasRetryStage = typeof retryStage === 'string' && retryStage.length > 0;
    if (hasRetryStage) {
      elog.info('[stream-job-process] Retrying stage:', { jobId, retryStage });
    }

    // If job already processing or complete, skip unless this is a stage retry request.
    if (!hasRetryStage && job.status !== 'pending') {
      elog.info('[stream-job-process] Job already processing or complete:', job.status);
      return new Response(
        JSON.stringify({ message: 'Job already processing', status: job.status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update job status to running only for initial processing (not for targeted retries).
    if (!hasRetryStage) {
      await supabase
        .from('jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    elog.info('[stream-job-process] Starting pipeline execution');

    // Helper to send SSE-like events and update database
    const send = async (event: string, data: any) => {
      const summary = JSON.stringify(data).substring(0, 200);
      if (event === 'progress') {
        elog.info(`[stream-job-process] Stage progress: ${data.stage}`);
        elog.debug('[stream-job-process] progress payload:', summary);
      } else {
        elog.debug(`[stream-job-process] Event: ${event}`, summary);
      }

      if (event === 'progress' && data.stage) {
        elog.debug(`[stream-job-process] Updating stage ${data.stage} in database...`);
        
        // Update stages in database
        const { data: currentJob } = await supabase
          .from('jobs')
          .select('stages')
          .eq('id', jobId)
          .single();

        const isPartial = Boolean(data.isPartial);
        const explicitStageStatus = typeof data.stageStatus === 'string' ? data.stageStatus : null;
        const dataStatus = typeof data?.data?.status === 'string' ? data.data.status : null;
        const inferredFailed = dataStatus === 'failed' || Boolean(data?.data?.error) || Boolean(data?.error);
        const stageStatus = explicitStageStatus ?? (inferredFailed ? 'failed' : (isPartial ? 'running' : 'complete'));
        const existingStage = currentJob?.stages?.[data.stage] || {};
        const mergedData = {
          ...(existingStage.data || {}),
          ...(data.data || {}),
        };

        const updatedStages = {
          ...(currentJob?.stages || {}),
          [data.stage]: {
            status: stageStatus,
            data: Object.keys(mergedData).length > 0 ? mergedData : data.data,
            completedAt: stageStatus === 'running' ? existingStage.completedAt : new Date().toISOString(),
          },
        };

        elog.debug(`[stream-job-process] Current stages keys:`, Object.keys(currentJob?.stages || {}));
        elog.debug(`[stream-job-process] Updated stages keys:`, Object.keys(updatedStages));

        const { error: updateError } = await supabase
          .from('jobs')
          .update({ stages: updatedStages })
          .eq('id', jobId);

        if (updateError) {
          elog.error(`[stream-job-process] Failed to update stage ${data.stage}:`, updateError);
        } else {
          elog.info(`[stream-job-process] ✅ Stage ${data.stage} written to DB`);
        }
      }
    };

    // Execute pipeline based on job type
    try {
      let result;
      
      switch (job.type) {
        case 'coverLetter':
          result = await executeCoverLetterPipeline(job, supabase, send, {
            onlyStage: hasRetryStage ? retryStage : undefined,
            finalizeJob: !hasRetryStage,
          });
          break;

        case 'onboarding':
          result = await executeOnboardingPipeline(job, supabase, send);
          break;

        case 'pmLevels':
          result = await executePMLevelsPipeline(job, supabase, send);
          break;

        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      elog.info('[stream-job-process] Pipeline execution complete');

      // Only finalize the job record for initial processing.
      // Stage retries should not flip overall job status.
      if (!hasRetryStage) {
        // The pipeline already updates the job to complete status internally,
        // but we'll ensure it's set here too
        await supabase
          .from('jobs')
          .update({
            status: 'complete',
            result,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);
      }

      elog.info('[stream-job-process] Job complete:', jobId);

      return new Response(
        JSON.stringify({ message: hasRetryStage ? 'Stage retry started' : 'Job processing started', jobId, retryStage: hasRetryStage ? retryStage : null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      elog.error(`[stream-job-process] Error in ${job.type} pipeline:`, error);

      // Update job with error only for initial processing.
      // Stage retry failures should not flip overall job status.
      if (!hasRetryStage) {
        await supabase
          .from('jobs')
          .update({
            status: 'error',
            error_message: error.message || 'Pipeline execution failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);
      }

      return new Response(
        JSON.stringify({ error: 'Pipeline execution failed', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    elog.error('[stream-job-process] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
