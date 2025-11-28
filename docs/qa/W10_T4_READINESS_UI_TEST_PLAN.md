# W10 Task 4 — Readiness UI Test Plan

**Feature:** Draft Readiness Metric UI Integration  
**Sprint:** W10  
**Owner:** Frontend Team  
**Status:** Ready for QA

---

## Test Environment Setup

### Prerequisites
1. T2 (Edge Function) deployed and functional
2. T3 (Service API) deployed and functional
3. Database migration for `draft_quality_evaluations` table applied
4. Feature flag enabled in environment

### Environment Variables
```bash
# Enable the feature
ENABLE_DRAFT_READINESS=true

# Optional: Verify Supabase connection
VITE_SUPABASE_URL=<your_url>
VITE_SUPABASE_ANON_KEY=<your_key>
```

### Test Data Requirements
- At least one user account
- At least one job description with substantial content
- User profile with work history
- User with completed goals (for better match metrics)

---

## Test Cases

### TC-1: Feature Flag Gating (OFF)

**Precondition:** `ENABLE_DRAFT_READINESS=false` or unset

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Create a new cover letter draft | Draft generates normally |
| 2 | Wait for B-phase completion (isPostHIL=true) | Draft completes without errors |
| 3 | Check Match Metrics toolbar | No "Readiness" accordion visible |
| 4 | Open browser DevTools Network tab | No requests to `/api/drafts/:id/readiness` |
| 5 | Click "Review & Finalize" | Modal opens without readiness card |
| 6 | Check browser console | No telemetry events for readiness |

**Pass Criteria:**
- ✅ Readiness UI completely hidden
- ✅ No network calls to readiness API
- ✅ No console errors
- ✅ Other toolbar accordions work normally

---

### TC-2: Feature Flag Gating (ON)

**Precondition:** `ENABLE_DRAFT_READINESS=true`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Create a new cover letter draft | Draft generates normally |
| 2 | Wait for B-phase completion (isPostHIL=true) | Draft completes |
| 3 | Check Match Metrics toolbar | "Readiness" accordion visible at bottom |
| 4 | Open browser DevTools Network tab | Request to `/api/drafts/:id/readiness` |
| 5 | Click "Review & Finalize" | Modal shows readiness card |
| 6 | Check browser console | Telemetry event: `ui_readiness_card_viewed` |

**Pass Criteria:**
- ✅ Readiness accordion appears
- ✅ API call made with correct draft ID
- ✅ Telemetry events fire
- ✅ No console errors

---

### TC-3: Toolbar Accordion — Collapsed State

**Precondition:** Feature enabled, draft post-HIL, readiness data available

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Locate "Readiness" accordion in toolbar | Visible at bottom of toolbar |
| 2 | Observe badge | Shows verdict: "Weak" / "Adequate" / "Strong" / "Exceptional" |
| 3 | Check badge color | Color matches verdict:<br>- Exceptional: green border/text<br>- Strong: blue border/text<br>- Adequate: yellow border/text<br>- Weak: gray border/text |
| 4 | Verify other accordions | Other metrics (Goals, Core, Preferred, Rating, A-phase) still visible |

**Pass Criteria:**
- ✅ Badge text is capitalized correctly
- ✅ Color matches verdict tier
- ✅ Accordion button is clickable
- ✅ No layout overflow or text truncation

---

### TC-4: Toolbar Accordion — Expanded State

**Precondition:** Feature enabled, draft post-HIL, readiness data available

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Click "Readiness" accordion button | Drawer expands smoothly |
| 2 | Check browser console | Telemetry event: `ui_readiness_card_expanded` with draftId |
| 3 | Verify verdict display | Badge shows same verdict as collapsed state |
| 4 | Verify feedback summary | Short text summary (≤140 chars) |
| 5 | Verify score breakdown table | 10 rows visible:<br>1. Clarity & Structure<br>2. Compelling Opening<br>3. Company Alignment<br>4. Role Alignment / Level Fit<br>5. Specific Examples<br>6. Quantified Impact<br>7. Personalization / Voice<br>8. Writing Quality<br>9. Length & Efficiency<br>10. Executive Maturity |
| 6 | Check dimension values | Each row shows: "strong" / "sufficient" / "insufficient" |
| 7 | Check dimension colors | strong=green, sufficient=yellow, insufficient=gray |
| 8 | Verify improvements section | Shows ≤3 bullet points |
| 9 | Verify advisory disclaimer | "Advisory only; does not block finalization." |
| 10 | Click accordion button again | Drawer collapses smoothly |

