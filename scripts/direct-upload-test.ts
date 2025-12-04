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
import type { PMLevelInference } from '../src/types/content.ts';

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
process.env.VITE_OPENAI_API_KEY = envVars['VITE_OPENAI_API_KEY'] || process.env.VITE_OPENAI_API_KEY || process.env.VITE_OPENAI_KEY!;
process.env.VITE_OPENAI_MODEL = envVars['VITE_OPENAI_MODEL'] || process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';
process.env.VITE_SYNTHETIC_LOCAL_ONLY = envVars['VITE_SYNTHETIC_LOCAL_ONLY'] || process.env.VITE_SYNTHETIC_LOCAL_ONLY || 'true';

// Patch import.meta.env using a Proxy to intercept access
// This must happen before any module imports that use import.meta.env
const envValues = {
  VITE_SUPABASE_URL: SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
  VITE_OPENAI_KEY: envVars['VITE_OPENAI_KEY'] || process.env.VITE_OPENAI_KEY!,
  VITE_OPENAI_API_KEY: envVars['VITE_OPENAI_API_KEY'] || process.env.VITE_OPENAI_API_KEY || process.env.VITE_OPENAI_KEY!,
  VITE_OPENAI_MODEL: envVars['VITE_OPENAI_MODEL'] || process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
  VITE_APPIFY_API_KEY: envVars['VITE_APPIFY_API_KEY'] || process.env.VITE_APPIFY_API_KEY || '', // Optional, for synthetic mode not needed
  VITE_SYNTHETIC_LOCAL_ONLY: process.env.VITE_SYNTHETIC_LOCAL_ONLY
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

if (typeof (globalThis as any).localStorage === 'undefined') {
  const storageMap = new Map<string, string>();
  const memoryStorage = {
    get length() {
      return storageMap.size;
    },
    key(index: number) {
      return Array.from(storageMap.keys())[index] ?? null;
    },
    getItem(key: string) {
      return storageMap.has(key) ? storageMap.get(key)! : null;
    },
    setItem(key: string, value: string) {
      storageMap.set(key, String(value));
    },
    removeItem(key: string) {
      storageMap.delete(key);
    },
    clear() {
      storageMap.clear();
    },
  };

  (globalThis as any).localStorage = memoryStorage;
  if (typeof (globalThis as any).window !== 'undefined') {
    (globalThis as any).window.localStorage = memoryStorage;
  }
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
const { PMLevelsService } = await import('../src/services/pmLevelsService.ts');
const { syntheticStorage, getSyntheticLocalOnlyFlag } = await import('../src/utils/storage.ts');
const { validateCoverLetterResult, validatePMLevelsResult, calculateQualityScore } = await import('../supabase/functions/_shared/evals/validators.ts');
const { supabase } = await import('../src/lib/supabase.ts');

async function logEvaluationRun(options: {
  supabase: any;
  userId: string;
  profileId: string;
  fileType: 'resume' | 'coverLetter';
  sourceId?: string;
}): Promise<string | null> {
  const { supabase, userId, profileId, fileType, sourceId } = options;
  const sessionId = `direct-upload-${profileId}-${fileType}-${Date.now()}`;

  const { data, error } = await supabase
    .from('evaluation_runs')
    .insert({
      user_id: userId,
      session_id: sessionId,
      source_id: sourceId ?? null,
      file_type: fileType,
      user_type: 'synthetic',
      synthetic_profile_id: profileId,
      model: 'gpt-4o-mini',
      evaluation_rationale: `Processed ${fileType} via direct upload script.`,
    })
    .select('id')
    .single();

  if (error) {
    console.error(`  ⚠️ Failed to log ${fileType} evaluation run:`, error.message);
    return null;
  }

  console.log(`  🧾 Logged ${fileType} evaluation run: ${data.id}`);
  return data.id as string;
}

async function logPmLevelEvaluation(options: {
  supabase: any;
  userId: string;
  profileId: string;
  sessionId: string;
  inference: PMLevelInference | null;
  latencyMs: number;
}): Promise<string | null> {
  const { supabase, userId, profileId, sessionId, inference, latencyMs } = options;

  const { data, error } = await supabase
    .from('evaluation_runs')
    .insert({
      user_id: userId,
      session_id: sessionId,
      file_type: 'pm_level',
      user_type: 'synthetic',
      synthetic_profile_id: profileId,
      model: 'pm-levels-script',
      evaluation_rationale: inference
        ? `Inferred ${inference.displayLevel} with ${(inference.confidence * 100).toFixed(0)}% confidence.`
        : 'PM Level analysis failed during direct upload script.',
      pm_levels_status: inference ? 'success' : 'failed',
      pm_levels_latency_ms: latencyMs,
      pm_levels_inferred_level: inference?.displayLevel ?? null,
      pm_levels_confidence: inference?.confidence ?? null,
      pm_levels_trigger_reason: 'initial-load',
      pm_levels_run_type: 'initial-load',
      pm_levels_session_id: sessionId,
      pm_levels_snapshot: inference ? inference : null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('  ⚠️ Failed to log PM level evaluation:', error.message);
    return null;
  }

  console.log(`  🧾 Logged PM level evaluation run: ${data.id}`);
  return data.id as string;
}

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

  // Ensure the shared supabase client (used by services) has the session
  try {
    await supabaseAuthHelperSetSession(data.session.access_token, data.session.refresh_token ?? '');
  } catch (setErr: any) {
    console.warn('⚠️ Failed to set shared Supabase session:', setErr?.message || setErr);
  }

  console.log(`✅ Authenticated as ${data.user.email} (${data.user.id})`);
  return {
    userId: data.user.id,
    accessToken: data.session.access_token
  };
}

async function supabaseAuthHelperSetSession(accessToken: string, refreshToken: string) {
  // Reuse the shared supabase client used by services (imported from src/lib/supabase)
  try {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (error) {
      throw error;
    }
  } catch (err: any) {
    console.warn('⚠️ Error setting Supabase auth session:', err?.message || err);
  }
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
    'gaps',
    'approved_content',
    'work_items',
    'companies',
    'evaluation_runs',
    'linkedin_profiles',
    'saved_sections',
    'cover_letter_templates',
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
  uploadDurationMs: number;
  totalLatencyMs?: number;
}> {
  const startTime = Date.now();
  console.log(`\n📤 Uploading profile ${profileId}...`);
  
  const uploadService = new FileUploadService();
  const results: any = {
    evaluationRunIds: [],
    uploadDurationMs: 0
  };
  const localOnly = getSyntheticLocalOnlyFlag();
  
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
  
  // CRITICAL: Set active synthetic user to this profile BEFORE uploading
  // This ensures LinkedIn data processing uses the correct profile
  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });

async function logEvalsLog(options: {
  jobType: 'coverLetter' | 'pmLevels';
  durationMs: number;
  stageName: string;
  userId: string;
  supabaseAuth: any;
  resultSubset?: Record<string, any>;
  qualityScore?: number | null;
  qualityChecks?: any;
  success?: boolean;
}) {
  const { jobType, durationMs, stageName, userId, supabaseAuth, resultSubset, qualityScore, qualityChecks, success } = options;
  try {
    // Create a lightweight job row for dashboard linkage
    const { data: job, error: jobError } = await supabaseAuth
      .from('jobs')
      .insert({
        type: jobType,
        status: 'complete',
        user_id: userId,
        input: resultSubset ?? {},
        result: null,
        started_at: new Date(Date.now() - durationMs).toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select('id')
        .single();

    const jobId = job?.id;
    if (jobError || !jobId) {
      console.warn(`⚠️ Failed to insert job for ${jobType}:`, jobError?.message);
      return;
    }

    const { error: evalError } = await supabaseAuth
      .from('evals_log')
      .insert({
        job_id: jobId,
        job_type: jobType,
        stage: stageName,
        user_id: userId,
        environment: 'dev',
        started_at: new Date(Date.now() - durationMs).toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: Math.round(durationMs),
        success: success ?? true,
        quality_score: qualityScore ?? null,
        quality_checks: qualityChecks ?? null,
        result_subset: resultSubset ?? {},
      });

      if (evalError) {
        console.warn(`⚠️ Failed to insert evals_log for ${jobType}:`, evalError.message);
      }
    } catch (err: any) {
      console.warn(`⚠️ Error logging evals_log for ${jobType}:`, err?.message || err);
    }
  }
  
  if (localOnly) {
    syntheticStorage.setActiveProfileId(profileId);
  } else {
    const { error: switchError } = await supabaseAuth.rpc('switch_synthetic_user', {
      p_parent_user_id: userId,
      p_profile_id: profileId
    });
  
    if (switchError) {
      console.warn(`  ⚠️ Could not switch to synthetic user ${profileId}:`, switchError.message);
      // Continue anyway - might work if user doesn't exist yet
      syntheticStorage.setActiveProfileId(profileId);
    } else {
      syntheticStorage.setActiveProfileId(profileId);
      console.log(`  ✅ Switched active synthetic user to ${profileId}`);
    }
  }
  
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

  const resumeEvalId = await logEvaluationRun({
    supabase: supabaseAuth,
    userId,
    profileId,
    fileType: 'resume',
    sourceId: resumeResult.fileId,
  });
  if (resumeEvalId) {
    results.evaluationRunIds.push(resumeEvalId);
  }
  
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

  const coverEvalId = await logEvaluationRun({
    supabase: supabaseAuth,
    userId,
    profileId,
    fileType: 'coverLetter',
    sourceId: coverLetterResult.fileId,
  });
  if (coverEvalId) {
    results.evaluationRunIds.push(coverEvalId);
  }

  // Log evals_log entry for cover letter pipeline
  await logEvalsLog({
    jobType: 'coverLetter',
    durationMs: coverLetterResult.processingMs ?? 0,
    stageName: 'direct_upload',
    userId,
    supabaseAuth,
    resultSubset: {
      sourceId: coverLetterResult.fileId,
      synthetic_profile_id: profileId
    }
  });

  // Structural validation for cover letter (best-effort)
  try {
    const { data: coverSource } = await supabaseAuth
      .from('sources')
      .select('structured_data')
      .eq('id', coverLetterResult.fileId)
      .single();

    if (coverSource?.structured_data) {
      const validation = validateCoverLetterResult(coverSource.structured_data);
      const qualityScore = calculateQualityScore(validation);
      await logEvalsLog({
        jobType: 'coverLetter',
        durationMs: 0,
        stageName: 'structural_checks',
        userId,
        supabaseAuth,
        qualityScore,
        qualityChecks: validation.checks,
        success: validation.passedOverall ?? true,
        resultSubset: {
          sourceId: coverLetterResult.fileId,
          synthetic_profile_id: profileId
        }
      });
    }
  } catch (vErr: any) {
    console.warn('⚠️ Structural validation (cover letter) failed:', vErr?.message || vErr);
  }
  
  // LinkedIn processing: always ensure a source is inserted, even if the primary path is skipped
  try {
    // Try the standard path first (may no-op if pendingResume is missing)
    if ((uploadService as any).fetchAndProcessLinkedInData) {
      await (uploadService as any).fetchAndProcessLinkedInData(accessToken);
    }

    // If no LinkedIn source was created, force a fixture-backed insert + processing
    if (!results.linkedinSourceId) {
      const linkedinPath = path.join(FIXTURES_PATH, `${profileId}_linkedin.json`);
      if (fs.existsSync(linkedinPath)) {
        const raw = fs.readFileSync(linkedinPath, 'utf-8');
        const appifyJson = JSON.parse(raw);
        const { AppifyService } = await import('../src/services/appifyService.ts');
        const appify = new AppifyService();
        const structured = (appify as any).convertToStructuredData
          ? (appify as any).convertToStructuredData(appifyJson)
          : appifyJson;
        const checksum = `linkedin_${profileId}_${Date.now()}`;
        const { data: linkedinSource, error } = await supabaseAuth
          .from('sources')
          .insert({
            user_id: userId,
            file_name: `${profileId}_linkedin.json`,
            file_type: 'application/json',
            file_size: Buffer.byteLength(raw, 'utf8'),
            file_checksum: checksum,
            storage_path: `fixtures/${profileId}_linkedin.json`,
            raw_text: raw,
            structured_data: structured,
            processing_status: 'completed',
            source_type: 'linkedin'
          })
          .select('id')
          .single();
        if (!error && linkedinSource?.id) {
          results.linkedinSourceId = linkedinSource.id;
          if ((uploadService as any).processStructuredData) {
            await (uploadService as any).processStructuredData(structured, linkedinSource.id, accessToken);
          }
        } else if (error) {
          console.warn('⚠️ Manual LinkedIn source insert failed:', error.message);
        }
      } else {
        console.warn(`⚠️ LinkedIn fixture not found for ${profileId}: ${linkedinPath}`);
      }
    }
  } catch (liErr: any) {
    console.warn('⚠️ LinkedIn fixture processing failed:', liErr?.message || liErr);
  }
  
  // Wait a moment for all processing to complete (LinkedIn loading, unified profile creation, etc.)                
  console.log(`  ⏳ Waiting for processing to complete (LinkedIn + unified profile)...`);                           
  await new Promise(resolve => setTimeout(resolve, 8000));

  const pmLevelsService = new PMLevelsService();
  const pmSessionId = `pm-level-direct-${profileId}-${Date.now()}`;
  const pmStart = Date.now();
  let pmInference: PMLevelInference | null = null;
  try {
    pmInference = await pmLevelsService.analyzeUserLevel(userId);
    console.log('  🧠 PM Levels analysis completed');
  } catch (error: any) {
    console.error('  ⚠️ PM Levels analysis failed:', error?.message || error);
  }
  const pmLatencyMs = Date.now() - pmStart;

  const pmEvalId = await logPmLevelEvaluation({
    supabase: supabaseAuth,
    userId,
    profileId,
    sessionId: pmSessionId,
    inference: pmInference,
    latencyMs: pmLatencyMs,
  });
  if (pmEvalId) {
    results.evaluationRunIds.push(pmEvalId);
  }
  results.totalLatencyMs = pmLatencyMs;

  // Log evals_log entry for PM Levels pipeline
  await logEvalsLog({
    jobType: 'pmLevels',
    durationMs: pmLatencyMs,
    stageName: 'direct_upload',
    userId,
    supabaseAuth,
    resultSubset: {
      synthetic_profile_id: profileId
    }
  });

  // Structural validation for PM Levels (best-effort)
  try {
    if (pmInference) {
      const validation = validatePMLevelsResult(pmInference as any);
      const qualityScore = calculateQualityScore(validation);
      await logEvalsLog({
        jobType: 'pmLevels',
        durationMs: pmLatencyMs,
        stageName: 'structural_checks',
        userId,
        supabaseAuth,
        qualityScore,
        qualityChecks: validation.checks,
        success: validation.passedOverall ?? true,
        resultSubset: {
          synthetic_profile_id: profileId
        }
      });
    }
  } catch (vErr: any) {
    console.warn('⚠️ Structural validation (pmLevels) failed:', vErr?.message || vErr);
  }
  
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
    .eq('synthetic_profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (evalRuns) {
    results.evaluationRunIds = evalRuns.map(r => r.id);
    // Get total latency from the most recent evaluation run                                                        
    const { data: latestRun } = await supabase
      .from('evaluation_runs')
      .select('total_latency_ms')
      .eq('user_id', userId)
      .eq('synthetic_profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (latestRun && latestRun.total_latency_ms != null) {
      results.totalLatencyMs = latestRun.total_latency_ms;
    }
    console.log(`  ✅ Found ${evalRuns.length} evaluation runs`);
  }
  
  results.uploadDurationMs = Date.now() - startTime;
  return results;
}

/**
 * Upload all synthetic profiles (P01-P10)
 */
async function uploadAllProfiles(
  userId: string,
  accessToken: string
): Promise<{
  profiles: Array<{ profileId: string; results: Awaited<ReturnType<typeof uploadProfile>> }>;
  totalDurationMs: number;
  avgDurationMs: number;
  avgLatencyMs: number;
}> {
  const allStartTime = Date.now();
  const profiles = ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10'];
  const results: Array<{ profileId: string; results: Awaited<ReturnType<typeof uploadProfile>> }> = [];
  
  console.log(`\n🚀 Starting batch upload of ${profiles.length} profiles...\n`);
  
  for (let i = 0; i < profiles.length; i++) {
    const profileId = profiles[i];
    try {
      const profileResults = await uploadProfile(userId, accessToken, profileId);
      results.push({ profileId, results: profileResults });
      
      const duration = (profileResults.uploadDurationMs / 1000).toFixed(2);
      const latency = profileResults.totalLatencyMs 
        ? (profileResults.totalLatencyMs / 1000).toFixed(2)
        : 'N/A';
      console.log(`  ⏱️  Profile ${profileId}: ${duration}s (Processing: ${latency}s)`);
      
      // Small delay between profiles to avoid rate limits
      if (i < profiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error(`  ❌ Profile ${profileId} failed:`, error.message);
      results.push({ 
        profileId, 
        results: { 
          evaluationRunIds: [], 
          uploadDurationMs: 0 
        } 
      });
    }
  }
  
  const totalDurationMs = Date.now() - allStartTime;
  const successful = results.filter(r => r.results.evaluationRunIds.length > 0);
  const avgDurationMs = successful.length > 0
    ? successful.reduce((sum, r) => sum + r.results.uploadDurationMs, 0) / successful.length
    : 0;
  const latencies = successful
    .map(r => r.results.totalLatencyMs)
    .filter((l): l is number => l !== undefined);
  const avgLatencyMs = latencies.length > 0
    ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
    : 0;
  
  return {
    profiles: results,
    totalDurationMs,
    avgDurationMs,
    avgLatencyMs
  };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const profileId = args.find(arg => /^P\d{2}$/.test(arg));
  const shouldClear = args.includes('--clear') || args.includes('clear');
  const clearOnly = args.includes('--clear-only');
  const uploadAll = args.includes('--all') || args.includes('all');
  
  try {
    // Authenticate
    const { userId, accessToken } = await authenticate();
    
    // Clear data if requested
    if (shouldClear || clearOnly || uploadAll) {
      await clearUserData(userId, accessToken);
      if (clearOnly) {
        console.log('✅ Clear complete. Exiting.');
        return;
      }
    }
    
    // Upload all profiles if requested
    if (uploadAll) {
      const batchResults = await uploadAllProfiles(userId, accessToken);
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ Batch Upload Complete!');
      console.log('='.repeat(60));
      console.log(`\n📊 Summary:`);
      console.log(`  Total Profiles: ${batchResults.profiles.length}`);
      console.log(`  Successful: ${batchResults.profiles.filter(p => p.results.evaluationRunIds.length > 0).length}`);
      console.log(`  Failed: ${batchResults.profiles.filter(p => p.results.evaluationRunIds.length === 0).length}`);
      console.log(`  Total Duration: ${(batchResults.totalDurationMs / 1000).toFixed(2)}s`);
      console.log(`  Avg Upload Time: ${(batchResults.avgDurationMs / 1000).toFixed(2)}s per profile`);
      console.log(`  Avg Processing Latency: ${(batchResults.avgLatencyMs / 1000).toFixed(2)}s per profile`);
      console.log(`\n📋 Profile Details:`);
      batchResults.profiles.forEach(({ profileId, results }) => {
        const status = results.evaluationRunIds.length > 0 ? '✅' : '❌';
        const duration = (results.uploadDurationMs / 1000).toFixed(2);
        const latency = results.totalLatencyMs 
          ? (results.totalLatencyMs / 1000).toFixed(2)
          : 'N/A';
        console.log(`  ${status} ${profileId}: ${duration}s (Processing: ${latency}s, Runs: ${results.evaluationRunIds.length})`);
      });
      console.log(`\n🔗 View results at: http://localhost:8080/evaluation`);
      return;
    }
    
    // Upload single profile
    const targetProfile = profileId || 'P01';
    const results = await uploadProfile(userId, accessToken, targetProfile);
    
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
    if (results.totalLatencyMs) {
      console.log(`  Processing Latency: ${(results.totalLatencyMs / 1000).toFixed(2)}s`);
    }
    console.log(`  Total Upload Time: ${(results.uploadDurationMs / 1000).toFixed(2)}s`);
    
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
