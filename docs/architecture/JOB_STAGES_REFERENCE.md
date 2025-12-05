# Job Stages Reference
**Version:** 1.0  
**Last Updated:** December 4, 2025  
**Source:** QA Audit comprehensive inventory

---

## Purpose

Centralized reference for all job types, stages, timeouts, and result shapes used in Narrata's streaming job architecture.

**Use this document when:**
- Adding new stages to existing pipelines
- Creating new job types
- Debugging streaming job issues
- Understanding job result structure

---

## Job Types

**Source of Truth:** `src/types/jobs.ts:14`

```typescript
export type JobType = 'onboarding' | 'coverLetter' | 'pmLevels';
```

**Status:** ✅ CONSISTENT across backend + frontend

**Usage Locations:**
- Backend: `supabase/functions/_shared/pipelines/*.ts`
- Frontend: `src/pages/*.tsx`, `src/components/cover-letters/*.tsx`
- Type Definitions: `src/types/jobs.ts`

---

## Onboarding Job (`onboarding`)

**Purpose:** Parse resume + cover letter + LinkedIn data → Create user profile

**Pipeline:** `supabase/functions/_shared/pipelines/onboarding.ts`

### Stages

| Stage | Timeout | LLM Calls | Parallelization | Purpose |
|-------|---------|-----------|-----------------|---------|
| `linkedInFetch` | 8s | None | N/A | Extract basic profile data from LinkedIn JSON (no LLM) |
| `profileStructuring` | 25s | 1 (GPT-4) | Runs in parallel with `derivedArtifacts` | Extract work history, stories, themes from documents |
| `derivedArtifacts` | 70s | 1 (GPT-4) | Runs in parallel with `profileStructuring` | Calculate impact scores, suggest stories, assess completeness |

**Total Duration:** ~70s (parallel execution saves 20-40s vs sequential)

### Result Shape

```typescript
interface OnboardingJobResult {
  profileId: string; // UUID of created profile
  workHistoryCount: number; // Number of work history items extracted
  storiesCount: number; // Number of stories identified
  skillsCount: number; // Number of skills extracted from LinkedIn
}
```

**Example:**
```json
{
  "profileId": "550e8400-e29b-41d4-a716-446655440000",
  "workHistoryCount": 5,
  "storiesCount": 12,
  "skillsCount": 18
}
```

### Stage Data Shapes

**linkedInFetch:**
```typescript
{
  jobsCount: number;
  skillsCount: number;
  profileFieldsExtracted: string[]; // e.g., ["name", "headline"]
  headline?: string;
}
```

**profileStructuring:**
```typescript
{
  workHistoryItems: number;
  storiesIdentified: number;
  coreThemes: string[]; // e.g., ["product leadership", "B2B SaaS", "growth"]
}
```

**derivedArtifacts:**
```typescript
{
  impactScores: {
    technical: number; // 0-100
    leadership: number; // 0-100
    strategic: number; // 0-100
  };
  suggestedStories: number;
  confidenceScore: number; // 0-100
}
```

---

## Cover Letter Job (`coverLetter`)

**Purpose:** Analyze JD + Generate metrics/requirements/gaps (NO draft generation in pipeline)

**Pipeline:** `supabase/functions/_shared/pipelines/cover-letter.ts`

**⚠️ Important:** Draft generation happens SEPARATELY via `CoverLetterDraftService.generateDraft()`

### Stages

| Stage | Timeout | LLM Calls | Parallelization | Purpose | Caching |
|-------|---------|-----------|-----------------|---------|---------|
| `jdAnalysis` | 20s | Streaming | N/A | Role insights + JD requirement summary | ✅ 30min TTL |
| `requirementAnalysis` | 30s | 1 (GPT-4) | Runs in parallel with `goalsAndStrengths` | Match user background to JD requirements |  |
| `goalsAndStrengths` | 35s | 2 (streaming) | Runs in parallel with `requirementAnalysis` | Calculate MWS + company context |  |
| `sectionGaps` | 50s | 1 (GPT-4) | Runs after `requirementAnalysis` | Identify gaps in template sections |  |

**Total Duration:** ~50s (parallel Layer 2 saves 15-25s)

**Removed Stage:** `basicMetrics` (redundant with `requirementAnalysis`)

### Result Shape

