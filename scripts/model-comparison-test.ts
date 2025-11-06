/**
 * Model Comparison Test Script
 * 
 * Tests P01-P10 synthetic profiles across different OpenAI models
 * Measures: latency, data quality, cost
 * Outputs: Detailed comparison report
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
const MODELS_TO_TEST = [
  'gpt-3.5-turbo',
  'gpt-4o-mini',
  'gpt-4o'
] as const;

const PROFILES = [
  'P01', 'P02', 'P03', 'P04', 'P05',
  'P06', 'P07', 'P08', 'P09', 'P10'
] as const;

const OPENAI_API_KEY = envVars['VITE_OPENAI_KEY'] || process.env.OPENAI_API_KEY;
const FIXTURES_PATH = path.join(__dirname, '../fixtures/synthetic/v1/raw_uploads');
const RESULTS_PATH = path.join(__dirname, '../test-results');

interface TestResult {
  profile: string;
  model: string;
  latency: {
    resume: number;
    coverLetter: number;
    combined: number;
    total: number;
  };
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  extractedData: {
    companies: number;
    roles: number;
    stories: number;
    metrics: number;
    tags: number;
  };
  qualityScores?: {
    accuracy: number;
    completeness: number;
    structure: number;
    overall: number;
  };
  cost: number;
  errors: string[];
  rawOutput?: any;
}

interface ModelPricing {
  input: number;  // per 1M tokens
  output: number; // per 1M tokens
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 5.00, output: 15.00 }
};

/**
 * Load resume and cover letter for a profile
 */
function loadProfileFiles(profileId: string): { resume: string; coverLetter: string } {
  const resumePath = path.join(FIXTURES_PATH, `${profileId}_resume.txt`);
  const coverLetterPath = path.join(FIXTURES_PATH, `${profileId}_cover_letter.txt`);
  
  return {
    resume: fs.readFileSync(resumePath, 'utf-8'),
    coverLetter: fs.readFileSync(coverLetterPath, 'utf-8')
  };
}

/**
 * Build the comprehensive analysis prompt (from resumeAnalysis.ts)
 */
function buildCombinedAnalysisPrompt(resumeText: string, coverLetterText: string): string {
  return `You are an expert career analyst. Analyze the following resume and cover letter to extract comprehensive structured data.

RESUME:
${resumeText}

COVER LETTER:
${coverLetterText}

Extract the following information and return ONLY valid JSON (no markdown, no prose):

{
  "contactInfo": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "123-456-7890",
    "location": "City, State",
    "linkedin": "linkedin.com/in/username",
    "portfolio": "portfolio.com"
  },
  "workHistory": [
    {
      "company": "Company Name",
      "companyTags": ["Industry", "Company Stage", "Technology"],
      "position": "Job Title",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or null if current",
      "roleSummary": "1-2 sentence overview of the role and its impact",
      "roleMetrics": ["Key metric 1 with numbers", "Key metric 2 with numbers"],
      "roleTags": ["Skill/Tech 1", "Skill/Tech 2", "Domain 1"],
      "stories": [
        {
          "title": "Brief story title",
          "content": "Context: [situation]. Action: [what you did]. Result: [impact with metrics].",
          "tags": ["Theme 1", "Theme 2", "Skill"],
          "metrics": ["Specific quantified achievement"]
        }
      ]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Degree Type",
      "field": "Field of Study",
      "graduationDate": "YYYY-MM",
      "gpa": "X.X (optional)",
      "honors": ["Honor 1", "Honor 2"]
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "certifications": ["Certification 1", "Certification 2"],
  "summary": "2-3 sentence professional summary"
}

IMPORTANT GUIDELINES:
1. Extract 3-5 STORIES per role from bullets, resume narratives, and cover letter examples
2. Each story should follow CAR format (Context, Action, Result)
3. Metrics should be quantified (numbers, percentages, growth)
4. Tags should be thematic (not just skill names)
5. Company tags: industry, stage, key technologies
6. Role tags: skills, technologies, domains
7. Story tags: themes, competencies, outcomes

Return ONLY valid JSON. No prose, no markdown.`;
}

/**
 * Call OpenAI API with a specific model
 */
