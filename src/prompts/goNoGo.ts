/**
 * Go/No-Go Analysis Prompts
 *
 * Analyzes job fit based on user profile and job requirements
 * to determine if the user should apply to the position.
 */

export interface UserProfileContext {
  preferredLocations?: string[];
  openToRelocation?: boolean;
  minimumSalary?: number;
  yearsOfExperience?: number;
  coreSkills?: string[];
  industries?: string[];
  workType?: 'remote' | 'hybrid' | 'onsite' | 'any';
}

export const buildGoNoGoAnalysisPrompt = (
  jobDescription: string,
  userProfile: UserProfileContext
): string => {
  return `You are an expert career advisor analyzing job fit for a candidate.

Your goal: Determine if this candidate should apply to this position based on key compatibility factors.

**Job Description**:
${jobDescription}

**Candidate Profile**:
${userProfile.preferredLocations && userProfile.preferredLocations.length > 0 ? `- Preferred Locations: ${userProfile.preferredLocations.join(', ')}` : ''}
${userProfile.openToRelocation !== undefined ? `- Open to Relocation: ${userProfile.openToRelocation ? 'Yes' : 'No'}` : ''}
${userProfile.minimumSalary ? `- Minimum Salary: $${userProfile.minimumSalary.toLocaleString()}` : ''}
${userProfile.yearsOfExperience ? `- Years of Experience: ${userProfile.yearsOfExperience}` : ''}
${userProfile.coreSkills && userProfile.coreSkills.length > 0 ? `- Core Skills: ${userProfile.coreSkills.join(', ')}` : ''}
${userProfile.industries && userProfile.industries.length > 0 ? `- Industries: ${userProfile.industries.join(', ')}` : ''}
${userProfile.workType ? `- Work Type Preference: ${userProfile.workType}` : ''}

Return ONLY valid JSON with this exact structure. ALL FIELDS ARE REQUIRED:

{
  "decision": "go" | "no-go",
  "confidence": 85,
  "mismatches": [
    {
      "type": "geography" | "pay" | "core-requirements" | "work-history",
      "severity": "high" | "medium" | "low",
      "description": "Specific description of the mismatch"
    }
  ]
}

**Analysis Framework**:

1. GEOGRAPHY MISMATCH (type: "geography"):
   - Check if job location matches candidate's preferred locations
   - Check work type: remote/hybrid/onsite vs candidate preference
   - Severity: HIGH if mismatch and candidate not open to relocation
   - Example: "Job requires onsite work in San Francisco, but candidate prefers remote work and is not open to relocation"

2. PAY MISMATCH (type: "pay"):
   - Check if salary range (if mentioned) meets candidate's minimum
   - Severity: HIGH if salary is below minimum by >20%, MEDIUM if 10-20% below
   - Example: "Salary range ($80,000-$100,000) is below candidate's minimum of $120,000"

3. CORE REQUIREMENTS MISMATCH (type: "core-requirements"):
   - Check if candidate has required skills/qualifications
   - Look for "must-have", "required", "essential" keywords
   - Severity: HIGH if missing 2+ core requirements, MEDIUM if missing 1
   - Example: "Position requires 5+ years of Python experience, but candidate's core skills are in JavaScript/TypeScript"

4. WORK HISTORY MISMATCH (type: "work-history"):
   - Check years of experience required vs candidate's experience
   - Check industry fit
   - Severity: HIGH if experience gap >3 years, MEDIUM if 1-3 years
   - Example: "Position requires 10+ years of experience for principal role, but candidate has 5 years"

**Decision Logic**:
- "no-go" if ANY high-severity mismatches exist
- "go" if zero high-severity mismatches (medium/low are acceptable)
- Confidence: 100 - (15 * number of mismatches), minimum 50

**Edge Cases**:
- If job description is unclear about requirements, assume "go" with medium confidence
- If salary not mentioned, DO NOT add pay mismatch
- If location is "remote" or "anywhere", geography is always a match
- "Nice to have" requirements should NOT be treated as mismatches

CRITICAL:
- Return ONLY the JSON object
- No markdown formatting
- No explanations
- Empty mismatches array if no mismatches found
- Be conservative: only flag clear, significant mismatches`;
};
