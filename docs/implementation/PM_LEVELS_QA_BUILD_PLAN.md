# PM Levels QA & Follow-On Build Plan

## Overview
This plan covers QA testing and follow-on development for the PM Levels Service feature. The service automatically infers a user's product management level (L3-L6 IC, M1-M2 Manager) based on their résumé and content.

## Current State Assessment

### ✅ Completed
- Database schema design (deleted, needs recreation)
- TypeScript types defined (`PMLevel`, `PMCompetency` in `content.ts`)
- UI preview component exists (`PMLevelPreview.tsx`)
- Gap detection service has stubs for PM Levels integration
- Upload script exists for synthetic user testing (`direct-upload-test.ts`)

### ❌ Missing
- Database migration for `user_levels` table
- PM Levels Service implementation (`pmLevelsService.ts`)
- LLM prompts for signal extraction and competency scoring
- Integration with file upload service
- UI components for displaying inferred levels
- Dispute mechanism for level assessments
- Gap service integration with level-based content standards

## Phase 1: Foundation & Data Setup

### 1.1 Database Schema Recreation
**Priority: Critical**
**Estimated Time: 1-2 hours**

**Tasks:**
- [ ] Create migration `003_pm_levels_schema.sql` (recreate from PRD)
  - `user_levels` table with all required fields
  - Enum types: `pm_level_code`, `role_type`, `business_maturity`
  - Indexes for performance
  - RLS policies for user data access
  - Trigger for `updated_at` timestamp

**Schema Fields:**
```sql
- id (UUID, PK)
- user_id (UUID, FK to profiles)
- inferred_level (pm_level_code: L3, L4, L5, L6, M1, M2)
- confidence (FLOAT 0-1)
- scope_score (FLOAT 0-1)
- maturity_modifier (FLOAT 0.8-1.2)
- role_type (role_type[] array)
- delta_summary (TEXT)
- recommendations (JSONB)
- competency_scores (JSONB)
- signals (JSONB)
- last_run_timestamp (TIMESTAMP)
- created_at, updated_at (TIMESTAMP)
```

**Dependencies:**
- Supabase migration system
- Existing `profiles` table

**Acceptance Criteria:**
- Migration runs successfully
- Table created with all fields
- RLS policies enforce user isolation
- Indexes created for query performance

---

### 1.2 Synthetic Data Cleanup & Re-upload
**Priority: Critical**
**Estimated Time: 2-3 hours**

**Tasks:**
- [ ] Create script to clear synthetic user data
  - Clear `sources` table for synthetic users
  - Clear `work_items` for synthetic users
  - Clear `user_levels` for synthetic users (if exists)
  - Clear `gaps` for synthetic users
  - Clear `synthetic_users` table (routine QA cleanup)
- [ ] Update upload script to trigger PM Levels analysis
  - Modify `direct-upload-test.ts` to call PM Levels Service after upload
  - **PM Levels runs AFTER resume, cover letter, and LinkedIn are parsed**
  - **Run in background (non-blocking)** - don't block product tour/onboarding
  - **Notify users when PM level is ready** (toast notification or dashboard badge)
  - Add PM Levels results to upload summary output
- [ ] Test upload script with all synthetic profiles (P01-P10)
  - Verify PM Levels inference runs for each profile
  - Verify results stored in `user_levels` table
  - Verify confidence scores are reasonable (0.5-1.0)
  - Verify analysis doesn't block onboarding flow

**Script Location:**
- `scripts/direct-upload-test.ts` (existing)
- New: `scripts/clear-synthetic-data.ts` (to create)

**Usage:**
```bash
# Clear all synthetic data
npm run test:clear-synthetic

# Upload P01 and infer level
npm run test:upload -- P01

# Upload all profiles and infer levels
npm run test:upload -- --all
```

**Dependencies:**
- PM Levels Service implementation (Phase 2)
- Database schema (Phase 1.1)

**Acceptance Criteria:**
- All synthetic data can be cleared safely
- Upload script successfully triggers PM Levels analysis
- All 10 synthetic profiles have inferred levels
- Results are stored correctly in database

---

## Phase 2: PM Levels Service Implementation

### 2.1 Core Service Implementation
**Priority: Critical**
**Estimated Time: 4-6 hours**

