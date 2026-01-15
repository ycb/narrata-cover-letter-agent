/**
 * Work History Merge Service
 * 
 * Combines resume and LinkedIn work history into unified "role clusters"
 * for display and downstream analysis without modifying underlying data.
 * 
 * Key concepts:
 * - Role Cluster: In-memory representation of a real job composed of 1-N work_items
 * - Non-destructive: DB rows remain untouched, provenance preserved
 * - Heuristic matching: Company + title + date overlap scoring
 */

import { supabase } from '@/lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

export interface WorkItemSummary {
  id: string;
  sourceId: string | null;
  sourceType: 'resume' | 'linkedin' | 'cover_letter' | 'other';
  title: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  companyId: string;
  companyName: string;
  metrics: MetricItem[];
  tags: string[];
}

export interface MetricItem {
  value: string;
  context?: string;
  type?: 'increase' | 'decrease' | 'absolute';
}

export interface SourceSummary {
  id: string;
  sourceType: 'resume' | 'linkedin' | 'cover_letter';
  sourceMethod: string | null;
  createdAt: string;
}

export interface StorySummary {
  id: string;
  title: string;
  content: string;
  metrics: MetricItem[];
  tags: string[];
  workItemId: string;
}

export type MergeConfidence = 'single' | 'high' | 'medium' | 'low';

export interface MergedRoleCluster {
  clusterId: string;
  userId: string;
  companyName: string;
  companyId: string;
  canonicalTitle: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  resumeItems: WorkItemSummary[];
  linkedinItems: WorkItemSummary[];
  otherItems: WorkItemSummary[];
  sources: SourceSummary[];
  mergedDescription: string;
  mergedMetrics: MetricItem[];
  mergedTags: string[];
  stories: StorySummary[];
  mergeConfidence: MergeConfidence;
  mergeReason: string;
  isAmbiguous: boolean;
}

// Internal types for processing
interface WorkItemWithSource extends WorkItemSummary {
  source: SourceSummary | null;
}

interface CandidateBucket {
  key: string;
  items: WorkItemWithSource[];
}

// =============================================================================
// NORMALIZATION HELPERS
// =============================================================================

