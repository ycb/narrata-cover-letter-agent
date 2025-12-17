# Cover Letter Template Architecture Specification
**Version:** 1.0  
**Status:** DESIGN SPEC (Not Yet Implemented)  
**Target Implementation:** Phase 2  
**Related:** QA Audit Issue 3.2

---

## Purpose

Define the canonical structure for cover letter templates and specify how `generateDraft()` should assemble templates from saved sections and LLM-generated content.

**Current State:** Templates are created during onboarding but NOT used for draft generation.  
**Target State:** `generateDraft()` assembles drafts from template sections, mixing static saved content with dynamic LLM-generated sections.

---

## 1. Section Type Enum (Canonical)

**File:** `src/types/coverLetterSections.ts` (NEW FILE)

```typescript
/**
 * Canonical section types for cover letter templates
 * Centralized to prevent "intro vs Intro vs INTRO" bugs
 */
export const SECTION_TYPES = {
  INTRO: 'intro',
  PARAGRAPH: 'paragraph',
  CLOSER: 'closer',
  SIGNATURE: 'signature',
} as const;

export type SectionType = typeof SECTION_TYPES[keyof typeof SECTION_TYPES];

/**
 * Type guards for section type validation
 */
export function isSectionType(value: unknown): value is SectionType {
  return typeof value === 'string' && Object.values(SECTION_TYPES).includes(value as SectionType);
}

export function assertSectionType(value: unknown): asserts value is SectionType {
  if (!isSectionType(value)) {
    throw new Error(`Invalid section type: ${value}. Expected one of: ${Object.values(SECTION_TYPES).join(', ')}`);
  }
}
```

**Migration:**
- Replace all ad-hoc `'intro' | 'paragraph' | 'closer' | 'signature'` unions
- Use `SECTION_TYPES` constants instead of string literals
- Apply type guards when parsing from database

---

## 2. Template Section Structure

### Database Schema (Already Exists)

**Table:** `cover_letter_templates`

```sql
CREATE TABLE cover_letter_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  sections JSONB NOT NULL, -- Array of TemplateSection objects
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### TypeScript Schema

**File:** `src/services/coverLetterTemplateService.ts` (Already exists, needs clarification)

```typescript
export interface TemplateSection {
  // Unique ID for this section within the template
  id: string; // e.g., "intro-1", "paragraph-2", "closer-1"
  
  // Section type (from canonical enum)
  type: SectionType; // 'intro' | 'paragraph' | 'closer' | 'signature'
  
  // Display title for template builder UI
  title?: string; // e.g., "Introduction", "Body Paragraph 1", "Closing"
  
  // Is this section static (from saved_sections) or dynamic (LLM-generated)?
  isStatic: boolean;
  
  // FOR STATIC SECTIONS ONLY:
  staticContent?: string; // Full text content from saved_sections
  savedSectionId?: string; // UUID reference to saved_sections.id
  
  // FOR DYNAMIC SECTIONS ONLY:
  blurbCriteria?: {
    goals: string[]; // e.g., ["showcase technical leadership", "emphasize B2B experience"]
    // Future: Add more criteria (industry, seniority, etc.)
  };
  
  // Section order in final letter (1-based)
  order: number;
}

