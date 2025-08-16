export interface WorkHistoryCompany {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  tags: string[];
  roles: WorkHistoryRole[];
}

export interface WorkHistoryRole {
  id: string;
  companyId: string;
  title: string;
  startDate: string;
  endDate?: string;
  description?: string;
  tags: string[];
  achievements: string[];
  blurbs: WorkHistoryBlurb[];
  externalLinks: ExternalLink[];
}

export interface ExternalLink {
  id: string;
  roleId: string;
  url: string;
  label: string;
  tags: string[];
  timesUsed?: number;
  lastUsed?: string;
}

export interface WorkHistoryBlurb {
  id: string;
  roleId: string;
  title: string;
  content: string;
  status: 'approved' | 'draft' | 'needs-review';
  confidence: 'high' | 'medium' | 'low';
  tags: string[];
  timesUsed: number;
  lastUsed?: string;
  linkedExternalLinks?: string[]; // IDs of external links referenced in content
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