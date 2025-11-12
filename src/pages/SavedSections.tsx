import { useState, useEffect, useRef } from "react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, FileText, CheckCircle, Edit, X, BookOpen } from "lucide-react";
import { TemplateBlurbHierarchical } from "@/components/template-blurbs/TemplateBlurbHierarchical";
import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";
import { CoverLetterTemplateService, type SavedSection } from "@/services/coverLetterTemplateService";
import { useUserGoals } from "@/contexts/UserGoalsContext";
import { useAuth } from "@/contexts/AuthContext";
import { TagSuggestionService } from "@/services/tagSuggestionService";
import { TagService } from "@/services/tagService";
import { GapDetectionService } from "@/services/gapDetectionService";
import { useStreamingProgress } from "@/hooks/useStreamingProgress";
import { StreamingProgress } from "@/components/shared/StreamingProgress";
import { EmptyState } from "@/components/shared/EmptyState";
import { useToast } from "@/hooks/use-toast";

type SavedSectionBlurb = {
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
  gapCategories?: string[];
  maxGapSeverity?: 'high' | 'medium' | 'low';
};

export default function SavedSections() {
  const { user } = useAuth();
  const { goals } = useUserGoals();
  const { toast } = useToast();
  const [templateBlurbs, setTemplateBlurbs] = useState<SavedSectionBlurb[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAddReusableContentModal, setShowAddReusableContentModal] = useState(false);
  const [newReusableContent, setNewReusableContent] = useState({ title: '', content: '', tags: '', contentType: '' });
  const [userContentTypes, setUserContentTypes] = useState<Array<{
    type: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }>>([]);

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

  const mountedRef = useRef(true);
  const {
    steps: loadSteps,
    events: loadEvents,
    status: loadStatus,
    output: loadOutput,
    error: loadError,
    isStreaming: isStreamingLoad,
    startStream,
    reset: resetLoad,
    cancel: cancelLoad,
    setStepStatus,
    setStepDetail,
    setStepProgress,
    appendEvent
  } = useStreamingProgress({
    steps: [
      { id: "profile", label: "Resolve persona context" },
      { id: "savedSections", label: "Load saved sections" },
      { id: "gapData", label: "Analyze gap signals" }
    ],
    autoResolveSteps: false
  });

  // Load saved sections from database
  useEffect(() => {
    mountedRef.current = true;

    const loadSavedSections = async () => {
      if (!user?.id) {
        setTemplateBlurbs([]);
        setUserContentTypes([]);
        resetLoad();
        return;
      }

      await startStream({
        steps: [
          { id: "profile", label: "Resolve persona context" },
          { id: "savedSections", label: "Load saved sections" },
          { id: "gapData", label: "Analyze gap signals" }
        ],
        autoResolveSteps: false,
        streamFactory: async () =>
          (async function* streamLoader() {
            try {
        setError(null);
              setStepStatus("profile", "running");
              setStepDetail("profile", "Checking synthetic persona overrides");

              const { SyntheticUserService } = await import("../services/syntheticUserService");
              const syntheticUserService = new SyntheticUserService();
              const syntheticContext = await syntheticUserService.getSyntheticUserContext();

              const profileId = syntheticContext.isSyntheticTestingEnabled
                ? syntheticContext.currentUser?.profileId
                : undefined;

              if (!mountedRef.current) {
                return;
              }

              appendEvent(
                profileId
                  ? `Persona ${profileId} active for saved sections`
                  : "Using live profile data",
                "info"
              );
              setStepStatus("profile", "success");
              setStepDetail("profile", profileId ? `Persona ${profileId}` : "Live profile");

              setStepStatus("savedSections", "running");
              setStepDetail("savedSections", "Loading saved sections from Supabase");
              setStepProgress("savedSections", 0.2);
              const sections = await CoverLetterTemplateService.getUserSavedSections(user.id, profileId);
              if (!mountedRef.current) {
                return;
              }

              appendEvent(
                sections.length === 0
                  ? "No saved sections found yet."
                  : `Loaded ${sections.length} saved sections`,
                sections.length === 0 ? "warning" : "success"
              );
              setStepStatus("savedSections", "success");
              setStepDetail(
                "savedSections",
                sections.length === 0 ? "No saved sections yet" : `Loaded ${sections.length} saved sections`
              );
              setStepProgress("savedSections", sections.length > 0 ? 0.6 : 0.4);

              setStepStatus("gapData", "running");
              setStepDetail("gapData", "Analyzing gap signals");
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
                      gapCount: item.gap_categories?.length ?? 0,
                      categories: item.gap_categories ?? [],
                      maxSeverity: item.max_severity ?? "low"
                    }
                  ])
                );
              } catch (gapError) {
                appendEvent(
                  "Gap summary unavailable (using defaults).",
                  "warning",
                  {
                    error: gapError instanceof Error ? gapError.message : String(gapError)
                  }
                );
                setStepDetail(
                  "gapData",
                  gapError instanceof Error ? gapError.message : "Gap summary unavailable (using defaults)"
                );
              }

              if (!mountedRef.current) {
                return;
              }

              const blurbs: SavedSectionBlurb[] = sections.map((section) => ({
          id: section.id!,
                type: section.type as SavedSectionBlurb["type"],
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

              setTemplateBlurbs(blurbs);
              appendEvent("Saved sections ready", "success");
              setStepStatus("gapData", "success");
              setStepDetail(
                "gapData",
                blurbs.some((blurb) => (blurb.gapCount ?? 0) > 0)
                  ? "Gap insights ready"
                  : "No gaps detected"
              );
              setStepProgress("savedSections", 1);

              yield { type: "text", text: `${sections.length} saved sections ready.` } as any;
      } catch (err) {
              if (!mountedRef.current) {
                return;
              }
              const message =
                err instanceof Error ? err.message : "Failed to load saved sections";
              setError(`Failed to load saved sections: ${message}`);
              setTemplateBlurbs([]);
              appendEvent(message, "error");
              setStepStatus("savedSections", "error", message);
              setStepDetail("savedSections", message);
              throw err;
            }
          })()
      });
    };

    loadSavedSections();

    return () => {
      mountedRef.current = false;
      cancelLoad();
    };
  }, [user?.id, startStream, resetLoad, cancelLoad, setStepStatus, setStepDetail, setStepProgress, appendEvent]);

  const handleSelectBlurbFromLibrary = (_blurb: HierarchicalBlurb) => {
    // Reserved for future interactions when selecting a saved section from the library.
  };

  const handleEditBlurb = (blurb: HierarchicalBlurb) => {
    setNewReusableContent({
      title: blurb.title,
      content: blurb.content,
      tags: (blurb.tags || []).join(', '),
      contentType: blurb.type
    });
    setShowAddReusableContentModal(true);
  };

  const handleCreateBlurb = (type?: 'intro' | 'paragraph' | 'closer' | 'signature' | string) => {
    if (type) {
      setNewReusableContent(prev => ({ ...prev, contentType: type }));
      setShowAddReusableContentModal(true);
    }
  };

  const handleDeleteBlurb = async (id: string) => {
    if (!user?.id) return;

    try {
      await CoverLetterTemplateService.deleteSavedSection(id);
      setTemplateBlurbs(prev => prev.filter(blurb => blurb.id !== id));
    } catch (err) {
      console.error('Error deleting saved section:', err);
      toast({
        title: 'Unable to delete saved section',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const formatGapCategory = (category: string) =>
    category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const handleGenerateContent = (blurb: HierarchicalBlurb) => {
    const categories = (blurb.gapCategories ?? []) as string[];
    const formattedCategories = categories.map(formatGapCategory);
    const severity = (blurb.maxGapSeverity ?? "medium") as "high" | "medium" | "low";

    const description =
      formattedCategories.length > 0
        ? `This section can be improved by addressing: ${formattedCategories.join(', ')}.`
        : "This section can be strengthened with more specific, outcome-driven language.";

    const suggestion =
      formattedCategories.length > 0
        ? `Add detail that directly speaks to ${formattedCategories.join(', ').toLowerCase()}.`
        : "Include quantifiable results and tailor the copy to the target role or company.";

    setSelectedGap({
      id: `blurb-gap-${blurb.id}`,
      type: 'content-enhancement',
      severity,
      description,
      suggestion,
      paragraphId: blurb.type,
      origin: 'library',
      existingContent: blurb.content
    });
    setIsContentModalOpen(true);
  };

  const handleApplyContent = (content: string) => {
    
    if (selectedGap && selectedGap.origin === 'library') {
      // Update the blurb content
      setTemplateBlurbs(prev => prev.map(blurb => 
        blurb.id === selectedGap.id.replace('blurb-gap-', '') 
          ? { ...blurb, content: content, updatedAt: new Date().toISOString() }
          : blurb
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
      setTemplateBlurbs(prev => prev.map(blurb => 
        blurb.id === tagEntityId 
          ? { ...blurb, tags: allTags, updatedAt: new Date().toISOString() }
          : blurb
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

  const hierarchicalBlurbs = templateBlurbs.map((blurb) => ({
    id: blurb.id,
    type: blurb.type,
    title: blurb.title,
    content: blurb.content,
    status: 'approved' as const,
    confidence: 'high' as const,
    tags: blurb.tags,
    timesUsed: blurb.timesUsed,
    lastUsed: blurb.lastUsed,
    createdAt: blurb.createdAt,
    updatedAt: blurb.updatedAt,
    hasGaps: blurb.hasGaps,
    gapCount: blurb.gapCount,
    gapCategories: blurb.gapCategories,
    maxGapSeverity: blurb.maxGapSeverity
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Saved Sections</h1>
        <p className="text-muted-foreground mb-6">
          Manage your reusable cover letter sections and templates
        </p>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
            {error}
          </div>
        )}

        {(isStreamingLoad || loadStatus === "error") && (
          <div className="mb-6 rounded-lg border border-muted/40 bg-muted/10 p-4">
            <StreamingProgress
              steps={loadSteps}
              status={loadStatus}
              events={loadEvents}
              output={loadOutput}
              showTimeline
            />
            {loadError && (
              <p className="mt-3 text-sm text-destructive">{loadError}</p>
            )}
          </div>
        )}

        {templateBlurbs.length === 0 ? (
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
            blurbs={hierarchicalBlurbs}
                  selectedBlurbId={undefined}
                  onSelectBlurb={handleSelectBlurbFromLibrary}
                  onCreateBlurb={handleCreateBlurb}
                  onEditBlurb={handleEditBlurb}
                  onDeleteBlurb={handleDeleteBlurb}
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

                      // Convert to TemplateBlurb for UI
                      const newBlurb: SavedSectionBlurb = {
                        id: createdSection.id!,
                        type: createdSection.type as SavedSectionBlurb['type'],
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

                      setTemplateBlurbs(prev => [...prev, newBlurb]);
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
    </div>
  );
}