**Pass Criteria:**
- ✅ All 10 dimensions visible
- ✅ Badge colors match values
- ✅ Improvements list limited to 3 items
- ✅ Smooth expand/collapse animation
- ✅ No scroll overflow inside drawer

---

### TC-5: Toolbar Accordion — Loading State

**Precondition:** Feature enabled, draft just completed, readiness evaluation in progress

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Trigger draft generation | Draft completes |
| 2 | Observe toolbar immediately | Readiness accordion appears |
| 3 | Check badge value | Badge value is empty (no text) |
| 4 | Check button state | Button is disabled or shows loading indicator |
| 5 | Wait for API response | Badge updates with verdict once data arrives |

**Pass Criteria:**
- ✅ Loading state is visible but not intrusive
- ✅ Smooth transition from loading to data
- ✅ No console errors during transition

**Note:** If readiness evaluates very quickly, you may need to throttle network in DevTools to observe loading state.

---

### TC-6: Toolbar Accordion — 204 No Content

**Precondition:** Feature enabled, readiness evaluation not yet available

**Test Method:** Mock API to return 204

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Mock `/api/drafts/:id/readiness` → 204 | - |
| 2 | Refresh draft view | - |
| 3 | Check toolbar | No readiness accordion visible |
| 4 | Check browser console | No errors, no telemetry events for readiness |

**Pass Criteria:**
- ✅ Accordion hidden gracefully
- ✅ Other accordions unaffected
- ✅ No console errors

---

### TC-7: Toolbar Accordion — Soft Error State

**Precondition:** Feature enabled, API returns 5xx error

**Test Method:** Mock API to return 500

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Mock `/api/drafts/:id/readiness` → 500 | - |
| 2 | Refresh draft view | - |
| 3 | Check toolbar accordion | Accordion visible |
| 4 | Expand accordion | Drawer shows message: "Readiness verdict unavailable." |
| 5 | Check console | Error logged but not thrown |

**Pass Criteria:**
- ✅ Graceful error message
- ✅ No UI crash
- ✅ User can continue using other features

---

### TC-8: Finalization Modal — Readiness Card Present

**Precondition:** Feature enabled, draft post-HIL, readiness data available

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Click "Review & Finalize" button | Modal opens |
| 2 | Scroll to readiness card | Card visible between "Final Results" and "Differentiator Coverage" |
| 3 | Check card header | "Preliminary Editorial Verdict" |
| 4 | Check verdict display | Badge shows: "Weak" / "Adequate" / "Strong" / "Exceptional" |
| 5 | Check verdict color | Same color scheme as toolbar badge |
| 6 | Check feedback summary | Short text (≤140 chars) |
| 7 | Check advisory text | "Advisory only; does not block finalization. See full breakdown in Match Metrics." |
| 8 | Verify no breakdown table | Only verdict + summary visible (not full 10-dimension table) |

**Pass Criteria:**
- ✅ Card fits layout without overflow
- ✅ Verdict matches toolbar verdict
- ✅ Advisory disclaimer clearly visible
- ✅ No full breakdown table (lightweight display)

---

### TC-9: Finalization Modal — Loading State

**Precondition:** Feature enabled, readiness evaluation in progress

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Throttle network in DevTools (Slow 3G) | - |
| 2 | Click "Review & Finalize" | Modal opens |
| 3 | Observe readiness card area | Skeleton card with "Preliminary Editorial Verdict" header |
| 4 | Check skeleton content | Gray animated pulse rectangle |
| 5 | Wait for data to load | Card updates with actual verdict |

**Pass Criteria:**
- ✅ Skeleton visible during load
- ✅ Smooth transition to data state
- ✅ No layout shift when data arrives

---

### TC-10: Finalization Modal — Card Hidden (Flag Off)

**Precondition:** `ENABLE_DRAFT_READINESS=false`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Create draft, wait for completion | - |
| 2 | Click "Review & Finalize" | Modal opens |
| 3 | Scan modal content | No readiness card visible |
| 4 | Verify other cards | "Final Results", "Differentiator Coverage", "Final Cover Letter" all visible |

**Pass Criteria:**
- ✅ No readiness card
- ✅ No layout gaps where card would be
- ✅ Other content unaffected

