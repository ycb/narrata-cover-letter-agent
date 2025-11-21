import { useMemo } from 'react';
import type { EnhancedMatchData } from '@/types/coverLetters';
import type { SectionAttributionData } from './SectionInspector';

export interface CoverLetterCriterion {
  id: string;
  label: string;
  met: boolean;
  evidence: string;
  suggestion?: string;
}

// Normalize section type for matching
const normalizeSectionType = (type: string): string[] => {
  const aliases: Record<string, string[]> = {
    'introduction': ['introduction', 'intro', 'opening'],
    'experience': ['experience', 'exp', 'background', 'body', 'paragraph'],
    'closing': ['closing', 'conclusion', 'closer'],
    'signature': ['signature', 'signoff'],
  };

  const lowerType = type.toLowerCase();
  const typeMapping: Record<string, string> = {
    'intro': 'introduction',
    'paragraph': 'experience',
    'closer': 'closing',
  };

  const mappedType = typeMapping[lowerType] || lowerType;

  for (const [canonical, variations] of Object.entries(aliases)) {
    if (canonical === mappedType || variations.includes(mappedType) || variations.includes(lowerType)) {
      return variations;
    }
  }

  return [mappedType, lowerType];
};

/**
 * Pure function to compute section attribution (no React hooks)
 * Can be called from anywhere, including inside loops
 */
export function computeSectionAttribution({
  sectionId,
  sectionType,
  enhancedMatchData,
  ratingCriteria,
}: {
  sectionId: string;
  sectionType: string;
  enhancedMatchData?: EnhancedMatchData | null;
  ratingCriteria?: CoverLetterCriterion[];
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
      return sectionIds.some(sid => {
        // Direct UUID match (service uses section.id which is UUID)
        if (sid === sectionId) return true;

        // Normalized type match (for LLM responses that use semantic types like "introduction", "experience")
        const lowerSid = sid.toLowerCase();
        return normalizedTypes.some(nt => lowerSid.includes(nt) || nt.includes(lowerSid));
      });
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

      return sectionIds.some(sid => {
        // Direct UUID match
        if (sid === sectionId) return true;

        // Normalized type match
        const lowerSid = sid.toLowerCase();
        return normalizedTypes.some(nt => lowerSid.includes(nt) || nt.includes(lowerSid));
      });
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

  // 3. Process Content Standards (from rating criteria)
  // Note: Standards are letter-level, not section-level
  // We show ALL standards but highlight which are met
  if (ratingCriteria && ratingCriteria.length > 0) {
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
}: {
  sectionId: string;
  sectionType: string;
  enhancedMatchData?: EnhancedMatchData | null;
  ratingCriteria?: CoverLetterCriterion[];
}): {
  attribution: SectionAttributionData;
  summary: {
    coreMetCount: number;
    prefMetCount: number;
    standardsMetCount: number;
  };
} {
  return useMemo(() => {
    // DEBUG: Log what we're working with
    console.log('[ATTRIBUTION DEBUG]', {
      sectionId,
      sectionType,
      coreReqCount: enhancedMatchData?.coreRequirementDetails?.length,
      sampleSectionIds: enhancedMatchData?.coreRequirementDetails?.[0]?.sectionIds,
      ratingCriteriaCount: ratingCriteria?.length
    });

    // Delegate to pure function
    return computeSectionAttribution({
      sectionId,
      sectionType,
      enhancedMatchData,
      ratingCriteria,
    });
  }, [sectionId, sectionType, enhancedMatchData, ratingCriteria]);
}
