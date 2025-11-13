# My Data & BYOM — MVP PRD

## 1. Purpose & Scope
Deliver a trust-centric control panel where each Narrata member can view the managed OpenAI setup, optionally switch to a personal provider (Bring Your Own Model), and review key personal data inputs plus privacy commitments. MVP must be stable enough for immediate private beta.

## 2. Goals
- **Clarity**: Expose which model powers a workspace and what personal assets Narrata stores.
- **Control**: Simple toggle between Narrata’s default OpenAI key and a user-supplied provider (one per user).
- **Trust**: Summarize privacy practices and offer essential opt-ins/outs.

## 3. Target Users
- Active Narrata members generating content.
- Power users who need custom model credentials or compliance assurances.
- Narrata support team referencing settings during triage.

## 4. Use Cases
1. Check current model provider status and fall back to Narrata default if own key fails.
2. Connect a single custom provider (OpenAI-compatible or custom endpoint via AI SDK provider abstraction).
3. Review and manage uploaded resume and cover-letter data (view, replace, delete).
4. Read a concise privacy summary and adjust marketing and job-matching preferences.
5. View a lightweight AI usage snapshot (aggregate counts) to understand throughput.
6. Initiate data deletion (asset level) with clear retention disclosure.

## 5. Experience Pillars
### 5.1 Model Management
- Always show “Narrata Managed OpenAI” card.
- BYOM flow to collect provider type, credentials, and validation.
- Persist encrypted credentials; allow instant revert to Narrata default.
- Surface connection status and validation feedback.

### 5.2 Personal Data Inventory
- Cards for resume and cover letters with filename, timestamp, size, and usage note.
- Actions: view/download, replace, delete.
- Deletion confirmations explain personalization impact.

### 5.3 Trust & Privacy
- Inline summary of data usage (matching, recommendations, outreach).
- Links to Privacy Policy, Data Handling FAQ, and account deletion request path.
- Single contact entry (support or settings email) to adjust preferences until granular controls ship.

### 5.4 Usage Snapshot (Stretch)
- Nice-to-have aggregated counts for this month’s AI generations and tokens.
- “Last generated with” label showing active provider and model.
- Clearly marked as stretch goal; core MVP can launch without it.

## 6. Functional Requirements
### 6.1 Model Provider Module
- Display Narrata default provider status (Connected/Needs Attention/Error).
- BYOM wizard collects provider type, API key, optional base URL, and model ID.
- Async validation call with success/error states; do not block UI.
- Event logging for provider connection, validation failure, and reversion.

### 6.2 Personal Data Cards
- Resume and Cover Letter cards with metadata, actions, and dependency callouts (e.g., resume drives work history; cover letters drive templates and saved sections).
- Changes cascade to linked experiences (update work history, regenerate templates) and show confirmation tooltips explaining impact.
- Delete action warns that the account returns to onboarding state and removes personalization artifacts.
- Immediate removal from personalization pipeline upon delete.
- Soft delete retained for 30 days (see §8) for recovery; flag for support.

### 6.3 Privacy & Preferences
- Short-form privacy copy plus links to full documents.
- Provide a simple “Contact support to update preferences” pathway; defer granular toggles to a future iteration.
- Track when users request preference changes for internal auditing.

### 6.4 Usage Snapshot (Stretch)
- If delivered, display aggregate counts sourced from existing analytics service.
- Show last generation timestamp/provider.
- Warn if data unavailable; provide fallback messaging.

## 7. Non-Functional Requirements
- Encrypt BYOM credentials at rest; redact secrets in logs.
- Panel loads with skeleton states; validation requests run asynchronously.
- Keyboard accessible controls and descriptive status text.
- Instrument analytics for page views and key interactions.

## 8. Data Retention Recommendation
- Resume and cover-letter deletions trigger immediate removal from personalization workflows.
- Maintain encrypted soft-delete backup for 30 days to recover accidental deletions.
- Purge permanently after 30 days; disclose policy in confirmation dialogs.

## 9. Dependencies
- AI SDK provider abstraction for default and BYOM integrations ([Vercel AI SDK Providers and Models](https://ai-sdk.dev/docs/foundations/providers-and-models)).
- Secrets storage and validation endpoints.
- Document storage service for resume/cover-letter assets.
- Legal-reviewed privacy copy.
- Analytics instrumentation updates.

## 10. Success Indicators
- ≥40% of active users visit “My Data” within 30 days of launch.
- <5% BYOM validation failure rate after initial setup.
- Reduction in support tickets about custom model setup compared to pre-MVP baseline.
- Positive qualitative feedback on transparency in post-beta survey.

## 11. Out of Scope
- Multiple simultaneous providers per user.
- Enterprise audit/export functionality.
- Integrations for LinkedIn or Google Drive within My Data.
- Detailed usage exports (defer until demand validated).

## 12. Beta Readiness Checklist
- BYOM validation stable across supported providers.
- Retention soft-delete workflow verified end-to-end.
- Privacy copy approved by legal.
- Analytics dashboards tracking adoption and failures.

