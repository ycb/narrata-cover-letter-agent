// Types for content variations and saved sections
// Generated for human-in-the-loop content generation feature

/**
 * Saved Section - Reusable cover letter section (intro, closer, etc.)
 */
export interface SavedSection {
  id: string;
  user_id: string;
  section_type: 'introduction' | 'closer' | 'signature' | 'custom';
  title: string;
  content: string;
  tags: string[];
  times_used: number;
  last_used: string | null;
  is_default: boolean;
  addressed_gap_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedSectionInsert {
  user_id: string;
  section_type: 'introduction' | 'closer' | 'signature' | 'custom';
  title: string;
  content: string;
  tags?: string[];
  times_used?: number;
  last_used?: string | null;
  is_default?: boolean;
  addressed_gap_id?: string | null;
}

export interface SavedSectionUpdate {
  section_type?: 'introduction' | 'closer' | 'signature' | 'custom';
  title?: string;
  content?: string;
  tags?: string[];
  times_used?: number;
  last_used?: string | null;
  is_default?: boolean;
  addressed_gap_id?: string | null;
  updated_at?: string;
}

/**
 * Content Variation - Job-specific adaptation of base content
 */
export interface ContentVariation {
  id: string;
  user_id: string;
  parent_entity_type: 'approved_content' | 'saved_section';
  parent_entity_id: string;
  title: string;
  content: string;
  filled_gap_id: string | null;
  gap_tags: string[];
  target_job_title: string | null;
  target_company: string | null;
  job_description_id: string | null;
  times_used: number;
  last_used: string | null;
  created_by: 'user' | 'AI' | 'user-edited-AI';
  created_at: string;
  updated_at: string;
}

export interface ContentVariationInsert {
  user_id: string;
  parent_entity_type: 'approved_content' | 'saved_section';
  parent_entity_id: string;
  title: string;
  content: string;
  filled_gap_id?: string | null;
  gap_tags?: string[];
  target_job_title?: string | null;
  target_company?: string | null;
  job_description_id?: string | null;
  times_used?: number;
  last_used?: string | null;
  created_by?: 'user' | 'AI' | 'user-edited-AI';
}

export interface ContentVariationUpdate {
  title?: string;
  content?: string;
  filled_gap_id?: string | null;
  gap_tags?: string[];
  target_job_title?: string | null;
  target_company?: string | null;
  job_description_id?: string | null;
  times_used?: number;
  last_used?: string | null;
  updated_at?: string;
}

/**
 * Extended types with relationships
 */
export interface ContentVariationWithMetadata extends ContentVariation {
  parent_entity?: {
    id: string;
    title: string;
    content: string;
  };
  gap_details?: {
    id: string;
    gap_category: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  };
  job_description?: {
    id: string;
    company: string;
    role: string;
  };
}

export interface SavedSectionWithVariations extends SavedSection {
  variations?: ContentVariation[];
  variation_count?: number;
  gap_count?: number;
  gaps?: Array<{
    id: string;
    gap_category: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Helper type for variation creation in modal
 */
export interface VariationMetadata {
  title: string;
  gapTags: string[];
  targetJobTitle?: string;
  targetCompany?: string;
  jobDescriptionId?: string;
}
