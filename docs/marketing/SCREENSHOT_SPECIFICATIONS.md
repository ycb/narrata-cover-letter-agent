# Narrata Landing Page – Screenshot Specifications
**Purpose**: Detailed instructions for capturing product screenshots  
**Audience**: Designer, Developer, or PM collecting assets  
**Status**: Reference Guide

---

## General Screenshot Guidelines

### Technical Specifications
- **Format**: PNG (lossless quality for UI screenshots)
- **Resolution**: 2x retina (2880px width minimum for desktop views)
- **Color Profile**: sRGB
- **Compression**: Light compression acceptable (keep text crisp)

### Browser & Environment
- **Browser**: Chrome or Safari (latest stable)
- **Viewport**: 1440px width for desktop screenshots
- **Theme**: Use product default theme (likely light mode unless dark is primary)
- **Zoom**: 100% browser zoom (no scaling)

### Content Standards
- **User Data**: Use realistic but anonymized data (no real PII)
- **Job Descriptions**: Use real or realistic PM job postings
- **Draft Text**: Show actual quality draft content (not lorem ipsum)
- **Scores**: Use realistic post-HIL scores (75-90% range)

---

## Screenshot 1: Cover Letter Draft Editor (Hero Section)

### Purpose
Show the full product UI to establish credibility and give visitors immediate visual context.

### Composition
**View**: Full editor view (2-column layout)
- **Left sidebar** (30% width): Match Metrics Toolbar
  - All 7 sections visible: Gaps, Goals, Strengths, Core Reqs, Pref Reqs, Score, Readiness
  - Scores should be strong but realistic: 
    - Gaps: 1-2
    - Goals: 85%
    - Strengths: 2/3
    - Core Reqs: 8/10
    - Pref Reqs: 3/4
    - Overall Score: 82%
    - Readiness: Strong
- **Right panel** (70% width): Draft sections
  - 3-4 sections visible (Introduction, Experience, Closing)
  - Real draft text (3-5 lines per section visible)
  - One section showing green "gap resolved" indicator

### State
- **Post-HIL** (after human edits, showing refined scores)
- **No streaming banner** (final state, not in-progress)
- **Clean, professional layout**

### Cropping
- Show full toolbar on left (all 7 sections)
- Show at least 3 draft sections on right
- Crop any empty space at bottom

### Alt Text
"Narrata cover letter editor showing real-time job matching scores and personalized draft content"

---

## Screenshot 2: Match Metrics Toolbar (All 7 Sections)

### Purpose
Demonstrate the comprehensive job fit analysis that sets Narrata apart.

### Composition
**View**: Toolbar only (close-up, no draft content)
- All 7 accordion sections visible in collapsed state
- Scores/counts clearly visible on each:
  - Gaps: 2 (warning color)
  - Match with Goals: 87%
  - Match with Strengths: 2/3
  - Core Requirements: 8/10
  - Pref Requirements: 3/4
  - Overall Score: 85%
  - Readiness: Strong (primary color)

### State
- **All collapsed** (show summary only, not expanded details)
- **Post-HIL scores** (realistic, strong but not perfect)
- **Readiness enabled** (show all 7 sections)

### Cropping
- Full toolbar height (all 7 sections)
- No extra padding on sides

### Alt Text
"Match Metrics Toolbar showing 7-dimension job fit analysis: gaps, goals, strengths, requirements, score, and readiness"

---

## Screenshot 3: Draft Progress Banner (Streaming Stages)

### Purpose
Show the real-time feedback system that differentiates Narrata from "black box" AI tools.

### Composition
**View**: Progress banner + top of draft editor
- **Banner content**:
  - Title: "Drafting your cover letter…"
  - Progress bar: ~40% filled (mid-generation state)
  - Stage labels with checkmarks:
    - ✓ Analyze JD (done, green)
    - ✓ Extract reqs (done, green)
    - ● Match goals (active, pulsing dot)
    - Draft (pending, gray)
    - Gaps (pending, gray)
    - Readiness (pending, gray)
  - Subtext: "This may take 60–90 seconds…"

### State
- **Mid-streaming** (Phase A complete, Phase B not started)
- **First 2-3 stages done** (show progression)
- **Active stage highlighted**

