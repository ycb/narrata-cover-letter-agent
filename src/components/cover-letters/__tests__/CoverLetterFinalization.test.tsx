import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CoverLetterFinalization } from '../CoverLetterFinalization';
import type {
  CoverLetterDraftSection,
  CoverLetterMatchMetric,
  DifferentiatorInsight,
  CoverLetterAnalytics,
} from '@/types/coverLetters';

const sections: CoverLetterDraftSection[] = [
  {
    id: 'sec-1',
    templateSectionId: null,
    slug: 'intro',
    title: 'Introduction',
    type: 'static',
    order: 1,
    content: 'Dear Hiring Manager,',
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
      lastUpdatedAt: '2025-11-12T00:00:00Z',
    },
    analytics: {},
  },
  {
    id: 'sec-2',
    templateSectionId: null,
    slug: 'body',
    title: 'Body',
    type: 'dynamic-story',
    order: 2,
    content: 'I launched an initiative that improved engagement by 120%.',
    source: { kind: 'work_story', entityId: 'story-1' },
    metadata: {
      requirementsMatched: ['diff-1'],
      tags: ['launch'],
      wordCount: 11,
    },
    status: {
      hasGaps: false,
      gapIds: [],
      isModified: false,
      lastUpdatedAt: '2025-11-12T00:00:00Z',
    },
    analytics: {},
  },
];

const metrics: CoverLetterMatchMetric[] = [
  {
    key: 'ats',
    label: 'ATS Score',
    type: 'score',
    value: 92,
    summary: 'Great keyword match',
    tooltip: '',
  },
  {
    key: 'rating',
    label: 'Cover Letter Rating',
    type: 'strength',
    strength: 'strong',
    summary: 'Overall excellent',
    tooltip: '',
  },
  {
    key: 'coreRequirements',
    label: 'Core Requirements',
    type: 'requirement',
    met: 4,
    total: 5,
    summary: 'Most core requirements covered',
    tooltip: '',
  },
  {
    key: 'preferredRequirements',
    label: 'Preferred Requirements',
    type: 'requirement',
    met: 3,
    total: 4,
    summary: 'Preferred requirements mostly covered',
    tooltip: '',
  },
];

const differentiators: DifferentiatorInsight[] = [
  {
    requirementId: 'diff-1',
    label: '0-to-1 Launches',
    status: 'addressed',
    summary: 'Highlighted in primary body paragraph.',
  },
  {
    requirementId: 'diff-2',
    label: 'Cross-functional leadership',
    status: 'missing',
    summary: 'Consider adding collaboration examples.',
  },
];

const analytics: CoverLetterAnalytics = {
  atsScore: 92,
  finalizedAt: undefined,
  wordCount: 14,
  sections: 2,
  differentiatorCoverage: { addressed: 1, missing: 1, total: 2 },
};

describe('CoverLetterFinalization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    } as any);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders dynamic metrics and differentiators', () => {
    render(
      <CoverLetterFinalization
        isOpen
        onClose={vi.fn()}
        onBackToDraft={vi.fn()}
        sections={sections}
        metrics={metrics}
        differentiators={differentiators}
        analytics={analytics}
      />,
    );

    expect(screen.getByText('ATS Score')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('Core Reqs Met')).toBeInTheDocument();
    expect(screen.getByText('4/5')).toBeInTheDocument();
    expect(screen.getByText('0-to-1 Launches')).toBeInTheDocument();
    expect(screen.getByText('Cross-functional leadership')).toBeInTheDocument();
    expect(screen.getByText(/Dear Hiring Manager/)).toBeInTheDocument();
  });

  it('fires finalize callback when confirmed', () => {
    const onFinalizeConfirm = vi.fn();

    render(
      <CoverLetterFinalization
        isOpen
        onClose={vi.fn()}
        onBackToDraft={vi.fn()}
        sections={sections}
        metrics={metrics}
        differentiators={differentiators}
        analytics={analytics}
        onFinalizeConfirm={onFinalizeConfirm}
      />,
    );

    const finalizeButton = screen.getByRole('button', { name: /finalize & save/i });
    fireEvent.click(finalizeButton);

    expect(onFinalizeConfirm).toHaveBeenCalled();
  });

  it('disables finalize button and shows spinner when finalizing', () => {
    render(
      <CoverLetterFinalization
        isOpen
        onClose={vi.fn()}
        onBackToDraft={vi.fn()}
        sections={sections}
        metrics={metrics}
        differentiators={differentiators}
        analytics={analytics}
        onFinalizeConfirm={vi.fn()}
        isFinalizing
      />,
    );

    const finalizeButton = screen.getByRole('button', { name: /finalizing/i });
    expect(finalizeButton).toBeDisabled();
  });

  it('displays error message when provided', () => {
    render(
      <CoverLetterFinalization
        isOpen
        onClose={vi.fn()}
        onBackToDraft={vi.fn()}
        sections={sections}
        metrics={metrics}
        differentiators={differentiators}
        analytics={analytics}
        errorMessage="Something went wrong"
      />,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
