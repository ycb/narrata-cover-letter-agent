/**
 * Section-Level Content Standards Evaluation Prompts
 *
 * Evaluates individual cover letter sections against applicable content standards
 * Returns structured feedback for section-scoped standards only
 */

import type { ContentStandardConfig } from '@/types/coverLetters';

/**
 * Build prompt for evaluating a single section against applicable standards
 *
 * @param sectionContent - The section text to evaluate
 * @param sectionType - Type of section (intro, body, closing)
 * @param applicableStandards - Standards that apply to this section type
 * @param jobDescription - Job description for context
 * @returns LLM prompt for section evaluation
 */
export function buildSectionStandardsPrompt(
  sectionContent: string,
  sectionType: 'intro' | 'body' | 'closing',
  applicableStandards: ContentStandardConfig[],
  jobDescription?: string
): string {
  const sectionTypeLabel = sectionType === 'intro' ? 'Introduction' : sectionType === 'body' ? 'Body Paragraph' : 'Closing';

  const jobContext = jobDescription
    ? `\n\nJob Description Context:\n${jobDescription.slice(0, 1000)}${jobDescription.length > 1000 ? '...' : ''}`
    : '';

  return `You are an expert cover letter evaluator for product management roles.

Your task: Evaluate this ${sectionTypeLabel} section against specific content quality standards.

Section Content:
${sectionContent}${jobContext}

Evaluation Standards (${applicableStandards.length} applicable to ${sectionType} sections):

${applicableStandards.map((standard, idx) => `${idx + 1}. ${standard.label.toUpperCase()}
   ${standard.description}
   ${getSectionGuidance(standard.id, sectionType)}`).join('\n\n')}

For each standard, evaluate:
1. Does this section meet the standard? (met / not_met / not_applicable)
2. What specific evidence supports your evaluation?

Return ONLY valid JSON with this exact structure:

{
  "standards": [
    {
      "standardId": "${applicableStandards[0]?.id || 'example_id'}",
      "status": "met" | "not_met" | "not_applicable",
      "evidence": "Specific quote or explanation from the section"
    }${applicableStandards.length > 1 ? `,
    {
      "standardId": "${applicableStandards[1]?.id || 'example_id_2'}",
      "status": "met" | "not_met" | "not_applicable",
      "evidence": "..."
    }` : ''}
  ]
}

Evaluation Guidelines:
- "met": Standard is clearly satisfied
- "not_met": Standard is not satisfied or only partially satisfied
- "not_applicable": Standard doesn't make sense for this specific section content
- Be specific in evidence - use direct quotes when possible
- Context matters: evaluate based on ${sectionTypeLabel} section expectations

Return ONLY the JSON object, no markdown formatting.`;
}

/**
 * Get section-specific guidance for each standard
 */
function getSectionGuidance(standardId: string, sectionType: 'intro' | 'body' | 'closing'): string {
  const guidance: Record<string, Record<string, string>> = {
    compelling_opening: {
      intro: '- Must immediately capture attention\n   - Should show genuine interest in role/company\n   - Avoid generic openings like "I am writing to apply..."',
      body: '',
      closing: '',
    },
    business_understanding: {
      intro: '- References company products, users, or market\n   - Shows research beyond surface-level',
      body: '- Demonstrates knowledge of company challenges or opportunities\n   - Connects experience to company context',
      closing: '- Mentions company mission, culture, or values\n   - Shows alignment with company vision',
    },
    quantified_impact: {
      intro: '- May include high-level metrics if relevant (e.g., "10+ years managing...")',
      body: '- MUST include specific metrics: percentages, dollar amounts, team sizes, etc.\n   - Examples: "Increased conversion by 20%", "Managed $5M budget", "Led team of 8"',
      closing: '- Not typically expected in closing paragraphs',
    },
    action_verbs: {
      intro: '- Uses strong action verbs: Led, Built, Drove, etc.',
      body: '- Every achievement should start with a strong action verb\n   - Shows clear ownership (I did X, not "The team did X")',
      closing: '- Uses confident language: Looking forward to, Excited to contribute, etc.',
    },
    star_format: {
      intro: '',
      body: '- Stories must follow Situation-Task-Action-Result structure\n   - Context (situation) + What you did (action) + Outcome (result)\n   - Each achievement needs all components',
      closing: '',
    },
    personalized: {
      intro: '- Clearly references this specific role and company\n   - Not generic (could apply to any PM job)',
      body: '- Experience clearly relates to job requirements\n   - Examples chosen specifically for this role',
      closing: '- Reinforces fit for THIS specific opportunity',
    },
    specific_examples: {
      intro: '',
      body: '- Concrete examples from work history\n   - Not vague claims like "strong communicator"\n   - Backs assertions with evidence',
      closing: '',
    },
    company_research: {
      intro: '- Shows understanding of company products, culture, or mission',
      body: '- References company-specific challenges or opportunities',
      closing: '- Mentions company values, mission, or vision\n   - Demonstrates cultural fit',
    },
  };

  return guidance[standardId]?.[sectionType] || '';
}