export interface CoverLetterTemplate {
  id: string;
  name: string;
  sections: TemplateSection[];
  createdAt: string;
  updatedAt: string;
}
```

### Validation Rules

1. **ID Uniqueness:** All `section.id` values must be unique within a template
2. **Order Continuity:** `section.order` values should be sequential (1, 2, 3, ...) with no gaps
3. **Type Constraints:**
   - `intro` and `closer` types should appear at most once each
   - `paragraph` can appear multiple times
   - `signature` is optional, typically merged into `closer`
4. **Static Section Rules:**
   - If `isStatic === true`: MUST have `staticContent` OR `savedSectionId`
   - If `savedSectionId` present: Should load content from `saved_sections` table
   - If only `staticContent`: Content is inlined (for uploaded templates)
5. **Dynamic Section Rules:**
   - If `isStatic === false`: SHOULD have `blurbCriteria`
   - If no criteria: Use default goal `["showcase relevant experience"]`

---

## 3. Draft Generation Flow (Specification)

### Current Implementation (WRONG)

**File:** `src/services/coverLetterDraftService.ts:generateDraft()`

**Current Behavior:**
```typescript
generateDraft(input: { templateId, jobDescriptionId }) {
  // 1. Fetch template from DB
  const template = await fetchTemplate(templateId);
  
  // 2. IGNORE template.sections ❌
  
  // 3. Generate entire draft via LLM from scratch
  const draft = await llm.generate({
    jd: jobDescription,
    resume: userResume,
    stories: userStories
  });
  
  // 4. Return LLM-generated draft (no template assembly)
  return draft;
}
```

**Problem:** Templates created during onboarding are never used.

---

### Target Implementation (CORRECT)

**File:** `src/services/coverLetterDraftService.ts:generateDraft()`

**Target Behavior:**
```typescript
async generateDraft(input: {
  templateId: string;
  jobDescriptionId: string;
  userId: string;
}): Promise<CoverLetterDraft> {
  // 1. Load template
  const template = await CoverLetterTemplateService.getTemplate(input.templateId);
  
  // 2. Load job description
  const jd = await JobDescriptionService.getJobDescription(input.jobDescriptionId);
  
  // 3. Load user context (resume, stories, goals)
  const userContext = await this.loadUserContext(input.userId);
  
  // 4. Process each template section in order
  const draftSections: CoverLetterDraftSection[] = [];
  
  for (const templateSection of template.sections.sort((a, b) => a.order - b.order)) {
    if (templateSection.isStatic) {
      // STATIC: Load from saved_sections or use inline content
      const content = await this.resolveStaticSection(templateSection);
      
      draftSections.push({
        id: templateSection.id,
        slug: templateSection.type,
        type: templateSection.type,
        title: templateSection.title || this.getDefaultTitle(templateSection.type),
        content: content,
        order: templateSection.order,
        metadata: {
          source: 'template',
          savedSectionId: templateSection.savedSectionId,
          isStatic: true,
        },
      });
    } else {
      // DYNAMIC: Generate via LLM using blurbCriteria
      const content = await this.generateDynamicSection({
        type: templateSection.type,
        criteria: templateSection.blurbCriteria,
        jd: jd,
        userContext: userContext,
      });
      
      draftSections.push({
        id: templateSection.id,
        slug: templateSection.type,
        type: templateSection.type,
        title: templateSection.title || this.getDefaultTitle(templateSection.type),
        content: content,
        order: templateSection.order,
        metadata: {
          source: 'llm',
          criteria: templateSection.blurbCriteria,
          isStatic: false,
        },
      });
    }
  }
  
  // 5. Persist draft to database
  const draft = await this.saveDraft({
    userId: input.userId,
    templateId: input.templateId,
    jobDescriptionId: input.jobDescriptionId,
    sections: draftSections,
  });
  
  return draft;
}
```

---

### Helper Methods (To Implement)

#### `resolveStaticSection(templateSection: TemplateSection): Promise<string>`

```typescript
/**
 * Resolve static section content from saved_sections table or inline content
 */
private async resolveStaticSection(templateSection: TemplateSection): Promise<string> {
  // Priority 1: Load from saved_sections table
  if (templateSection.savedSectionId) {
    const savedSection = await this.supabase
      .from('saved_sections')
      .select('content')
      .eq('id', templateSection.savedSectionId)
      .single();
    
    if (savedSection.data) {
      return savedSection.data.content;
    }
    
    // Fallback to inline content if DB lookup fails
    if (templateSection.staticContent) {
      console.warn(`[Template] savedSectionId ${templateSection.savedSectionId} not found, using inline content`);
      return templateSection.staticContent;
    }
    
    throw new Error(`Static section ${templateSection.id} has no content`);
  }
  
  // Priority 2: Use inline static content
  if (templateSection.staticContent) {
    return templateSection.staticContent;
  }
  
  throw new Error(`Static section ${templateSection.id} missing both savedSectionId and staticContent`);
}
```

#### `generateDynamicSection(params): Promise<string>`

```typescript
/**
 * Generate section content via LLM using criteria + JD + user context
 */
