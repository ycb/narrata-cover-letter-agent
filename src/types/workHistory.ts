export interface Story {
  id: string;
  title: string;
  company: string;
  role: string;
  impact: 'high' | 'medium' | 'low';
  metrics: string;
  date: string;
  tags: string[];
}

export interface WorkHistoryCompany {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  tags: string[]; // industry, size, business model
  source: 'resume' | 'linkedin' | 'manual';
  createdAt: string;
  updatedAt: string;
  roles: WorkHistoryRole[];
}

export interface WorkHistoryRole {
  id: string;
  companyId: string;
  title: string;
  type: 'full-time' | 'contract' | 'founder';
  startDate: string;
  endDate?: string;
  // Gap detection properties
  hasGaps?: boolean;
  gapCount?: number;
  gapSeverity?: 'high' | 'medium' | 'low';
  description?: string;
  inferredLevel?: string;
  tags: string[];
  outcomeMetrics: string[]; // Changed from achievements to outcomeMetrics
  blurbs: WorkHistoryBlurb[];
  externalLinks: ExternalLink[];
  createdAt: string;
  updatedAt: string;
}

export interface ExternalLink {
  id: string;
  roleId: string;
  url: string;
  label: string;
  type: 'case-study' | 'blog' | 'portfolio' | 'other';
  tags: string[];
  timesUsed?: number;
  lastUsed?: string;
  createdAt: string;
}

export interface WorkHistoryBlurb {
  id: string;
  roleId: string;
  title: string;
  content: string;
  outcomeMetrics: string[]; // Changed from string to string[]
  tags: string[];
  source: 'resume' | 'manual' | 'llm-suggested';
  status: 'approved' | 'draft' | 'needs-review';
  confidence: 'high' | 'medium' | 'low';
  timesUsed: number;
  lastUsed?: string;
  linkedExternalLinks?: string[]; // IDs of external links referenced in content
  // Gap detection properties
  hasGaps?: boolean;
  gapCount?: number;
  variations?: BlurbVariation[]; // Optional variations for this blurb
  createdAt: string;
  updatedAt: string;
}

export interface BlurbVariation {
  id: string;
  content: string;
  developedForJobTitle?: string;
  filledGap?: string;
  jdTags?: string[];
  outcomeMetrics?: string[];
  tags?: string[];
  createdAt: string;
  createdBy: 'user' | 'AI' | 'user-edited-AI';
}

export interface LegacyCoverLetterTemplate {
  id: string;
  name: string;
  type: 'introduction' | 'closer' | 'signature';
  blurbs: TemplateBlurb[];
}

export interface TemplateBlurb {
  id: string;
  templateId: string;
  title: string;
  content: string;
  status: 'approved' | 'draft' | 'needs-review';
  confidence: 'high' | 'medium' | 'low';
  tags: string[];
  timesUsed: number;
  lastUsed?: string;
}

export interface CoverLetterSection {
  id: string;
  type: 'intro' | 'paragraph' | 'closer' | 'signature';
  contentType?: 'work-history' | 'saved'; // Story from Work History or Saved Cover Letter Section
  isStatic: boolean; // true = static text, false = uses blurb matching
  staticContent?: string; // for static sections
  blurbCriteria?: {
    goals: string[]; // content goals/purpose for this section
  }; // for dynamic sections
  order: number;
}

export interface CoverLetterTemplate {
  id: string;
  name: string;
  sections: CoverLetterSection[];
  createdAt: string;
  updatedAt: string;
}

export interface JobDescription {
  id: string;
  url?: string;
  content: string;
  company: string;
  role: string;
  extractedRequirements: string[];
  createdAt: string;
}

export interface CoverLetter {
  id: string;
  templateId: string;
  jobDescriptionId: string;
  sections: CoverLetterGeneratedSection[];
  llmFeedback: {
    goNoGo: 'go' | 'no-go' | 'needs-work';
    score: number;
    matchedBlurbs: string[]; // blurb IDs
    gaps: string[];
    suggestions: string[];
  };
  status: 'draft' | 'reviewed' | 'finalized';
  createdAt: string;
  updatedAt: string;
}

export interface CoverLetterGeneratedSection {
  id: string;
  sectionId: string; // references CoverLetterSection
  content: string;
  usedBlurbs?: string[]; // blurb IDs used to generate this section
  isModified: boolean; // has user manually edited
}

// Story Template Types
export interface StoryTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: 'launch' | 'growth' | 'leadership';
}