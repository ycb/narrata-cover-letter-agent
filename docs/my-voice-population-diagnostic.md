# My Voice Population Diagnostic

## Issue
My Voice is currently empty/not populated for users going through onboarding.

## Expected Flow (As Designed)

### 1. Cover Letter Upload During Onboarding
When a user uploads a cover letter in the `/new-user` onboarding flow:

**File**: `src/services/fileUploadService.ts`
- Line 1501: `processCoverLetterData()` is designed to extract voice from cover letters
- Line 1657: Supposed to call `updateProfileData()` with extracted `profileData`
- Line 1828-1836: Extracts voice data with structure:
  ```typescript
  {
    tone: ['executive', 'concise', 'direct', etc.],
    style: 'Brief description of writing style',
    persona: ['leader', 'IC', 'founder', etc.]
  }
  ```
- Line 1835: Saves to `profiles.user_voice` column as JSON string

### 2. LLM Extraction Prompt
**File**: `src/prompts/coverLetterAnalysis.ts`
- Lines 106-114: LLM prompt includes schema for extracting voice:
  ```json
  "profileData": {
    "goals": [...],
    "voice": {
      "tone": ["executive", "concise", "metric-forward", ...],
      "style": "Brief description of writing style",
      "persona": ["leader", "IC", "founder", ...]
    }
  }
  ```

### 3. Database Storage
**Migration**: `supabase/migrations/009_add_profile_columns.sql`
- Column: `profiles.user_voice` (TEXT, can store JSON)
- Stores voice data extracted from cover letters

### 4. UserVoiceContext Loads from Database
**File**: `src/contexts/UserVoiceContext.tsx`
- Line 93: Calls `UserPreferencesService.loadVoice(user.id)`
- Line 319-321: Parses `profiles.user_voice` JSON
- If empty → falls back to `DEFAULT_VOICE_PROMPT`

**File**: `src/services/userPreferencesService.ts`
- Lines 306-329: Loads from `profiles.user_voice` column
- Parses JSON string → returns `UserVoice` object

---

## Current State (Why It's Empty)

### ❌ Problem 1: Data Format Mismatch
**Expected Format** (in database):
```typescript
// UserVoice type (src/types/userVoice.ts)
{
  prompt: string,  // Single text prompt
  lastUpdated: string
}
```

**Extracted Format** (from cover letter):
```typescript
// What the LLM returns
{
  tone: string[],     // Array of tone descriptors
  style: string,      // Style description
  persona: string[]   // Array of persona types
}
```

**The Mismatch**: The extraction produces a structured object, but `UserVoice` expects a single `prompt` string!

### ❌ Problem 2: No Transformation Step
**File**: `src/services/fileUploadService.ts`
- Line 1828-1836: Extracts voice as structured data
- Line 1835: Saves directly to `user_voice` column
- **Missing**: No step to transform the structured extraction into the `UserVoice.prompt` string format

### ❌ Problem 3: Context Expects Different Format
**File**: `src/contexts/UserVoiceContext.tsx`
- Expects `UserVoice` with `.prompt` field
- Database has structured object (if anything)
- Parse will fail or return null

---

## Why It's Not Breaking Completely

### Fallback Behavior (Working as Designed)
**File**: `src/contexts/UserVoiceContext.tsx`
- Line 115-117: If database is empty, saves `defaultVoice` to database:
  ```typescript
  setVoiceState(defaultVoice);
  await UserPreferencesService.saveVoice(user.id, defaultVoice);
  ```
- `defaultVoice` = `{ prompt: DEFAULT_VOICE_PROMPT, lastUpdated: timestamp }`

**Result**: Users get the default prompt, which is actually quite good! But they're not getting their unique voice from their cover letter.

---

## The Actual User Experience

### What Should Happen:
1. User uploads cover letter during onboarding
2. LLM extracts their unique writing style/tone
3. That style is saved as a prompt in `profiles.user_voice`
4. My Voice modal shows their personalized prompt
5. All generated content uses their unique voice

### What Actually Happens:
1. User uploads cover letter during onboarding
2. LLM extracts voice as structured data (`{tone, style, persona}`)
3. Structured data is saved to `profiles.user_voice` (wrong format)
4. UserVoiceContext loads this, can't parse it as `UserVoice`
5. Fallback to default prompt
6. My Voice modal shows generic default prompt
7. All generated content uses default voice (not personalized)

---

## The Fix (For Another Agent to Implement)

