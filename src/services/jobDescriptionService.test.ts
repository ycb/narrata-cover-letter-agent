/**
 * Tests for JobDescriptionService
 * 
 * Validates JD parsing integration with EvaluationEventLogger
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobDescriptionService } from './jobDescriptionService';
import * as supabaseModule from '@/lib/supabase';
import { EvaluationEventLogger } from './evaluationEventLogger';
import { LLMAnalysisService } from './openaiService';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('./evaluationEventLogger', () => ({
  EvaluationEventLogger: {
    logJDParse: vi.fn(),
  },
}));

vi.mock('./openaiService', () => ({
  LLMAnalysisService: vi.fn(),
}));

const mockSupabase = supabaseModule.supabase;

describe('JobDescriptionService', () => {
  let service: JobDescriptionService;
  let mockLLMService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup LLM service mock
    mockLLMService = {
      analyzeJobDescription: vi.fn(),
    };
    vi.mocked(LLMAnalysisService).mockImplementation(() => mockLLMService as any);

    service = new JobDescriptionService();
  });

  describe('parseAndCreate', () => {
    it('should parse JD and create database record with success logging', async () => {
      const mockJDData = {
        id: 'jd-123',
        user_id: 'user-456',
        content: 'Job description text...',
        company: 'Acme Corp',
        role: 'Senior Product Manager',
        extracted_requirements: ['5+ years PM', 'B2B SaaS'],
        url: 'https://example.com/job',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      // Mock LLM response
      mockLLMService.analyzeJobDescription.mockResolvedValue({
        success: true,
        data: {
          company: 'Acme Corp',
          role: 'Senior Product Manager',
          requirements: ['5+ years PM', 'B2B SaaS', 'SQL proficiency'],
          differentiatorSummary: 'Seeks PM with AI/ML experience',
        },
      });

      // Mock Supabase insert
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockJDData,
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSelect,
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(mockSupabase.from).mockImplementation(mockFrom);

      // Mock evaluation logger
      vi.mocked(EvaluationEventLogger.logJDParse).mockResolvedValue({
        success: true,
        runId: 'run-1',
      });

      const result = await service.parseAndCreate({
        userId: 'user-456',
        content: 'Job description text...',
        url: 'https://example.com/job',
      });

      expect(result).toEqual(mockJDData);
      expect(mockLLMService.analyzeJobDescription).toHaveBeenCalledWith('Job description text...');
      expect(mockFrom).toHaveBeenCalledWith('job_descriptions');
      expect(EvaluationEventLogger.logJDParse).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          jobDescriptionId: 'jd-123',
          company: 'Acme Corp',
          role: 'Senior Product Manager',
          requirements: ['5+ years PM', 'B2B SaaS', 'SQL proficiency'],
          differentiatorSummary: 'Seeks PM with AI/ML experience',
          status: 'success',
          sourceUrl: 'https://example.com/job',
        })
      );
    });

    it('should log failure event when parsing fails', async () => {
      // Mock LLM failure
      mockLLMService.analyzeJobDescription.mockResolvedValue({
        success: false,
        error: 'LLM parsing failed',
      });

      // Mock evaluation logger
      vi.mocked(EvaluationEventLogger.logJDParse).mockResolvedValue({
        success: true,
        runId: 'run-2',
      });

      await expect(
        service.parseAndCreate({
          userId: 'user-456',
          content: 'Invalid JD text...',
        })
      ).rejects.toThrow('LLM parsing failed');

      expect(EvaluationEventLogger.logJDParse).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          jobDescriptionId: 'pending',
          status: 'failed',
          error: 'LLM parsing failed',
        })
      );
    });

    it('should log failure event when database insert fails', async () => {
      // Mock LLM success
      mockLLMService.analyzeJobDescription.mockResolvedValue({
        success: true,
        data: {
          company: 'Acme Corp',
          role: 'PM',
          requirements: ['5+ years'],
          differentiatorSummary: 'Test',
        },
      });

      // Mock Supabase failure
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSelect,
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(mockSupabase.from).mockImplementation(mockFrom);

      // Mock evaluation logger
      vi.mocked(EvaluationEventLogger.logJDParse).mockResolvedValue({
        success: true,
        runId: 'run-3',
      });

      await expect(
        service.parseAndCreate({
          userId: 'user-456',
          content: 'JD text...',
        })
      ).rejects.toThrow('Database error');

      expect(EvaluationEventLogger.logJDParse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: expect.stringContaining('Database error'),
        })
      );
    });

    it('should handle synthetic profile IDs', async () => {
      const mockJDData = {
        id: 'jd-789',
        user_id: 'user-456',
        content: 'JD text...',
        company: 'Test Corp',
        role: 'PM',
        extracted_requirements: ['test'],
        url: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockLLMService.analyzeJobDescription.mockResolvedValue({
        success: true,
        data: {
          company: 'Test Corp',
          role: 'PM',
          requirements: ['test'],
          differentiatorSummary: 'Test',
        },
      });

      const mockSelect = vi.fn().mockResolvedValue({
        data: mockJDData,
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSelect,
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(mockSupabase.from).mockImplementation(mockFrom);
      vi.mocked(EvaluationEventLogger.logJDParse).mockResolvedValue({
        success: true,
        runId: 'run-4',
      });

      await service.parseAndCreate({
        userId: 'user-456',
        content: 'JD text...',
        syntheticProfileId: 'synthetic-123',
      });

      expect(EvaluationEventLogger.logJDParse).toHaveBeenCalledWith(
        expect.objectContaining({
          syntheticProfileId: 'synthetic-123',
        })
      );
    });
  });
});

