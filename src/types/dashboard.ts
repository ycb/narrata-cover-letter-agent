// Dashboard v2 Types

export interface PMCompetency {
  id: string;
  name: string;
  category: 'execution' | 'insight' | 'strategy' | 'influence';
  description: string;
  weight: number; // Role-specific importance (1-5)
}

export interface StoryStrength {
  overall: number; // 0-100
  breakdown: {
    outcomes: number; // 0-30
    context: number; // 0-25
    technical: number; // 0-20
    influence: number; // 0-15
    innovation: number; // 0-10 (bonus)
  };
  recommendations: string[];
  lastAssessed: string;
}

export interface CompetencyCoverage {
  competency: PMCompetency;
  coverage: number; // 0-100%
  stories: string[]; // Story IDs
  averageStrength: number; // Average story strength
  gap: 'low' | 'medium' | 'high';
  lastStoryAdded?: string;
}

export interface CoverageMap {
  competencies: CompetencyCoverage[];
  overallCoverage: number;
  priorityGaps: string[]; // Competency IDs that need attention
}

export interface ResumeGapInsight {
  competency: PMCompetency;
  missingStories: number;
  suggestedActions: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface LastLetterSent {
  id: string;
  title: string;
  company: string;
  role: string;
  sentDate: string;
  sections: {
    id: string;
    type: string;
    content: string;
    competency: string;
  }[];
  status: 'draft' | 'sent' | 'approved';
}

export interface DashboardV2Data {
  coverageMap: CoverageMap;
  storyStrength: StoryStrength;
  resumeGaps: ResumeGapInsight[];
  lastLetter: LastLetterSent | null;
  quickActions: {
    id: string;
    title: string;
    description: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}
