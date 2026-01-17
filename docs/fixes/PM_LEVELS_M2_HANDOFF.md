# PM Levels M2 Support - Current State & Handoff

## Problem Statement
Jungwon Yang has $250M+ budget and 350+ headcount in work history but is consistently rated as "Group Product Manager" (M1, icLevel: 8) instead of "VP of Product" (M2, icLevel: 9).

## What Has Been Implemented ✅

### 1. M2 Framework Support (Commit: e0fcb78, 700920d)
- Added M2 threshold to `mapLevel()` function: `if (score >= 9) return { levelCode: 'M2', displayLevel: 'VP of Product' }`
- Updated `CareerLadder.tsx` UI to display "VP of Product" for M2 level
- Updated `mapLevelCodeToDisplay()` to map 'M2' to "VP of Product"

### 2. Fixed Metrics Truncation (Commit: 5d383d6) ✅ **CRITICAL FIX**
**Root cause discovered**: Stage 1 prompt builder in `pm-levels.ts` used `.slice(0, 3)` on metrics array, cutting off metrics at positions 4-5.

Jungwon's $250M budget and 350+ headcount were metrics #4 and #5, so they never reached the LLM.

**Fix applied**: Removed `.slice(0, 3)` to include ALL metrics in Stage 1 input.

**File**: `supabase/functions/_shared/pipelines/pm-levels.ts` lines 39-56

### 3. Enhanced Prompt Context (Commit: 9cf973b)
- Stage 1 now includes `work_items.description` and formatted `work_items.metrics`
- Format: `Key metrics: 40M total users acquired, 16M users expanded to in 16 months, 70% monthly engagement maintained, 350+ headcount scaled to, $250M+ annual budget increased to`

### 4. Prompt Enhancements (Commits: 29c88c7, 8d2f609, e7dda90)
- Added "Consider ENTIRE career trajectory" instruction
- Added scope-to-level mapping guidance
- Clarified icLevel 1-9 covers both IC and Manager tracks
- Added examples: "Senior Director with $100M+ budget → icLevel: 9"

## Current State (Commit: e7dda90)

**Code state**: HEAD at `e7dda90 Fix icLevel interpretation to include manager track`

**Still failing**: LLM assigns icLevel: 8 even with ALL metrics visible

**Verified in database**:
```sql
-- Metrics ARE in database
value: "$250M+", context: "annual budget increased to"
value: "350+", context: "headcount scaled to"
```

**Last job result**:
```
Job ID: 3a6cf778-6e9f-4cce-95b3-52bcdd142a38
icLevel: 8
currentLevel: Group Product Manager
```

## Why It's Still Failing

**Hypothesis**: The LLM is seeing all the data (metrics no longer truncated) but the prompt structure has conflicting instructions that confuse the LLM:

1. Lines 84-86 define scale with IC7/IC8/IC9 options
2. Lines 105-110 try to override with "MUST be 9" rules
3. LLMs don't reliably follow "if-then" conditional logic in natural language prompts
4. The prompt is too verbose (114 lines) with redundant/conflicting guidance

## What Was Attempted and Rolled Back

**Programmatic enforcement** (Commits 92f3735 through 9b2c998): Added post-LLM code to check metrics and force icLevel: 9. User correctly rejected this as "massaging based on Jungwon's data" - not generalizable.

**All rolled back** with commit c0cbc6b.

## Recommendations for Next Agent

### Option 1: Simplify Prompt (Requires User Approval)
Remove conflicting instructions. Make level 9 unambiguously M2:
```
- 9: M2 - VP/SVP/Head of Product (exec scope: $100M+ budget OR 100+ team OR company-wide)
```
Remove all "MUST" and "CRITICAL" override attempts.

### Option 2: Use Structured Output
Switch from natural language prompt to JSON schema with constraints:
```typescript
{
  "type": "object",
  "properties": {
    "icLevel": {
      "type": "number",
      "minimum": 1,
      "maximum": 9,
      "description": "9 if any role has $100M+ budget OR 100+ team, otherwise assess normally"
    }
  }
}
```

### Option 3: Two-Stage Assessment
1. **Stage 1A**: Extract scope indicators (budget, team size) into structured format
2. **Stage 1B**: Map scope to level using clear rules

### Option 4: Investigate Why LLM Ignores Scope
Get actual LLM reasoning by:
- Enable verbose logging in Supabase Edge Functions
- Ask LLM to explain its reasoning in response
- Check if token limits are cutting off metrics in context

## Files to Review

**Core logic**:
- `supabase/functions/_shared/pipelines/pm-levels.ts` (Stage 1: lines 28-132)
- `supabase/functions/_shared/pipeline-utils.ts` (fetchWorkHistory: lines 310-323)

**UI**:
- `src/services/pmLevelsService.ts` (mapLevelScoreToLevel)
- `src/components/assessment/CareerLadder.tsx`

**Database**:
```sql
-- Check metrics
SELECT title, metrics FROM work_items 
WHERE user_id = 'd3937780-28ec-4221-8bfb-2bb0f670fd52' 
AND title LIKE '%Senior Director%';

-- Check latest job
SELECT id, result->>'icLevel', result->'levelEvidence'->>'currentLevel' 
FROM jobs 
WHERE user_id = 'd3937780-28ec-4221-8bfb-2bb0f670fd52' 
AND type = 'pmLevels' 
ORDER BY created_at DESC LIMIT 1;
```

## Key Constraint

**User requirement**: "LLM is entirely capable of recognizing VP level scope with correct prompt"

Do NOT implement programmatic enforcement. Fix the prompt or LLM interaction pattern.
