/**
 * Test script for Auto-Suggest Tags feature
 * Tests the tag suggestion services without UI
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file manually for Node.js
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !match[1].startsWith('#')) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Also check parent directory for .env
const parentEnvPath = path.join(__dirname, '../../.env');
if (fs.existsSync(parentEnvPath)) {
  const envContent = fs.readFileSync(parentEnvPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !match[1].startsWith('#')) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Set up environment variables for runtime
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const OPENAI_KEY = process.env.VITE_OPENAI_KEY || '';

console.log('📋 Environment check:');
console.log(`   - SUPABASE_URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`   - SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   - OPENAI_KEY: ${OPENAI_KEY ? '✅ Set' : '❌ Missing'}`);
console.log('');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please ensure .env file exists with:');
  console.error('  - VITE_SUPABASE_URL');
  console.error('  - VITE_SUPABASE_ANON_KEY');
  console.error('  - VITE_OPENAI_KEY (optional, but needed for tag suggestions)');
  process.exit(1);
}

if (!OPENAI_KEY) {
  console.warn('⚠️  WARNING: VITE_OPENAI_KEY not found!');
  console.warn('   Tag suggestion tests will fail without OpenAI API key.');
  console.warn('   Browser search tests will also fail.\n');
}

// Set process.env for runtime access
process.env.VITE_SUPABASE_URL = SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
if (OPENAI_KEY) {
  process.env.VITE_OPENAI_KEY = OPENAI_KEY;
}

// Patch import.meta.env using a Proxy to intercept access
// This must happen before any module imports that use import.meta.env
const envValues = {
  VITE_SUPABASE_URL: SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
  VITE_OPENAI_KEY: OPENAI_KEY,
};

// Use a Proxy to intercept import.meta.env access
// This must happen before any module imports that use import.meta.env
const envProxy = new Proxy(envValues, {
  get(target, prop) {
    if (typeof prop === 'string' && prop in target) {
      return target[prop as keyof typeof target];
    }
    return undefined;
  },
  has(target, prop) {
    return typeof prop === 'string' && prop in target;
  },
  ownKeys(target) {
    return Object.keys(target);
  },
  getOwnPropertyDescriptor(target, prop) {
    if (typeof prop === 'string' && prop in target) {
      return {
        enumerable: true,
        configurable: true,
        value: target[prop as keyof typeof target],
      };
    }
    return undefined;
  },
});

// Override import.meta.env
Object.defineProperty(import.meta, 'env', {
  get: () => envProxy,
  configurable: true,
  enumerable: true,
});

// Debug: Verify the proxy works
console.log('🔍 Verifying import.meta.env proxy:');
console.log(`   - VITE_OPENAI_KEY: ${import.meta.env?.VITE_OPENAI_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   - VITE_SUPABASE_URL: ${import.meta.env?.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log('');

// Mock window for Node.js environment
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

// Now we can safely import services
// Note: These imports will fail if Supabase env vars are missing
// That's expected - the test will show a helpful error message
let TagSuggestionService: any;
let BrowserSearchService: any;
let TagService: any;
let GapDetectionService: any;

try {
  const tagSuggestionModule = await import('../src/services/tagSuggestionService');
  TagSuggestionService = tagSuggestionModule.TagSuggestionService;
  
  const browserSearchModule = await import('../src/services/browserSearchService');
  BrowserSearchService = browserSearchModule.BrowserSearchService;
  
  const tagServiceModule = await import('../src/services/tagService');
  TagService = tagServiceModule.TagService;
  
  const gapDetectionModule = await import('../src/services/gapDetectionService');
  GapDetectionService = gapDetectionModule.GapDetectionService;
} catch (error: any) {
  if (error.message?.includes('Missing Supabase')) {
    console.error('❌ Cannot run tests: Missing Supabase environment variables');
    console.error('\nPlease ensure .env file exists with:');
    console.error('  - VITE_SUPABASE_URL');
    console.error('  - VITE_SUPABASE_ANON_KEY');
    console.error('  - VITE_OPENAI_KEY (required for tag suggestions)');
    console.error('\nYou can copy .env from the parent directory or create one.');
    process.exit(1);
  }
  throw error;
}

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

    // Test 4: Validation - empty content
    console.log('Test 4: Validation - empty content');
    try {
      await TagSuggestionService.suggestTags({
        content: '',
        contentType: 'role'
      });
      console.error('❌ Test 4 Failed: Should have thrown error for empty content');
    } catch (error: any) {
      if (error.message?.includes('Content is required')) {
        console.log('✅ Correctly rejected empty content');
      } else {
        console.error('❌ Test 4 Failed: Wrong error message:', error.message);
        throw error;
      }
    }
    console.log('');

    // Test 5: Validation - company tags without companyName
    console.log('Test 5: Validation - company tags without companyName');
    try {
      await TagSuggestionService.suggestTags({
        content: 'Some company description',
        contentType: 'company'
        // Missing companyName
      });
      console.error('❌ Test 5 Failed: Should have thrown error for missing companyName');
    } catch (error: any) {
      if (error.message?.includes('companyName is required')) {
        console.log('✅ Correctly rejected company tags without companyName');
      } else {
        console.error('❌ Test 5 Failed: Wrong error message:', error.message);
        throw error;
      }
    }
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