async function callOpenAI(
  prompt: string,
  model: string,
  maxTokens: number = 3000
): Promise<{
  content: string;
  inputTokens: number;
  outputTokens: number;
  latency: number;
}> {
  const startTime = Date.now();
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at parsing resume data and extracting structured information. You must return ONLY valid JSON with no additional text, no markdown formatting, no code blocks, and no explanations. The response must be parseable by JSON.parse().'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.1,
    }),
  });

  const latency = Date.now() - startTime;
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
  }

  return {
    content: data.choices[0].message.content,
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
    latency
  };
}

/**
 * Parse extracted data and count elements
 */
function analyzeExtractedData(data: any): {
  companies: number;
  roles: number;
  stories: number;
  metrics: number;
  tags: number;
} {
  const workHistory = data.workHistory || [];
  
  let totalStories = 0;
  let totalMetrics = 0;
  let totalTags = 0;

  for (const role of workHistory) {
    // Count stories
    totalStories += (role.stories || []).length;
    
    // Count role-level metrics
    totalMetrics += (role.roleMetrics || []).length;
    
    // Count role-level tags
    totalTags += (role.roleTags || []).length;
    totalTags += (role.companyTags || []).length;
    
    // Count story-level metrics and tags
    for (const story of (role.stories || [])) {
      totalMetrics += (story.metrics || []).length;
      totalTags += (story.tags || []).length;
    }
  }

  return {
    companies: workHistory.length,
    roles: workHistory.length,
    stories: totalStories,
    metrics: totalMetrics,
    tags: totalTags
  };
}

/**
 * Use LLM as judge to evaluate quality
 */
async function evaluateQuality(
  originalResume: string,
  originalCoverLetter: string,
  extractedData: any
): Promise<{
  accuracy: number;
  completeness: number;
  structure: number;
  overall: number;
  reasoning: string;
}> {
  const evaluationPrompt = `You are an expert evaluator assessing the quality of data extraction from a resume and cover letter.

ORIGINAL RESUME:
${originalResume}

ORIGINAL COVER LETTER:
${originalCoverLetter}

EXTRACTED DATA:
${JSON.stringify(extractedData, null, 2)}

Evaluate the extraction on these criteria (score 0-10):

1. ACCURACY: Are companies, roles, dates, and facts correct?
2. COMPLETENESS: Are all key experiences, stories, and metrics captured?
3. STRUCTURE: Is data well-organized with proper CAR stories, metrics, and tags?

Return ONLY valid JSON:
{
  "accuracy": 8.5,
  "completeness": 7.0,
  "structure": 9.0,
  "overall": 8.2,
  "reasoning": "Brief explanation of scores"
}`;

  const response = await callOpenAI(evaluationPrompt, 'gpt-4o', 1000);
  const evaluation = JSON.parse(response.content);
  
  return evaluation;
}

/**
 * Calculate cost for a test run
 */
function calculateCost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  
  return inputCost + outputCost;
}

/**
 * Run test for a single profile and model
 */
async function runTest(profileId: string, model: string): Promise<TestResult> {
  console.log(`\n🧪 Testing ${profileId} with ${model}...`);
  
  const result: TestResult = {
    profile: profileId,
    model,
    latency: { resume: 0, coverLetter: 0, combined: 0, total: 0 },
    tokenUsage: { input: 0, output: 0, total: 0 },
    extractedData: { companies: 0, roles: 0, stories: 0, metrics: 0, tags: 0 },
    cost: 0,
    errors: []
  };

  try {
    // Load files
    const { resume, coverLetter } = loadProfileFiles(profileId);
    
    // Run combined analysis
    const testStart = Date.now();
    const prompt = buildCombinedAnalysisPrompt(resume, coverLetter);
    const response = await callOpenAI(prompt, model);
    const testEnd = Date.now();
    
    // Parse response
    let extractedData;
    try {
      extractedData = JSON.parse(response.content);
      result.rawOutput = extractedData;
    } catch (parseError: any) {
      result.errors.push(`JSON parse error: ${parseError.message}`);
      return result;
    }
    
    // Record metrics
    result.latency.combined = response.latency;
    result.latency.total = testEnd - testStart;
    result.tokenUsage.input = response.inputTokens;
    result.tokenUsage.output = response.outputTokens;
    result.tokenUsage.total = response.inputTokens + response.outputTokens;
    result.extractedData = analyzeExtractedData(extractedData);
    result.cost = calculateCost(response.inputTokens, response.outputTokens, model);
    
    // Evaluate quality (using gpt-4o as judge)
    console.log(`  📊 Evaluating quality...`);
    try {
      result.qualityScores = await evaluateQuality(resume, coverLetter, extractedData);
    } catch (evalError: any) {
      console.warn(`  ⚠️  Quality evaluation failed: ${evalError.message}`);
      result.errors.push(`Quality eval error: ${evalError.message}`);
    }
    
    console.log(`  ✅ ${profileId} with ${model}: ${result.latency.total}ms, ${result.extractedData.stories} stories, ${result.extractedData.metrics} metrics`);
    
  } catch (error: any) {
    result.errors.push(`Test failed: ${error.message}`);
    console.error(`  ❌ ${profileId} with ${model} failed:`, error.message);
  }

  return result;
}

