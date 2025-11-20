import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoverLetterCreateModal } from '../CoverLetterCreateModal';
import type { CoverLetterDraft } from '@/types/coverLetters';

const parseAndCreateMock = vi.fn();
const generateDraftMock = vi.fn();
const updateSectionMock = vi.fn();
const finalizeDraftMock = vi.fn();
const setDraftMock = vi.fn();
const setWorkpadMock = vi.fn();
const setTemplateIdMock = vi.fn();
const setJobDescriptionIdMock = vi.fn();
const clearErrorMock = vi.fn();
const resetProgressMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
  }),
}));

vi.mock('@/lib/supabase', () => {
  const createQueryBuilder = (data: unknown) => {
    const builder: any = {
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => Promise.resolve({ data, error: null })),
    };
    return builder;
  };

  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() =>
          createQueryBuilder([
            { id: 'tmpl-1', name: 'Primary Template' },
            { id: 'tmpl-2', name: 'Secondary Template' },
          ]),
        ),
      })),
    },
  };
});

vi.mock('@/services/jobDescriptionService', () => ({
  JobDescriptionService: vi.fn(() => ({
    parseAndCreate: parseAndCreateMock,
  })),
}));

vi.mock('@/services/coverLetterDraftService', () => ({
  CoverLetterDraftService: vi.fn(() => ({})),
}));

vi.mock('@/hooks/useCoverLetterDraft', () => ({
  useCoverLetterDraft: vi.fn(() => ({
    draft: null,
    workpad: null,
    progress: [],
    isGenerating: false,
    isMutating: false,
    isFinalizing: false,
    error: null,
    generateDraft: generateDraftMock,
    updateSection: updateSectionMock,
    recalculateMetrics: vi.fn(),
    finalizeDraft: finalizeDraftMock,
    setDraft: setDraftMock,
    setWorkpad: setWorkpadMock,
    setTemplateId: setTemplateIdMock,
    setJobDescriptionId: setJobDescriptionIdMock,
    clearError: clearErrorMock,
    resetProgress: resetProgressMock,
  })),
}));

