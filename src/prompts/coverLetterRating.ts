/**
 * Cover Letter Rating Prompt
 *
 * Evaluates cover letter quality against comprehensive rubric
 * Includes: standard criteria, STAR format, metrics, voice alignment, level appropriateness
 */

export const buildCoverLetterRatingPrompt = (
  coverLetterDraft: string,
  jobDescription: string,
  userVoicePrompt?: string,
  pmLevel?: string
): string => {
  const voiceGuidance = userVoicePrompt
    ? `\n\nUser's Voice/Tone Preferences:
${userVoicePrompt}

The cover letter should align with this voice while remaining professional.`
    : '';

  const levelGuidance = pmLevel
    ? `\n\nUser's PM Level: ${pmLevel}

The cover letter should demonstrate appropriate seniority signals for this level.
- Junior/APM: Focus on learning, collaboration, execution
- Mid-level: Ownership, cross-functional leadership, metrics
- Senior/Staff: Strategic impact, team leadership, business outcomes
- Principal/Director+: Org-level impact, vision, mentorship`
    : '';

  return `You are an expert cover letter evaluator for product management roles.

Your task: Evaluate this cover letter draft against a comprehensive quality rubric.

Job Description:
${jobDescription}

Cover Letter Draft:
${coverLetterDraft}${voiceGuidance}${levelGuidance}

Evaluation Rubric (11 criteria):

1. COMPELLING OPENING
   - Does it immediately capture attention with a hook or clear credibility?
   - Does it show genuine interest in the role/company (explicit or implied)?
   - Metrics strengthen the opening but are not required if credibility is clear
   - Avoid generic openings like "I am writing to apply..."

2. UNDERSTANDING OF BUSINESS/USERS
   - Demonstrates knowledge of company's products, users, or market
   - Shows research beyond surface-level

3. QUANTIFIED IMPACT (from gap detection standards)
   - Contains specific metrics, percentages, or measurable results
   - Examples: "Increased conversion by 20%", "Managed $5M budget", "Led team of 8"
   - Missing this is a quality gap

4. ACTION VERBS & OWNERSHIP
   - Uses strong action verbs: Led, Built, Drove, Shipped, Defined, etc.
   - Shows clear ownership (I did X, not "The team did X") across the draft

5. STAR FORMAT (from gap detection standards)
   - Stories follow Situation-Task-Action-Result structure
   - Each achievement has context + what you did + outcome
   - Missing this is a quality gap

6. CONCISE LENGTH
   - 3-4 paragraphs, under 400 words
   - No unnecessary fluff or repetition

7. ERROR-FREE WRITING
   - No spelling or grammar errors
   - Professional language throughout

8. PERSONALIZED TO ROLE
   - Clearly tailored to this specific job (not generic)
   - Addresses key requirements from JD

9. SPECIFIC EXAMPLES
   - Concrete examples from work history (not vague claims)
   - Backs up assertions with evidence

10. PROFESSIONAL TONE
   - Appropriate formality level
   - Confident but not arrogant

11. COMPANY RESEARCH
   - Shows understanding of company culture/values
   - References company's mission, products, or challenges

${userVoicePrompt ? `12. VOICE ALIGNMENT (MODIFIER)
   - Matches user's preferred tone and style
   - Maintains authenticity while being professional` : ''}

${pmLevel ? `13. LEVEL APPROPRIATENESS (MODIFIER)
   - Language and examples match expected seniority level
   - Demonstrates appropriate scope of impact for level` : ''}

Return ONLY valid JSON with this exact structure:

{
  "criteria": [
    {
      "id": "compelling_opening",
      "label": "Compelling Opening",
      "met": true | false,
      "evidence": "Specific quote or explanation of why it passes/fails",
      "suggestion": "Concrete suggestion for improvement (empty if met)"
    },
    {
      "id": "business_understanding",
      "label": "Understanding of Business/Users",
      "met": true | false,
      "evidence": "...",
      "suggestion": "..."
    },
    {
      "id": "quantified_impact",
      "label": "Quantified Impact",
      "met": true | false,
      "evidence": "...",
      "suggestion": "..."
    },
    {
      "id": "action_verbs",
      "label": "Action Verbs & Ownership",
      "met": true | false,
      "evidence": "...",
      "suggestion": "..."
    },
    {
      "id": "star_format",
      "label": "STAR Format",
      "met": true | false,
      "evidence": "...",
      "suggestion": "..."
    },
    {
      "id": "concise_length",
      "label": "Concise Length",
      "met": true | false,
      "evidence": "...",
      "suggestion": "..."
    },
    {
      "id": "error_free",
      "label": "Error-Free Writing",
      "met": true | false,
      "evidence": "...",
      "suggestion": "..."
    },
    {
      "id": "personalized",
      "label": "Personalized to Role",
      "met": true | false,
      "evidence": "...",
      "suggestion": "..."
    },
    {
      "id": "specific_examples",
      "label": "Specific Examples",
      "met": true | false,
      "evidence": "...",
      "suggestion": "..."
    },
    {
      "id": "professional_tone",
      "label": "Professional Tone",
      "met": true | false,
      "evidence": "...",
      "suggestion": "..."
    },
    {
      "id": "company_research",
      "label": "Company Research",
      "met": true | false,
      "evidence": "...",
      "suggestion": "..."
    }${userVoicePrompt ? `,
    {
      "id": "voice_alignment",
      "label": "Voice Alignment",
      "met": true | false,
      "evidence": "...",
      "suggestion": "..."
    }` : ''}${pmLevel ? `,
    {
      "id": "level_appropriate",
      "label": "Level Appropriateness",
      "met": true | false,
      "evidence": "...",
      "suggestion": "..."
    }` : ''}
  ],
  "overallRating": "strong" | "average" | "weak",
  "summary": "1-2 sentence summary of overall quality and main areas for improvement"
}

Rating Logic:
- "strong": 9+ criteria met (or 11+ if voice/level included)
- "average": 6-8 criteria met (or 8-10 if voice/level included)
- "weak": < 6 criteria met

Be honest and specific. Use direct quotes from the draft when explaining evidence.

Return ONLY the JSON object, no markdown formatting.`;
};
