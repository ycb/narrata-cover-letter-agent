import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateJobRequest {
  type: 'onboarding' | 'coverLetter' | 'pmLevels';
  input: Record<string, any>;
}

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

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client 1: Validate user's JWT token using service role key
    // We need to extract the JWT token and verify it
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth validation failed:', {
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader?.substring(0, 20),
        authError: authError?.message,
        hasUser: !!user,
      });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid auth token',
          details: authError?.message || 'No user found',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Auth successful for user:', user.id);
    
    // Client 2: Use service role key for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: CreateJobRequest = await req.json();
    const { type, input } = body;

    // Validate job type
    const validTypes = ['onboarding', 'coverLetter', 'pmLevels'];
    if (!type || !validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid job type. Must be: onboarding, coverLetter, or pmLevels' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    if (!input || typeof input !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid input. Must be an object' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Type-specific validation
    if (type === 'coverLetter') {
      if (!input.jobDescriptionId) {
        return new Response(
          JSON.stringify({ error: 'Cover letter job requires jobDescriptionId in input' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create job record
    const { data: job, error: insertError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        type,
        input,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create job:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Job created successfully:', job.id);

    // Note: The frontend triggers stream-job-process after job creation
    // (Edge Functions can't reliably call each other)

    // Return job ID immediately
    return new Response(
      JSON.stringify({
        jobId: job.id,
        status: job.status,
        type: job.type,
        createdAt: job.created_at,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error in create-job:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

