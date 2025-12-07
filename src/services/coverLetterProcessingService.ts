/**
 * Cover Letter Processing Service
 * 
 * Handles the complete pipeline for processing an imported cover letter:
 * 1. Parse paragraphs
 * 2. Merge greeting/closing
 * 3. Create Saved Sections
 * 4. Create Cover Letter Template
 * 5. Extract My Voice
 * 6. Detect and store stories
 */

import { supabase } from '@/lib/supabase';

interface ProcessedParagraph {
  type: 'intro' | 'body' | 'closing';
  content: string;
  position: number;
}

interface StoryCandidate {
  title: string;
  content: string;
  companyName?: string;
  roleTitle?: string;
  metrics: Array<{ value: string; context: string; type?: string }>;
  tags: string[];
}

/**
 * Main entry point: process a cover letter and create all artifacts
 */
export async function processCoverLetter(
  userId: string,
  sourceId: string,
  coverLetterText: string,
  openaiApiKey?: string
): Promise<{
  success: boolean;
  savedSectionsCreated: number;
  templateId: string | null;
  myVoiceCreated: boolean;
  storiesCreated: number;
  errors: string[];
}> {
  console.log('[CLProcess] Starting cover letter processing pipeline');
  
  const errors: string[] = [];
  let savedSectionsCreated = 0;
  let templateId: string | null = null;
  let myVoiceCreated = false;
  let storiesCreated = 0;

  try {
    // Step 1: Parse and categorize paragraphs
    const paragraphs = parseParagraphs(coverLetterText);
    console.log(`[CLProcess] Parsed ${paragraphs.length} paragraphs`);

    // Step 2: Create Saved Sections (strict: first=intro, last=closing, rest=body)
    const sectionIds: string[] = [];
    for (const para of paragraphs) {
      try {
        const title =
          para.type === 'intro'
            ? 'Intro paragraph'
            : para.type === 'closing'
            ? 'Closing paragraph'
            : para.type === 'body'
            ? `Body paragraph ${para.position + 1}`
            : 'Cover letter paragraph';

        const { data: section, error: sectionError } = await supabase
          .from('saved_sections')
          .insert({
            user_id: userId,
            type: para.type,
            title,
            content: para.content,
            // Use paragraph_index to match schema; tags/purpose fields left empty
            paragraph_index: para.position,
            source_id: sourceId,
            tags: [],
            purpose_tags: [],
            times_used: 0
          })
          .select('id')
          .single();

        if (sectionError) {
          errors.push(`Failed to create saved section: ${sectionError.message}`);
        } else if (section) {
          sectionIds.push(section.id);
          savedSectionsCreated++;
          console.log(`[CLProcess] Created saved section: ${section.id} (${para.type})`);
        }
      } catch (err) {
        errors.push(`Error creating saved section: ${err}`);
      }
    }

    // Step 3: Create Cover Letter Template
    if (sectionIds.length > 0) {
      // Build template sections structure
      const templateSections = paragraphs.map((para, idx) => ({
        id: sectionIds[idx],
        type: para.type === 'body' ? 'paragraph' : para.type === 'closing' ? 'closer' : 'intro',
        title: para.type === 'body' ? `Body paragraph ${para.position + 1}` : para.type === 'closing' ? 'Closing paragraph' : 'Introduction',
        isStatic: true,
        staticContent: para.content,
        savedSectionId: sectionIds[idx],
        order: idx
      }));

      try {
        const { data: template, error: templateError } = await supabase
          .from('cover_letter_templates')
          .insert({
            user_id: userId,
            name: 'Imported Cover Letter',
            description: 'Template created from your uploaded cover letter',
            section_ids: sectionIds,
            sections: templateSections,
            is_default: true, // Set as default template
            source_id: sourceId
          })
          .select('id')
          .single();

        if (templateError) {
          errors.push(`Failed to create template: ${templateError.message}`);
        } else if (template) {
          templateId = template.id;
          console.log(`[CLProcess] Created template: ${templateId}`);
        }
      } catch (err) {
        errors.push(`Error creating template: ${err}`);
      }
    }

    // Step 4: Extract My Voice
    try {
      const apiKey =
        openaiApiKey ||
        (import.meta.env?.VITE_OPENAI_API_KEY as string | undefined) ||
        (import.meta.env?.VITE_OPENAI_KEY as string | undefined) ||
        (typeof process !== 'undefined' ? process.env.VITE_OPENAI_API_KEY : undefined) ||
        (typeof process !== 'undefined' ? process.env.VITE_OPENAI_KEY : undefined);
      if (apiKey) {
        // Merge intro + closing for voice extraction (skip body paragraphs)
        const introPara = paragraphs.find(p => p.type === 'intro');
        const closingPara = paragraphs.find(p => p.type === 'closing');
        const voiceText = [introPara?.content, closingPara?.content]
          .filter(Boolean)
          .join('\n\n');

        const voicePrompt = await extractMyVoice(voiceText, apiKey);
        if (voicePrompt) {
          const voiceObject = {
            prompt: voicePrompt,
            lastUpdated: new Date().toISOString()
          };

          const { data: voice, error: voiceError } = await supabase
            .from('user_voice')
            .upsert({
              user_id: userId,
              prompt: voicePrompt,
              source_type: 'cover_letter',
              source_id: sourceId,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            })
            .select('id')
            .single();

          if (voiceError) {
            errors.push(`Failed to save My Voice: ${voiceError.message}`);
          } else if (voice) {
            myVoiceCreated = true;
            console.log(`[CLProcess] Extracted and saved My Voice: ${voice.id}`);

            // Also persist to profiles.user_voice so UI can read it
            const { error: profileVoiceError } = await supabase
              .from('profiles')
              .update({
                user_voice: voiceObject,
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);
            if (profileVoiceError) {
              console.warn('[CLProcess] Failed to mirror voice to profiles.user_voice:', profileVoiceError);
            }
          }
        }
      }
    } catch (err) {
      errors.push(`My Voice extraction failed: ${err}`);
    }

    // Step 5: Detect and store stories from paragraphs
    try {
  const apiKey = openaiApiKey || import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_KEY;
      if (apiKey) {
        // Check each paragraph for stories
        for (const para of paragraphs) {
          if (para.type === 'body') { // Only check body paragraphs for stories
            const stories = await detectStoriesInParagraph(para.content, apiKey);
            
            for (const story of stories) {
              try {
                // Try to match to a work_item
                const workItemId = await matchStoryToWorkItem(
                  userId,
                  story.companyName,
                  story.roleTitle
                );

                const { data: insertedStory, error: storyError } = await supabase
                  .from('stories')
                  .insert({
                    user_id: userId,
                    work_item_id: workItemId, // nullable if no match
                    company_id: workItemId ? await getCompanyIdForWorkItem(workItemId) : null,
                    title: story.title,
                    content: story.content,
                    tags: story.tags,
                    metrics: story.metrics,
                    source_type: 'cover_letter',
                    source_id: sourceId
                  })
                  .select('id')
                  .single();

                if (storyError) {
                  errors.push(`Failed to create story: ${storyError.message}`);
                } else if (insertedStory) {
                  storiesCreated++;
                  console.log(`[CLProcess] Created story: ${insertedStory.id}`);
                }
              } catch (err) {
                errors.push(`Error creating story: ${err}`);
              }
            }
          }
        }
      }
    } catch (err) {
      errors.push(`Story detection failed: ${err}`);
    }

    console.log(`[CLProcess] Pipeline complete: ${savedSectionsCreated} sections, ${storiesCreated} stories, voice=${myVoiceCreated}`);

    return {
      success: errors.length === 0,
      savedSectionsCreated,
      templateId,
      myVoiceCreated,
      storiesCreated,
      errors
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Cover letter processing failed: ${errorMsg}`);
    return {
      success: false,
      savedSectionsCreated,
      templateId,
      myVoiceCreated,
      storiesCreated,
      errors
    };
  }
}

/**
 * Parse cover letter text into categorized paragraphs
 */
function parseParagraphs(text: string): ProcessedParagraph[] {
  // Split on blank lines; do NOT split on single newlines to avoid fragments
  let chunks = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (chunks.length === 0) return [];

  const closingPatterns = /(sincerely|best regards|regards|thank you|thanks|cordially)/i;
  const contactPatterns = /(https?:\/\/|linkedin\.com|@|tel:|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/i;
  const paragraphs: ProcessedParagraph[] = [];
  let position = 0;

  // Filter out obvious contact/footer fragments
  chunks = chunks.filter((c) => !contactPatterns.test(c.toLowerCase()) || c.length > 120);

  // Intro = first paragraph
  paragraphs.push({
    type: 'intro',
    content: chunks[0],
    position: position++,
  });

  // Determine closing index (only if it matches closing pattern)
  let closingIndex: number | null = null;
  if (chunks.length > 1) {
    const lastIdx = chunks.length - 1;
    if (closingPatterns.test(chunks[lastIdx])) {
      closingIndex = lastIdx;
    }
  }

  // Body paragraphs (everything between intro and closing)
  const bodyStart = 1;
  const bodyEnd = closingIndex !== null ? closingIndex : chunks.length;
  for (let i = bodyStart; i < bodyEnd; i++) {
    paragraphs.push({
      type: 'body',
      content: chunks[i],
      position: position++,
    });
  }

  // Closing (if detected)
  if (closingIndex !== null) {
    const closingContent = chunks.slice(closingIndex).join('\n\n');
    paragraphs.push({
      type: 'closing',
      content: closingContent,
      position: position++,
    });
  }

  return paragraphs;
}

/**
 * Extract My Voice prompt from cover letter text
 * Returns a single cohesive prompt string (no JSON, no formatting)
 */
async function extractMyVoice(text: string, apiKey: string): Promise<string | null> {
  const prompt = `Analyze this cover letter excerpt and create a writing profile prompt.

Cover Letter Excerpt:
${text}

Extract and describe:
- Tone (professional, warm, concise, assertive, etc.)
- Style (sentence length, structure, transition patterns)
- Persona (narrative stance, confidence level, point of view)
- Preferred rhetorical patterns (metrics-first, story-first, credentials-first)
- Preferred length and pacing
- Lexical preferences (characteristic verbs, phrases)
- Avoidances (words they do NOT use)

Return a single cohesive prompt block that can be used to condition future writing.
Do NOT use JSON. Do NOT use formatting markers.
Output ONLY the prompt text itself, as if instructing an AI to write in this person's voice.

Example output format:
"Write in a professional yet warm tone. Use concise sentences (12-18 words average). Begin with impact, then provide context. Favor active voice and strong action verbs like 'led', 'drove', 'transformed'. Include specific metrics where possible. Maintain confident but not boastful stance. Avoid corporate jargon like 'synergy' or 'leverage'. Keep paragraphs short (3-4 sentences max)."`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('[CLProcess] Error extracting My Voice:', error);
    return null;
  }
}

/**
 * Detect stories in a paragraph using LLM
 */
async function detectStoriesInParagraph(
  paragraph: string,
  apiKey: string
): Promise<StoryCandidate[]> {
  const prompt = `Analyze this paragraph from a cover letter and extract any achievement-based stories.

Paragraph:
${paragraph}

A story should have:
- Specific experience/action at a company
- Clear role/responsibility
- Measurable outcome or result

Return JSON:
{
  "stories": [
    {
      "title": "Brief story title",
      "content": "Full story text (verbatim from paragraph if possible)",
      "companyName": "Company name if mentioned",
      "roleTitle": "Role/title if mentioned",
      "metrics": [{"value": "50%", "context": "increase in engagement", "type": "increase"}],
      "tags": ["skill", "domain"]
    }
  ]
}

If no clear stories, return empty array.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed.stories || [];
  } catch (error) {
    console.error('[CLProcess] Error detecting stories:', error);
    return [];
  }
}

/**
 * Try to match a story to an existing work_item
 */
async function matchStoryToWorkItem(
  userId: string,
  companyName?: string,
  roleTitle?: string
): Promise<string | null> {
  if (!companyName) return null;

  try {
    // Find work_items that match the company
    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', `%${companyName}%`)
      .limit(1);

    if (!companies || companies.length === 0) return null;

    const companyId = companies[0].id;

    // If we have a role title, try to match it
    let query = supabase
      .from('work_items')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (roleTitle) {
      query = query.ilike('title', `%${roleTitle}%`);
    }

    const { data: workItems } = await query.limit(1);

    if (workItems && workItems.length > 0) {
      return workItems[0].id;
    }

    // Fallback: return any work_item for this company
    const { data: anyWorkItem } = await supabase
      .from('work_items')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .limit(1);

    return anyWorkItem && anyWorkItem.length > 0 ? anyWorkItem[0].id : null;
  } catch (error) {
    console.error('[CLProcess] Error matching story to work_item:', error);
    return null;
  }
}

/**
 * Get company_id for a work_item
 */
async function getCompanyIdForWorkItem(workItemId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('work_items')
      .select('company_id')
      .eq('id', workItemId)
      .single();

    return data?.company_id || null;
  } catch (error) {
    console.error('[CLProcess] Error getting company_id:', error);
    return null;
  }
}
