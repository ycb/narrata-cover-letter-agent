# Tag Extraction Consolidation Plan

## Current State

### Onboarding Tag Extraction
- **Resume**: `resumeAnalysis.ts` extracts `roleTags` from resume text
- **Cover Letter**: `coverLetterAnalysis.ts` extracts stories but doesn't update role tags
- **Separate Calls**: Resume and cover letter are analyzed separately
- **Result**: Role tags only come from resume, missing cover letter context

### Manual Auto-Tag Feature
- **Role-level**: User clicks "Auto-suggest tags" button
- **Source**: Role description + stories + links
- **Purpose**: Refinement after initial upload
- **Issue**: Sends same data to LLM again (inefficient)

### New Content (Gap-Driven)
- **Stories**: Created to address specific gaps
- **Saved Sections**: Created to address specific gaps
- **Current**: No auto-tagging on creation
- **Opportunity**: Auto-tag based on gap context + new content

## Proposed Changes

### 1. Enhance Onboarding Tag Extraction

**Update `resumeAnalysis.ts` to accept cover letter context:**

```typescript
export const buildResumeAnalysisPrompt = (
  resumeText: string,
  coverLetterText?: string  // NEW: Optional cover letter context
): string => {
  return `
You are analyzing a resume${coverLetterText ? ' and cover letter' : ''} to extract structured data.

Resume Text:
${resumeText}

${coverLetterText ? `Cover Letter Text:
${coverLetterText}

IMPORTANT: Use cover letter content to enhance role tag extraction.
Cover letters often expand on resume achievements with more detail.
When extracting roleTags, consider both resume bullets AND cover letter stories that reference each role.
` : ''}

// ... rest of prompt
```

**Benefits:**
- Single LLM call for resume + cover letter
- Role tags reflect both resume and cover letter context
- More accurate tags from richer context
- No redundant API calls

### 2. Remove Role-Level Auto-Tag Feature

**Rationale:**
- Tags already extracted during onboarding (resume + cover letter)
- Manual "auto-suggest tags" sends same data to LLM again
- Redundant and inefficient
- User can manually edit tags if needed

**Action:**
- Remove "Auto-suggest tags" button from role level
- Keep company-level auto-tag (needs web search)
- Keep story-level auto-tag (new content)
- Keep saved-section auto-tag (new content)

### 3. Auto-Tag New Content Based on Gap Context

**When creating stories/saved sections to address gaps:**

```typescript
// When user creates content to address a gap
const createStoryWithAutoTags = async (
  content: string,
  gap: GapAnalysis,
  roleId: string
) => {
  // Auto-tag based on:
  // 1. Gap context (what gap is being addressed)
  // 2. New content itself
  const tags = await TagSuggestionService.suggestTags({
    content: `${gap.description}\n\nNew content addressing this gap:\n${content}`,
    contentType: 'role', // or 'saved_section'
    userGoals: goals,
    gapContext: {
      gapCategory: gap.gap_category,
      gapType: gap.gap_type,
      suggestions: gap.suggestions
    }
  });
  
  // Create story with auto-generated tags
  // ...
};
```

**Benefits:**
- Tags reflect the gap being addressed
- Tags reflect the new content
- Automatic (no manual step)
- Context-aware tagging

## Implementation Plan

### Phase 1: Enhance Onboarding
1. Update `buildResumeAnalysisPrompt` to accept optional cover letter
2. Update `FileUploadService` to pass cover letter when available
3. Test combined extraction

### Phase 2: Remove Redundant Feature
1. Remove role-level "Auto-suggest tags" button
2. Keep company-level (needs web search)
3. Update UI to remove button

### Phase 3: Auto-Tag New Content
1. Add gap context to tag suggestion service
2. Auto-tag when creating stories from gaps
3. Auto-tag when creating saved sections from gaps
4. Update prompts to consider gap context

## Questions to Consider

1. **What if user uploads cover letter later?**
   - Re-run tag extraction with cover letter?
   - Or keep manual edit option?

2. **What if user wants to refine tags?**
   - Keep manual edit capability
   - Remove auto-suggest, but allow manual tag editing

3. **Gap context in prompts:**
   - Should gap category influence tag suggestions?
   - E.g., "missing_metrics" gap → suggest metric-related tags?

## Recommendation

**Yes, remove role-level auto-tag feature** because:
- Tags already extracted during onboarding (resume + cover letter)
- Sending same data to LLM again is wasteful
- User can manually edit tags if needed
- Focus auto-tag on new content (stories, saved sections) where it adds value

