# User-Editable Prompts Analysis

## Current State

### ✅ Already Implemented (User-Facing)
1. **My Voice** (`src/types/userVoice.ts`)
   - **Status**: ✅ User-editable
   - **Purpose**: Controls the tone/style of all generated content
   - **Default**: "Concise, exacting, strategically direct..."
   - **UI**: My Voice modal in user menu
   - **Safety**: Safe to edit - affects style only, not functionality

2. **My Goals** (`src/types/userGoals.ts`)
   - **Status**: ✅ User-editable
   - **Purpose**: Target job preferences, salary, company type, etc.
   - **UI**: My Goals modal in user menu
   - **Safety**: Safe to edit - structured data, not free-form prompts

---

## Prompt Inventory & Recommendations

### 🔒 Critical System Prompts (NEVER User-Editable)

These prompts control core functionality and data extraction. Breaking them would break the app.

1. **Resume Parsing** (`resumeAnalysisSplit.ts`)
   - Work history skeleton extraction
   - Role stories extraction
   - Skills and education extraction
   - **Risk**: High - breaks onboarding if malformed

2. **JSON Extraction** (`jsonExtraction.ts`)
   - Generic JSON extraction system
   - **Risk**: Critical - used throughout app for structured data

3. **Job Description Analysis** (`jobDescriptionAnalysis.ts`)
   - Extracts requirements, skills, company info
   - **Risk**: High - breaks matching engine

4. **Template Evaluation** (`templateEvaluation.ts`)
   - Validates cover letter templates
   - **Risk**: High - breaks template system

5. **Gap Detection** (`sectionGaps.ts`)
   - Identifies content gaps
   - **Risk**: High - breaks quality scoring

6. **Content Standards** (`letterContentStandards.ts`, `sectionContentStandards.ts`)
   - Editorial quality evaluation
   - **Risk**: High - breaks readiness scoring

7. **PM Levels** (`services/prompts/pmLevelsPrompts.ts`)
   - Assesses PM seniority
   - **Risk**: Medium - breaks assessment feature

---

### 🟡 Advanced User Prompts (Power Users Only)

These could be user-editable with:
- Clear warnings about breaking functionality
- "Reset to Default" button
- Example prompts and documentation
- **Recommended UI**: Separate "Advanced Settings" section with warnings

1. **Content Generation System Prompt** (`contentGeneration.ts`)
   - **Current**: `CONTENT_GENERATION_SYSTEM_PROMPT`
   - **Purpose**: Guides story/section generation (Human-in-the-Loop)
   - **User Benefit**: Customize how AI generates missing content
   - **Example Use Case**: User wants more aggressive tone in gap-filling suggestions
   - **Safety Level**: Medium
   - **Implementation**:
     ```typescript
     export const DEFAULT_CONTENT_GENERATION_SYSTEM_PROMPT = `You are a professional career coach...`;
     
     // User override in UserVoice context:
     export interface UserVoice {
       prompt: string; // Writing style
       contentGenerationPrompt?: string; // How to generate content
     }
     ```

2. **Dynamic Matching Prompt** (`dynamicMatching.ts`)
   - **Purpose**: How to match work history to job descriptions
   - **User Benefit**: Adjust matching sensitivity/approach
   - **Example Use Case**: User wants more creative connections vs strict keyword matching
   - **Safety Level**: Medium-Low
   - **Risk**: Could produce irrelevant matches if poorly configured

3. **Content Tagging Prompt** (`contentTagging.ts`)
   - **Purpose**: How to tag stories for discoverability
   - **User Benefit**: Customize tag vocabulary (e.g., industry-specific tags)
   - **Safety Level**: Low
   - **Risk**: Minimal - just affects organization

---

### 🟢 Safe User Prompts (Recommended for General Audience)

These can be safely exposed without breaking core functionality.

1. **✅ My Voice** (Already Implemented)
   - Writing tone and style
   - Currently working perfectly

2. **🆕 Cover Letter Opening Hook**
   - **New Feature**: Let users define their preferred opening style
   - **Purpose**: Control how cover letters start
   - **Implementation**:
     ```typescript
     export interface UserCoverLetterPreferences {
       openingStyle: 'story' | 'achievement' | 'direct' | 'custom';
       customOpeningPrompt?: string;
       // Example: "Start with a quantified achievement that demonstrates immediate value"
     }
     ```

3. **🆕 Story Emphasis**
   - **New Feature**: What to emphasize in work history
   - **Purpose**: Guide what aspects of stories get highlighted
   - **Implementation**:
     ```typescript
     export interface UserStoryPreferences {
       emphasize: 'metrics' | 'leadership' | 'innovation' | 'collaboration';
       customEmphasisPrompt?: string;
       // Example: "Focus on cross-functional collaboration and stakeholder management"
     }
     ```

