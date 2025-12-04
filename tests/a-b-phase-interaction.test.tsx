// TEST STATUS: UI OUTDATED
// Fixed: Added QueryClientProvider wrapper (Dec 4, 2025)
// Tests A+B phase interaction with streaming insights

/**
 * A+B Phase Interaction Tests
 * 
 * Purpose: Ensure streaming insights (A-phase) don't regress draft-based behavior (B-phase)
 * 
 * Test Coverage:
 * - t+0 static vs skeleton dynamic sections
 * - A-phase accordions render pre-draft
 * - Draft completion flips badges/score to draft data
 * - A-phase accordions remain visible post-draft
 * - Edge cases: missing company context, missing PM Levels, sparse JD
 * 
 * Feature Flag: Tests both ENABLE_A_PHASE_INSIGHTS=true and false
 * 
 * NOTE: Tests use mocked jobState - NO backend dependency
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoverLetterDraftEditor } from '@/components/cover-letters/CoverLetterDraftEditor';
import { MatchMetricsToolbar } from '@/components/cover-letters/MatchMetricsToolbar';
import { UserGoalsProvider } from '@/contexts/UserGoalsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import type { CoverLetterDraft } from '@/types/coverLetters';
import type { JobStreamState, APhaseInsights } from '@/types/jobs';
import type { MatchMetricsData } from '@/components/cover-letters/useMatchMetricsDetails';
import React from 'react';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Test wrapper with required providers (including QueryClient)
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
  };

  const mockAuthContext = {
    user: mockUser,
    session: null,
    isLoading: false,
    signOut: vi.fn(),
  };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider value={mockAuthContext as any}>
        <UserGoalsProvider>
          {children}
        </UserGoalsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Custom render with providers
 */
function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: TestWrapper });
}

/**
 * Create mock A-phase insights for testing
 */
function createMockAPhaseInsights(overrides: Partial<APhaseInsights> = {}): APhaseInsights {
  return {
    roleInsights: {
      inferredRoleLevel: 'Senior PM',
      inferredRoleScope: 'product',
      titleMatch: { exactTitleMatch: true, adjacentTitleMatch: false },
      scopeMatch: { scopeRelation: 'goodFit' },
      goalAlignment: { alignsWithTargetTitles: true, alignsWithTargetLevelBand: true },
    },
    jdRequirementSummary: {
      coreTotal: 5,
      preferredTotal: 3,
    },
    mws: {
      summaryScore: 3,
      details: [
        { label: 'Growth product work', strengthLevel: 'strong', explanation: 'Strong background in growth' },
        { label: 'Technical leadership', strengthLevel: 'moderate', explanation: 'Some experience leading technical teams' },
      ],
    },
    companyContext: {
      industry: 'Technology',
      maturity: 'series-b',
      businessModels: ['SaaS', 'Enterprise'],
      source: 'jd',
      confidence: 0.85,
    },
    stageFlags: {
      hasJdAnalysis: true,
      hasRequirementAnalysis: true,
      hasGoalsAndStrengths: true,
      hasRoleInsights: true,
      hasJdRequirementSummary: true,
      hasMws: true,
      hasCompanyContext: true,
      phaseComplete: true,
    },
    ...overrides,
  };
}

/**
 * Create mock jobState for streaming tests
 */
function createMockJobState(
  status: 'pending' | 'running' | 'complete' | 'error',
  stages: Record<string, any> = {}
): JobStreamState {
  return {
    jobId: 'test-job-123',
    type: 'coverLetter',
    status,
    stages,
    startedAt: new Date(),
    completedAt: status === 'complete' ? new Date() : undefined,
  };
}

/**
 * Create mock template sections (for skeleton state)
 */
function createMockTemplateSections() {
  return [
    { id: 'intro-1', title: 'Introduction', type: 'intro', slug: 'intro', content: '' },
    { id: 'body-1', title: 'Experience Paragraph 1', type: 'paragraph', slug: 'paragraph', content: '' },
    { id: 'body-2', title: 'Experience Paragraph 2', type: 'paragraph', slug: 'paragraph', content: '' },
    { id: 'closing-1', title: 'Closing', type: 'closing', slug: 'closing', content: '' },
  ];
}

/**
 * Create mock draft with B-phase data
 */
