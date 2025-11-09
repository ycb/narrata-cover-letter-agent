# Auto-Suggest Tags Feature - Product Requirements Document

**Feature:** Auto-Suggest Tags  
**Status:** Draft  
**Date:** 2025-01-31  
**Epic:** Content Tagging & Personalization

---

## Executive Summary

Transform the auto-suggest tags feature from a front-end prototype into a fully functioning, production-ready feature that personalizes tag suggestions based on user goals (industries and business models) and integrates with gap detection to ensure tag alignment with user preferences.

---

## Problem Statement

### Current State
1. **Two Different Modal Implementations**: Auto-suggest tags exist in work history (company and role level) and saved sections, but they use different mock implementations and inconsistent UI patterns.
2. **No Personalization**: Tag suggestions are generic keyword-based matches that don't consider user preferences from "My Goals" (industries and business models).
3. **No Gap Detection Integration**: Tags are not validated against user goals, so users may have work history tagged with industries/business models they haven't expressed interest in.
4. **Mock Implementation**: All tag suggestions use simple keyword matching instead of LLM-powered analysis.

### User Impact
- Users receive generic tag suggestions that don't reflect their career goals
- Work history may be tagged with industries/business models the user doesn't want to work in
- No visibility into tag misalignment with stated preferences
- Inconsistent experience across work history and saved sections

---

## Goals & Success Criteria

### Primary Goals
1. **Unified Tag Suggestion Experience**: Single, consistent modal and service for all tag suggestions (work history companies, work history roles, saved sections)
2. **Personalized Suggestions**: Tag suggestions informed by user preferences from "My Goals" (industries and business models)
3. **Gap Detection Integration**: Detect and flag tag misalignment when work history tags don't match user goals
4. **Production-Ready LLM Integration**: Replace mock keyword matching with real LLM-powered tag suggestions
5. **Company Research Integration**: Use browser search to learn about companies and enhance tag suggestions with real-time information

### Success Criteria
- ✅ Single unified modal used across all tag suggestion contexts
- ✅ Tag suggestions prioritize industries/business models from user goals
- ✅ Gap detection flags tag misalignment when user goals change
- ✅ Tag suggestions use LLM analysis with user context
- ✅ Company tags leverage browser search for accurate, up-to-date information
- ✅ Tags persist to database when user applies them
- ✅ Consistent UX across work history and saved sections

---

## User Stories

### US-1: Unified Tag Suggestion Modal
**As a** user  
**I want** a consistent tag suggestion experience across work history and saved sections  
**So that** I have a predictable, familiar interface for managing tags

**Acceptance Criteria:**
- Single `ContentGenerationModal` component used for all tag suggestions
- Modal shows content being analyzed
- Modal displays suggested tags with confidence indicators
- User can select/deselect tags before applying
- Modal handles loading states gracefully

### US-2: Personalized Tag Suggestions
**As a** user with defined career goals  
**I want** tag suggestions that prioritize my stated industries and business models  
**So that** my work history is tagged with relevant, goal-aligned tags

**Acceptance Criteria:**
- Tag suggestions include industries from "My Goals" when relevant
- Tag suggestions include business models from "My Goals" when relevant
- User goals are passed to LLM as context for tag generation
- Tags are ranked by relevance to user goals

### US-3: Tag Misalignment Gap Detection
**As a** user  
**I want** to be notified when my work history tags don't align with my career goals  
**So that** I can update tags to better reflect my interests

**Acceptance Criteria:**
- Gap detection runs when user updates industries/business models in "My Goals"
- Gaps are created for work history items with tags that don't match user goals
- Gap severity reflects how misaligned tags are (high = completely different industry, medium = related but not preferred, low = minor mismatch)
- Gaps can be resolved by updating tags or updating goals

### US-4: LLM-Powered Tag Suggestions
**As a** user  
**I want** intelligent tag suggestions based on content analysis  
**So that** I receive relevant, contextual tags beyond simple keyword matching

**Acceptance Criteria:**
- Tag suggestions use LLM analysis of content
- LLM considers user goals as context
- Suggestions include confidence levels (high, medium, low)
- Tags are categorized (industry, business model, skill, competency, etc.)

### US-5: Company Research via Browser Search
**As a** user  
**I want** tag suggestions that leverage real-time company information from web search  
**So that** I receive accurate, up-to-date tags even when company description is minimal

**Acceptance Criteria:**
- For company tags, system uses OpenAI to search web and learn about company (industry, business model, size, stage)
- Company information from search is used to enhance tag suggestions
- User sees "Researching company..." progress indicator during search
- If search fails, user sees error message with retry option
- Search results optionally cached in companies table (minimal caching needed)

