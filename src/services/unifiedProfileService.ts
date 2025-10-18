// Unified profile service for merging resume and LinkedIn data
import { LLMAnalysisService } from './openaiService';
import { buildUnifiedProfilePrompt, buildUnifiedProfileEvaluationPrompt } from '../prompts';

export interface UnifiedWorkHistory {
  id: string;
  company: string;
  companyDescription?: string;
  role: string;
  startDate: string;
  endDate: string | null;
  description: string;
  achievements: string[];
  metrics: string[];
  stories: Array<{
    id: string;
    type: 'achievement' | 'challenge' | 'impact' | 'leadership' | 'innovation';
    description: string;
    metrics: string[];
    context: string;
  }>;
  location?: string;
  current: boolean;
  sourceConfidence: 'high' | 'medium' | 'low';
  sourceDetails: {
    resume: boolean;
    linkedin: boolean;
    combined: boolean;
  };
}

export interface UnifiedProfile {
  workHistory: UnifiedWorkHistory[];
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate: string;
    gpa?: string;
    location?: string;
    sourceConfidence: 'high' | 'medium' | 'low';
    sourceDetails: {
      resume: boolean;
      linkedin: boolean;
    };
  }>;
  skills: Array<{
    skill: string;
    proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    source: 'resume' | 'linkedin' | 'both';
    context?: string;
  }>;
  contactInfo: {
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedin?: string;
    sourceConfidence: 'high' | 'medium' | 'low';
  };
  summary: string;
  overallMetrics: {
    totalExperience: number; // in years
    companiesWorked: number;
    rolesHeld: number;
    keyAchievements: number;
    quantifiableResults: number;
  };
}

export interface UnifiedProfileEvaluation {
  deduplicationQuality: '✅ Excellent' | '⚠ Good' | '❌ Poor';
  dataCompleteness: '✅ Complete' | '⚠ Partial' | '❌ Incomplete';
  metricsExtraction: '✅ Comprehensive' | '⚠ Limited' | '❌ Missing';
  storyStructure: '✅ Clear' | '⚠ Weak' | '❌ Unclear';
  sourceIntegration: '✅ Seamless' | '⚠ Partial' | '❌ Conflicting';
  overallQuality: '✅ High' | '⚠ Medium' | '❌ Low';
  rationale: string;
}

export class UnifiedProfileService {
  private llmService: LLMAnalysisService;

  constructor() {
    this.llmService = new LLMAnalysisService();
  }

  /**
   * Create unified work history from resume and LinkedIn data
   */
  async createUnifiedProfile(
    resumeData: any,
    linkedinData: any,
    coverLetterData?: any
  ): Promise<{ success: boolean; data?: UnifiedProfile; error?: string }> {
    try {
      const prompt = this.buildUnifiedProfilePrompt(resumeData, linkedinData, coverLetterData);
      const response = await this.llmService.callOpenAI(prompt, 3000);
      
      if (!response.success || !response.data) {
        throw new Error(`Unified profile creation failed: ${response.error || 'No data returned'}`);
      }
      
      // Validate the unified profile structure
      if (!this.isValidUnifiedProfile(response.data)) {
        throw new Error('Invalid unified profile structure');
      }
      
      return {
        success: true,
        data: response.data as UnifiedProfile
      };
    } catch (error) {
      console.error('Unified profile creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unified profile creation failed'
      };
    }
  }

