# PM Levels M2 Support + Story Extraction Improvements

## Date
2025-12-09

## Summary
Added M2/VP level support to PM levels framework and improved story extraction reliability for complex resumes.

---

## Part 1: Add PM Levels M2/VP Support

### Problem
The PM levels framework stopped at M1 ("Group Product Manager"), with no level defined for VP/senior leadership roles. Jungwon's extensive VP-level experience couldn't be recognized at the appropriate level.

### Solution
Added M2 level at score threshold ≥ 6.5:
- **M1** ("Group Product Manager"): 5.5 - 6.5
- **M2** ("VP of Product"): ≥ 6.5

Updated display mappings:
- `pmLevelsService.ts`: `mapLevelScoreToLevel()` now returns M2 for scores ≥ 6.5
- `pmLevelsService.ts`: `mapLevelCodeToDisplay()` now maps M2 → "VP of Product"
- `CareerLadder.tsx`: Updated M2 to "VP of Product" with "12+ years" and "Executive leadership"

### Files Changed
- `src/services/pmLevelsService.ts` (lines 731-755, 2296-2307)
- `src/components/assessment/CareerLadder.tsx` (lines 59-66)

### Impact
- Users with exceptional scores (≥ 6.5) will now be rated as M2/VP
- Career ladder UI now displays "VP of Product" as the top management level
- "Senior Leadership" (SVP/CPO) remains in "coming soon" state

### Note on Scoring
The original thresholds (M1 at 5.5+, now M2 at 6.5+) suggest that either:
1. The LLM sometimes returns competency scores > 3 (above the prompt's 0-3 scale)
2. There's a different scoring mechanism that can produce higher scores
3. The scoring formula or scale changed at some point

The thresholds were kept as-is to avoid breaking existing M1 assignments.

---

## Part 2: Improve Story Extraction Reliability

[Rest of document unchanged...]
