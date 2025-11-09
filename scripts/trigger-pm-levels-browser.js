/**
 * Browser Console Script: Trigger PM Levels Re-analysis
 *
 * HOW TO USE:
 * 1. Open http://localhost:8084/assessment in your browser
 * 2. Make sure you're logged in as P01 profile (narrata.ai@gmail.com)
 * 3. Open browser console (F12 or Cmd+Option+I)
 * 4. Copy and paste this entire script into the console
 * 5. Press Enter to execute
 *
 * WHAT THIS DOES:
 * - Triggers a fresh PM Levels analysis
 * - Collects evidence for all modal types
 * - Saves complete data to database
 * - Updates UI with real data
 *
 * EXPECTED BEHAVIOR:
 * - Console will show "[PM Levels] Starting recalculation..."
 * - Analysis takes 30-60 seconds
 * - When complete, console shows "[PM Levels] Analysis complete!"
 * - Page should automatically update with new data
 */

(async function triggerPMLevelsRecalculation() {
  console.log('[PM Levels] Starting recalculation from browser console...');

  try {
    // Import the PM Levels Service
    const { PMLevelsService } = await import('/src/services/pmLevelsService.ts');

    // Get current user from localStorage auth token
    const authKey = 'cover-letter-agent-auth';
    const authData = localStorage.getItem(authKey);

    if (!authData) {
      console.error('[PM Levels] ERROR: No authentication data found. Please log in first.');
      return;
    }

    const session = JSON.parse(authData);
    const userId = session?.user?.id;

    if (!userId) {
      console.error('[PM Levels] ERROR: Could not extract user ID from session.');
      return;
    }

    console.log(`[PM Levels] User ID: ${userId}`);
    console.log('[PM Levels] Starting analysis... (this may take 30-60 seconds)');

    // Create service instance and run analysis
    const pmLevelsService = new PMLevelsService();
    const result = await pmLevelsService.analyzeUserLevel(userId);

    if (!result) {
      console.error('[PM Levels] ERROR: Analysis returned null. Check console for errors.');
      return;
    }

    console.log('[PM Levels] ✅ Analysis complete!');
    console.log('[PM Levels] Level:', result.displayLevel);
    console.log('[PM Levels] Confidence:', (result.confidence * 100).toFixed(1) + '%');
    console.log('[PM Levels] Role Types:', result.roleType.join(', '));

    // Check evidence collection
    console.log('\n[PM Levels] Evidence Collection Status:');
    console.log('  - Competency Evidence:', result.evidenceByCompetency ? '✅ Collected' : '❌ Missing');
    console.log('  - Level Evidence:', result.levelEvidence ? '✅ Collected' : '❌ Missing');
    console.log('  - Role Archetype Evidence:', result.roleArchetypeEvidence ? '✅ Collected' : '❌ Missing');

    if (result.levelEvidence) {
      console.log('\n[PM Levels] Level Evidence Summary:');
      console.log('  - Total Stories:', result.levelEvidence.storyEvidence.totalStories);
      console.log('  - Relevant Stories:', result.levelEvidence.storyEvidence.relevantStories);
      console.log('  - Years of Experience:', result.levelEvidence.resumeEvidence.duration);
      console.log('  - Role Titles:', result.levelEvidence.resumeEvidence.roleTitles.join(', '));
    }

    console.log('\n[PM Levels] ✅ Data has been saved to the database.');
    console.log('[PM Levels] Refreshing the page will show updated modals with real data.');
    console.log('\n[PM Levels] 🔄 Reloading page in 3 seconds...');

    setTimeout(() => {
      window.location.reload();
    }, 3000);

  } catch (error) {
    console.error('[PM Levels] ERROR during analysis:', error);
    console.error('[PM Levels] Error message:', error.message);
    if (error.stack) {
      console.error('[PM Levels] Stack trace:', error.stack);
    }
  }
})();
