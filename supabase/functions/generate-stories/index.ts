import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StoryGenerationRequest {
  userId: string;
  sourceId: string;
  workItems?: Array<{
    id: string;
    company_id: string;
    company_name: string;
    title: string;
    description: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error('[generate-stories] Auth failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: StoryGenerationRequest = await req.json();
    const { userId, sourceId, workItems } = requestData;

    if (!userId || !sourceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, sourceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify userId matches authenticated user
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-stories] Processing for user:', userId, 'source:', sourceId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let storiesCreated = 0;
    const errors: string[] = [];

    // If work items not provided, fetch them
    let itemsToProcess = workItems;
    if (!itemsToProcess || itemsToProcess.length === 0) {
      const { data: fetchedItems, error: fetchError } = await supabase
        .from('work_items')
        .select(`
          id,
          company_id,
          title,
          description,
          companies!inner(name)
        `)
        .eq('user_id', userId)
        .eq('source_id', sourceId);

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch work items', details: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      itemsToProcess = (fetchedItems || []).map((item: any) => ({
        id: item.id,
        company_id: item.company_id,
        company_name: item.companies.name,
        title: item.title,
        description: item.description,
      }));
    }

    console.log('[generate-stories] Processing', itemsToProcess.length, 'work items');

    // Process each work item
    for (const workItem of itemsToProcess) {
      // Skip if no description or too short
      if (!workItem.description || workItem.description.trim().length < 50) {
        console.log('[generate-stories] Skipping work item', workItem.id, '- insufficient description');
        continue;
      }

      // Check if stories already exist for this work item
      const { count: existingCount } = await supabase
        .from('stories')
        .select('id', { count: 'exact', head: true })
        .eq('work_item_id', workItem.id);

      if (existingCount && existingCount > 0) {
        console.log('[generate-stories] Skipping work item', workItem.id, '- already has', existingCount, 'stories');
        continue;
      }

      try {
        // Generate stories using OpenAI
        const generatedStories = await generateStoriesFromDescription(
          workItem.description,
          workItem.title,
          workItem.company_name,
          openaiApiKey
        );

        // Insert generated stories
        for (const story of generatedStories) {
          const { data: insertedStory, error: storyError } = await supabase
            .from('stories')
            .insert({
              user_id: userId,
              work_item_id: workItem.id,
              company_id: workItem.company_id,
              title: story.title,
              content: story.content,
              tags: story.tags || [],
              metrics: story.metrics || [],
              source_id: sourceId,
              status: 'draft',
              confidence: 'medium',
            })
            .select('id')
            .single();

          if (storyError) {
            errors.push(`Failed to insert story for work_item ${workItem.id}: ${storyError.message}`);
          } else {
            storiesCreated++;
            console.log('[generate-stories] Created story:', insertedStory?.id);
          }
        }
      } catch (genError) {
        const errorMsg = genError instanceof Error ? genError.message : 'Unknown error';
        errors.push(`Failed to generate stories for work_item ${workItem.id}: ${errorMsg}`);
      }
    }

    console.log('[generate-stories] Complete:', storiesCreated, 'stories created,', errors.length, 'errors');

    return new Response(
      JSON.stringify({
        success: true,
        storiesCreated,
        errors,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[generate-stories] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateStoriesFromDescription(
  description: string,
  roleTitle: string,
  companyName: string,
  apiKey: string
): Promise<Array<{ title: string; content: string; tags: string[]; metrics: any[] }>> {
  const prompt = `Extract achievement-based stories from this role description.

Role: ${roleTitle} at ${companyName}
Description: ${description}

Rules:
- Extract 1-3 concrete stories with measurable outcomes
- Each story should have: action, context, and result
- Focus on specific achievements, not general responsibilities
- Extract metrics where present (%, $, time saved, users impacted, etc.)
- Return empty array if no clear stories are present

Return JSON:
{
  "stories": [
    {
      "title": "Brief story title (max 100 chars)",
      "content": "Full story with context, action, and result (1-3 sentences)",
      "tags": ["skill", "domain", "outcome"],
      "metrics": [{"value": "50%", "context": "increase in user engagement", "type": "increase"}]
    }
  ]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert at extracting achievement stories from work experience descriptions.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-stories] OpenAI error:', errorText);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn('[generate-stories] No content in OpenAI response');
      return [];
    }

    // Parse JSON response
    const parsed = JSON.parse(content);
    return parsed.stories || [];

  } catch (error) {
    console.error('[generate-stories] Error generating stories:', error);
    return [];
  }
}
