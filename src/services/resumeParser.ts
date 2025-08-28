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
  private mockResumeData: ParsedResume = {
    roles: [
      {
        company: "TechCorp",
        title: "Senior Product Manager",
        startDate: "2022-01",
        endDate: "2024-01",
        achievements: [
          "Led 5-person team to launch new feature increasing user engagement by 25%",
          "Managed $2M product roadmap with 3 major releases",
          "Collaborated with engineering to reduce bug reports by 40%"
        ],
        teamSize: 5,
        technologies: ["React", "Node.js", "AWS"],
        impact: "Increased user engagement by 25%"
      },
      {
        company: "StartupXYZ",
        title: "Product Manager",
        startDate: "2020-03",
        endDate: "2022-01",
        achievements: [
          "Built MVP from concept to launch in 6 months",
          "Grew user base from 0 to 10,000 in first year",
          "Established product development processes for 8-person team"
        ],
        teamSize: 8,
        technologies: ["Python", "Django", "PostgreSQL"],
        impact: "Grew user base from 0 to 10,000"
      }
    ],
    skills: [
      "Product Strategy", "Data Analysis", "User Research", 
      "Agile Development", "Stakeholder Management", "A/B Testing"
    ],
    education: [
      {
        institution: "University of Technology",
        degree: "Bachelor of Science",
        field: "Computer Science",
        graduationYear: "2020"
      }
    ],
    contact: {
      name: "John Doe",
      email: "john.doe@email.com",
      location: "San Francisco, CA",
      linkedin: "linkedin.com/in/johndoe"
    },
    summary: "Experienced Product Manager with 4+ years building user-centric products",
    totalAchievements: 6,
    hasQuantifiableResults: true,
    hasCaseStudies: false
  };

  async parseResume(file: File): Promise<{ data: ParsedResume; result: ParsingResult }> {
    // Simulate parsing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // For now, return mock data
    // In production, this would use actual PDF/DOCX parsing libraries
    const data = this.mockResumeData;
    
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