private async generateDynamicSection(params: {
  type: SectionType;
  criteria?: { goals: string[] };
  jd: ParsedJobDescription;
  userContext: UserContext;
}): Promise<string> {
  const { type, criteria, jd, userContext } = params;
  
  // Build LLM prompt based on section type and criteria
  const prompt = this.buildSectionPrompt({
    sectionType: type,
    goals: criteria?.goals || ['showcase relevant experience'],
    jobDescription: jd,
    resume: userContext.resume,
    stories: userContext.stories,
    userGoals: userContext.goals,
  });
  
  // Call LLM
  const response = await this.llm.generate({
    systemPrompt: SECTION_GENERATION_SYSTEM_PROMPT,
    userPrompt: prompt,
    maxTokens: this.getSectionTokenLimit(type),
    temperature: 0.7,
  });
  
  return response.content;
}
```

#### `buildSectionPrompt(params): string`

```typescript
/**
 * Build section-specific LLM prompt
 */
private buildSectionPrompt(params: {
  sectionType: SectionType;
  goals: string[];
  jobDescription: ParsedJobDescription;
  resume: string;
  stories: Array<{ title: string; content: string }>;
  userGoals: UserGoals | null;
}): string {
  const { sectionType, goals, jobDescription, resume, stories, userGoals } = params;
  
  switch (sectionType) {
    case 'intro':
      return `Write a compelling cover letter introduction for this job:
      
Company: ${jobDescription.company}
Role: ${jobDescription.role}
Summary: ${jobDescription.summary}

User Background:
${resume}

Goals for this section:
${goals.map(g => `- ${g}`).join('\n')}

Requirements:
- Open with a strong hook referencing the company/role
- Mention relevant seniority markers
- Preview key achievements (with metrics if possible)
- Show enthusiasm and company/mission alignment
- Keep to 3-4 sentences`;

    case 'paragraph':
      return `Write a body paragraph for this cover letter:

Job Requirements:
${jobDescription.standardRequirements.map(r => `- ${r}`).join('\n')}

Relevant Stories:
${stories.map(s => `${s.title}: ${s.content}`).join('\n\n')}

Goals for this paragraph:
${goals.map(g => `- ${g}`).join('\n')}

Requirements:
- Focus on 1-2 specific achievements that match job requirements
- Include concrete metrics and outcomes
- Use strong action verbs
- Tie achievements to job requirements
- Keep to 4-6 sentences`;

    case 'closer':
      return `Write a professional closing paragraph:

Company: ${jobDescription.company}
Role: ${jobDescription.role}

User Goals: ${userGoals?.careerGoals.join(', ') || 'Career growth'}

Requirements:
- Reiterate enthusiasm for the role
- Mention fit with company mission/culture
- Include clear call-to-action (interview request)
- Professional but warm tone
- Keep to 2-3 sentences`;

    case 'signature':
      return `Generate a professional sign-off:

Requirements:
- Use "Sincerely," or "Best regards,"
- Include user's full name
- Keep minimal and professional`;

    default:
      throw new Error(`Unknown section type: ${sectionType}`);
  }
}
```

---

## 4. Section Ordering & Assembly

### Rules

1. **Order Field:** Template sections MUST be assembled in `order` sequence (1, 2, 3, ...)
2. **Type Ordering Convention:**
   - `intro` first (order: 1)
   - `paragraph` sections middle (order: 2, 3, 4, ...)
   - `closer` near end (order: N-1)
   - `signature` last (order: N), typically merged into `closer`
3. **Signature Merging:** If `signature` section exists, append to `closer` section content
4. **Gap Handling:** If order numbers have gaps (1, 2, 5, 7), preserve gaps or re-normalize?
   - **Recommendation:** Re-normalize to sequential (1, 2, 3, 4) during assembly

---

## 5. Integration Points

### Database Tables

**Already Exist:**
- `cover_letter_templates` - Template definitions
- `saved_sections` - Static section library
- `cover_letters` - Generated drafts
- `cover_letter_workpads` - Draft edit history

**No Schema Changes Needed**

---

### Service Methods

**Update Required:**
- `CoverLetterDraftService.generateDraft()` - Implement template assembly logic
- `CoverLetterTemplateService.getTemplate()` - Already exists ✅
- `CoverLetterTemplateService.getUserSavedSections()` - Already exists ✅

**New Methods:**
- `CoverLetterDraftService.resolveStaticSection()` - Load saved section content
- `CoverLetterDraftService.generateDynamicSection()` - LLM generation for criteria
- `CoverLetterDraftService.buildSectionPrompt()` - Section-specific prompts

---

### Frontend Components

**Update Required:**
- `CoverLetterModal.tsx` - Calls `generateDraft()` (no changes needed)
- `SavedSections.tsx` - Already displays saved sections ✅

**No Changes Needed:**
- Template selection UI already exists
- Draft editor already handles sections

---

## 6. Example Template Structure

### Scenario: User Uploaded Cover Letter During Onboarding

**Input:** User uploads `cover_letter_p01.txt` with:
- Opening paragraph (intro)
- 2 achievement paragraphs (story-based)
- Closing paragraph (closer)
- Signature line

**Generated Template:**

```json
{
  "id": "tmpl-123",
  "name": "Professional Template",
  "sections": [
    {
      "id": "intro-1",
      "type": "intro",
      "title": "Introduction",
      "isStatic": true,
      "staticContent": "As a seasoned Product Manager...",
      "savedSectionId": "saved-456",
      "order": 1
    },
    {
      "id": "paragraph-1",
      "type": "paragraph",
      "title": "Body Paragraph 1",
      "isStatic": false,
      "blurbCriteria": {
        "goals": ["showcase technical leadership", "emphasize B2B experience"]
      },
      "order": 2
    },
    {
      "id": "paragraph-2",
      "type": "paragraph",
      "title": "Body Paragraph 2",
      "isStatic": false,
      "blurbCriteria": {
        "goals": ["highlight product-market fit experience", "demonstrate metrics-driven mindset"]
      },
      "order": 3
    },
    {
      "id": "closer-1",
      "type": "closer",
      "title": "Closing",
      "isStatic": true,
      "staticContent": "I'm excited to discuss...\n\nSincerely,\nJohn Doe",
      "savedSectionId": "saved-789",
      "order": 4
    }
  ]
}
```

**Draft Generation:**
1. Section 1 (intro): Load content from `saved_sections.id = saved-456`
2. Section 2 (paragraph): Generate via LLM using criteria + JD
3. Section 3 (paragraph): Generate via LLM using different criteria + JD
4. Section 4 (closer): Load content from `saved_sections.id = saved-789`

**Final Draft:**
```
As a seasoned Product Manager... [static]