```typescript
interface CoverLetterJobResult {
  metrics: CoverLetterMatchMetric[]; // ATS score, requirements met, etc.
  gapCount: number; // Total gaps identified
  requirements?: RequirementAnalysisData; // Detailed requirement matching
  sectionGaps?: SectionGapsData; // Section-level gap analysis
  roleInsights?: RoleInsightsPayload; // Role level, scope, title match
  jdRequirementSummary?: JdRequirementSummary; // Core + preferred req counts
  goalsAndStrengths?: GoalsAndStrengthsStageData; // MWS + company context
  mws?: MwsSummary; // Motivations, will, strengths summary
  companyContext?: CompanyContext; // Industry, maturity, business models
}
```

**Example:**
```json
{
  "metrics": [
    {
      "key": "requirementsMet",
      "label": "Requirements Met",
      "type": "count",
      "value": 8,
      "summary": "8 of 12 requirements met"
    }
  ],
  "gapCount": 5,
  "roleInsights": {
    "inferredRoleLevel": "Senior PM",
    "inferredRoleScope": "product",
    "titleMatch": {
      "exactTitleMatch": false,
      "adjacentTitleMatch": true
    },
    "goalAlignment": {
      "alignsWithTargetTitles": true,
      "alignsWithTargetLevelBand": true
    }
  },
  "jdRequirementSummary": {
    "coreTotal": 10,
    "preferredTotal": 5
  },
  "mws": {
    "summaryScore": 2,
    "details": [
      {
        "label": "Growth product work",
        "strengthLevel": "strong",
        "explanation": "Extensive B2B SaaS product-market fit experience"
      }
    ]
  },
  "companyContext": {
    "industry": "B2B SaaS",
    "maturity": "series-b",
    "businessModels": ["subscription", "enterprise"],
    "source": "jd",
    "confidence": 0.85
  }
}
```

### Stage Data Shapes

**jdAnalysis:**
```typescript
{
  roleInsights?: {
    inferredRoleLevel?: 'APM' | 'PM' | 'Senior PM' | 'Staff' | 'Group';
    inferredRoleScope?: 'feature' | 'product' | 'product_line' | 'multiple_teams' | 'org';
    titleMatch?: { exactTitleMatch: boolean; adjacentTitleMatch: boolean };
    scopeMatch?: { scopeRelation: 'belowExperience' | 'goodFit' | 'stretch' | 'bigStretch' };
    goalAlignment?: { alignsWithTargetTitles: boolean; alignsWithTargetLevelBand: boolean };
  };
  jdRequirementSummary?: { coreTotal: number; preferredTotal: number };
}
```

**requirementAnalysis:**
```typescript
{
  coreRequirements: Array<{
    id: string;
    text: string;
    met: boolean;
    evidence?: string;
  }>;
  preferredRequirements: Array<{
    id: string;
    text: string;
    met: boolean;
    evidence?: string;
  }>;
  requirementsMet: number;
  totalRequirements: number;
}
```

**goalsAndStrengths:**
```typescript
{
  mws?: {
    summaryScore: 0 | 1 | 2 | 3;
    details: Array<{
      label: string;
      strengthLevel: 'strong' | 'moderate' | 'light';
      explanation: string;
    }>;
  };
  companyContext?: {
    industry?: string;
    maturity?: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'growth' | 'public';
    businessModels?: string[];
    source?: 'jd' | 'web' | 'mixed';
    confidence?: number; // 0-1
  };
}
```

**sectionGaps:**
```typescript
{
  sections: Array<{
    sectionId: string; // Must match template section ID
    requirementGaps: Array<{
      id: string;
      type: 'missing_hook' | 'weak_connection' | 'missing_differentiator' | 'missing_metrics' | 'missing_specificity';
      requirement: string;
      suggestion: string;
      severity: 'critical' | 'important' | 'nice-to-have';
    }>;
  }>;
  totalGaps: number;
}
```

---

## PM Levels Job (`pmLevels`)

**Purpose:** Assess PM level + competencies + specializations

**Pipeline:** `supabase/functions/_shared/pipelines/pm-levels.ts`

### Stages

| Stage | Timeout | LLM Calls | Parallelization | Purpose |
|-------|---------|-----------|-----------------|---------|
| `baselineAssessment` | 15s | 1 (GPT-4) | Sequential | Map work history to IC level (IC3-IC9) |
| `competencyBreakdown` | 35s | 1 (GPT-4) | Sequential | Rate 4 core PM competencies (0-10 scale) |
| `specializationAssessment` | 50s | 1 (GPT-4) | Sequential | Identify PM specializations (Growth, Platform, AI/ML, Founding) |

