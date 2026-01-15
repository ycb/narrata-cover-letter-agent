/**
 * Browser Search Service
 * Uses OpenAI to research company information from the web
 * For auto-suggest tags feature
 */

import { supabase } from '@/lib/supabase';
import { LLMAnalysisService } from './openaiService';
import { mapCompanyStageToMaturity } from '@/utils/companyMaturity';

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
   * 
   * Note: Future enhancement - could optionally accept tenure dates (startDate, endDate)
   * to ask for historical company stage in the same LLM call. If it requires 2 calls, skip it.
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
  "industry": "Be specific, e.g. 'Fintech / Payments / Crypto' not just 'Finance'",
  "businessModel": "B2B|B2C|D2C|B2B2C|Marketplace|Platform|SaaS|Enterprise|SMB|Developer Tools",
  "companyStage": "startup|growth-stage|established|enterprise or null",
  "companySize": "small|medium|large|enterprise or null",
  "description": "brief description (1-2 sentences)",
  "keyProducts": ["product1", "product2"] or [],
  "tags": ["specific keywords about what they do"]
}

Examples of SPECIFIC industries:
• Payment company → "Fintech / Payments / Crypto"
• Healthcare software → "HealthTech / Digital Health"
• Learning platform → "EdTech / Learning Platforms"
• Solar/energy company → "IoT / Edge Computing"
• Generic software → "Software / SaaS"

