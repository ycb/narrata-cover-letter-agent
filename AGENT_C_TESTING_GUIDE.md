# Agent C - Testing Guide

## Overview
This guide provides step-by-step instructions for testing the Agent C implementation (Match Intelligence & UI Wiring).

## Prerequisites
- Application running locally (`npm run dev` or equivalent)
- User account with:
  - Work history (at least 1-2 work items with achievements)
  - Approved content/stories (at least 1-2 stories)
  - Optional: Career goals configured

## Test Scenarios

### Test 1: Single LLM Call Verification

**Goal:** Verify that draft creation makes only ONE LLM call for match analysis.

**Steps:**
1. Open browser DevTools Network tab
2. Filter for `api.openai.com` requests
3. Navigate to Cover Letters page
4. Click "Create New Letter"
5. Paste a job description with clear requirements
6. Click "Generate Draft"
7. **Monitor Network Tab** during generation

**Expected Results:**
- ✅ See ONE request to `chat/completions` during metrics phase
- ✅ Progress indicator shows: "AI analyzing draft quality..."
- ✅ NO additional LLM calls for goals/requirements/experience/rating/ATS
- ✅ Draft creation completes successfully

**Success Criteria:**
- Total OpenAI API calls during draft creation: **1 call** (excluding template/section generation)
- Response includes `enhancedMatchData` in the payload

---

### Test 2: Enhanced Match Data Storage

**Goal:** Verify enhancedMatchData is stored in database and retrieved correctly.

**Steps:**
1. Create a draft (see Test 1)
2. Open browser DevTools Console
3. After draft creation, inspect the draft object
4. Check database (if accessible) or network response

**Expected Results:**
- ✅ Draft object contains `llmFeedback.enhancedMatchData`
- ✅ `enhancedMatchData` includes:
  - `goalMatches` array
  - `coreRequirementDetails` array
  - `preferredRequirementDetails` array
  - `coreExperienceDetails` array
  - `preferredExperienceDetails` array
  - `differentiatorAnalysis` object
  - `ctaHooks` array

**Success Criteria:**
- All fields are populated (not null/undefined)
- Arrays contain actual data matching job requirements

---

### Test 3: Match Metrics Bar Display

**Goal:** Verify match metrics bar shows real data from enhanced analysis.

**Steps:**
1. Open a created draft in Edit mode
2. Observe the metrics bar at top of page
3. Verify all 6 metrics are displayed:
   - Match with Goals
   - Match with Experience
   - Core Requirements
   - Preferred Requirements
   - Cover Letter Rating
   - ATS Score

**Expected Results:**
- ✅ All metrics show actual values (not "N/A" or mock data)
- ✅ Metrics reflect analysis results:
  - Goals: "strong"/"average"/"weak" based on user goals
  - Experience: "strong"/"average"/"weak" based on work history
  - Core Reqs: "X/Y" count of met requirements
  - Preferred Reqs: "X/Y" count of met requirements
  - Rating: 0-100 score
  - ATS: 0-100 score

**Success Criteria:**
- Metrics are consistent with job requirements
- Counts match number of requirements in JD
- No placeholder or mock data visible

---

### Test 4: Goals Match Tooltip with Real Data

**Goal:** Verify Goals Match tooltip displays detailed breakdown.

**Steps:**
1. Hover over "MATCH WITH GOALS" metric
2. Observe tooltip content
3. Check for detailed goal matches

**Expected Results:**
- ✅ Tooltip opens with full-width display
- ✅ If user has goals configured:
  - Shows list of goal matches (Title, Salary, Work Type, etc.)
  - Each match shows: goal type, user value, job value, met status
  - Evidence text explains match/mismatch
- ✅ If user has NO goals:
  - Shows "Set up your career goals" message
  - "Edit Goals" button is visible

**Success Criteria:**
- Data matches user's actual career goals
- Evidence is specific to the job description
- No generic placeholders

---

### Test 5: Requirements Match Tooltips

**Goal:** Verify Core and Preferred Requirements tooltips show what's in draft.

**Steps:**
1. Hover over "CORE REQS" metric
2. Observe requirements list
3. Repeat for "PREFERRED REQS"

**Expected Results:**
- ✅ Core Requirements tooltip shows:
  - List of all core requirements from JD
  - Checkmark for demonstrated requirements
  - X or indicator for missing requirements
  - Evidence shows which section mentions it
- ✅ Preferred Requirements tooltip shows same structure

**Success Criteria:**
- Requirements match the job description
- Demonstrated status reflects actual draft content
- Evidence references actual sections (intro, experience, etc.)

