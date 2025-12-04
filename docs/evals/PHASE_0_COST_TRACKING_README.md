# Phase 0: Cost Tracking Schema Extensions

**Status:** ✅ Ready for Review  
**Effort:** ~1 day  
**PR:** TBD

---

## 📋 Overview

Phase 0 extends the database schemas for both `/evals` and `/evaluation-dashboard` to support:
- ✅ Prompt metadata tracking (prompt name, version, model)
- ✅ Token usage tracking (prompt, completion, total tokens)
- ✅ Automated cost calculation (model-specific pricing)
- ✅ Type-specific data storage for different LLM call types

---

## 🗃️ Database Changes

### **Migration 1: `20251208_add_prompt_and_cost_metadata.sql`**

**Extends `evals_log` table:**
```sql
ALTER TABLE evals_log ADD COLUMN
  prompt_name TEXT,
  prompt_version TEXT,
  model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER;
```

**Adds 3 indexes:**
- `idx_evals_log_prompt_name`
- `idx_evals_log_model`
- `idx_evals_log_prompt_version`

**Adds 2 aggregate functions:**

1. **`get_evals_cost_by_job_type(since_date)`**
   - Returns: Pipeline-level cost aggregation
   - Used by: `/evals` dashboard
   - Columns: `job_type`, `total_runs`, `total_tokens`, `estimated_cost_usd`, `avg_cost_per_job`

2. **`get_evals_cost_by_prompt(since_date, filter_job_type)`**
   - Returns: Prompt-level cost + performance metrics
   - Used by: `/evaluation-dashboard` Prompt Performance View
   - Columns: `prompt_name`, `total_runs`, `success_rate`, `estimated_cost_usd`, `avg_cost_per_call`

**Cost Calculation:**
- GPT-4o: $2.50 / 1M input, $10.00 / 1M output
- GPT-4o Mini: $0.15 / 1M input, $0.60 / 1M output
- GPT-4 Turbo: $10.00 / 1M input, $30.00 / 1M output
- GPT-4: $30.00 / 1M input, $60.00 / 1M output

---

### **Migration 2: `20251209_extend_evaluation_runs.sql`**

**Extends `evaluation_runs` table:**

**Universal LLM Tracking:**
```sql
ALTER TABLE evaluation_runs ADD COLUMN
  llm_call_type TEXT,
  prompt_name TEXT,
  prompt_version TEXT,
  quality_checks JSONB,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100);
```

**Type-Specific Data:**
```sql
ALTER TABLE evaluation_runs ADD COLUMN
  jd_analysis_data JSONB,
  hil_data JSONB,
  draft_generation_data JSONB,
  company_tags_data JSONB;
```

**Adds 3 indexes:**
- `idx_evaluation_runs_llm_call_type`
- `idx_evaluation_runs_prompt_name`
- `idx_evaluation_runs_quality_score`

---

## 🧪 Testing

### **Automated Tests: `__tests__/test_evals_cost_tracking.sql`**

**9 comprehensive tests:**
1. ✅ `evals_log` has all 6 new columns
2. ✅ `evals_log` has correct indexes
3. ✅ `get_evals_cost_by_job_type()` function exists and executes
4. ✅ `get_evals_cost_by_prompt()` function exists and executes
5. ✅ `evaluation_runs` has 5 universal columns
6. ✅ `evaluation_runs` has 4 type-specific columns
7. ✅ `evaluation_runs` has correct indexes
8. ✅ `quality_score` constraint works (0-100 range)
9. ✅ Cost calculation is accurate (verified with known token counts)

**Run tests:**
```bash
# Via Supabase SQL Editor (recommended if CLI has issues)
# 1. Copy contents of __tests__/test_evals_cost_tracking.sql
# 2. Paste into SQL Editor
# 3. Run
# 4. Check for "✓ ALL TESTS PASSED" message

# OR via psql (if local DB running)
psql -f supabase/migrations/__tests__/test_evals_cost_tracking.sql
```

---

## 📦 TypeScript Types

### **New file: `src/types/evals-cost.ts`**

