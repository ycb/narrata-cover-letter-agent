import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, FileText, CheckCircle, Edit, X } from "lucide-react";
import { TemplateBlurbHierarchical } from "@/components/template-blurbs/TemplateBlurbHierarchical";
import { type TemplateBlurb } from "@/components/template-blurbs/TemplateBlurbMaster";
import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";
import { useUserGoals } from "@/contexts/UserGoalsContext";
import { useAuth } from "@/contexts/AuthContext";
import { TagSuggestionService } from "@/services/tagSuggestionService";
import { TagService } from "@/services/tagService";

// Mock template blurbs library
const mockTemplateBlurbs: TemplateBlurb[] = [
  {
    id: "intro-1",
    type: "intro",
    title: "Standard Professional Opening",
    content: "I am writing to express my strong interest in the [Position] role at [Company]. With my background in [Industry/Field], I am excited about the opportunity to contribute to your team's success.",
    tags: ["professional", "standard", "interest", "background"],
    isDefault: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    // Mock gap detection data - lacks compelling hook and company research
    hasGaps: true,
    gapCount: 1
  },
  {
    id: "intro-2", 
    type: "intro",
    title: "Passionate Connection",
    content: "I was thrilled to discover the [Position] opening at [Company], as it perfectly aligns with my passion for [Industry/Field] and my career goals in [Specific Area].",
    tags: ["passion", "thrilled", "alignment", "career goals"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    // Mock gap detection data - lacks compelling hook and company research
    hasGaps: true,
    gapCount: 1
  },
  {
    id: "intro-3",
    type: "intro",
    title: "Referral Opening",
    content: "I was referred to this [Position] opportunity at [Company] by [Referral Name], who spoke highly of your team and the innovative work you're doing in [Industry/Field].",
    tags: ["referral", "network", "recommendation", "connection"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "closer-1",
    type: "closer",
    title: "Professional Closing",
    content: "I am excited about the opportunity to discuss how my experience and skills can contribute to [Company]'s continued success. I look forward to hearing from you soon.",
    tags: ["professional", "closing", "excitement", "follow-up"],
    isDefault: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    // Mock gap detection data - no gaps
    hasGaps: false,
    gapCount: 0
  }
];

export default function SavedSections() {
  const { user } = useAuth();
  const { goals } = useUserGoals();
  const [templateBlurbs, setTemplateBlurbs] = useState<TemplateBlurb[]>(mockTemplateBlurbs);
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

  const handleSelectBlurbFromLibrary = (blurb: TemplateBlurb) => {
    console.log('Selected blurb from library:', blurb);
  };

  const handleEditBlurb = (blurb: TemplateBlurb) => {
    console.log('Edit blurb:', blurb);
  };

  const handleCreateBlurb = (type?: 'intro' | 'closer' | 'signature' | string) => {
    if (type) {
      setNewReusableContent(prev => ({ ...prev, contentType: type }));
      setShowAddReusableContentModal(true);
    }
  };

  const handleDeleteBlurb = (id: string) => {
    setTemplateBlurbs(prev => prev.filter(blurb => blurb.id !== id));
  };

  const handleGenerateContent = (blurb: TemplateBlurb) => {
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

  const handleTagSuggestions = async (blurb: TemplateBlurb) => {
    setTagContent(blurb.content);
    setTagEntityId(blurb.id);
    setExistingTags(blurb.tags || []);
    setSuggestedTags([]);
    setIsTagModalOpen(true);
    
    try {
      const suggestions = await TagSuggestionService.suggestTags({
        content: blurb.content,
        contentType: 'saved_section',
        userGoals: goals ? {
          industries: goals.industries,
          businessModels: goals.businessModels
        } : undefined,
        existingTags: blurb.tags || []
      });
      
      setSuggestedTags(suggestions);
    } catch (error) {
      console.error('Error generating tag suggestions:', error);
      // Error will be shown in modal if needed
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Saved Sections</h1>
        <p className="text-muted-foreground mb-6">
          Manage your reusable cover letter sections and templates
        </p>
        
        <div className="bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="template-content-spacing mt-2">
                <TemplateBlurbHierarchical
                  blurbs={templateBlurbs.map(blurb => ({
                    ...blurb,
                    status: 'approved' as const,
                    confidence: 'high' as const,
                    timesUsed: 5,
                    lastUsed: '2024-01-15',
                    linkedExternalLinks: [],
                    externalLinks: []
                  }))}
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
                      icon: FileText,
                      blurbs: templateBlurbs.filter(b => b.type === 'intro')
                    },
                    {
                      type: 'closer',
                      label: 'Closing',
                      description: 'Professional closing paragraphs that wrap up your letter',
                      icon: CheckCircle,
                      blurbs: templateBlurbs.filter(b => b.type === 'closer')
                    }
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
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
                  onClick={() => {
                    // Create new blurb
                    const newBlurb: TemplateBlurb = {
                      id: `blurb-${Date.now()}`,
                      type: newReusableContent.contentType as 'intro' | 'closer' | 'signature',
                      title: newReusableContent.title,
                      content: newReusableContent.content,
                      tags: newReusableContent.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                      status: 'draft',
                      confidence: 'medium',
                      timesUsed: 0,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };
                    
                    setTemplateBlurbs(prev => [...prev, newBlurb]);
                    setShowAddReusableContentModal(false);
                    setNewReusableContent({ title: '', content: '', tags: '', contentType: '' });
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