/**
 * Onboarding Streaming E2E (smoke + DB checks)
 *
 * - Seeds Supabase session into localStorage to load /onboarding
 * - Verifies onboarding cards render for authenticated users
 * - Confirms evaluation_runs contains expected latency rows
 */

import { test, expect } from '@playwright/test';
import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const testEmail = process.env.VITE_TEST_EMAIL || process.env.TEST_USER_EMAIL;
const testPassword = process.env.VITE_TEST_PASSWORD || process.env.TEST_USER_PASSWORD;
const testUserId = process.env.TEST_USER_ID;

test.describe('Onboarding streaming', () => {
  test('renders onboarding cards for authenticated user', async ({ page }) => {
    test.skip(!supabaseUrl || !supabaseKey || !testEmail || !testPassword, 'Supabase/test creds not configured');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail!,
      password: testPassword!,
    });
    if (error || !data.session) {
      test.skip(true, 'Unable to authenticate test user for onboarding smoke test');
    }

    // Inject Supabase session into localStorage before page scripts run
    await page.addInitScript(
      ({ storageKey, session }) => {
        const payload = {
          currentSession: session,
          expiresAt: session.expires_at || Math.floor(Date.now() / 1000) + 3600,
        };
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
      },
      { storageKey: 'cover-letter-agent-auth', session: data.session }
    );

    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Add Your Content' })).toBeVisible();
    await expect(page.getByText('Resume')).toBeVisible();
    await expect(page.getByText('Best Cover Letter')).toBeVisible();
    await expect(page.getByText('LinkedIn Profile')).toBeVisible();
  });

  test('supabase: latency rows exist for onboarding stages', async () => {
    test.skip(!supabaseUrl || !supabaseKey, 'Supabase not configured');

    const client = createClient(supabaseUrl, supabaseKey);
    const fileTypes = ['resume_client', 'cover_letter', 'linkedin', 'onboarding_total'];
    let query = client.from('evaluation_runs').select('file_type, user_id').in('file_type', fileTypes);
    if (testUserId) {
      query = query.eq('user_id', testUserId);
    }

    const { data, error } = await query.limit(50);
    expect(error).toBeNull();
    expect(data && data.length > 0).toBeTruthy();

    const present = new Set((data || []).map((r) => r.file_type));
    fileTypes.forEach((ft) => expect(present.has(ft)).toBeTruthy());
  });
});
