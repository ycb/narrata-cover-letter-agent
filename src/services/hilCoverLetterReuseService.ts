import { supabase } from '@/lib/supabase';
import { CoverLetterTemplateService } from '@/services/coverLetterTemplateService';
import type { CoverLetterDraft, CoverLetterDraftSection } from '@/types/coverLetters';
import type { ContentVariationInsert } from '@/types/variations';

type GapChip = { id: string; title?: string; description: string };

export interface CoverLetterHilGapPayload {
  paragraphId?: string;
  description?: string;
  gaps?: GapChip[];
  ratingCriteriaGaps?: GapChip[];
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeVariationContent(value: string): string {
  return normalizeSpaces(value).toLowerCase();
}

function normalizeTag(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Keep tags fairly short for UI + matching heuristics.
  return cleaned.length > 60 ? cleaned.slice(0, 60).trim() : cleaned;
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function takeNonEmpty(items: Array<string | undefined | null>): string[] {
  return items.map(v => (v ?? '').trim()).filter(Boolean);
}

function deriveGapLabels(gap: CoverLetterHilGapPayload): string[] {
  const requirementLabels = (gap.gaps ?? []).map(g => g.title || g.description);
  const ratingLabels = (gap.ratingCriteriaGaps ?? []).map(g => g.title || g.description);
  const fallback = gap.description ? [gap.description] : [];
  return takeNonEmpty([...requirementLabels, ...ratingLabels, ...fallback]);
}

function titleCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildSemanticTitle(params: {
  kind: 'story_variation' | 'saved_section';
  paragraphId?: string;
  sectionTitle?: string;
  role?: string;
  company?: string;
  primaryGapLabel?: string;
}): string {
  const sectionPrefix =
    params.paragraphId === 'intro'
      ? 'Intro'
      : params.paragraphId === 'closing'
      ? 'Closing'
      : params.paragraphId === 'experience'
      ? 'Experience'
      : params.sectionTitle
      ? titleCase(params.sectionTitle)
      : 'Section';

  const jobPart = normalizeSpaces(
    [params.role, params.company ? `@ ${params.company}` : null].filter(Boolean).join(' '),
  );
  const gapPart = params.primaryGapLabel ? normalizeSpaces(params.primaryGapLabel) : '';

  if (params.kind === 'saved_section') {
    const base = gapPart ? `${sectionPrefix}: ${gapPart}` : `${sectionPrefix}: Generated`;
    return base.length > 90 ? `${base.slice(0, 90).trim()}…` : base;
  }

  const base = [jobPart ? `CL ${jobPart}` : 'CL', sectionPrefix, gapPart ? `– ${gapPart}` : null]
    .filter(Boolean)
    .join(' ');
  return base.length > 110 ? `${base.slice(0, 110).trim()}…` : base;
}

function buildGapTags(params: {
  paragraphId?: string;
  gapLabels: string[];
  gapCategory?: string;
}): string[] {
  const labelTags = params.gapLabels.map(normalizeTag).filter(Boolean);
  const baseTags = [
    'hil',
    'cover letter',
    params.paragraphId ? `section ${params.paragraphId}` : null,
    params.gapCategory ? `gap ${params.gapCategory}` : null,
  ]
    .filter(Boolean)
    .map(normalizeTag);

  return uniq([...baseTags, ...labelTags]).filter(Boolean);
}

function inferSavedSectionType(
  section: Pick<CoverLetterDraftSection, 'slug' | 'type'>,
  paragraphId?: string,
): 'intro' | 'closer' | 'signature' | 'paragraph' {
  const slug = (section.slug || '').toLowerCase();
  const type = String(section.type || '').toLowerCase();

  if (paragraphId === 'intro' || slug.includes('intro') || type.includes('intro')) return 'intro';
  if (paragraphId === 'closing' || slug.includes('closing') || type.includes('closer') || type.includes('closing'))
    return 'closer';
  if (slug.includes('signature') || type.includes('signature')) return 'signature';
  return 'paragraph';
}

export async function persistCoverLetterHilReuseArtifact(params: {
  userId: string;
  draft: Pick<CoverLetterDraft, 'jobDescriptionId' | 'role' | 'company' | 'id'>;
  section: Pick<CoverLetterDraftSection, 'id' | 'slug' | 'title' | 'type' | 'source' | 'metadata'>;
  content: string;
  gap: CoverLetterHilGapPayload;
  gapRecord?: { id: string; category: string };
}): Promise<{ variationId?: string; savedSectionId?: string }> {
  const content = params.content.trim();
  if (!content) return {};

  const sourceKind = params.section.source?.kind;
  const sourceEntityId = params.section.source?.entityId;
  if (!sourceKind) return {};

  const gapLabels = deriveGapLabels(params.gap);
  const primaryGapLabel = gapLabels[0];
  const tags = buildGapTags({ paragraphId: params.gap.paragraphId, gapLabels, gapCategory: params.gapRecord?.category });

  if (sourceKind === 'work_story' && sourceEntityId) {
    const cleaned = normalizeVariationContent(content);
    const { data: existingVariations, error: existingError } = await supabase
      .from('content_variations')
      .select('id, content, filled_gap_id, gap_tags')
      .eq('user_id', params.userId)
      .eq('parent_entity_type', 'approved_content')
      .eq('parent_entity_id', sourceEntityId);

    if (!existingError && cleaned) {
      const duplicate = (existingVariations || []).find((variation: any) =>
        normalizeVariationContent(String(variation.content || '')) === cleaned,
      );
      if (duplicate?.id) {
        const mergedTags = Array.from(new Set([...(duplicate.gap_tags ?? []), ...tags]));
        const updatePayload: { filled_gap_id?: string; gap_tags?: string[] } = {};
        if (params.gapRecord?.id && !duplicate.filled_gap_id) {
          updatePayload.filled_gap_id = params.gapRecord.id;
        }
        if (mergedTags.length !== (duplicate.gap_tags ?? []).length) {
          updatePayload.gap_tags = mergedTags;
        }
        if (Object.keys(updatePayload).length > 0) {
          await supabase.from('content_variations').update(updatePayload).eq('id', duplicate.id);
        }
        return { variationId: duplicate.id };
      }
    }

    const title = buildSemanticTitle({
      kind: 'story_variation',
      paragraphId: params.gap.paragraphId,
      sectionTitle: params.section.title,
      role: params.draft.role,
      company: params.draft.company,
      primaryGapLabel,
    });

    const variationInsert: ContentVariationInsert = {
      user_id: params.userId,
      parent_entity_type: 'approved_content',
      parent_entity_id: sourceEntityId,
      title,
      content,
      filled_gap_id: params.gapRecord?.id ?? null,
      gap_tags: tags,
      target_job_title: params.draft.role ?? null,
      target_company: params.draft.company ?? null,
      job_description_id: params.draft.jobDescriptionId ?? null,
      created_by: 'AI',
      times_used: 0,
    };

    const { data, error } = await supabase
      .from('content_variations')
      .insert(variationInsert as any)
      .select('id')
      .single();

    if (error) throw error;
    return { variationId: data?.id as string };
  }

  if (sourceKind === 'saved_section') {
    const sectionType = inferSavedSectionType(params.section, params.gap.paragraphId);
    const title = buildSemanticTitle({
      kind: 'saved_section',
      paragraphId: params.gap.paragraphId,
      sectionTitle: params.section.title,
      primaryGapLabel,
    });

    const savedSection = await CoverLetterTemplateService.createSavedSection({
      user_id: params.userId,
      type: sectionType as any,
      title,
      content,
      tags,
      times_used: 0,
      last_used: null,
      source_id: params.draft.id,
      paragraph_index: (params.section as any)?.order ?? null,
      function_type: null,
      purpose_summary: primaryGapLabel ? normalizeSpaces(primaryGapLabel) : null,
      purpose_tags: tags,
    } as any);

    return { savedSectionId: savedSection.id };
  }

  return {};
}
