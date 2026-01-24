import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CoverLetterFinalization } from '../CoverLetterFinalization';
import type { CoverLetterDraftSection } from '@/types/coverLetters';

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

  it('renders cover letter content and actions', () => {
    render(
      <CoverLetterFinalization
        isOpen
        onClose={vi.fn()}
        onBackToDraft={vi.fn()}
        sections={sections}
      />,
    );

    expect(screen.getByText('Cover letter preview')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText(/Dear Hiring Manager/)).toBeInTheDocument();
    expect(screen.getByText('12 words')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download as text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download as pdf/i })).toBeInTheDocument();
  });

  it('fires finalize callback when confirmed', () => {
    const onFinalizeConfirm = vi.fn();

    render(
      <CoverLetterFinalization
        isOpen
        onClose={vi.fn()}
        onBackToDraft={vi.fn()}
        sections={sections}
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
        onFinalizeConfirm={vi.fn()}
        isFinalizing
      />,
    );

    const finalizeButton = screen.getByRole('button', { name: /saving/i });
    expect(finalizeButton).toBeDisabled();
  });

  it('displays error message when provided', () => {
    render(
      <CoverLetterFinalization
        isOpen
        onClose={vi.fn()}
        onBackToDraft={vi.fn()}
        sections={sections}
        errorMessage="Something went wrong"
      />,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
