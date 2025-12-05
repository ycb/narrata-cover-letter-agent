import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { WorkHistoryMaster } from "@/components/work-history/WorkHistoryMaster";
import { WorkHistoryDetail } from "@/components/work-history/WorkHistoryDetail";
import { WorkHistoryDrawer } from "@/components/work-history/WorkHistoryDrawer";
import { WorkHistoryFAB } from "@/components/work-history/WorkHistoryFAB";
import { AddStoryModal } from "@/components/work-history/AddStoryModal";
import { AddLinkModal } from "@/components/work-history/AddLinkModal";
import { DataSourcesStatus } from "@/components/work-history/DataSourcesStatus";
import { WorkHistoryOnboarding } from "@/components/work-history/WorkHistoryOnboarding";
import { WorkHistoryEmptyState } from "@/components/work-history/EmptyStates";
import { AddCompanyModal } from "@/components/work-history/AddCompanyModal";
import { AddRoleModal } from "@/components/work-history/AddRoleModal";
import { useTour } from "@/contexts/TourContext";
import { useAuth } from "@/contexts/AuthContext";
import { TourBannerFull } from "@/components/onboarding/TourBannerFull";
import { Button } from "@/components/ui/button";
import { isExternalLinksEnabled } from "@/lib/flags";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FileUploadService } from "@/services/fileUploadService";
import type { FileType } from "@/types/fileUpload";
import { toast } from "sonner";
import type { WorkHistoryCompany, WorkHistoryRole, WorkHistoryBlurb, ExternalLink } from "@/types/workHistory";
import { getMergedWorkHistory, type MergedRoleCluster } from "@/services/workHistoryMergeService";

/**
 * Transform merged role clusters into WorkHistoryCompany format
 * Groups clusters by company for display in existing UI components
 */
