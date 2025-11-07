/**
 * Cover Letter Template Service
 * Handles decomposition of cover letters into saved sections and template creation
 * Phase 5b: Cover Letter Template Creation & Setup During Onboarding
 */

import { supabase } from '@/lib/supabase';

// Types matching the LLM parsing output
export interface CoverLetterParagraph {
  index: number;
  rawText: string;
  function: 'intro' | 'story' | 'closer' | 'other';
  confidence: number;
  purposeTags: string[];
  linkedStoryId: string | null;
  purposeSummary: string;
  notes?: string;
}

export interface ParsedCoverLetter {
  paragraphs: CoverLetterParagraph[];
  templateSignals: {
    tone: string[];
    persona: string[];
    structure: {
      paraCount: number;
      usesBullets: boolean;
      storyDensity: string;
      metricDensity: string;
    };
    styleHints: {
      voice: string;
      lengthChars: number;
      readingLevel: number;
      sentenceLength: string;
    };
  };
  profileData?: {
    goals?: string[];
    voice?: {
      tone: string[];
      style: string;
      persona: string[];
    };
    preferences?: string[];
  };
}

// Types for saved sections
export interface SavedSection {
  id?: string;
  user_id?: string;
  type: 'intro' | 'closer' | 'signature' | 'other';
  title: string;
  content: string;
  tags: string[];
  is_default: boolean;
  times_used: number;
  last_used?: string;
  source: 'uploaded' | 'manual' | 'generated';
  source_file_id?: string;
  has_gaps?: boolean;
  gap_count?: number;
  gap_details?: any;
  created_at?: string;
  updated_at?: string;
}

// Types for templates
export interface TemplateSection {
  id: string;
  type: 'intro' | 'paragraph' | 'closer' | 'signature';
  isStatic: boolean;
  staticContent?: string;
  savedSectionId?: string; // Reference to saved_sections table
  blurbCriteria?: {
    goals: string[];
  };
  order: number;
}

export interface CoverLetterTemplate {
  id?: string;
  user_id?: string;
  name: string;
  sections: TemplateSection[];
  created_at?: string;
  updated_at?: string;
}

export class CoverLetterTemplateService {
  /**
   * Decompose a parsed cover letter into saved sections
   * Creates saved_sections records for intro, closer, and signature paragraphs
   */
  static async decomposeCoverLetter(
    userId: string,
    parsedData: ParsedCoverLetter,
    sourceFileId: string
  ): Promise<{
    savedSections: SavedSection[];
    templateStructure: TemplateSection[];
  }> {
    const savedSections: SavedSection[] = [];
    const templateStructure: TemplateSection[] = [];

    // Extract sections by function
    for (const paragraph of parsedData.paragraphs) {
      const sectionType = this.mapParagraphFunctionToSectionType(paragraph.function);

      if (sectionType === 'intro' || sectionType === 'closer' || sectionType === 'signature') {
        // Create saved section for static content
        const savedSection: SavedSection = {
          user_id: userId,
          type: sectionType,
          title: this.generateSectionTitle(sectionType, paragraph),
          content: paragraph.rawText,
          tags: paragraph.purposeTags,
          is_default: paragraph.index === 0 && sectionType === 'intro', // First intro is default
          times_used: 0,
          source: 'uploaded',
          source_file_id: sourceFileId
        };

        savedSections.push(savedSection);

        // Add to template structure (will link to saved section after DB insert)
        templateStructure.push({
          id: `${sectionType}-${paragraph.index}`,
          type: sectionType,
          isStatic: true,
          staticContent: paragraph.rawText,
          order: paragraph.index + 1
        });
      } else if (sectionType === 'paragraph') {
        // Dynamic story-matching paragraph
        templateStructure.push({
          id: `paragraph-${paragraph.index}`,
          type: 'paragraph',
          isStatic: false,
          blurbCriteria: {
            goals: paragraph.purposeTags.length > 0
              ? [paragraph.purposeSummary]
              : ['showcase relevant experience']
          },
          order: paragraph.index + 1
        });
      }
    }

    return { savedSections, templateStructure };
  }

