import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileText, CheckCircle, Edit } from "lucide-react";
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

  // Tag suggestion state
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagContent, setTagContent] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<any[]>([]);

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

  // Mock tag generation function
  const generateMockTags = async (content: string): Promise<string[]> => {
    // No delay for demo purposes
    const keywords = content.toLowerCase();
    const suggestedTags: string[] = [];
    
    // Industry tags
    if (keywords.includes('product') || keywords.includes('pm')) {
      suggestedTags.push('Product Management');
    }
    if (keywords.includes('saas') || keywords.includes('software')) {
      suggestedTags.push('SaaS');
    }
    if (keywords.includes('fintech') || keywords.includes('finance')) {
      suggestedTags.push('Fintech');
    }
    if (keywords.includes('healthcare') || keywords.includes('medical')) {
      suggestedTags.push('Healthcare');
    }
    if (keywords.includes('ecommerce') || keywords.includes('retail')) {
      suggestedTags.push('E-commerce');
    }
    
    // Competency tags
    if (keywords.includes('strategy') || keywords.includes('strategic')) {
      suggestedTags.push('Strategy');
    }
    if (keywords.includes('growth') || keywords.includes('scale')) {
      suggestedTags.push('Growth');
    }
    if (keywords.includes('ux') || keywords.includes('user experience')) {
      suggestedTags.push('UX');
    }
    if (keywords.includes('data') || keywords.includes('analytics')) {
      suggestedTags.push('Data Analytics');
    }
    if (keywords.includes('leadership') || keywords.includes('team')) {
      suggestedTags.push('Leadership');
    }
    if (keywords.includes('launch') || keywords.includes('release')) {
      suggestedTags.push('Product Launch');
    }
    if (keywords.includes('revenue') || keywords.includes('monetization')) {
      suggestedTags.push('Monetization');
    }
    
    // Business model tags
    if (keywords.includes('b2b') || keywords.includes('enterprise')) {
      suggestedTags.push('B2B');
    }
    if (keywords.includes('b2c') || keywords.includes('consumer')) {
      suggestedTags.push('B2C');
    }
    if (keywords.includes('marketplace') || keywords.includes('platform')) {
      suggestedTags.push('Platform');
    }
    
    // Remove duplicates and limit to 5 tags
    return [...new Set(suggestedTags)].slice(0, 5);
  };

  // Tag suggestion handler for Saved Sections
  const handleTagSuggestions = async (blurb: TemplateBlurb) => {
    console.log('handleTagSuggestions called with blurb:', blurb);
    // Generate mock tag suggestions based on blurb content
    const mockTags = await generateMockTags(blurb.content);
    console.log('Generated mock tags for blurb:', mockTags);
    
    const tagSuggestions = mockTags.map((tag, index) => ({
      id: `blurb-tag-${index}`,
      value: tag,
      confidence: Math.random() > 0.5 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low'
    }));
    console.log('Blurb tag suggestions:', tagSuggestions);
    setSuggestedTags(tagSuggestions);
    setTagContent(blurb.content);
    console.log('Setting isTagModalOpen to true for blurb tags');
    setIsTagModalOpen(true);
    console.log('Blurb tag modal should be opening now');
  };

  // Handle applying selected tags
  const handleApplyTags = (selectedTags: string[]) => {
    console.log('Applied tags to blurb:', selectedTags);
    // TODO: Update blurb tags in the data
    setIsTagModalOpen(false);
    setSuggestedTags([]);
    setTagContent('');
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
                onTagSuggestions={handleTagSuggestions}
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

      {/* Tag Suggestion Modal */}
      {isTagModalOpen && (
        <ContentGenerationModal
          mode="tag-suggestion"
          content={tagContent}
          suggestedTags={suggestedTags}
          isOpen={isTagModalOpen}
          onClose={() => {
            setIsTagModalOpen(false);
            setSuggestedTags([]);
            setTagContent('');
          }}
          onApplyTags={handleApplyTags}
        />
      )}
    </div>
  );
}