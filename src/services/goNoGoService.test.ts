/**
 * Tests for Go/No-Go Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoNoGoService } from './goNoGoService';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'test-user-id',
              preferred_locations: ['San Francisco', 'New York'],
              open_to_relocation: false,
              minimum_salary: 120000,
              years_of_experience: 5,
              core_skills: ['JavaScript', 'React', 'Node.js'],
              industries: ['SaaS', 'Fintech'],
              work_type_preference: 'remote',
            },
            error: null,
          })),
        })),
      })),
    })),
  },
}));

// Mock OpenAI Service
vi.mock('./openaiService', () => ({
  LLMAnalysisService: vi.fn().mockImplementation(() => ({
    analyzeGoNoGo: vi.fn().mockResolvedValue({
      success: true,
      data: {
        decision: 'go',
        confidence: 85,
        mismatches: [],
      },
    }),
  })),
}));

describe('GoNoGoService', () => {
  let service: GoNoGoService;

  beforeEach(() => {
    service = new GoNoGoService();
    vi.clearAllMocks();
  });

  it('should analyze job fit successfully', async () => {
    const result = await service.analyzeJobFit(
      'test-user-id',
      'Senior Software Engineer - Remote - $150k'
    );

    expect(result).toBeDefined();
    expect(result.decision).toBe('go');
    expect(result.confidence).toBeGreaterThan(0);
    expect(Array.isArray(result.mismatches)).toBe(true);
  });

  it('should return go decision with low confidence on error', async () => {
    // Mock LLM service to throw error
    const errorService = new GoNoGoService();
    (errorService as any).llmService.analyzeGoNoGo = vi
      .fn()
      .mockRejectedValue(new Error('API error'));

    const result = await errorService.analyzeJobFit(
      'test-user-id',
      'Test job description'
    );

    expect(result.decision).toBe('go');
    expect(result.confidence).toBe(50);
    expect(result.mismatches).toEqual([]);
  });

  it('should mark user override correctly', () => {
    const analysis = {
      decision: 'no-go' as const,
      confidence: 70,
      mismatches: [
        {
          type: 'geography' as const,
          severity: 'high' as const,
          description: 'Location mismatch',
        },
      ],
    };

    const overridden = service.markUserOverride(analysis);

    expect(overridden.decision).toBe('go');
    expect(overridden.mismatches[0].userOverride).toBe(true);
  });

  it('should handle invalid LLM response', async () => {
    const invalidService = new GoNoGoService();
    (invalidService as any).llmService.analyzeGoNoGo = vi
      .fn()
      .mockResolvedValue({
        success: true,
        data: {
          decision: 'invalid-decision', // Invalid value
          confidence: 85,
          mismatches: [],
        },
      });

    const result = await invalidService.analyzeJobFit(
      'test-user-id',
      'Test job'
    );

    // Should fallback to safe default
    expect(result.decision).toBe('go');
    expect(result.confidence).toBe(50);
  });
});