---

### Test 6: Experience Match Tooltip with Confidence

**Goal:** Verify Experience Match shows work history analysis.

**Steps:**
1. Hover over "MATCH WITH EXPERIENCE" metric
2. Observe experience matches
3. Check confidence levels and evidence

**Expected Results:**
- ✅ Tooltip shows combined core + preferred requirements
- ✅ Each requirement shows:
  - Confidence level: High/Medium/Low
  - Referenced work items (company, role)
  - Referenced stories (title)
  - Evidence explaining the match
- ✅ Low confidence items suggest what's missing

**Success Criteria:**
- Work item IDs and story IDs reference actual user data
- Evidence is specific and accurate
- Confidence reflects quality of match

---

### Test 7: Edit Goals CTA Action

**Goal:** Verify "Edit Goals" CTA opens goals modal.

**Steps:**
1. Open draft in Edit mode
2. Hover over "MATCH WITH GOALS" metric
3. Click "Edit Goals" button in tooltip
4. Make changes to goals
5. Save goals

**Expected Results:**
- ✅ User Goals Modal opens
- ✅ Current goals are pre-filled (if any exist)
- ✅ Can edit goals (title, salary, work type, etc.)
- ✅ Save button persists changes
- ✅ Modal closes after save
- ✅ Page refreshes to show updated goals match (optional)

**Success Criteria:**
- CTA successfully triggers modal
- Changes are saved
- No errors in console

---

### Test 8: Differentiator Analysis Verification

**Goal:** Verify differentiator analysis is present and accurate.

**Steps:**
1. Create draft with JD that has unique requirements
2. Inspect enhancedMatchData in console
3. Check `differentiatorAnalysis` object

**Expected Results:**
- ✅ `differentiatorAnalysis` contains:
  - `summary`: What makes this role unique
  - `userPositioning`: How user should position themselves
  - `strengthAreas`: User's relevant strengths
  - `gapAreas`: Areas where user may be weak
- ✅ Content is specific to the job description

**Success Criteria:**
- Analysis reflects unique aspects of the JD
- Positioning advice is actionable
- Not generic advice

---

### Test 9: CTA Hooks Presence

**Goal:** Verify CTA hooks are generated for improvements.

**Steps:**
1. Create draft with some unmet requirements
2. Inspect enhancedMatchData
3. Check `ctaHooks` array

**Expected Results:**
- ✅ `ctaHooks` contains 3-5 actionable suggestions
- ✅ Each hook includes:
  - `type`: add-story | edit-goals | enhance-section | add-metrics
  - `label`: Descriptive action label
  - `requirement`: Which requirement it addresses
  - `severity`: high | medium | low
- ✅ Hooks are prioritized by severity

**Success Criteria:**
- CTAs are specific to gaps in the draft
- Labels are clear and actionable
- Severity reflects importance

---

### Test 10: Fallback Behavior

**Goal:** Verify graceful degradation when LLM fails.

**Steps:**
1. Disconnect internet or block OpenAI API
2. Create a new draft
3. Observe behavior during metrics calculation

**Expected Results:**
- ✅ Draft creation does NOT fail completely
- ✅ Progress shows: "Using estimated metrics (AI analysis unavailable)"
- ✅ Metrics bar shows fallback values:
  - Goals: "average"
  - Experience: "average"
  - Rating: 70
  - ATS: 70
  - Core Reqs: 0/0
  - Preferred Reqs: 0/0
- ✅ `enhancedMatchData` is undefined or null
- ✅ User can still view and edit draft

**Success Criteria:**
- System remains functional
- User is informed about analysis unavailability
- No crashes or errors

---

### Test 11: End-to-End Flow

**Goal:** Test complete workflow from draft creation to CTA action.

**Steps:**
1. **Setup:**
   - Configure career goals
   - Add 2-3 work items with achievements
   - Create 2-3 approved stories

2. **Create Draft:**
   - Paste job description with 5+ core requirements
   - Generate draft
   - Verify single LLM call

3. **View Metrics:**
   - Open draft in Edit mode
   - Observe all 6 metrics
   - Verify values are realistic

4. **Explore Tooltips:**
   - Hover over each metric
   - Check for real data
   - Verify evidence is specific

5. **Use CTA:**
   - Click "Edit Goals" in tooltip
   - Update a goal
   - Save and verify modal closes

6. **Verify Persistence:**
   - Close draft
   - Reopen draft
   - Verify metrics persist
   - Verify enhancedMatchData is still available

