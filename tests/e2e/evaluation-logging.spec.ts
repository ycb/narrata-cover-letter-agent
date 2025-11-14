/**
 * E2E Tests for Evaluation Logging
 * 
 * Verifies that evaluation events are logged correctly:
 * - JD parsing events
 * - HIL story creation events
 * - HIL saved section events
 */

import { test, expect } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

// Helper to create Supabase client for testing
async function getSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    test.skip(true, 'Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

test.describe('Evaluation Logging E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should verify JD parse events structure', async () => {
    const supabase = await getSupabaseClient();
    
    // Query existing JD parse events
    const { data: events, error } = await supabase
      .from('evaluation_runs')
      .select('id, jd_parse_status, jd_parse_event, created_at')
      .eq('file_type', 'jd_parse')
      .order('created_at', { ascending: false })
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(events)).toBe(true);

    // If events exist, verify structure
    if (events && events.length > 0) {
      const event = events[0];
      expect(event).toHaveProperty('jd_parse_status');
      expect(['success', 'failed', 'pending']).toContain(event.jd_parse_status);
      
      if (event.jd_parse_status === 'success' && event.jd_parse_event) {
        const jdEvent = event.jd_parse_event as any;
        expect(jdEvent).toHaveProperty('jobDescriptionId');
        expect(jdEvent).toHaveProperty('rawTextChecksum');
      }
    }
  });

  test('should verify evaluation_runs table structure', async () => {
    const supabase = await getSupabaseClient();
    
    // Verify table exists and has required columns
    const { data, error } = await supabase
      .from('evaluation_runs')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    
    if (data && data.length > 0) {
      const row = data[0] as any;
      
      // Verify JD parse columns exist
      expect(row).toHaveProperty('jd_parse_event');
      expect(row).toHaveProperty('jd_parse_status');
      
      // Verify HIL columns exist
      expect(row).toHaveProperty('hil_content_type');
      expect(row).toHaveProperty('hil_action');
      expect(row).toHaveProperty('hil_content_id');
      expect(row).toHaveProperty('hil_content_word_delta');
      expect(row).toHaveProperty('hil_gap_coverage');
      expect(row).toHaveProperty('hil_gaps_addressed');
      expect(row).toHaveProperty('hil_status');
      
      // Verify standard columns
      expect(row).toHaveProperty('user_id');
      expect(row).toHaveProperty('file_type');
      expect(row).toHaveProperty('created_at');
    }
  });

  test('should query JD parse events by status', async () => {
    const supabase = await getSupabaseClient();
    
    // Test querying JD parse events
    const { data: successEvents, error: successError } = await supabase
      .from('evaluation_runs')
      .select('id, jd_parse_status, jd_parse_event')
      .eq('file_type', 'jd_parse')
      .eq('jd_parse_status', 'success');

    expect(successError).toBeNull();
    expect(Array.isArray(successEvents)).toBe(true);

    const { data: failedEvents, error: failedError } = await supabase
      .from('evaluation_runs')
      .select('id, jd_parse_status')
      .eq('file_type', 'jd_parse')
      .eq('jd_parse_status', 'failed');

    expect(failedError).toBeNull();
    expect(Array.isArray(failedEvents)).toBe(true);
  });

  test('should query HIL story events', async () => {
    const supabase = await getSupabaseClient();
    
    // Test querying HIL story events
    const { data: storyEvents, error } = await supabase
      .from('evaluation_runs')
      .select('id, hil_content_type, hil_action, hil_content_word_delta')
      .eq('hil_content_type', 'story');

    expect(error).toBeNull();
    expect(Array.isArray(storyEvents)).toBe(true);

    // Verify event structure if any exist
    if (storyEvents && storyEvents.length > 0) {
      const event = storyEvents[0] as any;
      expect(event.hil_content_type).toBe('story');
      expect(['ai_suggest', 'manual_edit', 'apply_suggestion']).toContain(event.hil_action);
      expect(typeof event.hil_content_word_delta).toBe('number');
    }
  });

  test('should query HIL saved section events', async () => {
    const supabase = await getSupabaseClient();
    
    // Test querying HIL saved section events
    const { data: sectionEvents, error } = await supabase
      .from('evaluation_runs')
      .select('id, hil_content_type, hil_action, hil_content_word_delta')
      .eq('hil_content_type', 'saved_section');

    expect(error).toBeNull();
    expect(Array.isArray(sectionEvents)).toBe(true);

    // Verify event structure if any exist
    if (sectionEvents && sectionEvents.length > 0) {
      const event = sectionEvents[0] as any;
      expect(event.hil_content_type).toBe('saved_section');
      expect(['ai_suggest', 'manual_edit', 'apply_suggestion']).toContain(event.hil_action);
    }
  });

  test('should verify indexes exist for performance', async () => {
    const supabase = await getSupabaseClient();
    
    // Verify that indexes are being used (indirectly by checking query performance)
    const startTime = Date.now();
    
    const { data, error } = await supabase
      .from('evaluation_runs')
      .select('id')
      .eq('jd_parse_status', 'success')
      .limit(10);

    const queryTime = Date.now() - startTime;

    expect(error).toBeNull();
    // Query should be fast (< 500ms) if indexes are working
    expect(queryTime).toBeLessThan(500);
  });
});

