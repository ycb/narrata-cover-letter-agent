/**
 * Cover Letter Template Service
 * Handles decomposition of cover letters into saved sections and template creation
 * Phase 5b: Cover Letter Template Creation & Setup During Onboarding
 */

import { supabase } from '@/lib/supabase';
import { parseCoverLetter, convertToSavedSections } from '@/services/coverLetterParser';
import { SoftDeleteService } from '@/services/softDeleteService';
import { normalizeTemplateSectionsForDraft } from '@/lib/coverLetterTemplateSections';
import type {
  CoverLetterGeneratedSection,
  CoverLetterSection,
  CoverLetterTemplate as DomainCoverLetterTemplate
} from '@/types/workHistory';
import type { CoverLetterOutcomeStatus } from '@/types/coverLetters';

// Types matching the LLM parsing output
export interface CoverLetterParagraph {
  index?: number;
  rawText: string;
  function: 'intro' | 'story' | 'closer' | 'signature' | 'other';
  confidence?: number;
  purposeTags?: string[];
  linkedStoryId?: string | null;
  purposeSummary?: string;
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

type CoverLetterSourceRecord = {
  id: string;
  file_name: string;
  source_type: string;
  structured_data?: ParsedCoverLetter | null;
  raw_text?: string | null;
  created_at?: string | null;
};

type SavedSectionsInsert = {
  user_id: string;
  type: string;
  title: string;
  content: string;
  tags?: string[];
  times_used?: number;
  last_used?: string | null;
  source_id?: string | null;
  paragraph_index?: number | null;
  function_type?: string | null;
  purpose_summary?: string | null;
  purpose_tags?: string[];
};

type SavedSectionsRow = SavedSectionsInsert & {
  id: string;
  created_at: string;
  updated_at: string;
};

export interface CoverLetterSummary {
  id: string;
  templateId: string;
  templateName: string | null;
  templateSections: CoverLetterSection[];
  jobDescriptionId: string;
  jobDescription: {
    id: string;
    company: string;
    role: string;
    url: string | null;
    content: string;
  } | null;
  status: 'draft' | 'reviewed' | 'finalized';
  outcomeStatus?: CoverLetterOutcomeStatus | null;
  appliedAt?: string | null;
  outcomeUpdatedAt?: string | null;
  sections: CoverLetterGeneratedSection[];
  llmFeedback: Record<string, unknown> | null;
  analytics: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

type SavedSectionsUpdate = Partial<SavedSectionsInsert> & { updated_at?: string };

type CoverLetterTemplatesRow = {
  id: string;
  user_id: string;
  name: string;
  sections: TemplateSection[] | any;
  created_at: string;
  updated_at: string;
};

type CoverLetterTemplatesInsert = {
  user_id: string;
  name: string;
  sections: TemplateSection[] | any;
};

interface CoverLetterSourceContext {
  rawText?: string;
  fileName?: string;
  createdAt?: string;
}

// Types for saved sections
export interface SavedSection {
  id?: string;
  user_id?: string;
  type: string;
  title: string;
  content: string;
  tags?: string[];
  times_used?: number;
  last_used?: string;
  source_id?: string;
  paragraph_index?: number;
  function_type?: string;
  purpose_summary?: string;
  purpose_tags?: string[];
  is_dynamic?: boolean; // Whether content should be dynamically generated per application
  created_at?: string;
  updated_at?: string;
}

// Types for templates
export interface TemplateSection {
  id: string;
  type: 'intro' | 'paragraph' | 'closer' | 'signature';
  title?: string; // Template section title (e.g., "Body Paragraph 1", "Introduction")
  isStatic: boolean;
  staticContent?: string;
  savedSectionId?: string; // Reference to saved_sections table
  blurbCriteria?: {
    goals: string[];
  };
  order: number;
}

interface CoverLetterTemplateRecord {
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
    sourceFileId: string,
    sourceContext?: CoverLetterSourceContext
  ): Promise<{
    savedSections: SavedSection[];
    templateStructure: TemplateSection[];
  }> {
    const savedSections: SavedSection[] = [];
    const templateStructure: TemplateSection[] = [];

    const paragraphs = parsedData.paragraphs ?? [];
    if (paragraphs.length === 0) {
      console.warn(`[SavedSections] Parsed cover letter for source ${sourceFileId} contains no paragraphs`);
      return { savedSections, templateStructure };
    }

    const totalParagraphs = paragraphs.length;
    const hasExplicitIntro = paragraphs.some((paragraph) => paragraph.function === 'intro');
    const hasExplicitSignature = paragraphs.some((paragraph) => paragraph.function === 'signature');

    let pendingGreeting: CoverLetterParagraph | null = null;
    let lastCloserIndex: number | null = null;
    let lastCloserTemplate: TemplateSection | null = null;

    const pushStaticSection = (
      type: TemplateSection['type'],
      content: string,
      paragraph: CoverLetterParagraph,
      order: number,
      options?: {
        extraTags?: string[];
        titleOverride?: string;
      }
    ) => {
      const tags = Array.from(new Set([
        ...(paragraph.purposeTags ?? []),
        ...(options?.extraTags ?? [])
      ]));

      const savedSection: SavedSection = {
        user_id: userId,
        type,
        title: this.generateSectionTitle(type, paragraph, {
          sourceFileName: sourceContext?.fileName,
          createdAt: sourceContext?.createdAt,
          paragraphIndex: paragraph.index ?? order - 1,
          labelOverride: options?.titleOverride
        }),
        content,
        tags,
        times_used: 0,
        source_id: sourceFileId,
        paragraph_index: paragraph.index ?? order - 1,
        function_type: paragraph.function,
        purpose_summary: paragraph.purposeSummary,
        purpose_tags: tags
      };

      savedSections.push(savedSection);

      const templateSection: TemplateSection = {
        id: `${type}-${paragraph.index ?? order - 1}`,
        type,
        title: this.generateTemplateSectionTitle(type, templateStructure.filter(s => s.type === type).length),
        isStatic: true,
        staticContent: content,
        order
      };

      templateStructure.push(templateSection);
      return { savedSection, templateSection };
    };

    const isGreeting = (para: CoverLetterParagraph, index: number): boolean => {
      const text = para.rawText?.toLowerCase?.() ?? '';
      if (!text.trim()) return false;
      return /(dear|hello|hi|greetings)/.test(text.split(/\s+/)[0]);
    };

    const isSignature = (para: CoverLetterParagraph): boolean => {
      const text = para.rawText?.toLowerCase?.() ?? '';
      return !!text && /(regards|sincerely|best|thank you|cheers)/.test(text);
    };

    paragraphs.forEach((paragraph, index) => {
      const sectionType = this.mapParagraphFunctionToSectionType(
        paragraph,
        index,
        totalParagraphs,
        hasExplicitIntro,
        hasExplicitSignature
      );

      if (sectionType === null) {
        if (paragraph.function === 'other' && isGreeting(paragraph, index)) {
          pendingGreeting = paragraph;
        }
        return;
      }

      if (sectionType === 'intro') {
        const greetingText = pendingGreeting ? `${pendingGreeting.rawText}\n\n` : '';
        const combinedTags = Array.from(new Set([
          ...(pendingGreeting?.purposeTags ?? []),
          ...(paragraph.purposeTags ?? [])
        ]));

        const introContent = `${greetingText}${paragraph.rawText}`.trim();
        pushStaticSection('intro', introContent, paragraph, index + 1, {
          extraTags: combinedTags
        });
        pendingGreeting = null;
        lastCloserIndex = null;
        lastCloserTemplate = null;
        return;
      }

      if (sectionType === 'closer') {
        let closerContent = paragraph.rawText;
        const signatureLines = this.extractSignature(sourceContext?.rawText, paragraph.rawText);
        if (signatureLines) {
          closerContent = `${closerContent}\n\n${signatureLines}`.trim();
        }

        const { savedSection, templateSection } = pushStaticSection('closer', closerContent, paragraph, index + 1);
        lastCloserIndex = savedSections.length - 1;
        lastCloserTemplate = templateSection;
        return;
      }

      if (sectionType === 'signature') {
        if (lastCloserIndex !== null) {
          const existingContent = savedSections[lastCloserIndex].content ?? '';
          const signatureText = paragraph.rawText.trim();
          const alreadyIncluded =
            signatureText.length > 0 &&
            existingContent.toLowerCase().includes(signatureText.toLowerCase());

          if (!alreadyIncluded) {
            savedSections[lastCloserIndex].content = `${existingContent}\n\n${signatureText}`.trim();
            savedSections[lastCloserIndex].tags = Array.from(new Set([
              ...(savedSections[lastCloserIndex].tags ?? []),
              ...(paragraph.purposeTags ?? [])
            ]));
            if (lastCloserTemplate) {
              lastCloserTemplate.staticContent = savedSections[lastCloserIndex].content;
            }
          }
          lastCloserIndex = null;
          lastCloserTemplate = null;
          return;
        }

        pushStaticSection('signature', paragraph.rawText, paragraph, index + 1);
        return;
      }

      if (sectionType === 'paragraph') {
        const fallbackGoal = 'showcase relevant experience';
        const goals = paragraph.purposeTags && paragraph.purposeTags.length > 0
          ? paragraph.purposeTags
          : [fallbackGoal];

        templateStructure.push({
          id: `paragraph-${paragraph.index ?? index}`,
          type: 'paragraph',
          isStatic: false,
          blurbCriteria: {
            goals
          },
          order: index + 1
        });
        lastCloserIndex = null;
        lastCloserTemplate = null;
      }

      if (sectionType === 'philosophy' || sectionType === 'team') {
        const staticContent = paragraph.rawText;
        const sectionLabel = sectionType === 'philosophy' ? 'My Approach' : 'Team Collaboration';
        pushStaticSection('paragraph', staticContent, paragraph, index + 1, {
          extraTags: [sectionType],
          titleOverride: sectionLabel
        });
        lastCloserIndex = null;
        lastCloserTemplate = null;
        return;
      }
    });

    // If greeting existed without intro, create a simple intro section from it
    if (pendingGreeting) {
      pushStaticSection('intro', pendingGreeting.rawText, pendingGreeting, paragraphs.length + 1);
    }

    return { savedSections, templateStructure };
  }

