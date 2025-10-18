import { ParsingResult } from '@/components/onboarding/ParsingResultsCard';

export interface ParsedResume {
  roles: ResumeRole[];
  skills: string[];
  education: Education[];
  contact: ContactInfo;
  summary: string;
  totalAchievements: number;
  hasQuantifiableResults: boolean;
  hasCaseStudies: boolean;
}

export interface ResumeRole {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  achievements: string[];
  teamSize?: number;
  technologies?: string[];
  impact?: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduationYear?: string;
}

export interface ContactInfo {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
}

export class ResumeParser {

  async parseResume(file: File): Promise<{ data: ParsedResume; result: ParsingResult }> {
    // Simulate parsing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return empty data structure - actual parsing will be handled by LLM
    const data: ParsedResume = {
      roles: [],
      skills: [],
      education: [],
      contact: {
        name: "",
        email: "",
        location: "",
        linkedin: ""
      },
      summary: "",
      totalAchievements: 0,
      hasQuantifiableResults: false,
      hasCaseStudies: false
    };
    
    // Generate parsing diagnostics
    const result = this.generateParsingResult(data);
    
    return { data, result };
  }

  private generateParsingResult(data: ParsedResume): ParsingResult {
    const details: string[] = [];
    const suggestions: string[] = [];
    
    // Analyze roles
    details.push(`${data.roles.length} roles found`);
    details.push(`${data.totalAchievements} achievements extracted`);
    
    if (data.hasQuantifiableResults) {
      details.push("Quantifiable results detected");
    } else {
      suggestions.push("Add quantifiable results to strengthen achievements");
    }
    
    // Analyze skills
    details.push(`${data.skills.length} skills identified`);
    
    // Analyze education
    if (data.education.length > 0) {
      details.push("Education information extracted");
    }
    
    // Analyze contact info
    if (data.contact.email && data.contact.linkedin) {
      details.push("Complete contact information found");
    } else {
      suggestions.push("Add missing contact information");
    }
    
    // Check for case studies
    if (data.hasCaseStudies) {
      details.push("Case study mentions detected");
    }
    
    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'high';
    
    if (data.roles.length < 2) {
      confidence = 'medium';
      suggestions.push("Add more work experience for better assessment");
    }
    
    if (!data.hasQuantifiableResults) {
      confidence = 'medium';
    }
    
    if (data.totalAchievements < 3) {
      confidence = 'low';
      suggestions.push("Include more detailed achievements");
    }
    
    return {
      type: 'resume',
      success: true,
      confidence,
      summary: `Successfully parsed resume with ${data.roles.length} roles and ${data.totalAchievements} achievements`,
      details,
      suggestions,
      icon: () => null // This will be handled by the component
    };
  }

  // Helper method to extract case studies from text
  extractCaseStudies(text: string): string[] {
    const caseStudyPatterns = [
      /case study/i,
      /case study:?\s*([^.!?]+)/gi,
      /project:?\s*([^.!?]+)/gi,
      /portfolio:?\s*([^.!?]+)/gi
    ];
    
    const caseStudies: string[] = [];
    
    caseStudyPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        caseStudies.push(...matches.slice(1).filter(Boolean));
      }
    });
    
    return caseStudies;
  }

  // Helper method to extract quantifiable results
  extractQuantifiableResults(text: string): string[] {
    const quantifiablePatterns = [
      /(\d+%?\s*(?:increase|decrease|growth|reduction))/gi,
      /(\$\d+[KMB]?\s*(?:revenue|budget|cost))/gi,
      /(\d+\s*(?:users|customers|clients))/gi,
      /(\d+\s*(?:months|weeks|days))/gi
    ];
    
    const results: string[] = [];
    
    quantifiablePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        results.push(...matches.slice(1).filter(Boolean));
      }
    });
    
    return results;
  }
}

export const resumeParser = new ResumeParser();
