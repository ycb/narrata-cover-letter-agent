/**
 * Experience Match Service
 *
 * Maps job requirements to user's work history using LLM analysis
 * Returns detailed matches with evidence and confidence levels
 */

import { LLMAnalysisService } from './openaiService';
import { buildExperienceMatchPrompt } from '@/prompts/experienceMatch';

export interface ExperienceMatch {
  requirement: string;
  confidence: 'high' | 'medium' | 'low';
  matchedWorkItemIds: string[];
  matchedStoryIds: string[];
  evidence: string;
  missingDetails?: string;
  // Human-readable references
  matchedWorkItems?: Array<{ id: string; company: string; title: string }>;
  matchedStories?: Array<{ id: string; title: string; company?: string }>;
}

export interface ExperienceMatchResult {
  matches: ExperienceMatch[];
  overallMatch: 'strong' | 'average' | 'weak';
  highConfidenceCount: number;
  totalCount: number;
}

interface WorkItem {
  id: string;
  company: string;
  title: string;
  description: string | null;
  achievements: string[];
  startDate: string;
  endDate: string | null;
}

interface ApprovedContent {
  id: string;
  title: string;
  content: string;
  company?: string;
  role?: string;
}

export class ExperienceMatchService {
  private llmService: LLMAnalysisService;

  constructor() {
    this.llmService = new LLMAnalysisService();
  }

  /**
   * Analyze how user's work history matches job requirements
   * Uses LLM for intelligent matching
   */
  async analyzeExperienceMatch(
    requirements: string[],
    workItems: WorkItem[],
    approvedContent: ApprovedContent[]
  ): Promise<ExperienceMatchResult> {
    try {
      // Build prompt
      const prompt = buildExperienceMatchPrompt(requirements, workItems, approvedContent);

      // Call LLM
      const response = await this.llmService.callOpenAI(prompt, 2000);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to analyze experience match');
      }

      // Parse response
      const parsed = response.data as { matches: ExperienceMatch[] };

      if (!parsed.matches || !Array.isArray(parsed.matches)) {
        throw new Error('Invalid response structure from LLM');
      }

      // Validate matches and enrich with human-readable references
      const matches = parsed.matches.map(match => {
        // Map work item IDs to readable info
        const matchedWorkItems = (match.matchedWorkItemIds || [])
          .map(id => {
            const workItem = workItems.find(w => w.id === id);
            if (workItem) {
              return { id, company: workItem.company, title: workItem.title };
            }
            return null;
          })
          .filter(Boolean) as Array<{ id: string; company: string; title: string }>;

        // Map story IDs to readable info
        const matchedStories = (match.matchedStoryIds || [])
          .map(id => {
            const story = approvedContent.find(s => s.id === id);
            if (story) {
              return { id, title: story.title, company: story.company };
            }
            return null;
          })
          .filter(Boolean) as Array<{ id: string; title: string; company?: string }>;

        // Build enhanced evidence with human-readable references
        let enhancedEvidence = match.evidence || 'No evidence available';

        // If we have matched items, append them to evidence
        if (matchedWorkItems.length > 0 || matchedStories.length > 0) {
          const references: string[] = [];

          matchedWorkItems.forEach(item => {
            references.push(`${item.title} at ${item.company}`);
          });

          matchedStories.forEach(story => {
            if (story.company) {
              references.push(`"${story.title}" at ${story.company}`);
            } else {
              references.push(`"${story.title}"`);
            }
          });

          if (references.length > 0) {
            enhancedEvidence = `${match.evidence}\n\nReferences: ${references.join('; ')}`;
          }
        }

        return {
          requirement: match.requirement || '',
          confidence: match.confidence || 'low',
          matchedWorkItemIds: match.matchedWorkItemIds || [],
          matchedStoryIds: match.matchedStoryIds || [],
          evidence: enhancedEvidence,
          missingDetails: match.missingDetails || '',
          matchedWorkItems,
          matchedStories,
        };
      });

      // Calculate overall match quality
      const highConfidenceCount = matches.filter(m => m.confidence === 'high').length;
      const totalCount = matches.length;
      const matchPercentage = totalCount > 0 ? (highConfidenceCount / totalCount) * 100 : 0;

      let overallMatch: 'strong' | 'average' | 'weak';
      if (matchPercentage >= 70) {
        overallMatch = 'strong';
      } else if (matchPercentage >= 40) {
        overallMatch = 'average';
      } else {
        overallMatch = 'weak';
      }

      return {
        matches,
        overallMatch,
        highConfidenceCount,
        totalCount,
      };
    } catch (error) {
      console.error('Error in experience match analysis:', error);

      // Return empty result on error
      return {
        matches: requirements.map(req => ({
          requirement: req,
          confidence: 'low',
          matchedWorkItemIds: [],
          matchedStoryIds: [],
          evidence: 'Analysis failed - unable to match',
          missingDetails: error instanceof Error ? error.message : 'Unknown error',
        })),
        overallMatch: 'weak',
        highConfidenceCount: 0,
        totalCount: requirements.length,
      };
    }
  }
}