/**
 * Normalize company name for matching
 * - Strip suffixes: Inc, Inc., LLC, Ltd, Corp, Co., Corporation
 * - Strip legal designations: 401(c)3, 501(c)(3), etc.
 * - Strip geographic/division qualifiers: America, Research, Electronics
 * - Normalize case + whitespace
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    // Remove legal entity suffixes
    .replace(/,?\s*(inc\.?|llc\.?|ltd\.?|corp\.?|co\.?|corporation|incorporated|limited)$/i, '')
    // Remove nonprofit designations like "401(c)3", "501(c)(3)", etc.
    .replace(/[:\s]*\d+\([a-z]\)\d*/gi, '')
    // Remove geographic/division qualifiers (at end of name)
    .replace(/\s+(america|usa|us|international|global|research|electronics|systems)$/i, '')
    // Remove business type suffixes
    .replace(/[:\s]*(web development|consulting|services|solutions|group|partners)$/i, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two company names might be the same (fuzzy match)
 * Used as fallback when exact normalized match fails but dates overlap significantly
 */
export function companiesAreSimilar(name1: string, name2: string): boolean {
  const norm1 = normalizeCompanyName(name1);
  const norm2 = normalizeCompanyName(name2);
  
  // Exact match after normalization
  if (norm1 === norm2) return true;
  
  // One contains the other (handles abbreviations like "YCB" in "Your Custom Blog")
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // Check if first letters match (acronym check)
  // "Your Custom Blog" -> "ycb" matches "ycb"
  const acronym1 = norm1.split(' ').map(w => w[0]).join('');
  const acronym2 = norm2.split(' ').map(w => w[0]).join('');
  if (acronym1.length >= 2 && acronym2.length >= 2) {
    if (acronym1 === norm2 || acronym2 === norm1) return true;
    if (acronym1 === acronym2) return true;
  }
  
  // Check word overlap (at least 50% of words match)
  const words1 = new Set(norm1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(norm2.split(' ').filter(w => w.length > 2));
  if (words1.size > 0 && words2.size > 0) {
    const intersection = [...words1].filter(w => words2.has(w));
    const minSize = Math.min(words1.size, words2.size);
    if (intersection.length >= minSize * 0.5) return true;
  }
  
  return false;
}

/**
 * Normalize job title for matching
 * - Normalize levels (VP ↔ Vice President, Sr ↔ Senior)
 * - Strip qualifiers (senior, lead, principal) for comparison
 * - Remove consulting markers ([Consulting], (Contract), (Freelance))
 * - Replace multi-role separators (|) with spaces
 */
export function normalizeTitle(title: string): string {
  if (!title) return '';
  
  const normalized = title
    .toLowerCase()
    .trim()
    // Remove consulting/contract markers
    .replace(/\s*\[consulting\]/gi, '')
    .replace(/\s*\(consulting\)/gi, '')
    .replace(/\s*\[contract\]/gi, '')
    .replace(/\s*\(contract\)/gi, '')
    .replace(/\s*\[freelance\]/gi, '')
    .replace(/\s*\(freelance\)/gi, '')
    // Replace multi-role separators with spaces
    .replace(/\s*\|\s*/g, ' ')
    .replace(/\s*\/\s*/g, ' ')
    // Normalize level abbreviations
    .replace(/\bvp\b/gi, 'vice president')
    .replace(/\bsvp\b/gi, 'senior vice president')
    .replace(/\bevp\b/gi, 'executive vice president')
    .replace(/\bsr\.?\b/gi, 'senior')
    .replace(/\bjr\.?\b/gi, 'junior')
    .replace(/\bmgr\.?\b/gi, 'manager')
    .replace(/\bdir\.?\b/gi, 'director')
    .replace(/\beng\.?\b/gi, 'engineer')
    .replace(/\bdev\.?\b/gi, 'developer')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

/**
 * Strip seniority qualifiers for looser matching
 */
export function stripSeniorityQualifiers(normalizedTitle: string): string {
  return normalizedTitle
    .replace(/\b(senior|lead|principal|staff|chief|head of|director of|manager of)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract year from date string
 */
export function extractYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Create a bucket key for candidate grouping
 * Format: normalizedCompany::startYear-endYear
 */
export function createBucketKey(
  companyName: string,
  startDate: string | null,
  endDate: string | null
): string {
  const normalizedCompany = normalizeCompanyName(companyName);
  const startYear = extractYear(startDate) || 'unknown';
  const endYear = extractYear(endDate) || 'present';
  return `${normalizedCompany}::${startYear}-${endYear}`;
}

/**
 * Generate stable cluster ID
 * hash(userId + normalized_company + normalized_title + startYear)
 */
export function generateClusterId(
  userId: string,
  companyName: string,
  title: string,
  startDate: string | null
): string {
  const normalizedCompany = normalizeCompanyName(companyName);
  const normalizedTitle = normalizeTitle(title);
  const startYear = extractYear(startDate) || 'unknown';
  
  const input = `${userId}::${normalizedCompany}::${normalizedTitle}::${startYear}`;
  
  // Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `cluster_${Math.abs(hash).toString(16)}`;
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate title similarity score (0-1)
 * Uses token overlap after normalization
 */
export function calculateTitleScore(title1: string, title2: string): number {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  
  // Exact match after normalization
  if (norm1 === norm2) return 1.0;
  
  // Try with stripped seniority
  const stripped1 = stripSeniorityQualifiers(norm1);
  const stripped2 = stripSeniorityQualifiers(norm2);
  if (stripped1 === stripped2) return 0.9;
  
  // Token overlap
  const tokens1 = new Set(norm1.split(' ').filter(t => t.length > 2));
  const tokens2 = new Set(norm2.split(' ').filter(t => t.length > 2));
  
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  
  const intersection = [...tokens1].filter(t => tokens2.has(t)).length;
  const union = new Set([...tokens1, ...tokens2]).size;
  
  return intersection / union;
}

/**
 * Calculate date overlap score (0-1)
 * IntersectionMonths / UnionMonths
 */
export function calculateDateScore(
  start1: string | null,
  end1: string | null,
  start2: string | null,
  end2: string | null
): number {
  const parseDate = (d: string | null): Date | null => {
    if (!d) return null;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  };
  
  const d1Start = parseDate(start1);
  const d1End = parseDate(end1) || new Date(); // Treat null end as current
  const d2Start = parseDate(start2);
  const d2End = parseDate(end2) || new Date();
  
  // If we can't parse dates, give partial credit if company matches
  if (!d1Start || !d2Start) {
    return 0.3; // Partial credit for missing dates
  }
  
  // Calculate intersection
  const intersectStart = new Date(Math.max(d1Start.getTime(), d2Start.getTime()));
  const intersectEnd = new Date(Math.min(d1End.getTime(), d2End.getTime()));
  
  // Calculate union
  const unionStart = new Date(Math.min(d1Start.getTime(), d2Start.getTime()));
  const unionEnd = new Date(Math.max(d1End.getTime(), d2End.getTime()));
  
  const intersectMonths = Math.max(0, (intersectEnd.getTime() - intersectStart.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const unionMonths = Math.max(1, (unionEnd.getTime() - unionStart.getTime()) / (1000 * 60 * 60 * 24 * 30));
  
  return Math.min(1, intersectMonths / unionMonths);
}

/**
 * Calculate source complementarity score (0-1)
 * Bonus for resume + LinkedIn pairing
 */
export function calculateSourceScore(
  sourceType1: string,
  sourceType2: string
): number {
  const isResume1 = sourceType1 === 'resume';
  const isLinkedin1 = sourceType1 === 'linkedin';
  const isResume2 = sourceType2 === 'resume';
  const isLinkedin2 = sourceType2 === 'linkedin';
  
  // Resume + LinkedIn pairing gets bonus
  if ((isResume1 && isLinkedin2) || (isLinkedin1 && isResume2)) {
    return 1.0;
  }
  
  // Same source type - neutral
  if (sourceType1 === sourceType2) {
    return 0.5;
  }
  
  return 0.3;
}

/**
 * Calculate overall pair score
 * pairScore = 0.4 * titleScore + 0.4 * dateScore + 0.2 * sourceScore
 */
export function calculatePairScore(
  item1: WorkItemWithSource,
  item2: WorkItemWithSource
): number {
  const titleScore = calculateTitleScore(item1.title, item2.title);
  const dateScore = calculateDateScore(
    item1.startDate,
    item1.endDate,
    item2.startDate,
    item2.endDate
  );
  const sourceScore = calculateSourceScore(item1.sourceType, item2.sourceType);
  
  return 0.4 * titleScore + 0.4 * dateScore + 0.2 * sourceScore;
}

// =============================================================================
// CLUSTERING LOGIC
// =============================================================================

/**
 * Group work items into candidate buckets by company + year range
 */
function createCandidateBuckets(items: WorkItemWithSource[]): Map<string, CandidateBucket> {
  const buckets = new Map<string, CandidateBucket>();
  
  for (const item of items) {
    // Create multiple bucket keys for fuzzy matching
    // Primary key: exact company + year range
    const primaryKey = createBucketKey(item.companyName, item.startDate, item.endDate);
    
    // Also bucket by just company name (for cross-year matching)
    const companyOnlyKey = normalizeCompanyName(item.companyName);
    
    // Add to primary bucket
    if (!buckets.has(primaryKey)) {
      buckets.set(primaryKey, { key: primaryKey, items: [] });
    }
    buckets.get(primaryKey)!.items.push(item);
    
    // Add to company-only bucket if different from primary
    if (companyOnlyKey !== primaryKey) {
      const companyKey = `company::${companyOnlyKey}`;
      if (!buckets.has(companyKey)) {
        buckets.set(companyKey, { key: companyKey, items: [] });
      }
      buckets.get(companyKey)!.items.push(item);
    }
  }
  
  return buckets;
}

/**
 * Find best merge pairs within a bucket
 * Returns array of item groups (each group becomes a cluster)
 */
function findMergePairs(bucket: CandidateBucket): WorkItemWithSource[][] {
  const items = bucket.items;
  
  // Single item - no merging needed
  if (items.length === 1) {
    return [items];
  }
  
  // Two items - check if they should merge
  if (items.length === 2) {
    const score = calculatePairScore(items[0], items[1]);
    if (score >= 0.75) {
      return [items]; // Merge into one cluster
    } else if (score >= 0.55) {
      // Medium confidence - still merge but flag as ambiguous
      return [items];
    } else {
      return [[items[0]], [items[1]]]; // Separate clusters
    }
  }
  
  // More than 2 items - find best resume+LI pair, others separate
  const resumeItems = items.filter(i => i.sourceType === 'resume');
  const linkedinItems = items.filter(i => i.sourceType === 'linkedin');
  const otherItems = items.filter(i => i.sourceType !== 'resume' && i.sourceType !== 'linkedin');
  
  const groups: WorkItemWithSource[][] = [];
  const used = new Set<string>();
  
  // Try to pair each resume with best LinkedIn match
  for (const resume of resumeItems) {
    let bestMatch: WorkItemWithSource | null = null;
    let bestScore = 0;
    
    for (const linkedin of linkedinItems) {
      if (used.has(linkedin.id)) continue;
      
      const score = calculatePairScore(resume, linkedin);
      if (score > bestScore && score >= 0.55) {
        bestScore = score;
        bestMatch = linkedin;
      }
    }
    
    if (bestMatch && bestScore >= 0.55) {
      groups.push([resume, bestMatch]);
      used.add(resume.id);
      used.add(bestMatch.id);
    }
  }
  
  // Add unmatched items as separate clusters
  for (const item of items) {
    if (!used.has(item.id)) {
      groups.push([item]);
    }
  }
  
  return groups;
}

// =============================================================================
// MERGE RULES
// =============================================================================

/**
 * Merge a group of work items into a single cluster
 */
function mergeItemsToCluster(
  userId: string,
  items: WorkItemWithSource[],
  stories: StorySummary[]
): MergedRoleCluster {
  // Categorize items by source
  const resumeItems = items.filter(i => i.sourceType === 'resume');
  const linkedinItems = items.filter(i => i.sourceType === 'linkedin');
  const otherItems = items.filter(i => i.sourceType !== 'resume' && i.sourceType !== 'linkedin');
  
  // Determine canonical company (prefer resume's)
  const primaryItem = resumeItems[0] || linkedinItems[0] || items[0];
  const companyId = primaryItem.companyId;
  const companyName = primaryItem.companyName;
  
  // Determine canonical title (prefer resume's, else longest)
  let canonicalTitle = primaryItem.title;
  if (resumeItems.length > 0) {
    canonicalTitle = resumeItems[0].title;
  } else {
    // Pick longest non-empty title
    canonicalTitle = items
      .map(i => i.title)
      .filter(t => t && t.trim())
      .sort((a, b) => b.length - a.length)[0] || '';
  }
  
  // Determine date range (earliest start, latest end)
  const startDates = items
    .map(i => i.startDate)
    .filter((d): d is string => d !== null)
    .sort();
  const endDates = items
    .map(i => i.endDate)
    .filter((d): d is string => d !== null)
    .sort();
  
  const startDate = startDates[0] || null;
  const endDate = endDates.length > 0 ? endDates[endDates.length - 1] : null;
  const isCurrent = items.some(i => i.endDate === null);
  
  // Merge descriptions
  const descriptions = items
    .map(i => i.description)
    .filter((d): d is string => d !== null && d.trim().length > 0);
  
  let mergedDescription = '';
  if (descriptions.length === 1) {
    mergedDescription = descriptions[0];
  } else if (descriptions.length > 1) {
    // Check if descriptions are similar (>80% overlap)
    const desc1 = descriptions[0].toLowerCase();
    const desc2 = descriptions[1]?.toLowerCase() || '';
    const overlap = desc1.includes(desc2.slice(0, 50)) || desc2.includes(desc1.slice(0, 50));
    
    if (overlap && resumeItems.length > 0) {
      // Similar descriptions - prefer resume
      mergedDescription = resumeItems[0].description || descriptions[0];
    } else {
      // Different descriptions - combine with divider
      mergedDescription = descriptions.join('\n\n---\n\n');
    }
  }
  
  // Merge metrics (union)
  const mergedMetrics: MetricItem[] = [];
  const seenMetrics = new Set<string>();
  for (const item of items) {
    for (const metric of item.metrics || []) {
      const key = `${metric.value}::${metric.context || ''}`;
      if (!seenMetrics.has(key)) {
        seenMetrics.add(key);
        mergedMetrics.push(metric);
      }
    }
  }
  
  // Merge tags (case-insensitive unique)
  const mergedTags: string[] = [];
  const seenTags = new Set<string>();
  for (const item of items) {
    for (const tag of item.tags || []) {
      const normalizedTag = tag.toLowerCase();
      if (!seenTags.has(normalizedTag)) {
        seenTags.add(normalizedTag);
        mergedTags.push(tag);
      }
    }
  }
  
  // Collect sources
  const sources: SourceSummary[] = items
    .filter(i => i.source)
    .map(i => i.source!);
  
  // Filter stories for this cluster
  const clusterItemIds = new Set(items.map(i => i.id));
  const clusterStories = stories.filter(s => clusterItemIds.has(s.workItemId));
  
  // Determine merge confidence
  let mergeConfidence: MergeConfidence;
  let mergeReason: string;
  let isAmbiguous = false;
  
  if (items.length === 1) {
    mergeConfidence = 'single';
    mergeReason = `Single ${items[0].sourceType} source`;
  } else if (resumeItems.length > 0 && linkedinItems.length > 0) {
    const score = calculatePairScore(resumeItems[0], linkedinItems[0]);
    if (score >= 0.75) {
      mergeConfidence = 'high';
      mergeReason = `Resume + LinkedIn merged (score: ${score.toFixed(2)})`;
    } else if (score >= 0.55) {
      mergeConfidence = 'medium';
      mergeReason = `Resume + LinkedIn merged with medium confidence (score: ${score.toFixed(2)})`;
      isAmbiguous = true;
    } else {
      mergeConfidence = 'low';
      mergeReason = `Low confidence merge (score: ${score.toFixed(2)})`;
      isAmbiguous = true;
    }
  } else {
    mergeConfidence = 'medium';
    mergeReason = `${items.length} items from same source type merged`;
    isAmbiguous = items.length > 2;
  }
  
  // Generate stable cluster ID
  const clusterId = generateClusterId(userId, companyName, canonicalTitle, startDate);
  
  return {
    clusterId,
    userId,
    companyName,
    companyId,
    canonicalTitle,
    startDate,
    endDate,
    isCurrent,
    resumeItems,
    linkedinItems,
    otherItems,
    sources,
    mergedDescription,
    mergedMetrics,
    mergedTags,
    stories: clusterStories,
    mergeConfidence,
    mergeReason,
    isAmbiguous,
  };
}

// =============================================================================
// MAIN SERVICE
// =============================================================================

/**
 * Get merged work history for a user
 * Combines resume and LinkedIn work items into unified role clusters
 */
export async function getMergedWorkHistory(userId: string): Promise<MergedRoleCluster[]> {
  // Fetch work items with company and source info
  // Fetch work_items (primarily from resume)
  const { data: workItemsData, error: workItemsError } = await supabase
    .from('work_items')
    .select(`
      id,
      title,
      start_date,
      end_date,
      description,
      metrics,
      tags,
      source_id,
      company_id,
      companies!company_id (
        id,
        name
      ),
      sources!source_id (
        id,
        source_type,
        source_method,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('start_date', { ascending: false });
  
  if (workItemsError) {
    console.error('[WorkHistoryMerge] Error fetching work items:', workItemsError);
    return [];
  }
  
  // If no work_items, return empty
  if (!workItemsData || workItemsData.length === 0) {
    return [];
  }
  
  // Fetch stories for all work items (only if we have work items)
  const workItemIds = (workItemsData || []).map((wi: any) => wi.id);
  const { data: storiesData, error: storiesError } = await supabase
    .from('stories')
    .select('id, title, content, metrics, tags, work_item_id')
    .eq('user_id', userId)
    .in('work_item_id', workItemIds);
  
  if (storiesError) {
    console.error('[WorkHistoryMerge] Error fetching stories:', storiesError);
  }
  
  // Transform work_items to internal format
  const workItems: WorkItemWithSource[] = (workItemsData || []).map((wi: any) => {
    const company = wi.companies as any;
    const source = wi.sources as any;
    const description = wi.description || '';
    const tags: string[] = Array.isArray(wi.tags) ? wi.tags : [];
    const companyTags: string[] = Array.isArray(company?.tags) ? company.tags : [];

    // Extract LI metadata from description into tags
    const parts = description.split('|').map((p: string) => p.trim()).filter(Boolean);
    const residual: string[] = [];
    parts.forEach((p) => {
      const lower = p.toLowerCase();
      if (lower.startsWith('role:')) {
        tags.push(p.replace(/role:\s*/i, '').trim());
      } else if (lower.startsWith('specialty:')) {
        tags.push(p.replace(/specialty:\s*/i, '').trim());
      } else if (lower.startsWith('industry:')) {
        companyTags.push(p.replace(/industry:\s*/i, '').trim());
      } else if (lower.startsWith('company size:')) {
        companyTags.push(p.replace(/company size:\s*/i, '').trim());
      } else {
        residual.push(p);
      }
    });
    const cleanDescription = residual.join(' | ').trim();
    
    // Determine source type
    let sourceType: 'resume' | 'linkedin' | 'cover_letter' | 'other' = 'other';
    if (source?.source_type === 'resume') sourceType = 'resume';
    else if (source?.source_type === 'linkedin') sourceType = 'linkedin';
    else if (source?.source_type === 'cover_letter') sourceType = 'cover_letter';
    
    return {
      id: wi.id,
      sourceId: wi.source_id,
      sourceType,
      title: wi.title || '',
      startDate: wi.start_date,
      endDate: wi.end_date,
      description: cleanDescription,
      companyId: company?.id || wi.company_id,
      companyName: company?.name || 'Unknown Company',
      metrics: Array.isArray(wi.metrics) ? wi.metrics : [],
      tags: Array.from(new Set(tags)),
      companyTags: Array.from(new Set(companyTags)),
      source: source ? {
        id: source.id,
        sourceType: source.source_type,
        sourceMethod: source.source_method,
        createdAt: source.created_at,
      } : null,
    };
  });
  
  // Note: LinkedIn work history is now processed into work_items table directly
  // (via useFileUpload.ts processLinkedInWorkHistory), so we don't need to
  // create synthetic items from structured_data anymore. LinkedIn items will
  // appear in workItems with sourceType='linkedin'.
  
  // Count LinkedIn items for logging
  const linkedinItemCount = workItems.filter(wi => wi.sourceType === 'linkedin').length;
  const resumeItemCount = workItems.filter(wi => wi.sourceType === 'resume').length;
  console.log(`[WorkHistoryMerge] Found ${resumeItemCount} resume items, ${linkedinItemCount} LinkedIn items`);
  
  const allItems = [...workItems];
  
  const stories: StorySummary[] = (storiesData || []).map((s: any) => ({
    id: s.id,
    title: s.title || '',
    content: s.content || '',
    metrics: Array.isArray(s.metrics) ? s.metrics : [],
    tags: Array.isArray(s.tags) ? s.tags : [],
    workItemId: s.work_item_id,
  }));
  
  // Step 1: Create candidate buckets by company
  // Use allItems which includes both work_items (resume) and LinkedIn roles
  // Use fuzzy matching to handle company name variations (abbreviations, suffixes, etc.)
  const companyBuckets = new Map<string, WorkItemWithSource[]>();
  const companyKeyMap = new Map<string, string>(); // Maps normalized names to canonical bucket keys
  
  for (const item of allItems) {
    const normalizedName = normalizeCompanyName(item.companyName);
    
    // Check if this company matches an existing bucket (fuzzy match)
    let bucketKey: string | null = null;
    
    // First try exact match
    if (companyBuckets.has(normalizedName)) {
      bucketKey = normalizedName;
    } else {
      // Try fuzzy match against existing bucket keys
      for (const existingKey of companyBuckets.keys()) {
        if (companiesAreSimilar(item.companyName, existingKey)) {
          bucketKey = existingKey;
          break;
        }
      }
    }
    
    if (!bucketKey) {
      // Create new bucket
      bucketKey = normalizedName;
      companyBuckets.set(bucketKey, []);
    }
    
    companyBuckets.get(bucketKey)!.push(item);
  }
  
  // Step 2: Within each company, find merge pairs
  const clusters: MergedRoleCluster[] = [];
  
  for (const [, companyItems] of companyBuckets) {
    // Create finer-grained buckets by year range within company
    const yearBuckets = new Map<string, WorkItemWithSource[]>();
    
    for (const item of companyItems) {
      const startYear = extractYear(item.startDate) || 'unknown';
      const yearKey = `${startYear}`;
      
      if (!yearBuckets.has(yearKey)) {
        yearBuckets.set(yearKey, []);
      }
      yearBuckets.get(yearKey)!.push(item);
    }
    
    // For items in same year bucket, check for merging
    const processedIds = new Set<string>();
    
    for (const [, yearItems] of yearBuckets) {
      const bucket: CandidateBucket = { key: '', items: yearItems };
      const groups = findMergePairs(bucket);
      
      for (const group of groups) {
        // Skip if any item already processed
        if (group.some(i => processedIds.has(i.id))) continue;
        
        const cluster = mergeItemsToCluster(userId, group, stories);
        clusters.push(cluster);
        
        group.forEach(i => processedIds.add(i.id));
      }
    }
    
    // Handle any items not yet processed (different year ranges)
    const unprocessed = companyItems.filter(i => !processedIds.has(i.id));
    for (const item of unprocessed) {
      const cluster = mergeItemsToCluster(userId, [item], stories);
      clusters.push(cluster);
    }
  }
  
  // Sort by start date (most recent first)
  clusters.sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });
  
  console.log(`[WorkHistoryMerge] Created ${clusters.length} clusters from ${allItems.length} work items (${resumeItemCount} resume, ${linkedinItemCount} LinkedIn)`);
  
  return clusters;
}

/**
 * Get merge statistics for debugging/QA
 */
export async function getMergeStats(userId: string): Promise<{
  totalWorkItems: number;
  totalClusters: number;
  resumeOnlyClusters: number;
  linkedinOnlyClusters: number;
  mergedClusters: number;
  highConfidenceMerges: number;
  ambiguousClusters: number;
}> {
  const clusters = await getMergedWorkHistory(userId);
  
  let resumeOnlyClusters = 0;
  let linkedinOnlyClusters = 0;
  let mergedClusters = 0;
  let highConfidenceMerges = 0;
  let ambiguousClusters = 0;
  
  for (const cluster of clusters) {
    const hasResume = cluster.resumeItems.length > 0;
    const hasLinkedin = cluster.linkedinItems.length > 0;
    
    if (hasResume && hasLinkedin) {
      mergedClusters++;
      if (cluster.mergeConfidence === 'high') highConfidenceMerges++;
    } else if (hasResume) {
      resumeOnlyClusters++;
    } else if (hasLinkedin) {
      linkedinOnlyClusters++;
    }
    
    if (cluster.isAmbiguous) ambiguousClusters++;
  }
  
  const totalWorkItems = clusters.reduce(
    (sum, c) => sum + c.resumeItems.length + c.linkedinItems.length + c.otherItems.length,
    0
  );
  
  return {
    totalWorkItems,
    totalClusters: clusters.length,
    resumeOnlyClusters,
    linkedinOnlyClusters,
    mergedClusters,
    highConfidenceMerges,
    ambiguousClusters,
  };
}
