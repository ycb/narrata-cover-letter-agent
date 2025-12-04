/**
 * Evals V1.1: Validator Unit Tests
 * 
 * Tests for structural validators and quality score calculation.
 * Run with: deno test --allow-env
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  validateCoverLetterResult,
  validatePMLevelsResult,
  calculateQualityScore,
} from '../validators.ts';
import type { StructuralEvalResult } from '../types.ts';

// ============================================================================
// COVER LETTER VALIDATOR TESTS
// ============================================================================

Deno.test('validateCoverLetterResult - complete valid result passes all checks', () => {
  const validResult = {
    // jdAnalysis stage
    roleInsights: {
      inferredRoleLevel: 'IC5',
    },
    jdRequirementSummary: {
      coreTotal: 5,
    },
    
    // requirementAnalysis stage
    requirements: {
      coreRequirements: [
        { id: '1', description: 'Requirement 1' },
        { id: '2', description: 'Requirement 2' },
      ],
      totalRequirements: 8,
    },
    
    // goalsAndStrengths stage
    mws: {
      summaryScore: 2,
      goalAlignment: 'high',
    },
    companyContext: {
      industry: 'Technology',
    },
    
    // sectionGaps stage
    gapCount: 3,
  };

  const result = validateCoverLetterResult(validResult);

  assertEquals(result.passed, true, 'Overall result should pass');
  assertEquals(result.checks.length, 8, 'Should have 8 checks');
  
  // All checks should pass
  const failedChecks = result.checks.filter(c => !c.passed);
  assertEquals(failedChecks.length, 0, `All checks should pass. Failed: ${failedChecks.map(c => c.name).join(', ')}`);
});

Deno.test('validateCoverLetterResult - missing critical fields fails overall', () => {
  const invalidResult = {
    // Missing roleInsights
    jdRequirementSummary: {
      coreTotal: 5,
    },
    requirements: {
      coreRequirements: [{ id: '1', description: 'Req 1' }],
      totalRequirements: 5,
    },
    mws: {
      summaryScore: 2,
    },
    gapCount: 1,
  };

  const result = validateCoverLetterResult(invalidResult);

  assertEquals(result.passed, false, 'Overall result should fail due to missing critical field');
  
  const roleInsightsCheck = result.checks.find(c => c.name === 'Role Insights Present');
  assertExists(roleInsightsCheck, 'Role Insights check should exist');
  assertEquals(roleInsightsCheck.passed, false, 'Role Insights check should fail');
  assertEquals(roleInsightsCheck.severity, 'critical', 'Should be critical severity');
});

Deno.test('validateCoverLetterResult - invalid MWS score fails', () => {
  const invalidResult = {
    roleInsights: { inferredRoleLevel: 'IC5' },
    jdRequirementSummary: { coreTotal: 3 },
    requirements: {
      coreRequirements: [{ id: '1', description: 'Req 1' }],
      totalRequirements: 3,
    },
    mws: {
      summaryScore: 5, // Invalid! Should be 0-3
    },
    companyContext: { industry: 'Tech' },
    gapCount: 0,
  };

  const result = validateCoverLetterResult(invalidResult);

  assertEquals(result.passed, false, 'Overall result should fail due to invalid MWS score');
  
  const mwsCheck = result.checks.find(c => c.name === 'MWS Score Valid');
  assertExists(mwsCheck);
  assertEquals(mwsCheck.passed, false);
  assertEquals(mwsCheck.severity, 'critical');
});

Deno.test('validateCoverLetterResult - zero core requirements fails', () => {
  const invalidResult = {
    roleInsights: { inferredRoleLevel: 'IC5' },
    jdRequirementSummary: { coreTotal: 0 }, // Invalid
    requirements: {
      coreRequirements: [],
      totalRequirements: 0,
    },
    mws: { summaryScore: 2 },
    gapCount: 0,
  };

  const result = validateCoverLetterResult(invalidResult);

  assertEquals(result.passed, false, 'Overall result should fail');
  
  const coreReqsCheck = result.checks.find(c => c.name === 'Core Requirements Extracted');
  assertExists(coreReqsCheck);
  assertEquals(coreReqsCheck.passed, false);
});

Deno.test('validateCoverLetterResult - missing non-critical fields still passes overall', () => {
  const partialResult = {
    // All critical fields present
    roleInsights: { inferredRoleLevel: 'IC5' },
    jdRequirementSummary: { coreTotal: 3 },
    requirements: {
      coreRequirements: [{ id: '1', description: 'Req 1' }],
      totalRequirements: 3,
    },
    mws: { summaryScore: 2 },
    // Missing companyContext (high severity)
    // Missing gapCount (high severity)
    // Missing goalAlignment (medium severity)
  };

  const result = validateCoverLetterResult(partialResult);

  assertEquals(result.passed, true, 'Overall result should pass (all critical checks pass)');
  
  // Some high/medium checks should fail
  const failedChecks = result.checks.filter(c => !c.passed);
  assertEquals(failedChecks.length > 0, true, 'Some non-critical checks should fail');
});

// ============================================================================
// PM LEVELS VALIDATOR TESTS
// ============================================================================

Deno.test('validatePMLevelsResult - complete valid result passes all checks', () => {
  const validResult = {
    // baselineAssessment stage
    icLevel: 5,
    assessmentId: 'assessment-123',
    
    // competencyBreakdown stage
    competencies: {
      executionDelivery: 7,
      leadershipInfluence: 6,
      productStrategy: 8,
      technicalDepth: 5,
    },
    
    // specializationAssessment stage
    specializations: ['AI/ML', 'Growth'],
  };

  const result = validatePMLevelsResult(validResult);

  assertEquals(result.passed, true, 'Overall result should pass');
  assertEquals(result.checks.length, 5, 'Should have 5 checks');
  
  const failedChecks = result.checks.filter(c => !c.passed);
  assertEquals(failedChecks.length, 0, `All checks should pass. Failed: ${failedChecks.map(c => c.name).join(', ')}`);
});

Deno.test('validatePMLevelsResult - invalid IC level fails', () => {
  const invalidResult = {
    icLevel: 2, // Invalid! Should be 3-9
    assessmentId: 'assessment-123',
    competencies: {
      executionDelivery: 7,
      leadershipInfluence: 6,
      productStrategy: 8,
      technicalDepth: 5,
    },
    specializations: [],
  };

  const result = validatePMLevelsResult(invalidResult);

  assertEquals(result.passed, false, 'Overall result should fail');
  
  const icLevelCheck = result.checks.find(c => c.name === 'IC Level Valid');
  assertExists(icLevelCheck);
  assertEquals(icLevelCheck.passed, false);
  assertEquals(icLevelCheck.severity, 'critical');
});

Deno.test('validatePMLevelsResult - missing competency fails', () => {
  const invalidResult = {
    icLevel: 5,
    assessmentId: 'assessment-123',
    competencies: {
      executionDelivery: 7,
      leadershipInfluence: 6,
      productStrategy: 8,
      // Missing technicalDepth!
    },
    specializations: [],
  };

  const result = validatePMLevelsResult(invalidResult);

  assertEquals(result.passed, false, 'Overall result should fail');
  
  const competenciesCheck = result.checks.find(c => c.name === 'Four Competencies Present');
  assertExists(competenciesCheck);
  assertEquals(competenciesCheck.passed, false);
  assertEquals(competenciesCheck.severity, 'critical');
});

Deno.test('validatePMLevelsResult - competency value out of range fails', () => {
  const invalidResult = {
    icLevel: 5,
    assessmentId: 'assessment-123',
    competencies: {
      executionDelivery: 7,
      leadershipInfluence: 11, // Invalid! Should be 0-10
      productStrategy: 8,
      technicalDepth: 5,
    },
    specializations: [],
  };

  const result = validatePMLevelsResult(invalidResult);

  assertEquals(result.passed, false, 'Overall result should fail');
  
  const valuesCheck = result.checks.find(c => c.name === 'Competency Values in Range');
  assertExists(valuesCheck);
  assertEquals(valuesCheck.passed, false);
  assertEquals(valuesCheck.severity, 'critical');
});

Deno.test('validatePMLevelsResult - missing non-critical fields still passes overall', () => {
  const partialResult = {
    // All critical fields present
    icLevel: 5,
    competencies: {
      executionDelivery: 7,
      leadershipInfluence: 6,
      productStrategy: 8,
      technicalDepth: 5,
    },
    // Missing assessmentId (high severity)
    // Missing specializations (medium severity)
  };

  const result = validatePMLevelsResult(partialResult);

  assertEquals(result.passed, true, 'Overall result should pass (all critical checks pass)');
  
  // Some high/medium checks should fail
  const failedChecks = result.checks.filter(c => !c.passed);
  assertEquals(failedChecks.length > 0, true, 'Some non-critical checks should fail');
});

// ============================================================================
// QUALITY SCORE CALCULATION TESTS
// ============================================================================

Deno.test('calculateQualityScore - all checks pass = 100', () => {
  const result: StructuralEvalResult = {
    passed: true,
    checks: [
      { name: 'Check 1', passed: true, severity: 'critical' },
      { name: 'Check 2', passed: true, severity: 'high' },
      { name: 'Check 3', passed: true, severity: 'medium' },
    ],
  };

  const score = calculateQualityScore(result);
  assertEquals(score, 100, 'All passing checks should give 100 score');
});

Deno.test('calculateQualityScore - all checks fail = 0', () => {
  const result: StructuralEvalResult = {
    passed: false,
    checks: [
      { name: 'Check 1', passed: false, severity: 'critical' },
      { name: 'Check 2', passed: false, severity: 'high' },
      { name: 'Check 3', passed: false, severity: 'medium' },
    ],
  };

  const score = calculateQualityScore(result);
  assertEquals(score, 0, 'All failing checks should give 0 score');
});

Deno.test('calculateQualityScore - weighted correctly for mixed results', () => {
  const result: StructuralEvalResult = {
    passed: false,
    checks: [
      { name: 'Critical 1', passed: true, severity: 'critical' },  // 3 points
      { name: 'Critical 2', passed: true, severity: 'critical' },  // 3 points
      { name: 'Critical 3', passed: false, severity: 'critical' }, // 0 points
      { name: 'High 1', passed: true, severity: 'high' },          // 2 points
      { name: 'Medium 1', passed: false, severity: 'medium' },     // 0 points
    ],
  };

  // Total weight: 3+3+3+2+1 = 12
  // Passed weight: 3+3+2 = 8
  // Score: 8/12 * 100 = 66.67 → 67
  const score = calculateQualityScore(result);
  assertEquals(score, 67, 'Score should be weighted correctly');
});

Deno.test('calculateQualityScore - empty checks = 0', () => {
  const result: StructuralEvalResult = {
    passed: true,
    checks: [],
  };

  const score = calculateQualityScore(result);
  assertEquals(score, 0, 'Empty checks should give 0 score');
});

Deno.test('calculateQualityScore - low severity weighted correctly', () => {
  const result: StructuralEvalResult = {
    passed: true,
    checks: [
      { name: 'Low 1', passed: true, severity: 'low' },  // 0.5 points
      { name: 'Low 2', passed: false, severity: 'low' }, // 0 points
    ],
  };

  // Total weight: 0.5 + 0.5 = 1
  // Passed weight: 0.5
  // Score: 0.5/1 * 100 = 50
  const score = calculateQualityScore(result);
  assertEquals(score, 50, 'Low severity should use 0.5 weight');
});

// ============================================================================
// INTEGRATION TESTS (Real Pipeline Results)
// ============================================================================

Deno.test('Integration: Cover letter result from successful pipeline', () => {
  // Simulated complete cover letter pipeline result
  const pipelineResult = {
    roleInsights: {
      inferredRoleLevel: 'IC6',
      yearsExperience: '8+',
    },
    jdRequirementSummary: {
      coreTotal: 7,
      preferredTotal: 5,
    },
    requirements: {
      coreRequirements: [
        { id: '1', description: 'Strong TypeScript experience' },
        { id: '2', description: 'React expertise' },
        { id: '3', description: 'System design skills' },
      ],
      totalRequirements: 12,
    },
    mws: {
      summaryScore: 2,
      goalAlignment: 'high',
      workStyle: 'collaborative',
    },
    companyContext: {
      industry: 'Technology',
      size: 'Series B',
    },
    gapCount: 2,
    sections: [
      { id: 'intro', content: '...' },
      { id: 'body', content: '...' },
    ],
  };

  const validation = validateCoverLetterResult(pipelineResult);
  const score = calculateQualityScore(validation);

  assertEquals(validation.passed, true, 'Valid pipeline result should pass');
  assertEquals(validation.checks.length, 8);
  assertEquals(score, 100, 'Complete valid result should score 100');
});

Deno.test('Integration: PM levels result from successful pipeline', () => {
  // Simulated complete PM levels pipeline result
  const pipelineResult = {
    icLevel: 6,
    assessmentBand: 'IC5-IC6',
    assessmentId: 'pm-levels-xyz789',
    competencies: {
      executionDelivery: 8,
      leadershipInfluence: 7,
      productStrategy: 9,
      technicalDepth: 6,
    },
    specializations: ['Enterprise SaaS', 'AI/ML Products', 'Platform'],
    detailedAnalysis: {
      strengths: ['Strategic thinking', 'Cross-functional leadership'],
      gaps: ['Technical depth in ML'],
    },
  };

  const validation = validatePMLevelsResult(pipelineResult);
  const score = calculateQualityScore(validation);

  assertEquals(validation.passed, true, 'Valid pipeline result should pass');
  assertEquals(validation.checks.length, 5);
  assertEquals(score, 100, 'Complete valid result should score 100');
});

