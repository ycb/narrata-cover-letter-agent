import { useMemo } from 'react';
import type { EnhancedMatchData, ContentStandardsAnalysis } from '@/types/coverLetters';
import type { SectionAttributionData } from './SectionInspector';
import { getStandardConfig, getApplicableStandards } from '@/config/contentStandards';

export interface CoverLetterCriterion {
  id: string;
  label: string;
  met: boolean;
  evidence: string;
  suggestion?: string;
}

/**
 * Normalize section type for semantic matching
 *
 * CONTEXT: System supports TWO formats for sectionIds from LLM:
 * 1. UUID format: "section-1-1", "section-2-3" (PREFERRED - from requirementAnalysis.ts)
 * 2. Semantic format: "introduction", "experience", "closing" (LEGACY - from enhancedMetricsAnalysis.ts)
 *
 * This function handles semantic matching for backward compatibility and
 * cases where LLM returns slugs instead of UUIDs.
 *
 * @param type - Section type/slug from the draft (e.g., "introduction", "paragraph", "dynamic-story")
 * @returns Array of semantic aliases to match against LLM sectionIds
 */
const normalizeSectionType = (type: string): string[] => {
  // Canonical semantic types and their aliases
  const aliases: Record<string, string[]> = {
    'introduction': ['introduction', 'intro', 'opening'],
    'experience': ['experience', 'exp', 'background', 'body', 'paragraph'],
    'closing': ['closing', 'conclusion', 'closer'],
    'signature': ['signature', 'signoff'],
  };

  const lowerType = type.toLowerCase();

  // Map DraftSectionType values to semantic types
  const typeMapping: Record<string, string> = {
    'intro': 'introduction',
    'paragraph': 'experience',
    'closer': 'closing',
    // Dynamic section types map to experience by default
    'static': 'introduction',
    'dynamic-story': 'experience',
    'dynamic-saved': 'experience',
  };

  const mappedType = typeMapping[lowerType] || lowerType;

  // Find canonical variations
  for (const [canonical, variations] of Object.entries(aliases)) {
    if (canonical === mappedType || variations.includes(mappedType) || variations.includes(lowerType)) {
      return variations;
    }
  }

  // Fallback: return both original and mapped type
  return [mappedType, lowerType];
};

/**
 * Pure function to compute section attribution (no React hooks)
 * Can be called from anywhere, including inside loops
 */
