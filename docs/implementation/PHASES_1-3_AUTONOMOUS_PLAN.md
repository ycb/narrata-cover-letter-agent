# Phases 1-3 Autonomous Implementation Plan

## Assessment: Can I proceed independently?

**YES, with the clarifications below.**

I can handle all technical implementation, testing, branching, and commits for Phases 1-3. Here's what I can do and what I need:

---

## ✅ What I Can Do Independently

### Phase 1: Branch Strategy & Prototype Separation
- ✅ Create `usability-test` branch from current branch
- ✅ Identify all prototype dependencies (PrototypeContext, PrototypeStateBanner, tour components, sample data)
- ✅ Move prototype files to usability-test branch
- ✅ Remove PrototypeProvider from App.tsx
- ✅ Remove all usePrototype() calls
- ✅ Remove PrototypeStateBanner usage
- ✅ Create git tags for reference
- ✅ Unit tests for prototype removal
- ✅ Browser automation to verify no prototype code in production

### Phase 2: Remove Sample Data Fallbacks
- ✅ Remove `sampleWorkHistory` from WorkHistory.tsx
- ✅ Remove `mockAllStories` from ShowAllStories.tsx
- ✅ Remove `mockAllLinks` from ShowAllLinks.tsx
- ✅ Check Dashboard.tsx for mock data
- ✅ Create EmptyState components:
  - WorkHistoryEmptyState → "No work history yet" with link to onboarding
  - StoriesEmptyState → "No stories found" with prompt to add
  - LinksEmptyState → "No links found" with prompt to add
  - DashboardEmptyState → Guide to onboarding completion
- ✅ Integration tests for empty states
- ✅ Browser automation to verify empty states display correctly
- ✅ Ensure synthetic mode still works (already verified in codebase)

### Phase 3: Implement Gap Detection Service
- ✅ Create `gapDetectionService.ts` with core logic
- ✅ Create database migration for gap storage (if needed)
- ✅ Implement three gap types:
  - Data Quality gaps
  - Best Practice gaps
  - Role-Level Expectation gaps
- ✅ Connect to Work History page (gap warnings UI exists)
- ✅ Unit tests for gap detection logic
- ✅ Integration tests with real database
- ✅ Browser automation to verify gap detection in UI

---

## ❓ What I Need From You (Upfront)

### ✅ CONFIRMED: Gap Detection Rules & Thresholds

**Story Completeness:**
- Story must have STAR format (Situation/Task, Action, Result) OR "Accomplished [X] as measured by [Y], by doing [Z]"
- Must have a metric (user can override with "no-metric story" flag)
- If missing these components → mark incomplete

**Metrics:**
- Prompt user to add metric to every story
- User can override (no-metric story flag)
- Quantified = measurable/discrete (keep flexible)

**Generic Detection:**
- Use LLM-as-judge to detect "too generic" descriptions
- Call LLM when content is imported (no separate call needed)

**Story Counts:**
- No enforcement up-front (users add stories as needed for job applications)

**Target Level:**
- Read from My Goals > Target Job Titles (stored in `profiles.goals` JSON)
- For Phase 3, infer "next level up" if goals not set
- Part of onboarding - build My Goals persistence now

### ✅ CONFIRMED: Database Schema

**Separate `gaps` table:**
```sql
CREATE TABLE gaps (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  entity_type TEXT, -- 'work_item' | 'approved_content'
  entity_id UUID,
  gap_type TEXT, -- 'data_quality' | 'best_practice' | 'role_expectation'
  gap_category TEXT, -- 'missing_metrics', 'incomplete_story', 'too_generic', etc.
  severity TEXT, -- 'high' | 'medium' | 'low'
  description TEXT,
  suggestions JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_reason TEXT, -- 'user_override' | 'content_added' | 'manual_resolve'
  addressing_content_ids UUID[], -- IDs of content that addresses this gap
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Add to `approved_content`:**
```sql
ALTER TABLE approved_content 
  ADD COLUMN addressed_gap_id UUID REFERENCES gaps(id);
