import React, { useMemo, useState } from 'react';
import { MatchMetricsToolbar } from '@/components/cover-letters/MatchMetricsToolbar';
import type { MatchMetricsData, MatchJobDescription } from '@/components/cover-letters/useMatchMetricsDetails';
import type { APhaseInsights } from '@/types/jobs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const mockJD: MatchJobDescription = {
  role: 'Senior PM, Growth',
  company: 'ExampleCo',
  location: 'Remote',
  salary: '$140k-$170k',
  workType: 'Remote',
  structuredData: {
    standardRequirements: ['Experimentation', 'Activation', 'Analytics'],
    preferredRequirements: ['Messaging', 'Lifecycle'],
  },
};

const mockJDText = `
Senior Product Manager, Growth

You will drive experimentation and activation across web and mobile to improve trial→paid conversion and long-term retention.
Requirements:
- Lead experimentation roadmap across activation and lifecycle.
- Own analytics/insights to inform growth decisions.
- Collaborate with Eng/Design/Data to ship and measure experiments.

Preferred:
- Experience with messaging/personalization at scale.
- Lifecycle strategy across multiple user segments.
`;

const mockMetrics: MatchMetricsData = {
  atsScore: 0,
  coreRequirementsMet: { met: 0, total: 0 },
  preferredRequirementsMet: { met: 0, total: 0 },
};

export default function GoNoGoDemo() {
  const [stage, setStage] = useState<'skeleton' | 'partial' | 'ready'>('skeleton');
  const isLoading = stage !== 'ready';

  const aPhaseInsights = useMemo<APhaseInsights | undefined>(() => {
    if (stage === 'skeleton') {
      return {
        stageFlags: {
          hasJdAnalysis: false,
          hasRequirementAnalysis: false,
          hasGoalsAndStrengths: false,
          hasRoleInsights: false,
          hasJdRequirementSummary: false,
          hasMws: false,
          hasCompanyContext: false,
          hasRequirementAnalysisData: false,
          phaseComplete: false,
        },
      };
    }

    const requirementAnalysis =
      stage === 'partial'
        ? undefined
        : {
            coreRequirements: [
              { id: 'core-0', text: 'Experimentation', met: true, evidence: 'Prior experimentation roadmap ownership.' },
              { id: 'core-1', text: 'Activation', met: true, evidence: 'Owned onboarding funnel improvements.' },
              { id: 'core-2', text: 'Analytics', met: false, evidence: '' },
            ],
            preferredRequirements: [
              { id: 'pref-0', text: 'Messaging', met: false, evidence: '' },
              { id: 'pref-1', text: 'Lifecycle', met: true, evidence: 'Lifecycle strategy across segments.' },
            ],
            requirementsMet: 3,
            totalRequirements: 5,
          };

    return {
      jdRequirementSummary: { coreTotal: 3, preferredTotal: 2 },
      mws:
        stage === 'partial'
          ? undefined
          : {
              summaryScore: 2,
              details: [
                { label: 'Growth product work', strengthLevel: 'strong', explanation: 'Track record in activation.' },
                { label: 'Experiment design', strengthLevel: 'moderate', explanation: 'Repeated experimentation cycles.' },
                { label: 'Cross-functional leadership', strengthLevel: 'light', explanation: 'Partnered with Eng/Data/Design.' },
              ],
            },
      roleInsights:
        stage === 'partial'
          ? undefined
          : {
              inferredRoleLevel: 'Senior PM',
              inferredRoleScope: 'product',
              scopeMatch: { scopeRelation: 'stretch' },
              titleMatch: { exactTitleMatch: false, adjacentTitleMatch: true },
            },
      requirementAnalysis,
      stageFlags: {
        hasJdAnalysis: true,
        hasRequirementAnalysis: stage === 'ready',
        hasGoalsAndStrengths: stage === 'ready',
        hasRoleInsights: stage === 'ready',
        hasJdRequirementSummary: true,
        hasMws: stage === 'ready',
        hasCompanyContext: false,
        hasRequirementAnalysisData: stage === 'ready',
        phaseComplete: stage === 'ready',
      },
    };
  }, [stage]);

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <Card className="p-4 flex items-center gap-4">
        <Select value={stage} onValueChange={(v) => setStage(v as any)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="skeleton">Skeleton</SelectItem>
            <SelectItem value="partial">Partial (counts only)</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={() => setStage('skeleton')}>Reset</Button>
      </Card>

      <MatchMetricsToolbar
        layout="horizontal"
        mode="goNoGo"
        isLoading={isLoading}
        metrics={mockMetrics}
        jobDescription={mockJD}
        aPhaseInsights={aPhaseInsights}
      />

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Job description</h3>
          <span className="text-sm text-muted-foreground">
            {mockJD.company} — {mockJD.role}
          </span>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
          <pre className="whitespace-pre-wrap text-sm text-foreground">{mockJDText.trim()}</pre>
        </div>
      </Card>
    </div>
  );
}
