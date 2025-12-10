import { useState, useEffect, useRef } from "react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, X, BookOpen } from "lucide-react";
import { TemplateBlurbHierarchical } from "@/components/template-blurbs/TemplateBlurbHierarchical";
import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";
import { CoverLetterTemplateService, type SavedSection } from "@/services/coverLetterTemplateService";
import { useUserGoals } from "@/contexts/UserGoalsContext";
import { useAuth } from "@/contexts/AuthContext";
import { TagSuggestionService } from "@/services/tagSuggestionService";
import { TagService } from "@/services/tagService";
import { GapDetectionService } from "@/services/gapDetectionService";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useToast } from "@/hooks/use-toast";
import { SyntheticUserService } from "@/services/syntheticUserService";
import { useTour } from "@/contexts/TourContext";
import { TourBannerFull } from "@/components/onboarding/TourBannerFull";

type SavedSectionItem = {
  id: string;
  type: 'intro' | 'paragraph' | 'closer' | 'signature';
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
  const [resolvedGaps, setResolvedGaps] = useState<Set<string>>(new Set());
  const [dismissedSuccessCards, setDismissedSuccessCards] = useState<Set<string>>(new Set());

  // Tag suggestion state
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagContent, setTagContent] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<any[]>([]);
  const [tagEntityId, setTagEntityId] = useState<string | undefined>();
  const [existingTags, setExistingTags] = useState<string[]>([]);

  // Section label editing state
  const [isEditingSectionLabel, setIsEditingSectionLabel] = useState(false);
  const [editingSectionType, setEditingSectionType] = useState<string | null>(null);
  const [editingSectionLabel, setEditingSectionLabel] = useState('');

  const mountedRef = useRef(true);

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
          externalLinks: []
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

  const handleCreateSection = (type?: 'intro' | 'paragraph' | 'closer' | 'signature' | string) => {
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
    const newTag = sectionTagInput.trim();
    if (!newTag || editingSection.tags?.includes(newTag)) {
      setSectionTagInput('');
      return;
    }

    setEditingSection({
      ...editingSection,
      tags: [...(editingSection.tags ?? []), newTag]
    });
    setSectionTagInput('');
  };

  const handleRemoveSectionTag = (tagToRemove: string) => {
    if (!editingSection) return;
    setEditingSection({
      ...editingSection,
      tags: (editingSection.tags ?? []).filter((tag) => tag !== tagToRemove)
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
      const updated = await CoverLetterTemplateService.updateSavedSection(editingSection.id, {
        title: editingSection.title,
        content: editingSection.content,
        tags: editingSection.tags ?? []
      });

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
    maxGapSeverity: section.maxGapSeverity
  }));

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
            onDeleteSection={handleDeleteSectionType}
            onGenerateContent={handleGenerateContent}
            resolvedGaps={resolvedGaps}
            dismissedSuccessCards={dismissedSuccessCards}
            onDismissSuccessCard={handleDismissSuccessCard}
            contentTypes={[
                    {
                      type: 'intro',
                      label: 'Introduction',
                      description: 'Opening paragraphs that grab attention and introduce you',
                icon: FileText
              },
              {
                type: 'paragraph',
                label: 'Body Paragraph',
                description: 'Static supporting paragraphs kept verbatim from uploads',
                icon: BookOpen
                    },
                    {
                      type: 'closer',
                      label: 'Closing',
                description: 'Professional closing paragraphs that reinforce your interest',
                icon: CheckCircle
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
                <Input
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
                <Input
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
                <Textarea
                  id="saved-section-content"
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
                  <Input
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
                <Button onClick={handleSaveSection}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HIL Content Generation Modal */}
      {isContentModalOpen && selectedGap && (
        <ContentGenerationModal
          gap={selectedGap}
          isOpen={isContentModalOpen}
          onClose={() => {
            setIsContentModalOpen(false);
            setSelectedGap(null);
          }}
          onApplyContent={handleApplyContent}
        />
      )}

      {/* Add Reusable Content Modal */}
      {showAddReusableContentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-2xl max-h-[90vh] bg-background rounded-lg shadow-2xl overflow-hidden">
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
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="content-type">Section Type</Label>
                  <Input
                    id="content-type"
                    value={newReusableContent.contentType}
                    onChange={(e) => setNewReusableContent(prev => ({ ...prev, contentType: e.target.value }))}
                    placeholder="e.g., intro, closer, signature"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newReusableContent.title}
                    onChange={(e) => setNewReusableContent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Professional Opening"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={newReusableContent.content}
                    onChange={(e) => setNewReusableContent(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter your section content here..."
                    rows={6}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input
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
                        type: newReusableContent.contentType as 'intro' | 'paragraph' | 'closer' | 'signature' | 'other',
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
          isOpen={isTagModalOpen}
          onClose={() => {
            setIsTagModalOpen(false);
            setSuggestedTags([]);
            setTagContent('');
            setTagEntityId(undefined);
            setExistingTags([]);
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