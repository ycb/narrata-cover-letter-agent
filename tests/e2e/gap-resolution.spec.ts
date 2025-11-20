/**
 * E2E Test: Gap Resolution & Metrics Update Flow
 * 
 * Tests the complete flow:
 * 1. Generate cover letter draft
 * 2. Identify gaps in draft
 * 3. Address gap with streaming content generation
 * 4. Observe metrics update
 * 5. Verify variation persisted to database
 */

import { test, expect } from '@playwright/test';

test.describe('Gap Resolution Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to cover letters page
    await page.goto('/cover-letters');
    
    // Wait for authentication (mock or real)
    await page.waitForSelector('[data-testid="cover-letters-page"]', {
      timeout: 10000,
    });
  });

  test('should generate draft, address gap, and update metrics', async ({ page }) => {
    // Step 1: Create new cover letter
    await page.click('button:has-text("Create New Letter")');
    
    // Wait for modal
    await page.waitForSelector('[data-testid="cover-letter-create-modal"]');
    
    // Step 2: Paste job description
    const jobDescription = `
      Senior Product Manager
      TechCorp Inc.
      
      Requirements:
      - 5+ years of product management experience
      - Strong data analysis skills (SQL, Python)
      - Experience with B2B SaaS products
      - Proven track record of launching successful products
      - Excellent communication and leadership skills
    `;
    
    await page.fill('textarea[placeholder*="job description"]', jobDescription);
    
    // Step 3: Generate draft
    await page.click('button:has-text("Generate Draft")');
    
    // Wait for draft generation with progress
    await page.waitForSelector('[data-testid="draft-generation-progress"]', {
      timeout: 30000,
    });
    
    // Wait for completion
    await page.waitForSelector('[data-testid="draft-complete"]', {
      timeout: 60000,
    });
    
    // Step 4: Verify metrics are displayed
    const initialMetrics = await page.locator('[data-testid="progress-metrics"]');
    await expect(initialMetrics).toBeVisible();
    
    // Check core requirements metric
    const coreReqsInitial = await page.locator('[data-testid="metric-core-requirements"]').textContent();
    console.log('Initial core requirements:', coreReqsInitial);
    
    // Step 5: Identify and click on a gap
    const gapCard = page.locator('[data-testid="gap-card"]').first();
    await expect(gapCard).toBeVisible();
    
    // Click "Address Gap" or "Generate Content" button
    await gapCard.locator('button:has-text("Generate Content")').click();
    
    // Step 6: Content generation modal should open
    await page.waitForSelector('[data-testid="content-generation-modal"]');
    
    // Click generate button
    await page.click('button:has-text("Generate Content")');
    
    // Step 7: Observe streaming content
    const streamingTextarea = page.locator('textarea[data-testid="generated-content"]');
    await expect(streamingTextarea).toBeVisible();
    
    // Wait for content to appear (streaming)
    await page.waitForFunction(
      (selector) => {
        const element = document.querySelector(selector) as HTMLTextAreaElement;
        return element && element.value.length > 50;
      },
      'textarea[data-testid="generated-content"]',
      { timeout: 30000 }
    );
    
    // Step 8: Apply the generated content
    await page.click('button:has-text("Apply Content")');
    
    // Modal should close
    await expect(page.locator('[data-testid="content-generation-modal"]')).not.toBeVisible();
    
    // Step 9: Verify metrics updated
    await page.waitForTimeout(1000); // Give time for metrics to update
    
    const coreReqsUpdated = await page.locator('[data-testid="metric-core-requirements"]').textContent();
    console.log('Updated core requirements:', coreReqsUpdated);
    
    // Verify metrics improved
    expect(coreReqsUpdated).not.toBe(coreReqsInitial);
    
    // Step 10: Verify gap is resolved
    const resolvedGap = gapCard.locator('[data-testid="gap-resolved-badge"]');
    await expect(resolvedGap).toBeVisible({ timeout: 5000 });
    
    // Step 11: Check that variation was saved (optional - requires DB access)
    // This would need a test-specific API endpoint or direct DB query
    // For now, we verify the UI indicates success
    const successToast = page.locator('[role="status"]:has-text("saved")');
    await expect(successToast).toBeVisible({ timeout: 5000 });
  });

  test('should show metrics delta after gap resolution', async ({ page }) => {
    // Similar to above but focuses on delta display
    // ... setup code ...
    
    // After applying content, check for delta notification
    const deltaNotification = page.locator('[data-testid="metrics-delta"]');
    await expect(deltaNotification).toBeVisible();
    
    // Verify delta shows improvement
    await expect(deltaNotification).toContainText('↑'); // Improvement arrow
    await expect(deltaNotification).toContainText('Core Requirements');
  });

  test('should handle streaming errors gracefully', async ({ page }) => {
    // Test error handling
    // Mock API to return error
    await page.route('**/api/openai/**', (route) => {
      route.abort('failed');
    });
    
    // Try to generate content
    await page.click('button:has-text("Create New Letter")');
    // ... paste job description ...
    await page.click('button:has-text("Generate Draft")');
    
    // Should show error message
    const errorAlert = page.locator('[role="alert"]:has-text("error")');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    
    // Should fallback gracefully
    const fallbackMessage = page.locator('text=Unable to generate content');
    await expect(fallbackMessage).toBeVisible();
  });

  test('should persist variation metadata correctly', async ({ page }) => {
    // This test verifies that variation metadata includes:
    // - gap_id
    // - gap_tags (requirements addressed)
    // - target_job_title
    // - target_company
    // - created_by = 'AI'
    
    // Would need API access or DB query to verify
    // For now, stub with UI verification
    
    // After generating and applying content...
    // Check that the variation appears in the variations list
    const variationsList = page.locator('[data-testid="variations-list"]');
    await expect(variationsList).toBeVisible();
    
    const latestVariation = variationsList.locator('[data-testid="variation-item"]').first();
    await expect(latestVariation).toContainText('AI'); // Created by
    await expect(latestVariation).toContainText('Fills Gap'); // Gap indicator
  });
});

test.describe('Metrics Update Service', () => {
  test('should update only affected metrics', async ({ page }) => {
    // Test that resolving a core-requirement gap updates core requirements count
    // but doesn't unnecessarily recalculate other metrics
    
    // ... setup ...
    
    // Capture initial metrics
    const initialGoals = await page.locator('[data-testid="metric-goals"]').textContent();
    const initialCore = await page.locator('[data-testid="metric-core-requirements"]').textContent();
    
    // Resolve a core requirement gap
    // ... gap resolution flow ...
    
    // Verify core requirements updated but goals unchanged
    const updatedGoals = await page.locator('[data-testid="metric-goals"]').textContent();
    const updatedCore = await page.locator('[data-testid="metric-core-requirements"]').textContent();
    
    expect(updatedCore).not.toBe(initialCore);
    expect(updatedGoals).toBe(initialGoals); // Should remain unchanged
  });
});