### Cropping
- Full banner height
- Include 1-2 lines of content below to show context
- No sidebar visible (focus on banner)

### Alt Text
"Real-time progress banner showing 6-stage cover letter generation process with live status updates"

---

## Screenshot 4: ContentCard with Gap Banner

### Purpose
Illustrate the actionable feedback and human-in-the-loop improvement flow.

### Composition
**View**: Single section (ContentCard) with gap indicators
- **Section header**: "Experience" or "Body Paragraph 1"
- **Gap banner** (warning color, top of card):
  - Icon: AlertTriangle
  - Text: "2 requirements not addressed: Cross-functional leadership, Data-driven decision making"
- **Section content**: 4-5 lines of draft text visible
- **Action buttons** (bottom-right):
  - "Enhance" button (primary)
  - "Add Metrics" button (secondary)
- **Attribution badges** (if visible):
  - Core Reqs: 3/5
  - Pref Reqs: 1/2
  - Content Quality: 4/6

### State
- **Has gaps** (2-3 unresolved requirements)
- **Post-draft** (real content, not skeleton)
- **Pre-HIL** (gaps still visible, not yet resolved)

### Cropping
- Full card (header to footer)
- Show gap banner clearly
- Include action buttons

### Alt Text
"Cover letter section showing actionable gap feedback with one-click enhancement options"

---

## Screenshot 5: Saved Sections Library

### Purpose
Demonstrate the reusable content library that grows over time.

### Composition
**View**: Saved Sections modal or library panel
- **Header**: "Your Saved Sections" or "Content Library"
- **Filter tabs** (if visible): Intro | Body | Closing
- **Content cards** (4-6 visible):
  - Each card shows:
    - Section title (e.g., "Launched fleet health monitoring system")
    - First 2-3 lines of text
    - Tags: Growth, Platform, Leadership (visible badge icons)
    - Usage count: "Used in 3 cover letters"
  - Variety of tags across cards

### State
- **Populated library** (6-8 sections minimum)
- **Realistic tags** (Growth, Platform, AI/ML, Leadership, etc.)
- **Usage indicators** (show reuse pattern)

### Cropping
- Show 4-6 full cards
- Include header and filter tabs
- Enough to convey "library of reusable content"

### Alt Text
"Content library showing tagged, reusable cover letter sections with usage tracking"

---

## Screenshot 6: PM Levels Assessment UI

### Purpose
Show the automatic career level inference that powers personalized drafts.

### Composition
**View**: PM Levels profile section (from onboarding or profile page)
- **Header**: "Your PM Level"
- **Inferred Level**: 
  - Badge: "L5 – Senior Product Manager"
  - Confidence: 85% (or similar)
  - Last updated: Recent date
- **Competency scores** (4 bars or gauges):
  - Execution: 7/10 (Proficient)
  - Customer Insight: 6/10 (Developing)
  - Strategy: 8/10 (Strong)
  - Influence: 7/10 (Proficient)
- **Specializations** (badge tags):
  - Growth ✓
  - Platform ✓
  - AI/ML ✓
  - Founding (grayed out or absent)

### State
- **Post-assessment** (level inferred, not in-progress)
- **Realistic scores** (Senior/Staff PM range)
- **2-3 specializations** (not all 4)

### Cropping
- Full assessment panel
- Include level badge + competencies + specializations
- No extra padding

### Alt Text
"PM Level assessment showing inferred level, competency scores, and specializations"

---

## Screenshot 7: Resume Upload Screen (Onboarding)

### Purpose
Show the first step of the onboarding flow where Narrata extracts your profile.

### Composition
**View**: Upload UI + extraction preview
- **Upload zone** (top 40%):
  - "Upload Resume or LinkedIn PDF"
  - Drag-and-drop area or file picker
  - Accepted formats: PDF, DOCX, LinkedIn export
- **Extraction preview** (bottom 60%, if upload complete):
  - "Extracting your profile…" or "Profile extracted"
  - Preview cards:
    - Name, title, contact (partially visible)
    - Work history: 2-3 roles listed
    - PM Level: "Inferring…" or "L5 – Senior PM"
    - Specializations: Growth, Platform (tags)

