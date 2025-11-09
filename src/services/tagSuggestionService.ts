/**
 * Tag Suggestion Service
 * Generates AI-powered tag suggestions for companies, roles, and saved sections
 * Integrates with user goals and company research for personalized suggestions
 */

import { LLMAnalysisService } from './openaiService';
import { BrowserSearchService, type CompanyResearchResult } from './browserSearchService';
import { buildContentTaggingPrompt, type GapContext } from '@/prompts/contentTagging';

export interface TagSuggestion {
  id: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
  category?: 'industry' | 'business_model' | 'skill' | 'competency' | 'other';
}

/**
 * Base request interface for tag suggestions
 */
interface BaseTagSuggestionRequest {
  content: string;
  userGoals?: {
    industries?: string[];
    businessModels?: string[];
  };
  existingTags?: string[];
}

/**
 * Company tag suggestion request - requires companyName
 */
export interface CompanyTagSuggestionRequest extends BaseTagSuggestionRequest {
  contentType: 'company';
  companyName: string; // Required for company tags
}

/**
 * Role tag suggestion request
 */
export interface RoleTagSuggestionRequest extends BaseTagSuggestionRequest {
  contentType: 'role';
  companyName?: string; // Optional for role tags (can be used for context)
}

/**
 * Saved section tag suggestion request
 */
export interface SavedSectionTagSuggestionRequest extends BaseTagSuggestionRequest {
  contentType: 'saved_section';
  gapContext?: GapContext; // For new content created to address gaps
}

/**
 * Discriminated union type for type-safe tag suggestion requests
 */
export type TagSuggestionRequest =
  | CompanyTagSuggestionRequest
  | RoleTagSuggestionRequest
  | SavedSectionTagSuggestionRequest;

export class TagSuggestionService {
  private static llmService = new LLMAnalysisService();

  /**
   * Validates the tag suggestion request and throws clear errors for missing required fields
   */
  private static validateRequest(request: TagSuggestionRequest): void {
    // Validate content is not empty
    if (!request.content || request.content.trim().length === 0) {
      throw new Error('Content is required and cannot be empty');
    }

    // Validate companyName is provided when contentType is 'company'
    if (request.contentType === 'company') {
      if (!request.companyName || request.companyName.trim().length === 0) {
        throw new Error('companyName is required when contentType is "company"');
      }
    }
  }

