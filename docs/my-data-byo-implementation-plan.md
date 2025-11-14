# My Data & BYOM — Implementation Plan (MVP Beta)

## Objectives
- Expose the Narrata-managed OpenAI provider and allow a single BYOM provider per user.
- Surface resume and cover-letter assets with manage actions plus 30-day soft delete, including dependency messaging.
- Provide privacy summary and a streamlined path for users to request preference changes.
- Evaluate a lightweight usage snapshot as a stretch goal while instrumenting analytics and logging ahead of beta.

## Assumptions
- Supabase remains source of truth for user settings and uploaded assets.
- Secrets storage service is available for encrypting BYOM credentials.
- Existing usage analytics can return aggregate generation counts and token totals per user.

## Phase 0 — Discovery & Technical Design
1. Confirm data models for resumes and cover letters, including retention hooks.
2. Align with platform security on credential encryption and retrieval boundaries.
3. Finalize UX mocks with Design (cards, toggles, status states, modal flows).
4. Document API contracts for settings endpoints (provider selection, preferences, usage summary).

## Phase 1 — Backend Enablement
### 1.1 Provider Management
- Create Supabase tables/columns for `provider_type`, `provider_config`, and status timestamps.
- Implement server endpoint to switch between Narrata default and user provider.
- Integrate AI SDK provider abstraction for validation ping (OpenAI-compatible/custom).
- Store encrypted credentials; expose masked metadata for UI.

### 1.2 Usage Snapshot API (Stretch)
- If prioritized, add service aggregating monthly generation and token counts.
- Include fallback handling when analytics service is unavailable.

### 1.3 Personal Data Retention
- Update asset storage logic to flag deleted items and schedule 30-day purge.
- Expose metadata (filename, uploaded_at, size) through settings API.
- Ensure delete endpoint removes personalization references immediately.

### 1.4 Preferences & Privacy
- Serve privacy copy and external links from CMS/config service.
- Provide endpoint or logging hook to capture “preference update requested” events routed to support tooling.

### Deliverables
- Unit tests for provider validation, retention flags, and preference-request logging.
- API documentation for frontend integration.

## Phase 2 — Frontend Implementation
### 2.1 Framework & State
- Build reusable hooks: `useProviderSettings`, `usePersonalDataAssets`, and (if stretch delivered) `useUsageSnapshot`.
- Introduce context provider to share My Data state across preference modal if needed.

### 2.2 UI Components
- `MyDataPanel` main layout referencing design tokens.
- Provider card with status chip, BYOM wizard modal, validation feedback.
- Resume/Cover Letter cards with action menus, dependency callouts, and confirmation dialogs.
- Privacy section with copy, links, and “Contact support to adjust preferences” CTA.
- Usage snapshot widget (stretch) with monthly counts and provider label.

### 2.3 Error & Loading Handling
- Skeleton loaders for each section.
- Toasts or inline alerts for validation failures, delete confirmations, and fallback messaging.

### 2.4 Analytics
- Fire events for page view, provider connected/failed, data deleted, preference update requested, and (stretch) usage snapshot viewed.

### Deliverables
- Storybook (or equivalent) entries for key components.
- Frontend unit/integration tests covering hooks and critical flows.

## Phase 3 — QA & Beta Readiness
1. Write manual QA checklist including BYOM validation, delete retention behavior, dependency messaging, preference-request logging, and fallback states.
2. Implement logging dashboards for provider errors and usage adoption metrics.
3. Run accessibility audit (keyboard navigation, aria labels).
4. Conduct beta dry run with internal accounts using Narrata default and BYOM setups.
5. Prepare rollout comms and support scripts for BYOM troubleshooting.

## Risk Mitigation
- **Credential validation failures**: Provide detailed error messaging and safe reversion; add exponential backoff for repeated attempts.
- **Retention policy gaps**: Schedule cron to permanently purge records after 30 days; alert on orphaned assets.
- **Analytics latency**: Cache usage totals and display last refreshed timestamp.
- **Legal copy updates**: Externalize strings for fast revisions without code deploy.

## Testing Strategy
- Backend unit tests for provider validation, preference-request logging, retention soft delete.
- Frontend tests using React Testing Library for form flows, dependency messaging, and state updates.
- End-to-end tests (Playwright) covering BYOM connection, asset deletion cascading effects, and preference request flow.
- Monitoring checks verifying fallback to Narrata default when custom provider unavailable.

## Rollout Checklist
- ✅ Backend migrations deployed and verified.
- ✅ API integrations covered by automated tests and QA sign-off.
- ✅ Frontend feature behind feature flag until beta launch.
- ✅ Analytics dashboards reviewed with PM and Support.
- ✅ Support documentation published (FAQ, troubleshooting).

