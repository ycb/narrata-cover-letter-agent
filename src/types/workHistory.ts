import type { CoverLetterOutcomeStatus } from './coverLetters';
import type { Json } from './supabase';

export interface Story {
  id: string;
  title: string;
  company: string;
  role: string;
  impact: 'high' | 'medium' | 'low';
  metrics: string;
  date: string;
  tags: string[];
  hasGaps?: boolean;
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
  gaps?: Array<{ id: string; description: string; gap_category?: string }>; // Actual gap objects for role (with category for filtering)
  description?: string;
  inferredLevel?: string;
  tags: string[];
  outcomeMetrics: string[]; // Changed from achievements to outcomeMetrics
  blurbs: WorkHistoryBlurb[];
  fragments?: StoryFragment[];
  fragmentCount?: number;
  externalLinks: ExternalLink[];
  createdAt: string;
  updatedAt: string;
  // For merged clusters: the underlying work_item UUIDs
  workItemIds?: string[];
}

export interface StoryFragment {
  id: string;
  workItemId: string | null;
  title: string;
  content: string;
  sourceType: 'resume' | 'linkedin' | 'cover_letter' | 'manual' | 'other';
  sourceId: string | null;
  narrativeHints: string[];
  metrics: Json;
  tags: string[];
  status: 'pending' | 'in_progress' | 'promoted' | 'archived';
  convertedStoryId?: string | null;
  convertedAt?: string | null;
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
  gaps?: Array<{ id: string; description: string }>; // Actual gap objects (supports single or list)
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
  title?: string; // Template section title (e.g., "Body Paragraph 1", "Introduction")
  contentType?: 'work-history' | 'saved'; // Story from Work History or Saved Cover Letter Section
  savedSectionId?: string;
  isStatic: boolean; // true = static text, false = uses blurb matching
  staticContent?: string; // for static sections
  /**
   * Optional user-defined AI fill instructions that can be referenced from `staticContent`
   * using placeholders like `[LLM:slot_label]` or `[LLM:slot_label|instruction text]`.
   *
   * Note: Slots are primarily inferred from `staticContent` placeholders; this field allows
   * richer UI authoring later without schema changes.
   */
  llmSlots?: Array<{
    label: string;
    instruction?: string;
    scope?: 'jd' | 'workHistory' | 'both';
    required?: boolean;
  }>;
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
  outcomeStatus?: CoverLetterOutcomeStatus | null;
  appliedAt?: string | null;
  outcomeUpdatedAt?: string | null;
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