/**
 * Generate comparison report
 */
function generateReport(results: TestResult[]): string {
  // Group by model
  const byModel: Record<string, TestResult[]> = {};
  for (const result of results) {
    if (!byModel[result.model]) byModel[result.model] = [];
    byModel[result.model].push(result);
  }

  let report = `# Model Comparison Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Profiles Tested:** ${PROFILES.length}\n`;
  report += `**Models Tested:** ${MODELS_TO_TEST.join(', ')}\n\n`;

  report += `---\n\n`;

  // Summary table
  report += `## Executive Summary\n\n`;
  report += `| Model | Avg Latency | Avg Stories | Avg Metrics | Avg Tags | Avg Quality | Avg Cost | Errors |\n`;
  report += `|-------|-------------|-------------|-------------|----------|-------------|----------|--------|\n`;

  for (const model of MODELS_TO_TEST) {
    const modelResults = byModel[model] || [];
    const validResults = modelResults.filter(r => r.errors.length === 0);
    
    if (validResults.length === 0) {
      report += `| ${model} | N/A | N/A | N/A | N/A | N/A | N/A | ${modelResults.length} |\n`;
      continue;
    }

    const avgLatency = Math.round(validResults.reduce((sum, r) => sum + r.latency.total, 0) / validResults.length);
    const avgStories = (validResults.reduce((sum, r) => sum + r.extractedData.stories, 0) / validResults.length).toFixed(1);
    const avgMetrics = (validResults.reduce((sum, r) => sum + r.extractedData.metrics, 0) / validResults.length).toFixed(1);
    const avgTags = (validResults.reduce((sum, r) => sum + r.extractedData.tags, 0) / validResults.length).toFixed(1);
    const avgQuality = validResults[0].qualityScores 
      ? (validResults.reduce((sum, r) => sum + (r.qualityScores?.overall || 0), 0) / validResults.length).toFixed(1)
      : 'N/A';
    const avgCost = (validResults.reduce((sum, r) => sum + r.cost, 0) / validResults.length).toFixed(4);
    const errorCount = modelResults.filter(r => r.errors.length > 0).length;

    report += `| ${model} | ${avgLatency}ms | ${avgStories} | ${avgMetrics} | ${avgTags} | ${avgQuality}/10 | $${avgCost} | ${errorCount} |\n`;
  }

  report += `\n---\n\n`;

  // Detailed results per model
  for (const model of MODELS_TO_TEST) {
    report += `## ${model}\n\n`;
    
    const modelResults = byModel[model] || [];
    
    if (modelResults.length === 0) {
      report += `No results for this model.\n\n`;
      continue;
    }

    report += `| Profile | Latency | Stories | Metrics | Tags | Quality | Cost | Status |\n`;
    report += `|---------|---------|---------|---------|------|---------|------|--------|\n`;

    for (const result of modelResults) {
      const status = result.errors.length > 0 ? '❌ Error' : '✅ Success';
      const quality = result.qualityScores?.overall.toFixed(1) || 'N/A';
      
      report += `| ${result.profile} | ${result.latency.total}ms | ${result.extractedData.stories} | ${result.extractedData.metrics} | ${result.extractedData.tags} | ${quality}/10 | $${result.cost.toFixed(4)} | ${status} |\n`;
    }

    report += `\n`;
  }

  report += `---\n\n`;

  // Recommendations
  report += `## Recommendations\n\n`;
  
  // Find best model for each criterion
  const allValidResults = results.filter(r => r.errors.length === 0);
  
  if (allValidResults.length > 0) {
    // Fastest
    const fastestByModel = MODELS_TO_TEST.map(model => {
      const modelResults = byModel[model]?.filter(r => r.errors.length === 0) || [];
      const avgLatency = modelResults.length > 0
        ? modelResults.reduce((sum, r) => sum + r.latency.total, 0) / modelResults.length
        : Infinity;
      return { model, avgLatency };
    }).sort((a, b) => a.avgLatency - b.avgLatency);

    report += `### ⚡ Fastest Model: **${fastestByModel[0].model}** (${Math.round(fastestByModel[0].avgLatency)}ms avg)\n\n`;

    // Most complete
    const completeByModel = MODELS_TO_TEST.map(model => {
      const modelResults = byModel[model]?.filter(r => r.errors.length === 0) || [];
      const avgStories = modelResults.length > 0
        ? modelResults.reduce((sum, r) => sum + r.extractedData.stories, 0) / modelResults.length
        : 0;
      return { model, avgStories };
    }).sort((a, b) => b.avgStories - a.avgStories);

    report += `### 📚 Most Complete Data: **${completeByModel[0].model}** (${completeByModel[0].avgStories.toFixed(1)} stories avg)\n\n`;

    // Best quality
    const qualityByModel = MODELS_TO_TEST.map(model => {
      const modelResults = byModel[model]?.filter(r => r.errors.length === 0 && r.qualityScores) || [];
      const avgQuality = modelResults.length > 0
        ? modelResults.reduce((sum, r) => sum + (r.qualityScores?.overall || 0), 0) / modelResults.length
        : 0;
      return { model, avgQuality };
    }).sort((a, b) => b.avgQuality - a.avgQuality);

    if (qualityByModel[0].avgQuality > 0) {
      report += `### 🏆 Highest Quality: **${qualityByModel[0].model}** (${qualityByModel[0].avgQuality.toFixed(1)}/10 avg)\n\n`;
    }

    // Best value
    const valueByModel = MODELS_TO_TEST.map(model => {
      const modelResults = byModel[model]?.filter(r => r.errors.length === 0 && r.qualityScores) || [];
      const avgQuality = modelResults.length > 0
        ? modelResults.reduce((sum, r) => sum + (r.qualityScores?.overall || 0), 0) / modelResults.length
        : 0;
      const avgCost = modelResults.length > 0
        ? modelResults.reduce((sum, r) => sum + r.cost, 0) / modelResults.length
        : Infinity;
      const valueScore = avgCost > 0 ? avgQuality / avgCost : 0;
      return { model, valueScore, avgQuality, avgCost };
    }).sort((a, b) => b.valueScore - a.valueScore);

    if (valueByModel[0].valueScore > 0) {
      report += `### 💰 Best Value: **${valueByModel[0].model}** (${valueByModel[0].avgQuality.toFixed(1)}/10 quality at $${valueByModel[0].avgCost.toFixed(4)})\n\n`;
    }
  }

  report += `---\n\n`;
  report += `**End of Report**\n`;

  return report;
}

