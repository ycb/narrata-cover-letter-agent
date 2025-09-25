import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, FileText, CheckCircle, Edit, X } from "lucide-react";
import { TemplateBlurbHierarchical } from "@/components/template-blurbs/TemplateBlurbHierarchical";
import { type TemplateBlurb } from "@/components/template-blurbs/TemplateBlurbMaster";
import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";

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
    content: "I would welcome the opportunity to discuss how my experience in [Relevant Experience] can contribute to [Company]'s continued success. Thank you for your consideration, and I look forward to hearing from you soon.",
    tags: ["professional", "gratitude", "call-to-action", "follow-up"],
    isDefault: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "closer-2",
    type: "closer",
    title: "Enthusiastic Closing",
    content: "I am excited about the possibility of joining [Company] and contributing to your mission of [Company Mission]. I would love to discuss this opportunity further and share more about how I can help drive [Specific Goal].",
    tags: ["enthusiastic", "mission", "contribution", "excitement"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "signature-1",
    type: "signature",
    title: "Standard Professional Signature",
    content: "Sincerely,\n[Your Name]\n[Your Title]\n[Phone Number]\n[Email Address]",
    tags: ["professional", "standard", "contact", "formal"],
    isDefault: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "signature-2",
    type: "signature",
    title: "Warm Professional Signature",
    content: "Best regards,\n[Your Name]\n[Your Title]\n[Company Name]\n[Phone Number] | [Email Address]",
    tags: ["warm", "professional", "contact", "friendly"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  }
];

export default function SavedSections() {
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

  // HIL Content Generation handlers
  const handleGenerateContent = (blurb: TemplateBlurb) => {
    const mockGapData = {
      id: `blurb-gap-${blurb.id}`,
      type: 'content-enhancement' as const,
      severity: 'medium' as const,
      description: 'Content needs improvement based on cover letter best practices',
      suggestion: 'Add compelling hook, specific company research, and quantified impact to strengthen the opening',
      origin: 'ai' as const,
      existingContent: blurb.content
    };
    setSelectedGap(mockGapData);
    setIsContentModalOpen(true);
  };

  const handleApplyContent = (content: string) => {
    console.log('Applied generated content:', content);
    console.log('Selected gap:', selectedGap);
    
    // Update the blurb content in the templateBlurbs array
    if (selectedGap) {
      const blurbId = selectedGap.id.replace('blurb-gap-', '');
      console.log('Updating blurb with ID:', blurbId);
      
      setTemplateBlurbs(prev => {
        const updated = prev.map(blurb => 
          blurb.id === blurbId 
            ? { ...blurb, content: content }
            : blurb
        );
        console.log('Updated templateBlurbs:', updated);
        return updated;
      });
      
      // Mark this gap as resolved
      setResolvedGaps(prev => {
        const newResolved = new Set([...prev, selectedGap.id]);
        console.log('Updated resolvedGaps:', newResolved);
        return newResolved;
      });
      
      // Auto-dismiss success card after 3 seconds
      setTimeout(() => {
        setDismissedSuccessCards(prev => new Set([...prev, selectedGap.id]));
      }, 3000);
    }
    
    // Show temporary success state
    setTimeout(() => {
      setIsContentModalOpen(false);
      setSelectedGap(null);
    }, 1000);
  };

  const handleDismissSuccessCard = (gapId: string) => {
    setDismissedSuccessCards(prev => new Set([...prev, gapId]));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Saved Sections</h1>
        <p className="text-muted-foreground mb-6">
          View and manage all your saved cover letter sections
        </p>
      </div>
      
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
                    isDefault: true
                  },
                  {
                    type: 'closer',
                    label: 'Closing',
                    description: 'Concluding paragraphs that reinforce your interest',
                    icon: CheckCircle,
                    isDefault: true
                  },
                  {
                    type: 'signature',
                    label: 'Signature',
                    description: 'Professional sign-offs and contact information',
                    icon: Edit,
                    isDefault: true
                  },
                  ...userContentTypes
                ]}
              />
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
    </div>
  );
}