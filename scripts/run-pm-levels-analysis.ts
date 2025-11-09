/**
 * Run PM Levels analysis for a user
 */

import { PMLevelsService } from '../src/services/pmLevelsService';

const TEST_USER_ID = 'c7f68bb8-1070-4601-b8d8-767185f3e8a7';

async function main() {
  console.log('🚀 Starting PM Levels analysis...\n');
  console.log(`User ID: ${TEST_USER_ID}\n`);

  const pmLevelsService = new PMLevelsService();

  try {
    const startTime = Date.now();

    const result = await pmLevelsService.analyzeUserLevel(TEST_USER_ID);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!result) {
      console.log('⚠️  No result returned - user may have no content to analyze');
      return;
    }

    console.log('✅ Analysis complete!\n');
    console.log(`⏱️  Duration: ${duration}s\n`);
    console.log('📊 Results:');
    console.log(`   Inferred Level: ${result.inferredLevel} (${result.displayLevel})`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Scope Score: ${(result.scopeScore * 100).toFixed(1)}%`);
    console.log(`   Maturity Modifier: ${result.maturityModifier.toFixed(2)}x`);

    if (result.roleType && result.roleType.length > 0) {
      console.log(`   Role Types: ${result.roleType.join(', ')}`);
    }

    console.log('\n🎯 Competency Scores:');
    console.log(`   Execution: ${result.competencyScores.execution.toFixed(2)}/3`);
    console.log(`   Customer Insight: ${result.competencyScores.customer_insight.toFixed(2)}/3`);
    console.log(`   Strategy: ${result.competencyScores.strategy.toFixed(2)}/3`);
    console.log(`   Influence: ${result.competencyScores.influence.toFixed(2)}/3`);

    if (result.deltaSummary) {
      console.log(`\n💡 Delta Summary:\n   ${result.deltaSummary}`);
    }

    if (result.recommendations && result.recommendations.length > 0) {
      console.log(`\n📝 Recommendations (${result.recommendations.length}):`);
      result.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`   ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
      });
    }

    console.log('\n✨ Analysis saved to database!');
    console.log('   You can now view it at: http://localhost:8083/assessment\n');

  } catch (error) {
    console.error('\n❌ Error during analysis:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

main().catch(console.error);
