import { ParsingResult } from '@/components/onboarding/ParsingResultsCard';

export interface ParsedLinkedIn {
  profile: LinkedInProfile;
  experience: LinkedInExperience[];
  skills: LinkedInSkill[];
  education: LinkedInEducation[];
  recommendations: number;
  connections: number;
  hasCompleteDates: boolean;
  hasCompanyDescriptions: boolean;
  hasEndorsements: boolean;
}

export interface LinkedInProfile {
  name: string;
  headline: string;
  location: string;
  industry: string;
  summary: string;
  profileUrl: string;
}

export interface LinkedInExperience {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  description?: string;
  location?: string;
  companySize?: string;
  companyIndustry?: string;
}

export interface LinkedInSkill {
  name: string;
  endorsementCount: number;
  category: string;
}

export interface LinkedInEducation {
  institution: string;
  degree: string;
  field: string;
  startYear?: string;
  endYear?: string;
  activities?: string[];
}

export class LinkedInParser {
  private mockLinkedInData: ParsedLinkedIn = {
    profile: {
      name: "John Doe",
      headline: "Senior Product Manager | Building user-centric products",
      location: "San Francisco, CA",
      industry: "Technology",
      summary: "Experienced Product Manager with 4+ years building user-centric products",
      profileUrl: "https://linkedin.com/in/johndoe"
    },
    experience: [
      {
        company: "TechCorp",
        title: "Senior Product Manager",
        startDate: "2022-01",
        endDate: "2024-01",
        duration: "2 years",
        description: "Led product strategy and execution for B2B SaaS platform",
        location: "San Francisco, CA",
        companySize: "201-500 employees",
        companyIndustry: "Technology"
      },
      {
        company: "StartupXYZ",
        title: "Product Manager",
        startDate: "2020-03",
        endDate: "2022-01",
        duration: "1 year 10 months",
        description: "Built and launched MVP from concept to market",
        location: "San Francisco, CA",
        companySize: "11-50 employees",
        companyIndustry: "Technology"
      },
      {
        company: "BigTech Inc",
        title: "Associate Product Manager",
        startDate: "2019-06",
        endDate: "2020-02",
        duration: "8 months",
        description: "Supported product development for enterprise solutions",
        location: "San Francisco, CA",
        companySize: "1000+ employees",
        companyIndustry: "Technology"
      }
    ],
    skills: [
      { name: "Product Strategy", endorsementCount: 15, category: "Product Management" },
      { name: "Data Analysis", endorsementCount: 12, category: "Analytics" },
      { name: "User Research", endorsementCount: 10, category: "Research" },
      { name: "Agile Development", endorsementCount: 8, category: "Development" },
      { name: "Stakeholder Management", endorsementCount: 7, category: "Management" },
      { name: "A/B Testing", endorsementCount: 6, category: "Analytics" }
    ],
    education: [
      {
        institution: "University of Technology",
        degree: "Bachelor of Science",
        field: "Computer Science",
        startYear: "2016",
        endYear: "2020",
        activities: ["Product Management Club", "Hackathon Organizer"]
      }
    ],
    recommendations: 8,
    connections: 450,
    hasCompleteDates: true,
    hasCompanyDescriptions: true,
    hasEndorsements: true
  };

  async parseLinkedIn(url: string): Promise<{ data: ParsedLinkedIn; result: ParsingResult }> {
    // Simulate parsing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For now, return mock data
    // In production, this would use LinkedIn API or web scraping
    const data = this.mockLinkedInData;
    
    // Generate parsing diagnostics
    const result = this.generateParsingResult(data);
    
    return { data, result };
  }

  private generateParsingResult(data: ParsedLinkedIn): ParsingResult {
    const details: string[] = [];
    const suggestions: string[] = [];
    
    // Analyze experience
    details.push(`${data.experience.length} roles found`);
    
    if (data.hasCompleteDates) {
      details.push("Complete date information available");
    } else {
      suggestions.push("Add missing start/end dates for better timeline");
    }
    
    if (data.hasCompanyDescriptions) {
      details.push("Company descriptions available");
    } else {
      suggestions.push("Add company descriptions for better context");
    }
    
    // Analyze skills
    details.push(`${data.skills.length} skills identified`);
    
    if (data.hasEndorsements) {
      const totalEndorsements = data.skills.reduce((sum, skill) => sum + skill.endorsementCount, 0);
      details.push(`${totalEndorsements} total skill endorsements`);
    }
    
    // Analyze education
    if (data.education.length > 0) {
      details.push("Education information extracted");
      if (data.education[0].activities) {
        details.push("Extracurricular activities found");
      }
    }
    
    // Analyze profile completeness
    if (data.recommendations > 0) {
      details.push(`${data.recommendations} recommendations received`);
    }
    
    if (data.connections > 100) {
      details.push("Strong professional network");
    }
    
    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'high';
    
    if (!data.hasCompleteDates) {
      confidence = 'medium';
    }
    
    if (!data.hasCompanyDescriptions) {
      confidence = 'medium';
    }
    
    if (data.experience.length < 2) {
      confidence = 'low';
      suggestions.push("Add more work experience for better assessment");
    }
    
    if (data.skills.length < 5) {
      confidence = 'medium';
      suggestions.push("Add more skills to showcase your expertise");
    }
    
    return {
      type: 'linkedin',
      success: true,
      confidence,
      summary: `Successfully parsed LinkedIn profile with ${data.experience.length} roles and ${data.skills.length} skills`,
      details,
      suggestions,
      icon: () => null // This will be handled by the component
    };
  }

  // Helper method to validate LinkedIn URL
  validateLinkedInUrl(url: string): boolean {
    const linkedinPatterns = [
      /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/,
      /^https?:\/\/(www\.)?linkedin\.com\/pub\/[a-zA-Z0-9-]+\/?$/,
      /^https?:\/\/(www\.)?linkedin\.com\/company\/[a-zA-Z0-9-]+\/?$/
    ];
    
    return linkedinPatterns.some(pattern => pattern.test(url));
  }

  // Helper method to extract profile ID from URL
  extractProfileId(url: string): string | null {
    const match = url.match(/linkedin\.com\/(?:in|pub|company)\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  // Helper method to check profile accessibility
  async checkProfileAccessibility(url: string): Promise<{
    accessible: boolean;
    reason?: string;
  }> {
    // In production, this would make an actual request to check accessibility
    // For now, return mock result
    return {
      accessible: true,
      reason: "Profile is publicly accessible"
    };
  }
}

export const linkedinParser = new LinkedInParser();
