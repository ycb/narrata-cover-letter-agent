/**
 * Tests for CoverLetterDraftService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoverLetterDraftService } from './coverLetterDraftService';

// Mock Supabase
const mockJobDescription = {
  id: 'jd-123',
  user_id: 'user-123',
  content: 'Senior Product Manager role at TechCorp...',
  url: 'https://example.com/job',
  company: 'TechCorp',
  role: 'Senior Product Manager',
  extracted_requirements: ['5+ years PM experience', 'B2B SaaS background'],
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'saved_sections') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  data: [
                    {
                      id: 'intro-1',
                      user_id: 'user-123',
                      type: 'introduction',
                      content: 'I am writing to express my interest in the [Position] at [Company].',
                      is_default: true,
                    },
                  ],
                  error: null,
                })),
              })),
            })),
          })),
        };
      }

      if (table === 'approved_content') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  data: [
                    {
                      id: 'story-1',
                      user_id: 'user-123',
                      title: 'Product Lead at InnovateTech',
                      content: 'I successfully launched a new product feature that increased user engagement by 40%.',
                    },
                  ],
                  error: null,
                })),
              })),
            })),
          })),
        };
      }

      if (table === 'cover_letters') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  id: 'draft-123',
                  user_id: 'user-123',
                  job_description_id: 'jd-123',
                  sections: [],
                  llm_feedback: {},
                  status: 'draft',
                },
                error: null,
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              error: null,
            })),
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          })),
        };
      }

      return {
        select: vi.fn(() => ({ data: [], error: null })),
      };
    }),
  },
}));

// Mock JobDescriptionService
vi.mock('./jobDescriptionService', () => ({
  JobDescriptionService: vi.fn().mockImplementation(() => ({
    parseAndCreate: vi.fn().mockResolvedValue(mockJobDescription),
  })),
}));

// Mock GapDetectionService
vi.mock('./gapDetectionService', () => ({
  GapDetectionService: vi.fn().mockImplementation(() => ({})),
}));

describe('CoverLetterDraftService', () => {
  let service: CoverLetterDraftService;

  beforeEach(() => {
    service = new CoverLetterDraftService();
    vi.clearAllMocks();
  });

  it('should create a draft successfully', async () => {
    const draft = await service.createDraft(
      'user-123',
      'Senior PM role at TechCorp...',
      'https://example.com/job'
    );

    expect(draft).toBeDefined();
    expect(draft.draftId).toBe('draft-123');
    expect(draft.sections).toHaveLength(4); // intro, experience, closing, signature
    expect(draft.gaps).toBeDefined();
    expect(draft.metrics).toBeDefined();
  });

  it('should generate sections from saved sections and work history', async () => {
    const sections = await service.generateSections('user-123', mockJobDescription);

    expect(sections).toHaveLength(4);
    expect(sections[0].type).toBe('intro');
    expect(sections[1].type).toBe('experience');
    expect(sections[2].type).toBe('closing');
    expect(sections[3].type).toBe('signature');
  });

  it('should personalize section content with job details', async () => {
    const sections = await service.generateSections('user-123', mockJobDescription);

    const introSection = sections.find((s) => s.type === 'intro');
    expect(introSection?.content).toContain('Senior Product Manager');
    expect(introSection?.content).toContain('TechCorp');
  });

  it('should detect gaps in sections', async () => {
    const sections = [
      {
        id: 'intro',
        type: 'intro' as const,
        content: 'Short intro', // Too short, no metrics
        isModified: false,
      },
    ];

    const gaps = await service.detectSectionGaps('user-123', sections);

    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.some((g) => g.description.includes('Quantifiable'))).toBe(true);
  });

  it('should calculate HIL metrics', async () => {
    const sections = [
      {
        id: 'intro',
        type: 'intro' as const,
        content: 'I have 5+ years of PM experience in B2B SaaS.',
        isModified: false,
      },
    ];

    const gaps = [
      {
        id: 'gap-1',
        type: 'best-practice' as const,
        severity: 'medium' as const,
        description: 'Test gap',
        suggestion: 'Test suggestion',
        origin: 'ai' as const,
        addresses: [],
      },
    ];

    const metrics = await service.calculateMetrics(sections, gaps, mockJobDescription);

    expect(metrics.goalsMatch).toBeDefined();
    expect(metrics.experienceMatch).toBeDefined();
    expect(metrics.coverLetterRating).toBeDefined();
    expect(metrics.atsScore).toBeGreaterThan(0);
    expect(metrics.coreRequirementsMet).toBeDefined();
    expect(metrics.preferredRequirementsMet).toBeDefined();
  });

  it('should save draft to database', async () => {
    const sections = [
      {
        id: 'intro',
        type: 'intro' as const,
        content: 'Test content',
        isModified: false,
      },
    ];

    const gaps: any[] = [];
    const metrics: any = {
      goalsMatch: 'average',
      experienceMatch: 'average',
      coverLetterRating: 'average',
      atsScore: 75,
      coreRequirementsMet: { met: 2, total: 4 },
      preferredRequirementsMet: { met: 1, total: 4 },
    };

    const draftId = await service.saveDraft('user-123', 'jd-123', sections, gaps, metrics);

    expect(draftId).toBe('draft-123');
  });
});
