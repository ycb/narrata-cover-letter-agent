import { ParsingResult } from '@/components/onboarding/ParsingResultsCard';

export interface ParsedCoverLetter {
  sections: CoverLetterSection[];
  stories: ExtractedStory[];
  caseStudies: string[];
  externalLinks: string[];
  totalWords: number;
  hasQuantifiableResults: boolean;
  hasCaseStudies: boolean;
  hasExternalLinks: boolean;
  quality: 'high' | 'medium' | 'low';
}

export interface CoverLetterSection {
  type: 'intro' | 'experience' | 'closing' | 'signature' | 'other';
  title: string;
  content: string;
  wordCount: number;
  hasStories: boolean;
  hasQuantifiableResults: boolean;
  suggestions: string[];
}

export interface ExtractedStory {
  content: string;
  company?: string;
  role?: string;
  impact?: string;
  hasQuantifiableResults: boolean;
  quality: 'high' | 'medium' | 'low';
}

export class CoverLetterParser {
  async parseCoverLetter(text: string): Promise<{ data: ParsedCoverLetter; result: ParsingResult }> {
    // Simulate parsing delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Parse the text
    const data = this.parseText(text);
    
    // Generate parsing diagnostics
    const result = this.generateParsingResult(data);
    
    return { data, result };
  }

  private parseText(text: string): ParsedCoverLetter {
    const sections = this.segmentIntoSections(text);
    const stories = this.extractStories(text);
    const caseStudies = this.extractCaseStudies(text);
    const externalLinks = this.extractExternalLinks(text);
    
    const totalWords = text.split(/\s+/).length;
    const hasQuantifiableResults = this.hasQuantifiableResults(text);
    const hasCaseStudies = caseStudies.length > 0;
    const hasExternalLinks = externalLinks.length > 0;
    
    // Determine overall quality
    const quality = this.assessOverallQuality(sections, stories, totalWords);
    
    return {
      sections,
      stories,
      caseStudies,
      externalLinks,
      totalWords,
      hasQuantifiableResults,
      hasCaseStudies,
      hasExternalLinks,
      quality
    };
  }

  private segmentIntoSections(text: string): CoverLetterSection[] {
    const sections: CoverLetterSection[] = [];
    
    // Split by common section indicators
    const sectionPatterns = [
      { type: 'intro' as const, patterns: [/^introduction/i, /^dear/i, /^hello/i, /^hi/i] },
      { type: 'experience' as const, patterns: [/^experience/i, /^background/i, /^qualifications/i, /^why/i] },
      { type: 'closing' as const, patterns: [/^closing/i, /^conclusion/i, /^thank you/i, /^sincerely/i] },
      { type: 'signature' as const, patterns: [/^best regards/i, /^yours truly/i, /^regards/i] }
    ];
    
    // Split text into paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentSection: CoverLetterSection | null = null;
    
    paragraphs.forEach((paragraph, index) => {
      const paragraphLower = paragraph.toLowerCase();
      let sectionType: CoverLetterSection['type'] = 'other';
      
      // Determine section type based on content
      for (const pattern of sectionPatterns) {
        if (pattern.patterns.some(p => p.test(paragraphLower))) {
          sectionType = pattern.type;
          break;
        }
      }
      
      // If this is a new section type, create a new section
      if (!currentSection || currentSection.type !== sectionType) {
        if (currentSection) {
          sections.push(currentSection);
        }
        
        currentSection = {
          type: sectionType,
          title: this.getSectionTitle(sectionType, paragraph),
          content: paragraph,
          wordCount: paragraph.split(/\s+/).length,
          hasStories: this.hasStories(paragraph),
          hasQuantifiableResults: this.hasQuantifiableResults(paragraph),
          suggestions: this.generateSectionSuggestions(paragraph, sectionType)
        };
      } else {
        // Append to current section
        currentSection.content += '\n\n' + paragraph;
        currentSection.wordCount += paragraph.split(/\s+/).length;
        currentSection.hasStories = currentSection.hasStories || this.hasStories(paragraph);
        currentSection.hasQuantifiableResults = currentSection.hasQuantifiableResults || this.hasQuantifiableResults(paragraph);
      }
    });
    
    // Add the last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    // If no sections were identified, create a single section
    if (sections.length === 0) {
      sections.push({
        type: 'other',
        title: 'Cover Letter Content',
        content: text,
        wordCount: totalWords,
        hasStories: this.hasStories(text),
        hasQuantifiableResults: this.hasQuantifiableResults(text),
        suggestions: this.generateSectionSuggestions(text, 'other')
      });
    }
    
    return sections;
  }

