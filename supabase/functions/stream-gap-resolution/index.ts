import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SSE helper to format event messages
function formatSSE(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

interface GapResolutionRequest {
  gap: {
    id: string;
    type: string;
    severity: string;
    description: string;
    suggestion?: string;
  };
  jobContext: {
    role?: string;
    company?: string;
    coreRequirements?: string[];
    preferredRequirements?: string[];
    jobDescriptionText?: string;
  };
  hilContext?: {
    userVoicePrompt?: string;
    sectionTitle?: string;
    workHistorySummary?: string;
    draftCoverageSummary?: string;
    draftOutline?: string;
  };
  promptOptions?: {
    allowNeedsInputPlaceholders?: boolean;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user's JWT token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error('[stream-gap-resolution] Auth failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const requestData: GapResolutionRequest = await req.json();
    const { gap, jobContext, hilContext, promptOptions } = requestData;

    if (!gap || !gap.description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: gap, gap.description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[stream-gap-resolution] Request from user:', user.id, 'Gap type:', gap.type);

    // Build prompt for gap resolution
    const prompt = buildGapResolutionPrompt(gap, jobContext, hilContext, promptOptions);

    // Stream response from OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL_HIL') || 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert cover letter writer helping users create compelling content.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 900,
        stream: true,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('[stream-gap-resolution] OpenAI error:', errorText);
      return new Response(
        JSON.stringify({ error: 'OpenAI API error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullContent = '';
        let firstChunk = true;

        const send = (event: string, data: any) => {
          try {
            controller.enqueue(encoder.encode(formatSSE(event, data)));
          } catch (e) {
            console.error('[stream-gap-resolution] Error sending SSE:', e);
          }
        };

        try {
          // Send initial event
          send('start', { timestamp: new Date().toISOString() });

          // Process OpenAI stream
          const reader = openaiResponse.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('No reader available from OpenAI response');
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;

                  if (content) {
                    fullContent += content;
                    send('update', {
                      content: fullContent,
                      chunk: content,
                      timestamp: new Date().toISOString(),
                      isFirstChunk: firstChunk,
                    });
                    firstChunk = false;
                  }
                } catch (e) {
                  console.error('[stream-gap-resolution] Error parsing chunk:', e);
                }
              }
            }
          }

          // Strip wrapping quotes if present
          fullContent = stripWrappingQuotes(fullContent);

          // Send completion event
          send('complete', {
            content: fullContent,
            timestamp: new Date().toISOString(),
          });

        } catch (error) {
          console.error('[stream-gap-resolution] Stream error:', error);
          send('error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });
        } finally {
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
    console.error('[stream-gap-resolution] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions

function buildGapResolutionPrompt(
  gap: any,
  jobContext: any,
  hilContext: any = {},
  promptOptions: any = {}
): string {
  const allowPlaceholders = promptOptions.allowNeedsInputPlaceholders ?? true;
  
  let prompt = `You are helping create compelling cover letter content to address a gap.\n\n`;
  
  // Gap details
  prompt += `**Gap to Address:**\n`;
  prompt += `Type: ${gap.type}\n`;
  prompt += `Severity: ${gap.severity}\n`;
  prompt += `Description: ${gap.description}\n`;
  if (gap.suggestion) {
    prompt += `Suggestion: ${gap.suggestion}\n`;
  }
  prompt += `\n`;

  // Job context
  if (jobContext.role || jobContext.company) {
    prompt += `**Job Context:**\n`;
    if (jobContext.role) prompt += `Role: ${jobContext.role}\n`;
    if (jobContext.company) prompt += `Company: ${jobContext.company}\n`;
    prompt += `\n`;
  }

  if (jobContext.coreRequirements && jobContext.coreRequirements.length > 0) {
    prompt += `**Core Requirements:**\n${jobContext.coreRequirements.map(r => `- ${r}`).join('\n')}\n\n`;
  }

  // HIL context
  if (hilContext.userVoicePrompt) {
    prompt += `**Writing Style:**\n${hilContext.userVoicePrompt}\n\n`;
  }

  if (hilContext.sectionTitle) {
    prompt += `**Section:** ${hilContext.sectionTitle}\n\n`;
  }

  if (hilContext.workHistorySummary) {
    prompt += `**Work History Summary:**\n${truncate(hilContext.workHistorySummary, 500)}\n\n`;
  }

  if (hilContext.draftCoverageSummary) {
    prompt += `**Current Draft Coverage:**\n${truncate(hilContext.draftCoverageSummary, 500)}\n\n`;
  }

  // Instructions
  prompt += `**Instructions:**\n`;
  prompt += `Generate 2-4 sentences of compelling content that addresses this gap.\n`;
  prompt += `- Focus on concrete achievements and specific examples\n`;
  prompt += `- Use metrics where possible\n`;
  prompt += `- Match the writing style provided\n`;
  prompt += `- Address the specific requirements mentioned\n`;
  
  if (allowPlaceholders) {
    prompt += `- If you need specific facts, use [NEEDS_INPUT: description] placeholders\n`;
  }
  
  prompt += `\nReturn ONLY the content paragraph, no meta-commentary.`;

  return prompt;
}

function truncate(value: string, maxChars: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars).trim()}…`;
}

function stripWrappingQuotes(content: string): string {
  const trimmed = content.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
