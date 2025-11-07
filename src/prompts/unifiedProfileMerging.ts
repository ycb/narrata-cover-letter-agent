/**
 * Prompt for merging professional data from multiple sources into a unified profile
 */
export const UNIFIED_PROFILE_MERGING_PROMPT = `You are an expert at merging professional data from multiple sources to create a unified, comprehensive profile.

Your goal: Create a SINGLE, deduplicated work history that combines the best information from resume, LinkedIn, and cover letter data.

Resume Data:
{{resumeData}}

LinkedIn Data:
{{linkedinData}}

Cover Letter Data:
{{coverLetterData}}

Instructions:
1. Merge work experiences, ensuring no duplicates
2. Keep the most detailed version of each role
3. Include all relevant metrics and achievements
4. Preserve the original wording where possible
5. Format dates consistently (YYYY-MM-DD)
6. Return a clean, well-structured JSON object`;