---

## Technical Requirements

### Architecture

#### 1. Unified Tag Suggestion Service
**File:** `src/services/tagSuggestionService.ts` (new)

**Responsibilities:**
- Generate tag suggestions using LLM
- Incorporate user goals (industries, businessModels) as context
- Return structured tag suggestions with confidence levels
- Handle different content types (company, role, saved section)

**Interface:**
```typescript
interface TagSuggestion {
  id: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
  category?: 'industry' | 'business_model' | 'skill' | 'competency' | 'other';
}

interface TagSuggestionRequest {
  content: string;
  contentType: 'company' | 'role' | 'saved_section';
  userGoals?: {
    industries?: string[];
    businessModels?: string[];
  };
  existingTags?: string[];
}

async function suggestTags(request: TagSuggestionRequest): Promise<TagSuggestion[]>
```

#### 2. Tag Persistence Service
**File:** `src/services/tagService.ts` (new)

**Responsibilities:**
- Update tags in database for companies, work items, saved sections
- Handle tag deduplication
- Validate tag updates

**Methods:**
```typescript
async function updateCompanyTags(companyId: string, tags: string[], userId: string): Promise<void>
async function updateWorkItemTags(workItemId: string, tags: string[], userId: string): Promise<void>
async function updateSavedSectionTags(sectionId: string, tags: string[], userId: string): Promise<void>
```

#### 3. Gap Detection Integration
**File:** `src/services/gapDetectionService.ts` (update)

**New Method:**
```typescript
/**
 * Detect tag misalignment gaps when user goals change
 * Compares work history tags against user's industries and business models
 */
static async detectTagMisalignmentGaps(
  userId: string,
  userGoals: { industries: string[]; businessModels: string[] }
): Promise<Gap[]
```

**Trigger Points:**
- When user updates industries in "My Goals"
- When user updates business models in "My Goals"
- On initial gap detection run (if user has goals set)

#### 4. Modal Consolidation
**File:** `src/components/hil/ContentGenerationModal.tsx` (update)

**Current State:** Already supports `mode='tag-suggestion'` but needs:
- Consistent props interface across all usage contexts
- Better loading states
- Error handling
- Integration with new tag suggestion service

**Update Props:**
```typescript
interface ContentGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'gap-detection' | 'tag-suggestion';
  
  // Tag suggestion mode props
  content?: string;
  contentType?: 'company' | 'role' | 'saved_section';
  entityId?: string; // For persisting tags
  existingTags?: string[];
  suggestedTags?: TagSuggestion[];
  onApplyTags?: (tags: string[]) => void;
  
  // Gap detection mode props (existing)
  gap?: GapAnalysis | null;
  onApplyContent?: (content: string) => void;
}
```

### Database Schema

**Tags Storage** - tags are stored as `TEXT[]` arrays in existing tables:
- `companies.tags`
- `work_items.tags`
- `saved_sections.tags`

**Company Research Cache** - add columns to `companies` table:
```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS research_cache JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS research_cached_at TIMESTAMP WITH TIME ZONE;
```
Note: Caching is optional/minimal since users won't repeatedly request tags for same company.

### LLM Integration

**Prompt File:** `src/prompts/contentTagging.ts` (update)

**Enhancements:**
- Already accepts `userGoals` parameter but needs to be used more effectively
- Add explicit instruction to prioritize user goal industries/business models
- Return structured JSON with confidence levels and categories
- Map industries/business models to relevant role tags (e.g., "Fintech" → "financial products", "B2B SaaS" → "enterprise")
- For company tags, include company research data from browser search in prompt context

**Browser Search Service:**
**File:** `src/services/browserSearchService.ts` (new)

**Responsibilities:**
- Search web for company information using OpenAI (with browser/search capability)
- Extract company details: industry, business model, stage, size, products/services
- Optionally cache results in companies table (minimal caching)
- Handle search failures with user-friendly error messages and retry option

**Interface:**
```typescript
interface CompanyResearchResult {
  companyName: string;
  industry?: string;
  businessModel?: string;
  companyStage?: string; // startup, growth-stage, established, enterprise
  companySize?: string; // small, medium, large, enterprise
  description?: string;
  keyProducts?: string[];
  tags?: string[];
  source?: string; // URL or source of information
  cachedAt?: string;
}

async function researchCompany(companyName: string): Promise<CompanyResearchResult>
```

