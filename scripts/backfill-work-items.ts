/**
 * Backfill script to process existing sources and create work_items
 * This will re-run processStructuredData for all P01 sources
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = envVars['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = envVars['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY!;
const TEST_USER_EMAIL = envVars['VITE_TEST_EMAIL'] || process.env.VITE_TEST_EMAIL!;
const TEST_USER_PASSWORD = envVars['VITE_TEST_PASSWORD'] || process.env.VITE_TEST_PASSWORD!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function backfillWorkItems() {
  const { data: { user, session } } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD
  });

  if (!session?.access_token) {
    throw new Error('No access token');
  }

  // Use authenticated client
  const authSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    }
  });

  console.log('\n=== Finding P01 sources with workHistory ===');
  const { data: sources } = await authSupabase
    .from('sources')
    .select('id, file_name, structured_data, processing_status')
    .eq('user_id', user.id)
    .like('file_name', 'P01_%')
    .order('created_at', { ascending: false });

  const resumeSources = sources?.filter(s => {
    const sd = s.structured_data as any;
    return sd?.workHistory && Array.isArray(sd.workHistory) && sd.workHistory.length > 0;
  }) || [];

  console.log(`Found ${resumeSources.length} P01 sources with workHistory`);

  for (const source of resumeSources.slice(0, 1)) { // Process most recent one first
    const sd = source.structured_data as any;
    console.log(`\nProcessing ${source.file_name} (${sd.workHistory.length} entries)...`);

    // Import the service
    const { FileUploadService } = await import('../src/services/fileUploadService.ts');
    const uploadService = new FileUploadService();

    // Call processStructuredData via reflection (it's private)
    // We'll need to make it public or create a public method
    try {
      // Try calling it directly - if it's private we'll get an error
      await (uploadService as any).processStructuredData(sd, source.id, session.access_token);
      console.log(`✅ Processed ${source.file_name}`);
    } catch (error: any) {
      console.error(`❌ Error processing ${source.file_name}:`, error.message);
    }
  }
}

backfillWorkItems().catch(console.error);