export function computeSectionAttribution({
  sectionId,
  sectionType,
  sectionCategory,
  enhancedMatchData,
  ratingCriteria,
  contentStandards,
}: {
  sectionId: string;
  sectionType: string;
  sectionCategory?: 'intro' | 'body' | 'closing'; // Optional: pre-computed category (e.g., from position)
  enhancedMatchData?: EnhancedMatchData | null;
  ratingCriteria?: CoverLetterCriterion[];
  contentStandards?: ContentStandardsAnalysis | null;
}): {
  attribution: SectionAttributionData;
  summary: {
    coreMetCount: number;
    prefMetCount: number;
    standardsMetCount: number;
  };
} {
  const normalizedTypes = normalizeSectionType(sectionType);

  // Initialize empty attribution
  const attribution: SectionAttributionData = {
    coreReqs: { met: [], unmet: [] },
    prefReqs: { met: [], unmet: [] },
    standards: { met: [], unmet: [] },
  };

  // 1. Process Core Requirements
  if (enhancedMatchData?.coreRequirementDetails) {
    const allCoreReqs = enhancedMatchData.coreRequirementDetails;

    // Met requirements: demonstrated AND addressed in this section
    const metInSection = allCoreReqs.filter(req => {
      if (!req.demonstrated) return false;
      const sectionIds = req.sectionIds || [];

      // Check if this section is mentioned
      // Priority: UUID match (exact) > Semantic match (fuzzy)
      const matched = sectionIds.some(sid => {
        // Path 1: Direct UUID match (PREFERRED)
        // Example: sid="section-1-1" === sectionId="section-1-1"
        if (sid === sectionId) {
          console.log(`[MATCH PATH 1] ✓ UUID Match for "${req.requirement}": ${sid} === ${sectionId}`);
          return true;
        }

        // Path 2: Semantic type match (LEGACY/FALLBACK)
        // Example: sid="introduction" matches normalizedTypes=["introduction", "intro", "opening"]
        // Used when LLM returns semantic slugs instead of UUIDs
        const lowerSid = sid.toLowerCase();
        const semanticMatch = normalizedTypes.some(nt => lowerSid.includes(nt) || nt.includes(lowerSid));
        if (semanticMatch) {
          console.log(`[MATCH PATH 2] ⚠️ Semantic Type Match for "${req.requirement}": ${sid} → ${normalizedTypes.join(', ')}`);
        }
        return semanticMatch;
      });

      return matched;
    });

    attribution.coreReqs.met = metInSection.map(req => ({
      id: req.id,
      label: req.requirement,
      evidence: req.evidence,
    }));

    // Unmet requirements: all core reqs not demonstrated
    const unmet = allCoreReqs.filter(req => !req.demonstrated);
    attribution.coreReqs.unmet = unmet.map(req => ({
      id: req.id,
      label: req.requirement,
    }));
  }

  // 2. Process Preferred Requirements
  if (enhancedMatchData?.preferredRequirementDetails) {
    const allPrefReqs = enhancedMatchData.preferredRequirementDetails;

    // Met requirements: demonstrated AND addressed in this section
    const metInSection = allPrefReqs.filter(req => {
      if (!req.demonstrated) return false;
      const sectionIds = req.sectionIds || [];

      // Priority: UUID match (exact) > Semantic match (fuzzy)
      const matched = sectionIds.some(sid => {
        // Path 1: Direct UUID match (PREFERRED)
        if (sid === sectionId) {
          console.log(`[MATCH PATH 1] ✓ UUID Match (Pref) for "${req.requirement}": ${sid} === ${sectionId}`);
          return true;
        }

        // Path 2: Semantic type match (LEGACY/FALLBACK)
        const lowerSid = sid.toLowerCase();
        const semanticMatch = normalizedTypes.some(nt => lowerSid.includes(nt) || nt.includes(lowerSid));
        if (semanticMatch) {
          console.log(`[MATCH PATH 2] ⚠️ Semantic Type Match (Pref) for "${req.requirement}": ${sid} → ${normalizedTypes.join(', ')}`);
        }
        return semanticMatch;
      });

      return matched;
    });

    attribution.prefReqs.met = metInSection.map(req => ({
      id: req.id,
      label: req.requirement,
      evidence: req.evidence,
    }));

    // Unmet requirements
    const unmet = allPrefReqs.filter(req => !req.demonstrated);
    attribution.prefReqs.unmet = unmet.map(req => ({
      id: req.id,
      label: req.requirement,
    }));
  }

  // 3. Process Content Standards
  // PRIORITY: contentStandards > ratingCriteria > config-based fallback
  
  // Determine section category for config-based fallback
  const getSectionCategory = (type: string): 'intro' | 'body' | 'closing' => {
    const lower = type.toLowerCase();
    if (['intro', 'introduction', 'opening', 'static'].includes(lower)) return 'intro';
    if (['closer', 'closing', 'conclusion', 'signature'].includes(lower)) return 'closing';
    return 'body'; // Default: paragraph, experience, dynamic-story, dynamic-saved
  };

  if (contentStandards?.perSection) {
    // PATH 1: Section-level content standards from ContentStandardsAnalysis
    const sectionResult = contentStandards.perSection.find(s => s.sectionId === sectionId);

    if (sectionResult) {
      const metStandards = sectionResult.standards.filter(s => s.status === 'met');
      const unmetStandards = sectionResult.standards.filter(s => s.status === 'not_met');

      attribution.standards.met = metStandards.map(s => {
        const config = getStandardConfig(s.standardId);
        return {
          id: s.standardId,
          label: config?.label || s.standardId,
          evidence: s.evidence,
        };
      });

      attribution.standards.unmet = unmetStandards.map(s => {
        const config = getStandardConfig(s.standardId);
        return {
          id: s.standardId,
          label: config?.label || s.standardId,
          suggestion: s.evidence, // Evidence explains why it's not met
        };
      });
    }
  } else if (ratingCriteria && ratingCriteria.length > 0) {
    // PATH 2: Letter-level rating criteria (legacy)
    const metStandards = ratingCriteria.filter(c => c.met);
    const unmetStandards = ratingCriteria.filter(c => !c.met);

    attribution.standards.met = metStandards.map(c => ({
      id: c.id,
      label: c.label,
      evidence: c.evidence,
    }));

    attribution.standards.unmet = unmetStandards.map(c => ({
      id: c.id,
      label: c.label,
      suggestion: c.suggestion,
    }));
  } else {
    // PATH 3: Config-based fallback - show applicable standards as unmet
    // This ensures the user always sees what standards apply to their section type
    // No suggestion = uses default "Status: Not mentioned in draft." (consistent with other tabs)
    const resolvedCategory = sectionCategory || getSectionCategory(sectionType);
    const applicableStandards = getApplicableStandards(resolvedCategory);
    
    attribution.standards.unmet = applicableStandards.map(config => ({
      id: config.id,
      label: config.label,
      // No suggestion - let RequirementItem show default "Status: Not mentioned in draft."
    }));
  }

  // Compute summary counts
  const summary = {
    coreMetCount: attribution.coreReqs.met.length,
    prefMetCount: attribution.prefReqs.met.length,
    standardsMetCount: attribution.standards.met.length,
  };

  return { attribution, summary };
}

