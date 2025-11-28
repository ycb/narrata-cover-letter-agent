# W10 – Draft Readiness Metric Specification

## 1. Overview
We introduce a holistic **Draft Readiness** evaluation that gives the user a clear, editorial verdict on whether the current draft is “good enough to send.” The readiness judge runs **after every material draft change** (first generation, HIL revisions, manual edits) and returns a four-tier rating plus concrete improvement feedback. The signal remains separate from A-phase insights and from existing draft/enhancedMatchData fields.

## 2. Goals & Non-Goals
| Goals | Non-Goals |
| --- | --- |
| Provide Weak/Adequate/Strong/Exceptional verdict with short feedback. | Modify draft schema, enhancedMatchData, or gap logic. |
| Surface readiness primarily in the Match Metrics toolbar (accordion) and optionally in finalization modal | Replace existing metrics (overall score, requirements) or block user actions. |
| Cache evaluations per draft with upsert + TTL (e.g., 10 minutes) to avoid redundant LLM calls. | Run during A-phase or alter streaming stages. |
| Trigger automatically after draft creation and each save event (HIL/manual). | Rewrite draft sections or inject new content. |

Feature flag: **`ENABLE_DRAFT_READINESS`** (default off).

## 3. Data Flow & Storage
1. Frontend requests readiness via `/api/drafts/:id/readiness`.
2. API calls `CoverLetterDraftService.getReadinessEvaluation(draftId)`.
3. Service checks `draft_quality_evaluations` table; if stale/missing, calls Edge Function `evaluate-draft-readiness`.
4. Edge Function fetches draft text + JD context, runs LLM judge, writes result back to table, returns JSON payload.
5. FE displays verdict + details; user can manually refresh (optional).

### Table: `draft_quality_evaluations`
| Column | Type | Notes |
| --- | --- | --- |
| `draft_id` | uuid (PK/FK) | references drafts |
| `rating` | enum (`weak`,`adequate`,`strong`,`exceptional`) | main verdict |
| `score_breakdown` | jsonb | 10-dimension map (see §5) |
| `feedback_summary` | text | 1-sentence verdict |
| `improvements` | jsonb array of strings | actionable suggestions |
| `evaluated_at` | timestamptz | last evaluation time |
| `ttl_expires_at` | timestamptz | recompute after expiration |
| `metadata` | jsonb | store model, latency, etc. |

## 4. Rating Scale
| Rating | Definition |
| --- | --- |
| **Weak** | Major structural issues; lacks personalization; unsuitable without heavy revision. |
| **Adequate** | Coherent and professional but uneven; good starting point needing refinement. |
| **Strong** | Persuasive, tailored, evidence-backed; minor polish only. |
| **Exceptional** | Immediate send; crisp narrative, deep alignment, quantified impact. |

## 5. Evaluation Dimensions
Each dimension returns `strong`, `sufficient`, or `insufficient`.

1. **Clarity & Structure** (flow, logical ordering)  
2. **Compelling Opening**  
3. **Company Alignment**  
4. **Role Alignment / Level Fit**  
5. **Specific Examples**  
6. **Quantified Impact**  
7. **Personalization / Voice**  
8. **Writing Quality** (grammar, tone)  
9. **Length & Efficiency**  
10. **Executive Maturity / Product Thinking**

## 6. LLM Input Contract
```
{
  "draft": "<full merged draft text>",
  "companyContext": {
    "name": "...",
    "industry": "...",
    "mission": "...",
    "values": ["...", "..."]
  },
  "roleContext": {
    "title": "...",
    "level": "Senior PM",
    "keyRequirements": ["...", "..."]
  }
}
```
LLM must **not** hallucinate new facts or rewrite the draft. Only evaluate.

## 7. JSON Output Schema
```
{
  "rating": "weak" | "adequate" | "strong" | "exceptional",
  "scoreBreakdown": {
    "clarityStructure": "strong" | "sufficient" | "insufficient",
    "opening": "...",
    "companyAlignment": "...",
    "roleAlignment": "...",
    "specificExamples": "...",
    "quantifiedImpact": "...",
    "personalization": "...",
    "writingQuality": "...",
    "lengthEfficiency": "...",
    "executiveMaturity": "..."
  },
  "feedback": {
    "summary": "Concise editorial verdict.",
    "improvements": [
      "Actionable improvement #1",
      "Actionable improvement #2"
    ]
  }
}
```
Validation: missing fields or mismatched enums should raise and retry (max 2 attempts).

## 8. Prompt Template (Skeleton)
```
System:
You are an experienced product editor...

User:
<JD + company summary>
<Draft text>

Instructions:
- Follow the rubric below...
- Do not rewrite text.
- Do not invent facts.
- Output JSON exactly matching schema.
```
Rubric section enumerates rating definitions, dimension criteria, feedback rules, safety constraints.

## 9. Safety & Behavioral Constraints
- Never recommend adding false specifics.  
- Improvements must reference actual deficiencies.  
- Limit summary to ≤140 chars.  
- At most 3 improvement bullets.  
- Deny evaluation if draft < 150 words (return rating `weak` + reason).

## 10. Evaluation Lifecycle
| Trigger | Behavior |
| --- | --- |
| Draft generated | enqueue evaluation immediately after B-phase completion. |
| HIL / manual save | enqueue evaluation if last eval older than 2 minutes or diff > N chars. |

TTL: 10 minutes (evaluation reused until TTL expires). No manual refresh button in W10; all updates happen via auto triggers. Retries/backoff handled in Edge Function; UI shows spinner + “Readiness verdict unavailable” fallback on failure.

## 11. Telemetry
- `stream_readiness_eval_started/completed` (Edge) with latency + rating.
- `ui_readiness_card_viewed`, `ui_readiness_manual_refresh`, `ui_readiness_finalize_submit`.

## 12. UI Decisions (Resolved)
- **TTL**: 10 minutes.  
- **Refresh**: auto-only (no button).  
- **scoreBreakdown**: expose in readiness accordion as labeled strengths/weaknesses.  
- **Improvements list**: shown under the verdict inside the readiness accordion.  
- **Localization**: English only for W10.

---
**Next Steps**  
- PM to finalize prompt text + examples using this spec.  
- After approval, unblock backend Task 2 (table + Edge Function).


