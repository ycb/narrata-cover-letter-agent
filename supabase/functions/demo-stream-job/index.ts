import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { executeCoverLetterPipeline } from '../_shared/pipelines/cover-letter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Missing jobId parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only allow streaming jobs for registered demo profiles
    const { data: demoProfile } = await supabase
      .from('public_demo_profiles')
      .select('slug')
      .eq('user_id', job.user_id)
      .maybeSingle();

    if (!demoProfile) {
      return new Response(JSON.stringify({ error: 'Job not available for public demo' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only allow the coverLetter analysis pipeline for public demo streaming
    if (job.type !== 'coverLetter') {
      return new Response(JSON.stringify({ error: 'Unsupported job type for demo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (job.status === 'complete' || job.status === 'error') {
      const eventType = job.status === 'complete' ? 'complete' : 'error';
      const eventData =
        job.status === 'complete' ? { result: job.result } : { error: job.error_message };

      return new Response(
        formatSSE(eventType, { jobId, ...eventData, timestamp: new Date().toISOString() }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let heartbeatInterval: number | null = null;

        const send = (event: string, data: unknown) => {
          try {
            controller.enqueue(encoder.encode(formatSSE(event, data)));
          } catch (e) {
            console.error('[demo-stream-job] Failed to send SSE', e);
          }
        };

        heartbeatInterval = setInterval(() => {
          send('heartbeat', { timestamp: new Date().toISOString() });
        }, 15000);

        // Update job status to running
        await supabase
          .from('jobs')
          .update({ status: 'running', started_at: new Date().toISOString() })
          .eq('id', jobId);

        try {
          await executeCoverLetterPipeline(job, supabase, send);

          send('complete', { jobId, timestamp: new Date().toISOString() });

          if (heartbeatInterval) clearInterval(heartbeatInterval);
          controller.close();
        } catch (error) {
          await supabase
            .from('jobs')
            .update({
              status: 'error',
              error_message: error?.message || 'Pipeline execution failed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', jobId);

          send('error', {
            jobId,
            error: error?.message || 'Pipeline execution failed',
            timestamp: new Date().toISOString(),
          });

          if (heartbeatInterval) clearInterval(heartbeatInterval);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error', message: error?.message ?? String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

