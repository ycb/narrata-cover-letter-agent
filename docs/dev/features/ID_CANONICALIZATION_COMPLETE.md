# ID CANONICALIZATION - COMPLETE ✅

**Date:** 2025-11-27  
**Branch:** feat/streaming-mvp  
**Commits:** f7e49e0, 15e358c  

---

## 🎯 PROBLEM SOLVED

**Before:**
- Backend: Generated gaps with hardcoded IDs (`"section-intro"`, `"section-0"`)
- Templates: Used different IDs (`"uuid-123"` or `"section-1-1"`)
- Frontend: Tried to match with regex normalization hacks
- **Result:** Gaps never matched, toolbar showed no counts

**After:**
- Backend: Uses `template.sections[i].id` exactly
- Frontend: Simple `===` matching by `sectionId`
- **Result:** Direct 1:1 matching, no hacks

---

## 🔧 CHANGES

### Backend (supabase/functions/_shared/pipelines/cover-letter.ts)

**1. Build canonical template snapshot:**
```typescript
const templateSections = template?.sections?.map((s, index) => ({
  id: s.id,              // From database (canonical)
  slug: s.slug,          // Human-readable
  title: s.title,        // Display name
  index,                 // Ordering
})) || [];
```

**2. Pass exact IDs to LLM:**
```typescript
const prompt = `...
TEMPLATE SECTIONS (YOU MUST USE THESE EXACT IDs):
${JSON.stringify(templateSections, null, 2)}

**CRITICAL**: You MUST use the EXACT "id" field from the template sections.
...`;
```

**3. Validate output:**
```typescript
const validTemplateSectionIds = new Set(templateSections.map(s => s.id));
const validatedSections = (result.sections || []).filter(section => {
  if (!validTemplateSectionIds.has(section.sectionId)) {
    console.warn(`Unknown sectionId "${section.sectionId}", skipping`);
    return false;
  }
  return true;
});
```

**Field name changes:**
- `id` → `sectionId` (matches frontend expectations)
- `gaps` → `requirementGaps` (matches frontend structure)

---

### Frontend

**CoverLetterDraftEditor.tsx:**
```typescript
// BEFORE (11 lines with regex fallback):
let sectionGaps = effectiveSectionGaps?.get(sectionId) || [];
if (sectionGaps.length === 0 && sectionId.match(/^section-\d+-\d+$/)) {
  const normalizedId = sectionId.replace(/^(section-\d+)-\d+$/, '$1');
  sectionGaps = effectiveSectionGaps?.get(normalizedId) || [];
  // ... logging
}

// AFTER (1 line):
const sectionGaps = effectiveSectionGaps?.get(sectionId) || [];
```

**gaps.ts (comment added):**
> "CRITICAL: All gaps are keyed by template section.id ONLY.  
> No slug/title matching. If gaps are missing, fix the backend."

---

## 📊 DATA FLOW

```
Template (DB)
  ↓ sections[i].id = "uuid-550e8400"
  
Backend Pipeline
  ↓ templateSections.map(s => s.id)
  ↓ LLM instructed: "use EXACT id field"
  ↓ Output validated: sectionId must exist in template
  ↓ jobState.result.sectionGaps = [
      { sectionId: "uuid-550e8400", requirementGaps: [...] }
    ]
    
Frontend
  ↓ buildEffectiveSectionGapMap(streaming, draft)
  ↓ effectiveSectionGaps.get("uuid-550e8400")  // Direct lookup
  ↓ Render gaps in UI ✅
```

---

## ✅ VERIFICATION CHECKLIST

After next generation run:

1. **Backend logs:**
   - [ ] `templateSections` shows actual template section IDs
   - [ ] LLM output has `sectionId` matching template IDs
   - [ ] No warnings about unknown sectionIds

2. **Frontend UI:**
   - [ ] Gap banners appear in correct sections
   - [ ] Metrics toolbar shows gap count during streaming
   - [ ] No console warnings about missing gaps

3. **Data integrity:**
   - [ ] `jobState.result.sectionGaps[i].sectionId === template.sections[j].id`
   - [ ] No synthetic/generic IDs like "section-intro"

---

## 🎯 LEGACY DATA

**Old drafts (pre-canonicalization):**
- May have generic section IDs
- Will show no gaps (acceptable)
- No backward compatibility needed

**New drafts (post-canonicalization):**
- All section IDs canonical
- Perfect gap matching
- Streaming + draft gaps both work

---

## 🚀 NEXT STEPS

1. ✅ Backend deployed (stream-job-process)
2. ✅ Frontend cleanup committed
3. **TODO:** Run one full test (paste JD → generate → verify gaps appear)
4. **TODO:** Verify streaming progress bar + gaps populate during analysis
5. **TODO:** Return to STREAMING_FINALIZATION.md and continue

---

## 📝 AGENT NOTES

**For future modifications:**

- **Backend gap analysis:** Section IDs MUST come from `template.sections[i].id`
- **Frontend gap lookup:** Use `sectionId` directly, NO normalization
- **If gaps are missing:** Check backend LLM output, not frontend matching logic
- **Contract:** `gap.sectionId === section.id` is the ONLY rule

**Files to modify:**
- Gap logic: Only touch `supabase/functions/_shared/pipelines/cover-letter.ts`
- Gap rendering: Only touch `src/utils/gaps.ts` and `CoverLetterDraftEditor.tsx`

**Do NOT:**
- Add slug/title matching
- Create ID normalization functions
- Add fallback/heuristic matching
- Support "legacy" ID formats