**Tasks:**
- [ ] Create `src/services/pmLevelsService.ts`
  - Implement `analyzeUserLevel()` main method
  - Implement `fetchUserContent()` to aggregate user data
  - Implement `extractSignals()` using LLM
  - Implement `computeCompetencyScores()` using LLM
  - Implement `deriveBusinessMaturity()` from company metadata
  - Implement `computeScopeScore()` from signals
  - Implement `computeLevelScore()` using formula
  - Implement `mapLevelScoreToLevel()` to convert score to level code
  - Implement `calculateConfidence()` based on data quality
  - Implement `generateRecommendations()` using LLM
  - Implement `generateDeltaSummary()` for human-readable gaps
  - Implement `saveLevelAssessment()` to store results

**Key Methods:**
```typescript
class PMLevelsService {
  async analyzeUserLevel(
    userId: string,
    targetLevel?: PMLevelCode,
    roleType?: RoleType[],
    evaluationTracking?: { sourceId?: string; sessionId?: string }
  ): Promise<PMLevelInference | null>
  
  private async extractSignals(content: string): Promise<LevelSignal>
  private async computeCompetencyScores(...): Promise<CompetencyScore>
  private computeScopeScore(signals: LevelSignal, artifacts: any[]): number
  private computeLevelScore(...): number
  private mapLevelScoreToLevel(score: number): { levelCode: PMLevelCode; displayLevel: PMLevelDisplay }
  private calculateConfidence(...): number
  private async generateRecommendations(...): Promise<LevelRecommendation[]>
  private async saveLevelAssessment(userId: string, inference: PMLevelInference): Promise<void>
}
```

**Dependencies:**
- LLM prompts (Phase 2.2)
- Database schema (Phase 1.1)
- TypeScript types (already exist)

**Acceptance Criteria:**
- Service successfully infers levels for test users
- Results stored correctly in database
- Confidence scores are reasonable
- Recommendations are actionable

---

### 2.2 LLM Prompts Implementation
**Priority: Critical**
**Estimated Time: 2-3 hours**

**Tasks:**
- [ ] Create `src/services/prompts/pmLevelsPrompts.ts`
  - `EXTRACT_SIGNALS_PROMPT` - Extract scope, impact, influence signals
  - `RATE_COMPETENCIES_PROMPT` - Score execution, customer_insight, strategy, influence (0-3 scale)
  - `DERIVE_BUSINESS_MATURITY_PROMPT` - Determine company maturity (early/growth/late)
  - `GENERATE_RECOMMENDATIONS_PROMPT` - Create actionable recommendations

**Prompt Requirements:**
- Structured JSON output for all prompts
- Clear instructions for scoring scales
- Examples of good vs. poor signals
- Role type context (growth, platform, AI/ML, etc.)

**Dependencies:**
- LLMAnalysisService (existing)
- PM Levels Service (Phase 2.1)

**Acceptance Criteria:**
- Prompts return structured JSON
- Scores are within expected ranges
- Recommendations are specific and actionable
- Prompts handle edge cases (missing data, ambiguous content)

---

### 2.3 File Upload Integration
**Priority: High**
**Estimated Time: 2-3 hours**

**Tasks:**
- [ ] Integrate PM Levels Service into `FileUploadService`
  - **Trigger AFTER resume, cover letter, and LinkedIn are parsed**
  - Add trigger after unified profile merging completes
  - Pass `sourceId` and `sessionId` for evaluation tracking
  - **Make PM Levels analysis non-blocking (async, error handling)**
  - **Don't block product tour or onboarding flow**
  - Log PM Levels results to `evaluation_runs` table
- [ ] Add notification system for PM Levels completion
  - Create toast notification or dashboard badge when level is ready
  - Store notification state in database or localStorage
  - Show "PM Level Ready" indicator on dashboard/assessment page

**Integration Point:**
```typescript
// In FileUploadService, after resume/cover letter/LinkedIn parsed:
// Trigger PM levels analysis asynchronously (non-blocking)
this.triggerPMLevelsAnalysis(userId, sourceId, sessionId).catch(error => {
  console.warn('[FileUploadService] PM levels analysis failed (non-blocking):', error);
});

// After PM Levels completes, notify user:
// - Show toast notification
// - Update dashboard badge
// - Store notification in user state
```

