import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, Save, ArrowLeft, Plus, GripVertical, Trash2, Edit, FileText, Library } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { TemplateBanner } from "@/components/layout/TemplateBanner";
import { Link, useNavigate } from "react-router-dom";
import { TemplateBlurbHierarchical } from "@/components/template-blurbs/TemplateBlurbHierarchical";
import { type TemplateBlurb } from "@/components/template-blurbs/TemplateBlurbMaster";
import { TemplateBlurbDetail } from "@/components/template-blurbs/TemplateBlurbDetail";
import { WorkHistoryBlurbSelector } from "@/components/work-history/WorkHistoryBlurbSelector";
import type { CoverLetterSection, CoverLetterTemplate, WorkHistoryBlurb } from "@/types/workHistory";

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
    tags: ["excitement", "team", "goals", "follow-up"],
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

const CoverLetterTemplate = () => {
  const navigate = useNavigate();
  const [template, setTemplate] = useState(mockTemplate);
  const [templateBlurbs, setTemplateBlurbs] = useState<TemplateBlurb[]>(mockTemplateBlurbs);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showBlurbSelector, setShowBlurbSelector] = useState(false);
  const [showWorkHistorySelector, setShowWorkHistorySelector] = useState(false);
  const [showBlurbLibrary, setShowBlurbLibrary] = useState(false);
  const [editingBlurb, setEditingBlurb] = useState<TemplateBlurb | null>(null);
  const [creatingBlurbType, setCreatingBlurbType] = useState<'intro' | 'closer' | 'signature' | null>(null);
  const [view, setView] = useState<'template' | 'library'>('template');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const getBlurbTitleByContent = (content: string, sectionType: string) => {
    const blurb = templateBlurbs.find(b => b.content === content && b.type === sectionType);
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

  const addSection = () => {
    const newSection: CoverLetterSection = {
      id: `paragraph-${Date.now()}`,
      type: 'paragraph',
      isStatic: false,
      blurbCriteria: {
        goals: ["describe the purpose of this paragraph"]
      },
      order: template.sections.length + 1
    };
    
    setTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
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
    return templateBlurbs.filter(blurb => blurb.type === sectionType);
  };

  const handleCreateBlurb = (type: 'intro' | 'closer' | 'signature') => {
    setCreatingBlurbType(type);
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
      <Header />
      <TemplateBanner
        onDone={handleDone}
      />
      
      {/* Tabs */}
      <div className="bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-8 py-2">
              <button
                onClick={() => setView('template')}
                className={`text-sm transition-colors px-3 pb-2 ${
                  view === 'template' 
                    ? 'font-bold text-foreground border-b-4 border-cta-primary' 
                    : 'font-medium text-muted-foreground hover:text-foreground'
                }`}
              >
                Template
              </button>
              <button
                onClick={() => setView('library')}
                className={`text-sm transition-colors px-3 pb-2 ${
                  view === 'library' 
                    ? 'font-bold text-foreground border-b-4 border-cta-primary' 
                    : 'font-medium text-muted-foreground hover:text-foreground'
                }`}
              >
                Blurb Library
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <main className="container mx-auto px-4 pb-6">
        <div className="max-w-4xl mx-auto">

          {/* Content Area */}
          {view === 'template' ? (
            <>
              {/* Template Settings */}
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Template Settings</CardTitle>
                    <button 
                      onClick={() => setShowUploadModal(true)}
                      className="text-sm text-muted-foreground hover:text-foreground underline"
                    >
                      Upload New Cover Letter
                    </button>
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
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sections */}
              <div className="space-y-4">
                {template.sections.map((section, index) => (
                  <Card key={section.id} className="relative">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <CardTitle className="text-lg">
                              {getSectionTypeLabel(section.type)} {section.type === 'paragraph' ? `${index}` : ''}
                            </CardTitle>
                            <CardDescription>
                              {section.isStatic ? 'Static content' : 'Dynamic blurb matching'}
                            </CardDescription>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
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
                          
                          {section.type === 'paragraph' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeSection(section.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {section.isStatic ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
                              {getBlurbTitleByContent(section.staticContent || '', section.type)}
                            </Badge>
                            <button
                              onClick={() => {
                                setSelectedSection(section.id);
                                if (section.type === 'intro' || section.type === 'closer' || section.type === 'signature') {
                                  setShowBlurbSelector(true);
                                } else {
                                  setShowWorkHistorySelector(true);
                                }
                              }}
                              className="text-sm text-cta-tertiary-foreground hover:text-cta-primary underline"
                            >
                              Edit
                            </button>
                          </div>
                          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded border">
                            {section.staticContent}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded border">
                            Use best matching {getSectionTypeLabel(section.type).toLowerCase()} blurb based on job description and goals
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                <Card className="border-dashed">
                  <CardContent className="py-8">
                    <div className="text-center">
                      <Button onClick={addSection} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Body Paragraph
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <>
              <TemplateBlurbHierarchical
                blurbs={templateBlurbs.map(blurb => ({
                  ...blurb,
                  status: 'approved' as const,
                  confidence: 'high' as const,
                  timesUsed: 0
                }))}
                selectedBlurbId={undefined}
                onSelectBlurb={handleSelectBlurbFromLibrary}
                onCreateBlurb={handleCreateBlurb}
                onEditBlurb={handleEditBlurb}
                onDeleteBlurb={handleDeleteBlurb}
              />
              
              {/* Create/Edit Blurb Modal */}
              {(editingBlurb || creatingBlurbType) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="w-full max-w-2xl max-h-[80vh] overflow-auto">
                    <TemplateBlurbDetail
                      blurb={editingBlurb}
                      isEditing={true}
                      onSave={handleSaveBlurb}
                      onCancel={() => {
                        setEditingBlurb(null);
                        setCreatingBlurbType(null);
                      }}
                      type={creatingBlurbType}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Blurb Selector Modal */}
          {showBlurbSelector && selectedSection && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Choose a Blurb</CardTitle>
                      <CardDescription>
                        Select a pre-written blurb for your {getSectionTypeLabel(template.sections.find(s => s.id === selectedSection)?.type || '')} section
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
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
                          variant="outline"
                          onClick={() => {
                            const sectionType = template.sections.find(s => s.id === selectedSection)?.type as 'intro' | 'closer' | 'signature';
                            setShowBlurbSelector(false);
                            setSelectedSection(null);
                            handleCreateBlurb(sectionType);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Create New {getSectionTypeLabel(template.sections.find(s => s.id === selectedSection)?.type || '')} Blurb
                        </Button>
                      </CardContent>
                    </Card>
                    
                    {/* Existing Blurbs */}
                    {getAvailableBlurbs(template.sections.find(s => s.id === selectedSection)?.type || '').map((blurb) => (
                      <Card 
                        key={blurb.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/20"
                        onClick={() => selectBlurbForSection(selectedSection, blurb)}
                      >
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">{blurb.title}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{blurb.content}</p>
                          <div className="text-xs text-muted-foreground">
                            Click to select this blurb
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
                    <Button
                      variant="outline"
                      onClick={() => setShowUploadModal(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-6">
                    Free plans are limited to one template. Uploading a new cover letter will replace your existing content and overwrite your existing selections.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      variant="cta-primary" 
                      className="flex-1"
                      asChild
                    >
                      <Link to="/cover-letters">
                        I understand, proceed
                      </Link>
                    </Button>
                    <Button 
                      variant="cta-secondary" 
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
        </div>
      </main>
    </div>
  );
};

export default CoverLetterTemplate;