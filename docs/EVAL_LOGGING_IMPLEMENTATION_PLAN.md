# Evaluation Logging Extension Implementation Plan

**Branch**: `feat/eval-logging-jd-hil`  
**Status**: Infrastructure Phase (Ready for HIL Integration)  
**Date**: 2025-11-14

## Overview

This document outlines the implementation of evaluation logging for:
1. **JD Parsing Events** - Track job description ingestion quality and latency
2. **HIL Content Events** - Track user interactions in Human-In-Loop content creation:
   - Story creation & editing
   - Saved section creation & updating
   - Cover letter draft section edits

## Completed: Phase 1 - Infrastructure

### ✅ Database Schema Migration

**File**: `supabase/migrations/027_add_eval_logging_jd_hil_events.sql`

Added columns to `evaluation_runs` table:

#### JD Parse Columns
- `jd_parse_event` (JSONB) - Full parsing payload (company, role, requirements, differentiator summary)
- `jd_parse_status` (TEXT) - success | failed | pending

#### HIL Content Columns
- `hil_content_type` (TEXT) - story | saved_section | cover_letter_draft
- `hil_action` (TEXT) - ai_suggest | manual_edit | apply_suggestion
- `hil_content_id` (TEXT) - Reference to the content item
- `hil_content_word_delta` (INTEGER) - Change in word count
- `hil_gap_coverage` (JSONB) - Gap closure tracking
- `hil_gaps_addressed` (TEXT[]) - Array of gap IDs
- `hil_status` (TEXT) - success | failed | pending

#### Performance Indexes
- `idx_evaluation_runs_jd_parse_status`
- `idx_evaluation_runs_hil_content_type`
- `idx_evaluation_runs_hil_status`
- `idx_evaluation_runs_event_user` (composite)

### ✅ Type Definitions

**File**: `src/types/evaluationEvents.ts`

Comprehensive type system for all event payloads:

```typescript
// JD Parsing
export interface JDParseEvent { /* ... */ }

// HIL Content (discriminated union)
export type HILContentType = 'story' | 'saved_section' | 'cover_letter_draft';
export type HILActionType = 'ai_suggest' | 'manual_edit' | 'apply_suggestion';

export interface HILStoryEvent { /* ... */ }
export interface HILSavedSectionEvent { /* ... */ }
export interface HILDraftEvent { /* ... */ }

export type HILContentEvent = HILStoryEvent | HILSavedSectionEvent | HILDraftEvent;
export type EvaluationEvent = JDParseEvent | HILContentEvent;
```

### ✅ EvaluationEventLogger Service

**File**: `src/services/evaluationEventLogger.ts`

Centralized, type-safe event emission (Composition + SRP pattern):

```typescript
export class EvaluationEventLogger {
  static async logJDParse(event: JDParseEvent, options?: LogEventOptions)
  static async logHILStory(event: HILStoryEvent, options?: LogEventOptions)
  static async logHILSavedSection(event: HILSavedSectionEvent, options?: LogEventOptions)
  static async logHILDraft(event: HILDraftEvent, options?: LogEventOptions)
}
```

**Benefits**:
- Single source of truth for event logging
- No duplication of logging logic
- Type-safe event payloads
- Consistent error handling
- Easy to test and mock

### ✅ Comprehensive Tests

**File**: `src/services/evaluationEventLogger.test.ts`

Test coverage:
- ✅ JD parse success/failure scenarios
- ✅ HIL story creation with gap tracking
- ✅ HIL saved section events
- ✅ HIL draft edits with gap coverage
- ✅ Synthetic profile handling
- ✅ Database error handling
- ✅ Exception handling

Run tests with:
```bash
npm test -- src/services/evaluationEventLogger.test.ts
```

## Next Phase: JD Parsing Integration

### Task 1: Extend JobDescriptionService

**File**: `src/services/jobDescriptionService.ts`

The `parseAndCreate()` method needs to emit `jd.parse.completed` events:

```typescript
async parseAndCreate(options: CreateJobDescriptionInput) {
  const startTime = Date.now();
  
  try {
    // ... existing parsing logic ...
    const parsed: ParsedJobDescription = { /* ... */ };
    const jd = await supabase.from('job_descriptions').insert({...}).select().single();
    
    // Log success event
    await EvaluationEventLogger.logJDParse({
      userId: getCurrentUserId(),
      jobDescriptionId: jd.id,
      rawTextChecksum: md5(options.content),
      company: parsed.company,
      role: parsed.role,
      requirements: parsed.requirements,
      differentiatorSummary: parsed.differentiator,
      inputTokens: llmResponse.usage.prompt_tokens,
      outputTokens: llmResponse.usage.completion_tokens,
      latency: Date.now() - startTime,
      status: 'success',
      sourceUrl: options.url,
    });
    
    return jd;
  } catch (error) {
    // Log failure event
    await EvaluationEventLogger.logJDParse({
      userId: getCurrentUserId(),
      jobDescriptionId: 'pending',
      rawTextChecksum: md5(options.content),
      inputTokens: 0,
      outputTokens: 0,
      latency: Date.now() - startTime,
      status: 'failed',
      error: error.message,
    });
    throw error;
  }
}
```

### Task 2: Write JD Parser Tests

Test the integration with mock Supabase and EvaluationEventLogger.

## Future Phase: HIL Content Integration

### Task 3: Story Content Creation

Emit `HILStoryEvent` when users:
- Generate new story via AI
- Apply suggested improvements
- Manually edit story

### Task 4: Saved Section Creation

Emit `HILSavedSectionEvent` when users:
- Save new section
- Update existing section
- Apply section suggestions