  static async suggestTags(request: TagSuggestionRequest): Promise<TagSuggestion[]> {
    // Validate request before processing
    this.validateRequest(request);

    // 1. For company tags, research company via browser search
    let companyResearch: CompanyResearchResult | null = null;
    if (request.contentType === 'company') {
      // TypeScript now knows companyName is required for 'company' type
      const companyName = request.companyName;
      try {
        // Use caching to avoid repeated API calls for the same company
        // Cache layers: in-memory (session) → localStorage (24h) → database (persistent)
        companyResearch = await BrowserSearchService.researchCompany(companyName, true);
      } catch (error) {
        // Don't silently fail - throw error so UI can show retry option
        throw new Error(`Failed to research company: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 2. Build prompt with user goals context, company research, and gap context
    const prompt = buildContentTaggingPrompt(
      request.content,
      request.contentType,
      request.userGoals,
      companyResearch,
      request.gapContext
    );

    // 3. Call OpenAI
    const response = await this.callOpenAIForTags(prompt);

    // 4. Parse response JSON
    let parsed: any;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error parsing tag suggestions:', error);
      throw new Error('Failed to parse tag suggestions from AI response');
    }

    // 5. Transform to TagSuggestion format
    const suggestions: TagSuggestion[] = [];
    
    // For company tags, only include business model and vertical/industry tags
    // For role/story/saved_section, include all relevant tags (skills, competencies, etc.)
    let allTags: string[] = [];
    
    if (request.contentType === 'company') {
      // Company tags: only business models and verticals
      allTags = [
        ...(parsed.primaryTags || []).filter((tag: string) => {
          // Filter to only include business models and verticals
          const tagLower = tag.toLowerCase();
          return tagLower.includes('b2b') || tagLower.includes('b2c') || 
                 tagLower.includes('d2c') || tagLower.includes('enterprise') ||
                 tagLower.includes('smb') || tagLower.includes('marketplace') ||
                 tagLower.includes('platform') || tagLower.includes('saas') ||
                 tagLower.includes('/') || // Vertical tags have "/" (e.g., "Software / SaaS")
                 parsed.industryTags?.includes(tag) ||
                 parsed.businessModelTags?.includes(tag);
        }),
        ...(parsed.industryTags || []),
        ...(parsed.businessModelTags || [])
      ];
    } else {
      // Role/story/saved_section: include all relevant tags
      allTags = [
        ...(parsed.primaryTags || []),
        ...(parsed.industryTags || []),
        ...(parsed.skillTags || []),
        ...(parsed.roleLevelTags || []),
        ...(parsed.scopeTags || []),
        ...(parsed.contextTags || [])
      ];
    }

    // 6. Deduplicate tags (case-insensitive) before processing
    const seenTags = new Set<string>();
    const uniqueTags: string[] = [];
    
    for (const tag of allTags) {
      const normalizedTag = tag.trim();
      if (!normalizedTag) continue; // Skip empty tags
      
      const tagLower = normalizedTag.toLowerCase();
      if (!seenTags.has(tagLower)) {
        seenTags.add(tagLower);
        uniqueTags.push(normalizedTag);
      }
    }

    // 7. Map to TagSuggestion with confidence
    uniqueTags.forEach((tag: string, index: number) => {
      // Determine confidence based on:
      // - If tag matches user goals industries/businessModels → high
      // - If tag is in primaryTags → high
      // - Otherwise → medium/low based on position
      let confidence: 'high' | 'medium' | 'low' = 'medium';
      
      if (request.userGoals) {
        const tagLower = tag.toLowerCase();
        const matchesIndustry = request.userGoals.industries?.some(industry =>
          tagLower.includes(industry.toLowerCase()) || industry.toLowerCase().includes(tagLower)
        );
        const matchesBusinessModel = request.userGoals.businessModels?.some(model =>
          tagLower.includes(model.toLowerCase()) || model.toLowerCase().includes(tagLower)
        );
        
        if (matchesIndustry || matchesBusinessModel) {
          confidence = 'high';
        } else if (parsed.primaryTags?.includes(tag)) {
          confidence = 'high';
        } else if (index < 3) {
          confidence = 'medium';
        } else {
          confidence = 'low';
        }
      } else {
        confidence = index < 3 ? 'high' : index < 5 ? 'medium' : 'low';
      }

      // Determine category
      let category: TagSuggestion['category'] = 'other';
      if (parsed.industryTags?.includes(tag)) category = 'industry';
      else if (parsed.businessModelTags?.includes(tag)) category = 'business_model';
      else if (parsed.skillTags?.includes(tag)) category = 'skill';
      else if (parsed.roleLevelTags?.includes(tag) || parsed.scopeTags?.includes(tag)) category = 'competency';

      suggestions.push({
        id: `tag-${index}`,
        value: tag,
        confidence,
        category
      });
    });

    // 8. Filter out existing tags (case-insensitive)
    const filtered = suggestions.filter(s => 
      !request.existingTags?.some(existing => 
        existing.toLowerCase().trim() === s.value.toLowerCase().trim()
      )
    );

    // 9. Limit to top 10 suggestions
    return filtered.slice(0, 10);
  }

  private static async callOpenAIForTags(prompt: string): Promise<string> {
    const apiKey = (import.meta.env?.VITE_OPENAI_KEY) || 
                   (typeof process !== 'undefined' ? process.env.VITE_OPENAI_KEY : undefined) || '';
    const baseUrl = 'https://api.openai.com/v1';
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Use cost-effective model
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing professional content and generating relevant tags. Always return valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.5, // Balanced creativity and consistency
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return content;
  }
}