  /**
   * Evaluate the quality of a unified profile
   */
  async evaluateUnifiedProfile(profile: UnifiedProfile): Promise<UnifiedProfileEvaluation> {
    const prompt = this.buildUnifiedProfileEvaluationPrompt(profile);
    
    try {
      const response = await this.llmService.callOpenAI(prompt, 1000);
      
      if (!response.success || !response.data) {
        throw new Error(`Unified profile evaluation failed: ${response.error || 'No data returned'}`);
      }
      
      return response.data as UnifiedProfileEvaluation;
    } catch (error) {
      console.error('Unified profile evaluation failed:', error);
      return {
        deduplicationQuality: '❌ Poor',
        dataCompleteness: '❌ Incomplete',
        metricsExtraction: '❌ Missing',
        storyStructure: '❌ Unclear',
        sourceIntegration: '❌ Conflicting',
        overallQuality: '❌ Low',
        rationale: `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Build prompt for unified profile creation
   */
  private buildUnifiedProfilePrompt(
    resumeData: any, 
    linkedinData: any, 
    coverLetterData?: any
  ): string {
    return `You are an expert at merging professional data from multiple sources to create a unified, comprehensive profile.

Your goal: Create a SINGLE, deduplicated work history that combines the best information from resume, LinkedIn, and cover letter data.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

LinkedIn Data:
${JSON.stringify(linkedinData, null, 2)}

${coverLetterData ? `Cover Letter Data (for additional context):
${JSON.stringify(coverLetterData, null, 2)}` : ''}

CRITICAL TASKS:

1. DEDUPLICATION: Identify and merge duplicate roles (same company + overlapping dates)
2. METRICS EXTRACTION: Extract quantifiable results and achievements
3. STORY STRUCTURE: Organize achievements into coherent stories
4. SOURCE INTEGRATION: Combine the best information from all sources
5. COMPLETENESS: Ensure no important information is lost

For each work history entry, extract:
- Company name and description
- Role and responsibilities  
- Start/end dates
- Key achievements with metrics
- Impact stories with context
- Source confidence (high/medium/low)

Return ONLY valid JSON with this structure:

{
  "workHistory": [
    {
      "id": "unique_id",
      "company": "Company Name",
      "companyDescription": "Brief company description if available",
      "role": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "description": "Comprehensive job description combining all sources",
      "achievements": ["achievement1", "achievement2"],
      "metrics": ["increased revenue by 25%", "led team of 8", "saved $50K"],
      "stories": [
        {
          "id": "story_1",
          "type": "achievement|challenge|impact|leadership|innovation",
          "description": "Detailed story of a key achievement",
          "metrics": ["specific metric 1", "specific metric 2"],
          "context": "Background and situation"
        }
      ],
      "location": "City, State",
      "current": true/false,
      "sourceConfidence": "high|medium|low",
      "sourceDetails": {
        "resume": true/false,
        "linkedin": true/false,
        "combined": true/false
      }
    }
  ],
  "education": [
    {
      "id": "unique_id",
      "institution": "University Name",
      "degree": "Degree Type",
      "fieldOfStudy": "Field of Study",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "gpa": "GPA if mentioned",
      "location": "City, State",
      "sourceConfidence": "high|medium|low",
      "sourceDetails": {
        "resume": true/false,
        "linkedin": true/false
      }
    }
  ],
  "skills": [
    {
      "skill": "Skill Name",
      "proficiency": "beginner|intermediate|advanced|expert",
      "source": "resume|linkedin|both",
      "context": "Context where skill was demonstrated"
    }
  ],
  "contactInfo": {
    "email": "email@example.com",
    "phone": "phone number",
    "location": "City, State",
    "website": "website URL",
    "linkedin": "LinkedIn URL",
    "sourceConfidence": "high|medium|low"
  },
  "summary": "Comprehensive professional summary",
  "overallMetrics": {
    "totalExperience": 5.5,
    "companiesWorked": 3,
    "rolesHeld": 4,
    "keyAchievements": 12,
    "quantifiableResults": 8
  }
}

DEDUPLICATION RULES:
- Same company + overlapping dates = merge into single entry
- Use the most complete description
- Combine achievements from all sources
- Use the most recent/accurate dates
- Mark source confidence based on data quality

METRICS EXTRACTION:
- Look for numbers, percentages, dollar amounts
- Extract quantifiable results and impact
- Include team sizes, project scopes, timeframes
- Focus on business impact and outcomes

STORY STRUCTURE:
- Organize achievements into coherent narratives
- Include context, action, and result
- Categorize by type (achievement, challenge, impact, etc.)
- Ensure each story demonstrates specific competencies

Return valid JSON only, no markdown formatting.`;
  }

  /**
   * Build prompt for unified profile evaluation
   */
  private buildUnifiedProfileEvaluationPrompt(profile: UnifiedProfile): string {
    return `You are an expert at evaluating unified professional profiles for quality and completeness.

Profile to evaluate:
${JSON.stringify(profile, null, 2)}

Evaluate this unified profile on these criteria:

1. DEDUPLICATION QUALITY: Are duplicate entries properly merged?
2. DATA COMPLETENESS: Is all important information captured?
3. METRICS EXTRACTION: Are quantifiable results properly extracted?
4. STORY STRUCTURE: Are achievements organized into coherent stories?
5. SOURCE INTEGRATION: Are multiple sources seamlessly combined?
6. OVERALL QUALITY: Is this a comprehensive, professional profile?

Return ONLY valid JSON:

{
  "deduplicationQuality": "✅ Excellent|⚠ Good|❌ Poor",
  "dataCompleteness": "✅ Complete|⚠ Partial|❌ Incomplete",
  "metricsExtraction": "✅ Comprehensive|⚠ Limited|❌ Missing",
  "storyStructure": "✅ Clear|⚠ Weak|❌ Unclear",
  "sourceIntegration": "✅ Seamless|⚠ Partial|❌ Conflicting",
  "overallQuality": "✅ High|⚠ Medium|❌ Low",
  "rationale": "Brief explanation of the evaluation"
}

Focus on:
- Proper deduplication of work history
- Completeness of data from all sources
- Quality of metrics and quantifiable results
- Coherence of story structure
- Seamless integration of multiple sources
- Overall professional quality

Return valid JSON only, no markdown formatting.`;
  }

  /**
   * Validate unified profile structure
   */
  private isValidUnifiedProfile(profile: any): boolean {
    const requiredFields = ['workHistory', 'education', 'skills', 'contactInfo', 'summary', 'overallMetrics'];
    return requiredFields.every(field => profile[field] !== undefined);
  }

  /**
   * Generate profile summary
   */
  generateProfileSummary(profile: UnifiedProfile): string {
    return `# Unified Professional Profile Summary

## Overview
- **Total Experience**: ${profile.overallMetrics.totalExperience} years
- **Companies**: ${profile.overallMetrics.companiesWorked}
- **Roles**: ${profile.overallMetrics.rolesHeld}
- **Key Achievements**: ${profile.overallMetrics.keyAchievements}
- **Quantifiable Results**: ${profile.overallMetrics.quantifiableResults}

## Work History (${profile.workHistory.length} entries)
${profile.workHistory.map((job, index) => `
**${index + 1}. ${job.role} at ${job.company}**
- Duration: ${job.startDate} - ${job.endDate || 'Present'}
- Achievements: ${job.achievements.length}
- Metrics: ${job.metrics.length}
- Stories: ${job.stories.length}
- Source Confidence: ${job.sourceConfidence}
`).join('')}

## Education (${profile.education.length} entries)
${profile.education.map((edu, index) => `
**${index + 1}. ${edu.degree} in ${edu.fieldOfStudy}**
- Institution: ${edu.institution}
- Duration: ${edu.startDate} - ${edu.endDate}
- Source Confidence: ${edu.sourceConfidence}
`).join('')}

## Skills (${profile.skills.length} total)
- **Advanced**: ${profile.skills.filter(s => s.proficiency === 'advanced' || s.proficiency === 'expert').length}
- **Intermediate**: ${profile.skills.filter(s => s.proficiency === 'intermediate').length}
- **Beginner**: ${profile.skills.filter(s => s.proficiency === 'beginner').length}

## Contact Information
- **Email**: ${profile.contactInfo.email || 'Not provided'}
- **Phone**: ${profile.contactInfo.phone || 'Not provided'}
- **Location**: ${profile.contactInfo.location || 'Not provided'}
- **LinkedIn**: ${profile.contactInfo.linkedin || 'Not provided'}
- **Website**: ${profile.contactInfo.website || 'Not provided'}
- **Source Confidence**: ${profile.contactInfo.sourceConfidence}

## Professional Summary
${profile.summary}`;
  }
}
