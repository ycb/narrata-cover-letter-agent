# Dashboard Evolution Plan — Building on Existing Patterns

**Date:** 2025-12-04  
**Purpose:** Extend `/evaluation-dashboard` thoughtfully to support all new LLM calls while preserving robust existing patterns.

---

## 🎯 Vision & Principles

###  **Core Vision**
> Extend `/evaluation-dashboard` to become the **single source of truth** for all LLM quality, performance, and data integrity monitoring — building on proven patterns with **universal + data-type specific customization**.

### **Design Principles**
1. ✅ **Preserve what works** — Don't rewrite, extend
2. ✅ **Universal patterns** — Apply to all data types
3. ✅ **Type-specific customization** — Each LLM call has unique context
4. ✅ **Compositional** — Reuse existing components
5. ✅ **Incremental** — Add one LLM call type at a time
6. ✅ **User-friendly** — Maintain existing UX quality

---

## 📋 Existing Patterns to Extend

### **Pattern 1: Universal Metrics Card**
**Current:** Performance metrics shown for Resume, CL, LinkedIn  
**Extends to:** All LLM calls

```tsx
<Card>
  <CardHeader>
    <CardTitle>Performance Metrics</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-4 gap-4">
      <MetricCard label="Text Extraction" value={run.text_extraction_latency_ms} />
      <MetricCard label="LLM Analysis" value={run.llm_analysis_latency_ms} />
      <MetricCard label="Database Save" value={run.database_save_latency_ms} />
      <MetricCard label="Total Latency" value={run.total_latency_ms} />
    </div>
  </CardContent>
</Card>
```

**Extension:** Add prompt-specific metrics
```tsx
<div className="grid grid-cols-5 gap-4">
  <MetricCard label="Total Latency" value={run.total_latency_ms} />
  <MetricCard label="Prompt Tokens" value={run.input_tokens} />
  <MetricCard label="Completion Tokens" value={run.output_tokens} />
  <MetricCard label="Model" value={run.model} badge />
  <MetricCard label="Prompt" value={run.prompt_name} link />  {/* NEW */}
</div>
```

---

### **Pattern 2: File Type Filtering**
**Current:** Filter by Resume, Cover Letter, LinkedIn  
**Extends to:** Filter by LLM call type

```tsx
<div className="flex gap-2">
  <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
    All
  </Button>
  <Button variant={filter === 'resume' ? 'default' : 'outline'} onClick={() => setFilter('resume')}>
    Resume
  </Button>
  <Button variant={filter === 'coverLetter' ? 'default' : 'outline'} onClick={() => setFilter('coverLetter')}>
    Cover Letter
  </Button>
</div>
```

**Extension:** Add LLM call type filter
```tsx
<div className="flex gap-2">
  {/* Existing filters */}
  <Button variant={filter === 'jdAnalysis' ? 'default' : 'outline'}>
    JD Analysis
  </Button>
  <Button variant={filter === 'hilGapResolution' ? 'default' : 'outline'}>
    HIL Gap Resolution
  </Button>
  <Button variant={filter === 'draftGeneration' ? 'default' : 'outline'}>
    Draft Generation
  </Button>
  {/* ... more LLM call types */}
</div>
```

---

### **Pattern 3: Evaluation Scores (Type-Specific)**
**Current:** Resume/CL have accuracy, relevance, personalization, clarity, framework  
**Extends to:** Each LLM call type has custom quality dimensions

```tsx
// Current (Resume/CL)
<div className="grid grid-cols-5 gap-4">
  <ScoreCard label="Accuracy" score={run.accuracy_score} />
  <ScoreCard label="Relevance" score={run.relevance_score} />
  <ScoreCard label="Personalization" score={run.personalization_score} />
  <ScoreCard label="Clarity/Tone" score={run.clarity_tone_score} />
  <ScoreCard label="Framework" score={run.framework_score} />
</div>
```

**Extension:** Conditional quality dimensions by type
```tsx
{run.file_type === 'jdAnalysis' && (
  <div className="grid grid-cols-4 gap-4">
    <ScoreCard label="Completeness" score={run.jd_completeness_score} />
    <ScoreCard label="Requirement Clarity" score={run.jd_requirement_clarity} />
    <ScoreCard label="Company Context" score={run.jd_company_context} />
    <ScoreCard label="Role Definition" score={run.jd_role_definition} />
  </div>
)}

{run.file_type === 'hilGapResolution' && (
  <div className="grid grid-cols-3 gap-4">
    <ScoreCard label="Truthfulness" score={run.hil_truthfulness} />
    <ScoreCard label="Specificity" score={run.hil_specificity} />
    <ScoreCard label="Relevance" score={run.hil_relevance} />
  </div>
)}
```

