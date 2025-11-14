// Content Generation Prompts
// Human-in-the-Loop Content Creation Feature
// Phase 4 - AI-Assisted Content Creation

import type { Gap } from '@/services/gapDetectionService';

/**
 * Work History Context for LLM
 */
export interface WorkHistoryContext {
  userId: string;
  currentRole?: {
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
  };
  allStories: Array<{
    title: string;
    content: string;
    metrics?: string[];
  }>;
  metrics?: string[]; // Role-level metrics
}

/**
 * Job Context for targeted content generation
 */
export interface JobContext {
  jobTitle: string;
  company: string;
  jobDescription?: string;
  keywords?: string[];
}

/**
 * System prompt for all content generation
 */
export const CONTENT_GENERATION_SYSTEM_PROMPT = `You are a professional career coach and cover letter expert. Your role is to help job seekers create compelling, truth-based content that showcases their achievements effectively.

Core Principles:
1. TRUTH FIDELITY: Never fabricate or exaggerate. Use only provided facts from work history.
2. SPECIFICITY: Replace vague statements with concrete metrics and examples.
3. IMPACT FOCUS: Emphasize measurable outcomes over responsibilities.
4. AUTHENTICITY: Maintain the user's natural voice and tone.
5. BREVITY: Be concise and impactful.

CRITICAL CONSTRAINT: If you cannot address a gap with the provided work history facts, respond with "I don't have sufficient information to address this gap" rather than fabricating content.

Always output only the requested content without explanations or meta-commentary.`;

/**
 * Build content generation prompt for stories (approved_content)
 */
export function buildStoryGenerationPrompt(
  gap: Gap,
  existingContent: string,
  workHistoryContext: WorkHistoryContext,
  jobContext?: JobContext
): string {
  const prompt = `You are an expert career coach helping a professional improve their work history content for job applications.

**Your Task**: Generate enhanced content that addresses the identified gap while maintaining 100% truth fidelity.

**CRITICAL CONSTRAINTS**:
1. Use ONLY facts from the provided work history - NO hallucinations or fabrications
2. Maintain the user's authentic voice and tone
3. Follow STAR format: Situation, Task, Action, Result
4. Include specific, quantifiable metrics when available
5. Keep content concise (2-4 sentences)
6. If you cannot address the gap with available facts, say "Insufficient information in work history to address this gap"

**User Context**:
${workHistoryContext.currentRole ? `Current Role: ${workHistoryContext.currentRole.title} at ${workHistoryContext.currentRole.company}
Duration: ${workHistoryContext.currentRole.startDate}${workHistoryContext.currentRole.endDate ? ` - ${workHistoryContext.currentRole.endDate}` : ' - Present'}` : ''}

${workHistoryContext.metrics && workHistoryContext.metrics.length > 0 ? `
**Available Metrics** (use these in the story):
${workHistoryContext.metrics.map(m => `- ${m}`).join('\n')}
` : ''}

${workHistoryContext.allStories.length > 0 ? `
**Related Stories** (for context - do NOT copy verbatim):
${workHistoryContext.allStories.slice(0, 3).map(s => `- ${s.title}: ${s.content.substring(0, 150)}...${s.metrics ? ' [Metrics: ' + s.metrics.join(', ') + ']' : ''}`).join('\n')}
` : ''}

${jobContext ? `
**Target Job Context** (tailor content for this role):
- Position: ${jobContext.jobTitle} at ${jobContext.company}
${jobContext.keywords ? `- Key Requirements: ${jobContext.keywords.join(', ')}` : ''}
${jobContext.jobDescription ? `- Job Description Excerpt: ${jobContext.jobDescription.substring(0, 200)}...` : ''}
` : ''}

**Gap to Address**:
- Category: ${gap.gap_category.replace(/_/g, ' ')}
- Issue: ${gap.description}
- Suggestion: ${gap.suggestions && gap.suggestions.length > 0 ? gap.suggestions.join('; ') : 'Add more specific details and measurable outcomes'}

**Existing Content**:
${existingContent || 'No existing content provided'}

**Instructions**:
Generate improved content that:
1. Addresses the gap by ${gap.suggestions && gap.suggestions.length > 0 ? gap.suggestions[0].toLowerCase() : 'adding specific details and metrics'}
2. Uses ONLY the metrics and facts provided above - no fabrication
3. Maintains the original story's core message (if existing content provided)
4. Follows STAR format structure (Situation, Task, Action, Result)
5. Is compelling and achievement-focused
6. Uses specific numbers and percentages from the available metrics

Output ONLY the enhanced content, no explanations.`;

  return prompt;
}

/**
 * Build content generation prompt for role descriptions (work_item)
 */