Return valid JSON only, no markdown formatting.`;
  }

  private static async callOpenAIForResearch(prompt: string): Promise<string> {
    // Use LLMAnalysisService's internal callOpenAI method
    // We need to access it, but it's private, so we'll create a similar method
    // or use a workaround
    
    // For now, let's create a simple OpenAI call
    const apiKey = (import.meta.env?.VITE_OPENAI_API_KEY) || 
                   (typeof process !== 'undefined' ? process.env.VITE_OPENAI_API_KEY : undefined) || '';
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

      // Normalize industry and business model using smart post-processing
      const normalizedIndustry = this.normalizeIndustry(
        parsed.industry, 
        parsed.description, 
        parsed.tags
      );
      const normalizedBusinessModel = this.normalizeBusinessModel(parsed.businessModel);

      return {
        companyName,
        industry: normalizedIndustry,
        businessModel: normalizedBusinessModel,
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
   * Intelligent industry normalization using multiple signals
   * 0 tokens cost - happens client-side after API call
   * Leverages description + tags for richer signal matching
   */
  private static normalizeIndustry(
    rawIndustry: string | null, 
    description: string | null,
    tags: string[] | null
  ): string | undefined {
    if (!rawIndustry) return undefined;
    
    // Combine all signals for better matching
    const signals = [
      rawIndustry,
      description || '',
      ...(tags || [])
    ].join(' ').toLowerCase();
    
    // SMART KEYWORD MATCHING (ordered by specificity)
    // More specific matches first to avoid false positives
    
    // Fintech & Payments (high signal keywords)
    if (signals.match(/\b(payment|fintech|banking|lending|insurance|crypto|blockchain|wallet|card|transaction|stripe|square|paypal)\b/)) {
      return 'Fintech / Payments / Crypto';
    }
    
    // Healthcare & Biotech (distinct keywords)
    if (signals.match(/\b(healthcare|medical|health tech|patient|clinical|hospital|biotech|pharma|drug|therapeutics)\b/)) {
      if (signals.match(/\b(biotech|pharma|drug|therapeutics|clinical trial|molecule)\b/)) {
        return 'Biotech / Pharma';
      }
      if (signals.match(/\b(medtech|medical device|diagnostic|imaging)\b/)) {
        return 'Healthcare / MedTech';
      }
      if (signals.match(/\b(wellness|fitness|mental health|telemedicine|nutrition)\b/)) {
        return 'Wellness / Fitness';
      }
      return 'HealthTech / Digital Health';
    }
    
    // EdTech (clear signal)
    if (signals.match(/\b(edtech|education|learning|student|course|university|school|training platform|classroom)\b/)) {
      return 'EdTech / Learning Platforms';
    }
    
    // HRTech (clear signal)
    if (signals.match(/\b(hrtech|recruiting|talent|hiring|applicant|resume|job board|workforce|hr platform)\b/)) {
      return 'HRTech / Future of Work';
    }
    
    // E-commerce & Retail (specific indicators)
    if (signals.match(/\b(e-commerce|ecommerce|retail|shopping|storefront|checkout|cart|shopify)\b/)) {
      return 'E-commerce / Retail';
    }
    
    // FoodTech & AgTech (specific domains)
    if (signals.match(/\b(food tech|restaurant|delivery|agriculture|farming|agtech|grubhub|doordash)\b/)) {
      return 'FoodTech / AgTech';
    }
    
    // Travel & Hospitality
    if (signals.match(/\b(travel|hotel|booking|hospitality|tourism|vacation|airbnb|expedia)\b/)) {
      return 'Travel / Hospitality';
    }
    
    // Media & Entertainment
    if (signals.match(/\b(media|entertainment|gaming|video|streaming|content|music|creator|spotify|netflix)\b/)) {
      return 'Media / Entertainment / Gaming';
    }
    
    // AI & Machine Learning (specific tech)
    if (signals.match(/\b(ai|artificial intelligence|machine learning|ml model|neural|llm|gpt|deep learning|openai)\b/)) {
      return 'AI / Machine Learning';
    }
    
    // Cloud & DevOps (infrastructure keywords)
    if (signals.match(/\b(cloud|infrastructure|kubernetes|devops|container|deployment|hosting|aws|azure|gcp)\b/)) {
      return 'Cloud / DevOps';
    }
    
    // Cybersecurity (distinct keywords)
    if (signals.match(/\b(security|cybersecurity|encryption|compliance|vulnerability|threat|breach|firewall)\b/)) {
      return 'Cybersecurity';
    }
    
    // Data & Analytics (specific tools/concepts)
    if (signals.match(/\b(data|analytics|bi|business intelligence|dashboard|visualization|warehouse|tableau)\b/)) {
      return 'Data / Analytics';
    }
    
    // IoT & Edge (hardware/physical layer - includes solar/energy)
    if (signals.match(/\b(iot|edge computing|sensor|device|hardware|embedded|solar|energy|grid|renewable|cleantech)\b/)) {
      return 'IoT / Edge Computing';
    }
    
    // Telecommunications
    if (signals.match(/\b(telecom|connectivity|network|5g|wireless|carrier|verizon|att)\b/)) {
      return 'Telecommunications / Connectivity';
    }
    
    // Productivity & Collaboration
    if (signals.match(/\b(productivity|collaboration|workflow|workspace|project management|communication platform|slack|asana|notion)\b/)) {
      return 'Productivity / Collaboration';
    }
    
    // LegalTech & Compliance
    if (signals.match(/\b(legal|law|compliance|contract|regulatory|litigation|attorney)\b/)) {
      return 'LegalTech / Compliance';
    }
    
    // Accounting & ERP
    if (signals.match(/\b(accounting|erp|invoice|expense|bookkeeping|tax|payroll|quickbooks)\b/)) {
      return 'Accounting / ERP / Back Office';
    }
    
    // Consumer Goods & D2C
    if (signals.match(/\b(consumer goods|d2c|direct to consumer|subscription box|cpg|warby parker)\b/)) {
      return 'Consumer Goods / D2C';
    }
    
    // Banking & Insurance & Lending
    if (signals.match(/\b(bank|insurance|lending|loan|mortgage|underwriting)\b/)) {
      return 'Banking / Insurance / Lending';
    }
    
    // Consulting & Services
    if (signals.match(/\b(consulting|professional services|advisory|consulting firm)\b/)) {
      return 'Consulting / Services';
    }
    
    // Recruiting & Talent Platforms (distinct from HRTech)
    if (signals.match(/\b(recruiting platform|talent marketplace|job matching|career platform)\b/)) {
      return 'Recruiting / Talent Platforms';
    }
    
    // Generic fallback: Software / SaaS (safest generic)
    if (signals.match(/\b(software|saas|platform|app|api|service|tech company)\b/)) {
      return 'Software / SaaS';
    }
    
    // No match: keep original (user can manually fix)
    return rawIndustry;
  }

  /**
   * Normalize business model to standard terms
   * 0 tokens cost - happens client-side
   */
  private static normalizeBusinessModel(rawModel: string | null): string | undefined {
    if (!rawModel) return undefined;
    
    const modelLower = rawModel.toLowerCase();
    
    // Map common variations to standard terms
    if (modelLower.match(/\b(b2b|business to business|enterprise sales)\b/)) return 'B2B';
    if (modelLower.match(/\b(b2c|business to consumer|consumer facing)\b/)) return 'B2C';
    if (modelLower.match(/\b(d2c|direct to consumer|dtc)\b/)) return 'D2C';
    if (modelLower.match(/\b(b2b2c)\b/)) return 'B2B2C';
    if (modelLower.match(/\b(marketplace|two-sided|multi-sided)\b/)) return 'Marketplace';
    if (modelLower.match(/\b(platform|ecosystem)\b/)) return 'Platform';
    if (modelLower.match(/\b(saas|software as a service)\b/)) return 'SaaS';
    if (modelLower.match(/\b(developer tool|api-first|dev tool|developer platform)\b/)) return 'Developer Tools';
    if (modelLower.match(/\b(enterprise)\b/)) return 'Enterprise';
    if (modelLower.match(/\b(smb|small business|mid-market)\b/)) return 'SMB';
    
    return rawModel; // Keep original if no match
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
      // Map companyStage to maturity for PM Levels
      const maturity = mapCompanyStageToMaturity(research.companyStage);
      
      // Cache in companies table, including company_stage and maturity for PM Levels
      const { error } = await supabase
        .from('companies')
        .update({
          research_cache: research,
          research_cached_at: new Date().toISOString(),
          company_stage: research.companyStage || null,
          maturity: maturity || null
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

