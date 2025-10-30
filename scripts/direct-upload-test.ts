/**
 * Direct Upload Test Script
 * 
 * Uploads files directly using existing FileUploadService without UI.
 * Triggers full evaluation pipeline automatically.
 * 
 * Usage:
 *   npm run test:upload -- P01        # Upload P01
 *   npm run test:upload -- P01 --clear # Clear P01 data, then upload
 *   npm run test:clear -- P01          # Clear P01 data only
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file manually for Node.js
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

// Configuration
const SUPABASE_URL = envVars['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = envVars['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY!;
const TEST_USER_EMAIL = envVars['VITE_TEST_EMAIL'] || envVars['TEST_USER_EMAIL'] || process.env.VITE_TEST_EMAIL || process.env.TEST_USER_EMAIL!;
const TEST_USER_PASSWORD = envVars['VITE_TEST_PASSWORD'] || envVars['TEST_USER_PASSWORD'] || process.env.VITE_TEST_PASSWORD || process.env.TEST_USER_PASSWORD!;
const TEST_USER_ID = envVars['TEST_USER_ID'] || process.env.TEST_USER_ID!;

// Debug: Check if credentials are loaded
if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
  console.error('Missing test credentials!');
  console.error('TEST_USER_EMAIL:', TEST_USER_EMAIL ? '***' : 'NOT FOUND');
  console.error('TEST_USER_PASSWORD:', TEST_USER_PASSWORD ? '***' : 'NOT FOUND');
  console.error('Available env vars:', Object.keys(envVars).filter(k => k.includes('TEST')));
  process.exit(1);
}

const FIXTURES_PATH = path.join(__dirname, '../fixtures/synthetic/v1/raw_uploads');

// CRITICAL: Set up environment BEFORE any imports
// Set process.env for runtime access
process.env.VITE_SUPABASE_URL = SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
process.env.VITE_OPENAI_KEY = envVars['VITE_OPENAI_KEY'] || process.env.VITE_OPENAI_KEY!;
process.env.VITE_OPENAI_MODEL = envVars['VITE_OPENAI_MODEL'] || process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';

// Patch import.meta.env using a Proxy to intercept access
// This must happen before any module imports that use import.meta.env
const envValues = {
  VITE_SUPABASE_URL: SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
  VITE_OPENAI_KEY: envVars['VITE_OPENAI_KEY'] || process.env.VITE_OPENAI_KEY!,
  VITE_OPENAI_MODEL: envVars['VITE_OPENAI_MODEL'] || process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'
};

// Use a Proxy to intercept import.meta.env access
const originalImportMeta = import.meta;
Object.defineProperty(import.meta, 'env', {
  get: () => envValues,
  configurable: true
});

// Mock window for Node.js environment (FileUploadService uses window.dispatchEvent)
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    dispatchEvent: () => {}, // No-op for Node.js
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

// Mock Blob and File if needed
if (typeof globalThis.Blob === 'undefined') {
  // @ts-ignore
  globalThis.Blob = class Blob {
    constructor(parts: any[], options?: any) {
      this.parts = parts;
      this.type = options?.type || '';
    }
    parts: any[];
    type: string;
  };
}

if (typeof globalThis.File === 'undefined') {
  // @ts-ignore
  globalThis.File = class File extends Blob {
    constructor(parts: any[], name: string, options?: any) {
      super(parts, options);
      this.name = name;
      this.lastModified = Date.now();
    }
    name: string;
    lastModified: number;
  };
}

// Now import services AFTER environment is set up
const { FileUploadService } = await import('../src/services/fileUploadService.ts');

/**
 * Authenticate with Supabase and get access token
 */
async function authenticate(): Promise<{ userId: string, accessToken: string }> {
  console.log('🔐 Authenticating...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD
  });
  
  if (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
  
  if (!data.session?.access_token) {
    throw new Error('No access token received');
  }
  
  console.log(`✅ Authenticated as ${data.user.email} (${data.user.id})`);
  return {
    userId: data.user.id,
    accessToken: data.session.access_token
  };
}

/**
 * Clear all data for a user (using MCP Supabase when available, fallback to REST API)
 */
async function clearUserData(userId: string, accessToken: string): Promise<void> {
  console.log(`🗑️  Clearing data for user ${userId}...`);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
  
  // Delete in dependency order
  const tables = [
    'approved_content',
    'work_items',
    'companies',
    'evaluation_runs',
    'linkedin_profiles',
    'sources'
  ];
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        console.warn(`⚠️  Failed to clear ${table}:`, error.message);
      } else {
        console.log(`  ✅ Cleared ${table}`);
      }
    } catch (err: any) {
      console.warn(`⚠️  Error clearing ${table}:`, err.message);
    }
  }
  
  console.log('✅ Data cleared');
}

/**
 * Convert text file to File object for service compatibility
 * Using File constructor if available, otherwise create File-like object
 */
function textToFile(content: string, fileName: string, mimeType: string = 'text/plain'): File {
  if (typeof File !== 'undefined') {
    return new File([content], fileName, { type: mimeType });
  }
  
  // Fallback for Node.js environments without File API
  const blob = new Blob([content], { type: mimeType });
  const file = Object.assign(blob, {
    name: fileName,
    lastModified: Date.now(),
    webkitRelativePath: ''
  });
  
  // Add File-like properties
  Object.defineProperty(file, 'constructor', { value: File });
  return file as File;
}

