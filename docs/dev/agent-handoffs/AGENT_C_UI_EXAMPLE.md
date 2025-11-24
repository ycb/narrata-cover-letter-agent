# Agent C – UI Rendering Examples

## Before vs After

### Before (Agent B - Heuristic Gaps)
```
┌──────────────────────────────────────────┐
│ Introduction                        [⋮]  │
├──────────────────────────────────────────┤
│ I am writing to express my interest...  │
│                                          │
│ Requirements Met                         │
│ ─────────────────                        │
│ [quantifiable achievements]              │
│ [specific metrics]                       │
│ [KPIs from past projects]                │
│                                          │
│ ⚠️ Gaps Detected                    [×]  │
│ ─────────────────────────────────────────│
│ Not mentioned: 5+ years PM experience    │
│ Not mentioned: SQL proficiency           │
│ Not mentioned: A/B testing               │
│                                          │
│ [✨ Generate Content]                    │
└──────────────────────────────────────────┘
```
**Issues:**
- All gaps shown on all sections (not section-specific)
- No guidance on what the section should contain
- Generic "Not mentioned" messages
- Requirements Met pills are generic fallbacks

---

### After (Agent C - Structured Gap Insights)
```
┌──────────────────────────────────────────┐
│ Introduction                        [⋮]  │
├──────────────────────────────────────────┤
│ I am writing to express my interest...  │
│                                          │
│ Requirements Met                         │
│ ─────────────────                        │
│ [5+ years PM experience] ✓               │
│ [Product strategy expertise] ✓          │
│                                          │
│ ⚠️ Gaps Detected                    [×]  │
│ ─────────────────────────────────────────│
│ ╔════════════════════════════════════╗  │
│ ║ Section Guidance                   ║  │
│ ║ Intro must open with credibility, ║  │
│ ║ metrics, and mission alignment.    ║  │
│ ╚════════════════════════════════════╝  │
│                                          │
│ • Professional summary to establish      │
│   credibility                            │
│   No metrics or seniority indicators     │
│   mentioned in first paragraph. Start    │
│   with strongest leadership metric       │
│   (e.g., 40% growth) to anchor           │
│   expertise.                             │
│                                          │
│ • Mission alignment                      │
│   Company mission or product impact      │
│   never referenced. Reference Company    │
│   X's marketplace expansion and why it   │
│   resonates with previous work.          │
│                                          │
│ [✨ Generate Content]                    │
└──────────────────────────────────────────┘
```
**Improvements:**
✅ Section-specific gaps (only intro issues shown on intro)
✅ Rubric guidance explains section expectations
✅ Structured gaps with titles and detailed rationale
✅ Requirements Met pills show actual matched requirements
✅ Actionable recommendations tied to JD and rubric

---

## Experience Section Example

```
┌──────────────────────────────────────────┐
│ Experience                          [⋮]  │
├──────────────────────────────────────────┤
│ [Textarea with draft content]            │
│                                          │
│ Requirements Met                         │
│ ─────────────────                        │
│ [Cross-functional collaboration] ✓      │
│ [Data-driven decision making] ✓          │
│ [Agile methodology] ✓                    │
│                                          │
│ ⚠️ Gaps Detected                    [×]  │
│ ─────────────────────────────────────────│
│ ╔════════════════════════════════════╗  │
│ ║ Section Guidance                   ║  │
│ ║ Translate resume achievements into║  │
│ ║ story-driven paragraphs that prove║  │
│ ║ you can meet core requirements.   ║  │
│ ╚════════════════════════════════════╝  │
│                                          │
│ • SQL proficiency demonstration          │
│   JD emphasizes data analysis with SQL.  │
│   No mention of SQL or query experience. │
│   Consider highlighting any data work    │
│   or analytics projects.                 │
│                                          │
│ [✨ Generate Content]                    │
└──────────────────────────────────────────┘
```

---

## Closing Section (No Gaps)