  /**
   * Create saved sections in database
   */
  static async createSavedSections(
    savedSections: SavedSection[]
  ): Promise<SavedSection[]> {
    const { data, error } = await supabase
      .from('saved_sections')
      .insert(savedSections)
      .select();

    if (error) {
      console.error('Error creating saved sections:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create default template from decomposed cover letter
   */
  static async createDefaultTemplate(
    userId: string,
    templateName: string,
    templateStructure: TemplateSection[],
    createdSavedSections: SavedSection[]
  ): Promise<CoverLetterTemplate> {
    // Link template sections to saved sections
    const sectionsWithRefs = templateStructure.map((section) => {
      if (section.isStatic && section.staticContent) {
        // Find matching saved section
        const matchingSavedSection = createdSavedSections.find(
          (saved) => saved.content === section.staticContent && saved.type === section.type
        );

        if (matchingSavedSection) {
          return {
            ...section,
            savedSectionId: matchingSavedSection.id,
            staticContent: undefined // Remove inline content, use reference instead
          };
        }
      }
      return section;
    });

    const template: CoverLetterTemplate = {
      user_id: userId,
      name: templateName,
      sections: sectionsWithRefs
    };

    // Insert into database
    const { data, error } = await supabase
      .from('cover_letter_templates')
      .insert({
        user_id: template.user_id,
        name: template.name,
        sections: template.sections
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      throw error;
    }

    return data;
  }

  /**
   * Load user's templates from database
   */
  static async getUserTemplates(userId: string): Promise<CoverLetterTemplate[]> {
    const { data, error } = await supabase
      .from('cover_letter_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading templates:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Load user's saved sections from database
   */
  static async getUserSavedSections(userId: string): Promise<SavedSection[]> {
    const { data, error } = await supabase
      .from('saved_sections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading saved sections:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Update template
   */
  static async updateTemplate(
    templateId: string,
    updates: Partial<CoverLetterTemplate>
  ): Promise<CoverLetterTemplate> {
    const { data, error } = await supabase
      .from('cover_letter_templates')
      .update({
        name: updates.name,
        sections: updates.sections,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update saved section
   */
  static async updateSavedSection(
    sectionId: string,
    updates: Partial<SavedSection>
  ): Promise<SavedSection> {
    const { data, error } = await supabase
      .from('saved_sections')
      .update({
        title: updates.title,
        content: updates.content,
        tags: updates.tags,
        is_default: updates.is_default,
        updated_at: new Date().toISOString()
      })
      .eq('id', sectionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating saved section:', error);
      throw error;
    }

    return data;
  }

  /**
   * Create new saved section (manual or generated)
   */
  static async createSavedSection(
    section: SavedSection
  ): Promise<SavedSection> {
    const { data, error } = await supabase
      .from('saved_sections')
      .insert(section)
      .select()
      .single();

    if (error) {
      console.error('Error creating saved section:', error);
      throw error;
    }

    return data;
  }

  /**
   * Delete saved section
   */
  static async deleteSavedSection(sectionId: string): Promise<void> {
    const { error } = await supabase
      .from('saved_sections')
      .delete()
      .eq('id', sectionId);

    if (error) {
      console.error('Error deleting saved section:', error);
      throw error;
    }
  }

  /**
   * Increment usage counter for saved section
   */
  static async incrementSectionUsage(sectionId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_section_usage', {
      section_id: sectionId
    });

    if (error) {
      // Fallback to manual increment if RPC doesn't exist yet
      const { data: section } = await supabase
        .from('saved_sections')
        .select('times_used')
        .eq('id', sectionId)
        .single();

      if (section) {
        await supabase
          .from('saved_sections')
          .update({
            times_used: (section.times_used || 0) + 1,
            last_used: new Date().toISOString()
          })
          .eq('id', sectionId);
      }
    }
  }

  // Helper methods
  private static mapParagraphFunctionToSectionType(
    func: string
  ): 'intro' | 'paragraph' | 'closer' | 'signature' {
    switch (func) {
      case 'intro':
        return 'intro';
      case 'closer':
        return 'closer';
      case 'story':
        return 'paragraph';
      default:
        // Check if it looks like a signature
        if (func === 'other') {
          return 'signature';
        }
        return 'paragraph';
    }
  }

  private static generateSectionTitle(
    type: string,
    paragraph: CoverLetterParagraph
  ): string {
    // Generate a descriptive title based on content and tags
    const tags = paragraph.purposeTags.join(', ');
    const preview = paragraph.rawText.substring(0, 50);

    switch (type) {
      case 'intro':
        return tags ? `${tags} Opening` : `Professional Opening`;
      case 'closer':
        return tags ? `${tags} Close` : `Professional Close`;
      case 'signature':
        return 'Professional Signature';
      default:
        return `${type.charAt(0).toUpperCase() + type.slice(1)} Section`;
    }
  }

  /**
   * Process uploaded cover letter and create template + saved sections
   * Main entry point for onboarding flow
   */
  static async processUploadedCoverLetter(
    userId: string,
    parsedData: ParsedCoverLetter,
    sourceFileId: string,
    templateName: string = 'Professional Template'
  ): Promise<{
    template: CoverLetterTemplate;
    savedSections: SavedSection[];
  }> {
    try {
      // 1. Decompose cover letter into saved sections and template structure
      const { savedSections, templateStructure } = await this.decomposeCoverLetter(
        userId,
        parsedData,
        sourceFileId
      );

      // 2. Create saved sections in database
      const createdSavedSections = await this.createSavedSections(savedSections);

      // 3. Create template with references to saved sections
      const template = await this.createDefaultTemplate(
        userId,
        templateName,
        templateStructure,
        createdSavedSections
      );

      return {
        template,
        savedSections: createdSavedSections
      };
    } catch (error) {
      console.error('Error processing uploaded cover letter:', error);
      throw error;
    }
  }
}
