import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

import { GapDetectionService } from './gapDetectionService';

const KRAFTON_ROLE_SUMMARY = `Delivered an industry-defining AI gaming initiative at Krafton by securing a Joint Development Agreement (JDA) with NVIDIA, aligning Jensen Huang with priorities, and advancing co-playable character (CPC) and AI Duo technologies for scalable in-client AI across titles. Negotiated multi-million-dollar licensing, distribution, and co-marketing agreements at Krafton with PlayStation, Nintendo, Steam, Apple, Google, and Epic Games Store by securing funding, visibility commitments, and favorable terms that strengthened global reach. Secured a landmark long-term Unreal Engine agreement at Krafton with Epic Games, achieving a 35% reduction in licensing and royalty expenses. Created a new PUBG eSports revenue stream by structuring data licensing partnerships with GRID and BAYES, enabling entry into the $10B betting ecosystem.`;

describe('GapDetectionService role gap heuristics', () => {
  it('treats detailed role summaries as specific', () => {
    const meetsSpecificity = GapDetectionService.roleDescriptionMeetsSpecificity({
      description: KRAFTON_ROLE_SUMMARY,
    });

    expect(meetsSpecificity).toBe(true);
  });

  it('does not create false-positive role gaps for quantified, detailed summaries', async () => {
    const gaps = await GapDetectionService.detectWorkItemGaps(
      'user-1',
      'work-item-1',
      {
        title: 'Head of Global Business Development',
        description: KRAFTON_ROLE_SUMMARY,
        metrics: [
          { value: '35%', context: 'reduction in licensing and royalty expenses' },
          { value: '$10B', context: 'betting ecosystem opportunity' },
        ],
        achievements: [],
        startDate: '2021-02-01',
        endDate: '2025-11-01',
      },
      []
    );

    expect(gaps.some((gap) => gap.gap_category === 'role_description_needs_specifics')).toBe(false);
    expect(gaps.some((gap) => gap.gap_category === 'insufficient_role_metrics')).toBe(false);
    expect(gaps.some((gap) => gap.gap_category === 'missing_role_metrics')).toBe(false);
  });

  it('still flags missing role metrics for thin descriptions without quantified evidence', async () => {
    const gaps = await GapDetectionService.detectWorkItemGaps(
      'user-2',
      'work-item-2',
      {
        title: 'Product Manager',
        description: 'Led roadmap planning and supported cross-functional execution.',
        metrics: [],
        achievements: [],
        startDate: '2020-01-01',
        endDate: '2024-01-01',
      },
      []
    );

    expect(gaps.some((gap) => gap.gap_category === 'missing_role_metrics')).toBe(true);
  });
});
