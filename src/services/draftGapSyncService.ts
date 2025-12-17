import { supabase } from '@/lib/supabase';

type GapChip = { id: string; title?: string; description: string };

export interface DraftGapUpsertInput {
  userId: string;
  draftId: string;
  sectionId: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggestion?: string;
  paragraphId?: string;
  requirementGaps?: GapChip[];
  ratingCriteriaGaps?: GapChip[];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildGapCategory(input: Pick<DraftGapUpsertInput, 'sectionId' | 'description' | 'paragraphId'>): string {
  // We need a stable key to avoid creating duplicate rows. Gaps table has no uniqueness constraint,
  // so we upsert by (user_id, entity_type, entity_id, gap_category).
  const basis = normalize([input.paragraphId, input.sectionId, input.description].filter(Boolean).join('|'));
  // Keep it readable and bounded.
  const compact = basis.replace(/[^a-z0-9|]/g, '');
  return compact.length > 120 ? compact.slice(0, 120) : compact;
}

export class DraftGapSyncService {
  static async upsertCoverLetterDraftGap(input: DraftGapUpsertInput): Promise<{ gapId: string; gapCategory: string }> {
    const gapCategory = `draft_gap:${buildGapCategory(input)}`;

    // Find existing.
    const { data: existing, error: existingError } = await supabase
      .from('gaps')
      .select('id')
      .eq('user_id', input.userId)
      .eq('entity_type', 'cover_letter_drafts')
      .eq('entity_id', input.draftId as any)
      .eq('gap_category', gapCategory)
      .maybeSingle();

    if (existingError) throw existingError;

    const suggestionsPayload = [
      input.suggestion ? { suggestion: input.suggestion } : null,
      ...(input.requirementGaps ?? []).map(g => ({ id: g.id, title: g.title, description: g.description, kind: 'requirement' })),
      ...(input.ratingCriteriaGaps ?? []).map(g => ({ id: g.id, title: g.title, description: g.description, kind: 'rating_criteria' })),
    ].filter(Boolean);

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('gaps')
        .update({
          severity: input.severity,
          description: input.description,
          suggestions: suggestionsPayload as any,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', existing.id)
        .eq('user_id', input.userId);

      if (updateError) throw updateError;
      return { gapId: existing.id as string, gapCategory };
    }

    const { data: created, error: insertError } = await supabase
      .from('gaps')
      .insert({
        user_id: input.userId,
        entity_type: 'cover_letter_drafts',
        entity_id: input.draftId,
        gap_type: 'best_practice',
        gap_category: gapCategory,
        severity: input.severity,
        description: input.description,
        suggestions: suggestionsPayload as any,
        resolved: false,
      } as any)
      .select('id')
      .single();

    if (insertError) throw insertError;
    return { gapId: created.id as string, gapCategory };
  }
}