### State
- **Upload complete** (show extraction in progress or just finished)
- **Preview visible** (not just blank upload screen)
- **Realistic data** (anonymized but professional)

### Cropping
- Full onboarding step
- Include upload zone + preview
- Show enough to convey "auto-extraction happening"

### Alt Text
"Resume upload interface with automatic profile extraction showing work history and PM level inference"

---

## Screenshot 8: Job Description Input + Streaming Analysis

### Purpose
Illustrate the real-time JD parsing that happens before drafting.

### Composition
**View**: Job description text area + streaming stage labels
- **JD input** (left or top 50%):
  - Large text area with realistic job posting pasted
  - Visible text: Job title, company, 5-10 lines of JD content
- **Streaming stages** (right or bottom 50%):
  - Stage 1: ✓ "Analyzing job description" (done, green)
  - Stage 2: ● "Extracting requirements" (active, pulsing)
  - Stage 3: "Matching with goals and strengths" (pending, gray)
  - Optional: Live counts appearing below active stage:
    - "11 core requirements found"
    - "3 preferred requirements found"

### State
- **JD pasted** (real job posting content)
- **Streaming active** (Stage 1-2 in progress)
- **Phase A** (before draft generation)

### Cropping
- Show JD text area + streaming UI
- Include stage labels with status icons
- Enough to convey "live analysis"

### Alt Text
"Job description input with real-time parsing showing requirement extraction and fit analysis stages"

---

## Screenshot 9: Draft Editor (Streaming State)

### Purpose
Capture the "magic moment" where insights stream in and sections appear.

### Composition
**View**: Full editor with partial content + live toolbar updates
- **Left sidebar** (toolbar):
  - Some scores already visible (streaming in):
    - Goals: 87% ✓
    - Strengths: 2/3 ✓
    - Core Reqs: "10" (total only, met count pending)
    - Pref Reqs: "3" (total only)
    - Overall Score: — (skeleton, not ready)
    - Readiness: — (skeleton, not ready)
- **Right panel** (draft sections):
  - Section 1 (Intro): ✓ Real content (complete)
  - Section 2 (Experience): Skeleton loading (in-progress)
  - Section 3 (Closing): Empty placeholder (not started)
- **Progress banner** (top):
  - "Drafting your cover letter…"
  - Progress: 60%
  - Stages: A-phase done, B-phase active

### State
- **Mid-generation** (some sections done, some loading)
- **Toolbar partially populated** (A-phase data visible, B-phase pending)
- **Dynamic, not static** (show progression)

### Cropping
- Full UI (toolbar + draft + banner)
- Show mix of complete/loading/empty sections
- Capture "streaming" feel

### Alt Text
"Cover letter editor in streaming mode showing real-time insights appearing as draft generates"

---

## Screenshot 10: Readiness Accordion (Expanded)

### Purpose
Showcase the editorial verdict system that gives users confidence before sending.

### Composition
**View**: Readiness section expanded (accordion open)
- **Summary line** (toolbar):
  - Label: "Readiness"
  - Badge: "Strong" (primary color)
- **Expanded content** (below):
  - **Verdict**: 
    - Badge: "Strong" (large, colored)
    - Summary: "Persuasive, tailored, evidence-backed; minor polish only."
  - **Score Breakdown** (10 rows, compact):
    - Clarity & Structure: Strong ✓
    - Compelling Opening: Strong ✓
    - Company Alignment: Sufficient ○
    - Role Alignment: Strong ✓
    - Specific Examples: Strong ✓
    - Quantified Impact: Sufficient ○
    - Personalization: Strong ✓
    - Writing Quality: Strong ✓
    - Length & Efficiency: Strong ✓
    - Executive Maturity: Sufficient ○
  - **Improvements** (3 bullets):
    - "Add specific metrics to closing paragraph"
    - "Strengthen company culture alignment in intro"
    - "Quantify impact in second experience paragraph"
  - **Footer text**: "Advisory only; does not block finalization."

### State
- **Post-draft** (readiness evaluated)
- **"Strong" rating** (not Exceptional, not Adequate - shows room for improvement)
- **Actionable improvements** (specific, not generic)

### Cropping
- Full accordion content (verdict → breakdown → improvements)
- Include footer text
- Clear, readable text