function createMockDraft(overrides: Partial<CoverLetterDraft> = {}): CoverLetterDraft {
  return {
    id: 'draft-123',
    userId: 'user-123',
    jobDescriptionId: 'jd-123',
    templateId: 'template-123',
    company: 'TechCorp',
    role: 'Senior Product Manager',
    status: 'draft',
    sections: [
      {
        id: 'intro-section',
        title: 'Introduction',
        slug: 'intro',
        type: 'intro',
        content: 'I am excited to apply for the Senior PM role at TechCorp...',
        order: 0,
      },
      {
        id: 'body-section-1',
        title: 'Experience',
        slug: 'paragraph',
        type: 'paragraph',
        content: 'In my previous role, I led a team of 15 engineers...',
        order: 1,
      },
      {
        id: 'closing-section',
        title: 'Closing',
        slug: 'closing',
        type: 'closing',
        content: 'I look forward to discussing this opportunity...',
        order: 2,
      },
    ],
    enhancedMatchData: {
      metrics: [
        { type: 'overall_score', value: 78, label: 'Overall Score' },
        { type: 'ats_score', value: 85, label: 'ATS Score' },
      ],
      coreRequirementDetails: [
        { id: 'req-1', requirement: 'Product strategy', demonstrated: true, evidence: 'Mentioned in intro', sectionIds: ['intro-section'] },
        { id: 'req-2', requirement: 'SQL proficiency', demonstrated: true, evidence: 'Mentioned in body', sectionIds: ['body-section-1'] },
        { id: 'req-3', requirement: 'A/B testing', demonstrated: false, evidence: 'Not mentioned', sectionIds: [] },
      ],
      preferredRequirementDetails: [
        { id: 'req-4', requirement: 'Team leadership', demonstrated: true, evidence: 'Mentioned in body', sectionIds: ['body-section-1'] },
        { id: 'req-5', requirement: 'Cross-functional collaboration', demonstrated: false, evidence: 'Not mentioned', sectionIds: [] },
      ],
      sectionGapInsights: [
        {
          sectionId: 'intro-section',
          sectionSlug: 'intro',
          sectionType: 'intro',
          promptSummary: 'Add quantified achievements',
          requirementGaps: [
            {
              id: 'gap-1',
              label: 'Missing quantified impact',
              severity: 'high',
              requirementType: 'core',
              rationale: 'No specific metrics',
              recommendation: 'Add 1-2 quantified achievements',
            },
          ],
          recommendedMoves: ['Add metrics'],
          nextAction: 'Add quantified achievements',
        },
      ],
    },
    llmFeedback: {
      rating: {
        criteria: [
          { id: 'crit-1', label: 'Specific examples', met: true, evidence: 'Good examples', suggestion: '' },
          { id: 'crit-2', label: 'Quantified achievements', met: false, evidence: 'Missing numbers', suggestion: 'Add metrics' },
        ],
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as CoverLetterDraft;
}

/**
 * Create mock match metrics
 */
function createMockMatchMetrics(overrides: Partial<MatchMetricsData> = {}): MatchMetricsData {
  return {
    overallScore: overrides.overallScore ?? 78,
    atsScore: overrides.atsScore ?? 85,
    goalsMatchScore: overrides.goalsMatchScore ?? 80,
    requirementsMetPercentage: overrides.requirementsMetPercentage ?? 67,
    ratingCriteria: overrides.ratingCriteria ?? [
      { id: 'crit-1', label: 'Specific examples', met: true, evidence: 'Good examples', suggestion: '' },
      { id: 'crit-2', label: 'Quantified achievements', met: false, evidence: 'Missing numbers', suggestion: 'Add metrics' },
    ],
    ...overrides,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('A+B Phase Interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Bucket 1: t+0 Static vs Skeleton Dynamic
  // ==========================================================================

  describe('t+0 static vs skeleton dynamic', () => {
    it('should render skeleton for all sections when no draft exists', () => {
      const templateSections = createMockTemplateSections();
      const mockMetrics = createMockMatchMetrics({ overallScore: 0 });
      
      const { container } = renderWithProviders(
        <CoverLetterDraftEditor
          draft={null}
          jobDescription={null}
          matchMetrics={mockMetrics}
          isStreaming={true}
          showProgressBanner={true}
          progressPercent={0}
          templateSections={templateSections}
          sectionDrafts={{}}
          savingSections={{}}
          sectionFocusContent={{}}
          onSectionChange={vi.fn()}
          onSectionSave={vi.fn()}
          onSectionFocus={vi.fn()}
          onSectionBlur={vi.fn()}
          onSectionDuplicate={vi.fn()}
          onSectionDelete={vi.fn()}
          onInsertBetweenSections={vi.fn()}
          onInsertFromLibrary={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
          onEditGoals={vi.fn()}
        />
      );

      // Verify skeleton state - should show loading cards
      const loadingCards = container.querySelectorAll('[class*="animate-pulse"]');
      expect(loadingCards.length).toBeGreaterThan(0);

      // Verify no textareas are rendered (skeleton state)
      const textareas = container.querySelectorAll('textarea');
      expect(textareas).toHaveLength(0);
    });

    it('should render static template sections at t+0 (before streaming starts)', () => {
      const templateSections = createMockTemplateSections();
      const mockMetrics = createMockMatchMetrics({ overallScore: 0 });
      
      renderWithProviders(
        <CoverLetterDraftEditor
          draft={null}
          jobDescription={null}
          matchMetrics={mockMetrics}
          isStreaming={true}
          templateSections={templateSections}
          showProgressBanner={true}
          progressPercent={0}
          sectionDrafts={{}}
          savingSections={{}}
          sectionFocusContent={{}}
          onSectionChange={vi.fn()}
          onSectionSave={vi.fn()}
          onSectionFocus={vi.fn()}
          onSectionBlur={vi.fn()}
          onSectionDuplicate={vi.fn()}
          onSectionDelete={vi.fn()}
          onInsertBetweenSections={vi.fn()}
          onInsertFromLibrary={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
          onEditGoals={vi.fn()}
        />
      );

      // Template sections should be in the document (as skeleton placeholders)
      // Section titles come from template
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Experience Paragraph 1')).toBeInTheDocument();
      expect(screen.getByText('Closing')).toBeInTheDocument();
    });

    it('should show progress banner at t+0', () => {
      const mockMetrics = createMockMatchMetrics({ overallScore: 0 });
      
      renderWithProviders(
        <CoverLetterDraftEditor
          draft={null}
          jobDescription={null}
          matchMetrics={mockMetrics}
          isStreaming={true}
          showProgressBanner={true}
          progressPercent={0}
          templateSections={createMockTemplateSections()}
          sectionDrafts={{}}
          savingSections={{}}
          sectionFocusContent={{}}
          onSectionChange={vi.fn()}
          onSectionSave={vi.fn()}
          onSectionFocus={vi.fn()}
          onSectionBlur={vi.fn()}
          onSectionDuplicate={vi.fn()}
          onSectionDelete={vi.fn()}
          onInsertBetweenSections={vi.fn()}
          onInsertFromLibrary={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
          onEditGoals={vi.fn()}
        />
      );

      // Progress banner should be visible
      expect(screen.getByText(/Drafting your cover letter/i)).toBeInTheDocument();
      expect(screen.getByText(/This may take 60–90 seconds/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Bucket 2: A-Phase Accordions Render Pre-Draft
  // ==========================================================================

  describe('A-phase accordions render pre-draft (ENABLE_A_PHASE_INSIGHTS=true)', () => {
    it('should render A-phase accordions in toolbar when insights are available', () => {
      const aPhaseInsights = createMockAPhaseInsights();
      const mockMetrics = createMockMatchMetrics();

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={undefined}
          aPhaseInsights={aPhaseInsights}
          sections={[]}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // A-phase accordion should be present
      expect(screen.getByText('Analysis Insights')).toBeInTheDocument();
    });

    it('should display role insights in A-phase accordion', async () => {
      const aPhaseInsights = createMockAPhaseInsights();
      const mockMetrics = createMockMatchMetrics();

      const { container } = renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={undefined}
          aPhaseInsights={aPhaseInsights}
          sections={[]}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // Click the A-phase accordion to expand
      const analysisInsightsButton = screen.getByText('Analysis Insights').closest('button');
      expect(analysisInsightsButton).toBeInTheDocument();
      
      analysisInsightsButton?.click();

      // Wait for expansion and check for role insights
      await waitFor(() => {
        expect(screen.getByText('Role Alignment')).toBeInTheDocument();
      });

      expect(screen.getByText(/Senior PM/i)).toBeInTheDocument();
      expect(screen.getByText(/Good fit/i)).toBeInTheDocument();
    });

    it('should display JD requirement summary in A-phase accordion', async () => {
      const aPhaseInsights = createMockAPhaseInsights();
      const mockMetrics = createMockMatchMetrics();

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={undefined}
          aPhaseInsights={aPhaseInsights}
          sections={[]}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // Click to expand
      const analysisInsightsButton = screen.getByText('Analysis Insights').closest('button');
      analysisInsightsButton?.click();

      await waitFor(() => {
        expect(screen.getByText(/Requirements from JD/i)).toBeInTheDocument();
      });

      // Check for preliminary requirement counts
      const accordionContent = await screen.findByText(/Requirements from JD/i);
      const accordionDiv = accordionContent.closest('div[class*="p-2"]');
      
      expect(within(accordionDiv!).getByText(/Core:/i)).toBeInTheDocument();
      expect(within(accordionDiv!).getByText(/Preferred:/i)).toBeInTheDocument();
    });

    it('should display Match with Strengths in A-phase accordion', async () => {
      const aPhaseInsights = createMockAPhaseInsights();
      const mockMetrics = createMockMatchMetrics();

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={undefined}
          aPhaseInsights={aPhaseInsights}
          sections={[]}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // Click to expand
      const analysisInsightsButton = screen.getByText('Analysis Insights').closest('button');
      analysisInsightsButton?.click();

      await waitFor(() => {
        expect(screen.getByText('Match with Strengths')).toBeInTheDocument();
      });

      expect(screen.getByText(/Growth product work/i)).toBeInTheDocument();
      expect(screen.getByText(/Technical leadership/i)).toBeInTheDocument();
    });

    it('should display company context in A-phase accordion', async () => {
      const aPhaseInsights = createMockAPhaseInsights();
      const mockMetrics = createMockMatchMetrics();

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={undefined}
          aPhaseInsights={aPhaseInsights}
          sections={[]}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // Click to expand
      const analysisInsightsButton = screen.getByText('Analysis Insights').closest('button');
      analysisInsightsButton?.click();

      await waitFor(() => {
        expect(screen.getByText('Company Context')).toBeInTheDocument();
      });

      expect(screen.getByText(/Technology/i)).toBeInTheDocument();
      expect(screen.getByText(/Series B/i)).toBeInTheDocument();
      expect(screen.getByText(/SaaS, Enterprise/i)).toBeInTheDocument();
    });

    it('should NOT show A-phase accordion when insights are null (legacy behavior)', () => {
      const mockMetrics = createMockMatchMetrics();

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={undefined}
          aPhaseInsights={null}
          sections={[]}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // A-phase accordion should NOT be present
      expect(screen.queryByText('Analysis Insights')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Bucket 3: Draft Completion Flips Badges to Draft Data
  // ==========================================================================

  describe('Draft completion flips badges/score to draft data', () => {
    it('should show draft-based scores once draft exists', () => {
      const draft = createMockDraft();
      const mockMetrics = createMockMatchMetrics({ overallScore: 78, atsScore: 85 });

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={draft.enhancedMatchData}
          sections={draft.sections}
          isLoading={false}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // Overall score should be from draft
      expect(screen.getByText('78%')).toBeInTheDocument();
      
      // Core requirements count should be from draft
      expect(screen.getByText('2/3')).toBeInTheDocument(); // 2 demonstrated out of 3 total
      
      // Preferred requirements count should be from draft
      expect(screen.getByText('1/2')).toBeInTheDocument(); // 1 demonstrated out of 2 total
    });

    it('should show gaps count from draft enhancedMatchData', () => {
      const draft = createMockDraft();
      const mockMetrics = createMockMatchMetrics();

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={draft.enhancedMatchData}
          sections={draft.sections}
          isLoading={false}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // Gaps badge should show count from draft
      expect(screen.getByText('Gaps')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // 1 section with gaps
    });

    it('should hide progress banner once draft exists', () => {
      const draft = createMockDraft();
      const mockMetrics = createMockMatchMetrics();

      renderWithProviders(
        <CoverLetterDraftEditor
          draft={draft}
          jobDescription={null}
          matchMetrics={mockMetrics}
          isStreaming={false}
          showProgressBanner={false}
          progressPercent={100}
          sectionDrafts={{}}
          savingSections={{}}
          sectionFocusContent={{}}
          onSectionChange={vi.fn()}
          onSectionSave={vi.fn()}
          onSectionFocus={vi.fn()}
          onSectionBlur={vi.fn()}
          onSectionDuplicate={vi.fn()}
          onSectionDelete={vi.fn()}
          onInsertBetweenSections={vi.fn()}
          onInsertFromLibrary={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
          onEditGoals={vi.fn()}
        />
      );

      // Progress banner should NOT be visible
      expect(screen.queryByText(/Drafting your cover letter/i)).not.toBeInTheDocument();
    });

    it('should render textareas for editing once draft exists', () => {
      const draft = createMockDraft();
      const mockMetrics = createMockMatchMetrics();

      const { container } = renderWithProviders(
        <CoverLetterDraftEditor
          draft={draft}
          jobDescription={null}
          matchMetrics={mockMetrics}
          isStreaming={false}
          sectionDrafts={{
            'intro-section': draft.sections[0].content,
            'body-section-1': draft.sections[1].content,
            'closing-section': draft.sections[2].content,
          }}
          savingSections={{}}
          sectionFocusContent={{}}
          onSectionChange={vi.fn()}
          onSectionSave={vi.fn()}
          onSectionFocus={vi.fn()}
          onSectionBlur={vi.fn()}
          onSectionDuplicate={vi.fn()}
          onSectionDelete={vi.fn()}
          onInsertBetweenSections={vi.fn()}
          onInsertFromLibrary={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
          onEditGoals={vi.fn()}
        />
      );

      // Textareas should be rendered for each section
      const textareas = container.querySelectorAll('textarea');
      expect(textareas).toHaveLength(3); // intro, body, closing
    });
  });

  // ==========================================================================
  // Bucket 4: A-Phase Accordions Remain Visible Post-Draft
  // ==========================================================================

  describe('A-phase accordions remain visible post-draft', () => {
    it('should show both A-phase accordions and draft-based badges after draft exists', () => {
      const draft = createMockDraft();
      const aPhaseInsights = createMockAPhaseInsights();
      const mockMetrics = createMockMatchMetrics({ overallScore: 78 });

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={draft.enhancedMatchData}
          aPhaseInsights={aPhaseInsights}
          sections={draft.sections}
          isLoading={false}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // Draft-based badges should be visible
      expect(screen.getByText('78%')).toBeInTheDocument(); // Overall score from draft
      expect(screen.getByText('2/3')).toBeInTheDocument(); // Core requirements from draft

      // A-phase accordion should still be visible
      expect(screen.getByText('Analysis Insights')).toBeInTheDocument();
    });

    it('should NOT change draft-based counts when A-phase data is present', () => {
      const draft = createMockDraft();
      // A-phase has different counts (5 core, 3 pref) vs draft (3 core, 2 pref)
      const aPhaseInsights = createMockAPhaseInsights({
        jdRequirementSummary: { coreTotal: 5, preferredTotal: 3 },
      });
      const mockMetrics = createMockMatchMetrics();

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={draft.enhancedMatchData}
          aPhaseInsights={aPhaseInsights}
          sections={draft.sections}
          isLoading={false}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // Core requirements badge should show DRAFT counts, not A-phase
      // Draft has 2 demonstrated out of 3 total
      expect(screen.getByText('2/3')).toBeInTheDocument();
      
      // Preferred requirements badge should show DRAFT counts
      // Draft has 1 demonstrated out of 2 total
      expect(screen.getByText('1/2')).toBeInTheDocument();
      
      // A-phase counts should only appear in the accordion (not in badges)
      const analysisInsightsButton = screen.getByText('Analysis Insights').closest('button');
      analysisInsightsButton?.click();
      
      // A-phase accordion should show preliminary counts
      waitFor(() => {
        const accordionContent = screen.getByText(/Requirements from JD/i).closest('div');
        expect(within(accordionContent!).getByText(/5/)).toBeInTheDocument(); // A-phase coreTotal
        expect(within(accordionContent!).getByText(/3/)).toBeInTheDocument(); // A-phase preferredTotal
      });
    });
  });

  // ==========================================================================
  // Bucket 5: Edge Cases
  // ==========================================================================

  describe('Edge cases', () => {
    it('should handle missing company context gracefully', () => {
      const aPhaseInsights = createMockAPhaseInsights({
        companyContext: undefined,
        stageFlags: {
          ...createMockAPhaseInsights().stageFlags,
          hasCompanyContext: false,
        },
      });
      const mockMetrics = createMockMatchMetrics();

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={undefined}
          aPhaseInsights={aPhaseInsights}
          sections={[]}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // A-phase accordion should still render
      expect(screen.getByText('Analysis Insights')).toBeInTheDocument();

      // Click to expand
      const analysisInsightsButton = screen.getByText('Analysis Insights').closest('button');
      analysisInsightsButton?.click();

      // Company context section should NOT be present
      waitFor(() => {
        expect(screen.queryByText('Company Context')).not.toBeInTheDocument();
      });

      // Other sections should still be present
      waitFor(() => {
        expect(screen.getByText('Role Alignment')).toBeInTheDocument();
      });
    });

    it('should handle missing PM Levels (roleInsights) gracefully', () => {
      const aPhaseInsights = createMockAPhaseInsights({
        roleInsights: undefined,
        stageFlags: {
          ...createMockAPhaseInsights().stageFlags,
          hasRoleInsights: false,
        },
      });
      const mockMetrics = createMockMatchMetrics();

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={undefined}
          aPhaseInsights={aPhaseInsights}
          sections={[]}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // Click to expand
      const analysisInsightsButton = screen.getByText('Analysis Insights').closest('button');
      analysisInsightsButton?.click();

      // Role insights section should NOT be present
      waitFor(() => {
        expect(screen.queryByText('Role Alignment')).not.toBeInTheDocument();
      });

      // Other sections should still be present
      waitFor(() => {
        expect(screen.getByText('Match with Strengths')).toBeInTheDocument();
      });
    });

    it('should handle sparse JD (minimal requirements) gracefully', async () => {
      const aPhaseInsights = createMockAPhaseInsights({
        jdRequirementSummary: { coreTotal: 1, preferredTotal: 0 },
      });
      const mockMetrics = createMockMatchMetrics();

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={undefined}
          aPhaseInsights={aPhaseInsights}
          sections={[]}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // Click to expand
      const analysisInsightsButton = screen.getByText('Analysis Insights').closest('button');
      analysisInsightsButton?.click();

      // Should show counts even if sparse
      await waitFor(async () => {
        const reqSection = await screen.findByText(/Requirements from JD/i);
        const reqDiv = reqSection.closest('div[class*="p-2"]');
        expect(within(reqDiv!).getByText(/Core:/i)).toBeInTheDocument();
        expect(within(reqDiv!).getByText(/Preferred:/i)).toBeInTheDocument();
      });
    });

    it('should handle A-phase stage in progress (partial data)', () => {
      const aPhaseInsights = createMockAPhaseInsights({
        // Only jdAnalysis complete, other stages pending
        mws: undefined,
        companyContext: undefined,
        stageFlags: {
          hasJdAnalysis: true,
          hasRequirementAnalysis: false,
          hasGoalsAndStrengths: false,
          hasRoleInsights: true,
          hasJdRequirementSummary: true,
          hasMws: false,
          hasCompanyContext: false,
          phaseComplete: false,
        },
      });
      const mockMetrics = createMockMatchMetrics();

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={undefined}
          aPhaseInsights={aPhaseInsights}
          sections={[]}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // A-phase accordion should still render with partial data
      expect(screen.getByText('Analysis Insights')).toBeInTheDocument();

      // Click to expand
      const analysisInsightsButton = screen.getByText('Analysis Insights').closest('button');
      analysisInsightsButton?.click();

      // Role insights should be present (from jdAnalysis stage)
      waitFor(() => {
        expect(screen.getByText('Role Alignment')).toBeInTheDocument();
      });

      // MWS and company context should NOT be present (stages not complete)
      waitFor(() => {
        expect(screen.queryByText('Match with Strengths')).not.toBeInTheDocument();
        expect(screen.queryByText('Company Context')).not.toBeInTheDocument();
      });
    });

    it('should handle draft without enhancedMatchData gracefully', () => {
      const draft = createMockDraft({ enhancedMatchData: undefined });
      const mockMetrics = createMockMatchMetrics({ overallScore: 27 }); // Default score when no criteria
      const aPhaseInsights = createMockAPhaseInsights();

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={undefined}
          aPhaseInsights={aPhaseInsights}
          sections={draft.sections}
          isLoading={false}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // Should show default score (27% for draft, not finalized)
      expect(screen.getByText('27%')).toBeInTheDocument();

      // Gaps badge should NOT appear (no gap data)
      expect(screen.queryByText('Gaps')).not.toBeInTheDocument();

      // A-phase accordion should still be visible
      expect(screen.getByText('Analysis Insights')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Bucket 6: Feature Flag Behavior (ENABLE_A_PHASE_INSIGHTS=false)
  // ==========================================================================

  describe('Feature flag disabled (ENABLE_A_PHASE_INSIGHTS=false)', () => {
    it('should NOT show A-phase accordion when aPhaseInsights is null', () => {
      const draft = createMockDraft();
      const mockMetrics = createMockMatchMetrics({ overallScore: 78 });

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={draft.enhancedMatchData}
          aPhaseInsights={null} // Simulates ENABLE_A_PHASE_INSIGHTS=false
          sections={draft.sections}
          isLoading={false}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // A-phase accordion should NOT be present
      expect(screen.queryByText('Analysis Insights')).not.toBeInTheDocument();

      // Draft-based badges should still be visible
      expect(screen.getByText('78%')).toBeInTheDocument();
      expect(screen.getByText('2/3')).toBeInTheDocument();
    });

    it('should NOT show preliminary JD counts when A-phase disabled', () => {
      const mockMetrics = createMockMatchMetrics();

      renderWithProviders(
        <MatchMetricsToolbar
          metrics={mockMetrics}
          enhancedMatchData={undefined}
          aPhaseInsights={null} // Feature flag disabled
          sections={[]}
          onEditGoals={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
        />
      );

      // No A-phase accordion
      expect(screen.queryByText('Analysis Insights')).not.toBeInTheDocument();

      // No preliminary requirement counts
      expect(screen.queryByText(/Requirements from JD/i)).not.toBeInTheDocument();
    });

    it('should show legacy behavior (no streaming data) when flag disabled', () => {
      const templateSections = createMockTemplateSections();
      const mockMetrics = createMockMatchMetrics({ overallScore: 0 });
      
      renderWithProviders(
        <CoverLetterDraftEditor
          draft={null}
          jobDescription={null}
          matchMetrics={mockMetrics}
          isStreaming={true}
          showProgressBanner={true}
          progressPercent={0}
          progressState={{
            hasAnalysis: false,
            isJobStreaming: false,
            isGeneratingDraft: true,
            aPhaseInsights: null, // Feature flag disabled
          }}
          templateSections={templateSections}
          aPhaseInsights={null} // Feature flag disabled
          sectionDrafts={{}}
          savingSections={{}}
          sectionFocusContent={{}}
          onSectionChange={vi.fn()}
          onSectionSave={vi.fn()}
          onSectionFocus={vi.fn()}
          onSectionBlur={vi.fn()}
          onSectionDuplicate={vi.fn()}
          onSectionDelete={vi.fn()}
          onInsertBetweenSections={vi.fn()}
          onInsertFromLibrary={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
          onEditGoals={vi.fn()}
        />
      );

      // Progress banner should NOT show A-phase stage chips
      expect(screen.queryByText(/Analyzing job description/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Extracting requirements/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Matching with goals and strengths/i)).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Bucket 7: Progress State Transitions
  // ==========================================================================

  describe('Progress state transitions', () => {
    it('should show stage chips during A-phase streaming', () => {
      const aPhaseInsights = createMockAPhaseInsights({
        stageFlags: {
          hasJdAnalysis: true,
          hasRequirementAnalysis: false,
          hasGoalsAndStrengths: false,
          hasRoleInsights: true,
          hasJdRequirementSummary: true,
          hasMws: false,
          hasCompanyContext: false,
          phaseComplete: false,
        },
      });
      const mockMetrics = createMockMatchMetrics({ overallScore: 0 });

      renderWithProviders(
        <CoverLetterDraftEditor
          draft={null}
          jobDescription={null}
          matchMetrics={mockMetrics}
          isStreaming={true}
          showProgressBanner={true}
          progressPercent={10}
          progressState={{
            hasAnalysis: false,
            isJobStreaming: true,
            isGeneratingDraft: false,
            aPhaseInsights,
          }}
          templateSections={createMockTemplateSections()}
          aPhaseInsights={aPhaseInsights}
          sectionDrafts={{}}
          savingSections={{}}
          sectionFocusContent={{}}
          onSectionChange={vi.fn()}
          onSectionSave={vi.fn()}
          onSectionFocus={vi.fn()}
          onSectionBlur={vi.fn()}
          onSectionDuplicate={vi.fn()}
          onSectionDelete={vi.fn()}
          onInsertBetweenSections={vi.fn()}
          onInsertFromLibrary={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
          onEditGoals={vi.fn()}
        />
      );

      // Stage chip for jdAnalysis should be highlighted
      expect(screen.getByText(/Analyzing job description/i)).toBeInTheDocument();
      
      // Other stage chips should be present but not highlighted (text-muted-foreground)
      expect(screen.getByText(/Extracting requirements/i)).toBeInTheDocument();
      expect(screen.getByText(/Matching with goals and strengths/i)).toBeInTheDocument();
    });

    it('should update progress bar as stages complete', () => {
      const mockMetrics = createMockMatchMetrics({ overallScore: 0 });
      
      const { rerender, container } = renderWithProviders(
        <CoverLetterDraftEditor
          draft={null}
          jobDescription={null}
          matchMetrics={mockMetrics}
          isStreaming={true}
          showProgressBanner={true}
          progressPercent={10} // jdAnalysis complete
          progressState={{
            hasAnalysis: false,
            isJobStreaming: true,
            isGeneratingDraft: false,
            aPhaseInsights: createMockAPhaseInsights({
              stageFlags: {
                hasJdAnalysis: true,
                hasRequirementAnalysis: false,
                hasGoalsAndStrengths: false,
                hasRoleInsights: true,
                hasJdRequirementSummary: true,
                hasMws: false,
                hasCompanyContext: false,
                phaseComplete: false,
              },
            }),
          }}
          templateSections={createMockTemplateSections()}
          sectionDrafts={{}}
          savingSections={{}}
          sectionFocusContent={{}}
          onSectionChange={vi.fn()}
          onSectionSave={vi.fn()}
          onSectionFocus={vi.fn()}
          onSectionBlur={vi.fn()}
          onSectionDuplicate={vi.fn()}
          onSectionDelete={vi.fn()}
          onInsertBetweenSections={vi.fn()}
          onInsertFromLibrary={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
          onEditGoals={vi.fn()}
        />
      );

      // Progress bar should be at 10%
      let progressBar = container.querySelector('[style*="width: 10%"]');
      expect(progressBar).toBeInTheDocument();

      // Simulate requirementAnalysis complete
      rerender(
        <CoverLetterDraftEditor
          draft={null}
          jobDescription={null}
          matchMetrics={mockMetrics}
          isStreaming={true}
          showProgressBanner={true}
          progressPercent={20} // requirementAnalysis complete
          progressState={{
            hasAnalysis: false,
            isJobStreaming: true,
            isGeneratingDraft: false,
            aPhaseInsights: createMockAPhaseInsights({
              stageFlags: {
                hasJdAnalysis: true,
                hasRequirementAnalysis: true,
                hasGoalsAndStrengths: false,
                hasRoleInsights: true,
                hasJdRequirementSummary: true,
                hasMws: false,
                hasCompanyContext: false,
                phaseComplete: false,
              },
            }),
          }}
          templateSections={createMockTemplateSections()}
          sectionDrafts={{}}
          savingSections={{}}
          sectionFocusContent={{}}
          onSectionChange={vi.fn()}
          onSectionSave={vi.fn()}
          onSectionFocus={vi.fn()}
          onSectionBlur={vi.fn()}
          onSectionDuplicate={vi.fn()}
          onSectionDelete={vi.fn()}
          onInsertBetweenSections={vi.fn()}
          onInsertFromLibrary={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
          onEditGoals={vi.fn()}
        />
      );

      // Progress bar should advance to 20%
      progressBar = container.querySelector('[style*="width: 20%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should complete progress at 100% when draft arrives', () => {
      const draft = createMockDraft();
      const mockMetrics = createMockMatchMetrics();

      const { container } = renderWithProviders(
        <CoverLetterDraftEditor
          draft={draft}
          jobDescription={null}
          matchMetrics={mockMetrics}
          isStreaming={false}
          showProgressBanner={false}
          progressPercent={100}
          templateSections={createMockTemplateSections()}
          sectionDrafts={{}}
          savingSections={{}}
          sectionFocusContent={{}}
          onSectionChange={vi.fn()}
          onSectionSave={vi.fn()}
          onSectionFocus={vi.fn()}
          onSectionBlur={vi.fn()}
          onSectionDuplicate={vi.fn()}
          onSectionDelete={vi.fn()}
          onInsertBetweenSections={vi.fn()}
          onInsertFromLibrary={vi.fn()}
          onEnhanceSection={vi.fn()}
          onAddMetrics={vi.fn()}
          onEditGoals={vi.fn()}
        />
      );

      // Progress banner should be hidden
      expect(screen.queryByText(/Drafting your cover letter/i)).not.toBeInTheDocument();

      // Content should be visible (not skeleton)
      const textareas = container.querySelectorAll('textarea');
      expect(textareas.length).toBeGreaterThan(0);
    });
  });
});

