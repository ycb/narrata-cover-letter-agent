# PRD: Human-in-the-Loop Content Generation MVP

**Status**: Draft
**Author**: Claude Code
**Date**: November 6, 2025
**Epic**: Phase 4 - AI-Assisted Content Creation

---

## Executive Summary

Transform the prototype "Generate Content" modal from a mock UI into a fully functional, LLM-powered content creation system that helps users address content quality gaps across all entity types (stories, work items, saved sections, and cover letter drafts). This feature enables users to iteratively improve their content library with AI assistance while maintaining full human control and ensuring zero hallucinations through gap-aware validation.

**Key Success Metrics**:
- 80%+ of generated content passes gap detection on first try
- Users create 3+ content variations per story on average
- 60%+ gap resolution rate within first generation attempt
- Zero hallucinated content (100% grounded in user's work history)

---

## Background & Context

### Current State

**Prototype Implementation** (`ContentGenerationModal.tsx`):
- ✅ UI/UX complete with gap context display
- ✅ Mock content generation with paragraph-specific templates
- ✅ Regenerate and Apply actions
- ❌ **No real LLM integration** - uses hardcoded mock responses
- ❌ **No gap validation** - doesn't verify if generated content addresses gaps
- ❌ **No database persistence** - doesn't save generated content or link to gaps
- ❌ **Limited to prototype gaps** - not integrated with real gap detection service

**Gap Detection Service** (`gapDetectionService.ts`):
- ✅ Detects 3 gap types: Story Completeness, Missing Metrics, Generic Content
- ✅ Supports entity types: `work_item`, `approved_content`, `saved_section`
- ✅ `resolveGap()` function marks gaps resolved with reason tracking
- ✅ Bidirectional linking: `gaps.addressing_content_ids` ↔ `approved_content.addressed_gap_id`
- ⚠️ **Does NOT support `cover_letter_drafts`** (needs schema extension)

**Business Context** (from `NARRATA_BUSINESS_CONTEXT_COMPREHENSIVE.md`):
- **Vision**: Human-in-the-loop, narrative-focused AI agent with semi-structured autonomy
- **Core Principles**: Human Control + Truth Fidelity + Narrative Strategy
- **Positioning**: "Zero fluff, no hallucinations, full control"
- **User Workflow**: Build reusable story library → Match to jobs → Generate cover letters

### Problem Statement

Users currently face a **gap visibility gap paradox**:
1. Gap detection identifies content quality issues (missing metrics, generic descriptions, incomplete STAR format)
2. Gap banners show "Generate Content" CTAs across the application
3. Clicking "Generate Content" opens a modal with **mock AI responses**
4. Generated content is **not validated** against gaps before saving
5. **No guarantee** that applying generated content actually resolves the gap
6. Risk of **content drift**: Generated content may introduce new gaps or hallucinations

**User Pain Point**:
> "I see that my story needs better metrics, but when I click 'Generate Content', I don't know if the AI-generated version actually fixes the problem or just sounds better."

---

## Goals & Non-Goals

### Goals

1. **✅ LLM-Powered Content Generation**: Replace mock generation with real OpenAI API calls using context-aware prompts
2. **✅ Gap-Aware Validation**: Run gap detection on generated content BEFORE user applies it
3. **✅ Intelligent Content Saving** (Context-Dependent):
   - **Work History View**: Default to REPLACE (improving base content quality)
   - **Cover Letter Draft View**: ALWAYS VARIATION (JD-specific adaptations)
   - **Rationale**: Post-onboarding, most content revisions happen during cover letter drafting when addressing JD-specific gaps
4. **✅ Automatic Gap Resolution**: Mark gaps as resolved with `content_added` reason when validated content is applied (both AI-generated AND human-edited content)
5. **✅ Support All Entity Types**: `work_item`, `approved_content`, `saved_section`, `cover_letter_drafts`
6. **✅ Variation Management**:
   - Tag variations with "Gap Tags" (specific gaps addressed) for intelligent reuse
   - Auto-generate variation names based on gap context
   - Visual nesting in work history table views (UI challenge)
7. **✅ Truth Fidelity**: All generated content must be grounded in user's existing work history
8. **✅ Multi-Gap Validation**: One content item can have multiple gaps; validation should check all gaps simultaneously

### Non-Goals

1. ❌ **Autonomous Content Generation**: No unsupervised content creation without user review
2. ❌ **Cover Letter Full Draft Generation**: This PRD focuses on individual content blocks, not entire letters
3. ❌ **Multi-Turn Conversation**: Initial MVP is single-turn generation (user can regenerate, but no chat interface)
4. ❌ **Advanced Prompt Customization**: Users cannot edit prompts in MVP
   - **Future Enhancement (Phase 6)**: User-configurable prompts in profile menu (user voice, custom instructions)
5. ❌ **Batch Generation**: One gap at a time (no "fix all gaps" button)
6. ❌ **Content Versioning UI**: Variations are saved but version history UI is out of scope
7. ❌ **Variation Limits**: No hard limits on number of variations per content item (monitor usage and add if needed)

---

## User Stories & Workflows

### User Story 1: Improve Story Quality (Replace Content)

**As a** job seeker with incomplete stories
**I want to** generate enhanced content that addresses detected gaps
**So that** my story library meets best practices and improves my application success rate

**Workflow**:
1. User navigates to Work History → Story with gap banner
2. Gap banner shows: "⚠️ Content Gap: Story needs more specific examples and quantifiable results"
3. User clicks **"Generate Content"** button
4. **ContentGenerationModal** opens with:
   - **Gap Analysis**: Issue + Suggestion from gap detection
   - **Existing Content**: Current story text
   - **Generated Content**: (empty, waiting for user action)
5. User clicks **"Generate Content"** button in modal
6. **Loading state** (2-3s): "Analyzing your work history and generating enhanced content..."
7. **Generated content** appears in editable textarea with:
   - Enhanced STAR format
   - Specific metrics from user's work history context
   - **Gap Validation Badge**: "✅ Addresses 2 of 2 gaps" OR "⚠️ 1 gap remaining"
8. User reviews content:
   - **Option A**: Satisfied → Clicks "Apply Content"
   - **Option B**: Not satisfied → Clicks "Regenerate" (tries again with variation)
   - **Option C**: Wants to edit → Modifies text directly in textarea
9. On **Apply Content**:
   - Content **replaces** existing story
   - Gap marked as **resolved** with reason `content_added`
   - Story `updated_at` timestamp refreshed
   - Toast: "Story updated successfully! Gap resolved."

### User Story 2: Create Job-Specific Variation (Cover Letter Draft Context)

**As a** job seeker drafting a cover letter for a specific job
**I want to** create variations of my stories tailored to this JD's gaps
**So that** I can address job-specific requirements without modifying my base content library

**Workflow** (Primary Use Case - Post-Onboarding):
1. User is in **Cover Letter Draft Editor** working on application to "Director of Product @ TechCorp"
2. Cover letter draft assembled from best-matching base content
3. Gap detection runs on draft, identifies: "Missing leadership philosophy for Director-level role"
4. User clicks **"Generate Content"** from gap banner
5. **ContentGenerationModal** opens in **"Variation Mode"** (ALWAYS variation in cover letter context)
6. Modal shows:
   - **Target Job**: "Director of Product, TechCorp" (auto-filled from current draft context)
   - **Gap Context**: "Leadership philosophy not demonstrated"
   - **Related Story**: "Team Building at AtlasSuite" (auto-selected based on relevance)
   - **Existing Content**: Current paragraph text from draft
7. User generates content → Validation shows gaps addressed
8. On **Apply Content**, variation is AUTOMATICALLY created (no mode selection needed):
   - **Variation Title**: Auto-generated "Fills Gap: Leadership Philosophy" (editable)
   - **Gap Tags**: `leadership`, `team-management` (auto-tagged from gap categories)
   - **Job Context**: Auto-filled from draft: "Director of Product, TechCorp"
9. User clicks **"Save Variation"**:
   - New variation created in `content_variations` table
   - Linked to parent story: "Team Building at AtlasSuite"
   - Tagged with gap categories for future intelligent matching
   - Gap marked as **resolved** for this draft
   - **Draft updated** with new variation content
   - Original base story remains unchanged
   - Toast: "Variation saved! Content updated in your draft."

**Key Insight**: This is the **primary workflow** post-onboarding. Most content improvement happens during cover letter drafting, not in work history management.

### User Story 3: Fix Role Description Gap (Work Item)

**As a** job seeker with generic role descriptions
**I want to** generate specific, achievement-focused role summaries
**So that** my work history showcases measurable impact instead of vague responsibilities

**Workflow**:
1. User views Work History Detail for "Director of Product @ AtlasSuite"
2. Role description shows gap: "⚠️ Role description is too generic and lacks specific achievements"
3. User clicks **"Generate Content"**
4. **ContentGenerationModal** opens with:
   - **Gap Analysis**: "Issue: Role description is too generic | Suggestion: Add quantifiable results, specific projects, and measurable impact"
   - **Existing Content**: "Led the product management organization..."
   - **Work History Context**: All stories under this role are loaded as context
5. User generates enhanced role description
6. **Gap Validation** runs automatically:
   - ✅ **Passes**: "Contains 3 metrics, specific projects, clear impact"
   - ❌ **Fails**: "Still missing quantifiable results" → Shows regenerate suggestion
7. User applies content → **Replaces** work_item.description field
8. Gap resolved, dashboard metrics update

### User Story 4: Generate Saved Section for Cover Letters

**As a** job seeker building a cover letter library
**I want to** generate reusable introduction paragraphs that address common gaps
**So that** I can quickly assemble high-quality cover letters from pre-approved sections

**Workflow**:
1. User navigates to Saved Sections → Introduction category
2. Sees saved section "Standard Professional Opening" with gap: "Content needs improvement based on cover letter best practices"
3. User clicks **"Generate Content"**
4. Modal generates enhanced introduction with:
   - **Hook**: Compelling opening that references company research
   - **Value Proposition**: Clear statement of unique value
   - **Relevance**: Connection between background and target role
5. Gap validation checks cover letter best practices (from gap detection prompts)
6. User applies → **Replaces** saved section content
7. Section available for reuse across all future cover letters

---

## Functional Requirements

### FR1: LLM Service Integration

**Priority**: P0 (MVP Blocker)

**Requirements**:
1. Create new `ContentGenerationService` in `src/services/contentGenerationService.ts`
2. Integrate with existing `LLMAnalysisService` (`openaiService.ts`)
3. Support content generation for all entity types:
   - `work_item` → Generate role descriptions with metrics
   - `approved_content` → Generate/enhance STAR-formatted stories
   - `saved_section` → Generate cover letter sections (intro, closer, etc.)
   - `cover_letter_drafts` → Generate paragraph-level content (future)
4. **Prompts** (create new file: `src/prompts/contentGeneration.ts`):
   ```typescript
   export function buildContentGenerationPrompt(
     gap: Gap,
     existingContent: string,
     userWorkHistory: WorkHistoryContext,
     targetJob?: JobDescription
   ): string {
     // Prompt structure:
     // 1. Role: "You are a cover letter writing expert helping a PM improve their content"
     // 2. Context: User's work history, role, achievements, metrics
     // 3. Gap Analysis: Specific issue + suggestion from gap detection
     // 4. Constraints:
     //    - MUST use only facts from provided work history
     //    - MUST address the identified gap
     //    - MUST maintain user's voice and tone
     //    - MUST include specific metrics when available
     // 5. Output Format: Enhanced content in same format as existing
   }
   ```
5. **Response Handling**:
   - Parse LLM response
   - Handle truncation with auto-healing (existing pattern in `openaiService.ts`)
   - Validate JSON structure for structured outputs
   - Error handling with user-friendly messages

### FR2: Gap Validation Engine

**Priority**: P0 (MVP Blocker)

**Requirements**:
1. **Real-time Validation** triggered after content generation completes
2. Run subset of gap detection on generated content:
   - For **story gaps**: Check STAR format, metrics presence
   - For **role description gaps**: Check specificity, achievement focus
   - For **saved section gaps**: Check cover letter best practices
3. **Validation Result Display** in modal:
   ```typescript
   interface ValidationResult {
     status: 'pass' | 'partial' | 'fail';
     addressedGaps: Gap[];        // Gaps that are now resolved
     remainingGaps: Gap[];         // Gaps still present
     newGaps?: Gap[];              // New gaps introduced (rare but possible)
     confidence: number;           // 0-1, based on gap detection confidence
     suggestions?: string[];       // If validation fails, suggest improvements
   }
   ```
4. **UI Indicators**:
   - ✅ **Pass**: Green badge "Addresses all gaps" → Enable "Apply Content"
   - ⚠️ **Partial**: Yellow badge "1 gap remaining" → Show regenerate suggestion
   - ❌ **Fail**: Red badge "Gaps not addressed" → Disable "Apply Content", show why

### FR3: Content Persistence & Variation Management

**Priority**: P0 (MVP Blocker)

**Requirements**:

#### 3.1 Database Schema Changes

**New Table**: `content_variations`
```sql
CREATE TABLE public.content_variations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  parent_entity_type TEXT NOT NULL CHECK (parent_entity_type IN ('approved_content', 'saved_section')),
  parent_entity_id UUID NOT NULL, -- References approved_content.id or saved_section.id

  -- Variation content
  title TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Gap context
  filled_gap_id UUID REFERENCES public.gaps(id) ON DELETE SET NULL,
  gap_tags TEXT[] DEFAULT '{}', -- Tags describing which gaps this addresses

  -- Job context (optional)
  target_job_title TEXT,
  target_company TEXT,
  job_description_id UUID REFERENCES public.job_descriptions(id) ON DELETE SET NULL,

  -- Reuse tracking
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_by TEXT DEFAULT 'AI' CHECK (created_by IN ('user', 'AI', 'user-edited-AI')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_variations_parent ON public.content_variations(parent_entity_type, parent_entity_id);
CREATE INDEX idx_content_variations_user_id ON public.content_variations(user_id);
CREATE INDEX idx_content_variations_filled_gap ON public.content_variations(filled_gap_id);

-- RLS Policies
ALTER TABLE public.content_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own variations" ON public.content_variations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own variations" ON public.content_variations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own variations" ON public.content_variations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own variations" ON public.content_variations
  FOR DELETE USING (auth.uid() = user_id);
```

**Schema Extension**: `saved_sections` table
```sql
-- Create saved_sections table if not exists (currently stored in cover_letter_templates JSONB)
CREATE TABLE IF NOT EXISTS public.saved_sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  section_type TEXT NOT NULL CHECK (section_type IN ('introduction', 'closer', 'signature', 'custom')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add addressed_gap_id to saved_sections (matches approved_content pattern)
ALTER TABLE public.saved_sections
  ADD COLUMN IF NOT EXISTS addressed_gap_id UUID REFERENCES public.gaps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_saved_sections_addressed_gap_id
  ON public.saved_sections(addressed_gap_id);
```

#### 3.2 Content Saving Logic

**Replace Existing Content**:
```typescript
async function replaceContent(
  entityType: 'work_item' | 'approved_content' | 'saved_section',
  entityId: string,
  newContent: string,
  userId: string,
  gapId: string
): Promise<void> {
  // 1. Update entity content
  await supabase
    .from(entityType === 'work_item' ? 'work_items' :
          entityType === 'approved_content' ? 'approved_content' : 'saved_sections')
    .update({
      [entityType === 'work_item' ? 'description' : 'content']: newContent,
      updated_at: new Date().toISOString(),
      addressed_gap_id: gapId  // Link to resolved gap
    })
    .eq('id', entityId)
    .eq('user_id', userId);

  // 2. Mark gap as resolved
  await GapDetectionService.resolveGap(gapId, userId, 'content_added', entityId);
}
```

**Create Variation**:
```typescript
async function createVariation(
  parentEntityType: 'approved_content' | 'saved_section',
  parentEntityId: string,
  variationData: {
    title: string;
    content: string;
    filledGapId: string;
    gapTags: string[];
    targetJobTitle?: string;
    targetCompany?: string;
    jobDescriptionId?: string;
  },
  userId: string
): Promise<string> {
  // 1. Insert variation
  const { data: variation, error } = await supabase
    .from('content_variations')
    .insert({
      user_id: userId,
      parent_entity_type: parentEntityType,
      parent_entity_id: parentEntityId,
      title: variationData.title,
      content: variationData.content,
      filled_gap_id: variationData.filledGapId,
      gap_tags: variationData.gapTags,
      target_job_title: variationData.targetJobTitle,
      target_company: variationData.targetCompany,
      job_description_id: variationData.jobDescriptionId,
      created_by: 'AI'
    })
    .select()
    .single();

  if (error) throw error;

  // 2. Mark gap as resolved with variation ID
  await GapDetectionService.resolveGap(
    variationData.filledGapId,
    userId,
    'content_added',
    variation.id
  );

  return variation.id;
}
```

### FR4: Modal Enhancement

**Priority**: P0 (MVP Blocker)

**Requirements**:

1. **Update `ContentGenerationModal` Props**:
   ```typescript
   interface ContentGenerationModalProps {
     isOpen: boolean;
     onClose: () => void;

     // Gap context (unchanged)
     gap: Gap;

     // Entity context (NEW)
     entityType: 'work_item' | 'approved_content' | 'saved_section';
     entityId: string;
     existingContent: string;

     // Work history context for LLM (NEW)
     workHistoryContext: {
       allStories: ApprovedContent[];
       relatedWorkItem?: WorkItem;
       userProfile?: UserProfile;
     };

     // Job context (optional, for variations) (NEW)
     jobContext?: {
       jobTitle: string;
       company: string;
       jobDescriptionId?: string;
     };

     // Callbacks (updated)
     onApplyContent: (content: string, saveMode: 'replace' | 'variation') => Promise<void>;
   }
   ```

2. **State Management**:
   ```typescript
   const [generatedContent, setGeneratedContent] = useState('');
   const [isGenerating, setIsGenerating] = useState(false);
   const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
   const [isValidating, setIsValidating] = useState(false);
   const [saveMode, setSaveMode] = useState<'replace' | 'variation'>('replace');
   const [variationMetadata, setVariationMetadata] = useState({
     title: '',
     gapTags: [],
     targetJobTitle: '',
     targetCompany: ''
   });
   ```

3. **Generation Flow**:
   ```typescript
   async function handleGenerate() {
     setIsGenerating(true);

     try {
       // 1. Call ContentGenerationService
       const content = await ContentGenerationService.generateContent({
         gap,
         existingContent,
         entityType,
         workHistoryContext,
         jobContext
       });

       setGeneratedContent(content);

       // 2. Validate generated content
       setIsValidating(true);
       const validation = await ContentGenerationService.validateContent({
         content,
         originalGap: gap,
         entityType
       });

       setValidationResult(validation);
       setIsValidating(false);

     } catch (error) {
       toast.error('Failed to generate content. Please try again.');
     } finally {
       setIsGenerating(false);
     }
   }
   ```

4. **Apply Content Flow**:
   - If `saveMode === 'replace'`: Call `replaceContent()`
   - If `saveMode === 'variation'`: Show variation metadata form → Call `createVariation()`

### FR5: Integration with Existing Gap Detection

**Priority**: P0 (MVP Blocker)

**Requirements**:

1. **Gap Context Enrichment**: When opening modal, fetch additional context:
   ```typescript
   async function openContentGenerationModal(gap: Gap) {
     // Fetch entity details
     const entity = await fetchEntityDetails(gap.entity_type, gap.entity_id);

     // Fetch related work history
     const workHistory = await fetchRelatedWorkHistory(gap.user_id, gap.entity_id);

     // Fetch job context if in cover letter editor
     const jobContext = currentJobDescription ? {
       jobTitle: currentJobDescription.role,
       company: currentJobDescription.company,
       jobDescriptionId: currentJobDescription.id
     } : undefined;

     // Open modal with full context
     setContentModalProps({
       gap,
       entityType: gap.entity_type,
       entityId: gap.entity_id,
       existingContent: entity.content || entity.description,
       workHistoryContext: workHistory,
       jobContext
     });
     setIsContentModalOpen(true);
   }
   ```

2. **Gap Resolution Tracking**: Update `ContentGapBanner` to refresh after gap resolution
3. **Dashboard Metrics**: Ensure gap counts update after content generation

---

## Technical Implementation Plan

### Phase 1: Foundation (Week 1)

**Goal**: Set up LLM service, prompts, and database schema

#### Tasks:
1. **Create Database Migration** (`012_create_content_variations.sql`)
   - Create `content_variations` table
   - Create `saved_sections` table (if not exists)
   - Add `addressed_gap_id` to `saved_sections`
   - Add RLS policies
   - **Testing**: Run migration, verify tables created

2. **Create Content Generation Prompts** (`src/prompts/contentGeneration.ts`)
   - `buildStoryGenerationPrompt()` - For approved_content
   - `buildRoleDescriptionPrompt()` - For work_item descriptions
   - `buildSavedSectionPrompt()` - For cover letter sections
   - **Testing**: Unit tests for prompt construction

3. **Create ContentGenerationService** (`src/services/contentGenerationService.ts`)
   - `generateContent()` - Main generation function
   - `validateContent()` - Run gap detection on generated content
   - `saveContent()` - Handle replace vs variation logic
   - **Testing**: Integration tests with mock LLM responses

### Phase 2: Modal Integration (Week 2)

**Goal**: Wire up ContentGenerationModal with real LLM service

#### Tasks:
1. **Update ContentGenerationModal Component**
   - Add new props for entity context, work history
   - Replace mock generation with `ContentGenerationService.generateContent()`
   - Add validation result display
   - Add save mode selection (replace vs variation)
   - **Testing**: Storybook stories for all states

2. **Update ContentGapBanner**
   - Pass entity context to modal on "Generate Content" click
   - Fetch work history context before opening modal
   - Refresh gap state after content applied
   - **Testing**: E2E test for gap banner → modal → content save flow

3. **Update Hook Integration**
   - Update `useWorkHistory()` to fetch variations
   - Update `useDashboardData()` to include variation counts
   - Create `useContentGeneration()` hook for modal state management
   - **Testing**: Hook tests with mocked Supabase

### Phase 3: Variations UI (Week 3)

**Goal**: Display variations in story/section cards

#### Tasks:
1. **Update ContentCard Component**
   - Add "Variations (2)" collapsible section
   - Display variation cards with gap tags
   - Add variation usage tracking
   - **Testing**: Visual regression tests

2. **Create VariationCard Component**
   - Display variation title, content preview
   - Show gap tags as badges
   - Show job context ("Developed for: Director of Product @ TechCorp")
   - Add edit/delete actions
   - **Testing**: Storybook + interaction tests

3. **Update Saved Sections Page**
   - Migrate from mock template blurbs to real saved_sections table
   - Display variations for each section
   - **Testing**: E2E test for section creation with variations

### Phase 4: Gap Validation (Week 4)

**Goal**: Implement real-time gap detection on generated content

#### Tasks:
1. **Extend Gap Detection Service**
   - Add `detectGapsInContent()` function for validation
   - Optimize for speed (use lighter prompts for validation)
   - Return comparison: original gaps vs new gaps
   - **Testing**: Performance tests (validation should be <3s)

2. **Validation UI in Modal**
   - Display validation results with badges
   - Show specific gaps addressed
   - Show remaining gaps with suggestions
   - Disable "Apply" if validation fails completely
   - **Testing**: User acceptance testing

3. **Gap Resolution Flow**
   - Update `GapDetectionService.resolveGap()` to handle variations
   - Track resolution reason with metadata
   - Update dashboard widgets to reflect resolved gaps
   - **Testing**: Integration tests for gap lifecycle

### Phase 5: Cover Letter Drafts Support (Week 5)

**Goal**: Extend to cover_letter_drafts entity type

#### Tasks:
1. **Database Schema**
   - Add `cover_letter_drafts` to `gaps.entity_type` enum
   - Ensure gap detection supports cover letter paragraphs
   - **Testing**: Schema migration tests

2. **Cover Letter Editor Integration**
   - Add "Generate Content" buttons to paragraph-level gaps
   - Pass cover letter context to modal
   - Save generated content to cover letter JSON structure
   - **Testing**: E2E cover letter editing flow

3. **Truth Fidelity Verification**
   - Add work history cross-reference in prompts
   - Flag any content that can't be grounded in user data
   - **Testing**: Adversarial testing with fake work history

---

## Success Metrics & Validation

### Product Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Content Generation Success Rate** | 80%+ | % of generations where user clicks "Apply" (vs close/cancel) |
| **Gap Resolution Rate** | 60%+ | % of gaps resolved within 1 generation attempt |
| **Variation Creation Rate** | 3+ per story | Avg # variations created per approved_content item |
| **Time to Resolution** | <5min | Median time from gap detection → content applied |
| **Regeneration Rate** | <30% | % of generations where user clicks "Regenerate" |

### Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Validation Pass Rate** | 80%+ | % of generated content that passes gap validation |
| **Zero Hallucination Rate** | 100% | % of applied content verified to be grounded in work history |
| **User Satisfaction** | 4.5+/5 | Post-generation survey rating |
| **Content Reuse Rate** | 50%+ | % of variations used in multiple cover letters |

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Generation Latency** | <3s p95 | Time from "Generate" click → content display |
| **Validation Latency** | <2s p95 | Time from content generated → validation complete |
| **LLM Cost per Generation** | <$0.05 | Avg OpenAI API cost per content generation |
| **Error Rate** | <5% | % of generations that fail due to LLM errors |

---

## Risks & Mitigation

### Risk 1: LLM Hallucinations

**Risk**: Generated content includes false information not present in user's work history

**Mitigation**:
- ✅ Strict prompt constraints: "ONLY use facts from provided work history"
- ✅ Gap validation checks for inconsistencies
- ✅ User review required before applying (no auto-save)
- ✅ Future: Add "Truth Score" from mockAIService (verifyTruth function)

### Risk 2: Poor Generation Quality

**Risk**: Generated content doesn't address gaps or feels generic

**Mitigation**:
- ✅ Gap validation before allowing "Apply"
- ✅ Regenerate option with variation prompts
- ✅ User can edit content directly in modal
- ✅ Prompt engineering iteration based on user feedback

### Risk 3: High LLM Costs

**Risk**: Frequent content generation drives up OpenAI API costs

**Mitigation**:
- ✅ Use GPT-4o-mini for generation (cheaper than GPT-4)
- ✅ Optimize prompts for token efficiency
- ✅ Cache work history context to reduce repeated API calls
- ✅ Rate limiting: Max 10 generations per minute per user

### Risk 4: Slow Performance

**Risk**: Generation + validation takes >10s, poor UX

**Mitigation**:
- ✅ Parallel processing: Run gap validation while user reviews content
- ✅ Streaming responses from OpenAI (show content as it generates)
- ✅ Optimistic UI updates (show loading states immediately)
- ✅ Timeout wrappers (10s max, fallback to error)

### Risk 5: Database Performance

**Risk**: Variations table grows large, slows down queries

**Mitigation**:
- ✅ Proper indexing on parent_entity_id, user_id, filled_gap_id
- ✅ Lazy loading variations (fetch on demand, not with parent content)
- ✅ Archive old unused variations (>6 months, 0 usage)
- ✅ Pagination for variation lists (if >10 variations)

---

## Open Questions & Decisions

### ✅ Resolved (User Feedback Incorporated)

1. **Variation Naming**: Auto-generate variation names based on gap context, allow user editing
   - **Challenge**: Visual organization/nesting in table views (needs UI design)
   - **Format**: "Fills Gap: [gap_category]" → editable

2. **Prompt Customization**: Not in MVP
   - **Future Enhancement (Phase 6)**: Prompts section in user profile menu with configurable voice and instructions

3. **Multi-Gap Validation**: YES - One content item can have multiple gaps
   - Validation should check ALL gaps simultaneously and report which are addressed

4. **Variation Limits**: No hard limits for MVP
   - Monitor usage and add limits if needed based on performance/UX

5. **Human vs AI Gap Resolution**: Both LLM-generated AND human-edited content should address gaps
   - Gap resolution tracking works for both AI and manual edits
   - User manually editing content can also mark gaps as resolved

### ⏸️ Deferred to Future Phases

6. **Job Description Parsing**: TBD when implementing cover letter draft flow
   - Will determine how to extract gap-specific context from JD
   - May leverage existing job_descriptions table + keyword extraction

---

## Appendix

### A. Related Documents

- `CLAUDE.md` - Project overview and architecture
- `NARRATA_BUSINESS_CONTEXT_COMPREHENSIVE.md` - Business strategy and positioning
- `docs/implementation/GAP_DETECTION_CONTEXT_TRACKING.md` - Gap detection enhancement plan
- `docs/implementation/PHASE_3_GAP_DETECTION_PROGRESS.md` - Gap detection implementation log

### B. API Examples

**Content Generation Request**:
```typescript
const request = {
  gap: {
    id: 'gap-123',
    gap_category: 'incomplete_story',
    description: 'Story lacks specific metrics and quantifiable results',
    suggestions: ['Add percentage improvements', 'Include team size', 'Specify timeline']
  },
  existingContent: 'Led product team to launch new feature...',
  entityType: 'approved_content',
  workHistoryContext: {
    role: 'Director of Product',
    company: 'AtlasSuite',
    allStories: [...],
    metrics: ['35% engagement increase', '40% churn reduction']
  },
  jobContext: {
    jobTitle: 'Senior Product Manager',
    company: 'TechCorp'
  }
};

const response = await ContentGenerationService.generateContent(request);
// Returns: "As Director of Product at AtlasSuite, I led a team of 8 product professionals to launch..."
```

**Validation Response**:
```typescript
const validation = {
  status: 'pass',
  addressedGaps: [
    { id: 'gap-123', gap_category: 'incomplete_story', description: '...' }
  ],
  remainingGaps: [],
  newGaps: [],
  confidence: 0.92,
  suggestions: []
};
```

### C. UI Mockups

*(Reference screenshots from user provided above)*

- Image #1: Variations section in story card showing "Fills Gap: People management" and "Fills Gap: Roadmap"
- Image #2: Same variations view with gap tags displayed
- Image #3: Saved Sections showing multiple Introduction variations with gap banners and "Generate Content" CTAs
- Image #4: Content Generation Modal showing gap analysis, existing content, and generated content with Apply/Regenerate actions
- Image #5: Content Generation Modal showing enhanced content with metrics and validation results

---

**End of PRD**
