import { useState, useEffect } from "react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, FileText, CheckCircle, Edit, X, Loader2, BookOpen } from "lucide-react";
import { TemplateBlurbHierarchical } from "@/components/template-blurbs/TemplateBlurbHierarchical";
import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";
import { CoverLetterTemplateService, type SavedSection } from "@/services/coverLetterTemplateService";
import { useUserGoals } from "@/contexts/UserGoalsContext";
import { useAuth } from "@/contexts/AuthContext";
import { TagSuggestionService } from "@/services/tagSuggestionService";
import { TagService } from "@/services/tagService";

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
};

type HierarchicalBlurb = ComponentProps<typeof TemplateBlurbHierarchical>['blurbs'][number];

export default function SavedSections() {
  const { user } = useAuth();
  const { goals } = useUserGoals();
  const [templateBlurbs, setTemplateBlurbs] = useState<SavedSectionBlurb[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  // Load saved sections from database
  useEffect(() => {
    const loadSavedSections = async () => {
      if (!user?.id) {
        setIsLoading(false);
        setTemplateBlurbs([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Check if synthetic testing is enabled and get active profile
        const { SyntheticUserService } = await import('../services/syntheticUserService');
        const syntheticUserService = new SyntheticUserService();
        const syntheticContext = await syntheticUserService.getSyntheticUserContext();
        console.log('[SavedSections] Synthetic context:', {
          enabled: syntheticContext.isSyntheticTestingEnabled,
          currentProfile: syntheticContext.currentUser?.profileId,
        });
        
        // Get profile ID if synthetic testing is enabled
        const profileId = syntheticContext.isSyntheticTestingEnabled 
          ? syntheticContext.currentUser?.profileId 
          : undefined;

        const sections = await CoverLetterTemplateService.getUserSavedSections(user.id, profileId);
        console.log('[SavedSections] Loaded sections:', sections.map(section => ({ id: section.id, title: section.title, type: section.type })));

        // Convert SavedSection to TemplateBlurb format
        const blurbs: SavedSectionBlurb[] = sections.map((section) => ({
          id: section.id!,
          type: section.type as SavedSectionBlurb['type'],
          title: section.title,
          content: section.content,
          tags: Array.from(new Set([...(section.tags ?? []), ...(section.purpose_tags ?? [])])),
          isDefault: (section.type as string) === 'intro',
          status: 'approved' as const,
          confidence: 'high' as const,
          timesUsed: section.times_used || 0,
          lastUsed: section.last_used,
          createdAt: section.created_at!,
          updatedAt: section.updated_at!,
          hasGaps: false,
          gapCount: 0,
          linkedExternalLinks: [],
          externalLinks: []
        }));

        // Only show mock data if we have no real data AND no error occurred
        // Empty array is valid - means no saved sections yet for this profile
        if (blurbs.length > 0) {
          setTemplateBlurbs(blurbs);
        } else {
          // No saved sections found - show empty state, not mock data
          setTemplateBlurbs([]);
        }
      } catch (err) {
        console.error('Error loading saved sections:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Full error details:', err);
        setError(`Failed to load saved sections: ${errorMessage}`);
        setTemplateBlurbs([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedSections();
  }, [user?.id]); // Note: This will reload when user changes, but synthetic profile changes trigger page reload

  const handleSelectBlurbFromLibrary = (blurb: HierarchicalBlurb) => {
    console.log('Selected blurb from library:', blurb);
  };

  const handleEditBlurb = (blurb: HierarchicalBlurb) => {
    console.log('Edit blurb:', blurb);
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
      alert('Failed to delete saved section');
    }
  };

  const handleGenerateContent = (blurb: HierarchicalBlurb) => {
    const mockGapData = {
      id: `blurb-gap-${blurb.id}`,
      type: 'content-enhancement' as const,
      severity: 'medium' as const,
      description: 'Content could be more compelling and specific',
      suggestion: 'Add quantifiable results and specific achievements to make this section more impactful',
      paragraphId: blurb.type,
      origin: 'saved-section' as const,
      existingContent: blurb.content
    };
    
    setSelectedGap(mockGapData);
    setIsContentModalOpen(true);
  };

  const handleApplyContent = (content: string) => {
    console.log('Applied generated content:', content);
    console.log('Selected gap:', selectedGap);
    
    if (selectedGap && selectedGap.origin === 'saved-section') {
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
    updatedAt: blurb.updatedAt
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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading saved sections...</span>
          </div>
        ) : (
        <div className="bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="template-content-spacing mt-2">
                {templateBlurbs.length === 0 ? (
                  <div className="border border-dashed border-muted-foreground/40 rounded-lg p-8 text-center text-muted-foreground">
                    <p className="font-medium text-foreground mb-2">No saved sections found for this profile.</p>
                    <p>
                      Upload a cover letter for this persona (e.g. P01) or create a new section manually to populate your library.
                    </p>
                  </div>
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
                      description: 'Professional closing paragraphs that wrap up your letter',
                      icon: CheckCircle
                    },
                    {
                      type: 'signature',
                      label: 'Signature',
                      description: 'Sign-offs and contact information blocks',
                      icon: Edit
                    }
                  ]}
                />
                )}
              </div>
            </div>
          </div>
        </div>
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
                        updatedAt: createdSection.updated_at!
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