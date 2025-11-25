import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { executeCoverLetterPipeline } from '../_shared/pipelines/cover-letter.ts';
import { executeOnboardingPipeline } from '../_shared/pipelines/onboarding.ts';
import { executePMLevelsPipeline } from '../_shared/pipelines/pm-levels.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SSE helper to format event messages
function formatSSE(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get job ID and access token from query params
    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId');
    const accessToken = url.searchParams.get('access_token');

    console.log('[stream-job] Request received:', {
      hasJobId: !!jobId,
      hasAccessToken: !!accessToken,
      url: url.pathname,
    });

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing jobId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth token (from header or query param for EventSource compatibility)
    const authHeader = req.headers.get('Authorization') || (accessToken ? `Bearer ${accessToken}` : null);
    if (!authHeader) {
      console.error('[stream-job] Missing auth:', {
        hasAuthHeader: !!req.headers.get('Authorization'),
        hasAccessToken: !!accessToken,
        queryParams: Array.from(url.searchParams.keys()),
      });
      return new Response(
        JSON.stringify({ error: 'Missing authorization', details: 'No auth header or access_token query param' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Validate user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth validation failed in stream-job:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid auth token', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Use service role key for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch job from database
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If job already complete or error, return final state
    if (job.status === 'complete' || job.status === 'error') {
      const eventType = job.status === 'complete' ? 'complete' : 'error';
      const eventData = job.status === 'complete' 
        ? { result: job.result }
        : { error: job.error_message };

      return new Response(
        formatSSE(eventType, { jobId, ...eventData, timestamp: new Date().toISOString() }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let heartbeatInterval: number | null = null;

        // Helper to send SSE message
        const send = (event: string, data: any) => {
          try {
            controller.enqueue(encoder.encode(formatSSE(event, data)));
          } catch (e) {
            console.error('Error sending SSE message:', e);
          }
        };

        // Start heartbeat (keep connection alive)
        heartbeatInterval = setInterval(() => {
          send('heartbeat', {
            timestamp: new Date().toISOString(),
          });
        }, 15000); // Every 15 seconds

        // Update job status to running
        await supabase
          .from('jobs')
          .update({ status: 'running', started_at: new Date().toISOString() })
          .eq('id', jobId);

        try {
          // Execute pipeline based on job type
          switch (job.type) {
            case 'coverLetter':
              await executeCoverLetterPipeline(job, supabase, send);
              break;
            
            case 'onboarding':
              await executeOnboardingPipeline(job, supabase, send);
              break;
            
            case 'pmLevels':
              await executePMLevelsPipeline(job, supabase, send);
              break;
            
            default:
              throw new Error(`Unknown job type: ${job.type}`);
          }

          // Send complete event
          send('complete', {
            jobId,
            timestamp: new Date().toISOString(),
          });

          // Clean up
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }

          // Close stream
          controller.close();
        } catch (error) {
          console.error(`Error in ${job.type} pipeline:`, error);

          // Update job with error
          await supabase
            .from('jobs')
            .update({
              status: 'error',
              error_message: error.message || 'Pipeline execution failed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', jobId);

          // Send error event
          send('error', {
            jobId,
            error: error.message || 'Pipeline execution failed',
            timestamp: new Date().toISOString(),
          });

          // Clean up
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Unexpected error in stream-job:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// All pipelines imported from _shared/pipelines/
// ============================================================================
// - Cover Letter: executeCoverLetterPipeline
// - Onboarding: executeOnboardingPipeline
// - PM Levels: executePMLevelsPipeline

