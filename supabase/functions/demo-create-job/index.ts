import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type DemoCreateJobRequest = {
  demoSlug: string;
  jobDescription: {
    content: string;
    company: string;
    role: string;
    url?: string | null;
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: DemoCreateJobRequest = await req.json().catch(() => null);
    const demoSlug = body?.demoSlug;
    const jobDescription = body?.jobDescription;

    if (!demoSlug || typeof demoSlug !== 'string') {
      return new Response(JSON.stringify({ error: 'demoSlug is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (
      !jobDescription ||
      typeof jobDescription !== 'object' ||
      typeof jobDescription.content !== 'string' ||
      typeof jobDescription.company !== 'string' ||
      typeof jobDescription.role !== 'string'
    ) {
      return new Response(JSON.stringify({ error: 'jobDescription { content, company, role } is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trimmedContent = jobDescription.content.trim();
    const trimmedCompany = jobDescription.company.trim();
    const trimmedRole = jobDescription.role.trim();

    if (!trimmedContent || trimmedContent.length < 50) {
      return new Response(JSON.stringify({ error: 'Job description content is too short' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve demo profile (server-enforced: only registered demo slugs are allowed)
    const { data: demoProfile, error: demoProfileError } = await supabase
      .from('public_demo_profiles')
      .select('user_id, visitor_user_id')
      .eq('slug', demoSlug)
      .single();

    if (demoProfileError || !demoProfile) {
      return new Response(JSON.stringify({ error: 'Demo profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const visitorUserId = demoProfile.visitor_user_id || null;
    if (!visitorUserId) {
      return new Response(
        JSON.stringify({
          error: 'Demo is not configured',
          details: 'public_demo_profiles.visitor_user_id must be set to a non-demo profile id to store visitor JDs privately.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a JD record under a non-demo "visitor" user_id so it isn't publicly readable.
    const { data: jd, error: jdError } = await supabase
      .from('job_descriptions')
      .insert({
        user_id: visitorUserId,
        content: trimmedContent,
        company: trimmedCompany,
        role: trimmedRole,
        url: jobDescription.url ?? null,
      })
      .select('id, created_at')
      .single();

    if (jdError || !jd) {
      return new Response(JSON.stringify({ error: 'Failed to create job description', details: jdError?.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create job record (coverLetter pipeline analysis stream)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: demoProfile.user_id,
        type: 'coverLetter',
        input: {
          jobDescriptionId: jd.id,
          demoSlug,
        },
        status: 'pending',
      })
      .select('id, status, type, created_at')
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Failed to create job', details: jobError?.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        jobId: job.id,
        jobDescriptionId: jd.id,
        status: job.status,
        type: job.type,
        createdAt: job.created_at,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error', message: error?.message ?? String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
