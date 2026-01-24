/**
 * Tests for JobDescriptionService
 *
 * Validates JD parsing integration with Supabase persistence.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobDescriptionService } from './jobDescriptionService';
import * as supabaseModule from '@/lib/supabase';

const streamTextMock = vi.hoisted(() => vi.fn());

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => ({
    chat: vi.fn(() => 'mock-model'),
  })),
}));

vi.mock('ai', () => ({
  streamText: streamTextMock,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockSupabase = supabaseModule.supabase;

describe('JobDescriptionService', () => {
  const baseResponse = {
    company: 'Acme Corp',
    role: 'Senior Product Manager',
    differentiatorSummary: 'Seeks PM with AI/ML experience',
    coreRequirements: ['5+ years PM', 'B2B SaaS'],
    preferredRequirements: ['SQL proficiency'],
  };

  const buildStreamingResult = (payload: unknown) => ({
    textStream: (async function* stream() {
      yield { text: JSON.stringify(payload) };
    })(),
  });

  let service: JobDescriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_OPENAI_API_KEY = 'test-key';
    streamTextMock.mockResolvedValue(buildStreamingResult(baseResponse));
    service = new JobDescriptionService({ openAIKey: 'test-key' });
  });

  describe('parseAndCreate', () => {
    it('should parse JD and create database record', async () => {
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
        analysis: {},
      };

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

      const content =
        'This job description is intentionally long enough to meet the minimum character requirement for parsing.';

      const result = await service.parseAndCreate('user-456', content, {
        url: 'https://example.com/job',
      });

      expect(result.id).toBe('jd-123');
      expect(result.company).toBe('Acme Corp');
      expect(streamTextMock).toHaveBeenCalledTimes(1);
      expect(mockFrom).toHaveBeenCalledWith('job_descriptions');
    });

    it('should reject when content is too short', async () => {
      await expect(service.parseAndCreate('user-456', 'Too short.')).rejects.toThrow(
        'Job description content must be at least 50 characters.',
      );
    });

    it('should wrap database insert failures', async () => {
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

      const content =
        'This job description content is long enough to satisfy parse length requirements for testing.';

      await expect(service.parseAndCreate('user-456', content)).rejects.toThrow(
        'Unable to process job description: Database error',
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
        analysis: {},
      };

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

      const content =
        'This synthetic profile test uses a long enough job description to pass validation requirements.';

      const result = await service.parseAndCreate('user-456', content, {
        syntheticProfileId: 'synthetic-123',
      });

      expect(result.id).toBe('jd-789');
      expect(result.sessionId).toBeDefined();
    });
  });
});