**Expected Results:**
- ✅ Complete flow works without errors
- ✅ Data flows correctly through all components
- ✅ CTAs trigger expected actions
- ✅ Data persists across page reloads

**Success Criteria:**
- Zero console errors
- All data displays correctly
- CTAs are functional
- Performance is acceptable (< 30s for draft creation)

---

## Performance Benchmarks

### Target Metrics
- **Draft Creation Time:** < 30 seconds
- **LLM Calls:** Exactly 1 (for metrics)
- **Token Usage:** ~3500 tokens
- **Cost per Draft:** ~$0.01 (at GPT-4 prices)

### Monitoring
Watch for:
- Multiple LLM calls (indicates consolidation failed)
- Empty enhancedMatchData (indicates parsing issues)
- Generic tooltip content (indicates mock data fallback)
- Slow response times (> 30s)

---

## Troubleshooting

### Issue: enhancedMatchData is null/undefined
**Diagnosis:**
- Check browser console for errors
- Check Network tab for API response
- Verify prompt is correctly formatted

**Fix:**
- LLM may have returned invalid JSON
- Check `llmFeedback.raw` for debugging
- Fallback metrics should still work

---

### Issue: Tooltips show no data
**Diagnosis:**
- Check if enhancedMatchData exists in draft object
- Check component props in React DevTools
- Verify data is being passed through modal → view → tooltips

**Fix:**
- Ensure `toModalPayload` extracts enhancedMatchData
- Ensure modals pass data to CoverLetterDraftView
- Ensure ProgressIndicatorWithTooltips receives enhancedMatchData

---

### Issue: Edit Goals button doesn't work
**Diagnosis:**
- Check if onEditGoals prop is passed
- Check if UserGoalsModal is rendered
- Check browser console for errors

**Fix:**
- Verify CoverLetters.tsx passes handleEditGoals
- Verify modals accept and pass onEditGoals prop
- Check that modal state is managed correctly

---

### Issue: Multiple LLM calls observed
**Diagnosis:**
- Check if old services are still being called
- Check CoverLetterDraftService for additional LLM invocations

**Fix:**
- Ensure only metricsStreamer is called
- Verify no separate calls to goals/requirements/experience services
- Check that consolidated prompt is being used

---

## Success Criteria Summary

✅ **Single LLM Call:** Only ONE API call during metrics phase
✅ **Real Data:** All metrics show actual analysis (no mock data)
✅ **Enhanced Match Data:** Stored and retrieved correctly
✅ **Tooltips:** Display detailed breakdowns with evidence
✅ **CTAs:** Edit Goals button opens goals modal
✅ **CTA Hooks:** Present in enhancedMatchData
✅ **Differentiator:** Analysis is specific and actionable
✅ **Fallback:** Graceful degradation when LLM fails
✅ **Performance:** Draft creation < 30 seconds
✅ **Persistence:** Data survives page reloads

---

## Next Steps After Testing

1. **Fix Any Issues:** Address bugs found during testing
2. **Add More CTAs:** Wire "Add Story" and other CTA types
3. **Enhance Tooltips:** Add more interactive elements
4. **Performance Optimization:** If creation is slow, investigate
5. **User Feedback:** Get real users to test the flow

---

## Test Results Template

```markdown
## Test Results - [Date]

Tester: [Name]
Environment: [Local/Staging/Production]

### Test 1: Single LLM Call
- [ ] PASS / [ ] FAIL
- Notes: 

### Test 2: Enhanced Match Data
- [ ] PASS / [ ] FAIL
- Notes:

### Test 3: Match Metrics Bar
- [ ] PASS / [ ] FAIL
- Notes:

### Test 4: Goals Match Tooltip
- [ ] PASS / [ ] FAIL
- Notes:

### Test 5: Requirements Tooltips
- [ ] PASS / [ ] FAIL
- Notes:

### Test 6: Experience Match Tooltip
- [ ] PASS / [ ] FAIL
- Notes:

### Test 7: Edit Goals CTA
- [ ] PASS / [ ] FAIL
- Notes:

### Test 8: Differentiator Analysis
- [ ] PASS / [ ] FAIL
- Notes:

### Test 9: CTA Hooks
- [ ] PASS / [ ] FAIL
- Notes:

### Test 10: Fallback Behavior
- [ ] PASS / [ ] FAIL
- Notes:

### Test 11: End-to-End Flow
- [ ] PASS / [ ] FAIL
- Notes:

### Overall Assessment
- [ ] All tests passed
- [ ] Some tests failed (see notes)
- [ ] Blockers found

### Issues Found
1. 
2. 
3. 

### Next Steps
1. 
2. 
3. 
```

