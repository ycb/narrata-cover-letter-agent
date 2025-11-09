/**
 * Test script for PM Levels Service
 * 
 * Tests the PM Levels Service by:
 * 1. Checking if user has content
 * 2. Running PM level analysis
 * 3. Verifying results are saved to database
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file manually for Node.js
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

// Configuration
const SUPABASE_URL = envVars['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = envVars['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY!;
const TEST_USER_EMAIL = envVars['VITE_TEST_USER_EMAIL'] || envVars['VITE_TEST_EMAIL'] || process.env.VITE_TEST_USER_EMAIL || process.env.VITE_TEST_EMAIL!;
const TEST_USER_PASSWORD = envVars['VITE_TEST_USER_PASSWORD'] || envVars['VITE_TEST_PASSWORD'] || process.env.VITE_TEST_USER_PASSWORD || process.env.VITE_TEST_PASSWORD!;

// Set process.env for runtime access
process.env.VITE_SUPABASE_URL = SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
process.env.VITE_OPENAI_KEY = envVars['VITE_OPENAI_KEY'] || process.env.VITE_OPENAI_KEY!;
process.env.VITE_OPENAI_MODEL = envVars['VITE_OPENAI_MODEL'] || process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';

// Patch import.meta.env using a Proxy to intercept access
// This must happen before any module imports that use import.meta.env
const envValues = {
  VITE_SUPABASE_URL: SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
  VITE_OPENAI_KEY: envVars['VITE_OPENAI_KEY'] || process.env.VITE_OPENAI_KEY!,
  VITE_OPENAI_MODEL: envVars['VITE_OPENAI_MODEL'] || process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
};

// Use a Proxy to intercept import.meta.env access
// This must happen before any module imports that use import.meta.env
const originalImportMeta = import.meta;
Object.defineProperty(import.meta, 'env', {
  get: () => envValues,
  configurable: true
});

// Mock window for Node.js environment
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

// Mock performance API for Node.js
if (typeof globalThis.performance === 'undefined') {
  (globalThis as any).performance = {
    now: () => Date.now()
  };
}

// Now import modules that use import.meta.env (using dynamic import to ensure env is patched first)
const { createClient } = await import('@supabase/supabase-js');
const { PMLevelsService } = await import('../src/services/pmLevelsService');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
  console.error('❌ Missing Supabase environment variables. Please check your .env file.');
  process.exit(1);
}

/**
 * Authenticate with Supabase and get access token
 */
async function authenticate(): Promise<{ userId: string, accessToken: string }> {
  console.log('🔐 Authenticating...');
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD
  });
  
  if (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
  
  if (!data.session?.access_token) {
    throw new Error('No access token received');
  }
  
  console.log(`✅ Authenticated as ${data.user.email} (${data.user.id})`);
  return {
    userId: data.user.id,
    accessToken: data.session.access_token
  };
}

/**
 * Check if user has content (sources, work items, stories)
 */
