/**
 * Utilities for calling secure Edge Functions
 * Replaces client-side OpenAI service calls
 */

import { supabase } from '@/lib/supabase';

export interface GapResolutionEdgeFunctionRequest {
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

export interface HilReviewEdgeFunctionRequest {
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

/**
 * Stream gap resolution content from Edge Function
 */
export async function streamGapResolution(
  request: GapResolutionEdgeFunctionRequest,
  options: {
    onUpdate?: (content: string) => void;
    onComplete?: (content: string) => void;
    onError?: (error: Error) => void;
  } = {}
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session');
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-gap-resolution`;

  return new Promise((resolve, reject) => {
    let fullContent = '';

    fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Gap resolution failed');
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.content) {
                  fullContent = data.content;
                  options.onUpdate?.(fullContent);
                }

                if (line.includes('event: complete')) {
                  options.onComplete?.(fullContent);
                  resolve(fullContent);
                  return;
                }
              } catch (e) {
                // Ignore JSON parse errors for partial chunks
              }
            }
          }
        }

        resolve(fullContent);
      })
      .catch((error) => {
        const err = error instanceof Error ? error : new Error('Stream error');
        options.onError?.(err);
        reject(err);
      });
  });
}

/**
 * Stream HIL review notes from Edge Function
 */
export async function streamHilReview(
  request: HilReviewEdgeFunctionRequest,
  options: {
    onUpdate?: (content: string) => void;
    onComplete?: (content: string) => void;
    onError?: (error: Error) => void;
  } = {}
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session');
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-hil-review`;

  return new Promise((resolve, reject) => {
    let fullContent = '';

    fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'HIL review failed');
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.content) {
                  fullContent = data.content;
                  options.onUpdate?.(fullContent);
                }

                if (line.includes('event: complete')) {
                  options.onComplete?.(fullContent);
                  resolve(fullContent);
                  return;
                }
              } catch (e) {
                // Ignore JSON parse errors for partial chunks
              }
            }
          }
        }

        resolve(fullContent);
      })
      .catch((error) => {
        const err = error instanceof Error ? error : new Error('Stream error');
        options.onError?.(err);
        reject(err);
      });
  });
}

/**
 * Generate stories via Edge Function
 */
export async function generateStories(
  userId: string,
  sourceId: string
): Promise<{ storiesCreated: number; errors: string[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session');
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-stories`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      sourceId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Story generation failed');
  }

  return await response.json();
}