  private getSectionTitle(type: CoverLetterSection['type'], content: string): string {
    switch (type) {
      case 'intro':
        return 'Introduction';
      case 'experience':
        return 'Experience & Qualifications';
      case 'closing':
        return 'Closing';
      case 'signature':
        return 'Signature';
      default:
        // Try to extract a title from the first sentence
        const firstSentence = content.split(/[.!?]/)[0];
        return firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence;
    }
  }

  private extractStories(text: string): ExtractedStory[] {
    const stories: ExtractedStory[] = [];
    
    // Look for achievement patterns
    const achievementPatterns = [
      /(?:led|managed|built|launched|developed|created|implemented|achieved|increased|reduced|grew|established)[^.!?]*[.!?]/gi,
      /(?:responsible for|oversaw|coordinated|facilitated|drove|enabled|delivered|completed|successfully)[^.!?]*[.!?]/gi
    ];
    
    achievementPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.length > 20) { // Only consider substantial achievements
            const story: ExtractedStory = {
              content: match.trim(),
              hasQuantifiableResults: this.hasQuantifiableResults(match),
              quality: this.assessStoryQuality(match)
            };
            
            // Try to extract company/role context
            const companyMatch = match.match(/(?:at|with|for)\s+([A-Z][a-zA-Z\s&]+?)(?:\s|,|\.|$)/i);
            if (companyMatch) {
              story.company = companyMatch[1].trim();
            }
            
            stories.push(story);
          }
        });
      }
    });
    
    return stories;
  }

  private extractCaseStudies(text: string): string[] {
    const caseStudyPatterns = [
      /case study:?\s*([^.!?]+)/gi,
      /project:?\s*([^.!?]+)/gi,
      /portfolio:?\s*([^.!?]+)/gi,
      /example:?\s*([^.!?]+)/gi
    ];
    
    const caseStudies: string[] = [];
    
    caseStudyPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.length > 10) {
            caseStudies.push(match.trim());
          }
        });
      }
    });
    
    return caseStudies;
  }

  private extractExternalLinks(text: string): string[] {
    const urlPattern = /https?:\/\/[^\s]+/g;
    const matches = text.match(urlPattern);
    return matches || [];
  }

  private hasStories(text: string): boolean {
    const storyIndicators = [
      /led|managed|built|launched|developed|created|implemented|achieved|increased|reduced|grew|established/i,
      /responsible for|oversaw|coordinated|facilitated|drove|enabled|delivered|completed|successfully/i
    ];
    
    return storyIndicators.some(pattern => pattern.test(text));
  }

  private hasQuantifiableResults(text: string): boolean {
    const quantifiablePatterns = [
      /(\d+%?\s*(?:increase|decrease|growth|reduction))/i,
      /(\$\d+[KMB]?\s*(?:revenue|budget|cost))/i,
      /(\d+\s*(?:users|customers|clients))/i,
      /(\d+\s*(?:months|weeks|days))/i
    ];
    
    return quantifiablePatterns.some(pattern => pattern.test(text));
  }

  private assessStoryQuality(story: string): 'high' | 'medium' | 'low' {
    let score = 0;
    
    // Length
    if (story.length > 100) score += 2;
    else if (story.length > 50) score += 1;
    
    // Quantifiable results
    if (this.hasQuantifiableResults(story)) score += 3;
    
    // Action verbs
    const actionVerbs = /led|managed|built|launched|developed|created|implemented|achieved|increased|reduced|grew|established/i;
    if (actionVerbs.test(story)) score += 2;
    
    // Company context
    const companyContext = /(?:at|with|for)\s+[A-Z][a-zA-Z\s&]+/i;
    if (companyContext.test(story)) score += 1;
    
    if (score >= 6) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  private assessOverallQuality(sections: CoverLetterSection[], stories: ExtractedStory[], totalWords: number): 'high' | 'medium' | 'low' {
    let score = 0;
    
    // Word count
    if (totalWords > 300) score += 2;
    else if (totalWords > 200) score += 1;
    
    // Number of sections
    if (sections.length >= 3) score += 2;
    else if (sections.length >= 2) score += 1;
    
    // Number of stories
    if (stories.length >= 3) score += 2;
    else if (stories.length >= 1) score += 1;
    
    // Quality of stories
    const highQualityStories = stories.filter(s => s.quality === 'high').length;
    if (highQualityStories >= 2) score += 2;
    else if (highQualityStories >= 1) score += 1;
    
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  private generateSectionSuggestions(content: string, type: CoverLetterSection['type']): string[] {
    const suggestions: string[] = [];
    
    if (type === 'intro' && content.length < 100) {
      suggestions.push("Expand introduction with more context about your interest");
    }
    
    if (type === 'experience' && !this.hasStories(content)) {
      suggestions.push("Add specific examples of your achievements");
    }
    
    if (type === 'experience' && !this.hasQuantifiableResults(content)) {
      suggestions.push("Include quantifiable results to strengthen your case");
    }
    
    if (type === 'closing' && content.length < 50) {
      suggestions.push("Add a stronger call to action");
    }
    
    return suggestions;
  }

  private generateParsingResult(data: ParsedCoverLetter): ParsingResult {
    const details: string[] = [];
    const suggestions: string[] = [];
    
    // Analyze sections
    details.push(`${data.sections.length} sections identified`);
    
    if (data.sections.length >= 3) {
      details.push("Good section structure");
    } else {
      suggestions.push("Consider organizing into clear sections (Intro, Experience, Closing)");
    }
    
    // Analyze stories
    details.push(`${data.stories.length} stories extracted`);
    
    if (data.stories.length >= 2) {
      details.push("Strong story content");
    } else {
      suggestions.push("Add more specific examples of your achievements");
    }
    
    // Analyze case studies
    if (data.hasCaseStudies) {
      details.push(`${data.caseStudies.length} case studies detected`);
    }
    
    // Analyze external links
    if (data.hasExternalLinks) {
      details.push(`${data.externalLinks.length} external links found`);
    }
    
    // Analyze quantifiable results
    if (data.hasQuantifiableResults) {
      details.push("Quantifiable results detected");
    } else {
      suggestions.push("Add quantifiable results to strengthen your achievements");
    }
    
    // Analyze overall quality
    details.push(`Overall quality: ${data.quality}`);
    
    if (data.quality === 'low') {
      suggestions.push("Consider adding more specific examples and quantifiable results");
    }
    
    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'high';
    
    if (data.quality === 'low') {
      confidence = 'low';
    } else if (data.quality === 'medium') {
      confidence = 'medium';
    }
    
    if (data.sections.length < 2) {
      confidence = 'medium';
    }
    
    if (data.stories.length < 1) {
      confidence = 'low';
    }
    
    return {
      type: 'coverLetter',
      success: true,
      confidence,
      summary: `Successfully parsed cover letter with ${data.sections.length} sections and ${data.stories.length} stories`,
      details,
      suggestions,
      icon: () => null // This will be handled by the component
    };
  }
}

export const coverLetterParser = new CoverLetterParser();