```
┌──────────────────────────────────────────┐
│ Closing                             [⋮]  │
├──────────────────────────────────────────┤
│ I look forward to discussing how my...  │
│                                          │
│ Requirements Met                         │
│ ─────────────────                        │
│ [Enthusiasm for role] ✓                  │
│ [Company alignment] ✓                    │
│ [Call to action] ✓                       │
│                                          │
│ (No gaps detected - well done!)          │
└──────────────────────────────────────────┘
```

---

## Loading State

```
┌──────────────────────────────────────────┐
│ Introduction                        [⋮]  │
├──────────────────────────────────────────┤
│ I am writing to express my interest...  │
│                                          │
│ Requirements Met                         │
│ ─────────────────                        │
│ (Loading...)                             │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ [■] [████████████████       ]      │  │
│ │                                    │  │
│ │ [████████████████████████]         │  │
│ │ [██████████████████      ]         │  │
│ └────────────────────────────────────┘  │
│ (Analyzing section guidance...)          │
└──────────────────────────────────────────┘
```

---

## Key UX Patterns

### 1. Amber Guidance Box
```css
Background: bg-amber-50/50
Border: border-amber-200/50
Text: text-amber-800
```
**Purpose**: Clearly distinguishes rubric expectations from gap details

### 2. Gap Title Hierarchy
```
• [Bold Title]           <- High visual weight
  Indented description   <- Lower visual weight
```
**Purpose**: Scannability - users can quickly see what's missing

### 3. Generate Content CTA
- **Always visible** when gaps present
- **Disabled state** when no gaps (or removed entirely)
- **Icon**: Sparkles (✨) suggests AI enhancement

### 4. Loading Animation
- **Pulse effect**: Gentle breathing animation
- **Skeleton boxes**: Match final content structure
- **Timing**: Shows until enhancedMatchData loads

---

## Responsive Behavior

### Mobile (<640px)
- Gap summary box becomes full-width
- Titles/descriptions stack vertically
- Generate button remains full-width

### Tablet (640-1024px)
- Side-by-side layout maintained
- Overflow menu for actions
- Gap banner slightly compressed

### Desktop (>1024px)
- Full visual hierarchy preserved
- Hover states on interactive elements
- Tooltip support for detailed info

---

## Accessibility

### Screen Reader Support
- `aria-label="Dismiss gap"` on dismiss button
- Section guidance marked with role="note"
- Gap list uses semantic `<ul>` structure

### Keyboard Navigation
- Tab through gaps sequentially
- Enter/Space to trigger Generate Content
- Escape to dismiss guidance box (when implemented)

### Color Contrast
- Amber text: WCAG AA compliant on light background
- Warning orange: High contrast for visibility
- Success green: Distinct from neutral gray

---

## Animation Details

### Loading Skeleton
```typescript
animate-pulse  // Tailwind utility
duration: 2s   // Slow, gentle pulse
```

### Dismiss Animation
```typescript
scale-y-0           // Collapse vertically
origin-top          // Anchor to top edge
duration: 2000ms    // Match timeout
ease-in-out         // Smooth acceleration
```

### Hover States
```css
.gap-banner:hover {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transform: translateY(-1px);
  transition: all 150ms ease;
}
```

---

## Edge Cases Handled

### 1. Empty State (No EnhancedMatchData)
- Shows loading skeleton
- User can edit while loading
- Graceful fallback to old gaps if needed

### 2. Missing Prompt Summary
- Gap list still renders
- Guidance box not shown
- No visual gap (seamless)

### 3. Section Not in sectionGapInsights
- Returns empty gaps array
- No banner shown
- Requirements Met pills may still appear

### 4. Multiple Sections with Same Gap
- Each section shows only relevant gaps
- Same gap may appear in multiple sections if applicable
- User can address incrementally

---

## Performance Considerations

### Render Optimization
- Gaps calculated once per section render
- Memoization candidate for future optimization
- Loading state prevents unnecessary recalculations

### DOM Impact
- Gap banner: ~20 DOM nodes
- Loading skeleton: ~8 DOM nodes
- Minimal overhead per section

### Network/Backend
- No additional API calls required
- All data comes from existing draft.enhancedMatchData
- Real-time updates via existing mutation hooks

