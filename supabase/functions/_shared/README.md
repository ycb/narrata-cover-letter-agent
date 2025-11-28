# Edge Functions Shared Utilities

Shared utilities and helpers for Narrata Edge Functions (Supabase streaming pipelines).

## Overview

This directory contains:
- **Pipeline execution framework** (`pipeline-utils.ts`)
- **PM Levels profile loader** (`pm-levels.ts`)
- **Logging utilities** (`log.ts`)
- **Telemetry tracking** (`telemetry.ts`)
- **Pipeline implementations** (`pipelines/`)

## PM Levels Profile Loader

### Purpose

Provides a canonical loader for PM Levels profile data used by streaming insights (JD analysis, goals and strengths, etc.).

### API

```typescript
import { getPMLevelsProfile } from './_shared/pm-levels.ts';
// or
import { getPMLevelsProfile } from './_shared/pipeline-utils.ts'; // re-exported

const profile = await getPMLevelsProfile(supabase, userId);
```

### Return Type

```typescript
interface PMLevelsProfile {
  inferredLevel: string | null;          // e.g., "L4", "L5", "L6"
  targetLevelBand: string | null;        // e.g., "L5-L6", "L6"
  inferredLevelTitle: string | null;     // e.g., "Senior Product Manager"
  specializations: string[];             // e.g., ["growth", "platform", "ai_ml"]
  confidence: number | null;             // 0-1 confidence score
  lastAnalyzedAt: string | null;         // ISO timestamp
}
```

### Behavior

- **Never throws** on "user not found" - returns null-safe structure
- Queries canonical `user_levels` table
- Derives target level band from current level (1-2 levels up)
- Returns empty arrays/nulls if profile doesn't exist
- Includes light logging for dev diagnostics

### Usage in Pipelines

See `examples/pm-levels-usage.ts` for full examples.

#### Quick Example: JD Analysis

```typescript
const pmProfile = await getPMLevelsProfile(supabase, job.user_id);

// Safe to use - never null
const hasProfile = pmProfile.inferredLevel !== null;

if (hasProfile) {
  await send('progress', {
    stage: 'jdAnalysis',
    insight: 'pmLevelAlignment',
    data: {
      userLevel: pmProfile.inferredLevel,
      specializations: pmProfile.specializations,
      targetBand: pmProfile.targetLevelBand,
    }
  });
}
```

### Testing

Manual test harness available:

```bash
cd supabase/functions/_shared/__tests__
deno run --allow-env --allow-net pm-levels.test.ts <user-id>
```

## Pipeline Utilities

### Core Functions

- `executePipeline(stages, context)` - Run multi-stage pipeline with progress events
- `callOpenAI(params)` - Call OpenAI API with retries
- `parseJSONResponse(content)` - Extract JSON from LLM responses
- `fetchWorkHistory(supabase, userId)` - Load user work items
- `fetchStories(supabase, userId)` - Load user approved stories
- `fetchJobDescription(supabase, jdId)` - Load job description

### Pipeline Context

```typescript
interface PipelineContext {
  job: any;                    // Current job record
  supabase: SupabaseClient;    // Supabase client (RLS context)
  send: SSESender;             // SSE event sender
  openaiApiKey: string;        // OpenAI API key
  telemetry?: PipelineTelemetry;
}
```

## Logging

Use the shared logger:

```typescript
import { elog } from './_shared/log.ts';

elog.info('Message');
elog.error('Error:', error);
```

## Telemetry

Track pipeline performance:

```typescript
import { PipelineTelemetry } from './_shared/telemetry.ts';

const telemetry = new PipelineTelemetry(jobId, jobType);
telemetry.startStage('stageName');
// ... stage work ...
telemetry.endStage(true); // or false on error
telemetry.complete(true);
```

## Directory Structure

```
_shared/
├── README.md               # This file
├── pm-levels.ts            # PM Levels profile loader
├── pipeline-utils.ts       # Core pipeline utilities
├── log.ts                  # Logging utilities
├── telemetry.ts            # Telemetry tracking
├── pipelines/
│   ├── cover-letter.ts     # Cover letter pipeline
│   ├── onboarding.ts       # Onboarding pipeline
│   └── pm-levels.ts        # PM Levels pipeline
├── examples/
│   └── pm-levels-usage.ts  # Usage examples
└── __tests__/
    └── pm-levels.test.ts   # PM Levels loader tests
```

## Design Principles

1. **Single Responsibility** - Each utility has one clear purpose
2. **Null-Safe Defaults** - Never throw on expected "not found" cases
3. **Light Logging** - Log hits/misses for debugging, not verbose
4. **Composable** - Small, focused functions for pipeline stages
5. **No Schema Changes** - Query existing tables, don't create new ones