function transformClustersToWorkHistory(
  clusters: MergedRoleCluster[],
  gapData: {
    workItemGapMap: Map<string, number>;
    workItemGapsMap: Map<string, Array<{ id: string; description: string; gap_category?: string }>>;
    storyGapMap: Map<string, number>;
    storyGapsMap: Map<string, Array<{ id: string; description: string }>>;
  }
): WorkHistoryCompany[] {
  // Group clusters by company
  const companyMap = new Map<string, MergedRoleCluster[]>();
  
  for (const cluster of clusters) {
    const existing = companyMap.get(cluster.companyId) || [];
    existing.push(cluster);
    companyMap.set(cluster.companyId, existing);
  }
  
  // Transform to WorkHistoryCompany format
  const companies: WorkHistoryCompany[] = [];
  
  for (const [companyId, companyClusters] of companyMap) {
    // Use first cluster for company info
    const firstCluster = companyClusters[0];
    
    // Determine company source (prefer resume if any cluster has resume data)
    const hasResume = companyClusters.some(c => c.resumeItems.length > 0);
    const hasLinkedin = companyClusters.some(c => c.linkedinItems.length > 0);
    const source: 'resume' | 'linkedin' | 'manual' = hasResume ? 'resume' : hasLinkedin ? 'linkedin' : 'manual';
    
    // Transform clusters to roles
    const roles: WorkHistoryRole[] = companyClusters.map(cluster => {
      // Get all work item IDs in this cluster for gap lookup
      const allItemIds = [
        ...cluster.resumeItems.map(i => i.id),
        ...cluster.linkedinItems.map(i => i.id),
        ...cluster.otherItems.map(i => i.id),
      ];
      
      // Use first real work_item ID as the role ID (for gap queries etc.)
      // Fall back to cluster ID if no work items (shouldn't happen)
      const primaryWorkItemId = allItemIds[0] || cluster.clusterId;
      
      // Aggregate gaps from all work items in cluster
      let totalGapCount = 0;
      const allGaps: Array<{ id: string; description: string; gap_category?: string }> = [];
      for (const itemId of allItemIds) {
        totalGapCount += gapData.workItemGapMap.get(itemId) || 0;
        const itemGaps = gapData.workItemGapsMap.get(itemId) || [];
        allGaps.push(...itemGaps);
      }
      
      // Transform stories to blurbs
      const blurbs: WorkHistoryBlurb[] = cluster.stories.map(story => {
        const storyGapCount = gapData.storyGapMap.get(story.id) || 0;
        const storyGaps = gapData.storyGapsMap.get(story.id) || [];
        
        return {
          id: story.id,
          roleId: primaryWorkItemId,
          title: story.title,
          content: story.content,
          outcomeMetrics: story.metrics.map(m => 
            m.context ? `${m.value} ${m.context}` : m.value
          ),
          tags: story.tags,
          source: 'resume' as const,
          status: 'approved' as const,
          confidence: 'high' as const,
          timesUsed: 0,
          hasGaps: storyGapCount > 0,
          gapCount: storyGapCount,
          gaps: storyGaps,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });
      
      // Determine role type from title
      const titleLower = cluster.canonicalTitle.toLowerCase();
      const roleType: 'full-time' | 'contract' | 'founder' = 
        titleLower.includes('founder') || titleLower.includes('co-founder') ? 'founder' :
        titleLower.includes('contract') || titleLower.includes('consulting') ? 'contract' :
        'full-time';
      
      return {
        id: primaryWorkItemId, // Use real work_item UUID for DB queries
        companyId: cluster.companyId,
        title: cluster.canonicalTitle,
        type: roleType,
        startDate: cluster.startDate || '',
        endDate: cluster.endDate || undefined,
        description: cluster.mergedDescription,
        tags: cluster.mergedTags,
        outcomeMetrics: cluster.mergedMetrics.map(m => 
          m.context ? `${m.value} ${m.context}` : m.value
        ),
        blurbs,
        externalLinks: [], // TODO: Fetch external links if needed
        hasGaps: totalGapCount > 0,
        gapCount: totalGapCount,
        gaps: allGaps,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        workItemIds: allItemIds, // Store all underlying work_item IDs
      };
    });
    
    // Sort roles: current first, then by start date descending
    roles.sort((a, b) => {
      if (!a.endDate && b.endDate) return -1;
      if (a.endDate && !b.endDate) return 1;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
    
    companies.push({
      id: companyId,
      name: firstCluster.companyName,
      description: '', // Could extract from company table if needed
      tags: [], // Could aggregate from clusters
      source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      roles,
    });
  }
  
  // Sort companies: current positions first, then by most recent role
  companies.sort((a, b) => {
    const aHasCurrent = a.roles.some(r => !r.endDate);
    const bHasCurrent = b.roles.some(r => !r.endDate);
    if (aHasCurrent && !bHasCurrent) return -1;
    if (!aHasCurrent && bHasCurrent) return 1;
    
    const aLatest = a.roles[0]?.startDate || '';
    const bLatest = b.roles[0]?.startDate || '';
    return new Date(bLatest).getTime() - new Date(aLatest).getTime();
  });
  
  return companies;
}

// REMOVED: Sample data - now using empty states instead
// Sample data has been moved to usability-test branch for future reference
// Sample data declaration removed - using EmptyStates component instead
/*
const sampleWorkHistory: WorkHistoryCompany[] = [
  {
    id: "1",
    name: "TechCorp Inc.",
    description: "Leading technology company",
    tags: ["Technology", "Enterprise", "B2B"],
    source: "manual",
    createdAt: "2020-06-01T00:00:00Z",
    updatedAt: "2024-12-01T00:00:00Z",
    roles: [
      {
        id: "1-1",
        companyId: "1",
        title: "Senior Product Manager",
        type: "full-time",
        startDate: "2022-01",
        endDate: "2024-12",
        description: "Led product strategy for core platform",
        inferredLevel: "Senior",
        tags: ["Product Management", "Strategy", "Leadership"],
        outcomeMetrics: [
          "Increased user engagement by 40% through feature optimization",
          "Led cross-functional team of 12 engineers and designers",
          "Launched 3 major product releases ahead of schedule"
        ],
        // Mock gap detection data - 2 role gaps + 1 story gap = 3 total
        hasGaps: true,
        gapCount: 3,
        blurbs: [
          {
            id: "blurb-1",
            roleId: "1-1",
            title: "Product Strategy Leadership",
            content: "As Product Lead at [TechCorp] I built a high-performing product team from ground up, hiring and managing 8 product professionals while launching MVP in record 6 months.",
            outcomeMetrics: [
              "Launched MVP in 6 months",
              "Hired 8 product professionals"
            ],
            tags: ["Product Management", "Strategy", "Results"],
            source: "manual",
            status: "draft",
            confidence: "medium",
            timesUsed: 8,
            lastUsed: "2024-01-15",
            linkedExternalLinks: ["link-1"],
            // Mock gap detection data
            hasGaps: true,
            gapCount: 1,
                          variations: [
                {
                  id: "var-1",
                  content: "As Product Lead at [TechCorp] I built a high-performing product team from ground up, hiring and managing 8 product professionals while launching MVP in record 6 months. My leadership philosophy is centered on empathy and candor. I implemented annual reviews and PM levelling.",
                  filledGap: "People management",
                  tags: ["philosophy", "team management"],
                  createdAt: "2024-01-20T00:00:00Z",
                  createdBy: "AI"
                },
                {
                  id: "var-2",
                  content: "As Product Lead at [TechCorp] I built a high-performing product team from ground up, hiring and managing 8 product professionals while launching MVP in record 6 months. I developed annual and quarterly roadmaps for 3 product lines and two pods.",
                  filledGap: "Roadmap",
                  tags: ["roadmap", "dependencies"],
                  createdAt: "2024-01-22T00:00:00Z",
                  createdBy: "user"
                }
              ],
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-15T00:00:00Z"
          }
        ],
        createdAt: "2022-01-01T00:00:00Z",
        updatedAt: "2024-12-01T00:00:00Z",
        externalLinks: [
          {
            id: "link-1",
            roleId: "1-1",
            url: "https://medium.com/@example/product-strategy-guide",
            label: "Product Strategy Framework - Medium Article",
            type: "blog",
            tags: ["Product Management", "Strategy", "Thought Leadership"],
            timesUsed: 5,
            lastUsed: "2024-01-20",
            createdAt: "2024-01-01T00:00:00Z"
          },
          {
            id: "link-2",
            roleId: "1-1",
            url: "https://github.com/example/product-dashboard",
            label: "Analytics Dashboard - Open Source Project",
            type: "portfolio",
            tags: ["Analytics", "Open Source", "Dashboard"],
            timesUsed: 3,
            lastUsed: "2024-01-15",
            createdAt: "2024-01-01T00:00:00Z"
          }
        ]
      },
      {
        id: "1-2",
        companyId: "1",
        title: "Product Manager",
        type: "full-time",
        startDate: "2020-06",
        endDate: "2022-01",
        description: "Managed product development lifecycle",
        inferredLevel: "Mid",
        tags: ["Product Management", "Development", "Analytics"],
        outcomeMetrics: [
          "Implemented data-driven decision making process",
          "Reduced time-to-market by 25%"
        ],
        // No gaps for this role
        hasGaps: false,
        gapCount: 0,
        blurbs: [],
        externalLinks: [],
        createdAt: "2020-06-01T00:00:00Z",
        updatedAt: "2022-01-01T00:00:00Z"
      }
    ]
  },
  {
    id: "2",
    name: "StartupXYZ",
    description: "Fast-growing fintech startup",
    tags: ["Fintech", "Startup", "Growth"],
    source: "manual",
    createdAt: "2018-03-01T00:00:00Z",
    updatedAt: "2020-05-01T00:00:00Z",
    roles: [
              {
          id: "2-1",
          companyId: "2",
          title: "Product Lead",
          type: "full-time",
          startDate: "2018-03",
          endDate: "2020-05",
          description: "Built product team from ground up",
          inferredLevel: "Senior",
          tags: ["Leadership", "Team Building", "Fintech"],
          outcomeMetrics: [
            "Hired and managed team of 8 product professionals",
            "Launched MVP in 6 months"
          ],
          // No gaps for this role
          hasGaps: false,
          gapCount: 0,
          blurbs: [
            {
              id: "blurb-2",
              roleId: "2-1",
              title: "Team Building Excellence",
              content: "Built high-performing product team from ground up, hiring and managing 8 product professionals while launching MVP in record 6 months.",
              outcomeMetrics: [
                "Launched MVP in 6 months",
                "Hired 8 product professionals"
              ],
              tags: ["Leadership", "Team Building", "MVP"],
              source: "manual",
                          status: "draft",
            confidence: "medium",
              timesUsed: 12,
              lastUsed: "2024-01-10",
              linkedExternalLinks: [],
              createdAt: "2018-03-01T00:00:00Z",
              updatedAt: "2024-01-10T00:00:00Z"
            }
          ],
          externalLinks: [
            {
              id: "link-3",
              roleId: "2-1",
              url: "https://techcrunch.com/2020/05/15/startup-xyz-raises-series-a",
              label: "Series A Funding Announcement - TechCrunch",
              type: "blog",
              tags: ["Press", "Funding", "Startup"],
              timesUsed: 2,
              lastUsed: "2024-01-10",
              createdAt: "2018-03-01T00:00:00Z"
            }
          ],
          createdAt: "2018-03-01T00:00:00Z",
          updatedAt: "2020-05-01T00:00:00Z"
        }
    ]
  }
];
*/

export default function WorkHistory() {
  // Auth context
  const { user } = useAuth();
  
  // File upload service
  const [isUploading, setIsUploading] = useState(false);
  
  // Tour functionality
  const { isActive: isTourActive, currentStep: tourStep, tourSteps, currentTourStep, nextStep, previousStep, cancelTour } = useTour();
  
  // Debug tour state
  console.log('WorkHistory - Tour state:', { isTourActive, tourStep });
  
  // State for fetched data
  const [workHistory, setWorkHistory] = useState<WorkHistoryCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch work history data from database
  const fetchWorkHistory = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching work history for user:', user.id);

      // Check if synthetic testing is enabled FIRST - if so, we want real data, not sample
      const { SyntheticUserService } = await import('../services/syntheticUserService');
      const syntheticUserService = new SyntheticUserService();
      const syntheticContext = await syntheticUserService.getSyntheticUserContext();
      
      // Tour mode: Use real data, not empty state
      // Only show empty if synthetic testing is explicitly disabled AND no real data exists
      // (Removed the early return that forced empty state during tours)
      
      console.log('[WorkHistory] Synthetic context:', {
        enabled: syntheticContext.isSyntheticTestingEnabled,
        currentProfile: syntheticContext.currentUser?.profileId,
        profileName: syntheticContext.currentUser?.profileName
      });
      
      // Store current profile ID to detect changes
      const currentProfileId = syntheticContext.currentUser?.profileId;
      
      // USE MERGED VIEW for non-synthetic users
      // This combines resume + LinkedIn data into unified role clusters
      if (!syntheticContext.isSyntheticTestingEnabled) {
        console.log('[WorkHistory] Using merged work history view...');
        
        // Fetch merged clusters
        const clusters = await getMergedWorkHistory(user.id);
        console.log(`[WorkHistory] Got ${clusters.length} merged clusters`);
        
        if (clusters.length === 0) {
          setWorkHistory([]);
          setIsLoading(false);
          return;
        }
        
        // Fetch gaps for all work items in clusters
        const { GapDetectionService } = await import('../services/gapDetectionService');
        const userGaps = await GapDetectionService.getUserGaps(user.id);
        
        // Build gap maps
        const workItemGapMap = new Map<string, number>();
        const workItemGapsMap = new Map<string, Array<{ id: string; description: string; gap_category?: string }>>();
        const storyGapMap = new Map<string, number>();
        const storyGapsMap = new Map<string, Array<{ id: string; description: string }>>();
        
        userGaps.forEach(gap => {
          if (gap.entity_type === 'work_item') {
            workItemGapMap.set(gap.entity_id, (workItemGapMap.get(gap.entity_id) || 0) + 1);
            const existing = workItemGapsMap.get(gap.entity_id) || [];
            workItemGapsMap.set(gap.entity_id, [...existing, {
              id: gap.id || '',
              description: gap.description || gap.gap_category || 'Content needs improvement',
              gap_category: (gap as any).gap_category || ''
            }]);
          } else if (gap.entity_type === 'approved_content') {
            storyGapMap.set(gap.entity_id, (storyGapMap.get(gap.entity_id) || 0) + 1);
            const existing = storyGapsMap.get(gap.entity_id) || [];
            storyGapsMap.set(gap.entity_id, [...existing, {
              id: gap.id || '',
              description: gap.description || gap.gap_category || 'Content needs improvement'
            }]);
          }
        });
        
        // Transform clusters to WorkHistoryCompany format
        const mergedWorkHistory = transformClustersToWorkHistory(clusters, {
          workItemGapMap,
          workItemGapsMap,
          storyGapMap,
          storyGapsMap,
        });
        
        console.log(`[WorkHistory] Transformed to ${mergedWorkHistory.length} companies`);
        setWorkHistory(mergedWorkHistory);
        setIsLoading(false);
        return;
      }
      
      // LEGACY PATH: Synthetic testing mode uses raw work_items
      let profileSourceIds: string[] = [];
      if (syntheticContext.isSyntheticTestingEnabled && syntheticContext.currentUser) {
        // Get all sources for this profile (file_name starts with profile_id like P01_)
        const profileId = syntheticContext.currentUser.profileId;
        console.log(`[WorkHistory] Looking for sources matching profile ${profileId}...`);
        
        const { data: profileSources, error: sourcesError } = await supabase
          .from('sources')
          .select('id, file_name, file_type, created_at')
          .eq('user_id', user.id)
          .or(
            `file_name.ilike.${profileId}_%,` +
            `file_name.ilike.${profileId}-% ,` +
            `file_name.ilike.${profileId}.% ,` +
            `file_name.ilike.${profileId} %`
          )
          .order('created_at', { ascending: false });
        
        if (sourcesError) {
          console.error('[WorkHistory] Error fetching profile sources:', sourcesError);
        } else {
          console.log(`[WorkHistory] Found ${profileSources?.length || 0} sources for ${profileId}:`, 
            profileSources?.map(s => ({ file: s.file_name, type: s.file_type, id: s.id.substring(0, 8) + '...' })));
          
          if (profileSources && profileSources.length > 0) {
            profileSourceIds = profileSources.map(s => s.id);
            console.log(`[WorkHistory] Filtering by ${profileId}: ${profileSourceIds.length} source IDs:`, profileSourceIds.map(id => id.substring(0, 8) + '...'));
          } else {
            // Check what sources exist for this user
            const { data: allUserSources } = await supabase
              .from('sources')
              .select('id, file_name')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(5);
            
            console.warn(`[WorkHistory] No sources found matching ${profileId}_% pattern`);
            console.warn(`[WorkHistory] Recent sources for user:`, allUserSources?.map(s => s.file_name));
          }
        }
      } else {
        console.log('[WorkHistory] Synthetic testing not enabled or no active profile - showing all data');
      }

      // Fetch companies with their work items
      // If in synthetic testing mode, only get companies from work_items linked to profile sources
      let companiesQuery = supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id);
      
      // If filtering by profile, we need to get companies via work_items with matching source_id
      if (profileSourceIds.length > 0) {
        console.log(`[WorkHistory] Filtering work_items by ${profileSourceIds.length} source IDs...`);
        // First get work_items for this profile
        const { data: profileWorkItems, error: workItemsFilterError } = await supabase
          .from('work_items')
          .select('company_id, source_id, title')
          .eq('user_id', user.id)
          .in('source_id', profileSourceIds);
        
        if (workItemsFilterError) {
          console.error('[WorkHistory] Error filtering work_items by source_id:', workItemsFilterError);
        }
        
        console.log(`[WorkHistory] Found ${profileWorkItems?.length || 0} work_items with matching source_id`);
        
        if (profileWorkItems && profileWorkItems.length > 0) {
          const companyIds = [...new Set(profileWorkItems.map(wi => wi.company_id))];
          console.log(`[WorkHistory] Filtering companies to ${companyIds.length} companies:`, companyIds.map(id => id.substring(0, 8) + '...'));
          console.log(`[WorkHistory] Sample work_items:`, profileWorkItems.slice(0, 3).map(wi => ({ title: wi.title, company_id: wi.company_id?.substring(0, 8) + '...', source_id: wi.source_id?.substring(0, 8) + '...' })));
          companiesQuery = companiesQuery.in('id', companyIds);
        } else {
          // Check if there are ANY work_items for this user (to see if filtering is too strict)
          const { data: allWorkItems } = await supabase
            .from('work_items')
            .select('id, source_id, title')
            .eq('user_id', user.id)
            .limit(10);
          
          const withSourceId = allWorkItems?.filter(wi => wi.source_id).length || 0;
          const withoutSourceId = (allWorkItems?.length || 0) - withSourceId;
          
          console.warn(`[WorkHistory] No work_items found for profile ${syntheticContext.currentUser?.profileId}`);
          console.warn(`[WorkHistory] Debug: ${withSourceId} work_items have source_id, ${withoutSourceId} don't`);
          console.warn(`[WorkHistory] Looking for source IDs:`, profileSourceIds);
          console.warn(`[WorkHistory] All work_items sample:`, allWorkItems?.map(wi => ({ id: wi.id, title: wi.title, source_id: wi.source_id })));
          
          // CRITICAL: Don't fallback to showing other profiles' data
          // If this profile has no data, show empty state
          console.warn(`[WorkHistory] Profile ${syntheticContext.currentUser?.profileId} has no data - showing empty state`);
          setWorkHistory([]);
          setIsLoading(false);
          return;
        }
      }
      
      // Sort companies by most recent work_item start_date (current to past)
      // We'll sort after fetching work_items
      const { data: companies, error: companiesError } = await companiesQuery;

      if (companiesError) throw companiesError;

      if (!companies || companies.length === 0) {
        console.log('No companies found in database - showing empty state');
        setWorkHistory([]);
        setIsLoading(false);
        return;
      }

      // Fetch work items - filter by profile sources if in synthetic testing mode
      let workItemsQuery = supabase
        .from('work_items')
        .select('*')
        .eq('user_id', user.id);
      
      if (profileSourceIds.length > 0) {
        workItemsQuery = workItemsQuery.in('source_id', profileSourceIds);
      }
      
      // Sort work items: current first (end_date null), then by start_date descending
      // This ensures current positions appear first, then most recent to oldest
      const { data: workItems, error: workItemsError } = await workItemsQuery;

      if (workItemsError) throw workItemsError;

      // Get work item IDs for filtering blurbs and links (already filtered by profile if applicable)
      const workItemIds = workItems?.map(wi => wi.id) || [];
      
      // Fetch approved content (blurbs) - only stories linked to work items
      // Stories MUST be associated with work_items - no orphan stories
      let blurbsQuery = supabase
        .from('stories')
        .select('*')
        .eq('user_id', user.id);
      
      if (workItemIds.length > 0) {
        blurbsQuery = blurbsQuery.in('work_item_id', workItemIds);
      } else {
        // If no work items, no stories to show
        blurbsQuery = blurbsQuery.is('work_item_id', null); // This will return empty
      }
      
      const { data: blurbs, error: blurbsError } = await blurbsQuery
        .order('created_at', { ascending: false });

      if (blurbsError) throw blurbsError;

      // Fetch external links - filter by work items if available
      let linksQuery = supabase
        .from('external_links')
        .select('*')
        .eq('user_id', user.id);
      
      if (workItemIds.length > 0) {
        linksQuery = linksQuery.in('work_item_id', workItemIds);
      }
      
      const { data: links, error: linksError } = await linksQuery
        .order('created_at', { ascending: false });

      if (linksError) throw linksError;

      // Phase 3: Fetch gaps for work items and stories (scoped by synthetic profile when active)
      const { GapDetectionService } = await import('../services/gapDetectionService');
      const userGaps = user.id 
        ? await GapDetectionService.getUserGaps(user.id, currentProfileId)
        : [];
      
      // Create maps for efficient lookup
      const workItemGapMap = new Map<string, number>(); // work_item_id -> gap count
      const workItemGapsMap = new Map<string, Array<{ id: string; description: string }>>(); // work_item_id -> gap objects
      const storyGapMap = new Map<string, number>(); // approved_content_id -> gap count
      const storyGapsMap = new Map<string, Array<{ id: string; description: string }>>(); // approved_content_id -> gap objects
      
      userGaps.forEach(gap => {
        if (gap.entity_type === 'work_item') {
          const current = workItemGapMap.get(gap.entity_id) || 0;
          workItemGapMap.set(gap.entity_id, current + 1);
          
          // Store actual gap objects with gap_category for filtering
          const existingGaps = workItemGapsMap.get(gap.entity_id) || [];
          workItemGapsMap.set(gap.entity_id, [
            ...existingGaps,
            {
              id: gap.id || '',
              description: gap.description || gap.gap_category || 'Content needs improvement',
              gap_category: (gap as any).gap_category || ''
            }
          ]);
        } else if (gap.entity_type === 'approved_content') {
          const current = storyGapMap.get(gap.entity_id) || 0;
          storyGapMap.set(gap.entity_id, current + 1);
          
          // Store actual gap objects
          const existingGaps = storyGapsMap.get(gap.entity_id) || [];
          storyGapsMap.set(gap.entity_id, [
            ...existingGaps,
            {
              id: gap.id || '',
              description: gap.description || gap.gap_category || 'Content needs improvement',
              gap_category: (gap as any).gap_category || ''
            }
          ]);
        }
      });
      
      console.log('[WorkHistory] Loaded gaps:', {
        total: userGaps.length,
        workItemGaps: Array.from(workItemGapMap.entries()).length,
        storyGaps: Array.from(storyGapMap.entries()).length
      });

      // Sort work items: current first (end_date null), then by start_date descending (current to past)
      const sortedWorkItems = (workItems || []).sort((a: any, b: any) => {
        // Current positions (end_date null) come first
        if (!a.end_date && b.end_date) return -1;
        if (a.end_date && !b.end_date) return 1;
        // Then sort by start_date descending (most recent first)
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      });

      // Sort companies by most recent work_item start_date (current to past)
      const sortedCompanies = (companies || []).sort((a: any, b: any) => {
        const aWorkItems = sortedWorkItems.filter((wi: any) => wi.company_id === a.id);
        const bWorkItems = sortedWorkItems.filter((wi: any) => wi.company_id === b.id);
        
        if (aWorkItems.length === 0 && bWorkItems.length === 0) return 0;
        if (aWorkItems.length === 0) return 1;
        if (bWorkItems.length === 0) return -1;
        
        // Compare by most recent work item's start_date
        const aMostRecent = aWorkItems[0]; // Already sorted
        const bMostRecent = bWorkItems[0];
        
        // Current positions first
        if (!aMostRecent.end_date && bMostRecent.end_date) return -1;
        if (aMostRecent.end_date && !bMostRecent.end_date) return 1;
        
        // Then by start_date descending
        return new Date(bMostRecent.start_date).getTime() - new Date(aMostRecent.start_date).getTime();
      });

      // Transform database data to WorkHistoryCompany format
      const transformedData: WorkHistoryCompany[] = sortedCompanies.map((company: any) => {
        // Get work items for this company (already sorted)
        const companyWorkItems = sortedWorkItems.filter((item: any) => item.company_id === company.id);

        // Sort roles within company: current first, then by start_date descending
        const sortedCompanyRoles = [...companyWorkItems].sort((a: any, b: any) => {
          if (!a.end_date && b.end_date) return -1;
          if (a.end_date && !b.end_date) return 1;
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        });

        // Transform work items to roles
        const roles: WorkHistoryRole[] = sortedCompanyRoles.map((item: any) => {
          // Get blurbs for this work item
          const itemBlurbs = blurbs?.filter((blurb: any) => blurb.work_item_id === item.id) || [];
          
          // Transform blurbs
          const transformedBlurbs: WorkHistoryBlurb[] = itemBlurbs.map((blurb: any) => {
            const storyGapCount = storyGapMap.get(blurb.id) || 0;
            const storyGaps = storyGapsMap.get(blurb.id) || [];
            return {
              id: blurb.id,
              roleId: blurb.work_item_id,
              title: blurb.title,
              content: blurb.content,
              outcomeMetrics: [], // Can be extracted from content if needed
              tags: blurb.tags || [],
              source: 'manual' as const, // Changed from 'database' to valid type
              status: blurb.status as 'draft' | 'approved' | 'needs-review',
              confidence: blurb.confidence as 'low' | 'medium' | 'high',
              timesUsed: blurb.times_used || 0,
              lastUsed: blurb.last_used || undefined,
              linkedExternalLinks: [], // Can be populated if needed
              hasGaps: storyGapCount > 0,
              gapCount: storyGapCount,
              gaps: storyGaps, // Store actual gap objects
              variations: [],
              createdAt: blurb.created_at,
              updatedAt: blurb.updated_at
            };
          });

          // Get external links for this work item
          const itemLinks = links?.filter((link: any) => link.work_item_id === item.id) || [];
          
          // Transform external links
          const transformedLinks: ExternalLink[] = itemLinks.map((link: any) => ({
            id: link.id,
            roleId: link.work_item_id,
            url: link.url,
            label: link.label,
            type: 'other' as const, // Default type
            tags: link.tags || [],
            timesUsed: link.times_used || 0,
            lastUsed: link.last_used || undefined,
            createdAt: link.created_at
          }));

          // Calculate gap count for role: count content items with gaps (not individual gaps)
          // Role-level: treat role description and role metrics as two distinct content items
          const workItemGaps = (workItemGapsMap.get(item.id) || []) as Array<{ id: string; description: string; gap_category?: string }>;
          const hasRoleDescriptionItem = workItemGaps.some(g => g.gap_category === 'missing_role_description' || g.gap_category === 'generic_role_description');
          const hasRoleMetricsItem = workItemGaps.some(g => g.gap_category === 'missing_role_metrics' || g.gap_category === 'insufficient_role_metrics');
          const roleLevelItems = (hasRoleDescriptionItem ? 1 : 0) + (hasRoleMetricsItem ? 1 : 0);

          // Stories: count stories with at least one gap as one content item each
          const storiesWithGaps = transformedBlurbs.filter(blurb => (blurb.gapCount || 0) > 0).length;
          
          // Total items with gaps for badges = role-level items + story items
          const contentItemsWithGaps = roleLevelItems + storiesWithGaps;

          // Normalize metadata in role description into tags
          let roleDescription = item.description || '';
          const roleTags: string[] = [...(item.tags || [])];
          company.tags = company.tags || [];
          const companyTags: string[] = [...company.tags];
          if (roleDescription) {
            const parts = roleDescription.split('|').map((p: string) => p.trim()).filter(Boolean);
            const residual: string[] = [];
            parts.forEach((p) => {
              const lower = p.toLowerCase();
              if (lower.startsWith('role:')) {
                roleTags.push(p.replace(/role:\s*/i, '').trim());
                return;
              }
              if (lower.startsWith('specialty:')) {
                roleTags.push(p.replace(/specialty:\s*/i, '').trim());
                return;
              }
              if (lower.startsWith('industry:')) {
                companyTags.push(p.replace(/industry:\s*/i, '').trim());
                return;
              }
              if (lower.startsWith('company size:')) {
                companyTags.push(p.replace(/company size:\s*/i, '').trim());
                return;
              }
              residual.push(p);
            });
            roleDescription = residual.join(' | ').trim();
          }

          return {
            id: item.id,
            companyId: company.id,
            title: item.title,
            type: 'full-time' as const, // Default type
            startDate: item.start_date,
            endDate: item.end_date || undefined,
            description: roleDescription || '',
            inferredLevel: '', // Can be calculated if needed
            tags: Array.from(new Set(roleTags)),
            outcomeMetrics: item.achievements || [],
            blurbs: transformedBlurbs,
            gaps: workItemGaps, // Store actual gap objects for role
            externalLinks: transformedLinks,
            hasGaps: contentItemsWithGaps > 0,
            gapCount: contentItemsWithGaps,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          };
        });

        return {
          id: company.id,
          name: company.name,
          description: company.description || '',
          tags: Array.from(new Set(companyTags)),
          source: 'manual' as const, // Changed from 'database' to valid type
          createdAt: company.created_at,
          updatedAt: company.updated_at,
          roles
        };
      });

      console.log('Fetched work history:', transformedData);
      setWorkHistory(transformedData);
    } catch (err) {
      console.error('Error fetching work history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load work history');
      setWorkHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isTourActive]);

  // Fetch data on mount and when user changes
  useEffect(() => {
    fetchWorkHistory();
  }, [fetchWorkHistory]);
  
  // Auto-select most recent role on page load (no unselected state)
  // Find the most recent role across all companies (current roles first, then by start_date descending)
  const findMostRecentRole = (companies: WorkHistoryCompany[]): { company: WorkHistoryCompany; role: WorkHistoryRole } | null => {
    let mostRecent: { company: WorkHistoryCompany; role: WorkHistoryRole; date: Date } | null = null;
    
    companies.forEach(company => {
      company.roles.forEach(role => {
        const roleDate = role.endDate ? new Date(role.endDate) : new Date('9999-12-31'); // Current roles get future date
        if (!mostRecent || roleDate > mostRecent.date || (!role.endDate && mostRecent.role.endDate)) {
          mostRecent = { company, role, date: roleDate };
        }
      });
    });
    
    return mostRecent ? { company: mostRecent.company, role: mostRecent.role } : null;
  };
  
  const mostRecent = workHistory.length > 0 ? findMostRecentRole(workHistory) : null;
  const initialCompany = mostRecent?.company || (workHistory.length > 0 ? workHistory[0] : null);
  const initialRole = mostRecent?.role || initialCompany?.roles[0] || null;
  
  const [selectedCompany, setSelectedCompany] = useState<WorkHistoryCompany | null>(initialCompany);
  const [selectedRole, setSelectedRole] = useState<WorkHistoryRole | null>(initialRole);
  const [selectedDataSource, setSelectedDataSource] = useState<'work-history' | 'linkedin' | 'resume'>('work-history');
  
  // Track which company should be expanded in the accordion
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(initialCompany?.id || null);

  // Modal state
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<WorkHistoryCompany | null>(null);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<WorkHistoryRole | null>(null);
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<WorkHistoryBlurb | null>(null);
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Update selected items when work history data changes - always select most recent role
  useEffect(() => {
    if (workHistory.length > 0) {
      const mostRecent = findMostRecentRole(workHistory);
      if (mostRecent) {
        setSelectedCompany(mostRecent.company);
        setSelectedRole(mostRecent.role);
        setExpandedCompanyId(mostRecent.company.id);
      }
    }
  }, [workHistory]);

  // Handle URL parameters for initial navigation
  const [initialTab, setInitialTab] = useState<'role' | 'stories' | 'links'>('role');
  
  // Gap resolution state - tracks which gaps have been resolved
  const [resolvedGaps, setResolvedGaps] = useState<Set<string>>(new Set());
  
  // Auto-advance through tabs during tour
  useEffect(() => {
    if (isTourActive && workHistory.length > 0) {
      // Start on role tab, then auto-advance
      const ENABLE_EXTERNAL_LINKS = isExternalLinksEnabled();
      const tabs: ('role' | 'stories' | 'links')[] = ENABLE_EXTERNAL_LINKS 
        ? ['role', 'stories', 'links']
        : ['role', 'stories'];
      let currentTabIndex = 0;
      
      const advanceTab = () => {
        if (currentTabIndex < tabs.length) {
          setInitialTab(tabs[currentTabIndex]);
          currentTabIndex++;
          
          if (currentTabIndex < tabs.length) {
            setTimeout(advanceTab, 3000); // 3 second delay
          }
        }
      };
      
      // Start with role tab, then auto-advance after 3 seconds
      const timer = setTimeout(advanceTab, 3000);
      
      // Cleanup timer on unmount or dependency change
      return () => clearTimeout(timer);
    }
  }, [isTourActive, workHistory.length]);
  
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    const storyIdParam = searchParams.get('storyId');
    
    if (tabParam === 'stories' && workHistory.length > 0) {
      // If roleId is present, the role deep-link effect will select the right role.
      // Otherwise default to first role for stories view.
      const firstCompany = workHistory[0];
      const firstRole = firstCompany.roles[0];
      if (firstRole && !searchParams.get('roleId')) {
        setSelectedCompany(firstCompany);
        setSelectedRole(firstRole);
        setExpandedCompanyId(firstCompany.id);
      }
      setInitialTab('stories');

      // Scroll to specific story if provided
      if (storyIdParam) {
        const scrollWithOffset = (el: HTMLElement, offset = 160) => {
          const y = el.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        };
        setTimeout(() => {
          const el = document.getElementById(`story-${storyIdParam}`);
          if (el) scrollWithOffset(el);
        }, 350);
      }
    }
  }, [workHistory]);

  // Deep link: select role and company based on roleId param
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const roleIdParam = searchParams.get('roleId');
    const tabParam = searchParams.get('tab');
    const sectionParam = searchParams.get('section');
    if (!roleIdParam || workHistory.length === 0) return;

    // Find company and role by id
    let foundCompany: WorkHistoryCompany | null = null;
    let foundRole: WorkHistoryRole | null = null;
    for (const company of workHistory) {
      const role = company.roles.find(r => r.id === roleIdParam);
      if (role) {
        foundCompany = company;
        foundRole = role;
        break;
      }
    }

    if (foundRole && foundCompany) {
      setSelectedCompany(foundCompany);
      setSelectedRole(foundRole);
      setExpandedCompanyId(foundCompany.id);
      setSelectedDataSource('work-history');
      // Only force role tab if no explicit tab requested (prevents overriding Stories deep-link)
      if (!tabParam) setInitialTab('role');

      // After selecting role, optionally scroll to a section (e.g., metrics)
      if (sectionParam === 'metrics') {
        setTimeout(() => {
          const el = document.getElementById('role-metrics');
          if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 160;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }, 350);
      }
    }
  }, [workHistory]);

  const handleCompanySelect = (company: WorkHistoryCompany) => {
    setSelectedCompany(company);
    setExpandedCompanyId(company.id);
    setSelectedDataSource('work-history'); // Reset to work history view
    
    // Auto-advance to role detail if company has only one role
    if (company.roles.length === 1) {
      setSelectedRole(company.roles[0]);
    } else {
      setSelectedRole(null);
    }
  };

  const handleRoleSelect = (role: WorkHistoryRole) => {
    // Find the parent company for this role
    const parentCompany = workHistory.find(company => 
      company.roles.some(r => r.id === role.id)
    );
    
    if (parentCompany) {
      setSelectedCompany(parentCompany);
      setSelectedRole(role);
      setExpandedCompanyId(parentCompany.id);
      setSelectedDataSource('work-history'); // Reset to work history view
    }
  };

  // Modal handlers
  const handleCompanyChanged = () => {
    // Refresh data and close modal
    fetchWorkHistory();
    setIsAddCompanyModalOpen(false);
    setEditingCompany(null);
  };

  const handleCompanyDeleted = () => {
    // Clear selection and refresh
    setSelectedCompany(null);
    setSelectedRole(null);
    fetchWorkHistory();
    setIsAddCompanyModalOpen(false);
    setEditingCompany(null);
  };

  const handleEditCompany = (company: WorkHistoryCompany) => {
    setEditingCompany(company);
    setIsAddCompanyModalOpen(true);
  };

  const handleRoleChanged = () => {
    // Refresh data and close modal
    fetchWorkHistory();
    setIsAddRoleModalOpen(false);
    setEditingRole(null);
  };

  const handleRoleDeleted = () => {
    // Clear role selection and refresh
    setSelectedRole(null);
    fetchWorkHistory();
    setIsAddRoleModalOpen(false);
    setEditingRole(null);
  };

  const handleEditRole = (role: WorkHistoryRole) => {
    setEditingRole(role);
    setIsAddRoleModalOpen(true);
  };

  const handleAddStory = () => {
    setIsAddStoryModalOpen(true);
  };

  const handleEditStory = (story: WorkHistoryBlurb) => {
    setEditingStory(story);
    setIsAddStoryModalOpen(true);
  };

  const handleStoryChanged = () => {
    // Refresh data and close modal
    fetchWorkHistory();
    setIsAddStoryModalOpen(false);
    setEditingStory(null);
  };

  const handleStoryDeleted = () => {
    fetchWorkHistory();
    setIsAddStoryModalOpen(false);
    setEditingStory(null);
  };

  const handleAddLink = () => {
    setIsAddLinkModalOpen(true);
  };

  const handleEditLink = (link: any) => {
    setEditingLink(link);
    setIsAddLinkModalOpen(true);
  };

  const handleSaveContent = (content: any) => {
    if (content.type === 'story') {
      // Legacy callback - refresh data
      fetchWorkHistory();
    } else if (content.type === 'link') {
      // TODO: Implement link saving logic
      console.log("Link saved:", content);
    }
    setIsAddStoryModalOpen(false);
    setEditingStory(null);
  };

  // Data source handlers (for existing user state)
  const handleConnectLinkedIn = () => {
    // TODO: Implement LinkedIn OAuth flow
    console.log("Connect LinkedIn");
  };

  const handleUploadResume = () => {
    if (!user) {
      console.error('No user found');
      toast.error('Authentication required', {
        description: 'You must be logged in to upload a resume'
      });
      return;
    }
    
    console.log('📤 Opening file picker for resume upload...');
    
    // Create a hidden file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.txt,.md';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (!file) {
        console.log('No file selected');
        return;
      }
      
      console.log(`📄 File selected: ${file.name} (${file.size} bytes, type: ${file.type})`);
      
      try {
        // Validate file
        if (file.size > 5 * 1024 * 1024) {
          toast.error('File too large', {
            description: 'File must be less than 5MB'
          });
          return;
        }
        
        toast.loading('Uploading resume...', { id: 'resume-upload' });
        
        setIsUploading(true);
        setIsLoading(true);
        
        // Use the file upload service directly
        console.log(`🚀 Starting upload for user ${user.id}...`);
        const uploadService = new FileUploadService();
        
        // Get session token
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        
        const result = await uploadService.uploadFile(file, user.id, 'resume' as FileType, accessToken);
        
        console.log('✅ Upload result:', result);
        
        if (result.success) {
          console.log('Refreshing work history...');
          toast.dismiss('resume-upload');
          await fetchWorkHistory();
          toast.success('Resume uploaded successfully!', {
            description: 'Your work history has been updated.'
          });
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (error) {
        console.error('❌ Error in upload handler:', error);
        toast.dismiss('resume-upload');
        toast.error('Upload failed', {
          description: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setIsUploading(false);
        setIsLoading(false);
      }
    };
    
    input.click();
  };

  const handleViewLinkedInProfile = () => {
    // TODO: Open LinkedIn profile view
    console.log("View LinkedIn profile");
  };

  const handleViewResume = () => {
    // TODO: Open resume viewer with replace option
    console.log("View resume");
  };

  const handleLinkedInClick = () => {
    setSelectedDataSource('linkedin');
    setSelectedCompany(null);
    setSelectedRole(null);
  };

  const handleResumeClick = () => {
    setSelectedDataSource('resume');
    setSelectedCompany(null);
    setSelectedRole(null);
  };

  const hasWorkHistory = workHistory.length > 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your work history...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-destructive font-medium">Error loading work history</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchWorkHistory}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className={`container mx-auto px-4 pb-32 ${isTourActive ? 'pt-24' : ''}`}>
        <div>
          <p className="text-muted-foreground description-spacing">Summarize impact with metrics, stories and links</p>
        </div>

        {hasWorkHistory ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mobile Drawer */}
            <WorkHistoryDrawer
              isOpen={isDrawerOpen}
              onOpenChange={setIsDrawerOpen}
              companies={workHistory}
              selectedCompany={selectedCompany}
              selectedRole={selectedRole}
              expandedCompanyId={expandedCompanyId}
              onCompanySelect={handleCompanySelect}
              onRoleSelect={handleRoleSelect}
              onAddCompany={() => setIsAddCompanyModalOpen(true)}
              onAddRole={() => setIsAddRoleModalOpen(true)}
            />
            
            {/* Master Panel - Desktop */}
            <div className="hidden lg:block lg:col-span-1">
              <WorkHistoryMaster
                companies={workHistory}
                selectedCompany={selectedCompany}
                selectedRole={selectedRole}
                expandedCompanyId={expandedCompanyId}
                resolvedGaps={resolvedGaps}
                onCompanySelect={handleCompanySelect}
                onRoleSelect={handleRoleSelect}
                onAddRole={() => setIsAddRoleModalOpen(true)}
                onAddCompany={() => setIsAddCompanyModalOpen(true)}
                onConnectLinkedIn={handleConnectLinkedIn}
                onUploadResume={handleUploadResume}
                onLinkedInClick={handleLinkedInClick}
                onResumeClick={handleResumeClick}
                selectedDataSource={selectedDataSource}
              />
            </div>
            
            {/* Detail Panel */}
            <div className="lg:col-span-2">
              <WorkHistoryDetail
                selectedCompany={selectedCompany}
                selectedRole={selectedRole}
                companies={workHistory}
                initialTab={initialTab}
                resolvedGaps={resolvedGaps}
                onResolvedGapsChange={setResolvedGaps}
                onRoleSelect={handleRoleSelect}
                onAddRole={() => setIsAddRoleModalOpen(true)}
                onEditRole={handleEditRole}
                onAddStory={handleAddStory}
                onEditStory={handleEditStory}
                onAddLink={handleAddLink}
                onEditLink={handleEditLink}
                onEditCompany={handleEditCompany}
                onDeleteStory={handleStoryDeleted}
                selectedDataSource={selectedDataSource}
                onRefresh={fetchWorkHistory}
                onUploadResume={handleUploadResume}
              />
            </div>
          </div>
        ) : (
          <div>
            {!isTourActive ? (
              <WorkHistoryEmptyState />
            ) : (
              <WorkHistoryOnboarding
                onConnectLinkedIn={handleConnectLinkedIn}
                onUploadResume={handleUploadResume}
              />
            )}
          </div>
        )}

        {/* Mobile FAB */}
        <WorkHistoryFAB
          selectedCompany={selectedCompany}
          selectedRole={selectedRole}
          onAddCompany={() => setIsAddCompanyModalOpen(true)}
          onAddRole={() => setIsAddRoleModalOpen(true)}
          onAddStory={handleAddStory}
          onAddLink={handleAddLink}
        />

        {/* Modals */}
        <AddCompanyModal
          open={isAddCompanyModalOpen}
          onOpenChange={(open) => {
            setIsAddCompanyModalOpen(open);
            if (!open) setEditingCompany(null);
          }}
          onCompanyAdded={handleCompanyChanged}
          onCompanyDeleted={handleCompanyDeleted}
          editingCompany={editingCompany}
        />
        
        <AddRoleModal
          open={isAddRoleModalOpen}
          onOpenChange={(open) => {
            setIsAddRoleModalOpen(open);
            if (!open) setEditingRole(null);
          }}
          company={selectedCompany}
          onRoleAdded={handleRoleChanged}
          onRoleDeleted={handleRoleDeleted}
          editingRole={editingRole}
        />

        <AddStoryModal
          open={isAddStoryModalOpen}
          onOpenChange={(open) => {
            setIsAddStoryModalOpen(open);
            if (!open) setEditingStory(null);
          }}
          roleId={selectedRole?.id || ''}
          workItemId={selectedRole?.workItemIds?.[0]}
          onSave={handleSaveContent}
          onStoryAdded={handleStoryChanged}
          onStoryDeleted={handleStoryDeleted}
          existingLinks={selectedRole?.externalLinks || []}
          editingStory={editingStory}
        />

        <AddLinkModal
          open={isAddLinkModalOpen}
          onOpenChange={(open) => {
            setIsAddLinkModalOpen(open);
            if (!open) setEditingLink(null);
          }}
          roleId={selectedRole?.id || ''}
          onSave={handleSaveContent}
          editingLink={editingLink}
        />
      </main>

      {/* Tour Banner */}
      {isTourActive && currentTourStep && (
        <TourBannerFull
          currentStep={tourStep}
          totalSteps={tourSteps.length}
          title={currentTourStep.title}
          description={currentTourStep.description}
          onNext={nextStep}
          onPrevious={previousStep}
          onCancel={cancelTour}
          canGoNext={tourStep < tourSteps.length - 1}
          canGoPrevious={tourStep > 0}
          isLastStep={tourStep === tourSteps.length - 1}
        />
      )}
    </div>
  );
}