export function buildRoleDescriptionPrompt(
  gap: Gap,
  existingContent: string,
  workHistoryContext: WorkHistoryContext
): string {
  const prompt = `You are an expert career coach helping a professional improve their role description for job applications.

**Your Task**: Generate an enhanced role description that showcases measurable impact and specific achievements.

**CRITICAL CONSTRAINTS**:
1. Use ONLY facts from the work history - NO hallucinations or fabrications
2. Focus on outcomes and impact, not responsibilities
3. Include 2-3 specific metrics or achievements
4. Keep it concise (2-3 sentences)
5. Maintain professional tone
6. If you cannot provide specific metrics from the work history, say "Insufficient information to provide specific metrics"

**Role Context**:
${workHistoryContext.currentRole ? `${workHistoryContext.currentRole.title} at ${workHistoryContext.currentRole.company}
Duration: ${workHistoryContext.currentRole.startDate}${workHistoryContext.currentRole.endDate ? ` - ${workHistoryContext.currentRole.endDate}` : ' - Present'}` : 'Role information not provided'}

${workHistoryContext.metrics && workHistoryContext.metrics.length > 0 ? `
**Available Metrics** (use these in the description):
${workHistoryContext.metrics.map(m => `- ${m}`).join('\n')}
` : ''}

${workHistoryContext.allStories.length > 0 ? `
**Key Achievements** (reference these accomplishments):
${workHistoryContext.allStories.slice(0, 5).map(s => `- ${s.title}${s.metrics && s.metrics.length > 0 ? ': ' + s.metrics.join(', ') : ''}`).join('\n')}
` : ''}

**Gap to Address**:
- Issue: ${gap.description}
- Suggestion: ${gap.suggestions && gap.suggestions.length > 0 ? gap.suggestions.join('; ') : 'Add quantifiable results and specific achievements'}

**Existing Description**:
${existingContent || 'No description provided'}

**Instructions**:
Generate an enhanced role description that:
1. Leads with the most impactful achievement or metric from the list above
2. Demonstrates scope and leadership (team size, budget, stakeholders) using only provided facts
3. Uses 2-3 specific metrics from the available metrics list
4. Avoids generic statements like "led the team" without context and numbers
5. Is results-focused, not task-focused

Example format: "Led [team size] [team type] at [Company], achieving [specific metric 1] through [specific action], and [specific metric 2] through [another action]."

Output ONLY the enhanced description, no explanations.`;

  return prompt;
}

/**
 * Build content generation prompt for saved sections (cover letter sections)
 */
export function buildSavedSectionPrompt(
  gap: Gap,
  existingContent: string,
  sectionType: 'introduction' | 'closer' | 'signature' | 'custom',
  workHistoryContext: WorkHistoryContext,
  jobContext?: JobContext
): string {
  const sectionGuidance = {
    introduction: {
      purpose: 'Open the cover letter with a compelling hook that grabs attention',
      structure: '1) Hook (company research or relevant achievement), 2) Value proposition, 3) Relevance to role',
      length: '3-4 sentences',
      examples: [
        'Start with a specific achievement: "When I led the redesign of Acme\'s checkout flow, reducing cart abandonment by 35%, I learned..."',
        'Reference company news: "I was excited to see TechCorp\'s recent Series B announcement, as it aligns with my experience scaling product teams..."',
        'Lead with passion: "As a PM who has increased user engagement by 40% across three products, I\'m drawn to roles where data-driven decisions..."'
      ]
    },
    closer: {
      purpose: 'Close the cover letter with a strong call-to-action and enthusiasm',
      structure: '1) Restate value proposition, 2) Express enthusiasm, 3) Call-to-action',
      length: '2-3 sentences',
      examples: [
        'My track record of delivering 25% revenue growth through product innovation makes me confident I can drive similar results at [Company]...',
        'I would welcome the opportunity to discuss how my experience scaling products from 0 to 100K users aligns with [Company]\'s growth trajectory...'
      ]
    },
    signature: {
      purpose: 'Professional sign-off',
      structure: 'Simple professional closing',
      length: '1 sentence',
      examples: [
        'Thank you for your consideration.',
        'I look forward to discussing this opportunity further.'
      ]
    },
    custom: {
      purpose: 'Custom section content',
      structure: 'Depends on section purpose',
      length: '2-4 sentences',
      examples: []
    }
  };

  const guidance = sectionGuidance[sectionType] || sectionGuidance.custom;

  const prompt = `You are an expert cover letter writer helping a professional create compelling, reusable cover letter sections.

**Your Task**: Generate a ${sectionType} section that ${guidance.purpose.toLowerCase()}.

**CRITICAL CONSTRAINTS**:
1. Use ONLY facts from the work history - NO generic claims or fabrications
2. Avoid clichés like "I am writing to express my interest"
3. Make it specific and compelling, not templated
4. Length: ${guidance.length}
5. Use [Placeholders] for company/role names to enable reusability
6. If you cannot create compelling content from the work history, say "Insufficient achievements in work history for this section type"

**User Context**:
${workHistoryContext.currentRole ? `Most Recent Role: ${workHistoryContext.currentRole.title} at ${workHistoryContext.currentRole.company}` : ''}

${workHistoryContext.metrics && workHistoryContext.metrics.length > 0 ? `
**Key Achievements to Reference**:
${workHistoryContext.metrics.slice(0, 3).map(m => `- ${m}`).join('\n')}
` : ''}

${workHistoryContext.allStories.length > 0 ? `
**Success Stories Available**:
${workHistoryContext.allStories.slice(0, 3).map(s => `- ${s.title}${s.metrics && s.metrics.length > 0 ? ': ' + s.metrics[0] : ''}`).join('\n')}
` : ''}

${jobContext ? `
**Target Role** (use as example context):
- Position: ${jobContext.jobTitle} at ${jobContext.company}
${jobContext.keywords ? `- Key Requirements: ${jobContext.keywords.join(', ')}` : ''}
` : ''}

**Gap to Address**:
- Issue: ${gap.description}
- Suggestion: ${gap.suggestions && gap.suggestions.length > 0 ? gap.suggestions.join('; ') : 'Make content more specific and compelling'}

**Existing Content**:
${existingContent || 'No existing content'}

**Structure Guidance for ${sectionType}**:
${guidance.structure}

${guidance.examples.length > 0 ? `**Good Examples**:
${guidance.examples.map(ex => `- ${ex}`).join('\n')}` : ''}

**Instructions**:
Generate enhanced content that:
1. ${guidance.purpose}
2. References specific achievements with metrics from the work history above
3. Uses placeholders: [Company], [Position], [Industry/Field] for reusability
4. Avoids generic cover letter clichés
5. Can be adapted across multiple applications
6. Follows the structure: ${guidance.structure}

Output ONLY the enhanced section content, no explanations.`;

  return prompt;
}