describe('CoverLetterCreateModal', () => {
  beforeEach(() => {
    parseAndCreateMock.mockReset();
    generateDraftMock.mockReset();
    updateSectionMock.mockReset();
    finalizeDraftMock.mockReset();
    setDraftMock.mockReset();
    setWorkpadMock.mockReset();
    setTemplateIdMock.mockReset();
    setJobDescriptionIdMock.mockReset();
    clearErrorMock.mockReset();
    resetProgressMock.mockReset();
  });

  it('renders job description input and available templates', async () => {
    render(
      <CoverLetterCreateModal
        isOpen
        onClose={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(setTemplateIdMock).toHaveBeenCalledWith('tmpl-1'),
    );

    expect(screen.getByRole('heading', { name: /job description/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste the full job description here...')).toBeInTheDocument();
    expect(screen.getByText('Primary Template')).toBeInTheDocument();
  });

  it('parses job description and generates draft when form is submitted', async () => {
    const { useCoverLetterDraft } = await import('@/hooks/useCoverLetterDraft');
    (useCoverLetterDraft as unknown as vi.Mock).mockReturnValueOnce({
      draft: null,
      workpad: null,
      progress: [],
      isGenerating: false,
      isMutating: false,
      isFinalizing: false,
      error: null,
      generateDraft: generateDraftMock,
      updateSection: updateSectionMock,
      recalculateMetrics: vi.fn(),
      finalizeDraft: finalizeDraftMock,
      setDraft: setDraftMock,
      setWorkpad: setWorkpadMock,
      setTemplateId: setTemplateIdMock,
      setJobDescriptionId: setJobDescriptionIdMock,
      clearError: clearErrorMock,
      resetProgress: resetProgressMock,
    });

    parseAndCreateMock.mockResolvedValue({
      id: 'jd-1',
      userId: 'user-1',
      content: 'mock content',
      company: 'Acme',
      role: 'PM',
      summary: 'summary',
      structuredData: {},
      structuredInsights: {},
      standardRequirements: [],
      preferredRequirements: [],
      differentiatorRequirements: [],
      boilerplateSignals: [],
      differentiatorSignals: [],
      keywords: [],
      createdAt: 'now',
      updatedAt: 'now',
    });
    generateDraftMock.mockResolvedValue({});

    render(
      <CoverLetterCreateModal
        isOpen
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(setTemplateIdMock).toHaveBeenCalled());

    const textarea = screen.getByPlaceholderText('Paste the full job description here...');
    fireEvent.change(textarea, { target: { value: 'This is a sufficiently long job description containing more than fifty characters.' } });

    const generateButton = screen.getByRole('button', { name: /generate cover letter/i });
    fireEvent.click(generateButton);

    await waitFor(() => expect(parseAndCreateMock).toHaveBeenCalled());
    expect(generateDraftMock).toHaveBeenCalledWith({
      templateId: 'tmpl-1',
      jobDescriptionId: 'jd-1',
    });
    expect(setJobDescriptionIdMock).toHaveBeenCalledWith('jd-1');
  });

  it('renders generated draft sections when draft is available', async () => {
    const mockDraft: CoverLetterDraft = {
      id: 'draft-1',
      userId: 'user-1',
      templateId: 'tmpl-1',
      jobDescriptionId: 'jd-1',
      status: 'draft',
      company: 'Acme',
      role: 'Senior PM',
      sections: [
        {
          id: 'section-1',
          templateSectionId: null,
          slug: 'introduction',
          title: 'Introduction',
          type: 'static',
          order: 1,
          content: 'Opening paragraph content.',
          source: { kind: 'template_static', entityId: null },
          metadata: {
            requirementsMatched: [],
            tags: [],
            wordCount: 3,
          },
          status: {
            hasGaps: false,
            gapIds: [],
            isModified: false,
            lastUpdatedAt: 'now',
          },
          analytics: {
            matchScore: 0.5,
            atsScore: 0,
          },
        },
      ],
      metrics: [],
      atsScore: 0,
      differentiatorSummary: [],
      llmFeedback: {},
      analytics: {},
      createdAt: 'now',
      updatedAt: 'now',
      finalizedAt: null,
    };

    const { useCoverLetterDraft } = await import('@/hooks/useCoverLetterDraft');
    (useCoverLetterDraft as unknown as vi.Mock).mockReturnValue({
      draft: mockDraft,
      workpad: null,
      progress: [],
      isGenerating: false,
      isMutating: false,
      isFinalizing: false,
      error: null,
      generateDraft: generateDraftMock,
      updateSection: updateSectionMock,
      recalculateMetrics: vi.fn(),
      finalizeDraft: finalizeDraftMock,
      setDraft: setDraftMock,
      setWorkpad: setWorkpadMock,
      setTemplateId: setTemplateIdMock,
      setJobDescriptionId: setJobDescriptionIdMock,
      clearError: clearErrorMock,
      resetProgress: resetProgressMock,
    });

    render(
      <CoverLetterCreateModal
        isOpen
        onClose={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByDisplayValue('Opening paragraph content.')).toBeInTheDocument(),
    );
  });

  it('finalizes draft and calls finalizeDraft from hook', async () => {
    const mockDraft: CoverLetterDraft = {
      id: 'draft-1',
      userId: 'user-1',
      templateId: 'tmpl-1',
      jobDescriptionId: 'jd-1',
      status: 'draft',
      company: 'Acme',
      role: 'Senior PM',
      sections: [
        {
          id: 'section-1',
          templateSectionId: null,
          slug: 'introduction',
          title: 'Introduction',
          type: 'static',
          order: 1,
          content: 'Opening paragraph content.',
          source: { kind: 'template_static', entityId: null },
          metadata: {
            requirementsMatched: [],
            tags: [],
            wordCount: 3,
          },
          status: {
            hasGaps: false,
            gapIds: [],
            isModified: false,
            lastUpdatedAt: 'now',
          },
          analytics: {
            matchScore: 0.5,
            atsScore: 0,
          },
        },
      ],
      metrics: [
        {
          key: 'ats',
          label: 'ATS Score',
          type: 'score',
          value: 88,
          summary: 'High ATS match',
          tooltip: '',
        },
      ],
      atsScore: 88,
      differentiatorSummary: [
        {
          requirementId: 'diff-1',
          label: '0-1 Launch Experience',
          status: 'addressed',
          summary: 'Covered by body paragraph.',
        },
      ],
      llmFeedback: {},
      analytics: { atsScore: 88 },
      createdAt: 'now',
      updatedAt: 'now',
      finalizedAt: null,
    };

    const { useCoverLetterDraft } = await import('@/hooks/useCoverLetterDraft');
    (useCoverLetterDraft as unknown as vi.Mock).mockReturnValue({
      draft: mockDraft,
      workpad: null,
      progress: [],
      isGenerating: false,
      isMutating: false,
      isFinalizing: false,
      error: null,
      generateDraft: generateDraftMock,
      updateSection: updateSectionMock,
      recalculateMetrics: vi.fn(),
      finalizeDraft: finalizeDraftMock.mockResolvedValue({
        ...mockDraft,
        status: 'finalized',
        finalizedAt: 'now',
      }),
      setDraft: setDraftMock,
      setWorkpad: setWorkpadMock,
      setTemplateId: setTemplateIdMock,
      setJobDescriptionId: setJobDescriptionIdMock,
      clearError: clearErrorMock,
      resetProgress: resetProgressMock,
    });

    const onCoverLetterCreated = vi.fn();

    render(
      <CoverLetterCreateModal
        isOpen
        onClose={vi.fn()}
        onCoverLetterCreated={onCoverLetterCreated}
      />,
    );

    await waitFor(() =>
      expect(screen.getByDisplayValue('Opening paragraph content.')).toBeInTheDocument(),
    );

    const finalizeButton = screen.getByRole('button', { name: /finalize letter/i });
    fireEvent.click(finalizeButton);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /finalize & save/i })).toBeInTheDocument(),
    );

    const confirmButton = screen.getByRole('button', { name: /finalize & save/i });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(finalizeDraftMock).toHaveBeenCalled());
    expect(onCoverLetterCreated).toHaveBeenCalled();
  });
});