### Alt Text
"Draft readiness evaluation showing 'Strong' verdict with 10-dimension score breakdown and actionable improvements"

---

## Screenshot 11: Before/After Comparison Visual

### Purpose
The emotional "aha moment" – show the pain (before) vs. the solution (after).

### Layout
**Split-screen**: 50/50 side-by-side or top/bottom

---

### Left Panel: "Before" State

**Content**:
- **Top half**: Blank Google Doc
  - Title: "Cover_Letter_TechCo_PM.docx"
  - Completely empty body
  - Cursor blinking on first line
  - Visible UI: Minimal formatting toolbar
- **Bottom half**: Desk chaos (photo composite)
  - Post-it notes with phrases: "leadership?", "cross-functional", "metrics"
  - Messy printed job description (yellow highlighter)
  - Empty coffee cup (or spilled)
  - Clock: 11:47 PM

**Visual Treatment**:
- Slightly desaturated (70% saturation)
- Cooler color temperature
- Dark overlay vignette (convey stress)

**Caption** (bottom-left, white text on dark overlay):  
"Hours spent trying to figure out what to say…"

---

### Right Panel: "After" State

**Content**:
- Full Narrata UI screenshot (real product)
  - **Toolbar** (left):
    - Gaps: 1
    - Goals: 85%
    - Strengths: 2/3
    - Core: 8/10
    - Pref: 3/4
    - Score: 85%
    - Readiness: Strong
  - **Draft** (right):
    - 3 sections visible with real content
    - One section with green "gap resolved" check
    - Clean, structured layout
- **No banner** (final state, not streaming)

**Visual Treatment**:
- Full saturation (vibrant product UI)
- Warmer color temperature
- Bright, clean presentation

**Caption** (bottom-right, white text on dark overlay):  
"Narrata creates a tailored cover letter and shows exactly how to improve it."

---

### Transition Element (Center)
- **Arrow**: Right-pointing, white or brand color
- **Or**: Diagonal dissolve line (before fades to after)
- **Style**: Minimal, don't distract from content

---

### Technical Specs
- **Dimensions**: 2400px width x 1400px height (for retina quality)
- **Format**: PNG (lossless) or high-quality JPG
- **Aspect Ratio**: ~16:9 or wider
- **File Size**: Under 500KB (compress for web)

### Alt Text
"Side-by-side comparison: blank document and scattered notes versus Narrata's structured editor with scores and draft content"

---

## Screenshot Capture Checklist

Before submitting each screenshot:

- [ ] Resolution meets minimum (2x retina, 2880px+ width)
- [ ] Content is realistic (no lorem ipsum, no fake data)
- [ ] Scores are believable (75-90% range, not all 100%)
- [ ] Text is crisp and readable
- [ ] No personal/sensitive data visible
- [ ] Cropped to focus area (no extra whitespace)
- [ ] Correct state shown (streaming vs. final, pre-HIL vs. post-HIL)
- [ ] File named descriptively (e.g., `narrata-hero-draft-editor.png`)
- [ ] Alt text written and attached

---

## Delivery Format

### File Naming Convention
```
narrata-[section]-[description].png

Examples:
- narrata-hero-draft-editor.png
- narrata-toolbar-7-sections.png
- narrata-progress-banner-streaming.png
- narrata-content-card-gaps.png
- narrata-saved-sections-library.png
- narrata-pm-levels-assessment.png
- narrata-onboarding-resume-upload.png
- narrata-jd-input-streaming.png
- narrata-draft-editor-streaming.png
- narrata-readiness-accordion.png
- narrata-before-after-comparison.png
```

### Folder Structure
```
/marketing-assets/
  /screenshots/
    /raw/           (original 2x retina captures)
    /web-optimized/ (compressed for web, <200KB each)
  /alt-text.md      (all alt text in one reference doc)
```

---

## Questions or Issues?

If you encounter any issues capturing these screenshots:
1. Check staging environment is running latest code
2. Verify feature flags are enabled (ENABLE_DRAFT_READINESS, etc.)
3. Use realistic test data (not empty state)
4. Reach out to PM/dev for access or troubleshooting

---

**END OF SCREENSHOT SPECIFICATIONS**