### Option A: Transform Extracted Data → Prompt String
Add a transformation step in `fileUploadService.ts`:

```typescript
// After line 1828
if (profileData.voice) {
  const voiceData = {
    tone: profileData.voice.tone || [],
    style: profileData.voice.style || '',
    persona: profileData.voice.persona || []
  };
  
  // NEW: Transform to UserVoice format
  const voicePrompt = buildVoicePrompt(voiceData);
  const userVoice: UserVoice = {
    prompt: voicePrompt,
    lastUpdated: new Date().toISOString()
  };
  
  // Save in correct format
  updates.user_voice = JSON.stringify(userVoice);
}

// NEW FUNCTION
function buildVoicePrompt(voiceData: {
  tone: string[];
  style: string;
  persona: string[];
}): string {
  const tonePart = voiceData.tone.length > 0 
    ? `Your tone is ${voiceData.tone.join(', ')}.` 
    : '';
  const stylePart = voiceData.style 
    ? voiceData.style 
    : '';
  const personaPart = voiceData.persona.length > 0
    ? `You write as a ${voiceData.persona.join(' and ')}.`
    : '';
    
  return [tonePart, stylePart, personaPart]
    .filter(Boolean)
    .join(' ');
}
```

### Option B: Redesign UserVoice Type
Change `UserVoice` to match the extracted structure:

```typescript
// src/types/userVoice.ts
export interface UserVoice {
  tone: string[];
  style: string;
  persona: string[];
  lastUpdated: string;
}

// Compute prompt dynamically when needed
export function getUserVoicePrompt(voice: UserVoice): string {
  return buildVoicePrompt(voice);
}
```

**Downside**: Requires updating all consumers of `UserVoice`

### Recommended: Option A
- Smaller change surface
- Maintains current `UserVoice` type
- Just adds transformation layer during extraction
- Existing manual editing still works

---

## Testing the Fix

### 1. Check Database Before Fix
```sql
SELECT user_voice FROM profiles WHERE id = '<user_id>';
-- Should be either null or contain structured {tone, style, persona}
```

### 2. Upload Cover Letter
- Go through onboarding
- Upload a cover letter with distinct writing style

### 3. Check Database After Fix
```sql
SELECT user_voice FROM profiles WHERE id = '<user_id>';
-- Should contain: {"prompt": "Your tone is...", "lastUpdated": "..."}
```

### 4. Open My Voice Modal
- Click profile → My Voice
- Should show extracted prompt, not default

### 5. Test Generated Content
- Generate a cover letter section
- Voice should match user's style from uploaded letter

---

## Additional Investigation Needed

### Question 1: Is Cover Letter Upload Even Working?
Check `fileUploadService.ts` Line 1506-1661:
- Is `processCoverLetterData()` being called?
- Is the LLM extraction returning `profileData.voice`?
- Is `updateProfileData()` being called?

**Debug Steps**:
```typescript
// Add logging
console.log('🔍 Cover letter profileData:', structuredData.profileData);
console.log('🔍 Voice extracted:', profileData.voice);
```

### Question 2: Is the LLM Prompt Working?
The prompt in `coverLetterAnalysis.ts` asks for `voice` but:
- Is the LLM actually returning it?
- Is the JSON valid?
- Are we checking for it?

**Debug Steps**:
```typescript
// In processCoverLetterData
if (structuredData.profileData?.voice) {
  console.log('✅ Voice extracted from cover letter:', structuredData.profileData.voice);
} else {
  console.warn('⚠️ No voice data in cover letter extraction');
}
```

### Question 3: Alternative Population Methods?
Currently, voice is ONLY populated from cover letter upload.

**Should it also be populated from**:
- Resume analysis? (probably not - resumes don't show writing voice)
- LinkedIn data? (probably not - different format)
- Manual user input? (YES - already works via My Voice modal)

---

## Summary

### Root Cause
Data format mismatch between:
- **Extraction output**: `{tone: [], style: '', persona: []}`
- **Expected format**: `{prompt: string, lastUpdated: string}`

### Current Behavior
- Cover letter voice extraction may be working
- But it's saving in wrong format
- UserVoiceContext can't read it
- Falls back to default prompt
- User sees generic voice, not personalized

### Fix Location
`src/services/fileUploadService.ts` around line 1828-1836

### Urgency
**Medium** - Feature is working with defaults, but not personalized
- Users can manually edit My Voice if needed
- But they're missing the auto-population from their cover letter
- Onboarding experience is degraded (less "wow" factor)

