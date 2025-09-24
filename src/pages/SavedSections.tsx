import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileText, CheckCircle, Edit } from "lucide-react";
import { TemplateBlurbHierarchical } from "@/components/template-blurbs/TemplateBlurbHierarchical";
import { type TemplateBlurb } from "@/components/template-blurbs/TemplateBlurbMaster";

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
    // Mock gap detection data
    hasGaps: true,
    gapCount: 1,
    gapSeverity: 'medium'
  },
  {
    id: "intro-2", 
    type: "intro",
    title: "Passionate Connection",
    content: "I was thrilled to discover the [Position] opening at [Company], as it perfectly aligns with my passion for [Industry/Field] and my career goals in [Specific Area].",
    tags: ["passion", "thrilled", "alignment", "career goals"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
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
    updatedAt: "2024-01-01T00:00:00Z",
    // Mock gap detection data
    hasGaps: true,
    gapCount: 1,
    gapSeverity: 'low'
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
    </div>
  );
}