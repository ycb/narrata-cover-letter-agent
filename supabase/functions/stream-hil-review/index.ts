import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatSSE(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

interface HilReviewRequest {
  originalGap: any;
  job: {
    role?: string;
    company?: string;
    coreRequirements?: string[];
    preferredRequirements?: string[];
    jobDescriptionText?: string;
  };
  context: {
    userVoicePrompt?: string;
    sectionTitle?: string;
    workHistorySummary?: string;
    draftCoverageSummary?: string;
    draftOutline?: string;
    contentKind?: 'cover_letter_section' | 'story' | 'role_description' | 'saved_section';
    savedSectionType?: 'introduction' | 'closer' | 'signature' | 'custom';
  };
  text: string;
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
      console.error('[stream-hil-review] Auth failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: HilReviewRequest = await req.json();
    const { originalGap, job, context, text } = requestData;

    if (!text || !job) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text, job' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[stream-hil-review] Request from user:', user.id);

    const prompt = buildReviewNotesPrompt({ originalGap, job, context, text });

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert editor providing structured feedback on cover letter content.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.25,
        max_tokens: 700,
        stream: true,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('[stream-hil-review] OpenAI error:', errorText);
      return new Response(
        JSON.stringify({ error: 'OpenAI API error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullContent = '';
        let firstChunk = true;

        const send = (event: string, data: any) => {
          try {
            controller.enqueue(encoder.encode(formatSSE(event, data)));
          } catch (e) {
            console.error('[stream-hil-review] Error sending SSE:', e);
          }
        };

        try {
          send('start', { timestamp: new Date().toISOString() });

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
                  console.error('[stream-hil-review] Error parsing chunk:', e);
                }
              }
            }
          }

          send('complete', {
            content: fullContent.trim(),
            timestamp: new Date().toISOString(),
          });

        } catch (error) {
          console.error('[stream-hil-review] Stream error:', error);
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
    console.error('[stream-hil-review] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildReviewNotesPrompt(params: any): string {
  const { originalGap, job, context, text } = params;
  
  let prompt = `You are reviewing content for quality and fit. Provide structured feedback as JSON.\n\n`;
  
  prompt += `**Content to Review:**\n${text}\n\n`;
  
  if (job.role || job.company) {
    prompt += `**Job Context:**\n`;
    if (job.role) prompt += `Role: ${job.role}\n`;
    if (job.company) prompt += `Company: ${job.company}\n`;
    prompt += `\n`;
  }

  if (job.coreRequirements && job.coreRequirements.length > 0) {
    prompt += `**Core Requirements:**\n${job.coreRequirements.map((r: string) => `- ${r}`).join('\n')}\n\n`;
  }

  if (context.userVoicePrompt) {
    prompt += `**Writing Style:**\n${truncate(context.userVoicePrompt, 300)}\n\n`;
  }

  if (originalGap) {
    prompt += `**Original Gap:**\n${originalGap.description}\n\n`;
  }

  prompt += `**Instructions:**\n`;
  prompt += `Provide feedback in JSON format with:\n`;
  prompt += `- "summary": Brief overall assessment (1-2 sentences)\n`;
  prompt += `- "suggestions": Array of improvements with:\n`;
  prompt += `  - "id": unique identifier\n`;
  prompt += `  - "priority": "P0" (critical), "P1" (important), or "P2" (nice-to-have)\n`;
  prompt += `  - "why": Explanation of the issue\n`;
  prompt += `  - "anchor": Exact text to replace (from the content)\n`;
  prompt += `  - "replacement": Improved version\n`;
  prompt += `- "questionsToConsider": Array of questions for the user to think about\n`;
  prompt += `- "missingFacts": Array of facts/details that would strengthen the content\n\n`;
  prompt += `Focus on:\n`;
  prompt += `- Specificity and concrete examples\n`;
  prompt += `- Quantifiable results\n`;
  prompt += `- Alignment with job requirements\n`;
  prompt += `- Style consistency\n\n`;
  prompt += `Return ONLY valid JSON, no additional text.`;

  return prompt;
}

function truncate(value: string, maxChars: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars).trim()}…`;
}
