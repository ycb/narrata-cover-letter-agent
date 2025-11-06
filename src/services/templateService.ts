// Template service for creating reusable templates from user content
import { LLMAnalysisService } from './openaiService';
import { buildTemplateCreationPrompt, buildTemplateEvaluationPrompt } from '../prompts';

export interface CoverLetterTemplate {
  intro: {
    structure: string;
    keyElements: string[];
    tone: string;
    length: 'short' | 'medium' | 'long';
  };
  stories: Array<{
    id: string;
    type: 'achievement' | 'challenge' | 'impact' | 'leadership' | 'innovation';
    structure: string;
    keyElements: string[];
    metrics: string[];
    narrativeFlow: string;
  }>;
  closer: {
    structure: string;
    keyElements: string[];
    callToAction: string;
    tone: string;
  };
  overallStructure: {
    totalStories: number;
    flow: string[];
    personalizationLevel: 'high' | 'medium' | 'low';
    templateType: 'achievement-focused' | 'story-driven' | 'skills-based' | 'mixed';
  };
}

export interface TemplateEvaluation {
  structureQuality: '✅ Excellent' | '⚠ Good' | '❌ Poor';
  storyDiversity: '✅ Diverse' | '⚠ Limited' | '❌ Repetitive';
  personalizationLevel: '✅ High' | '⚠ Medium' | '❌ Low';
  reusability: '✅ Highly Reusable' | '⚠ Somewhat Reusable' | '❌ Not Reusable';
  templateCompleteness: '✅ Complete' | '⚠ Partial' | '❌ Incomplete';
  rationale: string;
}

export class TemplateService {
  private llmService: LLMAnalysisService;

  constructor() {
    this.llmService = new LLMAnalysisService();
  }

  /**
   * Create a cover letter template from user's cover letter content
   */
  async createCoverLetterTemplate(
    coverLetterText: string,
    resumeData?: any,
    linkedinData?: any
  ): Promise<{ success: boolean; data?: CoverLetterTemplate; error?: string }> {
    try {
      const prompt = this.buildTemplateCreationPrompt(coverLetterText, resumeData, linkedinData);
      const response = await this.llmService.analyzeResume(prompt);
      
      if (!response.success || !response.data) {
        throw new Error(`Template creation failed: ${response.error || 'No data returned'}`);
      }
      
      // Validate the template structure
      if (!this.isValidTemplate(response.data)) {
        throw new Error('Invalid template structure');
      }
      
      return {
        success: true,
        data: response.data as unknown as CoverLetterTemplate
      };
    } catch (error) {
      console.error('Template creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template creation failed'
      };
    }
  }

  /**
   * Evaluate the quality of a generated template
   */
  async evaluateTemplate(template: CoverLetterTemplate): Promise<TemplateEvaluation> {
    const prompt = this.buildTemplateEvaluationPrompt(template);
    
    try {
      const response = await this.llmService.analyzeResume(prompt);
      
      if (!response.success || !response.data) {
        throw new Error(`Template evaluation failed: ${response.error || 'No data returned'}`);
      }
      
      return response.data as unknown as TemplateEvaluation;
    } catch (error) {
      console.error('Template evaluation failed:', error);
      return {
        structureQuality: '❌ Poor',
        storyDiversity: '❌ Repetitive',
        personalizationLevel: '❌ Low',
        reusability: '❌ Not Reusable',
        templateCompleteness: '❌ Incomplete',
        rationale: `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Build prompt for template creation
   */
  private buildTemplateCreationPrompt(
    coverLetterText: string, 
    resumeData?: any, 
    linkedinData?: any
  ): string {
    return buildTemplateCreationPrompt(coverLetterText, resumeData, linkedinData);
  }

  /**
   * Build prompt for template evaluation
   */
  private buildTemplateEvaluationPrompt(template: CoverLetterTemplate): string {
    return buildTemplateEvaluationPrompt(template);
  }

  /**
   * Validate template structure
   */
  private isValidTemplate(template: any): boolean {
    const requiredFields = ['intro', 'stories', 'closer', 'overallStructure'];
    return requiredFields.every(field => template[field] !== undefined);
  }

  /**
   * Generate template usage instructions
   */
  generateUsageInstructions(template: CoverLetterTemplate): string {
    return `# Cover Letter Template Usage Guide

## Template Overview
- **Type**: ${template.overallStructure.templateType}
- **Stories**: ${template.overallStructure.totalStories} stories
- **Personalization**: ${template.overallStructure.personalizationLevel} level
- **Flow**: ${template.overallStructure.flow.join(' → ')}

## How to Use This Template

### 1. Introduction
**Structure**: ${template.intro.structure}
**Tone**: ${template.intro.tone}
**Key Elements**: ${template.intro.keyElements.join(', ')}

### 2. Stories
${template.stories.map((story, index) => `
**Story ${index + 1}** (${story.type}):
- Structure: ${story.structure}
- Key Elements: ${story.keyElements.join(', ')}
- Metrics to Include: ${story.metrics.join(', ')}
- Narrative Flow: ${story.narrativeFlow}
`).join('')}

### 3. Closing
**Structure**: ${template.closer.structure}
**Tone**: ${template.closer.tone}
**Call to Action**: ${template.closer.callToAction}
**Key Elements**: ${template.closer.keyElements.join(', ')}

## Tips for Customization
- Replace [PLACEHOLDER] text with specific details
- Maintain the narrative flow: ${template.overallStructure.flow.join(' → ')}
- Keep the ${template.intro.tone} tone throughout
- Include metrics and specific achievements in stories
- Ensure each story demonstrates different competencies`;
  }
}
