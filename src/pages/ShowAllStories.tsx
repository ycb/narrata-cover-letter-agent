import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Edit,
  X,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { ShowAllTemplate, FilterOption, SortOption } from "@/components/shared/ShowAllTemplate";
import { Story } from "@/types/workHistory";
import { AddStoryModal } from "@/components/work-history/AddStoryModal";
import { ContentCard } from "@/components/shared/ContentCard";
import { OutcomeMetrics } from "@/components/work-history/OutcomeMetrics";
import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";
import { ContentGenerationModalV3Baseline } from "@/components/hil/ContentGenerationModalV3Baseline";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { StoriesEmptyState } from "@/components/work-history/EmptyStates";
import { isHilV3Enabled } from "@/utils/featureFlags";

// REMOVED: Mock data - now using empty states instead
// Mock data has been moved to usability-test branch for future reference

export default function ShowAllStories() {
  const { user, isDemo } = useAuth();
  const hilV3BaselineOn = isHilV3Enabled();
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [storyGapsMap, setStoryGapsMap] = useState<Map<string, boolean>>(new Map());
  const [viewingStoryGaps, setViewingStoryGaps] = useState<Array<{ id: string; description: string }>>([]);
  const [resolvedGaps, setResolvedGaps] = useState<Set<string>>(new Set());
  const [fullStoryContent, setFullStoryContent] = useState<string>('');
  const [fullStoryMetrics, setFullStoryMetrics] = useState<any[]>([]);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [selectedGap, setSelectedGap] = useState<any>(null);

  // Fetch stories from database
  const fetchStories = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let activeProfileId: string | undefined;
      try {
        const { SyntheticUserService } = await import("../services/syntheticUserService");
        const syntheticUserService = new SyntheticUserService();
        const syntheticContext = await syntheticUserService.getSyntheticUserContext();
        if (syntheticContext.isSyntheticTestingEnabled) {
          activeProfileId = syntheticContext.currentUser?.profileId ?? undefined;
        }
      } catch (syntheticError) {
        console.warn('[ShowAllStories] Unable to load synthetic user context:', syntheticError);
      }

      // Fetch approved content (stories/blurbs) with work item and company info
      const { data: blurbs, error: blurbsError } = await supabase
        .from('stories')
        .select(`
          *,
          work_item:work_items!work_item_id (
            title,
            company:companies!company_id (
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (blurbsError) throw blurbsError;

      let filteredBlurbs = (blurbs ?? []) as any[];

      if (activeProfileId) {
        const { data: sources, error: sourcesError } = await supabase
          .from('sources')
          .select('id')
          .eq('user_id', user.id)
          .ilike('file_name', `${activeProfileId}_%`);

        if (sourcesError) {
          console.warn('[ShowAllStories] Failed to load sources for profile', activeProfileId, sourcesError);
        } else {
          const sourceIds = (sources ?? []).map((src: any) => src.id);
          if (sourceIds.length === 0) {
            setStories([]);
            setStoryGapsMap(new Map());
            setIsLoading(false);
            return;
          }
          filteredBlurbs = filteredBlurbs.filter((blurb: any) => sourceIds.includes(blurb.source_id));
        }
      }

      // Fetch gaps for stories first (before transforming, so we can add hasGaps property)
      const blurbIds = filteredBlurbs.map((b: any) => b.id);                                                        
      let gapsMap = new Map<string, boolean>();
      
      if (blurbIds.length > 0) {
        const { data: gaps, error: gapsError } = await supabase
          .from('gaps')
          .select('entity_id')
          .eq('user_id', user.id)
          .eq('entity_type', 'approved_content')
          .eq('resolved', false)
          .in('entity_id', blurbIds);

        if (!gapsError && gaps) {
          gaps.forEach(gap => {
            gapsMap.set(gap.entity_id, true);
          });
        }
      }
      
      setStoryGapsMap(gapsMap);

      // Transform to Story format
      const transformedStories: Story[] = filteredBlurbs.map((blurb: any) => {                                      
        const workItem = blurb.work_item || {};
        const company = workItem.company || {};
        const content = (blurb.content || "").trim();
        const previewLimit = 180;
        const preview =
          content.length > previewLimit ? `${content.slice(0, previewLimit).trim()}...` : content;
        
        return {
          id: blurb.id,
          title: blurb.title,
          company: company.name || 'Unknown Company',
          role: workItem.title || 'Unknown Role',
          impact: blurb.confidence as 'high' | 'medium' | 'low' || 'medium',
          metrics: preview,
          date: blurb.created_at,
          tags: blurb.tags || [],
          hasGaps: gapsMap.get(blurb.id) || false
        };
      });

      setStories(transformedStories);
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stories');
      setStories([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Get unique companies, roles, and tags for filtering
  const companies = [...new Set(stories.map(s => s.company))];
  const roles = [...new Set(stories.map(s => s.role))];
  const allTags = stories.flatMap(s => s.tags);
  const tags = [...new Set(allTags)];

  const sortOptions: SortOption[] = [
    // Company options - all companies from Work History
    ...companies.map(company => ({ 
      label: company, 
      value: company, 
      category: 'company' as const 
    })),
    // Role options - all roles from Work History
    ...roles.map(role => ({ 
      label: role, 
      value: role, 
      category: 'role' as const 
    })),
    // Tag options - all tags from Work History
    ...tags.map(tag => ({ 
      label: tag, 
      value: tag, 
      category: 'tag' as const 
    })),
    // Gap filter options
    { label: 'Gap detected', value: 'gap-detected', category: 'gap' as const },
    { label: 'No gaps', value: 'no-gaps', category: 'gap' as const },
    // Other options
    { label: 'Story', value: 'title', category: 'other' as const },
    { label: 'Date', value: 'date', category: 'other' as const }
  ];

  const handleAddNew = () => {
    if (isDemo) return;
    setIsAddStoryModalOpen(true);
  };



  const handleEdit = (story: Story) => {
    if (isDemo) return;
    setEditingStory(story);
    setIsViewModalOpen(false);
    setIsAddStoryModalOpen(true);
  };

  const handleDelete = (story: Story) => {
    if (isDemo) return;
    setStories(stories.filter(s => s.id !== story.id));
  };

  const handleCopy = (story: Story) => {
    // TODO: Implement copy story functionality
    console.log("Copy story:", story.id);
  };

  const handleView = async (story: Story) => {
    setViewingStory(story);
    setIsViewModalOpen(true);
    // Reset gap-related state when viewing a new story
    setViewingStoryGaps([]);
    setSelectedGap(null);
    setIsContentModalOpen(false);
    
      // Fetch full story content and gaps
      if (user && story.id) {
        // Fetch full story from approved_content
        const { data: fullStory, error: storyError } = await supabase
          .from('stories')
          .select('id, title, content, tags, metrics, created_at')
          .eq('id', story.id)
          .single();
        
        if (!storyError && fullStory) {
          setFullStoryContent(fullStory.content || '');
          setFullStoryMetrics(Array.isArray(fullStory.metrics) ? fullStory.metrics : []);
        }
        
        // Fetch gaps for this story (include all fields needed for content generation)
        const { data: gaps, error: gapsError } = await supabase
          .from('gaps')
          .select('id, description, gap_category, gap_type, severity, suggestions')
          .eq('user_id', user.id)
          .eq('entity_type', 'approved_content')
          .eq('entity_id', story.id)
          .eq('resolved', false);
        
        if (!gapsError && gaps) {
          setViewingStoryGaps(gaps.map(g => ({
            id: g.id,
            description: g.description || g.gap_category || 'Content needs improvement',
            gap_category: g.gap_category,
            gap_type: g.gap_type,
            severity: g.severity,
            suggestions: g.suggestions
          })));
        } else {
          setViewingStoryGaps([]);
        }
      }
    };
  
  const handleDismissGap = (gapId: string) => {
    setResolvedGaps(new Set([...resolvedGaps, gapId]));
  };
  
  const handleGenerateContent = async () => {
    if (!viewingStory || viewingStoryGaps.length === 0 || !user) return;
    
    // Use the first gap for content generation
    const firstGap = viewingStoryGaps[0];
    
    // Ensure gap has valid ID
    if (!firstGap.id) return;
    
    // Fetch full gap data from database
      const { data: gapData, error: gapError } = await supabase
        .from('gaps')
        .select('*')
        .eq('id', firstGap.id)
        .single();
      
    // Only open modal if we successfully fetched gap data
    if (gapError || !gapData) {
      console.error('Error fetching gap data:', gapError);
      return;
    }
    
        // Format gap as GapAnalysis object for ContentGenerationModal
        const gapAnalysis = {
          id: gapData.id,
          type: mapGapTypeToModalType(gapData.gap_type),
          severity: gapData.severity as 'high' | 'medium' | 'low',
          description: gapData.description || gapData.gap_category || 'Content needs improvement',
          suggestion: gapData.suggestions && gapData.suggestions.length > 0 
            ? gapData.suggestions[0]?.suggestion || gapData.suggestions[0] || 'Improve content quality'
            : 'Enhance content to address identified issues',
          paragraphId: 'story-content',
          origin: 'ai' as const,
          addresses: gapData.suggestions?.map((s: any) => s?.addressing || s) || [],
          existingContent: fullStoryContent || ''
        };
        
        setSelectedGap(gapAnalysis);
        setIsContentModalOpen(true);
  };

  const mapGapTypeToModalType = (gapType: string): 'core-requirement' | 'preferred-requirement' | 'best-practice' | 'content-enhancement' => {
    switch (gapType) {
      case 'data_quality':
        return 'core-requirement';
      case 'role_expectation':
        return 'preferred-requirement';
      case 'best_practice':
      default:
        return 'best-practice';
    }
  };

  const handleApplyContent = async (content: string) => {
    if (!viewingStory || !user || !selectedGap) return;
    
    // Update the story content in the database
    const { error: updateError } = await supabase
      .from('stories')
      .update({ content })
      .eq('id', viewingStory.id)
      .eq('user_id', user.id);
    
    if (updateError) {
      console.error('Error updating story content:', updateError);
      return;
    }
    
    // Resolve gap in database with 'content_added' reason (not 'user_override')
    // This distinguishes content-generated resolution from manual dismissal
    const gapId = selectedGap.id;
    const isDatabaseId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gapId);
    
    if (isDatabaseId) {
      try {
        const { GapDetectionService } = await import('../services/gapDetectionService');
        // Persist gap resolution with 'content_added' reason
        // Link the updated content to the gap it addresses
        await GapDetectionService.resolveGap(gapId, user.id, 'content_added', viewingStory.id);
      } catch (error) {
        console.error('Error resolving gap after content generation:', error);
        // Continue even if gap resolution fails
      }
    }
    
      // Update local state
      setFullStoryContent(content);
      
    // Refresh stories list (this will also refresh gap counts)
      await fetchStories();
      
      // Close the modal
      setIsContentModalOpen(false);
      setSelectedGap(null);
  };
  
  const handleResolveGap = async (gapId: string) => {
    if (!user) return;
    
    // Mark gap as resolved in database
    const { error } = await supabase
      .from('gaps')
      .update({ resolved: true })
      .eq('id', gapId)
      .eq('user_id', user.id);
    
    if (!error) {
      handleDismissGap(gapId);
      // Refresh gaps for viewing story
      if (viewingStory) {
        await handleView(viewingStory);
      }
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "bg-success text-success-foreground";
      case "medium": return "bg-warning text-warning-foreground";
      case "low": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your stories...</p>
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
            <p className="text-destructive font-medium">Error loading stories</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchStories}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderHeader = (
    handleSort: (field: keyof Story | 'hasGaps') => void, 
    getSortIcon: (field: keyof Story | 'hasGaps') => React.ReactNode
  ) => (
    <tr>
      <th 
        className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors w-12"
        onClick={() => handleSort('hasGaps')}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          {getSortIcon('hasGaps')}
        </div>
      </th>
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors w-[44%]" onClick={() => handleSort('title')}>
        <div className="flex items-center gap-2">
          Story
          {getSortIcon('title')}
        </div>
      </th>
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors w-[22%]" onClick={() => handleSort('company')}>
        <div className="flex items-center gap-2">
          Context
          {getSortIcon('company')}
        </div>
      </th>
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors w-[12%]" onClick={() => handleSort('date')}>
        <div className="flex items-center gap-2">
          Date
          {getSortIcon('date')}
        </div>
      </th>
      <th className="text-left p-4 font-medium text-muted-foreground w-[22%]">Tags</th>
    </tr>
  );

  const renderRow = (story: Story, index: number) => {
    const hasGaps = storyGapsMap.get(story.id) || false;
    return (
      <tr 
        key={story.id} 
        className="border-b hover:bg-primary/10 transition-colors cursor-pointer"
        onClick={() => handleView(story)}
      >
        <td className="p-4">
          {hasGaps && (
            <AlertTriangle className="h-4 w-4 text-warning" />
          )}
        </td>
        <td className="p-4">
          <div className="space-y-1">
            <h4 className="font-medium text-foreground overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {story.title}
            </h4>
            <p className="text-sm text-muted-foreground">{story.metrics}</p>
          </div>
        </td>
        <td className="p-4">
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="text-sm font-medium text-foreground">{story.company}</div>
            <div className="overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {story.role}
            </div>
          </div>
        </td>
        <td className="p-4">
          <div className="text-xs text-muted-foreground">
            {new Date(story.date).toLocaleDateString()}
          </div>
        </td>
        <td className="p-4">
          <div className="flex flex-wrap gap-1">
            {story.tags.slice(0, 2).map((tag, tagIndex) => (
              <Badge key={tagIndex} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {story.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{story.tags.length - 2}
              </Badge>
            )}
          </div>
        </td>
    </tr>
    );
  };

  // Show empty state if no stories at all (not just filtered)
  if (!isLoading && !error && stories.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <StoriesEmptyState onAddStory={isDemo ? undefined : () => setIsAddStoryModalOpen(true)} />
      </div>
    );
  }

  return (
    <>
      <ShowAllTemplate
        title="All Stories"
        description="View and manage all your impact stories across companies and roles"
        data={stories}
        searchPlaceholder="Search stories by title, company, role, or metrics..."
        renderHeader={renderHeader}
        renderRow={renderRow}
        onAddNew={isDemo ? undefined : handleAddNew}
        addNewLabel="Add Story"
        sortOptions={sortOptions}
        searchKeys={["title", "company", "role", "metrics"]}
        emptyStateMessage="No stories found. Create your first story to get started."
      />

      {/* Add Story Modal */}
      {!isDemo && (
        <AddStoryModal
          open={isAddStoryModalOpen}
          onOpenChange={setIsAddStoryModalOpen}
          onSave={(story) => {
            console.log("Story saved:", story);
            setIsAddStoryModalOpen(false);
          }}
          editingStory={editingStory}
          isViewAllContext={true}
          availableCompanies={companies}
          availableRoles={roles}
        />
      )}

      {/* View Story Modal - Using existing StoryCard */}
      {isViewModalOpen && viewingStory && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
          <div className="container mx-auto p-4 h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto bg-background rounded-lg shadow-lg">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Story Details</h2>
                  <div className="flex items-center gap-3">
                    {!isDemo && (
                      <Button onClick={() => handleEdit(viewingStory)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Story
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setIsViewModalOpen(false)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {/* Fetch full story content */}
                {(() => {
                  // For now, use viewingStory data - we can enhance to fetch full content later
                  const hasGaps = viewingStoryGaps.length > 0;
                  const isGapResolved = viewingStoryGaps.every(g => resolvedGaps.has(g.id));
                  
                  return (
                    <ContentCard
                      title={viewingStory.title}
                      content={fullStoryContent || viewingStory.metrics || 'No content available'}
                      tags={viewingStory.tags || []}
                      timesUsed={0}
                      lastUsed={viewingStory.date}
                      hasGaps={hasGaps && !isGapResolved}
                      gaps={viewingStoryGaps}
                      isGapResolved={isGapResolved}
                      onGenerateContent={isDemo ? undefined : handleGenerateContent}
                      onDismissGap={isDemo ? undefined : () => {
                        // Dismiss all gaps for this story
                        viewingStoryGaps.forEach(gap => {
                          handleResolveGap(gap.id);
                        });
                      }}
                      onEdit={isDemo ? undefined : () => handleEdit(viewingStory)}
                      onDuplicate={isDemo ? undefined : () => handleCopy(viewingStory)}
                      onDelete={isDemo ? undefined : () => handleDelete(viewingStory)}
                      tagsLabel="Story Tags"
                    >
                      {/* Outcome Metrics - extract from story.metrics */}
                      {fullStoryMetrics.length > 0 && (
                        <OutcomeMetrics
                          metrics={fullStoryMetrics.map((m: any) => 
                            typeof m === 'string' ? m : `${m.value || ''} ${m.context || ''}`.trim()
                          )}
                          className="mb-6"
                        />
                      )}
                    </ContentCard>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Generation Modal */}
      {!isDemo && (
        hilV3BaselineOn ? (
          <ContentGenerationModalV3Baseline
            isOpen={isContentModalOpen}
            onClose={() => {
              setIsContentModalOpen(false);
              setSelectedGap(null);
            }}
            gap={selectedGap}
            userId={user?.id}
            entityType="approved_content"
            entityId={viewingStory?.id}
            onApplyContent={handleApplyContent}
          />
        ) : (
          <ContentGenerationModal
            isOpen={isContentModalOpen}
            onClose={() => {
              setIsContentModalOpen(false);
              setSelectedGap(null);
            }}
            gap={selectedGap}
            onApplyContent={handleApplyContent}
          />
        )
      )}
    </>
  );
}