**Total Duration:** ~100s (sequential execution)

### Result Shape

```typescript
interface PMLevelsJobResult {
  assessmentId: string; // Unique identifier for this assessment
  icLevel: number; // IC3-IC9 (Meta/FAANG scale)
  competencies: {
    execution: number; // 0-10
    strategy: number; // 0-10
    customerInsight: number; // 0-10
    influence: number; // 0-10
  };
  specializations: string[]; // e.g., ["growth", "platform"]
}
```

**Example:**
```json
{
  "assessmentId": "assessment-abc123",
  "icLevel": 5,
  "competencies": {
    "execution": 8,
    "strategy": 7,
    "customerInsight": 9,
    "influence": 6
  },
  "specializations": ["growth", "platform"]
}
```

### IC Level Scale

| Level | Title | Years of Experience | Scope |
|-------|-------|---------------------|-------|
| IC3 | Entry PM | 0-2 years | Features within a product |
| IC4 | Mid-level PM | 2-4 years | Small product or feature area |
| IC5 | Senior PM | 4-7 years | Product or product line |
| IC6 | Staff PM | 7-10 years | Multiple products or large product |
| IC7 | Senior Staff PM | 10-15 years | Product area or platform |
| IC8 | Principal PM | 15+ years | Org-level impact |
| IC9 | Distinguished PM | 20+ years | Company-wide strategy |

### Competency Definitions

| Competency | Description | Indicators |
|------------|-------------|------------|
| **Execution** | Delivering products on time, managing roadmaps, coordinating teams | Shipped products, roadmap management, cross-functional coordination |
| **Strategy** | Vision, market analysis, long-term planning, competitive positioning | Strategic documents, market analysis, vision setting |
| **Customer Insight** | User research, empathy, customer development, insights | User research, customer interviews, insight generation |
| **Influence** | Stakeholder management, leadership without authority, communication | Stakeholder alignment, cross-org influence, executive communication |

### Specialization Definitions

| Specialization | Description | Threshold | Indicators |
|----------------|-------------|-----------|------------|
| **Growth PM** | Growth loops, metrics, experimentation, acquisition/retention | Score > 5 | A/B testing, funnel optimization, activation loops |
| **Platform PM** | APIs, developer experience, infrastructure, multi-sided markets | Score > 5 | Developer tools, API design, platform ecosystems |
| **AI/ML PM** | ML products, data pipelines, AI features, model productization | Score > 5 | ML model integration, data pipelines, AI features |
| **Founding PM** | 0-1, startups, entrepreneurship, building from scratch | Score > 5 | 0-1 products, startup experience, founding roles |

### Stage Data Shapes

**baselineAssessment:**
```typescript
{
  icLevel: number; // 1-9
  roleToLevelMapping: Record<string, number>; // e.g., { "Senior PM at Stripe": 5 }
  assessmentBand: string; // e.g., "IC5-IC6"
}
```

**competencyBreakdown:**
```typescript
{
  execution: number; // 0-10
  strategy: number; // 0-10
  customerInsight: number; // 0-10
  influence: number; // 0-10
}
```

**specializationAssessment:**
```typescript
{
  growth?: number; // 0-10 (omit if no evidence)
  platform?: number; // 0-10 (omit if no evidence)
  aiMl?: number; // 0-10 (omit if no evidence)
  founding?: number; // 0-10 (omit if no evidence)
}
```

---

## Job Status Values

**Type:** `JobStatus = 'pending' | 'running' | 'complete' | 'error'`

| Status | Meaning | Next State |
|--------|---------|------------|
| `pending` | Job created, waiting to start | `running` |
| `running` | Job is executing, stages in progress | `complete` or `error` |
| `complete` | Job finished successfully, `result` populated | (terminal) |
| `error` | Job failed, `error_message` populated | (terminal) |

---

## Database Schema

**Table:** `jobs`

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL, -- 'onboarding' | 'coverLetter' | 'pmLevels'
  status TEXT NOT NULL, -- 'pending' | 'running' | 'complete' | 'error'
  input JSONB NOT NULL, -- Job-specific input (varies by type)
  result JSONB, -- Job-specific result (varies by type)
  stages JSONB, -- Stage progress data (SSE streaming)
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

---

## Frontend Hook Usage

**Hook:** `useJobStream(jobId?, options?)`