/**
 * Main test runner
 */
async function main() {
  console.log('🚀 Starting Model Comparison Tests...\n');
  console.log(`Models: ${MODELS_TO_TEST.join(', ')}`);
  console.log(`Profiles: ${PROFILES.join(', ')}`);
  console.log(`\nThis will take approximately ${MODELS_TO_TEST.length * PROFILES.length * 20}s\n`);

  // Ensure results directory exists
  if (!fs.existsSync(RESULTS_PATH)) {
    fs.mkdirSync(RESULTS_PATH, { recursive: true });
  }

  const allResults: TestResult[] = [];

  // Run tests
  for (const model of MODELS_TO_TEST) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Testing model: ${model}`);
    console.log(`${'='.repeat(60)}`);
    
    for (const profile of PROFILES) {
      const result = await runTest(profile, model);
      allResults.push(result);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Generate report
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📝 Generating Report...');
  console.log(`${'='.repeat(60)}\n`);
  
  const report = generateReport(allResults);
  const reportPath = path.join(RESULTS_PATH, `model-comparison-${Date.now()}.md`);
  fs.writeFileSync(reportPath, report);
  
  // Save raw results
  const rawResultsPath = path.join(RESULTS_PATH, `model-comparison-${Date.now()}.json`);
  fs.writeFileSync(rawResultsPath, JSON.stringify(allResults, null, 2));

  console.log(`\n✅ Tests complete!`);
  console.log(`📄 Report: ${reportPath}`);
  console.log(`📊 Raw Data: ${rawResultsPath}`);
  
  // Print summary to console
  console.log(`\n${report}`);
}

// Run the main function
main().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

export { runTest, generateReport };

