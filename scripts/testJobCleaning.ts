#!/usr/bin/env ts-node
/**
 * Test script for job description cleaning service
 * Run: npx tsx scripts/testJobCleaning.ts
 */

import { clean } from '../src/lib/jobDescriptionCleaning.js';

const samplePosting = `Senior Product Manager
Google
Mountain View, CA
Posted 3 days ago
100+ applicants

Apply now
Save this job
Share

About Google:
We're a technology company focused on organizing the world's information.

Responsibilities:
- Define product vision and roadmap
- Lead cross-functional teams of engineers and designers
- Drive customer research and data analysis
- Present to executive leadership

Qualifications:
- 5+ years PM experience at a tech company
- Strong technical background (CS degree preferred)
- MBA preferred
- Experience with B2B SaaS products

Compensation:
$180k - $250k base + equity + benefits

People also viewed
Similar jobs at Google
View more jobs
Report this job`;

console.log('╔════════════════════════════════════════════════════════════════════════╗');
console.log('║         JOB DESCRIPTION CLEANING TEST - Google Jobs Platform           ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

console.log('📄 ORIGINAL TEXT');
console.log('═'.repeat(76));
console.log(samplePosting);
console.log('\n');

const result = clean(samplePosting, 'google_jobs');

console.log('🗑️  REMOVED LINES');
console.log('═'.repeat(76));
if (result.removed.length === 0) {
  console.log('(No noise detected)');
} else {
  result.removed.forEach((line, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. "${line}"`);
  });
}
console.log('\n');

console.log('✨ CLEANED TEXT');
console.log('═'.repeat(76));
console.log(result.cleaned);
console.log('\n');

console.log('📊 STATISTICS');
console.log('═'.repeat(76));
const originalLines = samplePosting.split('\n').filter(l => l.trim()).length;
const cleanedLines = result.cleaned.split('\n').filter(l => l.trim()).length;
console.log(`Original lines:       ${originalLines}`);
console.log(`Cleaned lines:        ${cleanedLines}`);
console.log(`Removed lines:        ${result.removed.length}`);
console.log(`Lines preserved:      ${cleanedLines} (${((cleanedLines / originalLines) * 100).toFixed(1)}%)`);
console.log(`Confidence score:     ${(result.confidence * 100).toFixed(1)}%`);
console.log('\n');

// Test multiple platforms
console.log('🌐 MULTI-PLATFORM COMPARISON');
console.log('═'.repeat(76));

const platforms = ['generic', 'linkedin', 'indeed', 'levels', 'glassdoor'];
platforms.forEach(platform => {
  const platformResult = clean(samplePosting, platform);
  console.log(`${platform.padEnd(15)} → ${platformResult.removed.length.toString().padStart(2)} lines removed, confidence: ${(platformResult.confidence * 100).toFixed(1)}%`);
});

console.log('\n✅ Test complete!\n');

