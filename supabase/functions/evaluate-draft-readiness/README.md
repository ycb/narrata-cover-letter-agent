# evaluate-draft-readiness

Edge Function that evaluates a cover letter draft and caches the verdict in `draft_quality_evaluations`.

## Responsibilities

- Enforces the `ENABLE_DRAFT_READINESS` feature flag (returns `403` when disabled).
- Validates auth via Supabase JWT and ensures the draft belongs to the caller.
- Reuses cached evaluations until `ttl_expires_at` (10 minutes by default) and surfaces `fromCache` in the response.
- Guards short drafts (`<150` words) with a synthetic `weak` verdict instead of calling the LLM.
- Loads context via `_shared/readiness.ts`, streams a JSON response from the readiness judge, validates the schema, and upserts the result with latency metadata.

## Environment Variables

| Name | Description |
| --- | --- |
| `ENABLE_DRAFT_READINESS` | Must be `true` to enable the function. |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for database + auth operations. |
| `OPENAI_API_KEY` | API key used by the readiness judge. |

## Local Development

```bash
# Serve only this function (needs Supabase CLI + env vars)
supabase functions serve evaluate-draft-readiness --env-file ./supabase/.env.development.local
```

## Invocation Example

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user-access-token>" \
  -d '{"draftId":"00000000-0000-0000-0000-000000000000"}' \
  https://<project>.supabase.co/functions/v1/evaluate-draft-readiness
```

Successful responses:

```json
{
  "rating": "strong",
  "scoreBreakdown": { "...": "..." },
  "feedback": {
    "summary": "Concise editorial verdict.",
    "improvements": ["Actionable improvement"]
  },
  "evaluatedAt": "2025-11-28T00:00:00.000Z",
  "ttlExpiresAt": "2025-11-28T00:10:00.000Z",
  "fromCache": false
}
```

## Tests

Edge-function-local tests live in `supabase/functions/evaluate-draft-readiness/__tests__`.

```bash
deno test --allow-env --allow-read --allow-write \
  supabase/functions/evaluate-draft-readiness/__tests__/handler.test.ts
```