**Example Prompt Enhancement:**
```typescript
export const buildContentTaggingPrompt = (
  content: string,
  contentType: 'company' | 'role' | 'saved_section',
  userGoals?: { industries?: string[]; businessModels?: string[] }
): string => {
  const userContext = userGoals 
    ? `\n\nUSER PREFERENCES (PRIORITIZE THESE):\n- Industries of interest: ${userGoals.industries?.join(', ') || 'none'}\n- Business models of interest: ${userGoals.businessModels?.join(', ') || 'none'}\n\nWhen suggesting tags, prioritize tags that align with these preferences. If the content relates to these industries/business models, include them as high-confidence tags.`
    : '';
  
  // ... rest of prompt
}
```

### Integration Points

#### 1. Work History - Company Tags
**File:** `src/components/work-history/WorkHistoryDetail.tsx`

**Update:**
- Replace `handleCompanyTagSuggestions` mock with real service call
- Pass user goals from `UserGoalsContext`
- Use unified `ContentGenerationModal` with `mode='tag-suggestion'`
- Persist tags via `tagService.updateCompanyTags()`

#### 2. Work History - Role Tags
**File:** `src/components/work-history/WorkHistoryDetail.tsx`

**Update:**
- Replace `handleTagSuggestions` mock with real service call
- Pass user goals from `UserGoalsContext`
- Use unified `ContentGenerationModal` with `mode='tag-suggestion'`
- Persist tags via `tagService.updateWorkItemTags()`

#### 3. Saved Sections Tags
**File:** `src/pages/SavedSections.tsx`

**Update:**
- Replace `handleTagSuggestions` mock with real service call
- Pass user goals from `UserGoalsContext`
- Use unified `ContentGenerationModal` with `mode='tag-suggestion'`
- Persist tags via `tagService.updateSavedSectionTags()`

#### 4. User Goals Context
**File:** `src/contexts/UserGoalsContext.tsx`

**Update:**
- When industries or businessModels change, trigger gap detection for tag misalignment
- Invalidate tag suggestion cache (if implemented)
- Call `GapDetectionService.detectTagMisalignmentGaps()` after saving goals

---

## Gap Detection Logic

### Tag Misalignment Gap Categories

#### 1. Industry Mismatch
**Category:** `tag_industry_mismatch`  
**Severity:** 
- `high`: Work history tagged with industry completely different from user goals (e.g., user wants "Fintech" but work history tagged "Healthcare")
- `medium`: Work history tagged with related but not preferred industry (e.g., user wants "Fintech" but work history tagged "Banking")
- `low`: Work history tagged with industry not in goals but potentially relevant (e.g., user wants "Fintech" but work history tagged "SaaS")

**Detection Logic:**
```typescript
// For each work item with tags
const workItemTags = workItem.tags || [];
const userIndustries = userGoals.industries || [];

// Check if any tags match user industries
const hasMatchingIndustry = workItemTags.some(tag => 
  userIndustries.some(industry => 
    tag.toLowerCase().includes(industry.toLowerCase()) ||
    industry.toLowerCase().includes(tag.toLowerCase())
  )
);

if (!hasMatchingIndustry && workItemTags.length > 0) {
  // Create gap - severity based on semantic similarity
  // Use LLM to assess similarity if needed
}
```

#### 2. Business Model Mismatch
**Category:** `tag_business_model_mismatch`  
**Severity:**
- `high`: Work history tagged with business model completely different from user goals (e.g., user wants "B2B" but work history tagged "B2C")
- `medium`: Work history tagged with related but not preferred model (e.g., user wants "B2B SaaS" but work history tagged "Marketplace")
- `low`: Work history tagged with model not in goals but potentially relevant

**Detection Logic:**
Similar to industry mismatch, but for business models.

### Gap Resolution

**Resolution Options:**
1. **Update Tags**: User applies suggested tags that align with goals
2. **Update Goals**: User adds industry/business model to goals
3. **User Override**: User dismisses gap (tags are correct, goals may be incomplete)

---

## User Experience Flow

### Tag Suggestion Flow

1. **User clicks "Auto-suggest tags"** on company, role, or saved section
2. **Modal opens** with loading state
3. **Service fetches user goals** from `UserGoalsContext`
4. **LLM analyzes content** with user goals as context
5. **Suggested tags displayed** with confidence indicators
6. **User selects/deselects tags**
7. **User clicks "Apply X selected tags"**
8. **Tags persist to database**
9. **Modal closes, UI updates with new tags**

### Gap Detection Flow

1. **User updates industries/business models** in "My Goals"
2. **User saves goals**
3. **Gap detection service runs** `detectTagMisalignmentGaps()`
4. **Gaps created** for misaligned work history items
5. **Gaps displayed** in work history UI (existing gap warning system)
6. **User resolves gaps** by updating tags or goals

---

## Edge Cases & Error Handling

