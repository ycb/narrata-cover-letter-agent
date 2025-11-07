/**
 * Test script for Auto-Suggest Tags feature
 * Tests the tag suggestion services without UI
 */

import { TagSuggestionService } from '../src/services/tagSuggestionService';
import { BrowserSearchService } from '../src/services/browserSearchService';
import { TagService } from '../src/services/tagService';
import { GapDetectionService } from '../src/services/gapDetectionService';

async function testTagSuggestionService() {
  console.log('🧪 Testing Tag Suggestion Service...\n');

  try {
    // Test 1: Role tag suggestions
    console.log('Test 1: Role tag suggestions');
    const roleSuggestions = await TagSuggestionService.suggestTags({
      content: 'Senior Product Manager at Acme Corp: Led product strategy for B2B SaaS platform, increased revenue by 40%',
      contentType: 'role',
      userGoals: {
        industries: ['SaaS', 'Fintech'],
        businessModels: ['B2B']
      }
    });
    console.log(`✅ Generated ${roleSuggestions.length} role tag suggestions:`);
    roleSuggestions.forEach(tag => {
      console.log(`   - ${tag.value} (${tag.confidence} confidence, ${tag.category || 'other'})`);
    });
    console.log('');

    // Test 2: Company tag suggestions (with browser search)
    console.log('Test 2: Company tag suggestions with browser search');
    const companySuggestions = await TagSuggestionService.suggestTags({
      content: 'Stripe: Payment processing platform',
      contentType: 'company',
      companyName: 'Stripe',
      userGoals: {
        industries: ['Fintech'],
        businessModels: ['B2B', 'Platform']
      }
    });
    console.log(`✅ Generated ${companySuggestions.length} company tag suggestions:`);
    companySuggestions.forEach(tag => {
      console.log(`   - ${tag.value} (${tag.confidence} confidence, ${tag.category || 'other'})`);
    });
    console.log('');

    // Test 3: Saved section tag suggestions
    console.log('Test 3: Saved section tag suggestions');
    const sectionSuggestions = await TagSuggestionService.suggestTags({
      content: 'I am writing to express my strong interest in the Product Manager position at your company.',
      contentType: 'saved_section',
      userGoals: {
        industries: ['SaaS'],
        businessModels: ['B2B']
      }
    });
    console.log(`✅ Generated ${sectionSuggestions.length} saved section tag suggestions:`);
    sectionSuggestions.forEach(tag => {
      console.log(`   - ${tag.value} (${tag.confidence} confidence, ${tag.category || 'other'})`);
    });
    console.log('');

    console.log('✅ All tag suggestion tests passed!\n');
  } catch (error) {
    console.error('❌ Tag suggestion test failed:', error);
    throw error;
  }
}

async function testBrowserSearchService() {
  console.log('🧪 Testing Browser Search Service...\n');

  try {
    // Test company research
    console.log('Test: Company research for "Stripe"');
    const research = await BrowserSearchService.researchCompany('Stripe', false);
    console.log('✅ Company research completed:');
    console.log(`   - Industry: ${research.industry || 'N/A'}`);
    console.log(`   - Business Model: ${research.businessModel || 'N/A'}`);
    console.log(`   - Company Stage: ${research.companyStage || 'N/A'}`);
    console.log(`   - Description: ${research.description?.substring(0, 100) || 'N/A'}...`);
    console.log('');

    console.log('✅ Browser search test passed!\n');
  } catch (error) {
    console.error('❌ Browser search test failed:', error);
    throw error;
  }
}

async function testTagMisalignmentGaps() {
  console.log('🧪 Testing Tag Misalignment Gap Detection...\n');

  try {
    // Test gap detection for misaligned tags
    const gaps = GapDetectionService.detectTagMisalignmentGaps(
      'test-user-id',
      'test-entity-id',
      'work_item',
      ['Healthcare', 'B2C'], // Tags that don't match user goals
      {
        industries: ['Fintech', 'SaaS'],
        businessModels: ['B2B']
      }
    );

    console.log(`✅ Detected ${gaps.length} tag misalignment gap(s):`);
    gaps.forEach(gap => {
      console.log(`   - ${gap.gap_category}: ${gap.description}`);
      console.log(`     Severity: ${gap.severity}`);
    });
    console.log('');

    // Test gap detection for missing tags
    const missingTagGaps = GapDetectionService.detectTagMisalignmentGaps(
      'test-user-id',
      'test-entity-id-2',
      'work_item',
      [], // No tags
      {
        industries: ['Fintech'],
        businessModels: ['B2B']
      }
    );

    console.log(`✅ Detected ${missingTagGaps.length} missing tag gap(s):`);
    missingTagGaps.forEach(gap => {
      console.log(`   - ${gap.gap_category}: ${gap.description}`);
    });
    console.log('');

    console.log('✅ Tag misalignment gap detection tests passed!\n');
  } catch (error) {
    console.error('❌ Tag misalignment gap detection test failed:', error);
    throw error;
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 Auto-Suggest Tags Feature - Test Suite');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    await testTagSuggestionService();
    await testBrowserSearchService();
    await testTagMisalignmentGaps();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ All tests passed!');
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ Test suite failed:', error);
    console.error('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests, testTagSuggestionService, testBrowserSearchService, testTagMisalignmentGaps };

