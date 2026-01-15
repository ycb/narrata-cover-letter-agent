import { useState, useEffect, useRef } from "react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { GrammarInput } from "@/components/ui/grammar-input";
import { TagAutocompleteInput } from "@/components/ui/TagAutocompleteInput";
import { GrammarTextarea } from "@/components/ui/grammar-textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, X, BookOpen } from "lucide-react";
import { TemplateBlurbHierarchical } from "@/components/template-blurbs/TemplateBlurbHierarchical";
import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";
import { ContentGenerationModalV3Baseline } from "@/components/hil/ContentGenerationModalV3Baseline";
import { isHilV3Enabled } from "@/utils/featureFlags";
import { CoverLetterTemplateService, type SavedSection } from "@/services/coverLetterTemplateService";
import { useUserGoals } from "@/contexts/UserGoalsContext";
import { useAuth } from "@/contexts/AuthContext";
import { TagSuggestionService } from "@/services/tagSuggestionService";
import { TagService } from "@/services/tagService";
import { UserTagService } from "@/services/userTagService";
import { GapDetectionService } from "@/services/gapDetectionService";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useToast } from "@/hooks/use-toast";
import { SyntheticUserService } from "@/services/syntheticUserService";
import { useTour } from "@/contexts/TourContext";
import { TourBannerFull } from "@/components/onboarding/TourBannerFull";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSearchParams } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { addUserTag, mergeUserTags, removeUserTag } from "@/lib/userTags";
import { CoverLetterVariationService } from "@/services/coverLetterVariationService";

type SavedSectionItem = {
  id: string;
  type: 'intro' | 'body' | 'closer' | 'signature';
  title: string;
  content: string;
  tags: string[];
  isDefault?: boolean;
  timesUsed: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
  hasGaps?: boolean;
  gapCount?: number;
  gapCategories?: string[];
  maxGapSeverity?: 'high' | 'medium' | 'low';
  status?: 'approved' | 'draft' | 'needs-review';
  confidence?: 'high' | 'medium' | 'low';
  linkedExternalLinks?: string[];
  externalLinks?: string[];
  variations?: Array<{
    id: string;
    content: string;
    createdAt: string;
    createdBy?: string;
    gapTags?: string[];
    developedForJobTitle?: string;
    developedForCompany?: string;
  }>;
};

type HierarchicalBlurb = ComponentProps<typeof TemplateBlurbHierarchical>['blurbs'][number] & {
  hasGaps?: boolean;
  gapCount?: number;
  linkedExternalLinks?: string[];
  externalLinks?: string[];
  gapCategories?: string[];
  maxGapSeverity?: 'high' | 'medium' | 'low';
};

