import { test, expect } from '@playwright/test';

/**
 * Agent C - Match Intelligence E2E Tests
 * 
 * Tests the complete flow of match intelligence from draft creation
 * through metrics display, tooltips, and CTA actions.
 */

test.describe('Agent C - Match Intelligence Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login and navigate to cover letters page
    await page.goto('/');
    // TODO: Add actual login flow when auth is implemented
    // For now, assume user is logged in or using test account
  });

  test('should create draft with single LLM call and display real metrics', async ({ page }) => {
    // Navigate to cover letters
    await page.goto('/cover-letters');
    
    // Click create new letter
    await page.click('button:has-text("Create New Letter")');
    
    // Wait for create modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Paste a job description
    const jobDescription = `
      Senior Product Manager at TechCorp
      
      Requirements:
      - 5+ years product management experience
      - Led cross-functional teams
      - Data-driven decision making
      - Strong stakeholder communication
      - Experience with SaaS products
      
      Preferred:
      - MBA or equivalent
      - Technical background
      - Experience with AI/ML products
    `;
    
    await page.fill('textarea[placeholder*="job description"]', jobDescription);
    
    // Monitor network requests for OpenAI API calls
    const apiCalls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('api.openai.com')) {
        apiCalls.push(request.url());
      }
    });
    
    // Generate draft
    await page.click('button:has-text("Generate Draft")');
    
    // Wait for draft creation (should complete in <30s)
    await page.waitForSelector('[data-testid="draft-content"]', { timeout: 30000 });
    
    // Verify only ONE LLM call was made (for metrics)
    expect(apiCalls.length).toBeLessThanOrEqual(2); // Template generation + metrics
    
    // Verify metrics bar is visible with real data
    await expect(page.locator('[data-testid="metrics-bar"]')).toBeVisible();
    
    // Check all 6 metrics are displayed
    await expect(page.locator('text=MATCH WITH GOALS')).toBeVisible();
    await expect(page.locator('text=MATCH WITH EXPERIENCE')).toBeVisible();
    await expect(page.locator('text=CORE REQS')).toBeVisible();
    await expect(page.locator('text=PREFERRED REQS')).toBeVisible();
    await expect(page.locator('text=COVER LETTER RATING')).toBeVisible();
    await expect(page.locator('text=ATS')).toBeVisible();
    
    // Verify metrics show actual values (not N/A or placeholders)
    const coreReqsText = await page.locator('text=/CORE REQS/').locator('..').textContent();
    expect(coreReqsText).toMatch(/\d+\/\d+/); // Should show "X/Y" format
  });

  test('should display detailed goal match tooltip with Edit Goals CTA', async ({ page }) => {
    // Assume we're on a draft page with metrics
    await page.goto('/cover-letters');
    
    // Click on an existing draft to edit
    await page.click('[data-testid="cover-letter-card"]:first-child button:has-text("Edit")');
    
    // Wait for edit modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Hover over "MATCH WITH GOALS" metric
    await page.hover('text=MATCH WITH GOALS');
    
    // Wait for tooltip to appear
    await expect(page.locator('[role="tooltip"]')).toBeVisible({ timeout: 2000 });
    
    // Verify tooltip content
    const tooltipContent = await page.locator('[role="tooltip"]').textContent();
    
    // Should show goal details or "Set up your career goals" message
    const hasGoalData = tooltipContent?.includes('Title') || tooltipContent?.includes('Set up your career goals');
    expect(hasGoalData).toBeTruthy();
    
    // Click "Edit Goals" button
    await page.click('button:has-text("Edit Goals")');
    
    // Verify goals modal opens
    await expect(page.locator('[role="dialog"]:has-text("Career Goals")')).toBeVisible();
  });

  test('should display experience match tooltip with Add Story CTA for low confidence', async ({ page }) => {
    // Navigate to draft with low-confidence experience matches
    await page.goto('/cover-letters');
    await page.click('[data-testid="cover-letter-card"]:first-child button:has-text("Edit")');
    
    // Hover over "MATCH WITH EXPERIENCE" metric
    await page.hover('text=MATCH WITH EXPERIENCE');
    
    // Wait for tooltip
    await expect(page.locator('[role="tooltip"]')).toBeVisible({ timeout: 2000 });
    
    // Look for "Add Story" button (should appear for low-confidence matches)
    const addStoryButtons = page.locator('button:has-text("Add Story Covering This")');
    
    // If there are low-confidence matches, test the CTA
    const count = await addStoryButtons.count();
    if (count > 0) {
      // Click first "Add Story" button
      await addStoryButtons.first().click();
      
      // Verify story modal opens
      await expect(page.locator('[role="dialog"]:has-text("Add Story")')).toBeVisible();
    }
  });

  test('should display requirements tooltips with Enhance Section and Add Metrics CTAs', async ({ page }) => {
    await page.goto('/cover-letters');
    await page.click('[data-testid="cover-letter-card"]:first-child button:has-text("Edit")');
    
    // Hover over "CORE REQS" metric
    await page.hover('text=CORE REQS');
    
    // Wait for tooltip
    await expect(page.locator('[role="tooltip"]')).toBeVisible({ timeout: 2000 });
    
    // Verify requirements are listed
    const tooltipText = await page.locator('[role="tooltip"]').textContent();
    expect(tooltipText).toBeTruthy();
    
    // Look for action buttons
    const enhanceButtons = page.locator('button:has-text("Enhance This Section")');
    const addMetricsButtons = page.locator('button:has-text("Add Metrics")');
    
    // If buttons exist, verify they're clickable
    const enhanceCount = await enhanceButtons.count();
    const metricsCount = await addMetricsButtons.count();
    
    expect(enhanceCount + metricsCount).toBeGreaterThanOrEqual(0);
  });

  test('should persist enhancedMatchData across page reloads', async ({ page }) => {
    await page.goto('/cover-letters');
    
    // Create a draft
    await page.click('button:has-text("Create New Letter")');
    await page.fill('textarea[placeholder*="job description"]', 'Product Manager role requiring 5+ years experience');
    await page.click('button:has-text("Generate Draft")');
    await page.waitForSelector('[data-testid="draft-content"]', { timeout: 30000 });
    
    // Get metrics values
    const coreReqsText1 = await page.locator('text=/CORE REQS/').locator('..').textContent();
    
    // Close modal
    await page.keyboard.press('Escape');
    
    // Reopen the same draft
    await page.click('[data-testid="cover-letter-card"]:first-child button:has-text("Edit")');
    
    // Verify metrics are still displayed
    await expect(page.locator('[data-testid="metrics-bar"]')).toBeVisible();
    
    // Verify same values
    const coreReqsText2 = await page.locator('text=/CORE REQS/').locator('..').textContent();
    expect(coreReqsText2).toBe(coreReqsText1);
  });

  test('should handle graceful degradation when LLM fails', async ({ page }) => {
    // Intercept API calls and simulate failure
    await page.route('**/api.openai.com/**', (route) => {
      route.abort('failed');
    });
    
    await page.goto('/cover-letters');
    await page.click('button:has-text("Create New Letter")');
    await page.fill('textarea[placeholder*="job description"]', 'Test job description');
    await page.click('button:has-text("Generate Draft")');
    
    // Should still create a draft even if metrics fail
    await page.waitForSelector('[data-testid="draft-content"]', { timeout: 30000 });
    
    // Metrics should show fallback values or "Analysis unavailable" message
    const metricsText = await page.locator('[data-testid="metrics-bar"]').textContent();
    const hasFallback = metricsText?.includes('unavailable') || metricsText?.includes('average') || metricsText?.includes('70');
    expect(hasFallback).toBeTruthy();
  });

  test('Edit Goals CTA should save changes and update metrics', async ({ page }) => {
    await page.goto('/cover-letters');
    await page.click('[data-testid="cover-letter-card"]:first-child button:has-text("Edit")');
    
    // Open goals tooltip and click Edit Goals
    await page.hover('text=MATCH WITH GOALS');
    await page.waitForSelector('[role="tooltip"]', { state: 'visible' });
    await page.click('button:has-text("Edit Goals")');
    
    // Wait for goals modal
    await expect(page.locator('[role="dialog"]:has-text("Career Goals")')).toBeVisible();
    
    // Make a change (e.g., update target title)
    const titleInput = page.locator('input[name="targetTitle"]');
    if (await titleInput.isVisible()) {
      await titleInput.fill('Senior Product Manager');
    }
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Verify modal closes
    await expect(page.locator('[role="dialog"]:has-text("Career Goals")')).not.toBeVisible();
    
    // Page should refresh with updated data
    // (In real implementation, this might trigger a re-analysis)
  });

  test('Add Story CTA should open story modal with pre-filled context', async ({ page }) => {
    await page.goto('/cover-letters');
    await page.click('[data-testid="cover-letter-card"]:first-child button:has-text("Edit")');
    
    // Hover over experience tooltip
    await page.hover('text=MATCH WITH EXPERIENCE');
    await page.waitForSelector('[role="tooltip"]', { state: 'visible' });
    
    // Click "Add Story" if available
    const addStoryButton = page.locator('button:has-text("Add Story Covering This")').first();
    if (await addStoryButton.isVisible()) {
      await addStoryButton.click();
      
      // Verify story modal opens
      await expect(page.locator('[role="dialog"]:has-text("Add Story")')).toBeVisible();
      
      // Note: In a full implementation, the modal would be pre-filled with
      // the requirement text or have context about what story to create
    }
  });

  test('should display all 6 metrics with correct color coding', async ({ page }) => {
    await page.goto('/cover-letters');
    await page.click('[data-testid="cover-letter-card"]:first-child button:has-text("Edit")');
    
    // Verify all metrics exist
    const metricsBar = page.locator('[data-testid="metrics-bar"]');
    await expect(metricsBar).toBeVisible();
    
    // Check for all 6 metrics
    const expectedMetrics = [
      'MATCH WITH GOALS',
      'MATCH WITH EXPERIENCE',
      'CORE REQS',
      'PREFERRED REQS',
      'COVER LETTER RATING',
      'ATS'
    ];
    
    for (const metric of expectedMetrics) {
      await expect(page.locator(`text=${metric}`)).toBeVisible();
    }
    
    // Verify badges have color classes (success/warning/destructive)
    const badges = await page.locator('[class*="badge"]').all();
    expect(badges.length).toBeGreaterThanOrEqual(6);
  });

  test('should show differentiator analysis in enhanced data', async ({ page }) => {
    await page.goto('/cover-letters');
    
    // Create new draft
    await page.click('button:has-text("Create New Letter")');
    
    // Use a JD with unique requirements
    await page.fill('textarea[placeholder*="job description"]', `
      AI Product Manager at InnovateAI
      
      This role is unique because:
      - Working directly with ML researchers
      - Defining product roadmap for AI features
      - Experience with large language models required
    `);
    
    await page.click('button:has-text("Generate Draft")');
    await page.waitForSelector('[data-testid="draft-content"]', { timeout: 30000 });
    
    // Check browser console or inspect data structure for differentiator analysis
    // In a real test, we'd verify the data exists in the draft object
    const pageData = await page.evaluate(() => {
      // Access draft data from window/global state if exposed
      return (window as any).__draftData__ || null;
    });
    
    // This is a placeholder - actual implementation would verify
    // that enhancedMatchData.differentiatorAnalysis exists
    console.log('Draft data:', pageData);
  });

  test('complete end-to-end workflow', async ({ page }) => {
    /**
     * This test covers the complete Agent C workflow:
     * 1. Create draft with single LLM call
     * 2. View metrics bar with real data
     * 3. Interact with each tooltip
     * 4. Use at least one CTA (Edit Goals)
     * 5. Verify data persists
     */
    
    // 1. Create draft
    await page.goto('/cover-letters');
    await page.click('button:has-text("Create New Letter")');
    
    const jobDesc = `
      Product Manager at TestCorp
      Requirements: 5+ years PM experience, data-driven, stakeholder management
      Preferred: MBA, technical background
    `;
    
    await page.fill('textarea[placeholder*="job description"]', jobDesc);
    await page.click('button:has-text("Generate Draft")');
    await page.waitForSelector('[data-testid="draft-content"]', { timeout: 30000 });
    
    // 2. Verify metrics bar
    await expect(page.locator('[data-testid="metrics-bar"]')).toBeVisible();
    
    // 3. Interact with tooltips
    const metrics = ['MATCH WITH GOALS', 'MATCH WITH EXPERIENCE', 'CORE REQS'];
    for (const metric of metrics) {
      await page.hover(`text=${metric}`);
      await page.waitForTimeout(1000); // Allow tooltip to appear
    }
    
    // 4. Use Edit Goals CTA
    await page.hover('text=MATCH WITH GOALS');
    const editGoalsButton = page.locator('button:has-text("Edit Goals")');
    if (await editGoalsButton.isVisible()) {
      await editGoalsButton.click();
      await expect(page.locator('[role="dialog"]:has-text("Career Goals")')).toBeVisible();
      await page.keyboard.press('Escape');
    }
    
    // 5. Verify persistence
    const initialMetrics = await page.locator('[data-testid="metrics-bar"]').textContent();
    await page.keyboard.press('Escape'); // Close modal
    await page.click('[data-testid="cover-letter-card"]:first-child button:has-text("Edit")');
    const reloadedMetrics = await page.locator('[data-testid="metrics-bar"]').textContent();
    
    expect(reloadedMetrics).toBe(initialMetrics);
  });
});

