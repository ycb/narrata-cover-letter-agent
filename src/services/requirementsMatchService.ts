/**
 * Requirements Match Service
 *
 * Analyzes how well cover letter sections address job requirements
 * Checks both core (must-have) and preferred (nice-to-have) requirements
 */

import type { CoverLetterSection } from './coverLetterDraftService';

export interface RequirementMatch {
  id: string;
  requirement: string;
  demonstrated: boolean;
  evidence: string;
  sectionIds: string[]; // Which sections mention this requirement
}

export interface RequirementsMatchResult {
  coreRequirements: RequirementMatch[];
  preferredRequirements: RequirementMatch[];
  coreMetCount: number;
  coreTotalCount: number;
  preferredMetCount: number;
  preferredTotalCount: number;
}

export class RequirementsMatchService {
  /**
   * Analyze how well cover letter sections address job requirements
   * Uses simple keyword matching for MVP (can be enhanced with LLM later)
   */
  analyzeRequirementsMatch(
    coreRequirements: string[],
    preferredRequirements: string[],
    sections: CoverLetterSection[]
  ): RequirementsMatchResult {
    // Combine all section content for analysis
    const allContent = sections.map(s => s.content).join(' ').toLowerCase();

    // Analyze core requirements
    const coreMatches = coreRequirements.map((req, index) =>
      this.checkRequirementMatch(req, `core-${index}`, sections, allContent)
    );

    // Analyze preferred requirements
    const preferredMatches = preferredRequirements.map((req, index) =>
      this.checkRequirementMatch(req, `preferred-${index}`, sections, allContent)
    );

    return {
      coreRequirements: coreMatches,
      preferredRequirements: preferredMatches,
      coreMetCount: coreMatches.filter(m => m.demonstrated).length,
      coreTotalCount: coreMatches.length,
      preferredMetCount: preferredMatches.filter(m => m.demonstrated).length,
      preferredTotalCount: preferredMatches.length,
    };
  }

  /**
   * Check if a single requirement is demonstrated in the content
   * Uses keyword extraction and matching
   */
  private checkRequirementMatch(
    requirement: string,
    id: string,
    sections: CoverLetterSection[],
    allContent: string
  ): RequirementMatch {
    // Extract key terms from requirement
    const keyTerms = this.extractKeyTerms(requirement);

    // Check which key terms appear in content
    const matchedTerms = keyTerms.filter(term =>
      allContent.includes(term.toLowerCase())
    );

    // Find which sections contain matches
    const matchedSectionIds: string[] = [];
    for (const section of sections) {
      const sectionContent = section.content.toLowerCase();
      if (keyTerms.some(term => sectionContent.includes(term.toLowerCase()))) {
        matchedSectionIds.push(section.id);
      }
    }

    // Determine if requirement is demonstrated
    // Heuristic: At least 50% of key terms must be present
    const demonstrated = matchedTerms.length >= Math.max(1, keyTerms.length * 0.5);

    // Generate evidence
    let evidence: string;
    if (demonstrated) {
      if (matchedSectionIds.length > 0) {
        const sectionNames = matchedSectionIds.map(id => {
          const section = sections.find(s => s.id === id);
          return section?.type || id;
        }).join(', ');
        evidence = `Mentioned in ${sectionNames}: "${matchedTerms.join('", "')}"`;
      } else {
        evidence = `Keywords found: "${matchedTerms.join('", "')}"`;
      }
    } else {
      const missingTerms = keyTerms.filter(term => !matchedTerms.includes(term));
      evidence = `Missing key terms: "${missingTerms.join('", "')}"`;
    }

    return {
      id,
      requirement,
      demonstrated,
      evidence,
      sectionIds: matchedSectionIds,
    };
  }

  /**
   * Extract key terms from a requirement string
   * Filters out common words and focuses on meaningful terms
   */
  private extractKeyTerms(requirement: string): string[] {
    // Common words to ignore (stopwords)
    const stopwords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
      'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'what',
      'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
      'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
      'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
      'years', 'year', 'experience', 'background', 'knowledge'
    ]);

    // Split requirement into words and clean
    const words = requirement
      .toLowerCase()
      .replace(/[^\w\s+-]/g, ' ') // Keep alphanumeric, spaces, and +/- for "5+"
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopwords.has(word));

    // Also extract multi-word phrases (bigrams) for better matching
    const bigrams: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      if (!stopwords.has(words[i]) && !stopwords.has(words[i + 1])) {
        bigrams.push(`${words[i]} ${words[i + 1]}`);
      }
    }

    // Combine words and bigrams, remove duplicates
    const terms = [...new Set([...words, ...bigrams])];

    // Return at least 1 term, maximum 8 terms
    return terms.slice(0, Math.max(1, Math.min(8, terms.length)));
  }
}