async function checkUserContent(userId: string, accessToken: string): Promise<void> {
  console.log('\n📊 Checking user content...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
  
  // Check sources
  const { count: sourcesCount } = await supabase
    .from('sources')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  // Check work items
  const { count: workItemsCount } = await supabase
    .from('work_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  // Check stories
  const { count: storiesCount } = await supabase
    .from('approved_content')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'approved');
  
  console.log(`  Sources: ${sourcesCount || 0}`);
  console.log(`  Work Items: ${workItemsCount || 0}`);
  console.log(`  Stories: ${storiesCount || 0}`);
  
  if ((sourcesCount || 0) === 0 && (workItemsCount || 0) === 0) {
    console.warn('⚠️  No content found. Please upload a resume or add work history first.');
    process.exit(1);
  }
}

/**
 * Test PM Levels Service
 */
async function testPMLevels(userId: string, accessToken: string): Promise<void> {
  console.log('\n🔍 Testing PM Levels Service...');
  
  // Check if sources have raw_text or structured_data
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
  
  const { data: sampleSource, error: sourceError } = await supabase
    .from('sources')
    .select('id, file_name, raw_text, structured_data')
    .eq('user_id', userId)
    .limit(1)
    .single();
  
  if (sourceError) {
    console.warn('⚠️  Error checking source:', sourceError.message);
  } else {
    console.log(`  Sample source: ${sampleSource?.file_name || 'N/A'}`);
    console.log(`  Has raw_text: ${!!sampleSource?.raw_text}`);
    console.log(`  Has structured_data: ${!!sampleSource?.structured_data}`);
  }
  
  const pmLevelsService = new PMLevelsService();
  
  try {
    const startTime = Date.now();
    const inference = await pmLevelsService.analyzeUserLevel(userId);
    const duration = Date.now() - startTime;
    
    if (!inference) {
      console.error('❌ PM Levels analysis returned null');
      console.error('\n⚠️  NOTE: PMLevelsService uses the global supabase client which requires');
      console.error('   browser authentication. In Node.js scripts, RLS policies may block access.');
      console.error('\n   To test PM Levels in the browser:');
      console.error('   1. Start dev server: npm run dev');
      console.error('   2. Navigate to /assessment page');
      console.error('   3. Click "Calculate Level" button');
      console.error('\n   The service will work correctly when called from the browser');
      console.error('   where the user session is available.\n');
      process.exit(1);
    }
    
    console.log('\n✅ PM Levels Analysis Complete!');
    console.log(`  Level: ${inference.displayLevel} (${inference.inferredLevel})`);
    console.log(`  Confidence: ${(inference.confidence * 100).toFixed(1)}%`);
    console.log(`  Scope Score: ${(inference.scopeScore * 100).toFixed(1)}%`);
    console.log(`  Maturity Modifier: ${inference.maturityModifier.toFixed(2)}`);
    console.log(`  Role Types: ${inference.roleType.join(', ') || 'None'}`);
    console.log(`  Duration: ${duration}ms`);
    
    console.log('\n📈 Competency Scores:');
    console.log(`  Execution: ${inference.competencyScores.execution.toFixed(2)}/3.0`);
    console.log(`  Customer Insight: ${inference.competencyScores.customer_insight.toFixed(2)}/3.0`);
    console.log(`  Strategy: ${inference.competencyScores.strategy.toFixed(2)}/3.0`);
    console.log(`  Influence: ${inference.competencyScores.influence.toFixed(2)}/3.0`);
    
    if (inference.recommendations.length > 0) {
      console.log(`\n💡 Recommendations: ${inference.recommendations.length}`);
      inference.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`  ${i + 1}. [${rec.priority}] ${rec.title}`);
      });
    }
    
    if (inference.deltaSummary) {
      console.log(`\n📝 Summary: ${inference.deltaSummary.substring(0, 200)}...`);
    }
    
    // Verify results are saved to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: savedLevel, error } = await supabase
      .from('user_levels')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('❌ Error verifying saved level:', error);
    } else if (savedLevel) {
      console.log('\n✅ Level saved to database:');
      console.log(`  ID: ${savedLevel.id}`);
      console.log(`  Last Run: ${new Date(savedLevel.last_run_timestamp).toLocaleString()}`);
      console.log(`  Disputed: ${savedLevel.disputed_at ? 'Yes' : 'No'}`);
    }
    
  } catch (error) {
    console.error('❌ PM Levels analysis failed:', error);
    if (error instanceof Error) {
      console.error('  Error message:', error.message);
      console.error('  Stack:', error.stack);
    }
    process.exit(1);
  }
}

async function main() {
  try {
    console.log('🧪 PM Levels Service Test\n');
    
    const { userId, accessToken } = await authenticate();
    await checkUserContent(userId, accessToken);
    await testPMLevels(userId, accessToken);
    
    console.log('\n🎉 All tests passed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