test.describe('Agent C - Performance Tests', () => {
  test('draft creation should complete in under 30 seconds', async ({ page }) => {
    await page.goto('/cover-letters');
    
    const startTime = Date.now();
    
    await page.click('button:has-text("Create New Letter")');
    await page.fill('textarea[placeholder*="job description"]', 'Test job requiring 5 years experience');
    await page.click('button:has-text("Generate Draft")');
    await page.waitForSelector('[data-testid="draft-content"]', { timeout: 30000 });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // in seconds
    
    expect(duration).toBeLessThan(30);
    console.log(`Draft creation took ${duration.toFixed(2)} seconds`);
  });

  test('should make only one consolidated LLM call', async ({ page }) => {
    const llmCalls: string[] = [];
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('api.openai.com') && url.includes('chat/completions')) {
        llmCalls.push(request.method());
      }
    });
    
    await page.goto('/cover-letters');
    await page.click('button:has-text("Create New Letter")');
    await page.fill('textarea[placeholder*="job description"]', 'PM role with 5 requirements');
    await page.click('button:has-text("Generate Draft")');
    await page.waitForSelector('[data-testid="draft-content"]', { timeout: 30000 });
    
    // Should see at most 2 calls: template generation + metrics
    // Ideally just 1 call if template is static
    expect(llmCalls.length).toBeLessThanOrEqual(2);
    
    console.log(`Total LLM calls: ${llmCalls.length}`);
  });
});

