import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, Save, ArrowLeft, Plus, GripVertical, Trash2, Edit, FileText, Library, MoreHorizontal, Copy, Clock, LayoutTemplate, CheckCircle, X, ChevronRight, BookOpen, Eye } from "lucide-react";
import { TemplateBanner } from "@/components/layout/TemplateBanner";
import { Link, useNavigate } from "react-router-dom";
import { TemplateBlurbHierarchical } from "@/components/template-blurbs/TemplateBlurbHierarchical";
import { type TemplateBlurb } from "@/components/template-blurbs/TemplateBlurbMaster";
import { TemplateBlurbDetail } from "@/components/template-blurbs/TemplateBlurbDetail";
import { WorkHistoryBlurbSelector } from "@/components/work-history/WorkHistoryBlurbSelector";
import { SectionInsertButton } from "@/components/template-blurbs/SectionInsertButton";
import { CoverLetterViewModal } from "@/components/cover-letters/CoverLetterViewModal";
import type { CoverLetterSection, CoverLetterTemplate, WorkHistoryBlurb } from "@/types/workHistory";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTour } from "@/contexts/TourContext";
import { TourBannerFull } from "@/components/onboarding/TourBannerFull";
import { FormModal } from "@/components/shared/FormModal";

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
    updatedAt: "2024-01-01T00:00:00Z"
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
    tags: ["referral", "recommendation", "networking", "innovation"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "closer-1",
    type: "closer",
    title: "Standard Professional Close",
    content: "I would welcome the opportunity to discuss how my background and passion can contribute to your team's continued success. Thank you for your time and consideration.",
    tags: ["professional", "discussion", "contribution", "gratitude"],
    isDefault: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "closer-2",
    type: "closer",
    title: "Eager Follow-up",
    content: "I am excited about the possibility of joining your team and would love to discuss how I can help [Company] achieve its goals. I look forward to hearing from you soon.",
    tags: ["excitement", "team", "goals", "follow up"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "closer-3",
    type: "closer",
    title: "Value-focused Close",
    content: "I am confident that my skills and experience would be valuable additions to your team. I would appreciate the opportunity to discuss how I can contribute to [Company]'s continued growth and success.",
    tags: ["confidence", "value", "skills", "growth"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "signature-1",
    type: "signature",
    title: "Professional",
    content: "Sincerely,\n[Your Name]",
    tags: ["formal", "professional", "traditional"],
    isDefault: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "signature-2",
    type: "signature",
    title: "Warm Professional",
    content: "Best regards,\n[Your Name]",
    tags: ["warm", "professional", "friendly"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "signature-3",
    type: "signature",
    title: "Respectful",
    content: "Respectfully,\n[Your Name]",
    tags: ["respectful", "formal", "courteous"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  }
];

// Mock work history data for the modal
const mockWorkHistory = [
  {
    id: 'company-1',
    name: 'TechCorp Inc.',
    description: 'Software development company',
    roles: [
      {
        id: 'role-1',
        title: 'Senior Software Engineer',
        description: 'Led development of web applications',
        blurbs: [
          {
            id: 'story-1',
            title: 'Improved Performance by 40%',
            content: 'Optimized database queries and implemented caching strategies, resulting in a 40% improvement in application performance.',
            tags: ['performance', 'optimization', 'database'],
            confidence: 'high',
            timesUsed: 3,
            source: 'work-history',
            status: 'approved',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 'story-2',
            title: 'Led Team of 5 Developers',
            content: 'Successfully led a team of 5 developers to deliver a major feature on time and under budget.',
            tags: ['leadership', 'team management', 'delivery'],
            confidence: 'high',
            timesUsed: 2,
            source: 'work-history',
            status: 'approved',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        source: 'work-history',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ],
    source: 'work-history',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'company-2',
    name: 'StartupXYZ',
    description: 'Innovative startup',
    roles: [
      {
        id: 'role-2',
        title: 'Full Stack Developer',
        description: 'Built end-to-end solutions',
        blurbs: [
          {
            id: 'story-3',
            title: 'Built MVP in 3 Months',
            content: 'Designed and built a complete MVP from scratch in just 3 months, including frontend, backend, and database.',
            tags: ['mvp', 'full stack', 'rapid development'],
            confidence: 'high',
            timesUsed: 1,
            source: 'work-history',
            status: 'approved',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        source: 'work-history',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ],
    source: 'work-history',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Mock template data with default static content
const mockTemplate: CoverLetterTemplate = {
  id: "template-1",
  name: "Professional Template",
  sections: [
    {
      id: "intro",
      type: "intro" as const,
      isStatic: true,
      staticContent: "I am writing to express my strong interest in the [Position] role at [Company]. With my background in [Industry/Field], I am excited about the opportunity to contribute to your team's success.",
      order: 1
    },
    {
      id: "paragraph-1",
      type: "paragraph" as const,
      isStatic: false,
      blurbCriteria: {
        goals: ["showcase relevant experience and technical skills"]
      },
      order: 2
    },
    {
      id: "paragraph-2", 
      type: "paragraph" as const,
      isStatic: false,
      blurbCriteria: {
        goals: ["highlight achievements and quantifiable impact"]
      },
      order: 3
    },
    {
      id: "closer",
      type: "closer" as const,
      isStatic: true,
      staticContent: "I would welcome the opportunity to discuss how my background and passion can contribute to your team's continued success. Thank you for your time and consideration.",
      order: 4
    },
    {
      id: "signature",
      type: "signature" as const,
      isStatic: true,
      staticContent: "Sincerely,\n[Your Name]",
      order: 5
    }
  ],
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01"
};

export default function CoverLetterTemplate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [template, setTemplate] = useState<CoverLetterTemplate>(mockTemplate);
  const [templateBlurbs, setTemplateBlurbs] = useState<TemplateBlurb[]>(mockTemplateBlurbs);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showBlurbSelector, setShowBlurbSelector] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBlurbDetail, setShowBlurbDetail] = useState(false);
  const [selectedBlurb, setSelectedBlurb] = useState<TemplateBlurb | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingBlurb, setEditingBlurb] = useState<TemplateBlurb | null>(null);
  const [creatingBlurbType, setCreatingBlurbType] = useState<'intro' | 'closer' | 'signature' | null>(null);
  const [showWorkHistorySelector, setShowWorkHistorySelector] = useState(false);
  const [showAddContentTypeModal, setShowAddContentTypeModal] = useState(false);
  const [newContentType, setNewContentType] = useState({ label: '', description: '' });
  const [showAddReusableContentModal, setShowAddReusableContentModal] = useState(false);
  const [newReusableContent, setNewReusableContent] = useState({ title: '', content: '', tags: '', contentType: '' });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [userContentTypes, setUserContentTypes] = useState<Array<{
    type: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    isDefault: boolean;
  }>>([]);

  // Add Section Modal State
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<'story' | 'saved' | null>(null);
  const [contentMethod, setContentMethod] = useState<'dynamic' | 'static' | null>(null);
  const [showSelectionPanel, setShowSelectionPanel] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedReusableType, setSelectedReusableType] = useState<string>('');
  const [selectedContent, setSelectedContent] = useState<any>(null);
  
  // Tour integration
  const { isActive: isTourActive, currentStep: tourStep, tourSteps, currentTourStep, nextStep, previousStep, cancelTour } = useTour();

  // Handle URL parameter for initial tab
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'saved') {
    }
  }, [searchParams]);

  // Auto-advance through tabs during tour
  useEffect(() => {
    if (isTourActive) {
      // Start on template tab, then switch to saved sections after 3 seconds
      setTimeout(() => {
      }, 3000);
    }
  }, [isTourActive]);

  const getBlurbTitleByContent = (content: string, sectionType: string) => {
    const blurb = mockTemplateBlurbs.find(b => b.content === content && b.type === sectionType);
    return blurb?.title || 'Custom Content';
  };

  const getSectionTypeLabel = (type: string) => {
    switch (type) {
      case 'intro': return 'Introduction';
      case 'paragraph': return 'Body Paragraph';
      case 'closer': return 'Closing';
      case 'signature': return 'Signature';
      default: return type;
    }
  };

  const updateSection = (sectionId: string, updates: Partial<CoverLetterSection>) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  const addSection = (insertAfterIndex?: number) => {
    setShowAddSectionModal(true);
  };

  const createSectionFromModal = () => {
    if (!selectedContentType) return;
    
    if (editingSection) {
      // Update existing section
      if (contentMethod === 'static' && selectedContent) {
        updateSection(editingSection, {
          contentType: selectedContentType === 'story' ? 'work-history' : 'saved',
          isStatic: true,
          staticContent: selectedContent.content || selectedContent.staticContent,
          blurbCriteria: undefined
        });
      } else if (contentMethod === 'dynamic') {
        updateSection(editingSection, {
          contentType: selectedContentType === 'story' ? 'work-history' : 'saved',
          isStatic: false,
          staticContent: undefined,
          blurbCriteria: {
            goals: [`add ${selectedContentType === 'story' ? 'work history story' : 'saved section'} based on job description`]
          }
        });
      }
      
      // Reset modal state
      setShowAddSectionModal(false);
      setSelectedContentType(null);
      setContentMethod(null);
      setShowSelectionPanel(false);
      setSelectedCompany('');
      setSelectedRole('');
      setSelectedReusableType('');
      setSelectedContent(null);
      setEditingSection(null);
      return;
    }
    
    // Create new section
    let newSection: CoverLetterSection;
    
    if (contentMethod === 'dynamic') {
      // For dynamic selection, create a section with blurb criteria
      newSection = {
        id: `section-${Date.now()}`,
        type: 'paragraph',
        contentType: selectedContentType === 'story' ? 'work-history' : 'saved',
        isStatic: false,
        staticContent: undefined,
        blurbCriteria: {
          goals: [`add ${selectedContentType === 'story' ? 'work history story' : 'saved section'} based on job description`]
        },
        order: template.sections.length + 1
      };
    } else {
      // For static selection, require selected content
      if (!selectedContent) return;
      
      newSection = {
        id: `section-${Date.now()}`,
        type: 'paragraph',
        contentType: selectedContentType === 'story' ? 'work-history' : 'saved',
        isStatic: true,
        staticContent: selectedContent.content || selectedContent.staticContent,
        blurbCriteria: undefined,
        order: template.sections.length + 1
      };
    }
    
    console.log('Creating new section:', newSection);
    
    setTemplate(prev => {
      const newSections = [...prev.sections, newSection];
      console.log('Updated template sections:', newSections);
      return { ...prev, sections: newSections };
    });
    
    // Reset modal state
    setShowAddSectionModal(false);
    setSelectedContentType(null);
    setContentMethod(null);
    setShowSelectionPanel(false);
    setSelectedCompany('');
    setSelectedRole('');
    setSelectedReusableType('');
    setSelectedContent(null);
  };

  const handleContentSelection = (content: any) => {
    setSelectedContent(content);
    createSectionFromModal();
  };

  const selectBlurbForSection = (sectionId: string, blurb: TemplateBlurb) => {
    updateSection(sectionId, { 
      isStatic: true, 
      staticContent: blurb.content,
      blurbCriteria: undefined
    });
    setShowBlurbSelector(false);
    setSelectedSection(null);
  };

  const getAvailableBlurbs = (sectionType: string) => {
    return mockTemplateBlurbs.filter(blurb => blurb.type === sectionType);
  };

  const handleCreateBlurb = (type: 'intro' | 'closer' | 'signature') => {
    setEditingBlurb(null);
  };

  const handleEditBlurb = (blurb: TemplateBlurb) => {
    setEditingBlurb(blurb);
    setCreatingBlurbType(null);
  };

  const handleSaveBlurb = (blurbData: Partial<TemplateBlurb>) => {
    if (editingBlurb) {
      // Update existing blurb
      setTemplateBlurbs(prev => prev.map(blurb => 
        blurb.id === editingBlurb.id ? { ...blurb, ...blurbData } : blurb
      ));
    } else {
      // Create new blurb
      const newBlurb: TemplateBlurb = {
        ...blurbData,
        id: `${blurbData.type}-${Date.now()}`,
        type: blurbData.type!,
        title: blurbData.title!,
        content: blurbData.content!,
        tags: blurbData.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setTemplateBlurbs(prev => [...prev, newBlurb]);
    }
    
    setEditingBlurb(null);
    setCreatingBlurbType(null);
  };

  const handleDeleteBlurb = (blurbId: string) => {
    setTemplateBlurbs(prev => prev.filter(blurb => blurb.id !== blurbId));
  };

  const handleSelectBlurbFromLibrary = (blurb: TemplateBlurb) => {
    if (selectedSection) {
      selectBlurbForSection(selectedSection, blurb);
    }
  };

  const handleSelectWorkHistoryBlurb = (blurb: WorkHistoryBlurb) => {
    if (selectedSection) {
      updateSection(selectedSection, { 
        isStatic: true, 
        staticContent: blurb.content,
        blurbCriteria: undefined
      });
      setShowWorkHistorySelector(false);
      setSelectedSection(null);
    }
  };

  const handleCreateContentType = () => {
    if (newContentType.label.trim() && newContentType.description.trim()) {
      const newType = {
        type: newContentType.label.toLowerCase().replace(/\s+/g, '-'),
        label: newContentType.label,
        description: newContentType.description,
        icon: FileText,
        isDefault: false
      };
      
      setUserContentTypes(prev => [...prev, newType]);
      setNewContentType({ label: '', description: '' });
      setShowAddContentTypeModal(false);
    }
  };

  const handleCreateReusableContent = () => {
    if (newReusableContent.title.trim() && newReusableContent.content.trim()) {
      const newBlurb: TemplateBlurb = {
        id: `${newReusableContent.contentType}-${Date.now()}`,
        type: newReusableContent.contentType as 'intro' | 'closer' | 'signature',
        title: newReusableContent.title,
        content: newReusableContent.content,
        tags: newReusableContent.tags ? newReusableContent.tags.split(',').map(tag => tag.trim()) : [],
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setTemplateBlurbs(prev => [...prev, newBlurb]);
      setNewReusableContent({ title: '', content: '', tags: '', contentType: '' });
      setShowAddReusableContentModal(false);
    }
  };

  const removeSection = (sectionId: string) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  const handleDone = () => {
    navigate('/cover-letters');
  };

  return (
    <div className="min-h-screen bg-background">
      <TemplateBanner
        onDone={handleDone}
        previewButton={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-2 hover:text-[#E32D9A] hover:border-[#E32D9A]"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        }
      />
      <div className={isTourActive ? 'pt-24' : ''}>
      
      {/* Page Header */}
      <div className="bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between py-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Cover Letter Templates</h1>
                <p className="text-muted-foreground">
                  Create and manage your cover letter templates
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add New Template
              </Button>
            </div>
            
            {/* Content Area */}
            <div>
              <div className="template-content-spacing mt-2">
                  {/* Template Settings */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Template Settings</CardTitle>
                        <div className="flex items-center gap-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                // TODO: Implement duplicate template
                                console.log('Duplicate template');
                              }}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate Template
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                // TODO: Implement export template
                                console.log('Export template');
                              }}>
                                <FileText className="mr-2 h-4 w-4" />
                                Export Template
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                // TODO: Implement template history
                                console.log('View template history');
                              }}>
                                <Clock className="mr-2 h-4 w-4" />
                                Template History
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="template-name">Template Name</Label>
                          <Input
                            id="template-name"
                            value={template.name}
                            onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter template name..."
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Insert Button at Top (if sections exist) */}
                  {template.sections.length > 0 && (
                    <SectionInsertButton
                      onClick={() => addSection(-1)}
                      variant="default"
                    />
                  )}
                  
                  {/* Sections */}
                  <div>
                    {template.sections.map((section, index) => (
                      <div key={section.id}>
                        <Card className="relative">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <CardTitle className="text-lg">
                                    {getSectionTypeLabel(section.type)} {section.type === 'paragraph' ? `${index}` : ''}
                                  </CardTitle>
                                  <CardDescription>
                                    {section.isStatic ? 'Static content' : 'Dynamic story matching'}
                                  </CardDescription>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                {/* Static Toggle - Always Visible */}
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`static-${section.id}`} className="text-sm">
                                    Static
                                  </Label>
                                  <Switch
                                    id={`static-${section.id}`}
                                    checked={section.isStatic}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        // If turning static ON, show blurb selector first
                                        setSelectedSection(section.id);
                                        if (section.type === 'intro' || section.type === 'closer' || section.type === 'signature') {
                                          setShowBlurbSelector(true);
                                        } else {
                                          setShowWorkHistorySelector(true);
                                        }
                                      } else {
                                        // If turning static OFF, just update the section
                                        updateSection(section.id, { 
                                          isStatic: false, 
                                          staticContent: undefined,
                                          blurbCriteria: {
                                            goals: ["describe the purpose of this paragraph"]
                                          }
                                        });
                                      }
                                    }}
                                  />
                                </div>
                                
                                {/* Overflow Menu for Other Actions */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      // Open edit modal with current section data
                                      if (section.isStatic) {
                                        // For static sections, pre-fill with current content
                                        setSelectedContentType(section.contentType === 'work-history' ? 'story' : 'saved');
                                        setContentMethod('static');
                                        setSelectedContent({
                                          content: section.staticContent,
                                          staticContent: section.staticContent
                                        });
                                      } else {
                                        // For dynamic sections, start with current settings
                                        setSelectedContentType(section.contentType === 'work-history' ? 'story' : 'saved');
                                        setContentMethod('dynamic');
                                        setSelectedContent(null);
                                      }
                                      setShowAddSectionModal(true);
                                      setEditingSection(section.id);
                                    }}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Content
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      // TODO: Implement duplicate section
                                      console.log('Duplicate section:', section.id);
                                    }}>
                                      <Copy className="mr-2 h-4 w-4" />
                                      Duplicate Section
                                    </DropdownMenuItem>
                                    {section.type === 'paragraph' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => {
                                          setTemplate(prev => ({
                                            ...prev,
                                            sections: prev.sections.filter(s => s.id !== section.id)
                                          }));
                                        }} className="text-destructive">
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete Section
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent>
                            {section.isStatic ? (
                              <div>
                                <div className="mb-3">
                                  <Badge variant="secondary" className="mb-2">
                                    {getBlurbTitleByContent(section.staticContent || '', section.type)}
                                  </Badge>
                                  <div className="text-sm text-muted-foreground">
                                    {section.staticContent}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                Use best matching body paragraph story based on job description and goals
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        
                        {/* Insert Button Between Sections */}
                        {index < template.sections.length - 1 && (
                          <SectionInsertButton
                            onClick={() => addSection(index)}
                            variant="subtle"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Bottom Add Section Button - Only show if no sections exist */}
                  {template.sections.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mb-4">
                        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                          <Plus className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No sections yet</h3>
                        <p className="text-muted-foreground mb-6">
                          Start building your cover letter template by adding your first section
                        </p>
                      </div>
                      <Button 
                        variant="primary" 
                        onClick={() => addSection()}
                        size="lg"
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-5 w-5" />
                        Add Your First Section
                      </Button>
                    </div>
                  ) : (
                    <SectionInsertButton
                      onClick={() => addSection()}
                      variant="subtle"
                    />
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Blurb Selector Modal */}
      {showBlurbSelector && selectedSection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Choose a Story</CardTitle>
                  <CardDescription>
                    Select a pre-written story for your {getSectionTypeLabel(template.sections.find(s => s.id === selectedSection)?.type || '')} section
                  </CardDescription>
                </div>
                <Button 
                  variant="tertiary" 
                  onClick={() => {
                    setShowBlurbSelector(false);
                    setSelectedSection(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <div className="space-y-3">
                {/* Add New Button */}
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center">
                    <Button 
                      variant="secondary"
                      onClick={() => {
                        const sectionType = template.sections.find(s => s.id === selectedSection)?.type as 'intro' | 'closer' | 'signature';
                        setShowBlurbSelector(false);
                        setSelectedSection(null);
                        handleCreateBlurb(sectionType);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create New {getSectionTypeLabel(template.sections.find(s => s.id === selectedSection)?.type || '')} Story
                    </Button>
                  </CardContent>
                </Card>
                
                {/* Existing Stories */}
                {getAvailableBlurbs(template.sections.find(s => s.id === selectedSection)?.type || '').map((blurb) => (
                  <Card 
                    key={blurb.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => selectBlurbForSection(selectedSection, blurb)}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">{blurb.title}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{blurb.content}</p>
                      <div className="text-xs text-muted-foreground">
                        Click to select this story
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Work History Blurb Selector */}
      {showWorkHistorySelector && selectedSection && (
        <WorkHistoryBlurbSelector
          onSelectBlurb={handleSelectWorkHistoryBlurb}
          onCancel={() => {
            setShowWorkHistorySelector(false);
            setSelectedSection(null);
          }}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upload New Cover Letter</CardTitle>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Free plans are limited to one template. Uploading a new cover letter will replace your existing content and overwrite your existing selections.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="primary" 
                  className="flex-1"
                  asChild
                >
                  <Link to="/cover-letters">
                    I understand, proceed
                  </Link>
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => {
                    // TODO: Add navigation to pricing page
                    console.log('Navigate to paid plans');
                    setShowUploadModal(false);
                  }}
                >
                  Explore paid plans
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add New Content Type Modal */}
      {showAddContentTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add New Content Type</CardTitle>
                <button
                  onClick={() => setShowAddContentTypeModal(false)}
                  className="h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="content-type-label">Label</Label>
                  <Input
                    id="content-type-label"
                    placeholder="e.g., Experience Summary, Skills Highlight"
                    value={newContentType.label}
                    onChange={(e) => setNewContentType({ ...newContentType, label: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="content-type-description">Description</Label>
                  <Textarea
                    id="content-type-description"
                    placeholder="Describe what this content type is for..."
                    value={newContentType.description}
                    onChange={(e) => setNewContentType({ ...newContentType, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button 
                  variant="primary" 
                  className="w-full"
                  onClick={handleCreateContentType}
                  disabled={!newContentType.label.trim() || !newContentType.description.trim()}
                >
                  Create Content Type
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

              {/* Add Saved Section Modal */}
      <FormModal
        isOpen={showAddReusableContentModal}
        onClose={() => setShowAddReusableContentModal(false)}
        title={`Add New ${newReusableContent.contentType ? newReusableContent.contentType.charAt(0).toUpperCase() + newReusableContent.contentType.slice(1) : 'Section'}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="reusable-content-title">Title</Label>
            <Input
              id="reusable-content-title"
              placeholder="e.g., Professional Introduction, Passionate Closing"
              value={newReusableContent.title}
              onChange={(e) => setNewReusableContent({ ...newReusableContent, title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="reusable-content-content">Content</Label>
            <Textarea
              id="reusable-content-content"
              placeholder="Write your content here..."
              value={newReusableContent.content}
              onChange={(e) => setNewReusableContent({ ...newReusableContent, content: e.target.value })}
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="reusable-content-tags">Tags (comma-separated)</Label>
            <Input
              id="reusable-content-tags"
              placeholder="e.g., professional, passionate, technical"
              value={newReusableContent.tags}
              onChange={(e) => setNewReusableContent({ ...newReusableContent, tags: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button 
            variant="primary" 
            className="w-full"
            onClick={handleCreateReusableContent}
            disabled={!newReusableContent.title.trim() || !newReusableContent.content.trim()}
          >
            Create Content
          </Button>
        </div>
      </FormModal>

      {/* Add New Section Modal */}
      {showAddSectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-6xl max-h-[90vh] bg-background rounded-lg shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold">{editingSection ? 'Edit Section' : 'Add New Section'}</h2>
                <p className="text-muted-foreground">
                  {editingSection ? 'Modify the content and settings of this section' : 'Choose how you want to add content to your template'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddSectionModal(false);
                  setSelectedContentType(null);
                  setContentMethod(null);
                  setShowSelectionPanel(false);
                  setSelectedCompany('');
                  setSelectedRole('');
                  setSelectedReusableType('');
                  setSelectedContent(null);
                  setEditingSection(null);
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="flex h-auto relative">
              {/* Single Panel - Content Type Selection */}
              <div className={`w-full p-6 transition-transform duration-300 ease-in-out ${showSelectionPanel ? '-translate-x-full' : 'translate-x-0'}`}>
                <div className="space-y-6">
                  {/* Combined Step 1 & 2: Content Type and Method Selection */}
                  <div className="space-y-6">
                    {/* Step 1: Content Type */}
                    <div className="mb-4">
                      <Label className="text-base font-medium">1. Choose Content Type</Label>
                      <div className="flex gap-3 mt-2">
                        <Button
                          variant={selectedContentType === 'story' ? 'default' : 'secondary'}
                          onClick={() => setSelectedContentType('story')}
                          className="flex-1 h-20 flex-col justify-center items-center gap-1"
                        >
                          <div className="text-center">
                            <div className="font-medium">Story</div>
                            <div className="text-sm text-muted-foreground">From your work history</div>
                          </div>
                        </Button>
                        <Button
                          variant={selectedContentType === 'saved' ? 'default' : 'secondary'}
                          onClick={() => setSelectedContentType('saved')}
                          className="flex-1 h-20 flex-col justify-center items-center gap-1"
                        >
                          <div className="text-center">
                            <div className="font-medium">Saved Sections</div>
                            <div className="text-sm text-muted-foreground">Custom templates</div>
                          </div>
                        </Button>
                      </div>
                    </div>

                    {/* Step 2: Content Method */}
                    <div className="mt-4">
                      <Label className="text-base font-medium">2. Choose Method</Label>
                      <div className="flex gap-3 mt-2">
                        <Button
                          variant={contentMethod === 'dynamic' ? 'default' : 'secondary'}
                          onClick={() => setContentMethod('dynamic')}
                          className="flex-1 h-20 flex-col justify-center items-center gap-1"
                        >
                          <div className="text-center">
                            <span className="font-medium">Dynamic (Default)</span>
                            <span className="text-sm text-muted-foreground block">Intelligently match {selectedContentType === 'story' ? 'stories' : 'content'} based on job description</span>
                          </div>
                        </Button>
                        <Button
                          variant={contentMethod === 'static' ? 'default' : 'secondary'}
                          onClick={() => setContentMethod('static')}
                          className="flex-1 h-20 flex-col justify-center items-center gap-1"
                        >
                          <div className="text-center">
                            <span className="font-medium">Static (Custom)</span>
                            <span className="text-sm text-muted-foreground block">Choose specific content from your library</span>
                          </div>
                        </Button>
                      </div>
                    </div>

                    {/* CTA Button - Always visible, enabled when both selections are made */}
                    <div className="pt-4 flex justify-end">
                      {contentMethod === 'dynamic' && (
                        <Button
                          variant="default"
                          disabled={!selectedContentType || !contentMethod}
                          onClick={() => {
                            // Create dynamic section
                            createSectionFromModal();
                          }}
                        >
                          {editingSection ? 'Update Section' : 'Add Section'}
                        </Button>
                      )}
                      {contentMethod === 'static' && (
                        <Button
                          variant="default"
                          disabled={!selectedContentType || !contentMethod}
                          onClick={() => {
                            if (editingSection && selectedContent) {
                              // If editing and content is already selected, update immediately
                              createSectionFromModal();
                            } else {
                              // Otherwise, show selection panel
                              setShowSelectionPanel(true);
                            }
                          }}
                        >
                          {editingSection && selectedContent ? 'Update Section' : 'Continue to Selection'}
                        </Button>
                      )}
                      {!contentMethod && (
                        <Button
                          variant="default"
                          disabled={!selectedContentType || !contentMethod}
                          onClick={() => {}}
                        >
                          {editingSection ? 'Update Section' : 'Add Section'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

                                {/* Content Selection Panel - Slides in from right */}
                  <div className={`absolute top-0 right-0 w-full h-full bg-background transition-transform duration-300 ease-in-out ${showSelectionPanel ? 'translate-x-0' : 'translate-x-full'}`}>

                  {/* Content Selection */}
                  <div className="p-6 h-full overflow-y-auto">
                    {/* Single Dynamic Back Button - Always visible on slide-in panel */}
                    <div className="mb-4">
                      <span 
                        className="cursor-pointer text-primary hover:text-primary/80 font-medium text-sm"
                        onClick={() => {
                          if (selectedRole) {
                            setSelectedRole('');
                          } else if (selectedCompany) {
                            setSelectedCompany('');
                          } else if (selectedReusableType) {
                            setSelectedReusableType('');
                          } else {
                            // Go back to main modal screen
                            setShowSelectionPanel(false);
                          }
                        }}
                      >
                        {selectedRole ? '← Back to Role' : selectedCompany ? '← Back to Company' : selectedReusableType ? '← Back to Content Types' : '← Back'}
                      </span>
                    </div>
                    
                    {selectedContentType === 'story' && (
                      /* Story Selection - Single Panel at a time */
                      <div>
                        {/* Company Selection */}
                        {!selectedCompany && (
                          <div className="space-y-2">
                            {mockWorkHistory.map((company) => (
                              <div
                                key={company.id}
                                className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                                onClick={() => setSelectedCompany(company.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium">{company.name}</h4>
                                    <p className="text-sm text-muted-foreground">{company.description}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">{company.roles.length} role{company.roles.length !== 1 ? 's' : ''}</Badge>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Role Selection */}
                        {selectedCompany && !selectedRole && (
                          <div className="space-y-2">
                            {mockWorkHistory
                              .find(c => c.id === selectedCompany)
                              ?.roles.map((role) => (
                                <div
                                  key={role.id}
                                  className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                                  onClick={() => setSelectedRole(role.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-medium">{role.title}</h4>
                                      <p className="text-sm text-muted-foreground">{role.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary">{role.blurbs.length} story{role.blurbs.length === 1 ? '' : 's'}</Badge>
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Story Selection */}
                        {selectedRole && (
                          <div className="space-y-3">
                            {mockWorkHistory
                              .find(c => c.id === selectedCompany)
                              ?.roles.find(r => r.id === selectedRole)
                              ?.blurbs.map((blurb) => (
                                <div
                                  key={blurb.id}
                                  className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                                  onClick={() => handleContentSelection(blurb)}
                                >
                                  <div className="space-y-3">
                                    <h4 className="font-medium">{blurb.title}</h4>
                                    <p className="text-sm text-muted-foreground">{blurb.content}</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedContentType === 'saved' && (
                      /* Saved Sections Selection - Single Panel at a time */
                      <div>
                        {/* Content Type Selection */}
                        {!selectedReusableType && (
                          <div className="space-y-2">
                            {['Intro', 'Closing', 'Signature'].map((contentType) => (
                              <div
                                key={contentType}
                                className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                                onClick={() => setSelectedReusableType(contentType)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium">{contentType}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {contentType === 'Intro' && 'Opening paragraphs and introductions'}
                                      {contentType === 'Closing' && 'Closing statements and calls to action'}
                                      {contentType === 'Signature' && 'Professional sign-offs and contact information'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                      {mockTemplateBlurbs.filter(b => b.type === contentType.toLowerCase()).length} items
                                    </Badge>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Content Selection */}
                        {selectedReusableType && (
                          <div className="space-y-3">
                            {mockTemplateBlurbs
                              .filter(b => b.type === selectedReusableType.toLowerCase())
                              .map((blurb) => (
                                <div
                                  key={blurb.id}
                                  className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                                  onClick={() => handleContentSelection(blurb)}
                                >
                                  <div className="space-y-3">
                                    <h4 className="font-medium">{blurb.title}</h4>
                                    <p className="text-sm text-muted-foreground">{blurb.content}</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
            </div>
          </div>
        </div>
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

      {/* Preview Modal */}
      <CoverLetterViewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        coverLetter={{
          id: "preview-template",
          title: "Template Preview",
          content: {
            sections: [
              {
                content: `Dear Hiring Manager,

I am writing to express my strong interest in the [Position] role at [Company]. With my background in [Industry/Field], I am excited about the opportunity to contribute to your team's success.

[Your personalized content will appear here based on your template settings and selected work history stories.]

I am particularly excited about this opportunity because your focus on [Company Value/Goal] aligns perfectly with my passion for [Relevant Area]. I am confident that my experience in [Key Skill/Area] and my track record of [Achievement/Result] would make me a valuable addition to your team.

Thank you for considering my application. I look forward to the opportunity to discuss how I can contribute to [Company]'s continued success.

Sincerely,
[Your Name]`
              }
            ]
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }}
      />
      </div>
    </div>
  );
};