---

### TC-11: Finalization Modal — Card Hidden (Pre-HIL)

**Precondition:** Feature enabled, draft NOT post-HIL (isPostHIL=false)

**Test Method:** Inspect draft before B-phase completes (if possible) or mock `isPostHIL=false`

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Open draft before B-phase completion | - |
| 2 | Click "Review & Finalize" | Modal opens |
| 3 | Check for readiness card | Not visible |

**Pass Criteria:**
- ✅ Readiness card only appears post-HIL
- ✅ No errors in console

---

### TC-12: Finalization Modal — Telemetry on Submit

**Precondition:** Feature enabled, draft post-HIL, readiness data available

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Open "Review & Finalize" modal | - |
| 2 | Open browser console | - |
| 3 | Click "Finalize & Save" button | - |
| 4 | Check console logs | Event logged: `[telemetry] ui_readiness_finalize_submit { draftId: '...', rating: '...' }` |
| 5 | Verify rating value | Matches current readiness verdict |

**Pass Criteria:**
- ✅ Telemetry event fires
- ✅ Payload includes draftId and rating
- ✅ Rating matches displayed verdict

---

### TC-13: TTL-Based Auto-Refresh

**Precondition:** Feature enabled, draft post-HIL, readiness data with TTL

**Setup:** T3 API should return `ttlExpiresAt` in response (default 10 min)

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Generate draft, wait for readiness data | Accordion shows verdict |
| 2 | Note `ttlExpiresAt` timestamp | Check Network tab response body |
| 3 | Open browser console | - |
| 4 | Wait until TTL expires | (May need to temporarily reduce TTL to 1 min for testing) |
| 5 | Observe Network tab | New request to `/api/drafts/:id/readiness` |
| 6 | Check console | Event logged: `[telemetry] ui_readiness_auto_refresh_tick { draftId: '...' }` |
| 7 | Check toolbar accordion | Badge updates if verdict changed (or stays same if unchanged) |
| 8 | Verify no UI flicker | Accordion does NOT auto-open/close |

**Pass Criteria:**
- ✅ Auto-refresh triggers at TTL expiry
- ✅ Telemetry event fires
- ✅ Data updates if changed
- ✅ No forced accordion state change
- ✅ No visible loading spinner (passive refresh)

**Note:** For easier testing, coordinate with backend team to temporarily reduce TTL to 1 minute.

---

### TC-14: Query Invalidation on Draft Update

**Precondition:** Feature enabled, draft post-HIL, readiness data cached

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Generate draft, wait for readiness | Accordion shows verdict |
| 2 | Edit a section in the draft | - |
| 3 | Save the edit | `draftUpdatedAt` timestamp changes |
| 4 | Observe Network tab | New request to `/api/drafts/:id/readiness` |
| 5 | Check toolbar accordion | Verdict may update based on new evaluation |

**Pass Criteria:**
- ✅ Query invalidates on `draftUpdatedAt` change
- ✅ New evaluation fetched
- ✅ Verdict updates if changed by edit

---

### TC-15: Accessibility — Keyboard Navigation

**Precondition:** Feature enabled, draft post-HIL, readiness data available

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Open draft view | - |
| 2 | Press Tab repeatedly | Focus moves through toolbar accordions |
| 3 | Tab to "Readiness" accordion button | Button receives focus ring |
| 4 | Press Enter or Space | Accordion expands |
| 5 | Press Enter or Space again | Accordion collapses |
| 6 | Verify no keyboard traps | Focus can move freely in and out |

**Pass Criteria:**
- ✅ Button is keyboard-accessible
- ✅ Focus ring visible
- ✅ Enter/Space both work
- ✅ No keyboard traps

---

### TC-16: Accessibility — Screen Reader

**Precondition:** Feature enabled, draft post-HIL, readiness data available

**Test Tool:** NVDA (Windows), JAWS (Windows), VoiceOver (macOS)

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Navigate to toolbar with screen reader | - |
| 2 | Focus "Readiness" accordion button | Announces: "Readiness, button, [verdict], collapsed" |
| 3 | Activate button | Announces: "expanded" |
| 4 | Navigate into drawer | Reads "Verdict: [rating]", feedback text, dimension labels |
| 5 | Check loading skeleton | Skeleton has `aria-hidden="true"`, not announced |