**Dependencies:**
- PM Levels Service (Phase 2.1)
- FileUploadService (existing)
- Notification system (toast or badge)

**Acceptance Criteria:**
- PM Levels analysis triggers after all content is parsed
- Analysis doesn't block onboarding or product tour
- Users are notified when level is ready
- Errors are logged but don't break upload flow
- Results tracked in evaluation_runs table

---

## Phase 3: UI Components

### 3.1 Consolidate Assessment to Single Page
**Priority: High**
**Estimated Time: 4-6 hours**

**Tasks:**
- [ ] Consolidate Assessment to single page (`src/pages/Assessment.tsx`)
  - Replace mock data with real PM Levels data from `user_levels` table
  - Display inferred level from PM Levels Service
  - Show confidence score (may make user-facing based on threshold)
  - Update data sources section with real counts
  - Add "Dispute" button: "This doesn't look right" (simple, user-facing)
- [ ] Create single-page layout with anchor-linked sections
  - **Overall Level Section** (anchor: `#overall-level`)
    - Display level evidence from PM Levels Service
    - Show competency scores from `competency_scores` JSONB field
    - Show specialization matches from `role_type` array
    - Display extracted signals (scope, impact, influence)
    - Add "Dispute" button
  - **Competency Sections** (anchors: `#execution`, `#customer-insight`, `#strategy`, `#influence`)
    - 4 collapsible/expandable sections or tabs
    - Show real competency scores from PM Levels Service
    - Display evidence stories that support each competency
    - Show level assessment (meeting/exceeding/underperforming) based on inferred level
    - "View Evidence" links open anchor links to detailed views
  - **Specialization Sections** (anchors: `#growth`, `#technical`, `#founding`, `#platform`)
    - 4 collapsible/expandable sections or tabs
    - Show real specialization matches from `role_type` array
    - Display match percentage and strength
    - Show evidence for specialization fit
    - "View Evidence" links open anchor links to detailed views
- [ ] Update routing to support anchor links
  - `/assessment` - Main page
  - `/assessment#overall-level` - Scrolls to overall level section
  - `/assessment#execution` - Scrolls to execution competency section
  - `/assessment#growth` - Scrolls to growth specialization section
  - etc.
- [ ] Update Header navigation to use anchor links
  - Assessment dropdown opens sections via anchor links
  - Smooth scroll to sections

**Key Changes:**
- Single page instead of 10 separate screens
- Anchor links for navigation (`#overall-level`, `#execution`, etc.)
- Dropdowns open anchor links to sections
- Remove mock data, use real PM Levels Service data
- Integrate with `usePMLevel` hook
- Add dispute mechanism
- Update based on actual data returned from PM Levels Service
- Pare down sections if data doesn't support all of them

**Dependencies:**
- `usePMLevel` hook (Phase 3.2)
- PM Levels Service (Phase 2.1)
- Existing Assessment components (already exist)

**Acceptance Criteria:**
- All 10 screens display real PM Levels data
- Dispute button appears on relevant screens
- Screens update based on actual data structure
- Confidence scores displayed (if user-facing threshold met)
- All modals work correctly

---

### 3.2 Dispute Mechanism
**Priority: High**
**Estimated Time: 2-3 hours**

**Tasks:**
- [ ] Add dispute fields to `user_levels` table
  - `disputed_at` (TIMESTAMP, nullable)
  - `dispute_reason` (TEXT, nullable)
  - `expected_level` (pm_level_code, nullable)
  - `dispute_resolved` (BOOLEAN, default false)
- [ ] Add "This doesn't look right" button to Assessment screens
  - Simple button, user-facing feedback loop
  - Appears on landing page and overall assessment modal
  - Opens simple dispute form
- [ ] Create dispute form/modal
  - Current inferred level (read-only)
  - Expected level (dropdown: L3-L6, M1-M2)
  - Reason (textarea, optional)
  - Submit button
- [ ] Store dispute in database
  - Update `user_levels` table with dispute data
  - Track dispute for feedback loop
  - (Future) Admin can review disputes

