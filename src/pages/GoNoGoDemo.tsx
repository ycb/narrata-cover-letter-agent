import React, { useMemo, useState } from 'react';
import { GoNoGoGate } from '@/components/cover-letters/GoNoGoGate';
import type { GoNoGoAnalysis } from '@/services/goNoGoService';
import type { MatchMetricsData, MatchJobDescription } from '@/components/cover-letters/useMatchMetricsDetails';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const mockJD: MatchJobDescription = {
  role: 'Senior PM, Growth',
  company: 'ExampleCo',
  coreRequirements: ['Experimentation', 'Activation', 'Analytics'],
  preferredRequirements: ['Messaging', 'Lifecycle'],
};

const mockMetrics: MatchMetricsData = {
  // minimal mock; toolbar can handle partial data
  overallScore: 72,
  atsScore: 68,
  goals: {
    met: 0,
    total: 7,
    items: [
      { requirement: 'Career growth', demonstrated: false },
      { requirement: 'Team size', demonstrated: false },
      { requirement: 'Domain', demonstrated: false },
    ],
  },
  strengths: {
    met: 0,
    total: 6,
    items: [
      { requirement: 'Experimentation track', demonstrated: false },
      { requirement: 'Growth playbook', demonstrated: false },
    ],
  },
  coreRequirements: {
    met: 2,
    total: 3,
    items: [
      { requirement: 'Experimentation', demonstrated: true },
      { requirement: 'Activation', demonstrated: true },
      { requirement: 'Analytics', demonstrated: false },
    ],
  },
  preferredRequirements: {
    met: 1,
    total: 2,
    items: [
      { requirement: 'Messaging', demonstrated: false },
      { requirement: 'Lifecycle', demonstrated: true },
    ],
  },
};

const mockAnalysis: GoNoGoAnalysis = {
  decision: 'no-go',
  confidence: 42,
  mismatches: [
    { type: 'core-requirements', severity: 'high', description: 'Missing 1 of 3 core requirements (Analytics).' },
    { type: 'work-history', severity: 'medium', description: 'Recent scope appears below target role.' },
    { type: 'preferred', severity: 'low', description: 'Messaging experience not demonstrated.' },
  ],
};

export default function GoNoGoDemo() {
  const [tier, setTier] = useState<'high' | 'medium' | 'low' | 'pending' | 'error'>('low');
  const [analysis, setAnalysis] = useState<GoNoGoAnalysis | null>(mockAnalysis);

  const tierAnalysis = useMemo(() => {
    if (tier === 'pending' || tier === 'error') return null;
    if (tier === 'high') return { ...mockAnalysis, decision: 'go', confidence: 88, mismatches: [] };
    if (tier === 'medium') return { ...mockAnalysis, decision: 'go', confidence: 64, mismatches: mockAnalysis.mismatches.slice(0, 2) };
    return mockAnalysis;
  }, [tier]);

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <Card className="p-4 flex items-center gap-4">
        <Select value={tier} onValueChange={(v) => setTier(v as any)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High (auto-continue)</SelectItem>
            <SelectItem value="medium">Medium (confirm)</SelectItem>
            <SelectItem value="low">Low (override)</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={() => setAnalysis(mockAnalysis)}>Reset analysis</Button>
      </Card>

      <GoNoGoGate
        tier={tier}
        analysis={tierAnalysis}
        metrics={mockMetrics}
        jobDescription={mockJD}
        onProceed={() => console.log('proceed')}
        onOverride={() => console.log('override')}
        onRetry={() => console.log('retry')}
      />

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Job description (parsed)</h3>
          <span className="text-sm text-muted-foreground">
            {mockJD.company} — {mockJD.role}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-muted-foreground">Core requirements</div>
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
              {mockJD.coreRequirements.map((req, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{req}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-muted-foreground">Preferred requirements</div>
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
              {mockJD.preferredRequirements.map((req, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{req}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
