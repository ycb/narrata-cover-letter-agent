import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import {
  applySlotFillResponsesToSections,
  normalizeSectionGapInsightsForPersist,
  parseLlmSlotTokens,
} from '../cover-letter-phase-b.ts';

const baseSections = [
  {
    id: 'introduction-1',
    templateSectionId: 'tmpl-intro',
    slug: 'introduction',
    title: 'Introduction',
    type: 'static',
    order: 1,
    content: 'Dear Hiring Team at [COMPANY-NAME], [LLM:problem statement]',
    source: { kind: 'template_static', entityId: null },
    metadata: { requirementsMatched: [], tags: [], wordCount: 7 },
    status: { hasGaps: false, gapIds: [], isModified: false, lastUpdatedAt: '2026-03-19T00:00:00.000Z' },
    analytics: { atsScore: 0 },
  },
  {
    id: 'closing-2',
    templateSectionId: 'tmpl-closing',
    slug: 'closing',
    title: 'Closing',
    type: 'closing',
    order: 2,
    content: 'Best,\nPeter',
    source: { kind: 'template_static', entityId: null },
    metadata: { requirementsMatched: [], tags: [], wordCount: 2 },
    status: { hasGaps: false, gapIds: [], isModified: false, lastUpdatedAt: '2026-03-19T00:00:00.000Z' },
    analytics: { atsScore: 0 },
  },
];

Deno.test('normalizeSectionGapInsightsForPersist returns null for malformed payloads', () => {
  const malformed = [
    {
      sectionId: 'introduction-1',
      sectionSlug: 'introduction',
      sectionType: 'introduction',
      sectionTitle: 'Introduction',
      evidenceQuote: 'missing requirementGaps array',
    },
  ];

  const normalized = normalizeSectionGapInsightsForPersist(malformed, baseSections as any);
  assertEquals(normalized, null);
});

Deno.test('normalizeSectionGapInsightsForPersist preserves one valid entry per section', () => {
  const normalized = normalizeSectionGapInsightsForPersist(
    [
      {
        sectionId: 'introduction-1',
        sectionSlug: 'introduction',
        sectionType: 'introduction',
        sectionTitle: 'Introduction',
        promptSummary: 'Lead with clearer role fit.',
        requirementGaps: [],
        recommendedMoves: ['Tighten opening'],
      },
      {
        sectionId: 'closing-2',
        sectionSlug: 'closing',
        sectionType: 'closing',
        sectionTitle: 'Closing',
        promptSummary: 'Confident close.',
        requirementGaps: [],
        recommendedMoves: [],
      },
    ],
    baseSections as any,
  );

  assertExists(normalized);
  assertEquals(normalized?.length, 2);
  assertEquals(normalized?.[0].sectionId, 'introduction-1');
  assertEquals(Array.isArray(normalized?.[0].requirementGaps), true);
});

Deno.test('applySlotFillResponsesToSections preserves unresolved tokens instead of writing NOT_FOUND', () => {
  const [token] = parseLlmSlotTokens(baseSections[0].content);
  const result = applySlotFillResponsesToSections(baseSections as any, [
    {
      id: token.id,
      status: 'NOT_FOUND',
      fill: '',
    },
  ]);

  assertEquals(result.unresolvedTokenCount, 1);
  assertEquals(
    result.sections[0].content,
    'Dear Hiring Team at [COMPANY-NAME], [LLM:problem statement]',
  );
});