**Dispute Flow:**
1. User clicks "This doesn't look right" button
2. Simple modal/form appears with:
   - Current level (read-only)
   - Expected level (dropdown)
   - Reason (optional textarea)
3. User submits dispute
4. Dispute stored in `user_levels` table
5. User sees confirmation
6. (Future) Admin reviews disputes

**Dependencies:**
- Database schema update (add dispute fields)
- Assessment page updates (Phase 3.1)

**Acceptance Criteria:**
- Dispute button appears on relevant screens
- Dispute form is simple and clear
- Disputes are stored correctly
- User receives confirmation
- Dispute data accessible for feedback loop

---

### 3.3 React Hook for PM Level Data
**Priority: High**
**Estimated Time: 1-2 hours**

**Tasks:**
- [ ] Create `src/hooks/usePMLevel.ts`
  - Fetch level data from `user_levels` table
  - Provide `recalculate()` function to trigger new analysis
  - Handle loading and error states
  - Cache data to avoid unnecessary refetches
  - Check if level is ready (notification state)

**Hook Interface:**
```typescript
interface UsePMLevelReturn {
  levelData: PMLevelInference | null;
  isLoading: boolean;
  error: Error | null;
  recalculate: () => Promise<void>;
  lastUpdated: Date | null;
  isReady: boolean; // Whether level analysis is complete
}
```

**Dependencies:**
- PM Levels Service (Phase 2.1)
- Database schema (Phase 1.1)

**Acceptance Criteria:**
- Hook fetches level data correctly
- Recalculate function works
- Loading and error states handled
- Data is cached appropriately
- `isReady` flag indicates when level is available

---

## Phase 4: Gap Service Integration

### 4.1 Level-Based Content Standards
**Priority: High**
**Estimated Time: 4-5 hours**