### Edge Cases
1. **No User Goals Set**: Tag suggestions work without personalization, fall back to generic suggestions
2. **Empty Content**: Show error message, don't call LLM
3. **LLM Failure**: Show error message with retry button
4. **Browser Search Failure**: Show error message with retry button, fallback to content-only analysis
5. **Network Failure**: Show error message, allow retry
6. **Duplicate Tags**: Service handles deduplication before persisting
7. **Tag Limit**: Consider max tag limit (e.g., 10 tags per entity)

### Error Handling
- All LLM calls wrapped in try-catch
- Browser search failures show user-friendly error with retry option
- User can retry failed searches from modal
- Fallback to content-only tag suggestions if browser search fails
- Retry mechanism for transient failures

---

## Performance Considerations

1. **Caching**: Consider caching tag suggestions for same content (with user goals as cache key)
2. **Debouncing**: Debounce tag suggestion requests if user types quickly
3. **Loading States**: Show loading indicators during LLM calls
4. **Batch Operations**: When detecting tag misalignment gaps, batch database operations

---

## Testing Requirements

### Unit Tests
- `tagSuggestionService.suggestTags()` with various content types
- `tagSuggestionService.suggestTags()` with/without user goals
- `tagService.updateCompanyTags()` persistence
- `gapDetectionService.detectTagMisalignmentGaps()` logic

### Integration Tests
- End-to-end tag suggestion flow (work history company)
- End-to-end tag suggestion flow (work history role)
- End-to-end tag suggestion flow (saved section)
- Gap detection trigger on goals update
- Tag persistence and UI update

### Manual Testing
- Test with various user goal combinations
- Test with empty user goals
- Test with content that doesn't match user goals
- Test error scenarios (LLM failure, network failure)

---

## Dependencies

1. **User Goals Context**: Must be available and loaded
2. **LLM Service**: `LLMAnalysisService` or similar for tag generation
3. **Database**: Supabase client for tag persistence
4. **Gap Detection Service**: Existing service, needs enhancement

---

## Future Enhancements

1. **Tag Suggestions from Job Descriptions**: When drafting cover letters, suggest tags based on job description
2. **Tag Analytics**: Track which tags are most used, which lead to interviews
3. **Tag Recommendations**: Suggest tags based on similar users' work history
4. **Bulk Tag Operations**: Apply tags to multiple work items at once
5. **Tag Categories UI**: Group tags by category (industry, business model, skill) in UI

---

## Open Questions

1. **Tag Limit**: Should there be a maximum number of tags per entity? (Suggested: 10)
2. **Confidence Threshold**: Should we only show high-confidence tags by default? (Suggested: Show all, let user filter)
3. **Gap Severity Algorithm**: How to determine severity of tag misalignment? (Suggested: Use LLM to assess semantic similarity)
4. **Tag Caching**: Should we cache tag suggestions? (Suggested: Yes, with user goals as cache key)
5. **Tag Validation**: Should we validate tags against a predefined list? (Suggested: No, allow free-form tags)
**Decisions Made:**
- **Browser Search Service**: Use OpenAI (already in use)
- **Company Research Caching**: Minimal caching - users won't repeatedly request tags for same company
- **Search Scope**: Company tags only (MVP), expand to role tags later
- **Search Failure Handling**: Show user error with retry option
- **Search UI Feedback**: Show "Researching company..." progress indicator
- **Database Caching**: Add `research_cache` and `research_cached_at` columns to `companies` table

---

## Acceptance Checklist

- [ ] Unified `ContentGenerationModal` used for all tag suggestions
- [ ] `tagSuggestionService` implemented with LLM integration
- [ ] User goals (industries, businessModels) passed to tag suggestion service
- [ ] Tags persist to database when user applies them
- [ ] Gap detection runs when user goals change
- [ ] Tag misalignment gaps created and displayed
- [ ] Consistent UX across work history and saved sections
- [ ] Error handling for LLM failures
- [ ] Loading states during tag generation
- [ ] Unit tests for core services
- [ ] Integration tests for end-to-end flows

---

## Appendix

### Related Documents
- `docs/implementation/HUMAN_IN_LOOP_CONTENT_GENERATION_PRD.md` - Content generation feature
- `docs/implementation/GAP_DETECTION_PROMPTS.md` - Gap detection prompts
- `src/prompts/contentTagging.ts` - Existing tag prompt (needs enhancement)

### Related Code
- `src/components/hil/ContentGenerationModal.tsx` - Modal component
- `src/components/work-history/WorkHistoryDetail.tsx` - Work history tag usage
- `src/pages/SavedSections.tsx` - Saved sections tag usage
- `src/contexts/UserGoalsContext.tsx` - User goals context
- `src/services/gapDetectionService.ts` - Gap detection service

