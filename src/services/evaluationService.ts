// Evaluation service for systematic data quality assessment
import { LLMAnalysisService } from './openaiService';

export interface EvaluationResult {
  accuracy: '✅ Accurate' | '⚠ Partially Accurate' | '❌ Inaccurate';
  relevance: '✅ Relevant' | '⚠ Somewhat Relevant' | '❌ Not Relevant';
  personalization: '✅ Personalized' | '⚠ Weak Personalization' | '❌ Generic';
  clarity_tone: '✅ Clear & Professional' | '⚠ Minor Issues' | '❌ Unclear or Fluffy';
  framework: '✅ Structured' | '⚠ Partial' | '❌ Not Structured';
  go_nogo: '✅ Go' | '❌ No-Go';
  rationale: string;
}

export interface HeuristicResult {
  hasWorkExperience: boolean;
  hasEducation: boolean;
  hasSkills: boolean;
  hasContactInfo: boolean;
  workExperienceCount: number;
  educationCount: number;
  skillsCount: number;
  hasQuantifiableMetrics: boolean;
  hasCompanyNames: boolean;
  hasJobTitles: boolean;
  dataCompleteness: number;
}

export class EvaluationService {
  private llmService: LLMAnalysisService;

  constructor() {
    this.llmService = new LLMAnalysisService();
  }

  /**
   * Run LLM judge evaluation on structured data
   */
  async evaluateStructuredData(
    structuredData: any,
    originalText: string,
    type: 'resume' | 'coverLetter' | 'linkedin'
  ): Promise<EvaluationResult> {
    const prompt = this.buildEvaluationPrompt(structuredData, originalText, type);
    
    try {
      const response = await this.llmService.callOpenAI(prompt, 1000);
      const result = JSON.parse(response);
      
      // Validate the response structure
      if (!this.isValidEvaluationResult(result)) {
        throw new Error('Invalid evaluation result structure');
      }
      
      return result;
    } catch (error) {
      console.error('Evaluation failed:', error);
      // Return default "No-Go" result on failure
      return {
        accuracy: '❌ Inaccurate',
        relevance: '❌ Not Relevant',
        personalization: '❌ Generic',
        clarity_tone: '❌ Unclear or Fluffy',
        framework: '❌ Not Structured',
        go_nogo: '❌ No-Go',
        rationale: `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Build evaluation prompt based on the framework
   */
  private buildEvaluationPrompt(structuredData: any, originalText: string, type: string): string {
    return `You are an evaluator of AI-generated structured data from ${type} analysis.

Definitions:
- Accuracy: all facts match the original text and are properly extracted
- Relevance: data is relevant to the document type and purpose
- Personalization: data is specific to the individual (not generic)
- Clarity & Tone: data is clear, well-structured, and professional
- Framework Compliance: follows expected structure for ${type} data
- Go/No-Go: overall quality is sufficient for use

Labels:
✅ Accurate / ⚠ Partially Accurate / ❌ Inaccurate
✅ Relevant / ⚠ Somewhat Relevant / ❌ Not Relevant
✅ Personalized / ⚠ Weak Personalization / ❌ Generic
✅ Clear & Professional / ⚠ Minor Issues / ❌ Unclear or Fluffy
✅ Structured / ⚠ Partial / ❌ Not Structured
✅ Go / ❌ No-Go

Original Text (first 500 chars): ${originalText.substring(0, 500)}

Structured Data: ${JSON.stringify(structuredData, null, 2)}

Respond in JSON only:

{
  "accuracy": "✅ Accurate",
  "relevance": "⚠ Somewhat Relevant", 
  "personalization": "❌ Generic",
  "clarity_tone": "✅ Clear & Professional",
  "framework": "⚠ Partial",
  "go_nogo": "❌ No-Go",
  "rationale": "Brief explanation of the evaluation"
}`;
  }

  /**
   * Validate evaluation result structure
   */
  private isValidEvaluationResult(result: any): boolean {
    const requiredFields = ['accuracy', 'relevance', 'personalization', 'clarity_tone', 'framework', 'go_nogo'];
    return requiredFields.every(field => 
      result[field] && typeof result[field] === 'string'
    );
  }

  /**
   * Run heuristics evaluation (code-driven)
   */
  runHeuristics(structuredData: any, type: string): HeuristicResult {
    const heuristics = {
      hasWorkExperience: false,
      hasEducation: false,
      hasSkills: false,
      hasContactInfo: false,
      workExperienceCount: 0,
      educationCount: 0,
      skillsCount: 0,
      hasQuantifiableMetrics: false,
      hasCompanyNames: false,
      hasJobTitles: false,
      dataCompleteness: 0
    };

    // Check work experience
    if (structuredData.workExperience && Array.isArray(structuredData.workExperience)) {
      heuristics.hasWorkExperience = true;
      heuristics.workExperienceCount = structuredData.workExperience.length;
      
      // Check for quantifiable metrics
      const workText = JSON.stringify(structuredData.workExperience);
      heuristics.hasQuantifiableMetrics = /\d+%|\d+\+|\d+[kK]|\$[\d,]+|increased|decreased|improved|reduced|saved|grew|scaled/i.test(workText);
      
      // Check for company names and job titles
      heuristics.hasCompanyNames = /company|inc|corp|ltd|llc|technologies|solutions/i.test(workText);
      heuristics.hasJobTitles = /manager|director|engineer|analyst|specialist|coordinator|lead|senior|junior/i.test(workText);
    }

    // Check education
    if (structuredData.education && Array.isArray(structuredData.education)) {
      heuristics.hasEducation = true;
      heuristics.educationCount = structuredData.education.length;
    }

    // Check skills
    if (structuredData.skills && Array.isArray(structuredData.skills)) {
      heuristics.hasSkills = true;
      heuristics.skillsCount = structuredData.skills.length;
    }

    // Check contact info
    if (structuredData.contactInfo) {
      heuristics.hasContactInfo = !!(structuredData.contactInfo.email || structuredData.contactInfo.phone || structuredData.contactInfo.linkedin);
    }

    // Calculate data completeness score (0-100)
    const checks = [
      heuristics.hasWorkExperience,
      heuristics.hasEducation,
      heuristics.hasSkills,
      heuristics.hasContactInfo,
      heuristics.hasQuantifiableMetrics,
      heuristics.hasCompanyNames,
      heuristics.hasJobTitles
    ];
    heuristics.dataCompleteness = Math.round((checks.filter(Boolean).length / checks.length) * 100);

    return heuristics;
  }

  /**
   * Generate evaluation summary
   */
  generateEvaluationSummary(evaluation: EvaluationResult, heuristics: HeuristicResult): string {
    const passCount = [
      evaluation.accuracy.startsWith('✅'),
      evaluation.relevance.startsWith('✅'),
      evaluation.personalization.startsWith('✅'),
      evaluation.clarity_tone.startsWith('✅'),
      evaluation.framework.startsWith('✅')
    ].filter(Boolean).length;

    const overallScore = Math.round((passCount / 5) * 100);
    
    return `Evaluation Summary:
- Overall Score: ${overallScore}% (${passCount}/5 criteria passed)
- Data Completeness: ${heuristics.dataCompleteness}%
- Work Experience: ${heuristics.workExperienceCount} entries
- Education: ${heuristics.educationCount} entries  
- Skills: ${heuristics.skillsCount} entries
- Quantifiable Metrics: ${heuristics.hasQuantifiableMetrics ? 'Yes' : 'No'}
- Go/No-Go: ${evaluation.go_nogo}
- Rationale: ${evaluation.rationale}`;
  }
}