```

### ✅ CONFIRMED: Gap Resolution

- User has final say on content
- Before saving content → run gap detection, show lingering gaps
- User can override
- Track for intelligent suggestions (new cover letters)
- Maintain list of gaps + severity to nudge users
- Allow permanent dismiss or manual resolve
- Explain why not needed → permanent dismiss

### ✅ CONFIRMED: My Goals/My Voice Persistence

- Already in user menu (Header.tsx)
- Currently in localStorage
- Need to persist to `profiles.goals` (JSON) and `profiles.user_voice` (TEXT)
- Build as part of Phase 3 (needed for gap detection)

### ✅ CONFIRMED: Synthetic Goals Data

- Create goals data for P01-P10 synthetic profiles
- Use realistic target titles based on their roles

---

### 📋 Remaining Questions:

#### Data Quality Gaps:
- ✅ Missing dates → I can detect this
- ✅ Incomplete stories → **What defines "incomplete"?** (e.g., < 50 words, no metrics, no outcome?)
- ✅ Missing metrics → **What's the minimum?** (e.g., 0 metrics = gap?)
- ✅ Duplicate entries → **What constitutes duplicate?** (same company + title + overlapping dates?)

#### Best Practice Gaps:
- ✅ Metrics per story ratio → **Confirm: 2-3 metrics per story?** (below 2 = gap?)
- ✅ Story count per role → **Confirm thresholds:**
  - Associate PM: X stories?
  - PM: X stories?
  - Sr PM: 3-5 stories (as stated)?
  - Lead PM: X stories?
- ✅ Quantification level → **What counts as "quantified"?**
  - Must have: percentage OR dollar amount OR timeframe?
  - Examples: "+22%" = good, "increased engagement" = bad?
- ✅ Specificity → **What's "too generic"?**
  - Patterns to flag: "managed team", "worked on features", "contributed to" without specifics?
  - Should I use LLM to assess or rule-based keywords?

#### Role-Level Expectations:
- ✅ Sr PM gaps → **What evidence should I check for?**
  - Strategic thinking: presence of "strategy", "roadmap", "vision" keywords?
  - Organizational influence: cross-functional mentions, team size, scope?
- ✅ Lead PM gaps → **What to check?**
  - Technical leadership: tech stack mentions, architecture decisions?
  - Domain expertise: deep domain keywords, certifications?
- **Question:** How do I know the user's target level? From `profiles` table? Or infer from current role titles?

### 2. Database Schema for Gap Storage

**Decision needed:** How should gaps be stored?

**Option A:** Add JSONB column to existing tables
```sql
ALTER TABLE work_items ADD COLUMN gaps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE approved_content ADD COLUMN gaps JSONB DEFAULT '[]'::jsonb;
```

**Option B:** Separate `gaps` table
```sql
CREATE TABLE gaps (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  entity_type TEXT, -- 'work_item' | 'approved_content'
  entity_id UUID,
  gap_type TEXT, -- 'data_quality' | 'best_practice' | 'role_expectation'
  gap_category TEXT, -- 'missing_metrics', 'insufficient_quantification', etc.
  severity TEXT, -- 'high' | 'medium' | 'low'
  description TEXT,
  suggestions JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Option C:** Compute on-the-fly (no storage, just real-time detection)

**Recommendation:** Option A for MVP (simplest), Option B for long-term tracking.

### 3. Gap Resolution Tracking

**Question:** Should users be able to "resolve" gaps, or are they just warnings?
- If resoluble: Add `resolved_at` timestamp?
- If just warnings: Store but don't track resolution?

### 4. Test Data Scenarios

**Confirm:** I can use synthetic profiles (P01-P10) for testing?
- ✅ I have access to these
- ✅ Will test gap detection against known data issues

### 5. Branch Naming Convention

**Question:** Branch naming preference?
- Option A: `feature/mvp-phase-1-prototype-separation`
- Option B: `mvp/phase-1-prototype-separation`
- Option C: Your preference?

### 6. Commit Message Style

**Question:** Preferred commit message format?
- Conventional Commits? (`feat:`, `fix:`, `refactor:`)
- Simple descriptive?
- Include phase number?

---

## 📋 My Implementation Strategy

### Testing Approach

1. **Unit Tests** (Vitest):
   - Gap detection logic (each gap type)
   - Empty state components
   - Prototype removal verification

2. **Integration Tests**:
   - Database operations (gap storage/retrieval)
   - Service methods with real Supabase calls
   - Empty state rendering with real data

3. **Functional Tests** (Browser Automation):
   - Verify no prototype UI elements appear
   - Verify empty states show correctly for users with no data
   - Verify gap warnings appear in Work History
   - Check Console for errors

4. **E2E Tests**:
   - Complete onboarding → verify gaps detected
   - Add work history → verify gaps update
   - Resolve gap → verify UI updates (if applicable)

5. **Performance Tests**:
   - Gap detection service performance (< 500ms for 50 work items)
   - Empty state rendering (< 100ms)

### Branching Strategy

1. Create feature branch: `mvp/phases-1-3-autonomous`
2. Create sub-branches as needed:
   - `mvp/phase-1-prototype-separation`
   - `mvp/phase-2-empty-states`
   - `mvp/phase-3-gap-detection`
3. Merge to `feature/content-review-and-dashboard-integration` after each phase
4. Regular commits (after each logical unit)

### Browser Automation Verification

For each phase, I'll:
1. Start dev server
2. Navigate to key pages
3. Verify UI state (empty states, no prototype code)
4. Check Console for errors/warnings
5. Verify gap detection displays correctly
6. Capture screenshots for verification

---

## 🎯 Deliverables

After completion, you'll have:

1. ✅ **usability-test branch** with all prototype code preserved
2. ✅ **Main branch** with prototype code removed
3. ✅ **Empty state components** for all pages
4. ✅ **Gap detection service** fully implemented and tested
5. ✅ **Comprehensive test suite** (unit, integration, functional, E2E)
6. ✅ **Documentation** of gap detection rules and thresholds
7. ✅ **Browser automation verification** results

---

## ⚠️ Assumptions I'll Make (If Not Specified)

1. **Gap thresholds:** I'll use conservative defaults:
   - < 2 metrics per story = gap
   - < 3 stories for Sr PM roles = gap
   - Missing dates = gap
   - Generic descriptions (keyword-based) = gap

2. **Database:** Option A (JSONB columns) for MVP simplicity

3. **Gap resolution:** Track but don't require user action (warnings only)

4. **Target level inference:** From most recent role title (infer "Sr" from "Senior Product Manager")

5. **Branch naming:** `mvp/phase-X-description`

---

## 🚀 Ready to Proceed?

Once you confirm:
1. Gap detection rules/thresholds
2. Database schema preference
3. Branch naming preference
4. Any other clarifications

I'll begin implementation immediately and deliver all three phases with full testing and browser verification.