export default function SavedSections() {
  const { user } = useAuth();
  const { goals } = useUserGoals();
  const { toast } = useToast();
  const { isActive: isTourActive, currentStep: tourStep, tourSteps, currentTourStep, nextStep, previousStep, cancelTour } = useTour();
  const [searchParams, setSearchParams] = useSearchParams();
  const [savedSections, setSavedSections] = useState<SavedSectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingSection, setIsEditingSection] = useState(false);
  const [editingSection, setEditingSection] = useState<SavedSectionItem | null>(null);
  const [sectionTagInput, setSectionTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAddReusableContentModal, setShowAddReusableContentModal] = useState(false);
  const [newReusableContent, setNewReusableContent] = useState({ title: '', content: '', tags: '', contentType: '' });

  // HIL Content Generation state
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [selectedGap, setSelectedGap] = useState<any>(null);
  const hilV3BaselineOn = isHilV3Enabled();
  const [hilEntityContext, setHilEntityContext] = useState<{
    entityId: string;
    savedSectionType: 'introduction' | 'closer' | 'signature' | 'custom';
  } | null>(null);
  const [resolvedGaps, setResolvedGaps] = useState<Set<string>>(new Set());
  const [dismissedSuccessCards, setDismissedSuccessCards] = useState<Set<string>>(new Set());

  // Tag suggestion state
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagContent, setTagContent] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<any[]>([]);
  const [otherTags, setOtherTags] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [tagEntityId, setTagEntityId] = useState<string | undefined>();
  const [existingTags, setExistingTags] = useState<string[]>([]);

  // Section label editing state
  const [isEditingSectionLabel, setIsEditingSectionLabel] = useState(false);
  const [editingSectionType, setEditingSectionType] = useState<string | null>(null);
  const [editingSectionLabel, setEditingSectionLabel] = useState('');
  const [isDeletingVariation, setIsDeletingVariation] = useState(false);
  const [isDuplicatingSection, setIsDuplicatingSection] = useState(false);

  const mountedRef = useRef(true);
  const savedSectionContentRef = useRef<HTMLTextAreaElement | null>(null);
  const newSavedSectionContentRef = useRef<HTMLTextAreaElement | null>(null);

  const insertTokenIntoTextarea = (
    textarea: HTMLTextAreaElement | null,
    currentContent: string,
    tokenText: string,
    apply: (nextContent: string) => void
  ) => {
    const selectionStart = textarea?.selectionStart ?? currentContent.length;
    const selectionEnd = textarea?.selectionEnd ?? currentContent.length;

    const nextContent =
      currentContent.slice(0, selectionStart) +
      tokenText +
      currentContent.slice(selectionEnd);

    apply(nextContent);

    requestAnimationFrame(() => {
      const el = textarea;
      if (!el) return;
      el.focus();
      const nextPos = selectionStart + tokenText.length;
      el.setSelectionRange(nextPos, nextPos);
    });
  };

  const insertTokenIntoEditingSectionContent = (tokenText: string) => {
    insertTokenIntoTextarea(
      savedSectionContentRef.current,
      editingSection?.content ?? "",
      tokenText,
      (nextContent) => setEditingSection((prev) => (prev ? { ...prev, content: nextContent } : prev))
    );
  };

  const insertTokenIntoNewSectionContent = (tokenText: string) => {
    insertTokenIntoTextarea(
      newSavedSectionContentRef.current,
      newReusableContent.content,
      tokenText,
      (nextContent) => setNewReusableContent((prev) => ({ ...prev, content: nextContent }))
    );
  };
  const deepLinkHandledRef = useRef(false);

  // Load saved sections from database
  useEffect(() => {
    mountedRef.current = true;

    const loadSavedSections = async () => {
      if (!user?.id) {
        if (mountedRef.current) {
          setSavedSections([]);
          setError(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const syntheticUserService = new SyntheticUserService();
        const syntheticContext = await syntheticUserService.getSyntheticUserContext();

        const profileId = syntheticContext.isSyntheticTestingEnabled
          ? syntheticContext.currentUser?.profileId
          : undefined;

        const sections = await CoverLetterTemplateService.getUserSavedSections(user.id, profileId);

        let savedSectionGapIndex = new Map<
          string,
          { gapCount: number; categories: string[]; maxSeverity: "high" | "medium" | "low" }
        >();

        try {
          const gapSummary = await GapDetectionService.getContentItemsWithGaps(user.id, profileId);
          const savedSectionGaps = gapSummary.byContentType.coverLetterSavedSections || [];
          savedSectionGapIndex = new Map(
            savedSectionGaps.map((item) => [
              item.entity_id,
              {
                // Gap count: 1 if item has any gaps, 0 otherwise (per-item basis, not per-gap)
                gapCount: (item.gap_categories?.length ?? 0) > 0 ? 1 : 0,
                categories: item.gap_categories ?? [],
                maxSeverity: item.max_severity ?? "low"
              }
            ])
          );
        } catch (gapError) {
          console.warn(
            "[SavedSections] Gap summary unavailable (using defaults).",
            gapError
          );
        }

        if (!mountedRef.current) {
          return;
        }

        const sectionIds = sections.map((section) => section.id).filter(Boolean) as string[];
        const variationsByParent = new Map<
          string,
          Array<{
            id: string;
            content: string;
            createdAt: string;
            createdBy?: string;
            gapTags?: string[];
            developedForJobTitle?: string;
            developedForCompany?: string;
          }>
        >();

        if (sectionIds.length > 0) {
          const { data: variations, error: variationsError } = await supabase
            .from('content_variations')
            .select('id, parent_entity_id, content, created_at, created_by, gap_tags, target_job_title, target_company')
            .eq('user_id', user.id)
            .eq('parent_entity_type', 'saved_section')
            .in('parent_entity_id', sectionIds)
            .order('created_at', { ascending: false });

          if (variationsError) {
            console.warn('[SavedSections] Failed to load saved section variations:', variationsError);
          } else {
            (variations || []).forEach((variation: any) => {
              const parentId = variation.parent_entity_id;
              if (!parentId) return;
              const list = variationsByParent.get(parentId) || [];
              list.push({
                id: variation.id,
                content: variation.content,
                createdAt: variation.created_at,
                createdBy: variation.created_by ?? undefined,
                gapTags: variation.gap_tags ?? [],
                developedForJobTitle: variation.target_job_title ?? undefined,
                developedForCompany: variation.target_company ?? undefined,
              });
              variationsByParent.set(parentId, list);
            });
          }
        }

        const sectionItems: SavedSectionItem[] = sections.map((section) => ({
          id: section.id!,
          type: section.type as SavedSectionItem["type"],
          title: section.title,
          content: section.content,
          tags: Array.from(new Set([...(section.tags ?? []), ...(section.purpose_tags ?? [])])),
          isDefault: (section.type as string) === "intro",
          status: "approved" as const,
          confidence: "high" as const,
          timesUsed: section.times_used || 0,
          lastUsed: section.last_used,
          createdAt: section.created_at!,
          updatedAt: section.updated_at!,
          hasGaps: (savedSectionGapIndex.get(section.id!)?.gapCount ?? 0) > 0,
          gapCount: savedSectionGapIndex.get(section.id!)?.gapCount ?? 0,
          gapCategories: savedSectionGapIndex.get(section.id!)?.categories ?? [],
          maxGapSeverity: savedSectionGapIndex.get(section.id!)?.maxSeverity,
          linkedExternalLinks: [],
          externalLinks: [],
          variations: variationsByParent.get(section.id!) ?? []
        }));

        setSavedSections(sectionItems);
      } catch (err) {
        if (!mountedRef.current) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Failed to load saved sections";
        setError(`Failed to load saved sections: ${message}`);
        setSavedSections([]);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadSavedSections();

    return () => {
      mountedRef.current = false;
    };
  }, [user?.id]);

  // Deep link: open a specific saved section from `?sectionId=...`
  useEffect(() => {
    if (deepLinkHandledRef.current) return;
    const sectionId = searchParams.get("sectionId");
    if (!sectionId) return;
    if (isLoading) return;

    const section = savedSections.find((s) => s.id === sectionId);
    if (!section) return;

    deepLinkHandledRef.current = true;
    setEditingSection({ ...section, tags: [...(section.tags ?? [])] });
    setSectionTagInput("");
    setIsEditingSection(true);

    // Remove the param so refresh/back doesn't keep re-opening the modal
    searchParams.delete("sectionId");
    setSearchParams(searchParams, { replace: true });
  }, [isLoading, savedSections, searchParams, setSearchParams]);

  const handleSelectSectionFromLibrary = (_section: HierarchicalBlurb) => {
    // Reserved for future interactions when selecting a saved section from the library.
  };

  const handleEditSection = (section: HierarchicalBlurb) => {
    const existing = savedSections.find((item) => item.id === section.id);
    const draft: SavedSectionItem = existing
      ? { ...existing, tags: [...(existing.tags ?? [])] }
      : {
          id: section.id,
          type: section.type as SavedSectionItem["type"],
          title: section.title ?? "",
          content: section.content ?? "",
          tags: [...(section.tags ?? [])],
          isDefault: false,
          timesUsed: section.timesUsed ?? 0,
          lastUsed: section.lastUsed,
          createdAt: section.createdAt ?? new Date().toISOString(),
          updatedAt: section.updatedAt ?? new Date().toISOString(),
          hasGaps: section.hasGaps,
          gapCount: section.gapCount,
          gapCategories: section.gapCategories,
          maxGapSeverity: section.maxGapSeverity,
          status: section.status,
          confidence: section.confidence,
          linkedExternalLinks: section.linkedExternalLinks ?? [],
          externalLinks: section.externalLinks ?? []
        };

    setEditingSection({ ...draft, tags: [...(draft.tags ?? [])] });
    setSectionTagInput("");
    setIsEditingSection(true);
  };

  const handleCreateSection = (type?: 'intro' | 'body' | 'closer' | 'signature' | string) => {
    if (type) {
      setNewReusableContent(prev => ({ ...prev, contentType: type }));
      setShowAddReusableContentModal(true);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!user?.id) return;

    try {
      await CoverLetterTemplateService.deleteSavedSection(id);
      setSavedSections(prev => prev.filter(section => section.id !== id));
    } catch (err) {
      console.error('Error deleting saved section:', err);
      toast({
        title: 'Unable to delete saved section',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  // New handler for editing section labels (parent level)
  const handleEditSectionLabel = (type: string, currentLabel: string) => {
    setEditingSectionType(type);
    setEditingSectionLabel(currentLabel);
    setIsEditingSectionLabel(true);
  };

  // New handler for deleting entire section (parent level)
  const handleDeleteSectionType = async (type: string) => {
    if (!user?.id) return;

    // Find all sections of this type
    const sectionsToDelete = savedSections.filter(s => s.type === type);

    if (sectionsToDelete.length === 0) return;

    // Confirm deletion
    if (!window.confirm(`Delete all ${sectionsToDelete.length} ${type} sections? This cannot be undone.`)) {
      return;
    }

    try {
      // Delete all sections of this type
      await Promise.all(
        sectionsToDelete.map(section =>
          CoverLetterTemplateService.deleteSavedSection(section.id)
        )
      );

      setSavedSections(prev => prev.filter(section => section.type !== type));

      toast({
        title: 'Section deleted',
        description: `Deleted ${sectionsToDelete.length} ${type} section(s).`,
      });
    } catch (err) {
      console.error('Error deleting sections:', err);
      toast({
        title: 'Unable to delete sections',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleAddSectionTag = () => {
    if (!editingSection) return;
    const nextTags = addUserTag(editingSection.tags ?? [], sectionTagInput);
    if (nextTags === editingSection.tags) {
      setSectionTagInput('');
      return;
    }

    setEditingSection({
      ...editingSection,
      tags: nextTags,
    });
    setSectionTagInput('');
  };

  const handleRemoveSectionTag = (tagToRemove: string) => {
    if (!editingSection) return;
    setEditingSection({
      ...editingSection,
      tags: removeUserTag(editingSection.tags ?? [], tagToRemove),
    });
  };

  const handleCancelEditSection = () => {
    setIsEditingSection(false);
    setEditingSection(null);
    setSectionTagInput('');
  };

  const handleSaveSection = async () => {
    if (!editingSection || !user?.id) return;

    try {
      const normalizedTags = mergeUserTags(editingSection.tags ?? []);
      const updated = await CoverLetterTemplateService.updateSavedSection(editingSection.id, {
        title: editingSection.title,
        content: editingSection.content,
        tags: normalizedTags
      });

      if (normalizedTags.length > 0) {
        await UserTagService.upsertTags(user.id, normalizedTags, 'saved_section');
      }

      const updatedTimestamp = updated.updated_at ?? new Date().toISOString();
      const updatedId = updated.id ?? editingSection.id;

      setSavedSections((prev) =>
        prev.map((section) =>
          section.id === updatedId
            ? {
                ...section,
                title: updated.title ?? editingSection.title,
                content: updated.content ?? editingSection.content,
                tags: updated.tags ?? editingSection.tags ?? [],
                updatedAt: updatedTimestamp
              }
            : section
        )
      );

      toast({
        title: "Saved section updated",
        description: "Your changes have been saved."
      });

      handleCancelEditSection();
    } catch (err) {
      console.error("Error updating saved section:", err);
      toast({
        title: "Unable to update saved section",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatGapCategory = (category: string) =>
    category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const handleGenerateContent = (section: HierarchicalBlurb) => {
    const rawType = String(section.type ?? '').toLowerCase();
    const savedSectionType =
      rawType === 'intro' || rawType === 'introduction'
        ? 'introduction'
        : rawType === 'closer' || rawType === 'closing' || rawType === 'conclusion'
          ? 'closer'
          : rawType === 'signature'
            ? 'signature'
            : 'custom';

    setHilEntityContext({ entityId: section.id, savedSectionType });

    const categories = (section.gapCategories ?? []) as string[];
    const formattedCategories = categories.map(formatGapCategory);
    const severity = (section.maxGapSeverity ?? "medium") as "high" | "medium" | "low";

    const description =
      formattedCategories.length > 0
        ? `This section can be improved by addressing: ${formattedCategories.join(', ')}.`
        : "This section can be strengthened with more specific, outcome-driven language.";

    const suggestion =
      formattedCategories.length > 0
        ? `Add detail that directly speaks to ${formattedCategories.join(', ').toLowerCase()}.`
        : "Include quantifiable results and tailor the copy to the target role or company.";

    setSelectedGap({
      id: `saved-section-gap-${section.id}`,
      type: 'content-enhancement',
      severity,
      description,
      suggestion,
      paragraphId: section.type,
      origin: 'library',
      existingContent: section.content
    });
    setIsContentModalOpen(true);
  };

  const handleApplyContent = (content: string) => {
    
    if (selectedGap && selectedGap.origin === 'library') {
      // Update the saved section content
      setSavedSections(prev => prev.map(section => 
        section.id === selectedGap.id.replace('saved-section-gap-', '') 
          ? { ...section, content: content, updatedAt: new Date().toISOString() }
          : section
      ));
    }
    
    // Add to resolved gaps
    setResolvedGaps(prev => new Set([...prev, selectedGap.id]));
    
    // Close modal after a delay
    setTimeout(() => {
      setIsContentModalOpen(false);
      setSelectedGap(null);
    }, 1000);
  };

  const handleDismissSuccessCard = (gapId: string) => {
    setDismissedSuccessCards(prev => new Set([...prev, gapId]));
  };

  // NOTE: Saved section tag suggestions removed
  // Tags are auto-generated when creating content to address gaps (using gapContext)
  // This happens automatically during HIL content creation flow

  const handleSavedSectionTagSuggestions = async (section: any) => {
    if (!user?.id) return;

    setTagEntityId(section.id);
    setExistingTags(section.tags || []);
    setTagContent(`${section.title}: ${section.content}`);
    setSuggestedTags([]);
    setOtherTags([]);
    setSearchError(null);
    setIsSearching(true);
    setIsTagModalOpen(true);

    try {
      const suggestions = await TagSuggestionService.suggestTags(
        {
          content: `${section.title}: ${section.content}`,
          contentType: 'saved_section',
          existingTags: section.tags || [],
        },
        user.id
      );

      const highConfidence = suggestions.filter((t) => t.confidence === 'high');
      const otherConfidence = suggestions.filter((t) => t.confidence !== 'high');
      setSuggestedTags(highConfidence);
      setOtherTags(otherConfidence);
    } catch (error) {
      console.error('Error suggesting tags:', error);
      setSearchError(error instanceof Error ? error.message : 'Failed to suggest tags. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle applying selected tags
  const handleApplyTags = async (selectedTags: string[]) => {
    if (!user || !tagEntityId) return;
    
    try {
      // Merge with existing tags
      const allTags = [...new Set([...existingTags, ...selectedTags])];
      await TagService.updateSavedSectionTags(tagEntityId, allTags, user.id);
      
      // Update local state
      setSavedSections(prev => prev.map(section => 
        section.id === tagEntityId 
          ? { ...section, tags: allTags, updatedAt: new Date().toISOString() }
          : section
      ));
      
    setIsTagModalOpen(false);
    setSuggestedTags([]);
    setTagContent('');
      setTagEntityId(undefined);
      setExistingTags([]);
    } catch (error) {
      console.error('Error updating tags:', error);
      // Error handling could be added here
    }
  };

  const hierarchicalSections = savedSections.map((section) => ({
    id: section.id,
    type: section.type,
    title: section.title,
    content: section.content,
    status: 'approved' as const,
    confidence: 'high' as const,
    tags: section.tags,
    timesUsed: section.timesUsed,
    lastUsed: section.lastUsed,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
    hasGaps: section.hasGaps,
    gapCount: section.gapCount,
    gapCategories: section.gapCategories,
    maxGapSeverity: section.maxGapSeverity,
    is_dynamic: section.is_dynamic,
    variations: section.variations ?? []
  }));

  const handleDeleteVariation = async (variationId: string, parentId: string) => {
    if (!user?.id || isDeletingVariation) return;
    const confirmed = window.confirm("Delete this variation?");
    if (!confirmed) return;

    setIsDeletingVariation(true);
    try {
      await CoverLetterVariationService.deleteVariation(variationId);
      setSavedSections(prev =>
        prev.map(section =>
          section.id === parentId
            ? {
                ...section,
                variations: (section.variations || []).filter(v => v.id !== variationId),
              }
            : section
        )
      );
      toast({
        title: "Variation deleted",
        description: "This variation has been removed.",
      });
    } catch (error) {
      console.error("[SavedSections] Failed to delete variation:", error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingVariation(false);
    }
  };

  const handleDuplicateSection = async (section: SavedSectionItem) => {
    if (!user?.id || isDuplicatingSection) return;
    setIsDuplicatingSection(true);
    try {
      const duplicated = await CoverLetterTemplateService.createSavedSection({
        user_id: user.id,
        type: section.type,
        title: `${section.title} (Copy)`,
        content: section.content,
        tags: section.tags ?? [],
        times_used: 0,
        last_used: undefined,
      });

      const createdAt = duplicated.created_at ?? new Date().toISOString();
      const newItem: SavedSectionItem = {
        id: duplicated.id!,
        type: duplicated.type as SavedSectionItem["type"],
        title: duplicated.title,
        content: duplicated.content,
        tags: duplicated.tags ?? [],
        isDefault: duplicated.type === "intro",
        status: "approved" as const,
        confidence: "high" as const,
        timesUsed: duplicated.times_used ?? 0,
        lastUsed: duplicated.last_used ?? undefined,
        createdAt,
        updatedAt: duplicated.updated_at ?? createdAt,
        hasGaps: false,
        gapCount: 0,
        gapCategories: [],
        maxGapSeverity: undefined,
        linkedExternalLinks: [],
        externalLinks: [],
        variations: [],
      };

      setSavedSections(prev => [newItem, ...prev]);
      toast({
        title: "Section duplicated",
        description: "A copy has been added to your saved sections.",
      });
    } catch (error) {
      console.error("[SavedSections] Failed to duplicate section:", error);
      toast({
        title: "Duplicate failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDuplicatingSection(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Saved Sections</h1>
        <p className="text-muted-foreground mb-6">
          Manage your reusable cover letter sections
        </p>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingState isLoading loadingText="Loading saved sections..." />
          </div>
        ) : savedSections.length === 0 ? (
          <EmptyState
            title="No saved sections found for this profile."
            description="Upload a cover letter for this persona (e.g. P01) or create a new section manually to populate your library."
            action={{
              label: "Create New Section",
              onClick: () => {
                setNewReusableContent({ title: '', content: '', tags: '', contentType: '' });
                setShowAddReusableContentModal(true);
              }
            }}
          />
        ) : (
          <TemplateBlurbHierarchical
            blurbs={hierarchicalSections}
            selectedBlurbId={undefined}
            onSelectBlurb={handleSelectSectionFromLibrary}
            onCreateBlurb={handleCreateSection}
            onEditBlurb={handleEditSection}
            onEditSectionLabel={handleEditSectionLabel}
            onDeleteBlurb={handleDeleteSection}
            onDuplicateBlurb={handleDuplicateSection}
            onDeleteVariation={handleDeleteVariation}
            onDeleteSection={handleDeleteSectionType}
            onGenerateContent={handleGenerateContent}
            onTagSuggestions={handleSavedSectionTagSuggestions}
            resolvedGaps={resolvedGaps}
            dismissedSuccessCards={dismissedSuccessCards}
            onDismissSuccessCard={handleDismissSuccessCard}
            contentTypes={[
                    {
                      type: 'intro',
                      label: 'Introduction',
                      description: 'Opening paragraphs that grab attention',
                      icon: FileText,
                      count: savedSections.filter(s => s.type === 'intro').length
              },
              {
                type: 'body',
                label: 'Body Paragraph',
                description: 'Supporting paragraphs from uploaded cover letter',
                      icon: BookOpen,
                      count: savedSections.filter(s => s.type === 'body').length
                    },
                    {
                      type: 'closer',
                      label: 'Closing',
                description: 'Closing paragraphs that reinforce your interest',
                      icon: CheckCircle,
                      count: savedSections.filter(s => s.type === 'closer').length
                    }
                  ]}
                />
        )}
      </div>

      {/* Edit Section Label Modal (Parent Level) */}
      {isEditingSectionLabel && editingSectionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Edit Section Label</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Update the display name for this section type.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsEditingSectionLabel(false);
                  setEditingSectionType(null);
                  setEditingSectionLabel('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="section-label">Section Label</Label>
                <GrammarInput
                  id="section-label"
                  value={editingSectionLabel}
                  onChange={(e) => setEditingSectionLabel(e.target.value)}
                  placeholder="e.g., Introduction, Body Paragraph"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingSectionLabel(false);
                    setEditingSectionType(null);
                    setEditingSectionLabel('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Note: This would update the contentTypes prop labels
                    // For now, just close the modal as labels are static in contentTypes
                    toast({
                      title: 'Section label customization',
                      description: 'Section label customization will be available in a future update.',
                      variant: 'default'
                    });
                    setIsEditingSectionLabel(false);
                    setEditingSectionType(null);
                    setEditingSectionLabel('');
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Saved Section Modal */}
      {isEditingSection && editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Edit Saved Section</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Update the title, content, and tags for this reusable section.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCancelEditSection}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="saved-section-title">Title</Label>
                <GrammarInput
                  id="saved-section-title"
                  value={editingSection.title}
                  onChange={(event) =>
                    setEditingSection((prev) =>
                      prev
                        ? {
                            ...prev,
                            title: event.target.value
                          }
                        : prev
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="saved-section-content">Content</Label>
                <div className="flex items-center mt-0.5">
                  <TooltipProvider>
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger
                            aria-label="Insert token"
                            className="inline-flex items-center justify-center rounded-md border bg-muted text-muted-foreground font-mono text-[0.5rem] p-1 w-8 h-8 hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            [...]
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Insert token</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="start" className="w-80">
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          insertTokenIntoEditingSectionContent("[COMPANY-NAME]");
                        }}
                        className="flex flex-col items-start gap-1"
                      >
                        <div className="font-mono text-sm">[COMPANY-NAME]</div>
                        <div className="text-xs text-muted-foreground">Extracted from current JD</div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          insertTokenIntoEditingSectionContent("[ROLE]");
                        }}
                        className="flex flex-col items-start gap-1"
                      >
                        <div className="font-mono text-sm">[ROLE]</div>
                        <div className="text-xs text-muted-foreground">Extracted from current JD</div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          insertTokenIntoEditingSectionContent(
                            '[LLM: INSERT JD-SPECIFIC SUMMARY OF MY MOST RELEVANT SKILLS/EXPERIENCE. Ex: "simplify complex workflows and enhance user satisfaction"]'
                          );
                        }}
                        className="flex flex-col items-start gap-1"
                      >
                        <div className="font-mono text-sm">[LLM: …]</div>
                        <div className="text-xs text-muted-foreground">Add custom instructions</div>
                      </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipProvider>
                </div>
                <GrammarTextarea
                  id="saved-section-content"
                  ref={savedSectionContentRef}
                  value={editingSection.content}
                  onChange={(event) =>
                    setEditingSection((prev) =>
                      prev
                        ? {
                            ...prev,
                            content: event.target.value
                          }
                        : prev
                    )
                  }
                  placeholder="Enter the section content..."
                  rows={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="saved-section-tags">Tags</Label>
                <div className="flex gap-2">
                  <TagAutocompleteInput
                    id="saved-section-tags"
                    value={sectionTagInput}
                    onChange={(event) => setSectionTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddSectionTag();
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                    category="saved_section"
                    localTags={editingSection?.tags ?? []}
                    useGrammarInput
                  />
                  <Button type="button" variant="secondary" onClick={handleAddSectionTag}>
                    Add
                  </Button>
                </div>

                {editingSection.tags && editingSection.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {editingSection.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        <span>{tag}</span>
                        <button
                          type="button"
                          className="ml-1 text-muted-foreground transition hover:text-destructive"
                          onClick={() => handleRemoveSectionTag(tag)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={handleCancelEditSection}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSection}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HIL Content Generation Modal */}
      {isContentModalOpen && selectedGap && (
        hilV3BaselineOn ? (
          <ContentGenerationModalV3Baseline
            gap={selectedGap}
            isOpen={isContentModalOpen}
            onClose={() => {
              setIsContentModalOpen(false);
              setSelectedGap(null);
              setHilEntityContext(null);
            }}
            onApplyContent={handleApplyContent}
            userId={user?.id}
            entityType="saved_section"
            entityId={hilEntityContext?.entityId}
            savedSectionType={hilEntityContext?.savedSectionType}
          />
        ) : (
          <ContentGenerationModal
            gap={selectedGap}
            isOpen={isContentModalOpen}
            onClose={() => {
              setIsContentModalOpen(false);
              setSelectedGap(null);
              setHilEntityContext(null);
            }}
            onApplyContent={handleApplyContent}
          />
        )
      )}

	      {/* Add Reusable Content Modal */}
	      {showAddReusableContentModal && (
	        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
	          <div className="w-full max-w-2xl max-h-[90vh] bg-background rounded-lg shadow-2xl overflow-hidden flex flex-col">
	            <div className="flex items-center justify-between p-6 border-b">
	              <div>
	                <h2 className="text-2xl font-bold">Add New Saved Section</h2>
	                <p className="text-muted-foreground">
	                  Create a new reusable section for your cover letters
	                </p>
	              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddReusableContentModal(false);
                  setNewReusableContent({ title: '', content: '', tags: '', contentType: '' });
                }}
                className="h-8 w-8 p-0"
              >
	                <X className="h-4 w-4" />
	              </Button>
	            </div>
	            
	            <div className="p-6 overflow-y-auto flex-1">
	              <div className="space-y-4">
	                <div>
	                  <Label htmlFor="content-type">Section Type</Label>
	                  <GrammarInput
	                    id="content-type"
                    value={newReusableContent.contentType}
                    onChange={(e) => setNewReusableContent(prev => ({ ...prev, contentType: e.target.value }))}
                    placeholder="e.g., intro, closer, signature"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="title">Title</Label>
                  <GrammarInput
                    id="title"
                    value={newReusableContent.title}
                    onChange={(e) => setNewReusableContent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Professional Opening"
                    className="mt-2"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <div className="flex items-center mt-0.5">
                    <TooltipProvider>
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger
                              aria-label="Insert token"
                              className="inline-flex items-center justify-center rounded-md border bg-muted text-muted-foreground font-mono text-[0.5rem] p-1 w-8 h-8 hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              [...]
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Insert token</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="start" className="w-80">
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            insertTokenIntoNewSectionContent("[COMPANY-NAME]");
                          }}
                          className="flex flex-col items-start gap-1"
                        >
                          <div className="font-mono text-sm">[COMPANY-NAME]</div>
                          <div className="text-xs text-muted-foreground">Extracted from current JD</div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            insertTokenIntoNewSectionContent("[ROLE]");
                          }}
                          className="flex flex-col items-start gap-1"
                        >
                          <div className="font-mono text-sm">[ROLE]</div>
                          <div className="text-xs text-muted-foreground">Extracted from current JD</div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            insertTokenIntoNewSectionContent(
                              '[LLM: INSERT JD-SPECIFIC SUMMARY OF MY MOST RELEVANT SKILLS/EXPERIENCE. Ex: "simplify complex workflows and enhance user satisfaction"]'
                            );
                          }}
                          className="flex flex-col items-start gap-1"
                        >
                          <div className="font-mono text-sm">[LLM: …]</div>
                          <div className="text-xs text-muted-foreground">Add custom instructions</div>
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TooltipProvider>
                  </div>
                  <GrammarTextarea
                    id="content"
                    ref={newSavedSectionContentRef}
                    value={newReusableContent.content}
                    onChange={(e) => setNewReusableContent(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter your section content here..."
                    rows={6}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <GrammarInput
                    id="tags"
                    value={newReusableContent.tags}
                    onChange={(e) => setNewReusableContent(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g., professional, technical, leadership"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separate tags with commas
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAddReusableContentModal(false);
                    setNewReusableContent({ title: '', content: '', tags: '', contentType: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!user?.id) return;

                    try {
                      // Create saved section in database
                      const newSection: SavedSection = {
                        user_id: user.id,
                        type: newReusableContent.contentType as 'intro' | 'body' | 'closer' | 'signature' | 'other',
                        title: newReusableContent.title,
                        content: newReusableContent.content,
                        tags: newReusableContent.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                        times_used: 0
                      };

                      const createdSection = await CoverLetterTemplateService.createSavedSection(newSection);

                      // Convert to SavedSectionItem for UI
                      const newSectionItem: SavedSectionItem = {
                        id: createdSection.id!,
                        type: createdSection.type as SavedSectionItem['type'],
                        title: createdSection.title,
                        content: createdSection.content,
                        tags: createdSection.tags ?? [],
                        timesUsed: createdSection.times_used ?? 0,
                        lastUsed: createdSection.last_used ?? undefined,
                        createdAt: createdSection.created_at!,
                        updatedAt: createdSection.updated_at!,
                        hasGaps: false, // Newly created sections have no gaps
                        gapCount: 0,
                        gapCategories: [],
                        maxGapSeverity: 'low'
                      };

                      setSavedSections(prev => [...prev, newSectionItem]);
                      setShowAddReusableContentModal(false);
                      setNewReusableContent({ title: '', content: '', tags: '', contentType: '' });
                    } catch (err) {
                      console.error('Error creating saved section:', err);
                      alert('Failed to create saved section');
                    }
                  }}
                  disabled={!newReusableContent.title || !newReusableContent.content || !newReusableContent.contentType}
                >
                  Create Section
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Suggestion Modal */}
      {isTagModalOpen && (
        <ContentGenerationModal
          mode="tag-suggestion"
          content={tagContent}
          contentType="saved_section"
          entityId={tagEntityId}
          existingTags={existingTags}
          suggestedTags={suggestedTags}
          otherTags={otherTags}
          isSearching={isSearching}
          searchError={searchError}
          onRetry={
            tagEntityId
              ? () => {
                  const section = hierarchicalSections.find((s) => s.id === tagEntityId);
                  if (section) handleSavedSectionTagSuggestions(section as any);
                }
              : undefined
          }
          isOpen={isTagModalOpen}
          onClose={() => {
            setIsTagModalOpen(false);
            setSuggestedTags([]);
            setOtherTags([]);
            setTagContent('');
            setTagEntityId(undefined);
            setExistingTags([]);
            setIsSearching(false);
            setSearchError(null);
          }}
          onApplyTags={handleApplyTags}
        />
      )}

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
