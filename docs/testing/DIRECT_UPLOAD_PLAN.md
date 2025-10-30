# Direct Upload & Evaluation Testing Plan

## 🎯 Overview

This document outlines two approaches for automated QA and faster development:
1. **Direct Service-Level Uploads** (Recommended for speed)
2. **Browser Automation** (Useful for full UI testing)

Both approaches bypass manual UI interaction and can be automated for CI/CD or rapid iteration.

---

## 📋 Approach 1: Direct Service-Level Uploads (Recommended)

### **Architecture**

```
scripts/direct-upload-test.ts
├── Authenticate user (Supabase Auth)
├── Create FileUploadService instance
├── Upload files directly via uploadContent()
├── Services automatically trigger:
   ├── Text extraction
   ├── LLM analysis
   ├── Database saving
   ├── Heuristics calculation
   └── Evaluation logging
└── Output: Source IDs, evaluation run IDs, metrics
```

### **Advantages**
- ✅ **Fastest**: No browser overhead, direct API calls
- ✅ **Reliable**: Fewer moving parts, easier to debug
- ✅ **Testable**: Can mock services, isolate failures
- ✅ **CI/CD Ready**: Can run in headless environments
- ✅ **Cost Effective**: No browser resources needed

### **Implementation Plan**

#### **Step 1: Create Direct Upload Script**

**File:** `scripts/direct-upload-test.ts`

**Key Components:**
1. **Authentication Helper**
   ```typescript
   async function authenticateUser(email: string, password: string): Promise<{ userId: string, accessToken: string }>
   ```

2. **Direct Upload Function**
   ```typescript
   async function uploadProfileDirect(
     userId: string,
     accessToken: string,
     profileId: string
   ): Promise<{
     resumeSourceId: string;
     coverLetterSourceId: string;
     linkedinSourceId?: string;
     evaluationRunIds: string[];
   }>
   ```

3. **Clear Data Function**
   ```typescript
   async function clearUserData(userId: string, accessToken: string): Promise<void>
   ```

#### **Step 2: Service Integration**