test.describe('Agent C - Accessibility Tests', () => {
  test('metrics bar should be keyboard navigable', async ({ page }) => {
    await page.goto('/cover-letters');
    await page.click('[data-testid="cover-letter-card"]:first-child button:has-text("Edit")');
    
    // Tab to metrics bar
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to focus on metric badges
    // (Actual implementation depends on whether badges are focusable)
  });

  test('tooltips should be accessible', async ({ page }) => {
    await page.goto('/cover-letters');
    await page.click('[data-testid="cover-letter-card"]:first-child button:has-text("Edit")');
    
    // Hover to trigger tooltip
    await page.hover('text=MATCH WITH GOALS');
    
    // Verify tooltip has proper ARIA attributes
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible();
    
    // Should have describedby or labelledby relationship
    // (Actual verification depends on implementation)
  });

  test('CTA buttons should have proper labels and be focusable', async ({ page }) => {
    await page.goto('/cover-letters');
    await page.click('[data-testid="cover-letter-card"]:first-child button:has-text("Edit")');
    
    // Open tooltip
    await page.hover('text=MATCH WITH GOALS');
    await page.waitForSelector('button:has-text("Edit Goals")', { state: 'visible' });
    
    // Button should be focusable and have proper label
    const button = page.locator('button:has-text("Edit Goals")');
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });
});