  /**
   * Create saved sections in database
   */
  static async createSavedSections(
    savedSections: SavedSection[],
    accessToken?: string
  ): Promise<SavedSection[]> {
    if (savedSections.length === 0) {
      return [];
    }

    const payload: SavedSectionsInsert[] = savedSections.map((section) => ({
      user_id: section.user_id,
      type: section.type,
      title: section.title,
      content: section.content,
      tags: section.tags ?? [],
      times_used: section.times_used ?? 0,
      last_used: section.last_used ?? null,
      source_id: section.source_id ?? null,
      paragraph_index: section.paragraph_index ?? null,
      function_type: section.function_type ?? null,
      purpose_summary: section.purpose_summary ?? null,
      purpose_tags: section.purpose_tags ?? []
    }));

    const client = await this.getClient(accessToken);
    const { data, error } = await client
      .from('saved_sections')
      .insert(payload as any)
      .select();

    if (error) {
      console.error('Error creating saved sections:', error);
      throw error;
    }

    const rows = (data ?? []) as SavedSectionsRow[];
    return rows.map((row) => this.mapRowToSavedSection(row));
  }

  /**
   * Create default template from decomposed cover letter
   */
  static async createDefaultTemplate(
    userId: string,
    templateName: string,
    templateStructure: TemplateSection[],
    createdSavedSections: SavedSection[],
    accessToken?: string
  ): Promise<DomainCoverLetterTemplate> {
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
            staticContent: matchingSavedSection.content // Preserve content so template mirrors uploaded letter
          };
        }
      }
      return section;
    });

    const templateRecord: CoverLetterTemplateRecord = {
      user_id: userId,
      name: templateName,
      sections: sectionsWithRefs
    };

    // Insert into database
    const client = await this.getClient(accessToken);
    const { data, error } = await client
      .from('cover_letter_templates')
      .insert({
        user_id: templateRecord.user_id!,
        name: templateRecord.name,
        sections: templateRecord.sections
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      throw error;
    }

    return this.mapRowToTemplate(data as CoverLetterTemplatesRow);
  }

  /**
   * Load user's templates from database
   */
  static async getUserTemplates(userId: string, accessToken?: string): Promise<DomainCoverLetterTemplate[]> {
    const client = await this.getClient(accessToken);
    const { data, error } = await client
      .from('cover_letter_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading templates:', error);
      throw error;
    }

    const rows = (data ?? []) as CoverLetterTemplatesRow[];
    return rows.map((row) => this.mapRowToTemplate(row));
  }

  /**
   * Load the user's generated cover letters with job description & template context
   */
  static async getUserCoverLetters(userId: string, accessToken?: string): Promise<CoverLetterSummary[]> {
    const client = await this.getClient(accessToken);
    const { data, error } = await client
      .from('cover_letters')
      .select(`
        id,
        template_id,
        job_description_id,
        status,
        applied_at,
        outcome_status,
        outcome_updated_at,
        sections,
        llm_feedback,
        analytics,
        created_at,
        updated_at,
        job_descriptions:job_description_id (
          id,
          company,
          role,
          url,
          content
        ),
        cover_letter_templates:template_id (
          id,
          name,
          sections
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[CoverLetterTemplateService] Error loading cover letters:', error);
      throw error;
    }

    const rows =
      (data ?? []) as Array<{
        id: string;
        template_id: string;
        job_description_id: string;
        status: 'draft' | 'reviewed' | 'finalized';
        applied_at: string | null;
        outcome_status: CoverLetterOutcomeStatus | null;
        outcome_updated_at: string | null;
        sections: unknown;
        llm_feedback: unknown;
        analytics: unknown;
        created_at: string;
        updated_at: string;
        job_descriptions: {
          id: string;
          company: string;
          role: string;
          url: string | null;
          content: string;
        } | null;
        cover_letter_templates: {
          id: string;
          name: string | null;
          sections: unknown;
        } | null;
      }>;

    return rows.map((row) => {
      const templateSectionsRaw = row.cover_letter_templates?.sections;
      const templateSectionsRawArray: CoverLetterSection[] = Array.isArray(templateSectionsRaw)
        ? (templateSectionsRaw as CoverLetterSection[])
        : Array.isArray((templateSectionsRaw as any)?.sections)
          ? ((templateSectionsRaw as any).sections as CoverLetterSection[])
          : [];
      const templateSections = normalizeTemplateSectionsForDraft(templateSectionsRawArray);

      const sectionsRaw = row.sections;
      let sections: CoverLetterGeneratedSection[] = [];
      if (Array.isArray(sectionsRaw)) {
        sections = sectionsRaw as CoverLetterGeneratedSection[];
      } else if (Array.isArray((sectionsRaw as any)?.sections)) {
        sections = ((sectionsRaw as any).sections as CoverLetterGeneratedSection[]).map((section) => ({
          ...section
        }));
      }

      const llmFeedback =
        row.llm_feedback && typeof row.llm_feedback === 'object'
          ? (row.llm_feedback as Record<string, unknown>)
          : null;
      const analytics =
        row.analytics && typeof row.analytics === 'object'
          ? (row.analytics as Record<string, unknown>)
          : null;

      return {
        id: row.id,
        templateId: row.template_id,
        templateName: row.cover_letter_templates?.name ?? null,
        templateSections,
        jobDescriptionId: row.job_description_id,
        jobDescription: row.job_descriptions
          ? {
              id: row.job_descriptions.id,
              company: row.job_descriptions.company,
              role: row.job_descriptions.role,
              url: row.job_descriptions.url,
              content: row.job_descriptions.content
            }
          : null,
        status: row.status,
        appliedAt: row.applied_at,
        outcomeStatus: row.outcome_status,
        outcomeUpdatedAt: row.outcome_updated_at,
        sections,
        llmFeedback,
        analytics,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } satisfies CoverLetterSummary;
    });
  }

  static async updateCoverLetterOutcome(args: {
    coverLetterId: string;
    outcomeStatus: CoverLetterOutcomeStatus | null;
    appliedAt?: string | null;
    accessToken?: string;
  }): Promise<{ outcomeUpdatedAt: string; appliedAt?: string | null }> {
    const { coverLetterId, outcomeStatus, appliedAt, accessToken } = args;
    const client = await this.getClient(accessToken);
    const outcomeUpdatedAt = new Date().toISOString();

    const updatePayload: {
      outcome_status: CoverLetterOutcomeStatus | null;
      outcome_updated_at: string;
      updated_at: string;
      applied_at?: string | null;
    } = {
      outcome_status: outcomeStatus,
      outcome_updated_at: outcomeUpdatedAt,
      updated_at: outcomeUpdatedAt,
    };

    if (appliedAt) {
      updatePayload.applied_at = appliedAt;
    }

    const { error } = await client
      .from('cover_letters')
      .update(updatePayload)
      .eq('id', coverLetterId);

    if (error) {
      console.error('[CoverLetterTemplateService] Error updating outcome status:', error);
      throw error;
    }

    return { outcomeUpdatedAt, appliedAt };
  }

  static async autoApplyNoResponse(args: {
    userId: string;
    days?: number;
    accessToken?: string;
  }): Promise<{ updatedIds: string[]; outcomeUpdatedAt: string }> {
    const { userId, days = 30, accessToken } = args;
    const client = await this.getClient(accessToken);
    const outcomeUpdatedAt = new Date().toISOString();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data, error } = await client
      .from('cover_letters')
      .update({
        outcome_status: 'no_response',
        outcome_updated_at: outcomeUpdatedAt,
        updated_at: outcomeUpdatedAt,
      })
      .eq('user_id', userId)
      .eq('status', 'finalized')
      .is('outcome_status', null)
      .lt('applied_at', cutoff.toISOString())
      .select('id');

    if (error) {
      console.error('[CoverLetterTemplateService] Error auto-applying no response:', error);
      throw error;
    }

    const updatedIds = (data ?? []).map((row) => row.id as string);
    return { updatedIds, outcomeUpdatedAt };
  }

  /**
   * Load user's saved sections from database
   * Supports synthetic profile filtering when profileId is provided
   */
	  static async getUserSavedSections(
	    userId: string,
	    profileId?: string
	  ): Promise<SavedSection[]> {
	    console.log(`[SavedSections] Loading saved sections for user ${userId}${profileId ? ` (profile ${profileId})` : ''}`);

    const sources = await this.getCoverLetterSources(userId, profileId);
    const sourceIds = sources.map((source) => source.id);

	    const fetchSavedSections = async (): Promise<SavedSection[]> => {
	      const client = await this.getClient();
	      let builder = client
	        .from('saved_sections')
	        .select('*')
	        .eq('user_id', userId);

	      // Only constrain to cover letter sources when explicitly in a synthetic profile context.
	      // In normal usage we want *all* user saved sections, including manually created ones
	      // (which typically have `source_id = null`).
	      if (profileId && sourceIds.length > 0) {
	        const escapedSourceIds = sourceIds.map((id) => `"${id}"`).join(',');
	        builder = builder.or(`source_id.in.(${escapedSourceIds}),source_id.is.null`);
	      }

	      const { data, error } = await builder.order('created_at', { ascending: false });

      if (error) {
        console.error('[SavedSections] Database error loading saved sections:', error);
        console.error('[SavedSections] Error code:', error.code);
        console.error('[SavedSections] Error message:', error.message);
        console.error('[SavedSections] Error details:', error.details);
        console.error('[SavedSections] Error hint:', error.hint);

        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          throw new Error('saved_sections table does not exist. Please run the migration: 011_create_saved_sections.sql');
        }

        if (error.code === '23503' || error.message?.includes('foreign key')) {
          throw new Error('Database constraint error. The saved_sections table may need the foreign key fixed. Run migration: 011_fix_saved_sections_foreign_key.sql');
        }

        throw new Error(`Database error: ${error.message || 'Unknown error'}`);
      }

      const rows = (data ?? []) as SavedSectionsRow[];
      return rows.map((row) => this.mapRowToSavedSection(row));
    };

    let savedSections = await fetchSavedSections();

    const sourcesWithParagraphs = sources.filter((source) => {
      const paragraphs = source.structured_data?.paragraphs;
      const stories = Array.isArray((source.structured_data as any)?.stories) ? (source.structured_data as any).stories : [];
      const meta = (source.structured_data as any)?.metadata;
      const totalParas = meta?.totalParagraphs || 0;
      return (Array.isArray(paragraphs) && paragraphs.length > 0) || stories.length > 0 || totalParas > 0 || !!source.raw_text;
    });

    if (savedSections.length === 0 && sourcesWithParagraphs.length > 0) {
      console.log(`[SavedSections] No saved sections found. Attempting backfill from ${sourcesWithParagraphs.length} structured source(s).`);
      await this.backfillSavedSectionsFromSources(userId, sourcesWithParagraphs);
      savedSections = await fetchSavedSections();
    }

    console.log(`[SavedSections] Returning ${savedSections.length} saved sections for user ${userId}`);
    return savedSections;
  }

  /**
   * Update template
   */
  static async updateTemplate(
    templateId: string,
    updates: Partial<CoverLetterTemplateRecord>
  ): Promise<CoverLetterTemplateRecord> {
    const normalizedSections = updates.sections
      ? normalizeTemplateSectionsForDraft(updates.sections as unknown as CoverLetterSection[])
      : undefined;

    const client = await this.getClient();
    const { data, error } = await client
      .from('cover_letter_templates')
      .update({
        name: updates.name,
        sections: normalizedSections,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      throw error;
    }

    return data as CoverLetterTemplateRecord;
  }

  /**
   * Update saved section
   */
  static async updateSavedSection(
    sectionId: string,
    updates: Partial<SavedSection>
  ): Promise<SavedSection> {
    const updatePayload = {
      title: updates.title,
      content: updates.content,
      tags: updates.tags ?? undefined,
      times_used: updates.times_used ?? undefined,
      last_used: updates.last_used ?? undefined,
      function_type: updates.function_type ?? undefined,
      purpose_summary: updates.purpose_summary ?? undefined,
      purpose_tags: updates.purpose_tags ?? undefined,
      paragraph_index: updates.paragraph_index ?? undefined,
      updated_at: new Date().toISOString()
    };

    const sanitizedPayload = Object.fromEntries(
      Object.entries(updatePayload).filter(([, value]) => value !== undefined)
    ) as SavedSectionsUpdate;

    const client = await this.getClient();
    const { data, error } = await client
      .from('saved_sections')
      .update(sanitizedPayload as any)
      .eq('id', sectionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating saved section:', error);
      throw error;
    }

    return this.mapRowToSavedSection(data as SavedSectionsRow);
  }

  /**
   * Create new saved section (manual or generated)
   */
  static async createSavedSection(
    section: SavedSection
  ): Promise<SavedSection> {
    const payload: SavedSectionsInsert = {
      user_id: section.user_id,
      type: section.type,
      title: section.title,
      content: section.content,
      tags: section.tags ?? [],
      times_used: section.times_used ?? 0,
      last_used: section.last_used ?? null,
      source_id: section.source_id ?? null,
      paragraph_index: section.paragraph_index ?? null,
      function_type: section.function_type ?? null,
      purpose_summary: section.purpose_summary ?? null,
      purpose_tags: section.purpose_tags ?? []
    };

    const client = await this.getClient();
    const { data, error } = await client
      .from('saved_sections')
      .insert(payload as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating saved section:', error);
      throw error;
    }

    return this.mapRowToSavedSection(data as SavedSectionsRow);
  }

  /**
   * Delete saved section
   */
  static async deleteSavedSection(sectionId: string): Promise<void> {
    const client = await this.getClient();
    const { data: sectionRow, error: sectionError } = await client
      .from('saved_sections')
      .select('*')
      .eq('id', sectionId)
      .single();

    if (sectionError) {
      console.error('Error loading saved section for archive:', sectionError);
      throw sectionError;
    }

    if (sectionRow) {
      await SoftDeleteService.archiveRecord({
        userId: sectionRow.user_id,
        sourceTable: 'saved_sections',
        sourceId: sectionRow.id,
        sourceData: sectionRow,
        client
      });
    }

    const { error } = await client
      .from('saved_sections')
      .delete()
      .eq('id', sectionId);

    if (error) {
      console.error('Error deleting saved section:', error);
      throw error;
    }
  }

  /**
   * Delete cover letter draft
   */
  static async deleteCoverLetter(coverLetterId: string): Promise<void> {
    const client = await this.getClient();
    const { data: coverLetterRow, error: coverLetterError } = await client
      .from('cover_letters')
      .select('*')
      .eq('id', coverLetterId)
      .single();

    if (coverLetterError) {
      console.error('Error loading cover letter for archive:', coverLetterError);
      throw coverLetterError;
    }

    if (coverLetterRow) {
      await SoftDeleteService.archiveRecord({
        userId: coverLetterRow.user_id,
        sourceTable: 'cover_letters',
        sourceId: coverLetterRow.id,
        sourceData: coverLetterRow,
        client
      });
    }

    const { error } = await client
      .from('cover_letters')
      .delete()
      .eq('id', coverLetterId);

    if (error) {
      console.error('Error deleting cover letter:', error);
      throw error;
    }
  }

  /**
   * Increment usage counter for saved section
   */
  static async incrementSectionUsage(sectionId: string): Promise<void> {
    const client = await this.getClient();
    const { error } = await (client.rpc as any)('increment_section_usage', {
      section_id: sectionId
    });

    if (error) {
      // Fallback to manual increment if RPC doesn't exist yet
      const table = supabase.from('saved_sections') as any;
      const { data: section } = await table
        .select('times_used')
        .eq('id', sectionId)
        .single();

      if (section) {
        const client = await this.getClient();
        await client
          .from('saved_sections')
          .update({
            times_used: (section.times_used || 0) + 1,
            last_used: new Date().toISOString()
          } as any);
      }
    }
  }

  private static async getCoverLetterSources(
    userId: string,
    profileId?: string
  ): Promise<CoverLetterSourceRecord[]> {
    const client = await this.getClient();
    let builder = client
      .from('sources')
      .select('id, file_name, source_type, structured_data, raw_text, created_at')
      .eq('user_id', userId)
      .eq('source_type', 'cover_letter')
      .order('created_at', { ascending: false });

    if (profileId) {
      builder = builder.like('file_name', `${profileId}_%`);
    }

    const { data, error } = await builder;

    if (error) {
      console.error('[SavedSections] Error loading cover letter sources:', error);
      throw new Error(`Failed to load cover letter sources: ${error.message}`);
    }

    console.log(`[SavedSections] Loaded ${data?.length || 0} cover letter source(s) for user ${userId}${profileId ? ` (profile ${profileId})` : ''}`);
    return (data as CoverLetterSourceRecord[]) || [];
  }

  private static async backfillSavedSectionsFromSources(
    userId: string,
    sources: CoverLetterSourceRecord[]
  ): Promise<void> {
    if (sources.length === 0) {
      return;
    }

    let userTemplates: CoverLetterTemplateRecord[] | null = null;

    for (const source of sources) {
      try {
        const client = await this.getClient();
        const { count, error: countError } = await client
          .from('saved_sections')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('source_id', source.id);

        if (countError) {
          console.error(`[SavedSections] Backfill: error checking existing sections for source ${source.file_name}`, countError);
          continue;
        }

        if ((count ?? 0) > 0) {
          continue;
        }

        const parsed = typeof source.structured_data === 'string'
          ? (JSON.parse(source.structured_data) as ParsedCoverLetter)
          : (source.structured_data as ParsedCoverLetter | undefined);

        // NEW FORMAT: Check for stories array (internal extractor format)
        const hasNewFormat = parsed && Array.isArray((parsed as any).stories) && (parsed as any).stories.length > 0;
        
        if (hasNewFormat) {
          // Stories detected - but we still need to parse paragraphs for saved sections
          // Fall through to raw_text parsing below
          console.log(`[SavedSections] Backfill: Source has ${(parsed as any).stories.length} stories, will parse raw_text for paragraphs`);

          try {
            const created = await this.createSavedSections(sectionsToCreate as any, undefined);
            console.log(`[SavedSections] Backfill: created ${created.length} section(s) from stories for ${source.file_name}`);
            
            // Detect gaps for each section
            if (created.length > 0) {
              try {
                const { GapDetectionService } = await import('./gapDetectionService');
                const gapPayload: any[] = [];
                for (const section of created) {
                  const gaps = await GapDetectionService.detectCoverLetterSectionGaps(userId, {
                    id: section.id!,
                    type: section.type as 'intro' | 'paragraph' | 'closer' | 'signature',
                    content: section.content,
                    title: section.title
                  });
                  gapPayload.push(...gaps);
                }
                if (gapPayload.length > 0) {
                  await GapDetectionService.saveGaps(gapPayload);
                }
              } catch (gapError) {
                console.warn(`[SavedSections] Backfill: gap detection failed for ${source.file_name}`, gapError);
              }
            }
          } catch (e) {
            console.error(`[SavedSections] Backfill: failed to create sections from stories for ${source.file_name}`, e);
          }
          continue;
        }

        // OLD FORMAT OR FALLBACK: If no paragraphs present, attempt to parse raw_text via rule-based parser
        if ((!parsed || !Array.isArray(parsed.paragraphs) || parsed.paragraphs.length === 0) && typeof source.raw_text === 'string') {
          try {
            const parsedFallback = parseCoverLetter(source.raw_text);
            const sections = convertToSavedSections(parsedFallback);
            if (sections.length > 0) {
              await this.createSavedSections(
                sections.map((section) => ({
                  user_id: userId,
                  title: section.title,
                  content: section.content,
                  source_id: source.id,
                  type: section.slug === 'introduction'
                    ? 'intro'
                    : section.slug === 'closing'
                    ? 'closer'
                    : section.slug.startsWith('body')
                    ? 'paragraph'
                    : section.slug,
                  is_dynamic: !section.isStatic,
                  paragraph_index: section.order,
                  tags: [],
                  function_type: null,
                  purpose_summary: null,
                  purpose_tags: []
                })) as any,
                undefined
              );
              console.log(`[SavedSections] Backfill: created ${sections.length} section(s) via raw_text parse for ${source.file_name}`);
            }
          } catch (e) {
            console.warn(`[SavedSections] Backfill: failed raw_text parse for ${source.file_name}`, e);
          }
          continue;
        }

        if (!parsed || !Array.isArray(parsed.paragraphs) || parsed.paragraphs.length === 0) {
          console.log(`[SavedSections] Backfill: source ${source.file_name} has no paragraph data`);
          continue;
        }

        const { savedSections, templateStructure } = await this.decomposeCoverLetter(userId, parsed, source.id, {
          rawText: typeof source.raw_text === 'string' ? source.raw_text : undefined,
          fileName: source.file_name,
          createdAt: source.created_at
        });

        if (savedSections.length === 0) {
          console.log(`[SavedSections] Backfill: no static sections detected in ${source.file_name}`);
          continue;
        }

        const createdSections = await this.createSavedSections(savedSections, undefined);
        console.log(`[SavedSections] Backfill: created ${createdSections.length} section(s) for ${source.file_name}`);

        if (createdSections.length > 0) {
          try {
            const { GapDetectionService } = await import('./gapDetectionService');
            const gapPayload: any[] = [];
            for (const section of createdSections) {
              const gaps = await GapDetectionService.detectCoverLetterSectionGaps(userId, {
                id: section.id!,
                type: section.type as 'intro' | 'paragraph' | 'closer' | 'signature',
                content: section.content,
                title: section.title
              });
              gapPayload.push(...gaps);
            }
            if (gapPayload.length > 0) {
              await GapDetectionService.saveGaps(gapPayload);
            }
          } catch (gapError) {
            console.error('[SavedSections] Backfill: failed to create gaps for saved sections', gapError);
          }
        }

        if (templateStructure.length > 0) {
          if (!userTemplates) {
            userTemplates = await this.getUserTemplates(userId, undefined);
          }

          if ((userTemplates?.length ?? 0) === 0) {
            try {
              const template = await this.createDefaultTemplate(
                userId,
                'Professional Template',
                templateStructure,
                createdSections,
                undefined
              );
              console.log(`[SavedSections] Backfill: created default template ${template.id}`);
              userTemplates = [template];
            } catch (templateError) {
              console.error('[SavedSections] Backfill: error creating default template', templateError);
            }
          }
        }
      } catch (error) {
        console.error(`[SavedSections] Backfill error for source ${source.file_name}:`, error);
      }
    }
  }

  // Helper methods
  private static mapParagraphFunctionToSectionType(
    paragraph: CoverLetterParagraph,
    index: number,
    totalParagraphs: number,
    hasExplicitIntro: boolean,
    hasExplicitSignature: boolean
  ): 'intro' | 'paragraph' | 'closer' | 'signature' | 'philosophy' | 'team' | null {
    const func = paragraph.function;
    const text = paragraph.rawText?.toLowerCase?.() ?? '';

    switch (func) {
      case 'intro':
        return 'intro';
      case 'closer':
        return 'closer';
      case 'story':
        return 'paragraph';
      case 'signature':
        return 'signature';
      case 'other':
        if (index === 0 && /(dear|hello|hi|greetings)/.test(text.split(/\s+/)[0] ?? '')) {
          return hasExplicitIntro ? null : 'intro';
        }
        if (!hasExplicitSignature && index === totalParagraphs - 1 && /(regards|sincerely|best|thank you|cheers)/.test(text)) {
          return 'signature';
        }
        if (text.includes('my approach') || text.includes('i believe') || text.includes('approach balances')) {
          return 'philosophy';
        }
        if (text.includes('team') || text.includes('collaboration') || text.includes('transparency')) {
          return 'team';
        }
        return null;
      default:
        return null;
    }
  }

  private static generateSectionTitle(
    type: string,
    paragraph: CoverLetterParagraph,
    options?: {
      sourceFileName?: string;
      createdAt?: string;
      paragraphIndex?: number;
      labelOverride?: string;
    }
  ): string {
    const descriptor = this.getSourceDescriptor(options?.sourceFileName, options?.createdAt);
    const labelOverride = options?.labelOverride?.trim();

    if (labelOverride) {
      if (descriptor) {
        return `${descriptor} · ${labelOverride}`;
      }
      return labelOverride;
    }

    const baseTitle = (() => {
      switch (type) {
        case 'intro':
          return 'Introduction';
        case 'paragraph':
          return 'Body Paragraph';
        case 'closer':
          return 'Closing';
        case 'signature':
          return 'Signature';
        default:
          return `${type.charAt(0).toUpperCase() + type.slice(1)} Section`;
      }
    })();

    if (descriptor) {
      return `${descriptor} · ${baseTitle}`;
    }

    const tags = paragraph.purposeTags?.join(', ') ?? '';
    if (tags) {
      return `${tags} ${baseTitle}`;
    }

    if (options?.paragraphIndex !== undefined) {
      return `${baseTitle} ${options.paragraphIndex + 1}`;
    }

    return `Professional ${baseTitle}`;
  }

  /**
   * Generate template section title based on type and index
   * Examples: "Introduction", "Body Paragraph 1", "Body Paragraph 2", "Closing", "Signature"
   */
  private static generateTemplateSectionTitle(
    type: 'intro' | 'paragraph' | 'closer' | 'signature',
    existingCountOfType: number
  ): string {
    switch (type) {
      case 'intro':
        return 'Introduction';
      case 'paragraph':
        return `Body Paragraph ${existingCountOfType + 1}`;
      case 'closer':
        return 'Closing';
      case 'signature':
        return 'Signature';
      default:
        return `Section ${existingCountOfType + 1}`;
    }
  }

  private static parseSections(value: any): TemplateSection[] {
    if (Array.isArray(value)) {
      return value as TemplateSection[];
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as TemplateSection[]) : [];
      } catch (error) {
        console.warn('[CoverLetterTemplateService] Failed to parse template sections JSON', error);
        return [];
      }
    }
    return [];
  }

  private static mapRowToSavedSection(row: SavedSectionsRow): SavedSection {
    return {
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      title: row.title,
      content: row.content,
      tags: row.tags ?? [],
      times_used: row.times_used ?? 0,
      last_used: row.last_used ?? undefined,
      source_id: row.source_id ?? undefined,
      paragraph_index: row.paragraph_index ?? undefined,
      function_type: row.function_type ?? undefined,
      purpose_summary: row.purpose_summary ?? undefined,
      purpose_tags: row.purpose_tags ?? [],
      is_dynamic: row.is_dynamic ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private static mapRowToTemplate(row: CoverLetterTemplatesRow): DomainCoverLetterTemplate {
    const parsedSections = this.parseSections(row.sections);
    const mergedSections = this.mergeSignatureTemplateSections(parsedSections);

    return {
      id: row.id,
      name: row.name,
      sections: mergedSections,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private static getSourceDescriptor(fileName?: string, createdAt?: string): string | null {
    const parts: string[] = [];

    if (fileName) {
      const withoutExt = fileName.replace(/\.[^/.]+$/, '');
      const cleaned = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned.length > 0) {
        parts.push(this.capitalizeWords(cleaned));
      }
    }

    if (createdAt) {
      const date = new Date(createdAt);
      if (!isNaN(date.getTime())) {
        const formatted = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        parts.push(formatted);
      }
    }

    if (parts.length === 0) {
      return null;
    }

    return parts.join(' · ');
  }

  private static capitalizeWords(input: string): string {
    return input
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private static extractSignature(rawText: string | undefined, closingParagraph: string): string | null {
    if (!rawText || typeof rawText !== 'string') {
      return null;
    }

    const closingIndex = rawText.indexOf(closingParagraph);
    if (closingIndex === -1) {
      return null;
    }

    const afterClosing = rawText.slice(closingIndex + closingParagraph.length).trim();
    if (!afterClosing) {
      return null;
    }

    const lines = afterClosing
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0 || lines.join(' ').length > 120) {
      return null;
    }

    const signoffKeywords = ['regards', 'sincerely', 'best', 'thanks', 'thank you', 'cheers'];
    const combined = lines.join(' ').toLowerCase();

    if (!signoffKeywords.some(keyword => combined.includes(keyword))) {
      return null;
    }

    return lines.join('\n');
  }

  private static mergeSignatureTemplateSections(sections: TemplateSection[]): TemplateSection[] {
    if (!Array.isArray(sections) || sections.length === 0) {
      return sections ?? [];
    }

    const ordered = sections
      .map((section) => ({ ...section }))
      .sort((a, b) => {
        const aOrder = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
        const bOrder = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        const aId = a.id ?? '';
        const bId = b.id ?? '';
        return aId.localeCompare(bId);
      });

    const normalized: TemplateSection[] = [];

    ordered.forEach((section) => {
      if (section.type !== 'signature') {
        normalized.push({ ...section });
        return;
      }

      const signatureContent = section.staticContent?.trim();
      if (!signatureContent) {
        return;
      }

      for (let i = normalized.length - 1; i >= 0; i -= 1) {
        const candidate = normalized[i];
        if (candidate.type === 'closer') {
          const existingContent = candidate.staticContent ?? '';
          const alreadyIncluded = existingContent
            .toLowerCase()
            .includes(signatureContent.toLowerCase());

          if (!alreadyIncluded) {
            const combinedContent = existingContent
              ? `${existingContent.trim()}\n\n${signatureContent}`
              : signatureContent;
            normalized[i] = {
              ...candidate,
              staticContent: combinedContent.trim()
            };
          }
          return;
        }
      }

      normalized.push({
        ...section,
        type: 'closer'
      });
    });

    return normalized;
  }

  private static async getClient(accessToken?: string): Promise<any> {
    if (!accessToken) {
      return supabase as any;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const url = (import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '');
    const key = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '');
    return createClient(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }) as any;
  }

  /**
   * Process uploaded cover letter and create template + saved sections
   * Main entry point for onboarding flow
   */
  static async processUploadedCoverLetter(
    userId: string,
    parsedData: ParsedCoverLetter,
    sourceFileId: string,
    templateName: string = 'Professional Template',
    rawCoverLetterContext?: CoverLetterSourceContext | string,
    accessToken?: string
  ): Promise<{
    template: DomainCoverLetterTemplate;
    savedSections: SavedSection[];
  }> {
    try {
      const sourceContext: CoverLetterSourceContext | undefined =
        typeof rawCoverLetterContext === 'string'
          ? { rawText: rawCoverLetterContext }
          : rawCoverLetterContext;

      // 1. Decompose cover letter into saved sections and template structure
      const { savedSections, templateStructure } = await this.decomposeCoverLetter(
        userId,
        parsedData,
        sourceFileId,
        sourceContext
      );

      // 2. Create saved sections in database
      const createdSavedSections = await this.createSavedSections(savedSections, accessToken);

      // 2b. Run gap detection on the new saved sections so UX can surface banners immediately
      try {
        if (createdSavedSections.length > 0) {
          const { GapDetectionService } = await import('./gapDetectionService');
          const sectionGaps: any[] = [];

          for (const section of createdSavedSections) {
            const gaps = await GapDetectionService.detectCoverLetterSectionGaps(userId, {
              id: section.id!,
              type: section.type as 'intro' | 'paragraph' | 'closer' | 'signature',
              content: section.content,
              title: section.title
            });
            sectionGaps.push(...gaps);
          }

          if (sectionGaps.length > 0) {
            await GapDetectionService.saveGaps(sectionGaps, accessToken);
          }
        }
      } catch (gapError) {
        console.error('[CoverLetterTemplateService] Failed to detect cover letter section gaps:', gapError);
      }

      // 3. Create template with references to saved sections
      const template = await this.createDefaultTemplate(
        userId,
        templateName,
        templateStructure,
        createdSavedSections,
        accessToken
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
