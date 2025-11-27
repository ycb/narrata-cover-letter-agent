/**
 * CANONICAL GAP SYSTEM
 * 
 * Version: 2025-11-27
 * 
 * Single source of truth for gap data.
 * Merges streaming + draft gaps into one consistent structure.
 * 
 * KEY RULES:
 * 1. Section IDs are authoritative (not slugs/titles)
 * 2. Gaps are additive (streaming ∪ draft, not override)
 * 3. Empty arrays don't block non-empty arrays
 * 4. Deduplication by id or (requirementId, type)
 */

import type { SectionGapInsight } from '@/types/coverLetters';

/**
 * Represents one requirement gap.
 * This matches the current requirementGaps structure.
 */
export interface Gap {
  id?: string;
  requirementId?: string;
  type?: string;
  requirement?: string;
  currentEvidence?: string;
  suggestion?: string;
  severity?: 'critical' | 'important' | 'nice-to-have';
  category?: string;
  [key: string]: any; // Allow other fields
}

/**
 * Section-level gap data from either streaming or draft.
 */
export interface SectionGapData {
  sectionId: string;
  sectionSlug?: string;
  sectionTitle?: string;
  requirementGaps: Gap[];
}

/**
 * Streaming gap format from jobState.result.sectionGaps
 */
export interface StreamingGapResult {
  sections?: SectionGapData[];
  totalGaps?: number;
}

/**
 * Generate a unique key for gap deduplication.
 * Priority: id > (requirementId + type) > requirement text
 */
function getGapKey(gap: Gap): string {
  if (gap.id) return gap.id;
  if (gap.requirementId && gap.type) return `${gap.requirementId}:${gap.type}`;
  if (gap.requirement) return `text:${gap.requirement.substring(0, 50)}`;
  // Fallback: stringify entire gap (rare)
  return JSON.stringify(gap);
}

/**
 * Deduplicate an array of gaps.
 * Later gaps with the same key override earlier ones.
 */
function deduplicateGaps(gaps: Gap[]): Gap[] {
  const gapMap = new Map<string, Gap>();
  
  for (const gap of gaps) {
    const key = getGapKey(gap);
    gapMap.set(key, gap);
  }
  
  return Array.from(gapMap.values());
}

/**
 * CANONICAL GAP MERGE FUNCTION
 * 
 * Builds effectiveSectionGaps: Map<sectionId, Gap[]>
 * 
 * Sources:
 * - streamingGaps: jobState.result.sectionGaps
 * - draftGaps: draft.enhancedMatchData.sectionGapInsights
 * 
 * Rules:
 * 1. Collect ALL gaps from both sources by sectionId
 * 2. Union gaps for each section (streaming ∪ draft)
 * 3. Deduplicate by gap key
 * 4. Empty arrays don't override non-empty arrays
 * 
 * @param streamingGaps - Gap data from streaming pipeline
 * @param draftGaps - Gap data from draft enhancedMatchData
 * @returns Map of sectionId → deduplicated gaps
 */
export function buildEffectiveSectionGapMap(
  streamingGaps: StreamingGapResult | SectionGapData[] | null | undefined,
  draftGaps: SectionGapData[] | null | undefined
): Map<string, Gap[]> {
  const effectiveGaps = new Map<string, Gap[]>();
  
  // Normalize streaming gaps - handle both formats:
  // Format 1: { sections: [...] } (StreamingGapResult)
  // Format 2: [...] (direct array of SectionGapData)
  let streamingSections: SectionGapData[] = [];
  if (streamingGaps) {
    if (Array.isArray(streamingGaps)) {
      streamingSections = streamingGaps;
    } else if ('sections' in streamingGaps && Array.isArray(streamingGaps.sections)) {
      streamingSections = streamingGaps.sections;
    }
  }
  
  // Normalize draft gaps (already array format)
  const draftSections = Array.isArray(draftGaps) ? draftGaps : [];
  
  console.log('[GAPS] buildEffectiveSectionGapMap:', {
    streamingInput: streamingGaps,
    streamingSectionCount: streamingSections.length,
    draftSectionCount: draftSections.length,
  });
  
  // Collect all section IDs
  const allSectionIds = new Set<string>();
  streamingSections.forEach(s => allSectionIds.add(s.sectionId));
  draftSections.forEach(s => allSectionIds.add(s.sectionId));
  
  // For each section, merge gaps
  for (const sectionId of allSectionIds) {
    const streamingSection = streamingSections.find(s => s.sectionId === sectionId);
    const draftSection = draftSections.find(s => s.sectionId === sectionId);
    
    const streamingGapList = streamingSection?.requirementGaps || [];
    const draftGapList = draftSection?.requirementGaps || [];
    
    // CRITICAL FIX: Union, not override
    // If streaming has gaps but draft is [], use streaming
    // If draft has gaps but streaming is [], use draft
    // If both have gaps, merge them
    const allGaps = [...streamingGapList, ...draftGapList];
    const dedupedGaps = deduplicateGaps(allGaps);
    
    if (dedupedGaps.length > 0) {
      effectiveGaps.set(sectionId, dedupedGaps);
      console.log(`[GAPS] Section ${sectionId}: ${streamingGapList.length} streaming + ${draftGapList.length} draft = ${dedupedGaps.length} effective`);
    }
  }
  
  console.log('[GAPS] Final effective section gaps:', {
    sectionCount: effectiveGaps.size,
    totalGaps: Array.from(effectiveGaps.values()).reduce((sum, gaps) => sum + gaps.length, 0),
  });
  
  return effectiveGaps;
}

/**
 * Build global gap list from section gaps.
 * Flattens all gaps across sections and deduplicates.
 * 
 * @param effectiveSectionGaps - Map from buildEffectiveSectionGapMap
 * @returns Deduplicated array of all gaps
 */
export function buildEffectiveGlobalGaps(
  effectiveSectionGaps: Map<string, Gap[]>
): Gap[] {
  const allGaps: Gap[] = [];
  
  for (const gaps of effectiveSectionGaps.values()) {
    allGaps.push(...gaps);
  }
  
  const dedupedGaps = deduplicateGaps(allGaps);
  
  console.log('[GAPS] buildEffectiveGlobalGaps:', {
    totalBeforeDedup: allGaps.length,
    totalAfterDedup: dedupedGaps.length,
  });
  
  return dedupedGaps;
}

/**
 * DIAGNOSTIC: Log gap counts when both sources are empty.
 * This should be rare - most JDs should produce at least some gaps.
 */
export function logEmptyGapDiagnostic(
  streamingGaps: StreamingGapResult | null | undefined,
  draftGaps: SectionGapData[] | null | undefined
): void {
  const streamingCount = streamingGaps?.sections?.reduce(
    (sum, s) => sum + (s.requirementGaps?.length || 0), 
    0
  ) || 0;
  
  const draftCount = Array.isArray(draftGaps) 
    ? draftGaps.reduce((sum, s) => sum + (s.requirementGaps?.length || 0), 0)
    : 0;
  
  console.log('[GAPS] Source counts:', {
    streaming: streamingCount,
    draft: draftCount,
  });
  
  if (streamingCount === 0 && draftCount === 0) {
    console.warn('[GAPS] No gaps found from either source. This should be rare.');
  }
}