### Task 5: Draft Edit Tracking

Emit `HILDraftEvent` when users:
- Edit draft section
- Apply gap suggestions
- Regenerate section

## Key Design Patterns

### 1. Composition Over Inheritance
- `EvaluationEventLogger` is a standalone service
- Services consume it through method calls
- No class inheritance needed

### 2. DRY Principle
- Single logging implementation shared across all event types
- Centralized error handling
- No duplicated logic across services

### 3. Single Responsibility
- `EvaluationEventLogger` only: event emission + persistence
- Services are responsible for collecting payload data
- Database operations handled by Supabase client

### 4. Type Safety
- Discriminated union types for HIL events
- Type guards prevent invalid payload combinations
- TypeScript ensures payload correctness at compile time

## Testing Strategy

### Unit Tests
- ✅ `EvaluationEventLogger.test.ts` - Event emission and persistence
- TODO: `JobDescriptionService.test.ts` - JD parsing + event logging
- TODO: `useHILStory.test.tsx` - Story creation + event emission
- TODO: `useHILSavedSection.test.tsx` - Saved section + event emission
- TODO: `useHILDraft.test.tsx` - Draft edits + event emission

### Integration Tests
- TODO: End-to-end JD parsing → evaluation_runs
- TODO: End-to-end HIL story → evaluation_runs
- TODO: Verify gap coverage tracking
- TODO: Verify synthetic profile tagging

### Manual Testing Checklist
- [ ] Create JD → verify evaluation_runs entry
- [ ] AI-suggest story → verify HIL event
- [ ] Manual edit story → verify HIL event
- [ ] Apply saved section → verify HIL event
- [ ] Edit draft section → verify HIL event with gap tracking

## Data Flow Diagram

```
JD Upload
    ↓
JobDescriptionService.parseAndCreate()
    ↓
LLM Analysis (tokens, latency)
    ↓
Supabase: job_descriptions table
    ↓
EvaluationEventLogger.logJDParse()
    ↓
Supabase: evaluation_runs table ✅ (logged)

---

HIL Story Generation
    ↓
useHILStory() hook
    ↓
ContentGenerationService.generateStory()
    ↓
LLM Analysis + Gap Detection
    ↓
Supabase: (stories || approved_content) table
    ↓
EvaluationEventLogger.logHILStory()
    ↓
Supabase: evaluation_runs table ✅ (logged)
```

## Branch Information

- **Worktree**: `/Users/admin/narrata-eval-logging`
- **Branch**: `feat/eval-logging-jd-hil`
- **Base Branch**: `feature/hil-content-generation`
- **Created**: 2025-11-14

## Commit Strategy

### Phase 1 (Infrastructure) - Ready to commit
```bash
git add supabase/migrations/027_add_eval_logging_jd_hil_events.sql
git add src/types/evaluationEvents.ts
git add src/services/evaluationEventLogger.ts
git add src/services/evaluationEventLogger.test.ts
git add docs/EVAL_LOGGING_IMPLEMENTATION_PLAN.md
git commit -m "feat: add evaluation logging infrastructure for JD & HIL events

- Add database schema columns for JD parse and HIL content events
- Create EvaluationEventLogger service (centralized, type-safe event emission)
- Define comprehensive event types (JDParseEvent, HILStoryEvent, etc.)
- Add unit tests for all event logger methods
- Add implementation documentation

Next: Integrate with JobDescriptionService and HIL handlers"
```

### Phase 2 (JD Integration) - Pending JD Service extension
```bash
git add src/services/jobDescriptionService.ts
git add src/services/jobDescriptionService.test.ts
git commit -m "feat: integrate JD parsing with evaluation logging

- Emit jd.parse.completed events from parseAndCreate()
- Track JD parsing latency and token usage
- Log failures with error details
- Add tests for JD logging integration"
```

### Phase 3 (HIL Integration) - Pending HIL handler updates
```bash
git add src/hooks/useHILStory.ts
git add src/hooks/useHILSavedSection.ts
git add src/hooks/useHILDraft.ts
git commit -m "feat: integrate HIL content creation with evaluation logging

- Emit HIL events for all content creation flows
- Track gap coverage and word deltas
- Log per-action telemetry (ai_suggest, manual_edit, apply_suggestion)
- Add integration tests"
```

## Next Steps

1. ✅ Create new worktree & branch
2. ✅ Implement infrastructure (schema, service, types, tests)
3. ⏳ Integrate with JobDescriptionService
4. ⏳ Integrate with HIL handlers (story, saved section, draft)
5. ⏳ Write integration tests
6. ⏳ QA & manual testing
7. ⏳ Merge to main

## FAQ

**Q: Why a separate worktree?**  
A: Parallel development - allows JD & HIL logging to proceed independently without blocking other features.

**Q: How do I run the migration?**  
A: The Supabase Dashboard auto-applies migrations. Or use `npm run db:migrate` (if implemented).

**Q: How will this affect performance?**  
A: Event logging is fire-and-forget async. No blocking. Supabase async ensures UI remains responsive.

**Q: Can I filter events in the dashboard?**  
A: Yes! Use the new indexes: `jd_parse_status`, `hil_content_type`, `user_id`.

**Q: What about PII in JD logs?**  
A: MVP defers redaction. Future: add hashing/sanitization layer (see open questions in EVAL_LOGGING_EXTENSION.md).

## References

- EVAL_LOGGING_EXTENSION.md - Original specification
- CLAUDE.md - Architecture overview
- evaluationEventLogger.ts - Service implementation
- evaluationEvents.ts - Type definitions