**Use ACTUAL Existing Services** ✅
- Import `FileUploadService` from `src/services/fileUploadService.ts`
- Services use real Supabase, OpenAI, and evaluation logic
- `window.dispatchEvent` calls are safe to ignore in Node.js (they'll just be no-ops)
- No mocks unless explicitly approved for debug mode

#### **Step 3: Evaluation Triggering**

Evaluations are automatically triggered in `processContent()` after structured data is saved. No additional steps needed.

---

## 🌐 Approach 2: Browser Automation (Complementary)

### **Tools**
- **Playwright** (Recommended) - Modern, fast, better debugging
- **Puppeteer** (Alternative) - Mature, Chromium-only
- **Selenium** (Legacy) - Too slow for this use case

### **Use Cases**
- ✅ Full UI flow testing
- ✅ Visual regression testing
- ✅ Interaction testing (progress indicators, error handling)
- ✅ Cross-browser compatibility

### **Implementation Plan**

#### **Step 1: Setup Playwright**

```bash
npm install -D @playwright/test playwright
npx playwright install chromium
```

#### **Step 2: Create Test Script**

**File:** `scripts/browser-upload-test.ts`

**Key Features:**
- Login with test credentials
- Navigate to `/new-user`
- Upload files via file input selection
- Wait for processing to complete
- Extract evaluation run IDs from console logs or DOM
- Assert on expected outcomes

#### **Step 3: Test Data Setup**

- Store test credentials in `.env.test`
- Use fixtures for test files
- Mock or use real Supabase test instance

---

## 🚀 Quick Start: Direct Upload Script

### **File Structure**

```
scripts/
├── direct-upload-test.ts          # Main upload script
├── test-auth.ts                   # Authentication utilities
└── test-utils.ts                  # Helper functions
```

### **Script Interface**

```typescript
// Clear P01 data
npm run test:clear-p01

// Upload P01 and trigger eval
npm run test:upload-p01

// Upload all profiles (P01-P10)
npm run test:upload-all

// Upload specific profile
npm run test:upload -- P05
```

### **Key Implementation Details**

1. **Authentication**
   - Use Supabase Auth API directly (via MCP or createClient)
   - Test credentials already in `.env` (VITE_SUPABASE_URL, etc.)
   - Cache session tokens for multiple operations

2. **File Reading**
   - Use Node.js `fs` module
   - Convert text files to `File` objects for service compatibility
   - Handle fixtures directory structure

3. **Service Instantiation**
   - Import services from `src/services/`
   - Pass `accessToken` to all methods
   - Handle async/await properly

4. **Evaluation Tracking**
   - Monitor `evaluation_runs` table for new entries
   - Extract metrics from database after processing
   - Generate test report

---

## 📊 Recommended Hybrid Approach

**For Development:**
- Use **Direct Service Uploads** for rapid iteration
- Skip UI, get instant feedback on LLM changes

**For QA:**
- Use **Browser Automation** for full E2E testing
- Verify UI state, progress indicators, error handling

**For CI/CD:**
- Use **Direct Service Uploads** for smoke tests (fast)
- Use **Browser Automation** for release candidates (comprehensive)

---

## 🔧 Next Steps

1. **Create `scripts/direct-upload-test.ts`**
   - Implement authentication
   - Implement direct upload flow
   - Add evaluation monitoring

2. **Add npm scripts to `package.json`**
   ```json
   {
     "scripts": {
       "test:upload": "tsx scripts/direct-upload-test.ts",
       "test:clear": "tsx scripts/direct-upload-test.ts --clear",
       "test:browser": "playwright test"
     }
   }
   ```

3. **Test credentials already in `.env`** ✅
   - Uses existing `.env` file with VITE_SUPABASE_URL, TEST_USER_EMAIL, etc.
   - No separate `.env.test` needed

4. **Document browser automation setup** (if needed)
   - Playwright config
   - Test examples
   - CI/CD integration

---

## 📝 Example: Direct Upload Script Skeleton

```typescript
// scripts/direct-upload-test.ts
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { FileUploadService } from '../src/services/fileUploadService';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const TEST_EMAIL = process.env.TEST_USER_EMAIL!;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD!;

async function authenticate(): Promise<{ userId: string, accessToken: string }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });
  
  if (error) throw error;
  return {
    userId: data.user.id,
    accessToken: data.session.access_token
  };
}

async function clearUserData(userId: string, accessToken: string) {
  // SQL delete statements for all tables
  // Use Supabase REST API or SQL execution
}

async function uploadProfile(userId: string, accessToken: string, profileId: string) {
  const uploadService = new FileUploadService();
  const fixturesPath = path.join(__dirname, '../fixtures/synthetic/v1/raw_uploads');
  
  // Read files
  const resumeText = fs.readFileSync(`${fixturesPath}/${profileId}_resume.txt`, 'utf-8');
  const coverLetterText = fs.readFileSync(`${fixturesPath}/${profileId}_cover_letter.txt`, 'utf-8');
  
  // Upload resume
  const resumeResult = await uploadService.uploadContent(
    resumeText, // String content
    userId,
    'resume',
    accessToken
  );
  
  // Upload cover letter (triggers batch processing)
  const coverLetterResult = await uploadService.uploadContent(
    coverLetterText,
    userId,
    'coverLetter',
    accessToken
  );
  
  return {
    resumeSourceId: resumeResult.fileId!,
    coverLetterSourceId: coverLetterResult.fileId!
  };
}

async function main() {
  const { userId, accessToken } = await authenticate();
  
  // Clear existing data
  await clearUserData(userId, accessToken);
  
  // Upload P01
  const results = await uploadProfile(userId, accessToken, 'P01');
  
  console.log('✅ Upload complete:', results);
}

main().catch(console.error);
```

---

## 🎯 Immediate Action Items

1. ✅ **Clear P01 data** (See SQL below)
2. ✅ **Create direct upload script** (`scripts/direct-upload-test.ts`)
3. ✅ **Test script works** for P01 upload
4. ✅ **Document browser automation** approach for future
5. ✅ **Add to npm scripts** for easy access

---

## 🗑️ Clear P01 Data SQL

```sql
-- Clear all P01 data for user c7f68bb8-1070-4601-b8d8-767185f3e8a7
DELETE FROM approved_content WHERE user_id = 'c7f68bb8-1070-4601-b8d8-767185f3e8a7';
DELETE FROM work_items WHERE user_id = 'c7f68bb8-1070-4601-b8d8-767185f3e8a7';
DELETE FROM companies WHERE user_id = 'c7f68bb8-1070-4601-b8d8-767185f3e8a7';
DELETE FROM evaluation_runs WHERE user_id = 'c7f68bb8-1070-4601-b8d8-767185f3e8a7';
DELETE FROM linkedin_profiles WHERE user_id = 'c7f68bb8-1070-4601-b8d8-767185f3e8a7';
DELETE FROM sources WHERE user_id = 'c7f68bb8-1070-4601-b8d8-767185f3e8a7';
```

