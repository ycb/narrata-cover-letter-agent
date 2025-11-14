/**
 * Tests for EvaluationEventLogger
 * 
 * Validates event emission and database persistence for:
 * - JD parsing events
 * - HIL story events
 * - HIL saved section events
 * - HIL draft events
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EvaluationEventLogger } from './evaluationEventLogger';
import * as supabaseModule from '@/lib/supabase';
import type {
  JDParseEvent,
  HILStoryEvent,
  HILSavedSectionEvent,
  HILDraftEvent,
} from '@/types/evaluationEvents';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockSupabase = supabaseModule.supabase;

describe('EvaluationEventLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logJDParse', () => {
    it('should log successful JD parsing event', async () => {
      // Create proper mock chain: from() -> insert() -> select()
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'run-1' }],
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(mockSupabase.from).mockImplementation(mockFrom);

      const event: JDParseEvent = {
        userId: 'user-123',
        jobDescriptionId: 'jd-456',
        rawTextChecksum: 'abc123',
        company: 'Acme Corp',
        role: 'Senior Product Manager',
        requirements: ['5+ years PM experience', 'B2B SaaS background'],
        differentiatorSummary: 'Seeks PM with AI/ML experience',
        inputTokens: 500,
        outputTokens: 300,
        latency: 1500,
        status: 'success',
      };

      const result = await EvaluationEventLogger.logJDParse(event);

      expect(result.success).toBe(true);
      expect(result.runId).toBe('run-1');
      expect(mockFrom).toHaveBeenCalledWith('evaluation_runs');
      expect(mockInsert).toHaveBeenCalled();

      // Validate payload structure
      const callArgs = mockInsert.mock.calls[0];
      const payload = callArgs[0][0];
      expect(payload.user_id).toBe('user-123');
      expect(payload.file_type).toBe('jd_parse');
      expect(payload.jd_parse_status).toBe('success');
      expect(payload.jd_parse_event.jobDescriptionId).toBe('jd-456');
      expect(payload.jd_parse_event.company).toBe('Acme Corp');
    });

    it('should handle JD parsing failure', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'run-2' }],
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(mockSupabase.from).mockImplementation(mockFrom);

      const event: JDParseEvent = {
        userId: 'user-123',
        jobDescriptionId: 'jd-456',
        rawTextChecksum: 'abc123',
        inputTokens: 500,
        outputTokens: 0,
        latency: 500,
        status: 'failed',
        error: 'Invalid JD format',
      };

      const result = await EvaluationEventLogger.logJDParse(event);

      expect(result.success).toBe(true);
      const callArgs = mockInsert.mock.calls[0];
      const payload = callArgs[0][0];
      expect(payload.jd_parse_status).toBe('failed');
      expect(payload.go_nogo_decision).toBe('❌ No-Go');
    });

    it('should handle database errors gracefully', async () => {
      const mockError = { message: 'Database connection failed' };
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(mockSupabase.from).mockImplementation(mockFrom);

      const event: JDParseEvent = {
        userId: 'user-123',
        jobDescriptionId: 'jd-456',
        rawTextChecksum: 'abc123',
        inputTokens: 500,
        outputTokens: 300,
        latency: 1500,
        status: 'success',
      };

      const result = await EvaluationEventLogger.logJDParse(event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('should mark synthetic profiles correctly', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: [{ id: 'run-3' }],
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnValue({
          insert: mockInsert,
          select: mockInsert,
        }),
      });

      vi.mocked(mockSupabase.from).mockImplementation(mockFrom);

      const event: JDParseEvent = {
        userId: 'user-123',
        jobDescriptionId: 'jd-456',
        rawTextChecksum: 'abc123',
        inputTokens: 500,
        outputTokens: 300,
        latency: 1500,
        status: 'success',
        syntheticProfileId: 'synthetic-789',
      };

      await EvaluationEventLogger.logJDParse(event);

      const callArgs = mockInsert.mock.calls[0];
      const payload = callArgs[0][0];
      expect(payload.user_type).toBe('synthetic');
      expect(payload.synthetic_profile_id).toBe('synthetic-789');
    });
  });

  describe('logHILStory', () => {
    it('should log HIL story creation event', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'run-4' }],
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(mockSupabase.from).mockImplementation(mockFrom);

      const event: HILStoryEvent = {
        userId: 'user-123',
        workItemId: 'work-456',
        contentSource: 'story',
        action: 'ai_suggest',
        initialWordCount: 100,
        finalWordCount: 250,
        wordDelta: 150,
        gapCoverage: {
          closedGapIds: ['gap-1', 'gap-2'],
          remainingGapCount: 1,
          gapCoveragePercentage: 66,
        },
        gapsAddressed: ['gap-1', 'gap-2'],
        latency: 2000,
        status: 'success',
      };

      const result = await EvaluationEventLogger.logHILStory(event);

      expect(result.success).toBe(true);
      expect(result.runId).toBe('run-4');

      const callArgs = mockInsert.mock.calls[0];
      const payload = callArgs[0][0];
      expect(payload.file_type).toBe('hil_story');
      expect(payload.hil_content_type).toBe('story');
      expect(payload.hil_action).toBe('ai_suggest');
      expect(payload.hil_content_word_delta).toBe(150);
      expect(payload.hil_gap_coverage.closedGapIds).toEqual(['gap-1', 'gap-2']);
    });

    it('should log manual edit action', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'run-5' }],
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(mockSupabase.from).mockImplementation(mockFrom);

      const event: HILStoryEvent = {
        userId: 'user-123',
        storyId: 'story-789',
        workItemId: 'work-456',
        contentSource: 'story',
        action: 'manual_edit',
        initialWordCount: 200,
        finalWordCount: 225,
        wordDelta: 25,
        latency: 500,
        status: 'success',
      };

      await EvaluationEventLogger.logHILStory(event);

      const callArgs = mockInsert.mock.calls[0];
      const payload = callArgs[0][0];
      expect(payload.hil_action).toBe('manual_edit');
      expect(payload.personalization_score).toBe('⚠️ Manual');
    });
  });

  describe('logHILSavedSection', () => {
    it('should log HIL saved section event', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'run-6' }],
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(mockSupabase.from).mockImplementation(mockFrom);

      const event: HILSavedSectionEvent = {
        userId: 'user-123',
        contentSource: 'saved_section',
        action: 'apply_suggestion',
        initialWordCount: 150,
        finalWordCount: 300,
        wordDelta: 150,
        latency: 1500,
        status: 'success',
      };

      const result = await EvaluationEventLogger.logHILSavedSection(event);

      expect(result.success).toBe(true);

      const callArgs = mockInsert.mock.calls[0];
      const payload = callArgs[0][0];
      expect(payload.file_type).toBe('hil_saved_section');
      expect(payload.hil_content_type).toBe('saved_section');
      expect(payload.hil_action).toBe('apply_suggestion');
    });
  });

  describe('logHILDraft', () => {
    it('should log HIL draft edit event with gap tracking', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'run-7' }],
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(mockSupabase.from).mockImplementation(mockFrom);

      const event: HILDraftEvent = {
        userId: 'user-123',
        draftId: 'draft-999',
        contentSource: 'cover_letter_draft',
        action: 'ai_suggest',
        sectionName: 'opening',
        initialWordCount: 80,
        finalWordCount: 120,
        wordDelta: 40,
        initialGapCount: 3,
        finalGapCount: 1,
        gapCoverage: {
          closedGapIds: ['gap-1', 'gap-2'],
          remainingGapCount: 1,
          gapCoveragePercentage: 66,
        },
        qualityMetrics: {
          atsScore: 0.85,
          relevanceScore: 0.9,
          personalizedScore: 0.88,
        },
        latency: 2000,
        status: 'success',
      };

      const result = await EvaluationEventLogger.logHILDraft(event);

      expect(result.success).toBe(true);

      const callArgs = mockInsert.mock.calls[0];
      const payload = callArgs[0][0];
      expect(payload.file_type).toBe('hil_draft');
      expect(payload.hil_content_type).toBe('cover_letter_draft');
      expect(payload.hil_content_id).toBe('draft-999');
      expect(payload.evaluation_rationale).toContain('opening');
      expect(payload.evaluation_rationale).toContain('gaps: 3 → 1');
    });
  });

  describe('error handling', () => {
    it('should handle unexpected exceptions gracefully', async () => {
      vi.mocked(mockSupabase.from).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const event: JDParseEvent = {
        userId: 'user-123',
        jobDescriptionId: 'jd-456',
        rawTextChecksum: 'abc123',
        inputTokens: 500,
        outputTokens: 300,
        latency: 1500,
        status: 'success',
      };

      const result = await EvaluationEventLogger.logJDParse(event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });

    it('should provide runId on successful insertion', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'unique-run-id-12345' }],
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(mockSupabase.from).mockImplementation(mockFrom);

      const event: JDParseEvent = {
        userId: 'user-123',
        jobDescriptionId: 'jd-456',
        rawTextChecksum: 'abc123',
        inputTokens: 500,
        outputTokens: 300,
        latency: 1500,
        status: 'success',
      };

      const result = await EvaluationEventLogger.logJDParse(event);

      expect(result.success).toBe(true);
      expect(result.runId).toBe('unique-run-id-12345');
    });
  });
});