**Tasks:**
- [ ] **Extend existing gap detection service** (don't replace, extend)
  - Update gap detection prompts to consider inferred level
  - Modify `detectStoryGaps()` to check against level expectations
  - Modify `detectRoleDescriptionGaps()` to use level-specific requirements
  - Add level context to all gap detection prompts
- [ ] Create level expectation mappings
  - Define what "meeting", "exceeding", "under-performing" means for each level
  - Map competency scores to gap severity
  - Create level-specific quality thresholds
  - **Use inferred level to assess content quality**

**Level Expectations (Example):**
```typescript
const LEVEL_EXPECTATIONS = {
  L3: {
    execution: { min: 1.5, target: 2.0 },
    customer_insight: { min: 1.0, target: 1.5 },
    strategy: { min: 0.5, target: 1.0 },
    influence: { min: 0.5, target: 1.0 },
    scope: { min: 0.3, target: 0.5 }
  },
  L4: {
    execution: { min: 2.0, target: 2.5 },
    customer_insight: { min: 1.5, target: 2.0 },
    strategy: { min: 1.0, target: 1.5 },
    influence: { min: 1.0, target: 1.5 },
    scope: { min: 0.5, target: 0.7 }
  },
  // ... L5, L6, M1, M2
};
```

**Gap Severity Mapping:**
- **Under-performing**: Score < min threshold → High priority gap
- **Meeting**: Score between min and target → Medium priority gap
- **Exceeding**: Score > target → Low priority gap or no gap

**Content Assessment:**
- Use inferred level to assess if content is meeting/exceeding/under-performing
- Show level-appropriate feedback in gap descriptions
- Reference level expectations in gap explanations

**Dependencies:**
- PM Levels Service (Phase 2.1)
- Gap Detection Service (existing - extend, don't replace)

**Acceptance Criteria:**
- Gap detection considers user's inferred level
- Gaps are categorized as meeting/exceeding/under-performing
- Gap severity reflects level expectations
- Prompts include level context
- Existing gap detection still works

---

### 4.2 Target Level Gap Analysis & Content Positioning
**Priority: High**
**Estimated Time: 3-4 hours**

**Tasks:**
- [ ] Implement `reanalyzeAllUserGaps()` in GapDetectionService
  - Get target job titles from UserPreferencesService
  - Map target titles to PM levels using PMLevelsService
  - Re-run gap detection with target level context
  - Update role expectation gaps based on target level requirements
  - Broadcast job status via Supabase realtime channel
- [ ] **Add target level content positioning**
  - Use target level to guide how content should be positioned
  - Provide recommendations for positioning content based on target level
  - Show gap between current level and target level
  - Suggest content improvements to reach target level

**Implementation:**
```typescript
static async reanalyzeAllUserGaps(userId: string, accessToken?: string): Promise<void> {
  // 1. Get target job titles
  const targetTitles = await UserPreferencesService.getTargetJobTitles(userId);
  
  // 2. Map titles to PM levels
  const targetLevels = await PMLevelsService.getLevelsFromJobTitles(targetTitles);
  
  // 3. Get current inferred level
  const currentLevel = await PMLevelsService.getUserLevel(userId);
  
  // 4. Re-run gap detection with level context
  // - Assess content against current level (meeting/exceeding/underperforming)
  // - Assess content against target level (how to position for target)
  await GapDetectionService.detectAllGaps(userId, {
    currentLevel,
    targetLevels,
    levelContext: true
  }, accessToken);
  
  // 5. Generate content positioning recommendations
  // - How to position content based on target level
  // - What content to emphasize/improve for target level
  
  // 6. Broadcast updates
  // ... realtime broadcast
}
```

**Content Positioning Logic:**
- **Current Level Assessment**: Is content meeting/exceeding/underperforming for current level?
- **Target Level Positioning**: How should content be positioned to reach target level?
- **Gap Analysis**: What's the gap between current and target level?
- **Recommendations**: Specific content improvements to bridge the gap

**Dependencies:**
- PM Levels Service (Phase 2.1)
- UserPreferencesService (existing)
- Gap Detection Service (existing - extend)

**Acceptance Criteria:**
- Gap re-analysis triggers when target titles change
- Gaps are assessed against both current and target level
- Content positioning recommendations are provided
- Role expectation gaps reflect target level
- Updates broadcast via realtime

---

### 4.3 Level-Based Gap Recommendations
**Priority: Medium**
**Estimated Time: 2-3 hours**

**Tasks:**
- [ ] Update gap recommendations to reference level
  - Include level context in gap descriptions
  - Suggest level-appropriate improvements
  - Reference level expectations in gap explanations
- [ ] Add level progression guidance
  - Show what's needed to reach next level
  - Highlight gaps that block level progression
  - Provide level-specific improvement suggestions

**Example Gap Description:**
```
"Your execution competency (2.1/3.0) meets L4 expectations but falls 
short of L5 requirements. To reach L5, focus on:
- Leading cross-functional initiatives
- Driving org-wide process improvements
- Quantifying impact at company scale"
```

**Dependencies:**
- Gap Detection Service (Phase 4.1)
- PM Levels Service (Phase 2.1)

**Acceptance Criteria:**
- Gap descriptions include level context
- Recommendations are level-appropriate
- Level progression guidance is clear
- Suggestions are actionable

---

## Phase 5: Evaluation & Metrics

### 5.1 Evals Dashboard Integration
**Priority: Medium**
**Estimated Time: 2-3 hours**

**Tasks:**
- [ ] Add PM Levels metrics to EvaluationDashboard
  - Success/failure rate for PM Levels analysis
  - Average latency for PM Levels analysis
  - Correlation between upload quality and level inference
  - PM Levels status column in evaluation runs table

**Metrics to Display:**
- PM Levels Success Rate (%)
- PM Levels Avg Latency (seconds)
- Level Distribution (count of L3, L4, L5, L6, M1, M2)
- Confidence Distribution (histogram)
- **Confidence threshold analysis** (if user-facing threshold implemented)

**Dependencies:**
- EvaluationDashboard (existing)
- PM Levels Service (Phase 2.1)
- evaluation_runs table (already has PM Levels fields from previous work)

**Acceptance Criteria:**
- PM Levels metrics visible in dashboard
- Metrics are accurate
- Filters work correctly
- CSV export includes PM Levels data
- Confidence threshold metrics displayed (if implemented)

---

### 5.2 Confidence Threshold & User-Facing Display
**Priority: Medium**
**Estimated Time: 2-3 hours**

**Tasks:**
- [ ] Define reasonable confidence threshold
  - Determine threshold for showing confidence to users (e.g., 0.7)
  - Below threshold: show "Low confidence" or hide score
  - Above threshold: show confidence score to users
- [ ] Implement user-facing confidence display
  - Show confidence score in Assessment screens (if above threshold)
  - Add confidence indicator (badge, progress bar, etc.)
  - Explain confidence meaning to users
- [ ] Track confidence distribution
  - Monitor confidence scores across all users
  - Identify patterns in low-confidence inferences
  - Use for continuous improvement

**Confidence Threshold Logic:**
```typescript
const CONFIDENCE_THRESHOLD = 0.7; // Example threshold

if (confidence >= CONFIDENCE_THRESHOLD) {
  // Show confidence score to user
  displayConfidence(confidence);
} else {
  // Show "Low confidence" or hide score
  displayLowConfidence();
}
```

**Dependencies:**
- PM Levels Service (Phase 2.1)
- Assessment screens (Phase 3.1)

**Acceptance Criteria:**
- Confidence threshold is defined and reasonable
- Confidence displayed to users when above threshold
- Low confidence handled appropriately
- Confidence metrics tracked

---

## Phase 6: Testing & QA

### 6.1 Unit Tests
**Priority: Medium**
**Estimated Time: 3-4 hours**

**Tasks:**
- [ ] Test PM Levels Service methods
  - Test level score calculation
  - Test level mapping logic
  - Test confidence calculation
  - Test recommendation generation
- [ ] Test gap service integration
  - Test level-based gap detection
  - Test target level gap analysis
  - Test level expectation mappings

**Test Coverage Goals:**
- PM Levels Service: 80%+
- Gap Service integration: 70%+
- Critical paths: 100%

---

### 6.2 Integration Tests
**Priority: Medium**
**Estimated Time: 2-3 hours**

**Tasks:**
- [ ] Test end-to-end flow
  - Upload file → PM Levels analysis → Results stored
  - Change target titles → Gap re-analysis → Gaps updated
  - Recalculate level → New analysis → Results updated
- [ ] Test synthetic user flow
  - Upload synthetic profile → Level inferred
  - Switch profiles → Levels isolated correctly
  - Clear data → Re-upload → Level re-inferred

---

### 6.3 Manual QA Checklist
**Priority: High**
**Estimated Time: 4-6 hours**

**Tasks:**
- [ ] Test with all 10 synthetic profiles
  - Verify each profile gets appropriate level
  - Verify confidence scores are reasonable
  - Verify recommendations are relevant
- [ ] Test UI components
  - LevelCard displays correctly
  - Recommendations modal works
  - Dispute flow works
  - Dashboard integration works
- [ ] Test gap service integration
  - Gaps reflect inferred level
  - Target level gaps work
  - Level-based recommendations appear
- [ ] Test edge cases
  - User with no content
  - User with minimal content
  - User with conflicting signals
  - User switching between profiles

---

## Clarifications Received ✅

### 1. Database Schema
- ✅ **A:** Add dispute fields to `user_levels` table (disputed_at, dispute_reason, expected_level, dispute_resolved)
- ✅ **A:** Recreate migration from PRD, add dispute fields

### 2. Synthetic Data
- ✅ **A:** Clear everything (routine QA cleanup)
- ✅ **A:** PM Levels runs automatically after resume, cover letter, and LinkedIn are parsed
- ✅ **A:** Run in background (non-blocking), don't block product tour/onboarding
- ✅ **A:** Notify users when PM level is ready

### 3. UI/UX
- ✅ **A:** Consolidate to single Assessment page with anchor-linked sections:
  - Single page (`/assessment`) with sections for:
    - Overall level (`#overall-level`)
    - 4 competencies (`#execution`, `#customer-insight`, `#strategy`, `#influence`)
    - 4 specializations (`#growth`, `#technical`, `#founding`, `#platform`)
  - Dropdowns open anchor links to sections
  - May pare down sections based on actual data returned
- ✅ **A:** Dispute = simple button "This doesn't look right" (user-facing feedback loop)

### 4. Gap Service Integration
- ✅ **A:** Use and extend existing gap detection service (don't replace)
- ✅ **A:** Level used to assess content (meeting/exceeding/underperforming)
- ✅ **A:** Level also used for target goal: how to position content based on target level

### 5. Level Expectations & Confidence
- ✅ **A:** Need reasonable confidence threshold
- ✅ **A:** May make confidence user-facing (if above threshold)

### 6. Level Usage
- ✅ **A:** Level used for TWO purposes:
  1. **Assess content quality**: Is content meeting/exceeding/underperforming for current level?
  2. **Target goal positioning**: How to position content based on target level they're aiming for

---

## Estimated Timeline

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| Phase 1: Foundation | Database schema, data cleanup | 3-5 hours | Critical |
| Phase 2: Service | Core service, prompts, integration | 8-12 hours | Critical |
| Phase 3: UI | Consolidate to single page, dispute, hook | 6-9 hours | High |
| Phase 4: Gap Integration | Level-based gaps, target level positioning | 7-9 hours | High |
| Phase 5: Evaluation | Metrics, confidence threshold | 4-6 hours | Medium |
| Phase 6: Testing | Unit, integration, manual QA | 9-13 hours | High |
| **Total** | | **37-55 hours** | |

**Recommended Approach:**
1. Start with Phase 1 (Foundation) - enables all other work
2. Build Phase 2 (Service) in parallel with Phase 1 completion
3. Build Phase 3 (UI) after service is working
4. Integrate Phase 4 (Gap Service) after UI is complete
5. Add Phase 5 (Evaluation) for monitoring
6. Comprehensive Phase 6 (Testing) before release

---

## Success Criteria

### Must Have (MVP)
- ✅ PM Levels Service infers levels correctly
- ✅ Results stored in database
- ✅ PM Levels runs after resume/cover letter/LinkedIn parsed (background, non-blocking)
- ✅ Users notified when PM level is ready
- ✅ Assessment page (single page with anchor sections) displays real PM Levels data
- ✅ Dispute mechanism ("This doesn't look right" button)
- ✅ Gap service extends to consider inferred level
- ✅ Content assessed as meeting/exceeding/underperforming
- ✅ Target level content positioning works
- ✅ Upload script triggers PM Levels analysis

### Should Have
- ✅ Confidence threshold defined and user-facing (if above threshold)
- ✅ Target level gap analysis works
- ✅ Evals dashboard shows PM Levels metrics
- ✅ Level-based gap recommendations

### Nice to Have
- ⭐ Level progression tracking over time
- ⭐ Level inference accuracy metrics
- ⭐ Export level assessment report
- ⭐ Level comparison (current vs. target)

---

## Risks & Mitigations

### Risk 1: LLM Inference Quality
**Risk:** PM Levels inference may be inaccurate or inconsistent
**Mitigation:** 
- Use structured prompts with clear scoring criteria
- Implement confidence scoring to flag low-confidence results
- Allow manual override via dispute mechanism
- Track accuracy metrics for continuous improvement

### Risk 2: Performance Impact
**Risk:** PM Levels analysis adds latency to file upload
**Mitigation:**
- Make analysis non-blocking (async)
- Run analysis after upload completes
- Cache results to avoid re-analysis
- Optimize LLM prompts for faster responses

### Risk 3: Gap Service Complexity
**Risk:** Level-based gap detection may conflict with existing gap logic
**Mitigation:**
- Keep existing gap detection as fallback
- Add level context as additional dimension
- Test thoroughly with synthetic profiles
- Provide clear migration path

### Risk 4: UI Complexity
**Risk:** Level display and recommendations may overwhelm users
**Mitigation:**
- Start with simple LevelCard
- Progressive disclosure in recommendations modal
- Clear, actionable recommendations
- User testing before full release

---

## Next Steps

1. **Review this plan** - Confirm approach and answer questions
2. **Prioritize phases** - Decide what's MVP vs. follow-on
3. **Start Phase 1** - Database schema and data setup
4. **Build incrementally** - Test each phase before moving to next
5. **QA thoroughly** - Use synthetic profiles for comprehensive testing

---

## References

- PRD: `docs/prd/PM_LEVELS_SERVICE_PRD.md` (if exists)
- Existing Types: `src/types/content.ts`
- Upload Script: `scripts/direct-upload-test.ts`
- Gap Service: `src/services/gapDetectionService.ts`
- File Upload Service: `src/services/fileUploadService.ts`

