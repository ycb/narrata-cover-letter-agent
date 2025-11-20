# Tag Filtering - Quick Test Guide

## What Was Fixed
Previously, ALL sections showed ALL met requirements (duplicates everywhere). Now each section shows only the requirements it specifically addresses.

---

## Quick Manual Test

### Test Scenario: Create Draft with Supio JD

1. **Create New Draft**
   - Go to Cover Letters → Create New
   - Select Supio PM JD (or any JD with multiple requirements)
   - Let it generate

2. **Check Introduction Section**
   - Look at tags under "Job Requirements"
   - Should see: 2-3 requirements specific to intro
   - Example: "5+ years experience", "Strong communication"

3. **Check Experience Section**
   - Look at tags under "Job Requirements"
   - Should see: Different set of 3-4 requirements
   - Example: "Bachelor's degree", "Cross-functional management", "Data-driven approach"

4. **Check Closing Section**
   - Look at tags under "Job Requirements"
   - May see: 1-2 requirements or none at all
   - Example: "Enthusiasm for role", "Company alignment"

5. **Verify No Duplicates**
   - Scroll through all sections
   - Each requirement should appear on ONLY ONE section
   - No "5+ years experience" appearing on all sections

---

## What to Look For

### ✅ PASS Criteria
- Each section has different tags (or "None yet" if empty)
- Tags match what's actually discussed in that section
- No tag appears on multiple sections
- **All sections show "Requirements Met" heading** (persistent)
- Empty sections show "None yet" in italics

### ❌ FAIL Indicators
- All sections show identical tags
- Tags don't match section content
- Same requirement appears on multiple sections
- Tag section is completely hidden (should always show "Requirements Met")
- Shows "+ Add tag" button (tags are system-generated, not user-editable)

---

## Visual Features (Phase 2 - Optional)

Once we switch to structured tags:

### Color Coding
- **Green badges** = Core requirements (must-have)
- **Blue badges** = Preferred requirements (nice-to-have)

### Tooltips (Hover)
- Hover over any tag
- Should see popup with:
  - "Core" or "Preferred" badge
  - Severity level
  - Evidence text explaining how you address it

---

## Browser DevTools Check

If you want to verify the data structure:

1. Open browser DevTools (F12)
2. Go to React DevTools (if installed)
3. Select `<CoverLetterDraftView>` component
4. Check props → `enhancedMatchData`
5. Look at `coreRequirementDetails[0].sectionIds`
6. Should see array like: `["introduction"]` or `["experience"]`
7. NOT: `["introduction", "experience", "closing"]` for all requirements

---

## Fallback Behavior

### If No Enhanced Match Data
- Shows generic fallback tags per section type:
  - Intro: "quantifiable achievements", "specific metrics"
  - Experience: "technical skills", "leadership experience"
  - Closing: "enthusiasm", "company alignment"

### If Empty Section
- No "Job Requirements" heading shown
- No empty badge list
- Clean, minimal UI

---

## Expected Output Example

```
┌─────────────────────────────────────┐
│ Introduction                     ⋮  │
├─────────────────────────────────────┤
│ Several years of product...         │
│                                     │
│ 🏷️ Requirements Met                │
│ [5+ years PM experience]            │
│ [Strong Communication Skills]       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Experience                       ⋮  │
├─────────────────────────────────────┤
│ At previous role, I led...          │
│                                     │
│ 🏷️ Requirements Met                │
│ [Bachelor's Degree]                 │
│ [Data-Driven Decision Making]       │
│ [Cross-Functional Management]       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Closing                          ⋮  │
├─────────────────────────────────────┤
│ I look forward to...                │
│                                     │
│ 🏷️ Requirements Met                │
│ ┊None yet┊ (dashed skeleton badge) │
└─────────────────────────────────────┘
```

**Key observations:** 
- Each section has DIFFERENT tags (or skeleton "None yet" badge)
- Tag section is ALWAYS visible (persistent)
- System state is always clear
- Empty state uses skeleton/ghost badge style (dashed outline)

---

## Common Issues & Solutions

### Issue: All sections still show same tags
**Cause:** `sectionIds` not populated by LLM
**Fix:** Re-generate draft (new prompt will guide LLM)

### Issue: No tags showing at all
**Cause:** `enhancedMatchData` missing or empty
**Check:** DevTools → props → enhancedMatchData should exist
**Fix:** Ensure draft generation completed successfully

### Issue: Tags don't match content
**Cause:** LLM misidentified which section addresses requirement
**Expected:** May happen occasionally with ambiguous content
**Note:** User can edit content to make it clearer

### Issue: Section should have tags but shows none
**Cause:** Section type mismatch (e.g., "intro" vs "introduction")
**Fix:** Already handled by normalizeSectionType helper
**If persists:** Check section.type in DevTools

---

## Regression Tests

Before shipping, verify:

- [ ] Works with existing drafts (no crashes)
- [ ] Works with missing enhancedMatchData (shows fallback)
- [ ] Works with empty sectionIds array (shows no tags)
- [ ] Works with multiple sections addressing same requirement (shows on all)
- [ ] Doesn't break Stories page (still uses simple string tags)
- [ ] Doesn't break Saved Sections (still uses simple string tags)

---

## Debug Mode

To see what's happening under the hood:

```javascript
// In CoverLetterDraftView.tsx, temporarily add:
console.log('Section:', section.type);
console.log('Requirements:', requirements);
console.log('EnhancedMatchData:', enhancedMatchData);
```

This will show in browser console which requirements are matched to which sections.

---

## Questions?

- Check `TAG_IMPROVEMENT_IMPLEMENTATION_SUMMARY.md` for technical details
- Check `TAG_IMPROVEMENT_PLAN.md` for original requirements
- Review code comments in `CoverLetterDraftView.tsx` for filtering logic