**Specialized Hooks:**
- `useCoverLetterJobStream(options?)` - Typed for cover letter jobs
- `useOnboardingJobStream(options?)` - Typed for onboarding jobs
- `usePMLevelsJobStream(options?)` - Typed for PM levels jobs

**Example:**
```typescript
const {
  state, // JobStreamState<'coverLetter'>
  createJob,
  connect,
  disconnect,
  isStreaming,
  error,
  reset,
} = useCoverLetterJobStream({
  autoStart: true,
  timeout: 300000, // 5 minutes
  onComplete: (result) => console.log('Job complete:', result),
  onError: (error) => console.error('Job error:', error),
  onProgress: (stage, data) => console.log(`Stage ${stage}:`, data),
});

// Create and start streaming
await createJob('coverLetter', {
  jobDescriptionId: 'jd-123',
  templateId: 'tmpl-456',
});
```

---

## SSE Event Structure

**Event Types:** `progress | complete | error | heartbeat`

**Progress Event:**
```json
{
  "type": "progress",
  "jobId": "job-123",
  "stage": "jdAnalysis",
  "isPartial": false,
  "data": {
    "roleInsights": { ... },
    "jdRequirementSummary": { ... }
  },
  "timestamp": "2025-12-04T19:53:15.000Z"
}
```

**Complete Event:**
```json
{
  "type": "complete",
  "jobId": "job-123",
  "result": {
    "metrics": [...],
    "gapCount": 5,
    ...
  },
  "timestamp": "2025-12-04T19:54:00.000Z"
}
```

**Error Event:**
```json
{
  "type": "error",
  "jobId": "job-123",
  "error": "Pipeline stage failed: requirementAnalysis",
  "timestamp": "2025-12-04T19:53:30.000Z"
}
```

---

## Performance Characteristics

### Onboarding Job
- **Average Duration:** 70s
- **LLM Token Usage:** ~5,000 tokens (2 calls in parallel)
- **Optimization:** Parallel execution saves 20-40s
- **Bottleneck:** `derivedArtifacts` stage (70s)

### Cover Letter Job
- **Average Duration:** 50s
- **LLM Token Usage:** ~8,000 tokens (4 calls, 2 parallel)
- **Optimization:** Parallel Layer 2 + JD analysis caching
- **Bottleneck:** `sectionGaps` stage (50s)
- **Cache Hit Rate:** ~60% for jdAnalysis (30min TTL)

### PM Levels Job
- **Average Duration:** 100s
- **LLM Token Usage:** ~6,000 tokens (3 sequential calls)
- **Optimization:** None (sequential by design)
- **Bottleneck:** `specializationAssessment` stage (50s)

---

## Related Files

**Backend:**
- `supabase/functions/_shared/pipelines/onboarding.ts`
- `supabase/functions/_shared/pipelines/cover-letter.ts`
- `supabase/functions/_shared/pipelines/pm-levels.ts`
- `supabase/functions/_shared/pipeline-utils.ts`
- `supabase/functions/_shared/telemetry.ts`

**Frontend:**
- `src/types/jobs.ts` - Type definitions
- `src/hooks/useJobStream.ts` - Streaming hook
- `src/hooks/useAPhaseInsights.ts` - A-phase insights hook
- `src/pages/NewUserOnboarding.tsx` - Onboarding job usage
- `src/components/cover-letters/CoverLetterModal.tsx` - Cover letter job usage
- `src/pages/Assessment.tsx` - PM levels job usage

**Documentation:**
- `/docs/qa/COMPREHENSIVE_QA_AUDIT_REPORT.md` - QA findings
- `/docs/architecture/COVER_LETTER_TEMPLATES.md` - Template spec
- `/docs/qa/TEST_STATUS.md` - Test suite status

---

## Future Enhancements

1. **Stage Name Centralization** (P3 - Low Priority)
   - Create `src/types/jobStages.ts` with stage name constants
   - Prevent magic string bugs

2. **Job Config Centralization** (P3 - Low Priority)
   - Move timeout/poll defaults to `src/lib/config/jobs.ts`
   - Easier tuning for production

3. **Streaming Onboarding** (In Progress)
   - Add SSE streaming to onboarding flow
   - Real-time progress updates in UI

4. **Template-Based Draft Generation** (Phase 2)
   - Update cover letter pipeline to use template sections
   - Mix static saved content with LLM-generated sections

---

**Document Version:** 1.0  
**Last Updated:** December 4, 2025  
**Next Review:** After streaming onboarding completion