/**
 * Upload a single profile using FileUploadService
 */
async function uploadProfile(
  userId: string,
  accessToken: string,
  profileId: string
): Promise<{
  resumeSourceId?: string;
  coverLetterSourceId?: string;
  linkedinSourceId?: string;
  evaluationRunIds: string[];
}> {
  console.log(`\n📤 Uploading profile ${profileId}...`);
  
  const uploadService = new FileUploadService();
  const results: any = {
    evaluationRunIds: []
  };
  
  // Load fixture files
  const resumePath = path.join(FIXTURES_PATH, `${profileId}_resume.txt`);
  const coverLetterPath = path.join(FIXTURES_PATH, `${profileId}_cover_letter.txt`);
  const linkedinPath = path.join(FIXTURES_PATH, `${profileId}_linkedin.json`);
  
  if (!fs.existsSync(resumePath)) {
    throw new Error(`Resume file not found: ${resumePath}`);
  }
  if (!fs.existsSync(coverLetterPath)) {
    throw new Error(`Cover letter file not found: ${coverLetterPath}`);
  }
  
  // Read files
  const resumeText = fs.readFileSync(resumePath, 'utf-8');
  const coverLetterText = fs.readFileSync(coverLetterPath, 'utf-8');
  
  // Convert to File objects
  const resumeFile = textToFile(resumeText, `${profileId}_resume.txt`);
  const coverLetterFile = textToFile(coverLetterText, `${profileId}_cover_letter.txt`);
  
  // Upload resume
  console.log(`  📄 Uploading resume...`);
  const resumeResult = await uploadService.uploadContent(
    resumeFile,
    userId,
    'resume',
    accessToken
  );
  
  if (!resumeResult.success || !resumeResult.fileId) {
    throw new Error(`Resume upload failed: ${resumeResult.error}`);
  }
  results.resumeSourceId = resumeResult.fileId;
  console.log(`  ✅ Resume uploaded: ${resumeResult.fileId}`);
  
  // Upload cover letter (triggers batch processing and evaluation)
  console.log(`  📝 Uploading cover letter...`);
  const coverLetterResult = await uploadService.uploadContent(
    coverLetterFile,
    userId,
    'coverLetter',
    accessToken
  );
  
  if (!coverLetterResult.success || !coverLetterResult.fileId) {
    throw new Error(`Cover letter upload failed: ${coverLetterResult.error}`);
  }
  results.coverLetterSourceId = coverLetterResult.fileId;
  console.log(`  ✅ Cover letter uploaded: ${coverLetterResult.fileId}`);
  
  // Optional: Upload LinkedIn data if available
  if (fs.existsSync(linkedinPath)) {
    console.log(`  🔗 Uploading LinkedIn data...`);
    const linkedinData = JSON.parse(fs.readFileSync(linkedinPath, 'utf-8'));
    const linkedinText = JSON.stringify(linkedinData, null, 2);
    const linkedinFile = textToFile(linkedinText, `${profileId}_linkedin.json`, 'application/json');
    
    const linkedinResult = await uploadService.uploadContent(
      linkedinFile,
      userId,
      'linkedin',
      accessToken
    );
    
    if (linkedinResult.success && linkedinResult.fileId) {
      results.linkedinSourceId = linkedinResult.fileId;
      console.log(`  ✅ LinkedIn data uploaded: ${linkedinResult.fileId}`);
    }
  }
  
  // Wait a moment for evaluation runs to be created
  console.log(`  ⏳ Waiting for evaluation runs to complete...`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Fetch evaluation runs
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
  
  const { data: evalRuns } = await supabase
    .from('evaluation_runs')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (evalRuns) {
    results.evaluationRunIds = evalRuns.map(r => r.id);
    console.log(`  ✅ Found ${evalRuns.length} evaluation runs`);
  }
  
  return results;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const profileId = args.find(arg => /^P\d{2}$/.test(arg)) || 'P01';
  const shouldClear = args.includes('--clear') || args.includes('clear');
  const clearOnly = args.includes('--clear-only');
  
  try {
    // Authenticate
    const { userId, accessToken } = await authenticate();
    
    // Clear data if requested
    if (shouldClear || clearOnly) {
      await clearUserData(userId, accessToken);
      if (clearOnly) {
        console.log('✅ Clear complete. Exiting.');
        return;
      }
    }
    
    // Upload profile
    const results = await uploadProfile(userId, accessToken, profileId);
    
    console.log('\n✅ Upload complete!');
    console.log('\n📊 Results:');
    console.log(`  Resume Source ID: ${results.resumeSourceId}`);
    console.log(`  Cover Letter Source ID: ${results.coverLetterSourceId}`);
    if (results.linkedinSourceId) {
      console.log(`  LinkedIn Source ID: ${results.linkedinSourceId}`);
    }
    console.log(`  Evaluation Runs: ${results.evaluationRunIds.length}`);
    results.evaluationRunIds.forEach((id, idx) => {
      console.log(`    ${idx + 1}. ${id}`);
    });
    
    console.log(`\n🔗 View results at: http://localhost:8080/evaluation`);
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('direct-upload-test.ts')) {
  main();
}

export { authenticate, clearUserData, uploadProfile };