---

## Recommended Implementation Plan

### Phase 1: Audit & Document (Current)
- ✅ Create this analysis document
- ✅ Identify safe vs. risky prompts

### Phase 2: UI Organization
1. **Rename Menu Section**: "My Prompts" or "My Preferences"
   - My Voice (existing)
   - My Goals (existing)
   - My Data (existing)
   
2. **Add Submenu Structure**:
   ```
   My Preferences →
     ├── My Voice (tone & style)
     ├── My Goals (job search criteria)
     ├── My Data (LinkedIn, uploads)
     └── Advanced ⚠️
         ├── Content Generation
         ├── Matching Strategy
         └── Tagging Preferences
   ```

3. **Safety Features**:
   - Warning badges for advanced settings
   - "Reset to Default" on every prompt
   - Preview/test functionality
   - Character limits (e.g., 500 chars max)

### Phase 3: Add Safe Prompts First
1. Add "Story Emphasis" to My Voice modal
2. Add "Opening Hook Style" to My Voice modal
3. Test with synthetic users

### Phase 4: Advanced Settings (Optional)
Only if power users request it:
1. Create "Advanced Prompts" section with warnings
2. Add Content Generation System Prompt
3. Add telemetry to detect broken prompts

---

## Technical Architecture

### Current: UserVoiceContext
```typescript
// src/contexts/UserVoiceContext.tsx
export interface UserVoice {
  prompt: string; // Writing tone
  lastUpdated: string;
}
```

### Proposed: Extended UserPromptPreferences
```typescript
// src/contexts/UserPromptPreferencesContext.tsx
export interface UserPromptPreferences {
  // Safe prompts (general audience)
  voice: {
    tonePrompt: string; // Current "My Voice"
    storyEmphasis?: string; // New: What to highlight in stories
    openingHookStyle?: string; // New: Cover letter openings
  };
  
  // Advanced prompts (power users)
  advanced?: {
    contentGeneration?: string;
    matchingStrategy?: string;
    taggingApproach?: string;
  };
  
  lastUpdated: string;
}
```

---

## Security & Quality Guardrails

### 1. Validation
```typescript
function validateUserPrompt(prompt: string): { valid: boolean; error?: string } {
  // Max length
  if (prompt.length > 1000) {
    return { valid: false, error: 'Prompt too long (max 1000 characters)' };
  }
  
  // No code injection attempts
  if (prompt.includes('```') || prompt.includes('<script>')) {
    return { valid: false, error: 'Invalid characters detected' };
  }
  
  // Minimum length
  if (prompt.trim().length < 20) {
    return { valid: false, error: 'Prompt too short (min 20 characters)' };
  }
  
  return { valid: true };
}
```

### 2. Fallback to Defaults
```typescript
function getEffectivePrompt(
  userPrompt: string | undefined, 
  defaultPrompt: string
): string {
  if (!userPrompt || userPrompt.trim().length === 0) {
    return defaultPrompt;
  }
  
  const validation = validateUserPrompt(userPrompt);
  if (!validation.valid) {
    console.warn('Invalid user prompt, falling back to default:', validation.error);
    return defaultPrompt;
  }
  
  return userPrompt;
}
```

### 3. Preview/Test Mode
```typescript
// Let users test prompts before saving
async function testPrompt(
  prompt: string, 
  sampleInput: string
): Promise<{ output: string; quality: number }> {
  // Run LLM with user prompt on sample data
  // Show preview before committing
}
```

---

## Immediate Action Items

### ✅ What We Already Have
- My Voice (writing tone) - working perfectly
- My Goals (job preferences) - working perfectly
- My Data (uploads, LinkedIn) - working perfectly

### 🎯 Recommended Next Steps
1. **Do Nothing** (safest) - Current system works well
2. **Minor Enhancement** - Add "Story Emphasis" field to My Voice modal
3. **Advanced Option** - Add "Advanced Prompts" section with warnings for power users

### ⚠️ Not Recommended
- Making core extraction prompts user-editable (resume parsing, gap detection, etc.)
- Exposing prompts without validation and fallbacks
- Allowing unlimited prompt length or arbitrary code

---

## Conclusion

**Current State**: My Voice and My Goals already provide excellent user control without risk.

**Recommendation**: 
- **Short term**: Keep as-is. System is working well.
- **Medium term**: Add 1-2 safe prompts to My Voice (story emphasis, opening hook style)
- **Long term**: Consider "Advanced Prompts" section for power users with clear warnings

**Risk Assessment**:
- ✅ Low risk: My Voice, My Goals (already implemented)
- 🟡 Medium risk: Content generation, matching strategy (advanced users only)
- 🔒 High risk: Extraction, gap detection, evaluation (never expose)

The key is **transparency without chaos** - let users customize their experience while protecting core functionality.