---

### **Pattern 4: Heuristics & Structural Checks**
**Current:** `heuristics` JSON field stores structural validation results  
**Extends to:** All LLM calls store `quality_checks` JSON

```tsx
// Current
{run.heuristics && (
  <Card>
    <CardHeader>
      <CardTitle>Heuristics</CardTitle>
    </CardHeader>
    <CardContent>
      <pre>{JSON.stringify(run.heuristics, null, 2)}</pre>
    </CardContent>
  </Card>
)}
```

**Extension:** Use `StructuralEvalResult` format from `evals_log`
```tsx
{run.quality_checks && (
  <Card>
    <CardHeader>
      <CardTitle>Structural Quality Checks</CardTitle>
      <Badge variant={run.quality_checks.passed ? 'success' : 'destructive'}>
        {run.quality_checks.passed ? 'Passed' : 'Failed'}
      </Badge>
    </CardHeader>
    <CardContent>
      <QualityChecksTable checks={run.quality_checks.checks} />
    </CardContent>
  </Card>
)}

// QualityChecksTable component (reusable)
function QualityChecksTable({ checks }: { checks: EvalCheck[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Check</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expected</TableHead>
          <TableHead>Actual</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {checks.map((check, i) => (
          <TableRow key={i}>
            <TableCell>{check.name}</TableCell>
            <TableCell>
              <Badge variant={check.severity === 'critical' ? 'destructive' : 'secondary'}>
                {check.severity}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={check.passed ? 'success' : 'destructive'}>
                {check.passed ? 'Pass' : 'Fail'}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {check.expected || '—'}
            </TableCell>
            <TableCell className="text-sm">
              {check.actual || '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

### **Pattern 5: Expandable Categories**
**Current:** Expand/collapse categories of heuristics  
**Extends to:** Expand/collapse by LLM call type

```tsx
// Current (categories)
{categories.map(category => (
  <div key={category.name}>
    <button onClick={() => toggleCategory(category.name)}>
      {expandedCategories.has(category.name) ? <ChevronDown /> : <ChevronRight />}
      {category.name}
    </button>
    {expandedCategories.has(category.name) && (
      <div>{/* Category content */}</div>
    )}
  </div>
))}
```

**Extension:** Group runs by LLM call type
```tsx
const groupedRuns = groupBy(evaluationRuns, run => run.llm_call_type);

