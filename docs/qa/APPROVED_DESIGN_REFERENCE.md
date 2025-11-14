# Approved Design Reference

**Date**: 2025-11-14  
**Component**: Draft Cover Letter Match Component

## Approved Design (Based on Image Provided)

The approved design shows:

### 1. Match Component with 6 Metrics (Top Row)
- **MATCH WITH GOALS**: "strong" (green badge)
- **MATCH WITH EXPERIENCE**: "average" (orange badge)  
- **COVER LETTER RATING**: "weak" (red badge)
- **ATS**: "65%" (orange badge)
- **CORE REQS**: "2/4" (red badge)
- **PREFERRED REQS**: "1/4" (red badge)

### 2. Detailed Requirements Breakdown (Below Metrics)
Each requirement shows:
- **Left Column**: Requirement text with checkmark (✓) or X mark
- **Right Column**: Matching experience description OR "No matching experience found"

Example:
- ❌ JavaScript and frontend development → "No matching experience found"
- ❌ React and modern frontend frameworks → "No matching experience found"
- ✅ API integration and backend communication → "Basic API integration experience with REST endpoints"
- ❌ Node.js server-side development → "No matching experience found"
- ✅ Team collaboration and agile practices → "Worked in agile teams with standard practices"
- ✅ Leadership and mentoring experience → "Led small team projects and mentored junior developers"

### 3. Content Cards with Gaps
- Each section shown as a ContentCard
- Gaps flagged with visual indicators
- "Generate Content" CTAs on cards with gaps to open HIL workflow

## Current Implementation

**Component Used**: `ProgressIndicatorWithTooltips`
- Shows 6 metrics in a grid
- Each metric has a tooltip with detailed breakdown
- Tooltips show individual requirements with checkmarks/X marks and matching experience

**Issue**: Tooltips currently use mock data instead of real data from draft and job description.

## Files

- `src/components/cover-letters/ProgressIndicatorWithTooltips.tsx` - Main component
- `src/components/cover-letters/MatchExperienceTooltip.tsx` - Experience matching tooltip
- `src/components/cover-letters/RequirementsTooltip.tsx` - Requirements tooltip
- `src/components/cover-letters/CoverLetterCreateModal.tsx` - Uses ProgressIndicatorWithTooltips

