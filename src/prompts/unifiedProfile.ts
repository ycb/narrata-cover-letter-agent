// LinkedIn-as-spine (interim) — include unmatched resume roles in the same spine
// Phase 1: LLM implementation (to be replaced by code + micro-prompts in Phase 2)
// Inputs: linkedinData (REQUIRED), resumeData (OPTIONAL), coverLetterData (OPTIONAL)
// Assumes resumeData/coverLetterData may contain stories[] already (STAR + metrics + tags)

// Alias for backwards compatibility
export const buildUnifiedProfilePrompt = (
  linkedinData: any,
  resumeData: any = {},
  coverLetterData: any = {}
): string => {
  return buildLinkedInSpineInterimPrompt(linkedinData, resumeData, coverLetterData);
};

export const buildLinkedInSpineInterimPrompt = (
  linkedinData: any,         // REQUIRED: structured LI payload
  resumeData: any = {},      // OPTIONAL: parsed resume (ideally includes stories[])
  coverLetterData: any = {}  // OPTIONAL: parsed CL (ideally includes stories[])
): string => {
  return `
You will construct a WORK HISTORY SPINE using LINKEDIN as the primary source of truth.
Then you will (a) enrich with resume/cover letter details WITHOUT overriding core facts for overlapping roles,
and (b) LINK STORIES to roles. Return ONLY valid JSON. No prose, no markdown.

LINKEDIN (primary / canonical for overlapping facts):
${JSON.stringify(linkedinData, null, 2)}

RESUME (enrichment + stories):
${JSON.stringify(resumeData, null, 2)}

COVER LETTER (enrichment + stories):
${JSON.stringify(coverLetterData, null, 2)}

PRINCIPLES:
- LinkedIn is canonical for overlapping roles (company/title/dates/location/employment type).
- If a RESUME role does NOT overlap/match any LI role by company + time window, INCLUDE IT in the spine (origin="resume") — do NOT discard it.
- Do NOT change LI dates/companies unless a resume date is strictly more precise and fully within the LI range.
- Do NOT hallucinate. Use null and add warnings when uncertain.
- Resume/CL content enriches descriptions and supplies STORIES/METRICS; it should not override LI facts for overlapping roles.

OUTPUT JSON SCHEMA:
{
  "spine": {
    "workHistory": [
      {
        "id": "role_<uuid_or_hash>",
        "origin": "linkedin|resume",                       // source that introduced this role
        "isCanonical": true|false,                         // true for LI-origin; false for resume-origin roles
        "companyDisplay": "Original company label from source",
        "companyCanonical": "Normalized company name (lowercase, stripped suffixes)",
        "titleDisplay": "Original title from source",
        "titleCanonical": "Normalized title (e.g., 'Senior Product Manager')",
        "startDate": "YYYY-MM-DD|null",
        "endDate": "YYYY-MM-DD|null",
        "current": true|false|null,
        "location": "string|null",
        "employmentType": "full-time|contract|intern|part-time|self-employed|null",
        "descriptionCombined": "Concise neutral summary combining source description + any relevant enrichment from the other source(s).",
        "sourceFlags": { "linkedin": true|false, "resume": true|false, "coverLetter": true|false },
        "altClaims": {
          "titleFromOtherSource": "string|null",
          "dateFromOtherSource": { "start": "YYYY-MM-DD|null", "end": "YYYY-MM-DD|null" }
        },
        "conflicts": [
          { "field": "title|date|company|location",
            "linkedin": "value|null",
            "resume": "value|null",
            "decision": "kept_li|used_resume_precision|kept_resume_origin|no_conflict|unresolved" }
        ]
      }
    ]
  },
  "stories": {
    "sourceCounts": { "resume": 0, "coverLetter": 0 },
    "links": [
      {
        "storyId": "story_<hash>",
        "roleId": "role_<...>|null",
        "confidence": 0.0-1.0,
        "rationale": "short",
        "method": "company_match|date_overlap|keyword_similarity|manual_candidate"
      }
    ],
    "unlinked": ["story_<hash>", "..."]
  },
  "metricsIndex": [
    {
      "storyId": "story_<hash>",
      "name": "e.g., MAUs, Revenue, Conversion",
      "value": "number|null",
      "unit": "%|$|users|...|null",
      "direction": "up|down|null",
      "period": "30d|Q1 2024|YoY|null",
      "source": "resume|cover_letter",
      "confidence": 0.0-1.0
    }
  ],
  "warnings": ["strings"],
  "parsingConfidence": 0.0-1.0
}

INSTRUCTIONS:

1) BUILD THE SPINE
- Create one row per LinkedIn role (origin="linkedin", isCanonical=true). Preserve LI sequence.
- Normalize company/title (canonical) but keep display fields from the original source.
- DATES: Use LI dates. Only replace with resume dates if they are strictly more precise AND fully contained within the LI range. Record a conflict with decision="used_resume_precision" when you do so. Otherwise decision="kept_li".
- DESCRIPTION: Start with the source description (LI for LI-origin). Append the most relevant details from resume/CL in 1–3 tight sentences. Avoid fluff.

2) INCLUDE UNMATCHED RESUME ROLES
- If a resume role does not match/overlap any LI role by company + time window, ADD IT to spine.workHistory with origin="resume" and isCanonical=false.
- Keep the resume display fields as-is; normalize into canonical fields as usual.
- Set sourceFlags appropriately and include any conflicts array entries if discrepancies with LI context exist; otherwise mark "no_conflict".

3) LINK STORIES → ROLES
- Collect stories from resumeData.stories and coverLetterData.stories when present. If none, leave arrays empty.
- For each story, link to the most likely roleId using, in order: (a) exact company/product/brand mention, (b) date overlap, (c) title/function similarity/keywords.
- Prefer linking to LI-origin roles (isCanonical=true) when multiple candidates are similar; otherwise choose the best single match. If unsure, set roleId=null with low confidence.
- Record method and a short rationale.

4) METRICS INDEX
- For every metric found in any story, emit a flat metricsIndex record with source and confidence. Do not invent numbers or periods.

5) GUARANTEES
- Be conservative: null + warnings over guesses.
- Keep JSON valid and compact. No markdown, no commentary—JSON only.
`;
};