**Exports:**
- `PromptMetadata` — Prompt name, version, model, tokens
- `CostByJobType` — Return type for `get_evals_cost_by_job_type()`
- `CostByPrompt` — Return type for `get_evals_cost_by_prompt()`
- `LLMCallType` — Enum of all LLM call types
- `QualityCheck` — Quality check result shape
- `JDAnalysisData`, `HILData`, `DraftGenerationData`, `CompanyTagsData` — Type-specific shapes
- `EvalsLogWithPrompt` — Extended `evals_log` row type
- `EvaluationRunWithLLM` — Extended `evaluation_runs` row type

**Helper functions:**
- `calculateCost(model, promptTokens, completionTokens)` — Manual cost calculation
- `formatCost(costUsd)` — Format cost as `$0.0055`
- `formatTokens(tokens)` — Format as `1.8M`, `450K`, `250`

---

## 🚀 Deployment Steps

### **Option A: Via Supabase SQL Editor (Recommended)**

1. **Open Supabase Dashboard → SQL Editor**

2. **Run Migration 1:**
```bash
# Copy contents of:
supabase/migrations/20251208_add_prompt_and_cost_metadata.sql

# Paste into SQL Editor → Run
```

3. **Run Migration 2:**
```bash
# Copy contents of:
supabase/migrations/20251209_extend_evaluation_runs.sql

# Paste into SQL Editor → Run
```

4. **Run Tests:**
```bash
# Copy contents of:
supabase/migrations/__tests__/test_evals_cost_tracking.sql

# Paste into SQL Editor → Run
# Verify "✓ ALL TESTS PASSED" message
```

---

### **Option B: Via Supabase CLI (if Docker running)**

```bash
# 1. Apply migrations
supabase db push

# 2. Run tests
psql $DATABASE_URL -f supabase/migrations/__tests__/test_evals_cost_tracking.sql
```

---

## ✅ Validation Checklist

After deployment, verify:

- [ ] `evals_log` table has 6 new columns:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'evals_log' 
  AND column_name IN ('prompt_name', 'model', 'prompt_tokens', 'completion_tokens');
  ```

- [ ] `evaluation_runs` table has 9 new columns:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'evaluation_runs' 
  AND column_name IN ('llm_call_type', 'quality_score', 'jd_analysis_data', 'hil_data');
  ```

- [ ] Cost functions exist:
  ```sql
  SELECT proname FROM pg_proc 
  WHERE proname IN ('get_evals_cost_by_job_type', 'get_evals_cost_by_prompt');
  ```

- [ ] Indexes exist:
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename IN ('evals_log', 'evaluation_runs') 
  AND indexname LIKE 'idx_evals%';
  ```

- [ ] Test suite passes (all 9 tests)

---

## 📊 Impact on Existing Data

**No data loss or breaking changes:**
- All new columns are nullable
- Existing rows continue to work
- Indexes are non-blocking (created in background)
- Cost functions only query rows with non-null token data

**Backward compatibility:**
- Existing `evals_log` queries: ✅ No changes needed
- Existing `evaluation_runs` queries: ✅ No changes needed
- Frontend: ⚠️ Will need updates in Phase 1 (new components)

---

## 🔗 Related Files

### **Database:**
- `supabase/migrations/20251208_add_prompt_and_cost_metadata.sql`
- `supabase/migrations/20251209_extend_evaluation_runs.sql`
- `supabase/migrations/__tests__/test_evals_cost_tracking.sql`

### **Types:**
- `src/types/evals-cost.ts`

### **Documentation:**
- `docs/evals/DASHBOARD_EVOLUTION_PLAN.md` (full plan)
- `docs/evals/DASHBOARD_PLAN_UPDATE_SUMMARY.md` (summary)

---

## 🎯 Next Steps

After Phase 0 is deployed:

1. ✅ Verify migrations applied successfully
2. ✅ Run test suite (confirm all 9 tests pass)
3. ✅ Update `logEval` helper to include prompt metadata (Phase 3 enhancement)
4. 🚀 **Proceed to Phase 1:** `/evals` Cost Tracking UI

---

## 📝 PR Checklist

- [ ] Both migrations applied to dev/staging
- [ ] All 9 tests pass
- [ ] No linter errors in TypeScript types
- [ ] Documentation updated (this README)
- [ ] Reviewed by at least 1 engineer
- [ ] No breaking changes to existing queries

---

**Phase 0 Complete! Ready for Phase 1.** ✅