**Pass Criteria:**
- ✅ Button announces state (collapsed/expanded)
- ✅ Content is readable by screen reader
- ✅ Loading skeleton ignored
- ✅ No confusing or missing labels

---

### TC-17: Accessibility — Color Contrast

**Test Tool:** Browser DevTools Accessibility Inspector or WAVE

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Inspect "Readiness" badge | - |
| 2 | Check contrast ratio | Text-to-background ≥4.5:1 for normal text, ≥3:1 for large text |
| 3 | Check all verdict colors | Green, blue, yellow, gray all meet contrast requirements |
| 4 | Inspect drawer content | All text meets contrast requirements |

**Pass Criteria:**
- ✅ All text meets WCAG AA contrast standards
- ✅ Badge text readable in all verdict colors

---

### TC-18: Multi-Draft Isolation

**Precondition:** Feature enabled, multiple drafts created

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Create Draft A, wait for readiness | Verdict: e.g., "Adequate" |
| 2 | Create Draft B with different JD/content | - |
| 3 | Wait for Draft B readiness | Verdict: e.g., "Strong" (different from A) |
| 4 | Switch back to Draft A | Verdict still shows "Adequate" |
| 5 | Check Network tab | Query key includes draftId, isolates cached data |

**Pass Criteria:**
- ✅ Each draft has independent readiness evaluation
- ✅ No cross-contamination of verdicts
- ✅ Query cache keyed by draftId

---

### TC-19: Error Recovery — Network Offline

**Precondition:** Feature enabled, draft post-HIL

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Open DevTools, set Network to Offline | - |
| 2 | Refresh draft view | - |
| 3 | Check toolbar | Readiness accordion may show error or be hidden |
| 4 | Re-enable network | - |
| 5 | Wait a few seconds | Accordion appears with data |

**Pass Criteria:**
- ✅ No crash on network failure
- ✅ Graceful recovery when network restored
- ✅ User can continue working during offline period

---

### TC-20: Performance — Large Drafts

**Precondition:** Feature enabled, draft with 10+ sections and 1000+ words

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Generate very long draft | - |
| 2 | Wait for readiness evaluation | - |
| 3 | Observe render time | Accordion renders within 300ms of data arrival |
| 4 | Expand/collapse accordion | Animation smooth, no jank |
| 5 | Check browser DevTools Performance tab | No long tasks (>50ms) caused by readiness UI |

**Pass Criteria:**
- ✅ UI responsive even with large drafts
- ✅ No performance degradation
- ✅ Smooth animations

---

## Regression Testing

### Areas to Verify (Ensure No Side Effects)

| Area | What to Check |
|------|---------------|
| Draft Generation | A-phase and B-phase still work normally |
| Gap Analysis | Gap banners and insights unaffected |
| Toolbar Metrics | Goals, Core, Preferred, Rating, A-phase accordions still functional |
| Finalization Flow | "Finalize & Save" still works, draft status updates correctly |
| Other Modals | HIL modal, Goals modal, Add Section modal unaffected |

---

## Browser Compatibility

Test in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest, macOS and iOS)
- ✅ Edge (latest)

---

## Mobile Responsiveness

| Device | Viewport | What to Check |
|--------|----------|---------------|
| Mobile Portrait | 375x667 | Toolbar accordion readable, no horizontal scroll |
| Mobile Landscape | 667x375 | Finalization modal scrollable, readiness card fits |
| Tablet Portrait | 768x1024 | Layout comfortable, no overflow |
| Tablet Landscape | 1024x768 | Full desktop experience |

---

## Known Limitations (Expected Behavior)

1. **No manual refresh button** — Auto-refresh only (TTL-based)
2. **No historical tracking** — Only shows latest evaluation
3. **Advisory only** — Does not block finalization
4. **Post-HIL only** — No pre-draft readiness
5. **No inline editing** — Does not auto-apply improvements

---

## Acceptance Criteria Summary

- ✅ All 20 test cases pass
- ✅ Zero console errors
- ✅ Zero linting errors
- ✅ Accessibility audit passes (WCAG AA)
- ✅ No regression in existing features
- ✅ Performance metrics within acceptable range
- ✅ Works across all supported browsers

---

## Sign-Off

**QA Engineer:** _________________  
**Date:** _________________  

**Product Owner:** _________________  
**Date:** _________________  

**Engineering Lead:** _________________  
**Date:** _________________  

