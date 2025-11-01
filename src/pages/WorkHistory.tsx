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
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { WorkHistoryCompany, WorkHistoryRole, WorkHistoryBlurb, ExternalLink } from "@/types/workHistory";

// REMOVED: Sample data - now using empty states instead
// Sample data has been moved to usability-test branch for future reference
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

export default function WorkHistory() {
  // Auth context
  const { user } = useAuth();
  
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
      
      // Tour mode: Handle separately - for now show empty state
      // In production, tour should use real data or empty states
      if (isTourActive && !syntheticContext.isSyntheticTestingEnabled) {
        console.log('Tour mode active - showing empty state');
        setWorkHistory([]);
        setIsLoading(false);
        return;
      }
      
      console.log('[WorkHistory] Synthetic context:', {
        enabled: syntheticContext.isSyntheticTestingEnabled,
        currentProfile: syntheticContext.currentUser?.profileId,
        profileName: syntheticContext.currentUser?.profileName
      });
      
      // Store current profile ID to detect changes
      const currentProfileId = syntheticContext.currentUser?.profileId;
      
      let profileSourceIds: string[] = [];
      if (syntheticContext.isSyntheticTestingEnabled && syntheticContext.currentUser) {
        // Get all sources for this profile (file_name starts with profile_id like P01_)
        const profileId = syntheticContext.currentUser.profileId;
        console.log(`[WorkHistory] Looking for sources matching profile ${profileId}...`);
        
        const { data: profileSources, error: sourcesError } = await supabase
          .from('sources')
          .select('id, file_name, file_type, created_at')
          .eq('user_id', user.id)
          .like('file_name', `${profileId}_%`)
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
        .from('approved_content')
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
          const transformedBlurbs: WorkHistoryBlurb[] = itemBlurbs.map((blurb: any) => ({
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
            hasGaps: false, // Can be calculated if needed
            gapCount: 0,
            variations: [],
            createdAt: blurb.created_at,
            updatedAt: blurb.updated_at
          }));

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

          return {
            id: item.id,
            companyId: company.id,
            title: item.title,
            type: 'full-time' as const, // Default type
            startDate: item.start_date,
            endDate: item.end_date || undefined,
            description: item.description || '',
            inferredLevel: '', // Can be calculated if needed
            tags: item.tags || [],
            outcomeMetrics: item.achievements || [],
            blurbs: transformedBlurbs,
            externalLinks: transformedLinks,
            hasGaps: false, // Can be calculated if needed
            gapCount: 0,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          };
        });

        return {
          id: company.id,
          name: company.name,
          description: company.description || '',
          tags: company.tags || [],
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
      const tabs: ('role' | 'stories' | 'links')[] = ['role', 'stories', 'links'];
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
    
    if (tabParam === 'stories' && workHistory.length > 0) {
      const firstCompany = workHistory[0];
      const firstRole = firstCompany.roles[0];
      
      if (firstRole) {
        setSelectedCompany(firstCompany);
        setSelectedRole(firstRole);
        setExpandedCompanyId(firstCompany.id);
        setInitialTab('stories');
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
  const handleAddCompany = () => {
    // TODO: Implement actual company creation logic
    console.log("Company added successfully");
    setIsAddCompanyModalOpen(false);
    setEditingCompany(null);
  };

  const handleEditCompany = (company: WorkHistoryCompany) => {
    setEditingCompany(company);
    setIsAddCompanyModalOpen(true);
  };

  const handleAddRole = () => {
    // TODO: Implement actual role creation logic
    console.log("Role added successfully");
    setIsAddRoleModalOpen(false);
  };

  const handleAddStory = () => {
    setIsAddStoryModalOpen(true);
  };

  const handleEditStory = (story: WorkHistoryBlurb) => {
    setEditingStory(story);
    setIsAddStoryModalOpen(true);
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
      // TODO: Implement story saving logic
      console.log("Story saved:", content);
    } else if (content.type === 'link') {
      // TODO: Implement link saving logic
      console.log("Link saved:", content);
    }
    setIsAddStoryModalOpen(false);
  };

  // Data source handlers (for existing user state)
  const handleConnectLinkedIn = () => {
    // TODO: Implement LinkedIn OAuth flow
    console.log("Connect LinkedIn");
  };

  const handleUploadResume = () => {
    // TODO: Implement resume upload
    console.log("Upload resume");
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
      <main className={`container mx-auto px-4 pb-8 ${isTourActive ? 'pt-24' : ''}`}>
        <div>
          <p className="text-muted-foreground description-spacing">Summarize impact with metrics, stories and links</p>
        </div>

        {hasWorkHistory ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
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
                onAddStory={handleAddStory}
                onEditStory={handleEditStory}
                onAddLink={handleAddLink}
                onEditLink={handleEditLink}
                onEditCompany={handleEditCompany}
                selectedDataSource={selectedDataSource}
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
          onCompanyAdded={handleAddCompany}
          editingCompany={editingCompany}
        />
        
        <AddRoleModal
          open={isAddRoleModalOpen}
          onOpenChange={setIsAddRoleModalOpen}
          company={selectedCompany}
          onRoleAdded={handleAddRole}
        />

        <AddStoryModal
          open={isAddStoryModalOpen}
          onOpenChange={(open) => {
            setIsAddStoryModalOpen(open);
            if (!open) setEditingStory(null);
          }}
          roleId={selectedRole?.id || ''}
          onSave={handleSaveContent}
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