#!/usr/bin/env ts-node

/**
 * Re-run extraction + parsing on a stored cover letter file.
 *
 * Usage:
 *   node --import tsx scripts/reparse-cover-letter-from-storage.ts <user_id> <source_id>
 */

import { createClient } from '@supabase/supabase-js';
import { FILE_UPLOAD_CONFIG } from '@/lib/config/fileUpload';
import { TextExtractionService } from '@/services/textExtractionService';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function guessContentType(fileName: string, fallback?: string | null) {
  if (fallback) return fallback;
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.md')) return 'text/markdown';
  if (lower.endsWith('.txt')) return 'text/plain';
  return 'application/pdf';
}

function preview(text?: string | null, limit = 140) {
  if (!text) return '✗';
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit)}...`;
}

async function main(userId: string, sourceId: string) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔄 Reparse Cover Letter From Storage');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`User ID:   ${userId}`);
  console.log(`Source ID: ${sourceId}`);
  console.log('');

  const { data: source, error: sourceError } = await supabase
    .from('sources')
    .select('id, user_id, file_name, file_type, storage_path, source_type')
    .eq('id', sourceId)
    .eq('user_id', userId)
    .single();

  if (sourceError || !source) {
    console.error('❌ Error fetching source:', sourceError);
    process.exit(1);
  }

  if (source.source_type !== 'cover_letter') {
    console.error(`❌ Source is type "${source.source_type}", expected "cover_letter"`);
    process.exit(1);
  }

  if (!source.storage_path) {
    console.error('❌ Source has no storage_path to download');
    process.exit(1);
  }

  console.log(`✅ Source: ${source.file_name}`);
  console.log(`   Path:  ${source.storage_path}`);
  console.log('');

  console.log('📥 Downloading file from storage...');
  const bucket = FILE_UPLOAD_CONFIG.STORAGE.BUCKET_NAME;
  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(source.storage_path);

  if (downloadError || !fileBlob) {
    console.error('❌ Error downloading file:', downloadError);
    process.exit(1);
  }

  const buffer = await fileBlob.arrayBuffer();
  const contentType = guessContentType(source.file_name, source.file_type);
  const file = new File([buffer], source.file_name, { type: contentType });

  console.log(`✅ Downloaded ${Math.round(buffer.byteLength / 1024)} KB (${contentType})`);
  console.log('');

  console.log('🔍 Running TextExtractionService...');
  const extractor = new TextExtractionService();
  const extraction = await extractor.extractText(file);

  if (!extraction.success || !extraction.text) {
    console.error('❌ Extraction failed:', extraction.error);
    process.exit(1);
  }

  console.log(`✅ Extracted ${extraction.text.length} characters`);
  console.log('');

  console.log('🧠 Parsing cover letter...');
  const { parseCoverLetter } = await import('../src/services/coverLetterParser.js');
  const parsed = parseCoverLetter(extraction.text);

  console.log('✅ Parsed structure:');
  console.log(`   Greeting:   ${preview(parsed.greeting)}`);
  console.log(`   Intro:      ${preview(parsed.introduction)}`);
  console.log(`   Body count: ${parsed.bodyParagraphs.length}`);
  parsed.bodyParagraphs.forEach((body, idx) => {
    console.log(`   Body ${idx + 1}:   ${preview(body)}`);
  });
  console.log(`   Closing:    ${preview(parsed.closing)}`);
  console.log(`   Signature:  ${preview(parsed.signature)}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Re-parse complete');
  console.log('═══════════════════════════════════════════════════════════');
}

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node --import tsx scripts/reparse-cover-letter-from-storage.ts <user_id> <source_id>');
  process.exit(1);
}

const [userId, sourceId] = args;

main(userId, sourceId).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
