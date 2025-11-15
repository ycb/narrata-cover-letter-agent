import React, { useState } from 'react';
import { MatchMetricsToolbar } from '@/components/cover-letters/MatchMetricsToolbar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ContentCard } from '@/components/shared/ContentCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wand2, Upload } from 'lucide-react';
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

  const handleAddStory = (requirement?: string, severity?: string) => {
    alert(`Add Story clicked:\nRequirement: ${requirement || 'N/A'}\nSeverity: ${severity || 'N/A'}`);
  };

  const handleEnhanceSection = (sectionId: string, requirement?: string) => {
    alert(`Enhance Section clicked:\nSection: ${sectionId}\nRequirement: ${requirement || 'N/A'}`);
  };

  const handleAddMetrics = (sectionId?: string) => {
    alert(`Add Metrics clicked:\nSection: ${sectionId || 'N/A'}`);
  };

  const [mainTabValue, setMainTabValue] = useState<'cover-letter' | 'job-description'>('cover-letter');

  // Mock cover letter sections
  const mockSections = [
    {
      id: 'section-1',
      type: 'intro',
      content: "Dear Hiring Team, I'm a product manager with experience leading growth initiatives. I've learned that compounding growth comes from disciplined experimentation and clear measurement. Over the past several years, I've helped teams translate strategy into shipped impact across web and mobile platforms.",
    },
    {
      id: 'section-2',
      type: 'experience',
      content: '',
    },
  ];

  const getSectionTitle = (type: string) => {
    switch (type) {
      case 'intro':
        return 'Introduction';
      case 'experience':
        return 'Experience';
      case 'closing':
        return 'Closing';
      case 'signature':
        return 'Signature';
      default:
        return type;
    }
  };

  const getRequirementsForSection = (sectionType: string) => {
    if (!mockEnhancedMatchData) return [];
    
    const allReqs = [
      ...(mockEnhancedMatchData.coreRequirementDetails || []),
      ...(mockEnhancedMatchData.preferredRequirementDetails || []),
    ];

    const sectionReqs = allReqs
      .filter(req => {
        if (!req.demonstrated) return false;
        const sectionIds = req.sectionIds || [];
        return sectionIds.some(id => id === `section-${mockSections.findIndex(s => s.type === sectionType) + 1}`);
      })
      .map(req => req.requirement);

    return sectionReqs;
  };

  const getGapsForSection = (sectionType: string) => {
    if (!mockEnhancedMatchData) return [];
    
    const allReqs = [
      ...(mockEnhancedMatchData.coreRequirementDetails || []),
      ...(mockEnhancedMatchData.preferredRequirementDetails || []),
    ];

    const gaps = allReqs
      .filter(req => !req.demonstrated)
      .map(req => ({
        id: req.id,
        title: req.requirement,
        description: req.evidence || 'Not mentioned in draft',
      }));

    return gaps;
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Edit Cover Letter</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mockJobDescription.company} • {mockJobDescription.role} • November 14, 2025 at 11:09 PM
            </p>
          </div>
          {/* Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="loading" checked={isLoading} onCheckedChange={setIsLoading} />
              <Label htmlFor="loading" className="text-xs">Loading</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="posthil" checked={isPostHIL} onCheckedChange={setIsPostHIL} />
              <Label htmlFor="posthil" className="text-xs">Post-HIL</Label>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Toolbar */}
        <div className="border-r bg-card">
          <MatchMetricsToolbar
            metrics={mockMetrics}
            isPostHIL={isPostHIL}
            isLoading={isLoading}
            jobDescription={mockJobDescription}
            enhancedMatchData={mockEnhancedMatchData}
            onEditGoals={handleEditGoals}
            onEnhanceSection={handleEnhanceSection}
            onAddMetrics={handleAddMetrics}
            className="h-full border-0 rounded-none"
          />
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto bg-muted/30">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Tabs */}
            <Tabs value={mainTabValue} onValueChange={(value) => setMainTabValue(value as 'job-description' | 'cover-letter')}>
              <TabsList className="grid w-fit grid-cols-2">
                <TabsTrigger value="cover-letter" className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Cover Letter
                </TabsTrigger>
                <TabsTrigger value="job-description" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Job Description
                </TabsTrigger>
              </TabsList>

              {/* Job Description Tab */}
              <TabsContent value="job-description" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Job Description</CardTitle>
                    <CardDescription>
                      The job description used to generate this cover letter
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Job Description Content</label>
                      <div className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                        Senior Product Manager position requiring 5+ years of experience in product management, strong analytical skills, and experience with cross-functional team leadership. The role involves driving product strategy, analyzing user behavior, and optimizing conversion funnels. Experience with SQL/Python, Tableau/Looker, and fintech is preferred.
                      </div>
                    </div>
                    <Button variant="secondary" className="w-full flex items-center gap-2" size="lg">
                      <Wand2 className="h-4 w-4" />
                      Re-Generate Cover Letter
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cover Letter Tab */}
              <TabsContent value="cover-letter" className="space-y-6 mt-6">
                {mockSections.map((section) => {
                  const sectionTitle = getSectionTitle(section.type);
                  const requirements = getRequirementsForSection(section.type);
                  const gaps = getGapsForSection(section.type);

                  return (
                    <ContentCard
                      key={section.id}
                      title={sectionTitle}
                      content={section.content || undefined}
                      tags={requirements}
                      hasGaps={gaps.length > 0}
                      gaps={gaps}
                      gapSummary={null}
                      isGapResolved={false}
                      onGenerateContent={handleAddStory ? () => handleAddStory() : undefined}
                      tagsLabel="Requirements Met"
                      showUsage={false}
                      renderChildrenBeforeTags={true}
                    >
                      <div className="mb-6">
                        <Textarea
                          value={section.content}
                          onChange={() => {}}
                          className="resize-none overflow-hidden"
                          placeholder="Enter cover letter content..."
                          rows={section.content ? Math.max(3, section.content.split('\n').length) : 3}
                        />
                      </div>
                    </ContentCard>
                  );
                })}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