[LLM-generated paragraph 1 based on JD + criteria 1]

[LLM-generated paragraph 2 based on JD + criteria 2]

I'm excited to discuss...

Sincerely,
John Doe [static]
```

---

## 7. Testing Strategy

### Unit Tests

**File:** `src/services/__tests__/coverLetterDraftService.test.ts` (Update existing)

**Test Cases:**

```typescript
describe('CoverLetterDraftService.generateDraft (Template-Based)', () => {
  it('should assemble draft from all-static template', async () => {
    // Template with only static sections
    // Verify: All content loaded from saved_sections
    // Verify: No LLM calls
  });
  
  it('should assemble draft from mixed static + dynamic template', async () => {
    // Template with 2 static, 2 dynamic sections
    // Verify: Static content loaded correctly
    // Verify: LLM called for dynamic sections
    // Verify: Correct order preservation
  });
  
  it('should generate draft with only dynamic sections', async () => {
    // Template with no static sections (all LLM-generated)
    // Verify: All sections generated via LLM
  });
  
  it('should handle savedSectionId lookup failure gracefully', async () => {
    // savedSectionId points to deleted section
    // Verify: Falls back to inline staticContent
    // Verify: Logs warning
  });
  
  it('should use default goal when blurbCriteria is missing', async () => {
    // Dynamic section with no criteria
    // Verify: Uses ["showcase relevant experience"] as default
  });
  
  it('should preserve section order correctly', async () => {
    // Template with order: [1, 3, 5, 7] (gaps)
    // Verify: Sections assembled in correct order
    // Verify: Order normalized to [1, 2, 3, 4]
  });
});
```

### Integration Tests

**File:** `tests/template-draft-generation.integration.test.ts` (NEW)

**Test Scenarios:**
1. End-to-end: Upload cover letter → Create template → Generate draft for new JD
2. Verify: Static sections remain identical across different JDs
3. Verify: Dynamic sections change based on JD content

---

## 8. Migration Path

### Phase 1: Preparation (Current)
- ✅ Create this spec document
- ✅ Review with team
- ✅ Identify edge cases

### Phase 2: Implementation
1. Create `src/types/coverLetterSections.ts` (centralized enum)
2. Implement helper methods:
   - `resolveStaticSection()`
   - `generateDynamicSection()`
   - `buildSectionPrompt()`
3. Refactor `generateDraft()` to use template assembly logic
4. Update tests

### Phase 3: Validation
1. Run test suite (should be green)
2. Manual QA: Upload cover letter → Generate draft
3. Compare: Template-based draft vs. old LLM-only draft
4. Evaluate quality in eval dashboard

### Phase 4: Rollout
1. Feature flag: `ENABLE_TEMPLATE_BASED_DRAFTS`
2. A/B test: Template-based vs. LLM-only
3. Monitor metrics: Draft quality, user edits, finalization rate
4. Full rollout if metrics improve

---

## 9. Open Questions / Edge Cases

### Q1: What if savedSectionId is deleted but staticContent exists?
**Answer:** Use staticContent as fallback, log warning

### Q2: What if template has no sections?
**Answer:** Throw error, require at least 1 section

### Q3: Should we re-normalize order gaps (1, 3, 5 → 1, 2, 3)?
**Answer:** YES - Re-normalize for consistent display

### Q4: Can users edit template sections after creation?
**Answer:** Phase 2 feature - Allow editing sections, criteria, and order

### Q5: Should signature always merge into closer?
**Answer:** YES - Signature is typically part of closing paragraph

### Q6: How do we handle template sections with outdated saved_sections?
**Answer:** 
- Option 1: Show warning in UI, allow user to update
- Option 2: Regenerate via LLM if saved section is flagged as "stale"
- **Recommendation:** Option 1 for MVP, Option 2 for future enhancement

---

## 10. Success Metrics

**Implementation Complete When:**
1. ✅ `generateDraft()` uses `template.sections` instead of full LLM generation
2. ✅ All tests passing (unit + integration)
3. ✅ Manual QA confirms static sections preserved correctly
4. ✅ Manual QA confirms dynamic sections generated correctly

**Feature Success When:**
1. ✅ Draft quality metrics (eval dashboard) equal or better than LLM-only
2. ✅ User edit rate on template-based drafts ≤ LLM-only drafts
3. ✅ Draft finalization rate (draft → sent) ≥ LLM-only baseline

---

## 11. Related Documentation

- **QA Audit Report:** `/docs/qa/COMPREHENSIVE_QA_AUDIT_REPORT.md` (Issue 3.2)
- **Template Service:** `src/services/coverLetterTemplateService.ts`
- **Draft Service:** `src/services/coverLetterDraftService.ts`
- **Job Stages Reference:** `/docs/architecture/JOB_STAGES_REFERENCE.md`
- **Section Gap Heuristics:** `src/lib/coverLetters/sectionGapHeuristics.ts`

---

**Spec Version:** 1.0  
**Last Updated:** December 4, 2025  
**Next Review:** After Phase 2 implementation











