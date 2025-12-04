/**
 * Onboarding Idempotency Test
 * ---------------------------
 * Uploads the same resume + cover letter twice and compares counts
 * to ensure no duplicate work_items, stories, sections, or voice rows.
 *
 * Usage:
 *   npx tsx scripts/test-onboarding-idempotency.ts --profile P01
 *
 * Requirements:
 * - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * - VITE_TEST_EMAIL / VITE_TEST_PASSWORD
 * - VITE_OPENAI_API_KEY (used by LLM steps)
 * - Fixture files in fixtures/synthetic/v1/raw_uploads/{profile}_resume.txt and _cover_letter.txt
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { FileUploadService } from '../src/services/fileUploadService.ts';
import { setupNodeEnv, requireEnv } from './utils/node-env';

setupNodeEnv();

type TableSnapshot = {
  companies: number;
  workItems: number;
  stories: number;
  savedSections: number;
  templates: number;
  userVoice: number;
};

const args = process.argv.slice(2);
const getArg = (flag: string) => {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
};

const profileId = getArg('--profile') || 'P01';
const fixturesRoot = path.resolve(process.cwd(), 'fixtures/synthetic/v1/raw_uploads');

function textToFile(content: string, fileName: string): File {
  return new File([content], fileName, { type: 'text/plain' });
}

async function authenticate() {
  const supabaseUrl = requireEnv('VITE_SUPABASE_URL', 'VITE_SUPABASE_URL');
  const supabaseKey = requireEnv('VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');
  const email = process.env.VITE_TEST_EMAIL || process.env.TEST_USER_EMAIL;
  const password = process.env.VITE_TEST_PASSWORD || process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing credentials: set VITE_TEST_EMAIL/TEST_USER_EMAIL and VITE_TEST_PASSWORD/TEST_USER_PASSWORD');
  }

  const authClient = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(`Auth failed: ${error?.message || 'no session returned'}`);
  }

  const token = data.session.access_token;
  const authed = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  return { userId: data.user.id, authed, token };
}

async function snapshot(client: ReturnType<typeof createClient>, userId: string): Promise<TableSnapshot> {
  const [companies, workItems, stories, sections, templates, voice] = await Promise.all([
    client.from('companies').select('id', { head: true, count: 'exact' }).eq('user_id', userId),
    client.from('work_items').select('id', { head: true, count: 'exact' }).eq('user_id', userId),
    client.from('stories').select('id', { head: true, count: 'exact' }).eq('user_id', userId),
    client.from('saved_sections').select('id', { head: true, count: 'exact' }).eq('user_id', userId),
    client.from('cover_letter_templates').select('id', { head: true, count: 'exact' }).eq('user_id', userId),
    client.from('user_voice').select('id', { head: true, count: 'exact' }).eq('user_id', userId),
  ]);

  return {
    companies: companies.count || 0,
    workItems: workItems.count || 0,
    stories: stories.count || 0,
    savedSections: sections.count || 0,
    templates: templates.count || 0,
    userVoice: voice.count || 0,
  };
}

async function waitForProcessing(client: ReturnType<typeof createClient>, sourceId: string, label: string) {
  const timeoutMs = 120_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data, error } = await client
      .from('sources')
      .select('processing_stage, processing_error')
      .eq('id', sourceId)
      .single();

    if (error) {
      console.warn(`⚠️ ${label} polling error:`, error.message);
      break;
    }
    if (data?.processing_stage === 'complete') {
      return;
    }
    if (data?.processing_stage === 'error') {
      throw new Error(`${label} processing failed: ${data.processing_error || 'unknown error'}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  console.warn(`⏱️ ${label} polling timed out after ${timeoutMs / 1000}s`);
}

async function uploadOnce(client: ReturnType<typeof createClient>, userId: string, accessToken: string) {
  const resumePath = path.join(fixturesRoot, `${profileId}_resume.txt`);
  const coverPath = path.join(fixturesRoot, `${profileId}_cover_letter.txt`);

  if (!fs.existsSync(resumePath) || !fs.existsSync(coverPath)) {
    throw new Error(`Fixture files not found for ${profileId} in ${fixturesRoot}`);
  }

  const resumeFile = textToFile(fs.readFileSync(resumePath, 'utf-8'), path.basename(resumePath));
  const coverFile = textToFile(fs.readFileSync(coverPath, 'utf-8'), path.basename(coverPath));

  const service = new FileUploadService();

  console.log('📄 Uploading resume...');
  const resumeResult = await service.uploadContent(resumeFile, userId, 'resume', accessToken);
  if (!resumeResult.success || !resumeResult.fileId) {
    throw new Error(`Resume upload failed: ${resumeResult.error || 'unknown error'}`);
  }
  await waitForProcessing(client, resumeResult.fileId, 'Resume');

  console.log('📝 Uploading cover letter...');
  const coverResult = await service.uploadContent(coverFile, userId, 'coverLetter', accessToken);
  if (!coverResult.success || !coverResult.fileId) {
    throw new Error(`Cover letter upload failed: ${coverResult.error || 'unknown error'}`);
  }
  await waitForProcessing(client, coverResult.fileId, 'Cover letter');

  return { resumeSourceId: resumeResult.fileId, coverSourceId: coverResult.fileId };
}

function diffSnapshots(before: TableSnapshot, after: TableSnapshot) {
  return {
    companies: after.companies - before.companies,
    workItems: after.workItems - before.workItems,
    stories: after.stories - before.stories,
    savedSections: after.savedSections - before.savedSections,
    templates: after.templates - before.templates,
    userVoice: after.userVoice - before.userVoice,
  };
}

async function main() {
  requireEnv('VITE_OPENAI_API_KEY', 'VITE_OPENAI_API_KEY'); // ensure LLM calls have a key
  const { userId, authed, token } = await authenticate();
  console.log(`🔁 Running idempotency test for user ${userId}, profile ${profileId}`);

  const startSnapshot = await snapshot(authed, userId);
  console.log('📊 Baseline snapshot:', startSnapshot);

  // First upload
  await uploadOnce(authed, userId, token);
  const afterFirst = await snapshot(authed, userId);
  console.log('📊 After first upload:', afterFirst);

  // Second upload (idempotency check)
  await uploadOnce(authed, userId, token);
  const afterSecond = await snapshot(authed, userId);
  console.log('📊 After second upload:', afterSecond);

  const firstDelta = diffSnapshots(startSnapshot, afterFirst);
  const secondDelta = diffSnapshots(afterFirst, afterSecond);

  console.log('\nΔ After first upload:', firstDelta);
  console.log('Δ After second upload (should be zero if idempotent):', secondDelta);

  const duplicateGrowth = Object.entries(secondDelta).filter(([key, delta]) => key !== 'userVoice' && delta > 0);
  const idempotent = duplicateGrowth.length === 0;

  if (!idempotent) {
    console.error('❌ Idempotency failed: duplicate growth detected', duplicateGrowth);
    process.exitCode = 1;
  } else {
    console.log('✅ Idempotency check passed (no duplicate growth on second upload)');
  }
}

main().catch((err) => {
  console.error('❌ Idempotency script error:', err);
  process.exit(1);
});
