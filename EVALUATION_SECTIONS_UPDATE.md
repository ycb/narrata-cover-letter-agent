# Evaluation Dashboard: New Sections for Cover Letter Analysis

**Date:** 2025-01-05
**File Modified:** `src/components/evaluation/EvaluationDashboard.tsx`

## Overview

Added three new sections to the "Extracted Data Categories" for cover letter evaluations to make it easy for humans to review LLM-extracted data in a readable format instead of just JSON blobs.

## New Sections

### 1. Paragraphs Section
**Purpose:** Display all extracted paragraphs from cover letters with detailed metadata.

**Features:**
- Color-coded borders by function type:
  - 🔵 **Blue** - Intro paragraphs
  - 🟢 **Green** - Closer paragraphs
  - 🟣 **Purple** - Story paragraphs
  - ⚪ **Gray** - Other paragraphs
- Displays for each paragraph:
  - Function type badge (intro/closer/story/other)
  - Index number
  - Confidence score (as percentage)
  - Full raw text (readable format)
  - Purpose summary
  - Purpose tags (as badges)
  - Linked story ID (if applicable)
  - LLM notes
- Flag button for marking data quality issues
- Collapsible/expandable
- Max height with scrolling for many paragraphs

**Data Path:** `structured_data.paragraphs[]`

**Example:**
```typescript
{
  index: 1,
  function: "intro",
  rawText: "I'm a product manager with experience...",
  confidence: 0.9,
  purposeTags: ["credibility", "growth"],
  purposeSummary: "Introducing background and expertise",
  linkedStoryId: null,
  notes: "Strong introduction to qualifications"
}
```

### 2. Profile Data Section
**Purpose:** Display extracted profile information in organized cards.

**Features:**
- 3-column grid layout on desktop
- Three cards:
  1. **Goals** - Career goals extracted from the cover letter
  2. **Voice & Tone** - Writing style analysis (tone tags, style description, persona tags)
  3. **Preferences** - Work preferences and values
- Only shows cards that have data
- Responsive layout (stacks on mobile)
- Flag button support for entire section

**Data Path:** `structured_data.profileData`

**Example:**
```typescript
{
  goals: ["Combine strategy, execution, and learning"],
  voice: {
    tone: ["concise", "formal"],
    style: "Direct and focused on measurable outcomes.",
    persona: ["leader"]
  },
  preferences: ["user-centered design", "team health", "collaboration"]
}
```

### 3. Template Signals Section
**Purpose:** Display writing style analysis and template characteristics.

**Features:**
- 2-column grid layout (some items span full width)
- Four sub-sections:
  1. **Tone & Persona** - Overall tone and persona tags
  2. **Structure** - Paragraph count, bullets usage, story density, metric density
  3. **Style Hints** - Voice, character length, reading level, sentence length
- All data displayed with clear labels
- Badges for array values (tone, persona)
- Key-value pairs for metrics
- Flag button support

**Data Path:** `structured_data.templateSignals`

**Example:**
```typescript
{
  tone: ["concise", "formal", "direct"],
  persona: ["leader"],
  structure: {
    paraCount: 6,
    usesBullets: false,
    storyDensity: "medium",
    metricDensity: "low"
  },
  styleHints: {
    voice: "active",
    lengthChars: 1345,
    readingLevel: 12,
    sentenceLength: "mixed"
  }
}
```

## UI Integration

### Placement
All three sections appear:
- **Only for cover letters** (`file_type === 'coverLetter'`)
- **Before** the Stories section
- **In order:** Paragraphs → Profile Data → Template Signals

### Visual Design
- Consistent with existing sections (Skills, Stories, etc.)
- Gray background cards with hover effect
- Collapsible with chevron icons
- Badge indicators (✅ found / ❌ none)
- Proper empty states with helpful messages

### Collapsible Behavior
- Click anywhere on header to expand/collapse
- Remembers state within session
- "Expand All" / "Collapse All" buttons work with these sections
- Disabled/grayed out if no data

### Flagging Support
- Each section has a flag button
- Supports marking data quality issues
- Integrates with existing `DataQualityService`
- Flag count displays when flags exist

## Benefits for Evaluation

### Before (JSON Only)
Evaluators had to:
- Read raw JSON in "Input vs Output Comparison"
- Parse arrays and objects mentally
- No visual organization
- Difficult to spot issues

### After (Structured Sections)
Evaluators can now:
- See paragraphs in reading order with visual indicators
- Quickly scan function types by color
- Review confidence scores at a glance
- Understand profile data in organized cards
- Analyze template characteristics easily
- Flag specific issues with context
- Compare multiple evaluations side-by-side

## Technical Details

### State Management
- Uses existing `expandedCategories` state
- Categories: `'paragraphs'`, `'profileData'`, `'templateSignals'`
- Flag state managed by `DataQualityService`

### Performance
- Lazy rendering (only renders when expanded)
- Max height with scrolling for long lists
- Efficient React keys for list items

### Type Safety
- Uses existing TypeScript interfaces
- Safe navigation with optional chaining
- Fallback to empty arrays/objects

## Testing Checklist

- [ ] Upload cover letter with paragraphs data
- [ ] Verify color coding matches function types
- [ ] Check confidence scores display correctly
- [ ] Verify profile data cards show/hide properly
- [ ] Check template signals grid layout
- [ ] Test expand/collapse for each section
- [ ] Test "Expand All" / "Collapse All" buttons
- [ ] Verify flag buttons work for each section
- [ ] Test responsive layout on mobile
- [ ] Check empty states display correctly
- [ ] Verify sections only appear for cover letters

## Future Enhancements

1. **Paragraph Comparison**
   - Side-by-side view of original vs. extracted
   - Highlight differences
   - Edit extracted text inline

2. **Profile Data Editing**
   - Allow inline edits to goals/preferences
   - Save corrections back to database
   - Version history

3. **Template Visualization**
   - Visual representation of structure
   - Chart/graph for metrics
   - Comparison across multiple cover letters

4. **Export**
   - Export paragraphs as CSV
   - Export profile data as JSON
   - Include in evaluation reports

## Code Location

**File:** `src/components/evaluation/EvaluationDashboard.tsx`
**Lines:** 1132-1452 (320 lines added)

**Structure:**
- Lines 1132-1237: Paragraphs section
- Lines 1239-1329: Profile Data section
- Lines 1331-1452: Template Signals section
