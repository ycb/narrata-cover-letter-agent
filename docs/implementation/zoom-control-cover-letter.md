# Zoom Control for Cover Letter Draft Editor

## Overview
Added zoom in/out controls to the cover letter draft editor, allowing users to adjust the view of the main content area to see the entire draft, one section, or multiple sections at different magnifications.

## Implementation

### Location
File: `/src/components/cover-letters/CoverLetterDraftEditor.tsx`

### Features
1. **Zoom Levels**: 75%, 100%, 125%, 150%
2. **Control Position**: Top-right, next to "Add section" button
3. **Zoom Scope**: Main content area only (sections + insert buttons)
4. **Not Zoomed**: Header, toolbar metrics, progress banner
5. **Default**: 100% (resets when modal closes)

### UI Layout
```
┌────────────────────────────────────────────────┐
│ [Progress Banner if generating]               │
├────────────────────────────────────────────────┤
│     [Add Section Button]      [− 100% +]      │
│             (centered)         (right)         │
├────────────────────────────────────────────────┤
│ [Zoomed Content Area]                          │
│   • Introduction section                       │
│   • Body sections                              │
│   • Closing section                            │
└────────────────────────────────────────────────┘
```

### Controls
- **Minus button** (−): Zoom out
- **Percentage display**: Current zoom level (e.g., "100%")
- **Plus button** (+): Zoom in
- Buttons disabled at min/max zoom levels
- Hover tooltips: "Zoom out" / "Zoom in"

### Technical Details
- **State**: `useState(100)` - local component state
- **Transform**: CSS `scale()` on content wrapper
- **Origin**: `origin-top` ensures content scales from top
- **Transition**: Smooth 200ms animation
- **Styling**: Compact border-boxed control with ghost buttons

### User Experience
1. **Before generation**: Controls visible but no content to zoom
2. **During generation**: Can zoom progress indicators
3. **After generation**: Zoom in to focus on specific section, zoom out to see entire draft
4. **Use cases**:
   - 75%: Overview of entire draft
   - 100%: Standard editing view
   - 125%/150%: Focus on specific section details

## Code Changes

### Imports
Added: `useState`, `ZoomIn`, `ZoomOut`, `Button`

### State Management
```typescript
const [zoomLevel, setZoomLevel] = useState(100);
const ZOOM_LEVELS = [75, 100, 125, 150];

const handleZoomIn = () => {
  const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
  if (currentIndex < ZOOM_LEVELS.length - 1) {
    setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
  }
};

const handleZoomOut = () => {
  const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
  if (currentIndex > 0) {
    setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
  }
};
```

### Layout Changes
1. **Top controls container**: Flex layout with centered "Add section" and absolute-positioned zoom controls at right
2. **Zoomable wrapper**: Applied `transform: scale()` to content area
3. **Scope**: Only sections and insert buttons are zoomed

## Design Rationale

### Why These Zoom Levels?
- **75%**: Small enough to see full draft (~4-5 sections), not too small to read
- **100%**: Default comfortable reading size
- **125%/150%**: Helpful for focusing on specific content, accessibility

### Why Top-Right Position?
- Close to "Add section" button (related actions)
- Out of the way of main editing area
- Visible without scrolling
- Consistent with other top-right controls (Save/Preview)

### Why Local State (Not Persisted)?
- Each draft may have different optimal zoom levels
- Simpler UX: always starts at 100%
- User can quickly adjust per session
- Could be enhanced later with localStorage if users request it

## Future Enhancements (Optional)
- [ ] Persist zoom level per user in localStorage
- [ ] Keyboard shortcuts (Cmd/Ctrl + Plus/Minus)
- [ ] Mouse wheel zoom with Cmd/Ctrl
- [ ] Preset buttons: "Fit to width" / "Fit all sections"
- [ ] Zoom level indicator while zooming (toast/overlay)

## Testing Checklist
- [ ] Zoom controls visible on Cover letter tab
- [ ] Zoom out disabled at 75%
- [ ] Zoom in disabled at 150%
- [ ] Content scales smoothly
- [ ] "Add section" button stays centered
- [ ] Zoom controls stay at right
- [ ] Header and toolbar NOT affected by zoom
- [ ] Works with 1, 3, 5+ sections
- [ ] Resets to 100% when modal closed/reopened

