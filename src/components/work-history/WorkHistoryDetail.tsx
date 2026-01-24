import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GrammarInput } from "@/components/ui/grammar-input";
import { TagAutocompleteInput } from "@/components/ui/TagAutocompleteInput";
import { Label } from "@/components/ui/label";
import { GrammarTextarea } from "@/components/ui/grammar-textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { StoryCard } from "@/components/work-history/StoryCard";
import { LinkCard } from "@/components/work-history/LinkCard";
import { OutcomeMetrics } from "@/components/work-history/OutcomeMetrics";
import { cn } from "@/lib/utils";
import { addUserTag, removeUserTag } from "@/lib/userTags";
import { 
  Building2, 
  Calendar, 
  FileText, 
  Plus, 
  Target,
  Tags,
  User,
  MoreHorizontal,
  Edit,
  Copy,
  Files,
  Trash2,
  Link as LinkIcon,
  ChevronRight,
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { ContentGenerationModalV3Baseline } from "@/components/hil/ContentGenerationModalV3Baseline";
import { TagSuggestionModal } from "@/components/hil/TagSuggestionModal";
import { TagSuggestionButton } from "@/components/ui/TagSuggestionButton";
import { ContentGapBanner } from "@/components/shared/ContentGapBanner";
import { generateGapSummary } from "@/utils/gapSummaryGenerator";
import { LinkedInDataSource } from "./LinkedInDataSource";
import { ResumeDataSource } from "./ResumeDataSource";
import { useAuth } from "@/contexts/AuthContext";
import { useUserGoals } from "@/contexts/UserGoalsContext";
import { GapDetectionService, type Gap } from "@/services/gapDetectionService";
import { TagSuggestionService, type TagSuggestion } from "@/services/tagSuggestionService";
import { TagService } from "@/services/tagService";
import { isExternalLinksEnabled, isLinkedInScrapingEnabled } from "@/lib/flags";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { WorkHistoryCompany, WorkHistoryRole, WorkHistoryBlurb } from "@/types/workHistory";
import { useContentGeneration } from "@/hooks/useContentGeneration";
import { supabase } from "@/lib/supabase";
import { SoftDeleteService } from "@/services/softDeleteService";
import type { ContentVariationInsert } from "@/types/variations";

interface WorkHistoryDetailProps {
  selectedCompany: WorkHistoryCompany | null;
  selectedRole: WorkHistoryRole | null;
  companies: WorkHistoryCompany[]; // Add companies to find role's company
  initialTab?: 'role' | 'stories' | 'links'; // uncontrolled fallback
  activeTab?: 'role' | 'stories' | 'links'; // controlled
  onTabChange?: (tab: 'role' | 'stories' | 'links') => void;
  resolvedGaps: Set<string>;
  onResolvedGapsChange: (gaps: Set<string>) => void;
  onRoleSelect?: (role: WorkHistoryRole) => void;
  onAddRole?: () => void;
  onEditRole?: (role: WorkHistoryRole) => void;
  onAddStory?: () => void;
  onAddLink?: () => void;
  onEditCompany?: (company: WorkHistoryCompany) => void;
  onEditStory?: (story: WorkHistoryBlurb) => void;
  onEditLink?: (link: any) => void;
  onDuplicateStory?: (story: WorkHistoryBlurb) => void;
  selectedDataSource?: 'work-history' | 'linkedin' | 'resume';
  onDeleteStory?: (story: WorkHistoryBlurb) => void;
  onRefresh?: () => void; // Callback to refresh parent data after gap resolution
  onUploadResume?: () => void; // Callback for resume upload
}

type DetailView = 'role' | 'stories' | 'links';

export const WorkHistoryDetail = ({ 
  selectedCompany, 
  selectedRole,
  companies,
  initialTab = 'role',
  activeTab,
  onTabChange,
  resolvedGaps,
  onResolvedGapsChange,
  onRoleSelect,
  onAddRole,
  onEditRole,
  onAddStory,
  onAddLink,
  onEditCompany,
  onEditStory,
  onEditLink,
  onDuplicateStory,
  onDeleteStory,
  selectedDataSource = 'work-history',
  onRefresh,
  onUploadResume,
}: WorkHistoryDetailProps) => {
  const { user } = useAuth();
  const { goals } = useUserGoals();
  const ENABLE_EXTERNAL_LINKS = isExternalLinksEnabled();
  const [detailView, setDetailView] = useState<DetailView>(activeTab ?? initialTab);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<WorkHistoryRole | null>(null);
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [editingStory, setEditingStory] = useState<WorkHistoryBlurb | null>(null);
  const [isDeleteRoleDialogOpen, setIsDeleteRoleDialogOpen] = useState(false);
  const [deleteRoleStats, setDeleteRoleStats] = useState<{ stories: number } | null>(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);
  const [isDeleteCompanyDialogOpen, setIsDeleteCompanyDialogOpen] = useState(false);
  const [deleteCompanyTarget, setDeleteCompanyTarget] = useState<WorkHistoryCompany | null>(null);
  const [deleteCompanyStats, setDeleteCompanyStats] = useState<{ roles: number; stories: number } | null>(null);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);
  const [isDeleteStoryDialogOpen, setIsDeleteStoryDialogOpen] = useState(false);
  const [deleteStoryTarget, setDeleteStoryTarget] = useState<WorkHistoryBlurb | null>(null);
  const [isDeletingStory, setIsDeletingStory] = useState(false);
  
  const { toast } = useToast();
  const [dismissedSuccessCards, setDismissedSuccessCards] = useState<Set<string>>(new Set());
  const [gapsByEntity, setGapsByEntity] = useState<Record<string, Gap[]>>({});
  const [gapsRefreshKey, setGapsRefreshKey] = useState(0);
  const [activeGapContext, setActiveGapContext] = useState<{
    gap: Gap;
    entityType: 'work_item' | 'approved_content' | 'saved_section' | 'company';
    entityId: string;
  } | null>(null);

  // Tag suggestion state
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagContent, setTagContent] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<TagSuggestion[]>([]);
  const [otherTags, setOtherTags] = useState<TagSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [tagContentType, setTagContentType] = useState<'company' | 'role' | 'saved_section' | 'story'>('company');
  const [tagEntityId, setTagEntityId] = useState<string | undefined>();

  const {
    isModalOpen: isContentGenerationModalOpen,
    modalProps: contentGenerationModalProps,
    isLoadingContext: isContentGenerationLoading,
    openModal: openContentGenerationModal,
    closeModal: closeContentGenerationModal,
  } = useContentGeneration();

  const contentGenerationGap = useMemo(() => {
    const gap = activeGapContext?.gap;
    if (!gap) return null;

    const modalType =
      gap.gap_type === 'data_quality'
        ? 'core-requirement'
        : gap.gap_type === 'role_expectation'
          ? 'preferred-requirement'
          : 'best-practice';

    const suggestionValue = Array.isArray(gap.suggestions) && gap.suggestions.length ? gap.suggestions[0] : undefined;
    const suggestion =
      typeof suggestionValue === 'string'
        ? suggestionValue
        : typeof (suggestionValue as any)?.suggestion === 'string'
          ? (suggestionValue as any).suggestion
          : 'Improve content quality';

    return {
      id: String(gap.id ?? `${activeGapContext?.entityType}-${activeGapContext?.entityId}-${gap.gap_category}`),
      type: modalType as any,
      severity: gap.severity,
      description: String(gap.description || gap.gap_category || 'Content needs improvement'),
      suggestion,
      paragraphId: gap.entity_type === 'approved_content' ? 'story-content' : gap.entity_type === 'work_item' ? 'role' : 'saved-section',
      origin: 'ai' as const,
      existingContent: String((contentGenerationModalProps as any)?.existingContent ?? ''),
    };
  }, [activeGapContext?.entityId, activeGapContext?.entityType, activeGapContext?.gap, contentGenerationModalProps]);

  useEffect(() => {
    const fetchGaps = async () => {
      if (!user || !selectedRole) {
        setGapsByEntity({});
        return;
      }

      // Collect entity IDs for gap queries
      // Use workItemIds (real UUIDs) instead of cluster IDs (which may be synthetic for LinkedIn)
      const workItemIds = selectedRole.workItemIds || [];
      const storyIds = (selectedRole.blurbs || []).map((story) => story.id);
      
      // Filter to only valid UUIDs (LinkedIn synthetic IDs start with "linkedin_")
      const isValidUuid = (id: string) => !id.startsWith('linkedin_') && !id.startsWith('cluster_');
      const entityIds = [...workItemIds, ...storyIds].filter(isValidUuid);
      
      if (entityIds.length === 0) {
        // No valid UUIDs to query - this is normal for LinkedIn-only items
        setGapsByEntity({});
        return;
      }

      const { data, error } = await supabase
        .from('gaps')
        .select('*')
        .eq('user_id', user.id)
        .in('entity_id', entityIds)
        .eq('resolved', false)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading gaps', error);
        toast({
          title: 'Unable to load gaps',
          description: error.message || 'Please try again.',
          variant: 'destructive',
        });
        setGapsByEntity({});
        return;
      }

      const grouped: Record<string, Gap[]> = {};
      (data || []).forEach((gap: Gap) => {
        const entityId = gap.entity_id;
        if (!grouped[entityId]) {
          grouped[entityId] = [];
        }
        grouped[entityId].push(gap);
      });
      setGapsByEntity(grouped);
    };

    fetchGaps();
  }, [user?.id, selectedRole?.id, selectedRole?.blurbs?.length, gapsRefreshKey, selectedRole, toast]);

  const getGapsForEntity = useCallback(
    (entityId: string) => gapsByEntity[entityId] || [],
    [gapsByEntity],
  );

  const pickTopGap = useCallback((gaps: Gap[], predicate?: (gap: Gap) => boolean) => {
    const filtered = predicate ? gaps.filter(predicate) : gaps.slice();
    if (filtered.length === 0) return null;
    const severityOrder: Record<Gap['severity'], number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    filtered.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    return filtered[0];
  }, []);

  const openGapModal = useCallback(
    (
      gap: Gap,
      entityType: 'work_item' | 'approved_content' | 'saved_section',
      entityId: string,
      existingContent: string,
    ) => {
      setActiveGapContext({ gap, entityType, entityId });
      openContentGenerationModal(gap, entityType, entityId, existingContent);
    },
    [openContentGenerationModal],
  );

  const handleRoleDescriptionGenerate = useCallback(() => {
    if (!selectedRole) return;
    const roleGaps = getGapsForEntity(selectedRole.id);
    const gap = pickTopGap(
      roleGaps,
      (gap) =>
        (gap.gap_category || '').includes('role_description') ||
        gap.gap_category === 'missing_role_description' ||
        gap.gap_category === 'generic_role_description' || // back-compat
        gap.gap_category === 'role_description_needs_specifics',
    );
    if (!gap) {
      toast({
        title: 'No role description gaps',
        description: 'This role description is already up to date.',
      });
      return;
    }
    openGapModal(gap, 'work_item', selectedRole.id, selectedRole.description || '');
  }, [getGapsForEntity, pickTopGap, selectedRole, toast, openGapModal]);

  const handleRoleMetricsGenerate = useCallback(() => {
    if (!selectedRole) return;
    const roleGaps = getGapsForEntity(selectedRole.id);
    const gap = pickTopGap(
      roleGaps,
      (gap) =>
        gap.gap_category === 'missing_role_metrics' ||
        gap.gap_category === 'insufficient_role_metrics',
    );
    if (!gap) {
      toast({
        title: 'No role metrics gaps',
        description: 'All role metrics have already been addressed.',
      });
      return;
    }
    const existingContent = (selectedRole.outcomeMetrics || []).join('\n');
    openGapModal(gap, 'work_item', selectedRole.id, existingContent);
  }, [getGapsForEntity, pickTopGap, selectedRole, toast, openGapModal]);

  const handleStoryContentGenerate = useCallback(
    (story: WorkHistoryBlurb) => {
      const storyGaps = getGapsForEntity(story.id);
      const gap = pickTopGap(storyGaps);
      if (gap) {
        // Use existing gap if available
        openGapModal(gap, 'approved_content', story.id, story.content);
      } else {
        // Create synthetic gap for HIL flow when no gaps exist
        const syntheticGap: Gap = {
          id: `story-${story.id}-enhancement`,
          user_id: user?.id || '',
          entity_type: 'approved_content',
          entity_id: story.id,
          gap_type: 'best_practice',
          gap_category: 'content_enhancement',
          severity: 'medium',
          description: 'Enhance story with more specific details and quantifiable achievements',
          suggestions: ['Add structure, metrics, and specific details'],
          resolved: false,
        };
        openGapModal(syntheticGap, 'approved_content', story.id, story.content);
      }
    },
    [getGapsForEntity, pickTopGap, openGapModal, user?.id],
  );

  const handleGenerateCompanyContent = useCallback(() => {
    if (!user || !selectedRole) return;
    const roleGaps = getGapsForEntity(selectedRole.id);
    const gap = pickTopGap(
      roleGaps,
      (gap) =>
        gap.gap_category === 'missing_role_description' ||
        gap.gap_category === 'generic_role_description' || // back-compat
        gap.gap_category === 'role_description_needs_specifics',
    );
    if (!gap) {
      toast({
        title: 'No company description gaps',
        description: 'This company description is already up to date.',
      });
      return;
    }
    openGapModal(gap, 'work_item', selectedRole.id, selectedRole.description || '');
  }, [getGapsForEntity, pickTopGap, selectedRole, toast, openGapModal, user]);

  // Inline editing state for company description
  const [isEditingCompanyDescription, setIsEditingCompanyDescription] = useState(false);
  const [companyDescriptionDraft, setCompanyDescriptionDraft] = useState('');

  // Handlers for company description editing
  const handleSaveCompanyDescription = async () => {
    // Get roleCompany from companies array (same as the render logic does)
    const roleCompany = selectedRole ? companies.find(c => c.id === selectedRole.companyId) : null;
    
    if (!roleCompany || !user) {
      toast({
        title: 'Unable to save',
        description: 'Company information not available.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          description: companyDescriptionDraft.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', roleCompany.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Close edit mode
      setIsEditingCompanyDescription(false);

      toast({
        title: 'Description saved',
        description: 'Company description has been updated.',
      });

      // Trigger parent refresh to get updated data
      onRefresh?.();
    } catch (error) {
      console.error('[CompanyDescription] Error saving:', error);
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save company description.',
        variant: 'destructive',
      });
    }
  };

  const handleCancelEditCompanyDescription = () => {
    const roleCompany = selectedRole ? companies.find(c => c.id === selectedRole.companyId) : null;
    setIsEditingCompanyDescription(false);
    setCompanyDescriptionDraft(roleCompany?.description || '');
  };

  // Reset editing state when company/role changes
  useEffect(() => {
    if (selectedRole) {
      const currentCompany = companies.find(c => c.id === selectedRole.companyId);
      if (currentCompany) {
        setCompanyDescriptionDraft(currentCompany.description || '');
        setIsEditingCompanyDescription(false);
      }
    }
  }, [selectedRole?.companyId, companies]);

	  const handleApplyContent = async (content: string) => {
	    if (!user || !activeGapContext) return;
	    
	    const entityType = activeGapContext.entityType;
	    const entityId = activeGapContext.entityId;
	    const trimmedContent = content.trim();
	    const gapId = String(activeGapContext.gap.id || '');
	    const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
	    const entityIdIsUuid = isUuid(entityId);
	    const gapIdIsUuid = isUuid(gapId);

	    if (!trimmedContent) {
	      toast({
	        title: 'Nothing to apply',
        description: 'Generated content is empty.',
        variant: 'destructive',
      });
      return;
	    }

	    // Persist the updated content first. Do not show success UI unless save succeeds.
	    try {
	      if (entityType === 'approved_content') {
	        if (!entityIdIsUuid) {
	          toast({
	            title: 'Save failed',
	            description:
	              'This story is not saved to your database yet, so it cannot be updated. Duplicate it (or create a new story) to save a copy first.',
	            variant: 'destructive',
	          });
	          return;
	        }
	        const { error } = await supabase
	          .from('stories')
	          .update({
	            content: trimmedContent,
	            updated_at: new Date().toISOString(),
	            ...(gapIdIsUuid ? { addressed_gap_id: gapId } : {}),
	          })
	          .eq('id', entityId)
	          .eq('user_id', user.id);
	        if (error) throw error;

        const storyForVariation = selectedRole?.blurbs?.find((b) => b.id === entityId);
        const previousContent =
          String((contentGenerationModalProps as any)?.existingContent ?? storyForVariation?.content ?? '').trim();
        const shouldCreateVariation = previousContent && previousContent !== trimmedContent && entityIdIsUuid;

        if (shouldCreateVariation) {
          try {
            const { data: existingVariation } = await supabase
              .from('content_variations')
              .select('id')
              .eq('user_id', user.id)
              .eq('parent_entity_type', 'approved_content')
              .eq('parent_entity_id', entityId)
              .eq('content', trimmedContent)
              .limit(1)
              .maybeSingle();

            if (!existingVariation?.id) {
              const variationInsert: ContentVariationInsert = {
                user_id: user.id,
                parent_entity_type: 'approved_content',
                parent_entity_id: entityId,
                title: `${storyForVariation?.title ?? 'Story'} (HIL edit)`,
                content: trimmedContent,
                created_by: 'user',
                times_used: 0,
              };

        const { error: variationError } = await supabase
                .from('content_variations')
                .insert(variationInsert as any);
              if (variationError) {
                console.warn('[WorkHistoryDetail] Failed to create story variation (non-blocking):', variationError);
              }
            }
          } catch (variationError) {
            console.warn('[WorkHistoryDetail] Exception creating story variation (non-blocking):', variationError);
          }
        }

        // Update UI immediately if possible (avoid waiting for parent refresh).
        if (selectedRole && onRoleSelect) {
          onRoleSelect({
            ...selectedRole,
            blurbs: (selectedRole.blurbs || []).map((b) => (b.id === entityId ? { ...b, content: trimmedContent } : b)),
          });
	        }
	      } else if (entityType === 'work_item') {
	        if (!entityIdIsUuid) {
	          toast({
	            title: 'Save failed',
	            description:
	              'This role is not saved to your database yet, so it cannot be updated. Create a role entry (manual import) to save a copy first.',
	            variant: 'destructive',
	          });
	          return;
	        }
	        const { error } = await supabase
	          .from('work_items')
	          .update({
	            description: trimmedContent,
	            updated_at: new Date().toISOString(),
	            ...(gapIdIsUuid ? { addressed_gap_id: gapId } : {}),
	          })
	          .eq('id', entityId)
	          .eq('user_id', user.id);
	        if (error) throw error;
	      } else if (entityType === 'saved_section') {
	        if (!entityIdIsUuid) {
	          toast({
	            title: 'Save failed',
	            description: 'This saved section is not saved to your database yet, so it cannot be updated.',
	            variant: 'destructive',
	          });
	          return;
	        }
	        const { error } = await supabase
	          .from('saved_sections')
	          .update({
	            content: trimmedContent,
	            updated_at: new Date().toISOString(),
	            ...(gapIdIsUuid ? { addressed_gap_id: gapId } : {}),
	          })
	          .eq('id', entityId)
	          .eq('user_id', user.id);
	        if (error) throw error;
	      }
	    } catch (error) {
	      console.error('Error applying generated content:', { error, entityType, entityId, gapId });
	      const message =
	        error instanceof Error
	          ? error.message
	          : typeof (error as any)?.message === 'string'
	            ? String((error as any).message)
	            : typeof (error as any)?.details === 'string'
	              ? String((error as any).details)
	              : undefined;
	      toast({
	        title: 'Save failed',
	        description: message ? `Unable to apply content: ${message}` : 'Unable to apply content. Please try again.',
	        variant: 'destructive',
	      });
	      return;
	    }

	    // Resolve gap in database with 'content_added' reason (not 'user_override')
	    // This distinguishes content-generated resolution from manual dismissal
	    const gapCategory = activeGapContext.gap.gap_category;
	    const isDatabaseId = gapIdIsUuid;
	    let didResolveGap = false;

    if (isDatabaseId) {
      try {
        if (entityType === 'approved_content' && gapCategory === 'missing_metrics') {
          const shouldResolve = GapDetectionService.storyHasMetrics({ content: trimmedContent, metrics: [] });
          if (shouldResolve) {
            await GapDetectionService.resolveSatisfiedStoryMetricsGaps({
              userId: user.id,
              storyId: entityId,
              content: trimmedContent,
              metrics: [],
            });
            didResolveGap = true;
          }
        } else if (entityType === 'approved_content' && gapCategory === 'story_needs_specifics') {
          const shouldResolve = GapDetectionService.storyMeetsSpecificity(trimmedContent);
          if (shouldResolve) {
            await GapDetectionService.resolveSatisfiedStorySpecificsGaps({
              userId: user.id,
              storyId: entityId,
              content: trimmedContent,
            });
            didResolveGap = true;
          }
        } else {
          const addressingContentId = entityType === 'approved_content' ? entityId : undefined;
          await GapDetectionService.resolveGap(gapId, user.id, 'content_added', addressingContentId);
          didResolveGap = true;
        }
      } catch (error) {
        console.error('Error resolving gap after content generation:', error);
        // Non-blocking: content was saved, so continue.
      }
    }
    
    // Track that content was generated (not just dismissed); only mark as "resolved" if it was actually resolved.
    const gapKey = activeGapContext.entityType === 'approved_content'
      ? `story-content-gap-${activeGapContext.entityId}`
      : activeGapContext.gap.id;
    const generatedKey = activeGapContext.entityType === 'approved_content'
      ? `story-content-generated-${activeGapContext.entityId}`
      : `${activeGapContext.gap.id}-generated`;

    if (activeGapContext.entityType === 'approved_content' && !didResolveGap && isDatabaseId) {
      if (gapCategory === 'missing_metrics') {
        toast({
          title: 'Content saved',
          description: 'This story still appears to be missing quantified metrics.',
        });
      } else if (gapCategory === 'story_needs_specifics') {
        toast({
          title: 'Content saved',
          description: 'This story still appears to need more specific details and outcomes.',
        });
      }
    }

    // Update local state (for immediate UI feedback)
    onResolvedGapsChange(
      new Set([...resolvedGaps, ...(didResolveGap ? [gapKey] : []), generatedKey])
    );
    
    // Trigger parent refresh to ensure lists/gaps are up to date.
    onRefresh?.();
      
      // Auto-dismiss success card after 3 seconds
      setTimeout(() => {
        setDismissedSuccessCards(prev => new Set([...prev, generatedKey]));
      }, 3000);
    
    setGapsRefreshKey(prev => prev + 1);

    handleCloseContentGenerationModal();
  };

  const handleDismissSuccessCard = (gapId: string) => {
    setDismissedSuccessCards(prev => new Set([...prev, gapId]));
  };

  const handleResolveGap = async (gapId: string, localId?: string) => {
    if (!user) return;
    
    // If gapId is a real database ID (UUID format), persist to database
    // UUID format: 8-4-4-4-12 hex characters
    const isDatabaseId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gapId);
    
    if (isDatabaseId) {
      try {
        // Persist gap resolution to database
        await GapDetectionService.resolveGap(gapId, user.id, 'user_override');
        
        // Trigger parent refresh to update data (so ShowAllStories will see resolved gaps on next fetch)
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error('Error resolving gap in database:', error);
        // Continue with local state update even if DB update fails
      }
    }
    
    // Update local state (for immediate UI feedback)
    // Use localId if provided, otherwise use gapId
    const stateKey = localId || gapId;
    onResolvedGapsChange(new Set([...resolvedGaps, stateKey]));
  };

  const handleCloseContentGenerationModal = () => {
    setActiveGapContext(null);
    closeContentGenerationModal();
  };

  // NOTE: Role-level tag suggestions removed
  // Tags are now extracted during onboarding from resume + cover letter in a single LLM call
  // This avoids sending the same data to LLM twice
  // Users can manually edit tags if needed, but auto-suggest is no longer needed for roles

  const handleApplyTags = async (selectedTags: string[]) => {
    console.log('🏷️ handleApplyTags called with:', { 
      selectedTags, 
      user: !!user, 
      tagEntityId, 
      tagContentType 
    });
    
    if (!user) {
      console.error('🏷️ No user found');
      setSearchError('User not authenticated. Please log in and try again.');
      return;
    }
    
    if (!tagEntityId) {
      console.error('🏷️ No tagEntityId found');
      setSearchError('Missing entity ID. Please close and try again.');
      return;
    }
    
    try {
      if (tagContentType === 'company') {
        // Find company by ID
        const targetCompany = companies.find(c => c.id === tagEntityId) || selectedCompany;
        console.log('🏷️ Target company:', { 
          targetCompany: targetCompany?.name, 
          selectedCompany: selectedCompany?.name,
          companiesCount: companies.length 
        });
        
        if (!targetCompany) {
          console.error('🏷️ Company not found with ID:', tagEntityId);
          setSearchError('Company not found. Please refresh and try again.');
          return;
        }
        
        // Merge with existing tags
        const allTags = [...new Set([...(targetCompany.tags || []), ...selectedTags])];
        console.log('🏷️ Updating company tags:', { 
          companyId: tagEntityId, 
          existingTags: targetCompany.tags,
          selectedTags,
          allTags 
        });
        
        await TagService.updateCompanyTags(tagEntityId, allTags, user.id);
        console.log('🏷️ Company tags updated successfully');
        
      } else if (tagContentType === 'role') {
        // Merge with existing tags for role
        const allTags = [...new Set([...(selectedRole?.tags || []), ...selectedTags])];
        console.log('🏷️ Updating role tags:', { 
          roleId: tagEntityId, 
          existingTags: selectedRole?.tags,
          selectedTags,
          allTags 
        });
        
        await TagService.updateWorkItemTags(tagEntityId, allTags, user.id);
        console.log('🏷️ Role tags updated successfully');
      } else if (tagContentType === 'story') {
        const story = selectedRole?.blurbs?.find((b) => b.id === tagEntityId);
        const allTags = [...new Set([...(story?.tags || []), ...selectedTags])];
        console.log('🏷️ Updating story tags:', {
          storyId: tagEntityId,
          existingTags: story?.tags,
          selectedTags,
          allTags,
        });

        await TagService.updateStoryTags(tagEntityId, allTags, user.id);
        console.log('🏷️ Story tags updated successfully');

        if (selectedRole && onRoleSelect) {
          onRoleSelect({
            ...selectedRole,
            blurbs: (selectedRole.blurbs || []).map((b) => (b.id === tagEntityId ? { ...b, tags: allTags } : b)),
          });
        }
      }
      
      // Refresh work history
      if (onRefresh) {
        console.log('🏷️ Refreshing work history');
        onRefresh();
      }
      
      // Show success toast
      toast({
        title: 'Tags saved',
        description: `${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''} applied successfully.`,
      });
      
      setIsTagModalOpen(false);
      setSuggestedTags([]);
      setOtherTags([]);
      setSearchError(null);
    } catch (error) {
      console.error('🏷️ Error updating tags:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update tags. Please try again.';
      setSearchError(errorMessage);
      
      // Also show error toast
      toast({
        title: 'Failed to save tags',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Company tag suggestion handlers
  const handleCompanyTagSuggestions = async (company?: WorkHistoryCompany) => {
    const targetCompany = company || selectedCompany;
    console.log('🏷️ handleCompanyTagSuggestions called with:', {
      companyArg: company?.name,
      selectedCompany: selectedCompany?.name,
      targetCompany: targetCompany?.name,
      targetCompanyId: targetCompany?.id
    });
    
    if (!targetCompany) {
      console.error('🏷️ No target company found');
      return;
    }
    
    const content = `${targetCompany.name}: ${targetCompany.description || 'Company information'}`;
    
    console.log('🏷️ Setting tag modal state:', {
      content,
      entityId: targetCompany.id,
      contentType: 'company'
    });
    
    setTagContent(content);
    setTagContentType('company');
    setTagEntityId(targetCompany.id);
    setSuggestedTags([]);
    setSearchError(null);
    setIsSearching(true); // Show "Researching company..." indicator
    setIsTagModalOpen(true);
    
    try {
      console.log('🏷️ Calling TagSuggestionService.suggestTags with:', {
        content,
        companyName: targetCompany.name,
        existingTags: targetCompany.tags
      });
      
      const suggestions = await TagSuggestionService.suggestTags({
        content,
        contentType: 'company',
        companyName: targetCompany.name,
        userGoals: goals ? {
          industries: goals.industries,
          businessModels: goals.businessModels
        } : undefined,
        existingTags: targetCompany.tags || []
      });
      
      console.log('🏷️ TagSuggestionService returned:', suggestions);
      
      // Split by confidence: high = suggested (pre-checked), medium/low = other (unchecked)
      const highConfidence = suggestions.filter(t => t.confidence === 'high');
      const otherConfidence = suggestions.filter(t => t.confidence !== 'high');
      
      console.log('🏷️ Split tags - high:', highConfidence.length, 'other:', otherConfidence.length);
      setSuggestedTags(highConfidence);
      setOtherTags(otherConfidence);
      setIsSearching(false);
    } catch (error) {
      console.error('🏷️ Error generating tag suggestions:', error);
      setIsSearching(false);
      setSearchError(error instanceof Error ? error.message : 'Failed to research company. Please try again.');
    }
  };

  const handleStoryTagSuggestions = async (story: WorkHistoryBlurb) => {
    if (!story) return;

    const content = `${story.title}: ${story.content}`;
    setTagContent(content);
    setTagContentType('story');
    setTagEntityId(story.id);
    setSuggestedTags([]);
    setOtherTags([]);
    setSearchError(null);
    setIsSearching(true);
    setIsTagModalOpen(true);

    try {
      const suggestions = await TagSuggestionService.suggestTags(
        {
          content,
          contentType: 'story',
          userGoals: goals ? { industries: goals.industries, businessModels: goals.businessModels } : undefined,
          existingTags: story.tags || [],
        },
        user?.id
      );

      const highConfidence = suggestions.filter((t) => t.confidence === 'high');
      const otherConfidence = suggestions.filter((t) => t.confidence !== 'high');
      setSuggestedTags(highConfidence);
      setOtherTags(otherConfidence);
      setIsSearching(false);
    } catch (error) {
      console.error('🏷️ Error generating story tag suggestions:', error);
      setIsSearching(false);
      setSearchError(error instanceof Error ? error.message : 'Failed to suggest tags. Please try again.');
    }
  };

  // Retry handler for company tag suggestions
  const handleRetryCompanyTags = () => {
    handleCompanyTagSuggestions();
  };

  // NOTE: Story and link tag suggestions removed
  // Story tags are auto-generated when creating content to address gaps (using gapContext)
  // Link tags are not needed - links are supporting evidence, not primary content

  const setTab = useCallback((tab: DetailView) => {
    setDetailView(tab);
    onTabChange?.(tab);
  }, [onTabChange]);

  // Keep internal state in sync with controlled prop (or initialTab for legacy/uncontrolled).
  useEffect(() => {
    const next = activeTab ?? initialTab;
    setDetailView(next);
  }, [activeTab, initialTab]);
  
  const formatDateRange = (startDate: string, endDate?: string) => {
    // Parse date strings without timezone conversion issues
    // Input format: "2019-06-01" or "2019-06" 
    const parseDate = (dateStr: string) => {
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
      return new Date(year, month, 1);
    };
    
    const start = parseDate(startDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
    const end = endDate 
      ? parseDate(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      : 'Present';
    return `${start} - ${end}`;
  };

  const handleEditRoleClick = () => {
    if (selectedRole && onEditRole) {
      // Use parent callback to open modal
      onEditRole(selectedRole);
    } else if (selectedRole) {
      // Fallback to inline editing if no parent callback
      setEditingRole({ ...selectedRole, tags: selectedRole.tags || [] });
      setRoleTagInput('');
      setIsEditingRole(true);
    }
  };

  const handleDeleteRoleClick = async () => {
    if (!selectedRole || !user) return;
    
    // Fetch stats for the confirmation dialog
    try {
      const workItemIds = selectedRole.workItemIds || [selectedRole.id];
      const { count: storiesCount } = await supabase
        .from('stories')
        .select('id', { count: 'exact', head: true })
        .in('work_item_id', workItemIds);
      
      setDeleteRoleStats({ stories: storiesCount || 0 });
      setIsDeleteRoleDialogOpen(true);
    } catch (error) {
      console.error('Error fetching delete stats:', error);
      setDeleteRoleStats(null);
      setIsDeleteRoleDialogOpen(true);
    }
  };

  const handleConfirmDeleteRole = async () => {
    if (!selectedRole || !user) return;

    setIsDeletingRole(true);

    try {
      const workItemIds = selectedRole.workItemIds || [selectedRole.id];

      // Delete stories first (FK constraint)
      const { data: storyRows, error: storyFetchError } = await supabase
        .from('stories')
        .select('*')
        .in('work_item_id', workItemIds);

      if (storyFetchError) throw storyFetchError;
      if (storyRows && storyRows.length > 0) {
        await SoftDeleteService.archiveRows({
          userId: user.id,
          sourceTable: 'stories',
          rows: storyRows
        });
      }

      await supabase
        .from('stories')
        .delete()
        .in('work_item_id', workItemIds);

      // Delete gaps for these work items
      const { data: gapRows, error: gapFetchError } = await supabase
        .from('gaps')
        .select('*')
        .in('entity_id', workItemIds);

      if (gapFetchError) throw gapFetchError;
      if (gapRows && gapRows.length > 0) {
        await SoftDeleteService.archiveRows({
          userId: user.id,
          sourceTable: 'gaps',
          rows: gapRows
        });
      }

      await supabase
        .from('gaps')
        .delete()
        .in('entity_id', workItemIds);

      // Delete work_items
      const { data: workItemRows, error: workItemFetchError } = await supabase
        .from('work_items')
        .select('*')
        .in('id', workItemIds)
        .eq('user_id', user.id);

      if (workItemFetchError) throw workItemFetchError;
      if (workItemRows && workItemRows.length > 0) {
        await SoftDeleteService.archiveRows({
          userId: user.id,
          sourceTable: 'work_items',
          rows: workItemRows
        });
      }

      const { error } = await supabase
        .from('work_items')
        .delete()
        .in('id', workItemIds)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Role deleted",
        description: `${selectedRole.title} and all associated data has been deleted.`,
      });

      setIsDeleteRoleDialogOpen(false);
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete role.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingRole(false);
    }
  };

  const handleDeleteCompanyClick = async (company: WorkHistoryCompany) => {
    if (!user) return;
    
    setDeleteCompanyTarget(company);
    
    // Fetch stats for the confirmation dialog
    try {
      // Get company ID
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('name', company.name)
        .eq('user_id', user.id)
        .single();

      if (companyData) {
        // Count roles (work_items) for this company
        const { count: rolesCount } = await supabase
          .from('work_items')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyData.id)
          .eq('user_id', user.id);

        // Get work_item ids to count stories
        const { data: workItems } = await supabase
          .from('work_items')
          .select('id')
          .eq('company_id', companyData.id)
          .eq('user_id', user.id);

        const workItemIds = workItems?.map(w => w.id) || [];
        
        let storiesCount = 0;
        if (workItemIds.length > 0) {
          const { count } = await supabase
            .from('stories')
            .select('id', { count: 'exact', head: true })
            .in('work_item_id', workItemIds);
          storiesCount = count || 0;
        }

        setDeleteCompanyStats({ roles: rolesCount || 0, stories: storiesCount });
      } else {
        setDeleteCompanyStats(null);
      }
      
      setIsDeleteCompanyDialogOpen(true);
    } catch (error) {
      console.error('Error fetching delete stats:', error);
      setDeleteCompanyStats(null);
      setIsDeleteCompanyDialogOpen(true);
    }
  };

  const handleConfirmDeleteCompany = async () => {
    if (!deleteCompanyTarget || !user) return;

    setIsDeletingCompany(true);

    try {
      // Get company ID
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('name', deleteCompanyTarget.name)
        .eq('user_id', user.id)
        .single();

      if (!companyData) {
        throw new Error('Company not found');
      }

      // Get work_items for this company
      const { data: workItems } = await supabase
        .from('work_items')
        .select('id')
        .eq('company_id', companyData.id)
        .eq('user_id', user.id);

      const workItemIds = workItems?.map(w => w.id) || [];

      if (workItemIds.length > 0) {
        // Delete stories first
        const { data: storyRows, error: storyFetchError } = await supabase
          .from('stories')
          .select('*')
          .in('work_item_id', workItemIds);

        if (storyFetchError) throw storyFetchError;
        if (storyRows && storyRows.length > 0) {
          await SoftDeleteService.archiveRows({
            userId: user.id,
            sourceTable: 'stories',
            rows: storyRows
          });
        }

        await supabase
          .from('stories')
          .delete()
          .in('work_item_id', workItemIds);

        // Delete gaps
        const { data: gapRows, error: gapFetchError } = await supabase
          .from('gaps')
          .select('*')
          .in('entity_id', workItemIds);

        if (gapFetchError) throw gapFetchError;
        if (gapRows && gapRows.length > 0) {
          await SoftDeleteService.archiveRows({
            userId: user.id,
            sourceTable: 'gaps',
            rows: gapRows
          });
        }

        await supabase
          .from('gaps')
          .delete()
          .in('entity_id', workItemIds);

        // Delete work_items
        const { data: workItemRows, error: workItemFetchError } = await supabase
          .from('work_items')
          .select('*')
          .eq('company_id', companyData.id)
          .eq('user_id', user.id);

        if (workItemFetchError) throw workItemFetchError;
        if (workItemRows && workItemRows.length > 0) {
          await SoftDeleteService.archiveRows({
            userId: user.id,
            sourceTable: 'work_items',
            rows: workItemRows
          });
        }

        await supabase
          .from('work_items')
          .delete()
          .eq('company_id', companyData.id)
          .eq('user_id', user.id);
      }

      // Finally delete the company
      const { data: companyRow, error: companyFetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyData.id)
        .eq('user_id', user.id)
        .single();

      if (companyFetchError) throw companyFetchError;
      if (companyRow) {
        await SoftDeleteService.archiveRecord({
          userId: user.id,
          sourceTable: 'companies',
          sourceId: companyRow.id,
          sourceData: companyRow
        });
      }

      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyData.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Company deleted",
        description: `${deleteCompanyTarget.name} and all associated data has been deleted.`,
      });

      setIsDeleteCompanyDialogOpen(false);
      setDeleteCompanyTarget(null);
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete company.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingCompany(false);
    }
  };

  const handleDeleteStoryClick = (story: WorkHistoryBlurb) => {
    setDeleteStoryTarget(story);
    setIsDeleteStoryDialogOpen(true);
  };

  const handleDeleteVariation = async (storyId: string, variationId: string) => {
    if (!user) return;

    try {
      const { data: variationRow, error: variationFetchError } = await supabase
        .from('content_variations')
        .select('*')
        .eq('id', variationId)
        .eq('user_id', user.id)
        .single();

      if (variationFetchError) throw variationFetchError;
      if (variationRow) {
        await SoftDeleteService.archiveRecord({
          userId: user.id,
          sourceTable: 'content_variations',
          sourceId: variationRow.id,
          sourceData: variationRow
        });
      }

      const { error } = await supabase
        .from('content_variations')
        .delete()
        .eq('id', variationId)
        .eq('user_id', user.id);

      if (error) throw error;

      if (selectedRole && onRoleSelect) {
        onRoleSelect({
          ...selectedRole,
          blurbs: (selectedRole.blurbs || []).map((blurb) => {
            if (blurb.id !== storyId) return blurb;
            return {
              ...blurb,
              variations: (blurb.variations || []).filter((variation) => variation.id !== variationId),
            };
          }),
        });
      }
    } catch (error) {
      console.error('Error deleting variation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete variation.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDeleteStory = async () => {
    if (!deleteStoryTarget || !user) return;

    setIsDeletingStory(true);

    try {
      const { data: storyRow, error: storyFetchError } = await supabase
        .from('stories')
        .select('*')
        .eq('id', deleteStoryTarget.id)
        .eq('user_id', user.id)
        .single();

      if (storyFetchError) throw storyFetchError;
      if (storyRow) {
        await SoftDeleteService.archiveRecord({
          userId: user.id,
          sourceTable: 'stories',
          sourceId: storyRow.id,
          sourceData: storyRow
        });
      }

      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', deleteStoryTarget.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Story deleted",
        description: "The story has been deleted.",
      });

      setIsDeleteStoryDialogOpen(false);
      setDeleteStoryTarget(null);
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting story:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete story.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingStory(false);
    }
  };

  const handleAddRoleTag = () => {
    if (!editingRole) return;
    const nextTags = addUserTag(editingRole.tags || [], roleTagInput);
    if (nextTags === editingRole.tags) return;
    setEditingRole({
      ...editingRole,
      tags: nextTags,
    });
    setRoleTagInput('');
  };

  const handleRemoveRoleTag = (tagToRemove: string) => {
    if (editingRole) {
      setEditingRole({
        ...editingRole,
        tags: removeUserTag(editingRole.tags || [], tagToRemove)
      });
    }
  };

  const handleSaveRole = () => {
    if (editingRole && selectedRole) {
      // Update the selected role with edited data
      Object.assign(selectedRole, editingRole);
      setIsEditingRole(false);
      setEditingRole(null);
      setRoleTagInput('');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingRole(false);
    setEditingRole(null);
    setRoleTagInput('');
  };

  const handleEditStory = (story: WorkHistoryBlurb) => {
    setEditingStory({ ...story, tags: story.tags || [] });
    setStoryTagInput('');
    setIsEditingStory(true);
  };

  const handleAddStoryTag = () => {
    if (!editingStory) return;
    const nextTags = addUserTag(editingStory.tags || [], storyTagInput);
    if (nextTags === editingStory.tags) return;
    setEditingStory({
      ...editingStory,
      tags: nextTags,
    });
    setStoryTagInput('');
  };

  const handleRemoveStoryTag = (tagToRemove: string) => {
    if (editingStory) {
      setEditingStory({
        ...editingStory,
        tags: removeUserTag(editingStory.tags || [], tagToRemove)
      });
    }
  };

  const handleSaveStory = () => {
    if (editingStory && selectedRole) {
      // Find and update the story in the selected role
      const storyIndex = selectedRole.blurbs.findIndex(s => s.id === editingStory.id);
      if (storyIndex !== -1) {
        selectedRole.blurbs[storyIndex] = { ...editingStory };
      }
      setIsEditingStory(false);
      setEditingStory(null);
    }
  };

  const handleCancelEditStory = () => {
    setIsEditingStory(false);
    setEditingStory(null);
    setStoryTagInput('');
  };

  // Edit Role Modal - Check this first
  if (isEditingRole && editingRole) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Edit Role</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Empty div to ensure proper spacing for first real section */}
            <div></div>
            
            {/* Basic Role Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <GrammarInput
                  id="title"
                  value={editingRole.title}
                  onChange={(e) => setEditingRole({ ...editingRole, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <GrammarTextarea
                  id="description"
                  value={editingRole.description || ''}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  placeholder="Describe your role and responsibilities..."
                />
              </div>
              
              {/* Outcome Metrics */}
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Outcome Metrics</Label>
                </div>
                <div className="space-y-2 mt-2">
                  {editingRole.outcomeMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1">
                        <GrammarInput
                          value={metric}
                          onChange={(e) => {
                            const updatedMetrics = [...editingRole.outcomeMetrics];
                            updatedMetrics[index] = e.target.value;
                            setEditingRole({ ...editingRole, outcomeMetrics: updatedMetrics });
                          }}
                          placeholder="Enter outcome metric..."
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updatedMetrics = editingRole.outcomeMetrics.filter((_, i) => i !== index);
                          setEditingRole({ ...editingRole, outcomeMetrics: updatedMetrics });
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingRole({
                        ...editingRole,
                        outcomeMetrics: [...editingRole.outcomeMetrics, '']
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Metric
                  </Button>
                </div>
              </div>
              
              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="roleTags">Tags</Label>
                <div className="flex gap-2">
                  <TagAutocompleteInput
                    id="roleTags"
                    value={roleTagInput}
                    onChange={(e) => setRoleTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRoleTag();
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                    category="role"
                    localTags={editingRole?.tags || []}
                    useGrammarInput
                  />
                  <Button type="button" onClick={handleAddRoleTag} size="sm">
                    Add
                  </Button>
                </div>
                
                {editingRole.tags && editingRole.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editingRole.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveRoleTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveRole} className="flex-1">
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edit Story Modal - Check this second
  if (isEditingStory && editingStory) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Edit Story</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEditStory}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Empty div to ensure proper spacing for first real section */}
            <div></div>
            
            {/* Basic Story Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="storyTitle">Title</Label>
                <GrammarInput
                  id="storyTitle"
                  value={editingStory.title}
                  onChange={(e) => setEditingStory({ ...editingStory, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="storyContent">Content</Label>
                <GrammarTextarea
                  id="storyContent"
                  value={editingStory.content}
                  onChange={(e) => setEditingStory({ ...editingStory, content: e.target.value })}
                  placeholder="Describe your story and achievements..."
                  rows={4}
                />
              </div>
              
              {/* Outcome Metrics */}
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Outcome Metrics</Label>
                </div>
                <div className="space-y-2 mt-2">
                  {editingStory.outcomeMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1">
                        <GrammarInput
                          value={metric}
                          onChange={(e) => {
                            const updatedMetrics = [...editingStory.outcomeMetrics];
                            updatedMetrics[index] = e.target.value;
                            setEditingStory({ ...editingStory, outcomeMetrics: updatedMetrics });
                          }}
                          placeholder="Enter outcome metric..."
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updatedMetrics = editingStory.outcomeMetrics.filter((_, i) => i !== index);
                          setEditingStory({ ...editingStory, outcomeMetrics: updatedMetrics });
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingStory({
                        ...editingStory,
                        outcomeMetrics: [...editingStory.outcomeMetrics, '']
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Metric
                  </Button>
                </div>
              </div>
              
              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="storyTags">Tags</Label>
                <div className="flex gap-2">
                  <TagAutocompleteInput
                    id="storyTags"
                    value={storyTagInput}
                    onChange={(e) => setStoryTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddStoryTag();
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                    category="story"
                    localTags={editingStory?.tags || []}
                    useGrammarInput
                  />
                  <Button type="button" onClick={handleAddStoryTag} size="sm">
                    Add
                  </Button>
                </div>
                
                {editingStory.tags && editingStory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editingStory.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveStoryTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveStory} className="flex-1">
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle different data sources FIRST - before any other checks
  if (selectedDataSource === 'linkedin' && isLinkedInScrapingEnabled()) {
    return (
      <div className="h-full">
        <LinkedInDataSource 
          onConnectLinkedIn={() => console.log('Connect LinkedIn')}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  if (selectedDataSource === 'resume') {
    return (
      <div className="h-full">
        <ResumeDataSource 
          onUploadResume={onUploadResume}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  if (!selectedCompany && !selectedRole) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Welcome to Work History
          </h3>
          <p className="text-muted-foreground">
            Select a company or role to get started
          </p>
        </div>
      </Card>
    );
  }

  // Show role details if a role is selected (this takes priority)
  if (selectedRole) {
    // Find the company for this role
    const roleCompany = companies.find(c => c.id === selectedRole.companyId);
    const totalContent = selectedRole.blurbs.length + selectedRole.externalLinks.length;
    
    return (
      <div className="space-y-6 h-full flex flex-col">
        {/* Company Section - Persistent at Top */}
        {roleCompany && (() => {
          // Detect if description is role-level (contains action verbs typical of role descriptions)
          const isRoleLevelDescription = (desc: string | null | undefined): boolean => {
            if (!desc) return false;
            const descLower = desc.trim().toLowerCase();
            // Role-level descriptions typically START with first-person action verbs
            // Company descriptions describe what the company does (third-person or neutral)
            const roleLevelIndicators = [
              // Must start with action verb (first-person role description)
              /^(led|owned|delivered|managed|built|designed|developed|created|improved|increased|reduced|launched|defined|scaled|drove|achieved|implemented|optimized|established|overhauled|enhanced)\b/i,
              // Strong first-person indicators (owned X, led Y)
              /^(owned|led|delivered|managed)\b.*\b(platform|product|system|feature|process|initiative|project|organization|team)\b/i
            ];
            return roleLevelIndicators.some(pattern => pattern.test(desc));
          };
          
          const hasCompanyDescription = roleCompany.description && 
            roleCompany.description.trim() !== '' && 
            !isRoleLevelDescription(roleCompany.description);
          const hasCompanyTags = roleCompany.tags && roleCompany.tags.length > 0;
          const hasCompanyInfo = hasCompanyDescription || hasCompanyTags;
          
          // Empty state if no company info
          if (!hasCompanyInfo) {
            return (
              <div className="space-y-4">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-foreground mb-4">{roleCompany.name}</h1>
                      {isEditingCompanyDescription ? (
                        <div>
                          <GrammarTextarea
                            value={companyDescriptionDraft}
                            onChange={(e) => setCompanyDescriptionDraft(e.target.value)}
                            className="min-h-[60px] text-muted-foreground resize-none"
                            placeholder="Enter company description..."
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-3">
                            <Button size="sm" onClick={handleSaveCompanyDescription}>
                              Save
                            </Button>
                            <Button variant="secondary" size="sm" onClick={handleCancelEditCompanyDescription}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 text-muted-foreground cursor-pointer"
                          onClick={() => setIsEditingCompanyDescription(true)}
                        >
                          <span className="text-sm italic">Company description not available</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditingCompanyDescription(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Company Overflow Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onAddRole}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleGenerateCompanyContent}>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Content
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditCompany?.(roleCompany)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Company
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteCompanyClick(roleCompany)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Company
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {/* Company Tags - Empty State */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Tags className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Company Tags</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="mr-2">No company tags available</span>
	                    <TagSuggestionButton
	                      content={`${roleCompany.name}: Company information`}
	                      onTagsSuggested={() => {}}
	                      variant="tertiary"
	                      onClick={() => {
	                        handleCompanyTagSuggestions(roleCompany);
	                      }}
	                      size="sm"
	                    />
                  </div>
                </div>
              </div>
            );
          }
          
          // Normal state with company info
          return (
            <div className="space-y-4">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-foreground mb-4">{roleCompany.name}</h1>
                      {isEditingCompanyDescription ? (
                        <div>
                          <GrammarTextarea
                            value={companyDescriptionDraft}
                            onChange={(e) => setCompanyDescriptionDraft(e.target.value)}
                            className="min-h-[60px] text-muted-foreground resize-none"
                            placeholder="Enter company description..."
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-3">
                            <Button size="sm" onClick={handleSaveCompanyDescription}>
                              Save
                            </Button>
                            <Button variant="secondary" size="sm" onClick={handleCancelEditCompanyDescription}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                    ) : hasCompanyDescription ? (
                      <div 
                        className="flex items-center gap-2 group cursor-pointer"
                        onClick={() => setIsEditingCompanyDescription(true)}
                      >
                        <p className="text-muted-foreground flex-1">{roleCompany.description}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingCompanyDescription(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center gap-2 text-muted-foreground cursor-pointer"
                        onClick={() => setIsEditingCompanyDescription(true)}
                      >
                        <span className="text-sm italic">Company description not available</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingCompanyDescription(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Company Overflow Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={onAddRole}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Role
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleGenerateCompanyContent}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Content
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditCompany?.(roleCompany)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Company
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteCompanyClick(roleCompany)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Company
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Company Tags */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Company Tags</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {hasCompanyTags && roleCompany.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {hasCompanyTags && (
	                    <TagSuggestionButton
	                      content={`${roleCompany.name}: ${hasCompanyDescription ? roleCompany.description : 'Company information'}`}
	                      onTagsSuggested={() => {}}
	                      onClick={() => {
	                        handleCompanyTagSuggestions(roleCompany);
	                      }}
	                      variant="tertiary"
	                      size="sm"
	                    />
                  )}
                  {!hasCompanyTags && (
	                    <Badge 
	                      variant="outline" 
	                      className="text-xs cursor-pointer hover:bg-muted border-dashed"
	                      onClick={() => {
	                        handleCompanyTagSuggestions(roleCompany);
	                      }}
	                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add tag
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Navigation Tabs - Below Company Section */}
        <div className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex space-x-8">
              <button
                className={cn(
                  "flex items-center gap-2 py-4 px-1 border-b-4 font-medium text-sm transition-colors",
                  detailView === 'role' 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-[#E32D9A]"
                )}
                onClick={() => setTab('role')}
              >
                <User className="h-4 w-4" />
                Role
              </button>
              <button
                className={cn(
                  "flex items-center gap-2 py-4 px-1 border-b-4 font-medium text-sm transition-colors",
                  detailView === 'stories' 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-[#E32D9A]"
                )}
                onClick={() => setTab('stories')}
              >
                <FileText className="h-4 w-4" />
                Stories ({selectedRole.blurbs.length})
              </button>
              {ENABLE_EXTERNAL_LINKS && (
              <button
                className={cn(
                  "flex items-center gap-2 py-4 px-1 border-b-4 font-medium text-sm transition-colors",
                  detailView === 'links' 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-[#E32D9A]"
                )}
                onClick={() => setTab('links')}
              >
                <LinkIcon className="h-4 w-4" />
                Links ({selectedRole.externalLinks.length})
              </button>
              )}
            </div>
            
            {/* Dynamic CTA */}
            <div className="flex gap-2">
              {detailView === 'role' && onAddRole && (
                <Button onClick={onAddRole} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Role
                </Button>
              )}
              {detailView === 'stories' && onAddStory && (
                <Button onClick={onAddStory} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Story
                </Button>
              )}
              {ENABLE_EXTERNAL_LINKS && detailView === 'links' && onAddLink && (
                <Button onClick={onAddLink} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Role Details View */}
        {detailView === 'role' && (
          <div className="space-y-4">
            {/* Title with Overflow Menu - Inline */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground mb-2">{selectedRole.title}</h2>
                <div className="text-sm text-muted-foreground mb-4">
                  {formatDateRange(selectedRole.startDate, selectedRole.endDate)}
                </div>
              </div>
              
              {/* Role Actions Menu - Next to title */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEditRoleClick}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Role
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    // Trigger HIL workflow for role content generation
                    handleRoleDescriptionGenerate();
                  }}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Content
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDeleteRoleClick} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Role
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Role Description Card - Full Width */}
            {selectedRole.description && (
              <Card className={cn(
                "border w-full",
                // Show orange border only when description-specific gaps exist
                (() => {
	                  const descriptionGaps = (selectedRole as any).gaps?.filter((gap: any) => {
	                    return gap.gap_category?.includes('description') || 
	                           gap.gap_category === 'missing_role_description' ||
	                           gap.gap_category === 'generic_role_description' || // back-compat
	                           gap.gap_category === 'role_description_needs_specifics';
	                  }) || [];
                  return descriptionGaps.length > 0 && !resolvedGaps.has('role-description-gap');
                })() && "border-warning"
              )}>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    {selectedRole.description}
                  </p>
                  
                  {/* Role Description Gap Banner - only description-specific gaps */}
                  {(() => {
	                    const descriptionGaps = (selectedRole as any).gaps?.filter((gap: any) => {
	                      return gap.gap_category?.includes('description') || 
	                             gap.gap_category === 'missing_role_description' ||
	                             gap.gap_category === 'generic_role_description' || // back-compat
	                             gap.gap_category === 'role_description_needs_specifics';
	                    }) || [];
                    const descriptionGapCategories = descriptionGaps
                      .map(gap => gap.gap_category)
                      .filter(Boolean) as string[];
                    const descriptionGapSummary = descriptionGapCategories.length > 0
                      ? generateGapSummary(descriptionGapCategories, 'role_description')
                      : null;
                    
                    return descriptionGaps.length > 0 && !resolvedGaps.has('role-description-gap') ? (
                      <ContentGapBanner
                        gaps={descriptionGaps}
                        gapSummary={descriptionGapSummary}
                        onGenerateContent={() => handleRoleDescriptionGenerate()}
                        onDismiss={() => {
                          // Resolve all description gaps (use first gap's ID for DB, but keep local ID for state)
                          if (descriptionGaps.length > 0 && descriptionGaps[0].id) {
                            descriptionGaps.forEach(gap => {
                              if (gap.id) {
                                handleResolveGap(gap.id, 'role-description-gap');
                              }
                            });
                          }
                        }}
                        isResolved={resolvedGaps.has('role-description-gap')}
                      />
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}
            
            {/* Outcome Metrics */}
            <div>
              <Card id="role-metrics" className={cn(
                "border",
                // Show orange border only when metrics-specific gaps exist
                (() => {
                  const metricsGaps = (selectedRole as any).gaps?.filter((gap: any) => 
                    gap.gap_category === 'missing_role_metrics' || 
                    gap.gap_category === 'insufficient_role_metrics'
                  ) || [];
                  return metricsGaps.length > 0 && !resolvedGaps.has('role-metrics-gap');
                })() && "border-warning"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Outcome Metrics</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Always show OutcomeMetrics (it handles empty state internally) */}
                  <OutcomeMetrics
                    metrics={selectedRole.outcomeMetrics || []}
                  />
                  
                  {/* Role Metrics Gap Banner - only metrics-specific gaps */}
                  {(() => {
                    // Filter to only metrics-specific gap categories
                    const metricsGaps = (selectedRole as any).gaps?.filter((gap: any) => 
                      gap.gap_category === 'missing_role_metrics' || 
                      gap.gap_category === 'insufficient_role_metrics'
                    ) || [];
                    const metricsGapCategories = metricsGaps
                      .map(gap => gap.gap_category)
                      .filter(Boolean) as string[];
                    const metricsGapSummary = metricsGapCategories.length > 0
                      ? generateGapSummary(metricsGapCategories, 'role_metrics')
                      : null;
                    
                    return metricsGaps.length > 0 && !resolvedGaps.has('role-metrics-gap') ? (
                      <ContentGapBanner
                        gaps={metricsGaps}
                        gapSummary={metricsGapSummary}
                        onGenerateContent={() => handleRoleMetricsGenerate()}
                        onDismiss={() => {
                          // Resolve all metrics gaps (use first gap's ID for DB, but keep local ID for state)
                          if (metricsGaps.length > 0 && metricsGaps[0].id) {
                            metricsGaps.forEach(gap => {
                              if (gap.id) {
                                handleResolveGap(gap.id, 'role-metrics-gap');
                              }
                            });
                          }
                        }}
                        isResolved={resolvedGaps.has('role-metrics-gap')}
                      />
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            </div>
            
            {/* Role Tags */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Tags className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Role Tags</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedRole.tags.length > 0 && selectedRole.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {selectedRole.tags.length === 0 && (
                  <Badge 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-muted border-dashed"
                    onClick={handleEditRoleClick}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add tag
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stories View */}
        {detailView === 'stories' && selectedRole && (
              <div>
                {selectedRole.blurbs.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No stories yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first story to showcase your achievements in this role
                    </p>
                  </div>
                ) : (
                  <div>
                    {selectedRole.blurbs.map((story, index) => {
                      // Find linked external links for this story
                      const linkedLinks = (story.linkedExternalLinks || [])
                        .map(linkId => selectedRole.externalLinks?.find(link => link.id === linkId))
                        .filter(Boolean) as any[];
                      
                      return (
                        <div key={story.id} id={`story-${story.id}`} className={index > 0 ? "mt-6" : ""}>
	                          <StoryCard
	                            story={story}
	                            linkedLinks={linkedLinks}
                            onEdit={onEditStory}
                            onDuplicate={() => onDuplicateStory?.(story)}
                            onDelete={() => handleDeleteStoryClick(story)}
                            onDeleteVariation={handleDeleteVariation}
                            onTagSuggestions={(_tags) => {
                              handleStoryTagSuggestions(story);
                            }}
	                            isGapResolved={resolvedGaps.has(`story-content-gap-${story.id}`)}
	                            hasGaps={(story as any).hasGaps}
	                            gaps={(story as any).gaps}
	                            onGenerateContent={() => {
	                              // Always open HIL workflow, even if no gaps
                              handleStoryContentGenerate(story);
                            }}
                            onDismissGap={(story as any).hasGaps && !resolvedGaps.has(`story-content-gap-${story.id}`) ? () => {
                              // Resolve all story gaps using real database IDs
                              const storyGaps = (story as any).gaps || [];
                              if (storyGaps.length > 0) {
                                storyGaps.forEach((gap: any) => {
                                  if (gap.id) {
                                    handleResolveGap(gap.id, `story-content-gap-${story.id}`);
                                  }
                                });
                              }
                            } : undefined}
                          />
                      
                      {/* Success State - Story Content (only show if content was generated, not just dismissed) */}
                      {resolvedGaps.has(`story-content-generated-${story.id}`) && !dismissedSuccessCards.has(`story-content-generated-${story.id}`) && (
                        <div className="mt-4 border-success bg-success/5 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-success" />
                              <span className="font-medium text-success">Story Content Enhanced</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-success/10"
                              onClick={() => handleDismissSuccessCard(`story-content-generated-${story.id}`)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Content has been successfully generated and applied.
                          </p>
                        </div>
                      )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
        )}

        {/* Links View */}
        {ENABLE_EXTERNAL_LINKS && detailView === 'links' && selectedRole && (
              <div>
                {selectedRole.externalLinks.length === 0 ? (
                  <div className="text-center py-8">
                    <LinkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No links yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Add external links to provide supporting evidence for your stories
                    </p>
                  </div>
                ) : (
                  <div>
                    {selectedRole.externalLinks.map((link, index) => (
                      <div key={link.id} className={index > 0 ? "mt-6" : ""}>
                        <LinkCard
                          id={link.id}
                          label={link.label}
                          url={link.url}
                          tags={link.tags}
                          timesUsed={link.timesUsed}
                          lastUsed={link.lastUsed}
                          onEdit={() => onEditLink?.(link)}
                          onDuplicate={() => {}} // TODO: Implement link duplication
                          onDelete={() => {}} // TODO: Implement link deletion
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
        
        {/* Gap Detection Modal */}
        {activeGapContext?.entityType !== 'company' ? (
          <ContentGenerationModalV3Baseline
            isOpen={isContentGenerationModalOpen}
            onClose={handleCloseContentGenerationModal}
            gap={contentGenerationGap as any}
            onApplyContent={handleApplyContent}
            closeOnApply={false}
            userId={user?.id}
            entityType={activeGapContext?.entityType as any}
            entityId={activeGapContext?.entityId}
          />
        ) : null}

        {/* Tag Suggestion Modal - separate from gap detection */}
        <TagSuggestionModal
          isOpen={isTagModalOpen}
          onClose={() => {
            setIsTagModalOpen(false);
            setSuggestedTags([]);
            setOtherTags([]);
            setTagContent('');
            setSearchError(null);
            setIsSearching(false);
          }}
          content={tagContent}
          contentType={tagContentType}
          entityId={tagEntityId}
          existingTags={
            tagContentType === 'company'
              ? (selectedCompany?.tags || companies.find(c => c.id === tagEntityId)?.tags || [])
              : tagContentType === 'role'
              ? (selectedRole?.tags || [])
              : tagContentType === 'story'
              ? (selectedRole?.blurbs?.find((b) => b.id === tagEntityId)?.tags || [])
              : []
          }
          suggestedTags={suggestedTags}
          otherTags={otherTags}
          onApplyTags={handleApplyTags}
          isSearching={isSearching}
          searchError={searchError}
          onRetry={tagContentType === 'company' ? handleRetryCompanyTags : undefined}
        />

        {/* Delete Role Confirmation Dialog */}
        <AlertDialog open={isDeleteRoleDialogOpen} onOpenChange={setIsDeleteRoleDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Role</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedRole?.title}"?
                {deleteRoleStats && deleteRoleStats.stories > 0 && (
                  <span className="block mt-2 text-amber-600 font-medium">
                    This will also delete {deleteRoleStats.stories} {deleteRoleStats.stories === 1 ? 'story' : 'stories'}.
                  </span>
                )}
                <span className="block mt-2">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingRole}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteRole}
                disabled={isDeletingRole}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingRole ? 'Deleting...' : 'Delete Role'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Company Confirmation Dialog */}
        <AlertDialog open={isDeleteCompanyDialogOpen} onOpenChange={setIsDeleteCompanyDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Company</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteCompanyTarget?.name}"?
                {deleteCompanyStats && (deleteCompanyStats.roles > 0 || deleteCompanyStats.stories > 0) && (
                  <span className="block mt-2 text-amber-600 font-medium">
                    This will also delete {deleteCompanyStats.roles} {deleteCompanyStats.roles === 1 ? 'role' : 'roles'}
                    {deleteCompanyStats.stories > 0 && ` and ${deleteCompanyStats.stories} ${deleteCompanyStats.stories === 1 ? 'story' : 'stories'}`}.
                  </span>
                )}
                <span className="block mt-2">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingCompany}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteCompany}
                disabled={isDeletingCompany}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingCompany ? 'Deleting...' : 'Delete Company'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Story Confirmation Dialog */}
        <AlertDialog open={isDeleteStoryDialogOpen} onOpenChange={setIsDeleteStoryDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Story</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this story?
                <span className="block mt-2">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingStory}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteStory}
                disabled={isDeletingStory}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingStory ? 'Deleting...' : 'Delete Story'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Show company details if only company is selected (and no role is selected)
  // Note: With auto-selection, this should rarely appear, but handle it for edge cases
  if (selectedCompany && !selectedRole) {
    return (
      <div className="space-y-8 h-full flex flex-col">
        {/* Company Header - Clean, No Card Styling */}
        <div>
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-4">{selectedCompany.name}</h1>
                {selectedCompany.description && (
                  <p className="text-muted-foreground">{selectedCompany.description}</p>
                )}
              </div>
              
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onAddRole}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Role
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEditCompany?.(selectedCompany)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Company
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteCompanyClick(selectedCompany)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Company
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Company Tags - Clean Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Tags className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Company Tags</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-3">
            {selectedCompany.tags.length > 0 && selectedCompany.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {selectedCompany.tags.length === 0 && (
              <Badge 
                variant="outline" 
                className="text-xs cursor-pointer hover:bg-muted border-dashed"
                onClick={() => handleCompanyTagSuggestions()}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add tag
              </Badge>
            )}
            <TagSuggestionButton
              content={`${selectedCompany.name}: ${selectedCompany.description || 'Company information'}`}
              onTagsSuggested={() => {}}
              onClick={() => handleCompanyTagSuggestions()}
              variant="tertiary"
              size="sm"
            />
          </div>
        </div>

        {/* Roles Section - Cards Only */}
        <div className="flex-1">
          <div className="flex flex-col gap-6"> {/* Design system: 24px between role cards */}
            {selectedCompany.roles.map((role) => (
              <Card key={role.id} className="assessment-card cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors group" onClick={() => onRoleSelect?.(role)}>
                <CardContent className="assessment-card-content">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-lg text-foreground group-hover:text-primary-foreground">{role.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-primary-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDateRange(role.startDate, role.endDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="group-hover:bg-primary-foreground group-hover:text-primary group-hover:border-primary-foreground">
                        {role.blurbs.length === 0 ? '0 stories' : `${role.blurbs.length} story${role.blurbs.length === 1 ? '' : 's'}`}
                      </Badge>
                      <Badge variant="outline" className="group-hover:bg-primary-foreground group-hover:text-primary group-hover:border-primary-foreground">
                        {role.externalLinks?.length || 0} link{(role.externalLinks?.length || 0) === 1 ? '' : 's'}
                      </Badge>
                    </div>
                  </div>
                  
                  {role.description && (
                    <p className="text-muted-foreground group-hover:text-primary-foreground">{role.description}</p>
                  )}
                  
                  {role.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {role.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs group-hover:bg-primary-foreground group-hover:text-primary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Delete Role Confirmation Dialog */}
        <AlertDialog open={isDeleteRoleDialogOpen} onOpenChange={setIsDeleteRoleDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Role</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedRole?.title}"?
                {deleteRoleStats && deleteRoleStats.stories > 0 && (
                  <span className="block mt-2 text-amber-600 font-medium">
                    This will also delete {deleteRoleStats.stories} {deleteRoleStats.stories === 1 ? 'story' : 'stories'}.
                  </span>
                )}
                <span className="block mt-2">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingRole}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteRole}
                disabled={isDeletingRole}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingRole ? 'Deleting...' : 'Delete Role'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Company Confirmation Dialog */}
        <AlertDialog open={isDeleteCompanyDialogOpen} onOpenChange={setIsDeleteCompanyDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Company</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteCompanyTarget?.name}"?
                {deleteCompanyStats && (deleteCompanyStats.roles > 0 || deleteCompanyStats.stories > 0) && (
                  <span className="block mt-2 text-amber-600 font-medium">
                    This will also delete {deleteCompanyStats.roles} {deleteCompanyStats.roles === 1 ? 'role' : 'roles'}
                    {deleteCompanyStats.stories > 0 && ` and ${deleteCompanyStats.stories} ${deleteCompanyStats.stories === 1 ? 'story' : 'stories'}`}.
                  </span>
                )}
                <span className="block mt-2">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingCompany}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteCompany}
                disabled={isDeletingCompany}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingCompany ? 'Deleting...' : 'Delete Company'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Story Confirmation Dialog */}
        <AlertDialog open={isDeleteStoryDialogOpen} onOpenChange={setIsDeleteStoryDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Story</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this story?
                <span className="block mt-2">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingStory}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteStory}
                disabled={isDeletingStory}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingStory ? 'Deleting...' : 'Delete Story'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return null;
};
