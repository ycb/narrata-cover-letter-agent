import { describe, it, expect } from 'vitest';
import type { JobStreamState } from '@/types/jobs';
import { useAPhaseInsights } from '@/hooks/useAPhaseInsights';
import { renderHook } from '@testing-library/react';

describe('useAPhaseInsights', () => {
  it('unwraps double-nested stage data (stage.data.data.*)', () => {
    const jobState: JobStreamState = {
      jobId: 'job-1',
      type: 'coverLetter',
      status: 'running',
      stages: {
        jdAnalysis: {
          status: 'complete',
          data: {
            data: {
              jdRequirementSummary: { coreTotal: 9, preferredTotal: 3 },
              roleInsights: { inferredRoleLevel: 'Staff' },
            },
          },
        },
        requirementAnalysis: {
          status: 'complete',
          data: {
            data: {
              coreRequirements: [],
              preferredRequirements: [],
              requirementsMet: 0,
              totalRequirements: 0,
            },
          },
        },
        goalsAndStrengths: {
          status: 'complete',
          data: {
            data: {
              mws: { summaryScore: 2, details: [] },
            },
          },
        },
      },
    };

    const { result } = renderHook(() => useAPhaseInsights(jobState));
    expect(result.current?.jdRequirementSummary?.coreTotal).toBe(9);
    expect(result.current?.mws?.summaryScore).toBe(2);
    expect(result.current?.stageFlags.hasJdRequirementSummary).toBe(true);
    expect(result.current?.stageFlags.hasMws).toBe(true);
  });
});

