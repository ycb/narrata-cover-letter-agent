import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
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

    // Parse request body
    const { jobId } = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing jobId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[stream-job-process] Processing job:', jobId);

    // Fetch job from database
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('[stream-job-process] Job not found:', jobError);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If job already processing or complete, skip
    if (job.status !== 'pending') {
      console.log('[stream-job-process] Job already processing or complete:', job.status);
      return new Response(
        JSON.stringify({ message: 'Job already processing', status: job.status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update job status to running
    await supabase
      .from('jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', jobId);

    console.log('[stream-job-process] Starting pipeline execution');

    // Helper to send SSE-like events and update database
    const send = async (event: string, data: any) => {
      console.log(`[stream-job-process] Event: ${event}`, JSON.stringify(data).substring(0, 200));

      if (event === 'progress' && data.stage) {
        console.log(`[stream-job-process] Updating stage ${data.stage} in database...`);
        
        // Update stages in database
        const { data: currentJob } = await supabase
          .from('jobs')
          .select('stages')
          .eq('id', jobId)
          .single();

        const updatedStages = {
          ...(currentJob?.stages || {}),
          [data.stage]: {
            status: 'complete',
            data: data.data,
            completedAt: new Date().toISOString(),
          },
        };

        console.log(`[stream-job-process] Current stages keys:`, Object.keys(currentJob?.stages || {}));
        console.log(`[stream-job-process] Updated stages keys:`, Object.keys(updatedStages));

        const { error: updateError } = await supabase
          .from('jobs')
          .update({ stages: updatedStages })
          .eq('id', jobId);

        if (updateError) {
          console.error(`[stream-job-process] Failed to update stage ${data.stage}:`, updateError);
        } else {
          console.log(`[stream-job-process] ✅ Stage ${data.stage} written to DB`);
        }
      }
    };

    // Execute pipeline based on job type
    try {
      let result;
      
      switch (job.type) {
        case 'coverLetter':
          result = await executeCoverLetterPipeline(job, supabase, send);
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

      console.log('[stream-job-process] Pipeline execution complete, result:', result);

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

      console.log('[stream-job-process] Job complete:', jobId);

      return new Response(
        JSON.stringify({ message: 'Job processing started', jobId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error(`[stream-job-process] Error in ${job.type} pipeline:`, error);

      // Update job with error
      await supabase
        .from('jobs')
        .update({
          status: 'error',
          error_message: error.message || 'Pipeline execution failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({ error: 'Pipeline execution failed', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[stream-job-process] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

