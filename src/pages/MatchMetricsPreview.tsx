import React, { useState } from 'react';
import { MatchMetricsToolbar } from '@/components/cover-letters/MatchMetricsToolbar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { HILProgressMetrics } from '@/components/cover-letters/useMatchMetricsDetails';
import type { EnhancedMatchData, GoalMatchDetail, RequirementMatchDetail } from '@/types/coverLetters';

/**
 * Preview page for the new MatchMetricsToolbar component
 * Provides mock data and toggles to demonstrate the toolbar + drawer UX
 */
export default function MatchMetricsPreview() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPostHIL, setIsPostHIL] = useState(false);

  // Mock metrics
  const mockMetrics: HILProgressMetrics = {
    goalsMatch: '3/7',
    experienceMatch: 'average',
    coverLetterRating: 'Strong',
    atsScore: 82,
    coreRequirementsMet: { met: 4, total: 5 },
    preferredRequirementsMet: { met: 2, total: 3 },
  };

  // Mock job description
  const mockJobDescription = {
    role: 'Senior Product Manager',
    company: 'Acme Corp',
    location: 'San Francisco, CA',
    salary: '$160k/yr - $200k/yr',
    workType: 'Hybrid',
    structuredData: {
      standardRequirements: [
        { id: 'req-1', label: '5+ years product management experience', detail: 'Leading product teams' },
        { id: 'req-2', label: 'B2B SaaS background', detail: 'Enterprise software' },
        { id: 'req-3', label: 'Data-driven decision making', detail: 'Analytics and metrics' },
        { id: 'req-4', label: 'Cross-functional leadership', detail: 'Work with eng, design, marketing' },
        { id: 'req-5', label: 'Agile/Scrum methodology', detail: 'Sprint planning and execution' },
      ],
      preferredRequirements: [
        { id: 'pref-1', label: 'MBA or equivalent', detail: 'Business or technical degree' },
        { id: 'pref-2', label: 'Experience with API products', detail: 'Developer-facing products' },
        { id: 'pref-3', label: 'Growth product experience', detail: 'User acquisition and retention' },
      ],
    },
  };

  // Mock enhanced match data
  const mockEnhancedMatchData: EnhancedMatchData = {
    goalMatches: [
      {
        id: 'goal-title',
        goalType: 'Target Title',
        userValue: 'Principal Product Manager, Staff Product Manager',
        jobValue: 'Senior Product Manager',
        met: true,
        evidence: 'Title aligns with your career trajectory',
      },
      {
        id: 'goal-salary',
        goalType: 'Minimum Salary',
        userValue: '$180,000',
        jobValue: '$160k/yr - $200k/yr',
        met: true,
        evidence: 'Salary range meets your minimum requirement',
      },
      {
        id: 'goal-location',
        goalType: 'Preferred Location',
        userValue: 'San Francisco, CA',
        jobValue: 'San Francisco, CA',
        met: true,
        evidence: 'Location matches your preference',
      },
      {
        id: 'goal-worktype',
        goalType: 'Work Type',
        userValue: 'Remote, Hybrid',
        jobValue: 'Hybrid',
        met: true,
        evidence: 'Work type matches your preferences',
      },
      {
        id: 'goal-industry',
        goalType: 'Industry',
        userValue: null,
        jobValue: 'B2B SaaS',
        met: false,
        evidence: 'Industry preference not set in your goals',
        requiresManualVerification: true,
      },
      {
        id: 'goal-company-size',
        goalType: 'Company Size',
        userValue: null,
        jobValue: 'Mid-size (100-500)',
        met: false,
        evidence: 'Company size preference not set',
        requiresManualVerification: true,
      },
      {
        id: 'goal-stage',
        goalType: 'Company Stage',
        userValue: null,
        jobValue: 'Series B',
        met: false,
        evidence: 'Company stage preference not set',
        requiresManualVerification: true,
      },
    ] as GoalMatchDetail[],
    coreRequirementDetails: [
      {
        id: 'req-1',
        requirement: '5+ years product management experience',
        demonstrated: true,
        evidence: 'Mentioned in work history: 8 years at TechCo as Senior PM',
        sectionIds: ['section-1'],
      },
      {
        id: 'req-2',
        requirement: 'B2B SaaS background',
        demonstrated: true,
        evidence: 'Experience with enterprise software at TechCo',
        sectionIds: ['section-1'],
      },
      {
        id: 'req-3',
        requirement: 'Data-driven decision making',
        demonstrated: true,
        evidence: 'Led analytics initiatives resulting in 30% increase in engagement',
        sectionIds: ['section-2'],
      },
      {
        id: 'req-4',
        requirement: 'Cross-functional leadership',
        demonstrated: true,
        evidence: 'Coordinated with engineering, design, and marketing teams',
        sectionIds: ['section-2'],
      },
      {
        id: 'req-5',
        requirement: 'Agile/Scrum methodology',
        demonstrated: false,
        evidence: 'Not explicitly mentioned in current draft',
        sectionIds: [],
        severity: 'important',
      },
    ] as RequirementMatchDetail[],
    preferredRequirementDetails: [
      {
        id: 'pref-1',
        requirement: 'MBA or equivalent',
        demonstrated: false,
        evidence: 'Education background not mentioned in draft',
        sectionIds: [],
        severity: 'nice-to-have',
      },
      {
        id: 'pref-2',
        requirement: 'Experience with API products',
        demonstrated: true,
        evidence: 'Built developer-facing API platform at TechCo',
        sectionIds: ['section-2'],
      },
      {
        id: 'pref-3',
        requirement: 'Growth product experience',
        demonstrated: true,
        evidence: 'Led growth initiatives resulting in 2x user acquisition',
        sectionIds: ['section-3'],
      },
    ] as RequirementMatchDetail[],
  };

  const handleEditGoals = () => {
    alert('Edit Goals clicked (would open goals modal)');
  };

  const handleEnhanceSection = (sectionId: string, requirement?: string) => {
    alert(`Enhance Section clicked:\nSection: ${sectionId}\nRequirement: ${requirement || 'N/A'}`);
  };

  const handleAddMetrics = (sectionId?: string) => {
    alert(`Add Metrics clicked:\nSection: ${sectionId || 'N/A'}`);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Match Metrics Toolbar Preview</CardTitle>
          <CardDescription>
            Independent preview of the new horizontal toolbar + drawer design that will replace tooltips
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Switch id="loading" checked={isLoading} onCheckedChange={setIsLoading} />
              <Label htmlFor="loading">Show Loading State</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="posthil" checked={isPostHIL} onCheckedChange={setIsPostHIL} />
              <Label htmlFor="posthil">Post-HIL State</Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(false);
                setIsPostHIL(false);
              }}
            >
              Reset
            </Button>
          </div>

          {/* Job Context */}
          <div className="p-4 bg-muted/30 rounded-lg border">
            <h3 className="text-sm font-semibold mb-2">Mock Job Description</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Role:</strong> {mockJobDescription.role}
              </p>
              <p>
                <strong>Company:</strong> {mockJobDescription.company}
              </p>
              <p>
                <strong>Location:</strong> {mockJobDescription.location}
              </p>
              <p>
                <strong>Salary:</strong> {mockJobDescription.salary}
              </p>
              <p>
                <strong>Work Type:</strong> {mockJobDescription.workType}
              </p>
            </div>
          </div>

          {/* Toolbar Component */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Interactive Toolbar</h3>
            <MatchMetricsToolbar
              metrics={mockMetrics}
              isPostHIL={isPostHIL}
              isLoading={isLoading}
              jobDescription={mockJobDescription}
              enhancedMatchData={mockEnhancedMatchData}
              onEditGoals={handleEditGoals}
              onEnhanceSection={handleEnhanceSection}
              onAddMetrics={handleAddMetrics}
            />
          </div>

          {/* Instructions */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              How to Use This Preview
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>Click toolbar items on the left to switch between different metrics</li>
              <li>View detailed breakdowns in the drawer area on the right</li>
              <li>Toggle "Show Loading State" to see skeleton loading UI</li>
              <li>Toggle "Post-HIL State" to simulate after-review metrics</li>
              <li>CTAs (Enhance, Add Metrics, Edit Goals) show alerts for demo purposes</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

