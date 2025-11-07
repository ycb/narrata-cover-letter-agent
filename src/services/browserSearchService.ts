/**
 * Browser Search Service
 * Uses OpenAI to research company information from the web
 * For auto-suggest tags feature
 */

import { supabase } from '@/lib/supabase';
import { LLMAnalysisService } from './openaiService';

export interface CompanyResearchResult {
  companyName: string;
  industry?: string;
  businessModel?: string;
  companyStage?: string; // startup, growth-stage, established, enterprise
  companySize?: string; // small, medium, large, enterprise
  description?: string;
  keyProducts?: string[];
  tags?: string[];
  source?: string; // URL or source of information
  cachedAt?: string;
}

interface CacheEntry {
  data: CompanyResearchResult;
  timestamp: number;
}

export class BrowserSearchService {
  private static llmService = new LLMAnalysisService();
  
  // In-memory cache (session-level, cleared on page refresh)
  private static memoryCache = new Map<string, CacheEntry>();
  private static readonly MEMORY_CACHE_TTL = 60 * 60 * 1000; // 1 hour
  
  // localStorage cache key prefix
  private static readonly STORAGE_KEY_PREFIX = 'company_research:';
  private static readonly STORAGE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Research company using OpenAI
   * Uses multi-layer caching: in-memory → localStorage → database → API
   */
  static async researchCompany(companyName: string, useCache: boolean = true): Promise<CompanyResearchResult> {
    const normalizedName = companyName.trim().toLowerCase();
    
    // 1. Check in-memory cache first (fastest)
    if (useCache) {
      const memoryCached = this.getMemoryCached(normalizedName);
      if (memoryCached) {
        return memoryCached;
      }
      
      // 2. Check localStorage cache (persists across page refreshes)
      const storageCached = this.getStorageCached(normalizedName);
      if (storageCached) {
        // Populate memory cache for faster future access
        this.setMemoryCached(normalizedName, storageCached);
        return storageCached;
      }
      
      // 3. Check database cache (long-term persistence)
      const dbCached = await this.getCachedResearch(companyName);
      if (dbCached) {
        // Populate both memory and localStorage caches
        this.setMemoryCached(normalizedName, dbCached);
        this.setStorageCached(normalizedName, dbCached);
        return dbCached;
      }
    }

    // 2. Build prompt for OpenAI to search web and extract company info
    const searchPrompt = this.buildCompanyResearchPrompt(companyName);
    
    // 3. Use OpenAI to extract company information
    // Note: OpenAI doesn't have native browser search, so we'll use a prompt that asks it to
    // provide information based on its training data, or we can integrate with a search API later
    const extractionPrompt = this.buildExtractionPrompt(companyName, searchPrompt);
    
    try {
      // Call OpenAI - we'll use the LLMAnalysisService's callOpenAI method
      // For now, we'll use a direct approach since we need structured JSON output
      const response = await this.callOpenAIForResearch(extractionPrompt);
      
      // 4. Extract structured company information from response
      const research = this.extractCompanyInfo(companyName, response);
      
      // 5. Cache results in all layers
      if (useCache) {
        // Cache in memory (session-level)
        this.setMemoryCached(normalizedName, research);
        
        // Cache in localStorage (persists across page refreshes)
        this.setStorageCached(normalizedName, research);
        
        // Cache in database (long-term persistence, non-blocking)
        this.cacheResearch(research, companyName).catch(err => {
          console.warn('Failed to cache research in database:', err);
          // Non-blocking: continue even if DB cache fails
        });
      }
      
      return research;
    } catch (error) {
      console.error('Error researching company:', error);
      throw new Error(`Failed to research company: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static buildCompanyResearchPrompt(companyName: string): string {
    return `Search for information about the company "${companyName}".

Extract the following information:
- Industry (e.g., SaaS, Fintech, Healthcare, E-commerce)
- Business Model (e.g., B2B, B2C, Marketplace, Platform)
- Company Stage (startup, growth-stage, established, enterprise)
- Company Size (small, medium, large, enterprise)
- Brief description of what the company does
- Key products or services
- Relevant tags for categorization

If you don't have current information, provide your best estimate based on the company name and any context you have.`;
  }

  private static buildExtractionPrompt(companyName: string, searchContext: string): string {
    return `Based on your knowledge, provide information about the company "${companyName}".

${searchContext}

Return ONLY valid JSON with this structure:
{
  "industry": "industry name or null",
  "businessModel": "business model or null",
  "companyStage": "startup|growth-stage|established|enterprise or null",
  "companySize": "small|medium|large|enterprise or null",
  "description": "brief description or null",
  "keyProducts": ["product1", "product2"] or [],
  "tags": ["tag1", "tag2"] or []
}

Return valid JSON only, no markdown formatting.`;
  }

  private static async callOpenAIForResearch(prompt: string): Promise<string> {
    // Use LLMAnalysisService's internal callOpenAI method
    // We need to access it, but it's private, so we'll create a similar method
    // or use a workaround
    
    // For now, let's create a simple OpenAI call
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
        model: 'gpt-4o-mini', // Use cost-effective model for research
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that provides structured JSON responses about companies. Always return valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for more factual responses
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

  private static extractCompanyInfo(companyName: string, response: string): CompanyResearchResult {
    try {
      // Parse JSON response
      // Remove markdown code blocks if present
      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);

      return {
        companyName,
        industry: parsed.industry || undefined,
        businessModel: parsed.businessModel || undefined,
        companyStage: parsed.companyStage || undefined,
        companySize: parsed.companySize || undefined,
        description: parsed.description || undefined,
        keyProducts: parsed.keyProducts || [],
        tags: parsed.tags || []
      };
    } catch (error) {
      console.error('Error parsing company research response:', error);
      // Return minimal result if parsing fails
      return {
        companyName,
        description: `Information about ${companyName}`
      };
    }
  }

  /**
   * Get from in-memory cache (session-level)
   */
  private static getMemoryCached(companyName: string): CompanyResearchResult | null {
    const entry = this.memoryCache.get(companyName);
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.MEMORY_CACHE_TTL) {
      this.memoryCache.delete(companyName);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set in-memory cache
   */
  private static setMemoryCached(companyName: string, research: CompanyResearchResult): void {
    this.memoryCache.set(companyName, {
      data: research,
      timestamp: Date.now()
    });
  }

  /**
   * Get from localStorage cache (persists across page refreshes)
   */
  private static getStorageCached(companyName: string): CompanyResearchResult | null {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
    
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${companyName}`;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      
      const entry: CacheEntry = JSON.parse(raw);
      
      // Check TTL
      if (Date.now() - entry.timestamp > this.STORAGE_CACHE_TTL) {
        localStorage.removeItem(key);
        return null;
      }
      
      return entry.data;
    } catch (error) {
      console.warn('Error reading from localStorage cache:', error);
      return null;
    }
  }

  /**
   * Set localStorage cache
   */
  private static setStorageCached(companyName: string, research: CompanyResearchResult): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${companyName}`;
      const entry: CacheEntry = {
        data: research,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      // localStorage might be full or disabled - non-blocking
      console.warn('Error writing to localStorage cache:', error);
    }
  }

  /**
   * Clear all caches (useful for testing or manual refresh)
   */
  static clearAllCaches(): void {
    // Clear in-memory cache
    this.memoryCache.clear();
    
    // Clear localStorage cache
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(this.STORAGE_KEY_PREFIX)) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Error clearing localStorage cache:', error);
      }
    }
  }

  /**
   * Get from database cache (long-term persistence)
   */
  private static async getCachedResearch(companyName: string): Promise<CompanyResearchResult | null> {
    try {
      // Check cache in companies table
      const { data, error } = await supabase
        .from('companies')
        .select('research_cache, research_cached_at')
        .ilike('name', companyName)
        .single();

      if (error || !data?.research_cache) {
        return null;
      }

      const cached = typeof data.research_cache === 'string' 
        ? JSON.parse(data.research_cache)
        : data.research_cache;
      
      return {
        ...cached,
        cachedAt: data.research_cached_at
      };
    } catch (e) {
      console.error('Error getting cached research:', e);
      return null;
    }
  }

  private static async cacheResearch(research: CompanyResearchResult, companyName: string): Promise<void> {
    try {
      // Cache in companies table
      const { error } = await supabase
        .from('companies')
        .update({
          research_cache: research,
          research_cached_at: new Date().toISOString()
        })
        .ilike('name', companyName);

      if (error) {
        console.error('Error caching company research:', error);
        // Non-blocking: don't fail if caching fails
      }
    } catch (error) {
      console.error('Error caching company research:', error);
      // Non-blocking
    }
  }
}