/**
 * Compute section-level attribution for requirements and standards
 *
 * For each section, determines:
 * - Which core requirements it addresses (met/unmet)
 * - Which preferred requirements it addresses (met/unmet)
 * - Which content standards it meets (met/unmet)
 *
 * This data feeds:
 * 1. "Requirements Met" summary row on content cards
 * 2. SectionInspector drawer for detailed view
 * 3. HIL modal context (opportunities to improve)
 */
export function useSectionAttribution({
  sectionId,
  sectionType,
  enhancedMatchData,
  ratingCriteria,
  contentStandards,
}: {
  sectionId: string;
  sectionType: string;
  enhancedMatchData?: EnhancedMatchData | null;
  ratingCriteria?: CoverLetterCriterion[];
  contentStandards?: ContentStandardsAnalysis | null;
}): {
  attribution: SectionAttributionData;
  summary: {
    coreMetCount: number;
    prefMetCount: number;
    standardsMetCount: number;
  };
} {
  return useMemo(() => {
    const result = computeSectionAttribution({
      sectionId,
      sectionType,
      enhancedMatchData,
      ratingCriteria,
      contentStandards,
    });

    // PHASE 2 OBSERVABILITY: Comprehensive logging for validation
    console.group(`[SECTION ATTRIBUTION] ${sectionId}`);
    console.log('Input:', {
      sectionId,
      sectionType,
      normalizedTypes: normalizeSectionType(sectionType),
    });

    // Log all sectionIds from LLM responses
    if (enhancedMatchData?.coreRequirementDetails) {
      const allSectionIds = enhancedMatchData.coreRequirementDetails
        .flatMap(req => req.sectionIds || []);
      const uniqueSectionIds = Array.from(new Set(allSectionIds));

      console.log('LLM Response Analysis (Core Reqs):', {
        totalRequirements: enhancedMatchData.coreRequirementDetails.length,
        uniqueSectionIds,
        sectionIdTypes: uniqueSectionIds.map(sid => ({
          value: sid,
          isUUID: /^[0-9a-f-]{36}$/i.test(sid),
          isSemanticType: ['introduction', 'intro', 'experience', 'exp', 'closing', 'conclusion', 'signature'].some(type =>
            sid.toLowerCase().includes(type)
          ),
        })),
      });
    }

    // Log matching results
    console.log('Matching Results:', {
      coreMetCount: result.summary.coreMetCount,
      prefMetCount: result.summary.prefMetCount,
      standardsMetCount: result.summary.standardsMetCount,
      coreMetDetails: result.attribution.coreReqs.met.map(r => ({
        label: r.label,
        hasEvidence: !!r.evidence,
      })),
    });

    // Log content standards source
    if (contentStandards?.perSection) {
      console.log('✓ Using NEW contentStandards (section-level)');
    } else if (ratingCriteria && ratingCriteria.length > 0) {
      console.log('⚠️ Using LEGACY ratingCriteria (letter-level)');
    } else {
      console.warn('⚠️ No standards data available (neither contentStandards nor ratingCriteria)');
    }

    console.groupEnd();

    return result;
  }, [sectionId, sectionType, enhancedMatchData, ratingCriteria, contentStandards]);
}