{Object.entries(groupedRuns).map(([callType, runs]) => (
  <Card key={callType}>
    <CardHeader onClick={() => toggleCategory(callType)}>
      {expandedCategories.has(callType) ? <ChevronDown /> : <ChevronRight />}
      <CardTitle>{formatCallType(callType)} ({runs.length} runs)</CardTitle>
    </CardHeader>
    {expandedCategories.has(callType) && (
      <CardContent>
        <RunsTable runs={runs} />
      </CardContent>
    )}
  </Card>
))}
```

---

### **Pattern 6: PM Levels Specific Data**
**Current:** Dedicated PM levels fields in `evaluation_runs`  
**Extends to:** Each LLM call type has type-specific fields

```tsx
// Current (PM Levels specific)
{run.pm_levels_status && (
  <Card>
    <CardHeader>
      <CardTitle>PM Levels Analysis</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <strong>Inferred Level:</strong> {run.pm_levels_inferred_level}
        </div>
        <div>
          <strong>Confidence:</strong> {run.pm_levels_confidence}%
        </div>
        <div>
          <strong>Level Changed:</strong> {run.pm_levels_level_changed ? 'Yes' : 'No'}
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

**Extension:** Type-specific expansion panels
```tsx
{run.llm_call_type === 'draftGeneration' && run.draft_generation_data && (
  <Card>
    <CardHeader>
      <CardTitle>Draft Generation Details</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <strong>Template Used:</strong> {run.draft_generation_data.template_id}
        </div>
        <div>
          <strong>Sections Generated:</strong> {run.draft_generation_data.sections_count}
        </div>
        <div>
          <strong>Word Count:</strong> {run.draft_generation_data.word_count}
        </div>
        <div>
          <strong>User Voice Applied:</strong> {run.draft_generation_data.voice_applied ? 'Yes' : 'No'}
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

---

### **Pattern 7: Flag/Issue Tracking**
**Current:** `FlagButton` + `FlagModal` for data quality issues  
**Extends to:** Flag issues with prompt quality, LLM output, etc.

```tsx
// Current
<FlagButton
  onFlag={() => {
    setFlaggingItem({
      dataType: 'structured_extraction',
      dataPath: `evaluation_runs/${run.id}`,
      dataSnapshot: run.structured_data
    });
    setFlagModalOpen(true);
  }}
/>
```

**Extension:** Prompt-specific flagging
```tsx
<FlagButton
  label="Flag Prompt Issue"
  onFlag={() => {
    setFlaggingItem({
      dataType: 'prompt_quality',
      dataPath: `prompts/${run.prompt_name}`,
      dataSnapshot: {
        prompt_name: run.prompt_name,
        input: run.input_snapshot,
        output: run.output_snapshot,
        quality_score: run.quality_score
      }
    });
    setFlagModalOpen(true);
  }}
/>
```

---

## 📊 New Schema Extensions

### **Unified `evaluation_runs` Table**
**Strategy:** Extend existing table with new columns for each LLM call type

```sql
-- Add universal LLM tracking columns
ALTER TABLE evaluation_runs
  ADD COLUMN llm_call_type TEXT, -- 'resume', 'coverLetter', 'jdAnalysis', 'hilGapResolution', etc.
  ADD COLUMN prompt_name TEXT,
  ADD COLUMN prompt_version TEXT,
  ADD COLUMN quality_checks JSONB, -- StructuralEvalResult format
  ADD COLUMN quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100);

-- Add type-specific JSON columns (extensible)
ALTER TABLE evaluation_runs
  ADD COLUMN jd_analysis_data JSONB, -- For JD analysis specific fields
  ADD COLUMN hil_data JSONB, -- For HIL specific fields
  ADD COLUMN draft_generation_data JSONB, -- For draft CL specific fields
  ADD COLUMN company_tags_data JSONB; -- For company tag specific fields

-- Indexes
CREATE INDEX idx_evaluation_runs_llm_call_type ON evaluation_runs(llm_call_type);
CREATE INDEX idx_evaluation_runs_prompt_name ON evaluation_runs(prompt_name);
CREATE INDEX idx_evaluation_runs_quality_score ON evaluation_runs(quality_score);
```

**Why this approach:**
- ✅ Preserves existing data
- ✅ Maintains backward compatibility
- ✅ Allows type-specific fields without schema bloat
- ✅ JSONB columns are flexible for experimentation

---

## 🎨 Dashboard Layout Mockups (By LLM Call Type)

### **1. JD Pre-Analysis** (`llm_call_type: 'jdAnalysis'`)

```
┌─────────────────────────────────────────────────────────────────┐
│ JD Analysis Run #123 (Dec 4, 2025 3:45pm)                      │
├─────────────────────────────────────────────────────────────────┤
│ Performance Metrics                                              │
│ ┌─────────┬─────────┬─────────┬─────────┬─────────┐            │
│ │ Total   │ Prompt  │ Compl.  │ Model   │ Prompt  │            │
│ │ 2.3s    │ 450     │ 800     │ gpt-4o  │ buildJob│            │
│ │         │ tokens  │ tokens  │ -mini   │ Descrip-│            │
│ │         │         │         │         │ tion... │ [View]     │
│ └─────────┴─────────┴─────────┴─────────┴─────────┘            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Structural Quality Checks                         ✅ 6/6 Passed │
├─────────────────────────────────────────────────────────────────┤
│ Check                    │ Severity │ Status │ Expected │ Actual│
│ ────────────────────────────────────────────────────────────────│
│ Job Title Present        │ Critical │ ✅ Pass│ non-empty│ "Sr..." │
│ Company Present          │ Critical │ ✅ Pass│ non-empty│ "Acme" │
│ Core Requirements ≥1     │ Critical │ ✅ Pass│ ≥1       │ 5     │
│ Preferred Requirements   │ High     │ ✅ Pass│ ≥0       │ 3     │
│ Role Summary Present     │ Medium   │ ✅ Pass│ non-empty│ "Lead"│
│ Industry/Company Context │ Medium   │ ✅ Pass│ non-empty│ "B2B.."│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ JD Analysis Details                                              │
├─────────────────────────────────────────────────────────────────┤
│ Job Title: "Senior Product Manager"                             │
│ Company: "Acme Corp"                                             │
│ Core Requirements: 5 extracted                                   │
│ Preferred Requirements: 3 extracted                              │
│ Differentiators: 2 identified                                    │
│                                                                  │
│ [View Full Extraction] [View Raw JD] [Flag Issue]               │
└─────────────────────────────────────────────────────────────────┘
```

**Data Model:**
```typescript
interface JDAnalysisRun extends EvaluationRun {
  llm_call_type: 'jdAnalysis';
  jd_analysis_data: {
    job_title: string;
    company: string;
    core_requirements_count: number;
    preferred_requirements_count: number;
    differentiators_count: number;
    role_summary_length: number;
  };
}
```

---

### **2. HIL Gap Resolution** (`llm_call_type: 'hilGapResolution'`)

```
┌─────────────────────────────────────────────────────────────────┐
│ HIL Gap Resolution: Story Generation (Dec 4, 2025 4:12pm)      │
├─────────────────────────────────────────────────────────────────┤
│ Performance Metrics                                              │
│ ┌─────────┬─────────┬─────────┬─────────┬─────────┐            │
│ │ Total   │ Prompt  │ Compl.  │ Model   │ Prompt  │            │
│ │ 4.8s    │ 1200    │ 450     │ gpt-4o  │ buildSto│            │
│ │ (Stream)│ tokens  │ tokens  │ -mini   │ ryGener-│            │
│ │         │         │         │         │ ation.. │ [View]     │
│ └─────────┴─────────┴─────────┴─────────┴─────────┘            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HIL Quality Checks                                ✅ 3/3 Passed │
├─────────────────────────────────────────────────────────────────┤
│ Check                    │ Severity │ Status │ Expected │ Actual│
│ ────────────────────────────────────────────────────────────────│
│ Truthfulness (No Fab)    │ Critical │ ✅ Pass│ 0 flags  │ 0     │
│ Specificity (Metrics)    │ High     │ ✅ Pass│ ≥1 metric│ 2     │
│ Relevance to Gap         │ High     │ ✅ Pass│ addresses│ Yes   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HIL Details                                                      │
├─────────────────────────────────────────────────────────────────┤
│ Gap Type: Story Generation                                       │
│ Gap ID: gap_123                                                  │
│ Work Item ID: role_456                                           │
│ User Accepted: Yes ✅                                            │
│ Content Word Count: 127                                          │
│                                                                  │
│ Generated Content:                                               │
│ "Led migration of legacy monolith to microservices architecture │
│  reducing deployment time by 75% (from 4h to 1h) and improving  │
│  system uptime from 99.5% to 99.95%..."                         │
│                                                                  │
│ [View Full Context] [View Gap Analysis] [Flag Issue]            │
└─────────────────────────────────────────────────────────────────┘
```

**Data Model:**
```typescript
interface HILGapResolutionRun extends EvaluationRun {
  llm_call_type: 'hilGapResolution';
  hil_data: {
    gap_type: 'story' | 'role' | 'saved_section';
    gap_id: string;
    work_item_id: string | null;
    user_accepted: boolean;
    content_word_count: number;
    truthfulness_flags: number;
    specificity_score: number;
    relevance_score: number;
  };
}
```

---

### **3. Draft CL Generation** (`llm_call_type: 'draftGeneration'`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Draft CL Generation (Dec 4, 2025 5:30pm)                       │
├─────────────────────────────────────────────────────────────────┤
│ Performance Metrics (Multi-Stage)                                │
│ ┌─────────┬─────────┬─────────┬─────────┬─────────┐            │
│ │ Total   │ Template│ Intro   │ Body    │ Closing │            │
│ │ 12.4s   │ 2.1s    │ 3.8s    │ 4.2s    │ 2.3s    │            │
│ └─────────┴─────────┴─────────┴─────────┴─────────┘            │
│                                                                  │
│ Token Usage: 3,200 prompt + 1,800 completion = 5,000 total      │
│ Models: gpt-4o-mini (template, intro, closing), gpt-4o (body)   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Structural Quality Checks                         ✅ 7/8 Passed │
├─────────────────────────────────────────────────────────────────┤
│ Check                    │ Severity │ Status │ Expected │ Actual│
│ ────────────────────────────────────────────────────────────────│
│ Paragraph Count          │ Critical │ ✅ Pass│ 3-4      │ 3     │
│ Word Count               │ Critical │ ✅ Pass│ 250-500  │ 387   │
│ Has Intro                │ Critical │ ✅ Pass│ yes      │ yes   │
│ Has Body                 │ Critical │ ✅ Pass│ yes      │ yes   │
│ Has Closing              │ Critical │ ✅ Pass│ yes      │ yes   │
│ Company Name Mentioned   │ High     │ ✅ Pass│ yes      │ yes   │
│ Role Title Mentioned     │ High     │ ✅ Pass│ yes      │ yes   │
│ User Voice Applied       │ Medium   │ ⚠️ Warn│ yes      │ no    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Draft Generation Details                                         │
├─────────────────────────────────────────────────────────────────┤
│ Template ID: template_789                                        │
│ Sections Generated: 3 (intro, body, closing)                    │
│ User Voice Applied: No (⚠️ User voice not set)                  │
│ Job Context: "Senior PM at Acme Corp"                           │
│ Final Word Count: 387                                            │
│                                                                  │
│ [View Full Draft] [View Prompts Used] [Flag Issue]              │
└─────────────────────────────────────────────────────────────────┘
```

**Data Model:**
```typescript
interface DraftGenerationRun extends EvaluationRun {
  llm_call_type: 'draftGeneration';
  draft_generation_data: {
    template_id: string;
    sections_generated: number;
    user_voice_applied: boolean;
    job_context: string;
    word_count: number;
    template_latency_ms: number;
    intro_latency_ms: number;
    body_latency_ms: number;
    closing_latency_ms: number;
  };
}
```

---

### **4. Company Tags** (`llm_call_type: 'companyTags'`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Company Tag Research: Acme Corp (Dec 4, 2025 6:15pm)           │
├─────────────────────────────────────────────────────────────────┤
│ Performance Metrics                                              │
│ ┌─────────┬─────────┬─────────┬─────────┬─────────┐            │
│ │ Total   │ Prompt  │ Compl.  │ Model   │ Cached? │            │
│ │ 1.2s    │ 180     │ 250     │ gpt-4o  │ No      │            │
│ │         │ tokens  │ tokens  │ -mini   │         │            │
│ └─────────┴─────────┴─────────┴─────────┴─────────┘            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Company Research Results                                         │
├─────────────────────────────────────────────────────────────────┤
│ Company: Acme Corp                                               │
│ Industry: Fintech / Payments / Crypto                           │
│ Business Model: B2B SaaS                                         │
│ Company Stage: Growth-stage                                      │
│                                                                  │
│ Key Products: [Payment API, Fraud Detection, Analytics]         │
│ Suggested Tags: [fintech, payments, b2b-saas, api-first]        │
│                                                                  │
│ [View Raw Research] [Retry Research] [Flag Inaccuracy]          │
└─────────────────────────────────────────────────────────────────┘
```

**Data Model:**
```typescript
interface CompanyTagsRun extends EvaluationRun {
  llm_call_type: 'companyTags';
  company_tags_data: {
    company_name: string;
    industry: string;
    business_model: string;
    company_stage: string;
    key_products: string[];
    suggested_tags: string[];
    cache_hit: boolean;
  };
}
```

---

## 🚀 Implementation Phases

### **Phase 0: Schema Extensions** (~1 day)
**Goal:** Extend database schemas for both dashboards

**Changes:**

#### **A. `evals_log` Extensions (for `/evals` + `/evaluation-dashboard`)**
```sql
-- Migration: 20251208_add_prompt_and_cost_metadata.sql

ALTER TABLE evals_log 
  ADD COLUMN prompt_name TEXT,
  ADD COLUMN prompt_version TEXT,
  ADD COLUMN model TEXT,
  ADD COLUMN prompt_tokens INTEGER,
  ADD COLUMN completion_tokens INTEGER,
  ADD COLUMN total_tokens INTEGER;

CREATE INDEX idx_evals_log_prompt_name ON evals_log(prompt_name);
CREATE INDEX idx_evals_log_model ON evals_log(model);

-- Add cost aggregate function
CREATE OR REPLACE FUNCTION get_evals_cost_by_job_type(
  since_date TIMESTAMPTZ
)
RETURNS TABLE (
  job_type TEXT,
  total_runs BIGINT,
  total_prompt_tokens BIGINT,
  total_completion_tokens BIGINT,
  total_tokens BIGINT,
  estimated_cost_usd DOUBLE PRECISION,
  avg_cost_per_job DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.job_type,
    COUNT(*)::BIGINT AS total_runs,
    SUM(el.prompt_tokens)::BIGINT AS total_prompt_tokens,
    SUM(el.completion_tokens)::BIGINT AS total_completion_tokens,
    SUM(el.prompt_tokens + el.completion_tokens)::BIGINT AS total_tokens,
    -- Cost calculation (model-specific pricing)
    SUM(
      CASE el.model
        WHEN 'gpt-4o' THEN (el.prompt_tokens * 2.5 / 1000000.0) + (el.completion_tokens * 10.0 / 1000000.0)
        WHEN 'gpt-4o-mini' THEN (el.prompt_tokens * 0.15 / 1000000.0) + (el.completion_tokens * 0.60 / 1000000.0)
        ELSE 0
      END
    )::DOUBLE PRECISION AS estimated_cost_usd,
    -- Avg cost per job
    (SUM(
      CASE el.model
        WHEN 'gpt-4o' THEN (el.prompt_tokens * 2.5 / 1000000.0) + (el.completion_tokens * 10.0 / 1000000.0)
        WHEN 'gpt-4o-mini' THEN (el.prompt_tokens * 0.15 / 1000000.0) + (el.completion_tokens * 0.60 / 1000000.0)
        ELSE 0
      END
    ) / NULLIF(COUNT(*), 0))::DOUBLE PRECISION AS avg_cost_per_job
  FROM evals_log el
  WHERE el.created_at >= since_date
    AND el.prompt_tokens IS NOT NULL
    AND el.completion_tokens IS NOT NULL
  GROUP BY el.job_type
  ORDER BY estimated_cost_usd DESC;
END;
$$ LANGUAGE plpgsql STABLE;
```

#### **B. `evaluation_runs` Extensions (for `/evaluation-dashboard`)**
```sql
-- Migration: 20251208_extend_evaluation_runs.sql

ALTER TABLE evaluation_runs
  ADD COLUMN llm_call_type TEXT,
  ADD COLUMN prompt_name TEXT,
  ADD COLUMN prompt_version TEXT,
  ADD COLUMN quality_checks JSONB,
  ADD COLUMN quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  ADD COLUMN jd_analysis_data JSONB,
  ADD COLUMN hil_data JSONB,
  ADD COLUMN draft_generation_data JSONB,
  ADD COLUMN company_tags_data JSONB;

CREATE INDEX idx_evaluation_runs_llm_call_type ON evaluation_runs(llm_call_type);
CREATE INDEX idx_evaluation_runs_prompt_name ON evaluation_runs(prompt_name);
CREATE INDEX idx_evaluation_runs_quality_score ON evaluation_runs(quality_score);
```

**Deliverable:** Database schemas ready for both dashboards

---

### **Phase 1: `/evals` Enhancements** (~2 days)
**Goal:** Add cost tracking and optional model filter to `/evals`

**Changes:**

#### **A. Cost Overview Card** (Priority 1, ~4 hours)
```tsx
// src/components/evaluation/pipeline/CostOverviewCard.tsx

export function CostOverviewCard({ sinceDays = 30 }) {
  const { data, loading, error } = useEvalsData.useCostByJobType(sinceDays);
  
  if (loading) return <Skeleton />;
  if (error) return <ErrorCard error={error} />;
  
  const totalCost = data.reduce((sum, row) => sum + row.estimated_cost_usd, 0);
  const totalTokens = data.reduce((sum, row) => sum + row.total_tokens, 0);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Costs (Last {sinceDays} days)</CardTitle>
        <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
        <div className="text-sm text-muted-foreground">
          {formatTokens(totalTokens)} total tokens
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Type</TableHead>
              <TableHead>Runs</TableHead>
              <TableHead>Total Tokens</TableHead>
              <TableHead>Est. Cost</TableHead>
              <TableHead>Avg/Job</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(row => (
              <TableRow key={row.job_type}>
                <TableCell className="font-medium">{row.job_type}</TableCell>
                <TableCell>{row.total_runs.toLocaleString()}</TableCell>
                <TableCell>{formatTokens(row.total_tokens)}</TableCell>
                <TableCell className="font-semibold">
                  ${row.estimated_cost_usd.toFixed(2)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  ${row.avg_cost_per_job.toFixed(4)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

#### **B. Model Filter** (Optional, ~2 hours)
```tsx
// Update: src/components/evaluation/pipeline/JobTypeFilter.tsx

export function JobTypeFilter({ 
  selectedJobType, 
  selectedModel, 
  onJobTypeChange,
  onModelChange 
}) {
  return (
    <div className="flex gap-2">
      {/* Existing job type select */}
      <Select value={selectedJobType} onValueChange={onJobTypeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Job Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Job Types</SelectItem>
          <SelectItem value="coverLetter">Cover Letter</SelectItem>
          <SelectItem value="pmLevels">PM Levels</SelectItem>
          <SelectItem value="resume">Resume</SelectItem>
        </SelectContent>
      </Select>
      
      {/* NEW: Model filter */}
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Models" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Models</SelectItem>
          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
          <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

#### **C. Update evalsService** (~2 hours)
```tsx
// src/services/evalsService.ts

export class EvalsService {
  // ... existing methods
  
  static async getCostByJobType(sinceDays: number = 30): Promise<CostByJobType[]> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - sinceDays);
    
    const { data, error } = await supabase.rpc('get_evals_cost_by_job_type', {
      since_date: sinceDate.toISOString()
    });
    
    if (error) throw error;
    return data || [];
  }
}
```

#### **D. Update PipelineEvaluationDashboard** (~2 hours)
```tsx
// src/components/evaluation/PipelineEvaluationDashboard.tsx

export function PipelineEvaluationDashboard() {
  const [selectedModel, setSelectedModel] = useState<string>('all');
  // ... existing state
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1>Pipeline Evaluation Dashboard</h1>
        <JobTypeFilter 
          selectedJobType={selectedJobType}
          selectedModel={selectedModel}
          onJobTypeChange={setSelectedJobType}
          onModelChange={setSelectedModel}
        />
      </div>
      
      {/* NEW: Cost Overview */}
      <CostOverviewCard sinceDays={timeRange} />
      
      {/* Existing components */}
      <LatencyOverviewCard {...props} />
      <StageLatencyChart {...props} />
      <StructuralChecksCard {...props} />
      <ErrorTable {...props} />
    </div>
  );
}
```

**Deliverable:** `/evals` shows cost tracking + optional model filter

---

### **Phase 2: `/evaluation-dashboard` Universal Extensions** (~2-3 days)
**Goal:** Add universal LLM tracking to existing dashboard

**Changes:**
1. ✅ Update `EvaluationRun` TypeScript interface (add new columns)
2. ✅ Add `PromptLinkCard` component (clickable prompt name → shows full prompt)
3. ✅ Add `QualityChecksTable` component (reusable structural checks display)
4. ✅ Update Performance Metrics card to show prompt/completion tokens + cost
5. ✅ Add LLM call type filter to dashboard header
6. ✅ Add per-call cost display

**Deliverable:** Dashboard shows universal metrics for ALL logged LLM calls

---

### **Phase 3: `/evaluation-dashboard` Type-Specific Extensions** (~3-5 days)
**Goal:** Add data-type specific customization for each LLM call

**Changes (Per LLM Call Type):**
1. ✅ Add type-specific JSONB column (e.g., `jd_analysis_data`)
2. ✅ Create type-specific detail component (e.g., `JDAnalysisDetails.tsx`)
3. ✅ Add type-specific quality dimensions (conditional rendering)
4. ✅ Update structural validators to log `quality_checks`
5. ✅ Add per-call cost breakdown with token details

**Deliverable:** Each LLM call type has custom, contextual detail view with cost tracking

**Order:**
1. JD Analysis (foundational, simple)
2. HIL Gap Resolution (core feature, medium complexity)
3. Draft CL Generation (complex, multi-stage)
4. Company Tags (simple, low priority)
5. My Voice, Story Detection, etc. (incremental)

---

### **Phase 4: `/evaluation-dashboard` Prompt Performance View** (~2 days)
**Goal:** Add prompt-specific performance analysis with cost tracking

**New Tab:** "Prompt Performance"

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Prompt Performance Analysis                                      │
├─────────────────────────────────────────────────────────────────┤
│ Prompt Name: buildJobDescriptionAnalysisPrompt                  │
│                                                                  │
│ Performance (Last 30 days):                                      │
│ ├─ Total Runs: 243                                              │
│ ├─ Success Rate: 97.1% (236 / 243)                              │
│ ├─ Avg Latency: 2.4s (P50: 2.1s, P90: 3.8s)                     │
│ ├─ Avg Quality Score: 92 / 100                                  │
│ ├─ Token Usage: 450 avg prompt, 800 avg completion              │
│ └─ **Cost: $18.50 total ($0.076 avg per call)**                 │
│                                                                  │
│ Quality Distribution:                                            │
│ [■■■■■■■■■□] 81-100 (Excellent): 89%                            │
│ [■■□□□□□□□□] 61-80  (Good):      8%                             │
│ [■□□□□□□□□□] 41-60  (Fair):      2%                             │
│ [□□□□□□□□□□] 0-40   (Poor):      1%                             │
│                                                                  │
│ Recent Failures (7):                                             │
│ ├─ Dec 4, 3:45pm - Missing core requirements (quality_score=45) │
│ ├─ Dec 3, 2:12pm - Timeout after 10s                            │
│ └─ [View All Failures]                                           │
│                                                                  │
│ [View Prompt Source] [Compare Versions] [A/B Test Setup]        │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- `PromptPerformanceCard.tsx` — Metrics for single prompt (includes cost)
- `PromptCostBreakdown.tsx` — Detailed token + cost analysis
- `PromptComparisonView.tsx` — Compare 2 prompt versions (cost + quality)
- `PromptFailuresTable.tsx` — List of failures with debug info
- `CostOutliersTable.tsx` — Expensive runs for investigation

---

### **Phase 5: `/evaluation-dashboard` Prompt Viewer** (~1 day)
**Goal:** Show full prompt text + variables for debugging

**Modal:** Click prompt name → shows prompt details

```
┌─────────────────────────────────────────────────────────────────┐
│ Prompt: buildJobDescriptionAnalysisPrompt                       │
├─────────────────────────────────────────────────────────────────┤
│ File: src/prompts/jobDescriptionAnalysis.ts                     │
│ Version: 2024-12-04 (latest)                                     │
│                                                                  │
│ Variables:                                                       │
│ ├─ jd_text: "Senior Product Manager at Acme Corp..."            │
│ └─ max_tokens: 2000                                              │
│                                                                  │
│ Full Prompt:                                                     │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ System:                                                     │  │
│ │ You are an expert at parsing job descriptions...           │  │
│ │                                                             │  │
│ │ User:                                                       │  │
│ │ Analyze this job description:                              │  │
│ │ {jd_text}                                                   │  │
│ │                                                             │  │
│ │ Extract: job title, company, core requirements...          │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│ [Copy Prompt] [View in GitHub] [Test in Playground]             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 Summary

### **What We're Building On:**
1. ✅ Existing UI patterns (cards, tables, filters, modals)
2. ✅ Proven UX (user type filtering, expandable categories, flagging)
3. ✅ Robust data model (`evaluation_runs`, `sources`, `evals_log`)
4. ✅ Type-specific customization pattern (PM levels example)

### **What We're Adding:**

#### **Both Dashboards:**
1. ✅ **Token cost tracking** — Budget monitoring + optimization
2. ✅ **Prompt metadata** — Which prompt, model, tokens used
3. ✅ **Quality checks** — Structural validation results

#### **`/evals` Specific:**
1. ✅ **Cost Overview Card** — Pipeline-level cost tracking
2. ✅ **Model filter** — Filter by gpt-4o, gpt-4o-mini, etc.
3. ✅ **Cost aggregate function** — DB-level cost calculation

#### **`/evaluation-dashboard` Specific:**
1. ✅ **Universal LLM tracking** — All LLM calls visible
2. ✅ **Type-specific JSONB columns** — Custom data per call type
3. ✅ **Reusable components** — QualityChecksTable, PromptLinkCard, CostBreakdown
4. ✅ **Prompt performance tab** — Per-prompt analytics + cost
5. ✅ **Prompt viewer modal** — Full prompt inspection
6. ✅ **Per-call cost breakdown** — Token + cost details per run

### **What We're NOT Changing:**
1. ✅ `/evals` core focus (pipeline performance)
2. ✅ `/evaluation-dashboard` existing layout
3. ✅ Existing filtering/sorting logic
4. ✅ Existing flag/issue tracking system
5. ✅ Existing export to CSV functionality

---

## 📊 Implementation Timeline

| Phase | Dashboard | Focus | Effort | Deliverable |
|-------|-----------|-------|--------|-------------|
| **0** | Both | Schema extensions | 1 day | DB ready for cost tracking |
| **1** | `/evals` | Cost tracking + model filter | 2 days | Pipeline cost visibility |
| **2** | `/evaluation-dashboard` | Universal LLM extensions | 2-3 days | All LLM calls visible |
| **3** | `/evaluation-dashboard` | Type-specific customization | 3-5 days | Custom views per call type |
| **4** | `/evaluation-dashboard` | Prompt performance + cost | 2 days | Prompt optimization insights |
| **5** | `/evaluation-dashboard` | Prompt viewer | 1 day | Full prompt debugging |
| **TOTAL** | Both | Complete evolution | **11-14 days** | Both dashboards enhanced |

---

## 🎯 Phased Rollout Recommendation

### **Quick Win (Week 1): Cost Visibility**
- ✅ Phase 0: Schema extensions (1 day)
- ✅ Phase 1: `/evals` cost tracking (2 days)

**Result:** Immediate budget visibility across pipelines

---

### **Medium Win (Week 2): Universal Tracking**
- ✅ Phase 2: `/evaluation-dashboard` universal extensions (2-3 days)

**Result:** All LLM calls visible in dashboard

---

### **Long-term Win (Weeks 3-4): Full Customization**
- ✅ Phase 3: Type-specific extensions (3-5 days)
- ✅ Phase 4: Prompt performance (2 days)
- ✅ Phase 5: Prompt viewer (1 day)

**Result:** Complete LLM observability + optimization toolkit

---

## 💰 Cost Tracking: Side-by-Side Comparison

| Feature | `/evals` | `/evaluation-dashboard` |
|---------|----------|-------------------------|
| **View Level** | Pipeline-level | Call-level + Prompt-level |
| **Primary Use** | Budget monitoring | Prompt optimization |
| **Time Range** | Last 30 days | All-time (filterable) |
| **Metrics** | Total cost per pipeline | Cost per call, cost per prompt |
| **Grouping** | By job type | By prompt name |
| **Trend** | Daily spend chart | Cost distribution histogram |
| **Alerts** | "Costs up 50% this week" | "This prompt averages $0.50" |
| **Audience** | Eng leads, Finance | Engineers optimizing prompts |
| **Component** | `CostOverviewCard` | `PromptCostBreakdown` |
| **DB Function** | `get_evals_cost_by_job_type()` | Queries `evals_log` directly |

---

**Ready to start Phase 0 (Schema Extensions)?** 🚀

---

**End of Dashboard Evolution Plan**

