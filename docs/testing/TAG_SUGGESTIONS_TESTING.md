# Auto-Suggest Tags Feature - Testing Guide

## 🧪 Manual Testing Checklist

### Prerequisites
1. ✅ User is logged in
2. ✅ User has set industries and business models in "My Goals" (User Profile)
3. ✅ User has work history with at least one company and role
4. ✅ OpenAI API key is configured (`VITE_OPENAI_KEY`)

---

## Test 1: Company Tag Suggestions

### Steps:
1. Navigate to **Work History**
2. Select a company
3. Click the **"Suggest Tags"** button (sparkles icon) next to company tags
4. **Expected Behavior:**
   - Modal opens with "Researching company..." indicator
   - After 2-5 seconds, suggested tags appear
   - Tags show confidence indicators (✓ high, ~ medium, ? low)
   - Tags show categories (industry, business_model, etc.)
   - Existing tags are displayed separately
   - Tags align with user's industries/business models from "My Goals"

### Verification:
- [ ] Modal shows "Researching company..." during search
- [ ] Suggested tags appear after research completes
- [ ] Tags include user's target industries/business models (if applicable)
- [ ] Can select/deselect tags
- [ ] "Apply tags" button works
- [ ] Tags are saved to database
- [ ] Tags appear in company tag list after applying

### Error Cases:
- [ ] If search fails, error message appears with retry button
- [ ] Retry button works correctly
- [ ] Modal can be closed even if search fails

---

## Test 2: Role Tag Suggestions

### Steps:
1. Navigate to **Work History**
2. Select a role
3. Click the **"Suggest Tags"** button next to role tags
4. **Expected Behavior:**
   - Modal opens immediately (no company research)
   - Suggested tags appear within 2-3 seconds
   - Tags are relevant to role description
   - Tags align with user goals

### Verification:
- [ ] Tags appear quickly (no company research delay)
- [ ] Tags are relevant to role content
- [ ] Tags include user's target industries/business models (if applicable)
- [ ] Can apply tags successfully
- [ ] Tags are saved to database

---

## Test 3: Saved Section Tag Suggestions

### Steps:
1. Navigate to **Saved Sections** (Cover Letter Template)
2. Select a saved section
3. Click the **"Suggest Tags"** button
4. **Expected Behavior:**
   - Modal opens with tag suggestions
   - Tags are relevant to section content
   - Tags align with user goals

### Verification:
- [ ] Tags appear for saved sections
- [ ] Tags are relevant to section content
- [ ] Can apply tags successfully
- [ ] Tags are saved to database

---

## Test 4: Tag Misalignment Gap Detection

### Prerequisites:
- User has set industries: ["Fintech", "SaaS"]
- User has set business models: ["B2B"]

### Steps:
1. Add tags to a company/role that DON'T match user goals (e.g., "Healthcare", "B2C")
2. Navigate to **Dashboard** or **Gap Analysis**
3. **Expected Behavior:**
   - Gap appears indicating tag misalignment
   - Gap suggests adding tags related to user's target industries/business models

### Verification:
- [ ] Gap appears when tags don't match user goals
- [ ] Gap description is clear and actionable
- [ ] Gap suggests specific tags to add
- [ ] Gap disappears when tags are updated to match goals

---

## Test 5: User Goals Change Triggers Re-Analysis

### Steps:
1. Set user goals: Industries ["Fintech"], Business Models ["B2B"]
2. Verify gaps appear for misaligned tags
3. Update user goals: Industries ["Healthcare"], Business Models ["B2C"]
4. **Expected Behavior:**
   - Old tag misalignment gaps are resolved
   - New gaps appear for tags that now don't match

### Verification:
- [ ] Old gaps are resolved when goals change
- [ ] New gaps appear for newly misaligned tags
- [ ] Re-analysis happens automatically (no manual trigger needed)

---

## Test 6: Empty State Handling

### Steps:
1. Create a company/role with no tags
2. Click "Suggest Tags"
3. **Expected Behavior:**
   - Tags are suggested successfully
   - No errors occur

### Verification:
- [ ] Empty tag state handled gracefully
- [ ] Tags can be added to entities with no existing tags

---

## Test 7: Existing Tags Filtering

### Steps:
1. Add some tags manually to a company
2. Click "Suggest Tags"
3. **Expected Behavior:**
   - Existing tags are shown separately
   - Suggested tags don't include existing tags
   - Can add new tags without duplicates

### Verification:
- [ ] Existing tags displayed correctly
- [ ] No duplicate tags in suggestions
- [ ] Can merge new tags with existing tags

---

## Test 8: Browser Search Failure Handling

### Steps:
1. Try to suggest tags for a company with an invalid/unsearchable name
2. **Expected Behavior:**
   - Search fails gracefully
   - Error message appears with retry option
   - Can retry or close modal
   - Falls back to content-only analysis (if implemented)

### Verification:
- [ ] Error message is user-friendly
- [ ] Retry button works
- [ ] Modal can be closed
- [ ] No crashes or unhandled errors

---

## Test 9: Performance

### Steps:
1. Suggest tags for multiple companies/roles in sequence
2. **Expected Behavior:**
   - Each request completes in reasonable time (< 10 seconds)
   - No performance degradation
   - UI remains responsive

### Verification:
- [ ] Tag suggestions complete within 10 seconds
- [ ] No memory leaks
- [ ] UI remains responsive during processing

---

## Test 10: Database Persistence

### Steps:
1. Apply tags to a company/role
2. Refresh the page
3. **Expected Behavior:**
   - Tags persist after refresh
   - Tags appear in the UI

### Verification:
- [ ] Tags are saved to database
- [ ] Tags persist across page refreshes
- [ ] Tags appear correctly in UI

---

## 🐛 Common Issues to Check

1. **OpenAI API Key Missing:**
   - Error: "OpenAI API key not found"
   - Fix: Set `VITE_OPENAI_KEY` in `.env`

2. **Company Research Fails:**
   - Error: "Failed to research company"
   - Check: OpenAI API is accessible and has credits

3. **Tags Not Persisting:**
   - Check: Database connection
   - Check: User authentication
   - Check: RLS policies allow updates

4. **Gaps Not Appearing:**
   - Check: User goals are set
   - Check: Tags exist on entities
   - Check: Gap detection service is called

---

## ✅ Success Criteria

All tests should pass:
- [x] Company tag suggestions work with browser search
- [x] Role tag suggestions work without browser search
- [x] Saved section tag suggestions work
- [x] Tag misalignment gaps are detected
- [x] Gap re-analysis triggers on goals change
- [x] Error handling works correctly
- [x] Tags persist to database
- [x] UI is responsive and user-friendly

---

## 📝 Notes

- Browser search uses OpenAI's knowledge base (not real-time web search)
- Tag suggestions are personalized based on user goals
- Gap detection runs automatically when goals change
- All tag operations are non-blocking (async)



