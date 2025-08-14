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
import { Link } from "react-router-dom";
import { TemplateBlurbMaster, type TemplateBlurb } from "@/components/template-blurbs/TemplateBlurbMaster";
import { TemplateBlurbDetail } from "@/components/template-blurbs/TemplateBlurbDetail";
import type { CoverLetterSection, CoverLetterTemplate } from "@/types/workHistory";

// Mock template blurbs library
const mockTemplateBlurbs: TemplateBlurb[] = [
  {
    id: "intro-1",
    type: "intro",
    title: "Standard Professional Opening",
    content: "I am writing to express my strong interest in the [Position] role at [Company]. With my background in [Industry/Field], I am excited about the opportunity to contribute to your team's success.",
    isDefault: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "intro-2", 
    type: "intro",
    title: "Passionate Connection",
    content: "I was thrilled to discover the [Position] opening at [Company], as it perfectly aligns with my passion for [Industry/Field] and my career goals in [Specific Area].",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "intro-3",
    type: "intro",
    title: "Referral Opening",
    content: "I was referred to this [Position] opportunity at [Company] by [Referral Name], who spoke highly of your team and the innovative work you're doing in [Industry/Field].",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "closer-1",
    type: "closer",
    title: "Standard Professional Close",
    content: "I would welcome the opportunity to discuss how my background and passion can contribute to your team's continued success. Thank you for your time and consideration.",
    isDefault: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "closer-2",
    type: "closer",
    title: "Eager Follow-up",
    content: "I am excited about the possibility of joining your team and would love to discuss how I can help [Company] achieve its goals. I look forward to hearing from you soon.",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "closer-3",
    type: "closer",
    title: "Value-focused Close",
    content: "I am confident that my skills and experience would be valuable additions to your team. I would appreciate the opportunity to discuss how I can contribute to [Company]'s continued growth and success.",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "signature-1",
    type: "signature",
    title: "Professional",
    content: "Sincerely,\n[Your Name]",
    isDefault: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "signature-2",
    type: "signature",
    title: "Warm Professional",
    content: "Best regards,\n[Your Name]",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "signature-3",
    type: "signature",
    title: "Respectful",
    content: "Respectfully,\n[Your Name]",
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
  const [template, setTemplate] = useState(mockTemplate);
  const [templateBlurbs, setTemplateBlurbs] = useState<TemplateBlurb[]>(mockTemplateBlurbs);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showBlurbSelector, setShowBlurbSelector] = useState(false);
  const [showBlurbLibrary, setShowBlurbLibrary] = useState(false);
  const [editingBlurb, setEditingBlurb] = useState<TemplateBlurb | null>(null);
  const [creatingBlurbType, setCreatingBlurbType] = useState<'intro' | 'closer' | 'signature' | null>(null);
  const [view, setView] = useState<'template' | 'library'>('template');

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
    setView('library');
  };

  const handleEditBlurb = (blurb: TemplateBlurb) => {
    setEditingBlurb(blurb);
    setCreatingBlurbType(null);
    setView('library');
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setTemplateBlurbs(prev => [...prev, newBlurb]);
    }
    
    setEditingBlurb(null);
    setCreatingBlurbType(null);
    setView('template');
  };

  const handleDeleteBlurb = (blurbId: string) => {
    setTemplateBlurbs(prev => prev.filter(blurb => blurb.id !== blurbId));
  };

  const handleSelectBlurbFromLibrary = (blurb: TemplateBlurb) => {
    if (selectedSection) {
      selectBlurbForSection(selectedSection, blurb);
    }
  };

  const removeSection = (sectionId: string) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Cover Letter Template</h1>
              <p className="text-muted-foreground">Configure your template structure and content</p>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex items-center gap-2" asChild>
                <Link to="/cover-letters">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Cover Letters
                </Link>
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant={view === 'template' ? 'default' : 'outline'}
                  onClick={() => setView('template')}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Template
                </Button>
                <Button
                  variant={view === 'library' ? 'default' : 'outline'}
                  onClick={() => setView('library')}
                  className="flex items-center gap-2"
                >
                  <Library className="h-4 w-4" />
                  Blurb Library
                </Button>
              </div>
              
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Template
              </Button>
              
              {view === 'template' && (
                <Button className="flex items-center gap-2" onClick={() => setIsEditing(!isEditing)}>
                  <Save className="h-4 w-4" />
                  {isEditing ? 'Save Changes' : 'Edit Template'}
                </Button>
              )}
            </div>
          </div>

          {/* Content Area */}
          {view === 'template' ? (
            <>
              {/* Template Name */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Template Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        value={template.name}
                        onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                        disabled={!isEditing}
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
                              onCheckedChange={(checked) => updateSection(section.id, { isStatic: checked })}
                              disabled={!isEditing}
                            />
                          </div>
                          
                          {isEditing && section.type === 'paragraph' && (
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
                          <div>
                            <Label htmlFor={`content-${section.id}`}>Content</Label>
                            <Textarea
                              id={`content-${section.id}`}
                              value={section.staticContent || ''}
                              onChange={(e) => updateSection(section.id, { staticContent: e.target.value })}
                              disabled={!isEditing}
                              rows={3}
                              className="mt-2"
                            />
                          </div>
                          
                          {isEditing && (section.type === 'intro' || section.type === 'closer' || section.type === 'signature') && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedSection(section.id);
                                  setShowBlurbSelector(true);
                                }}
                                className="flex items-center gap-2"
                              >
                                <FileText className="h-4 w-4" />
                                Choose Different Blurb
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor={`goals-${section.id}`}>Content Goals</Label>
                            <Textarea
                              id={`goals-${section.id}`}
                              value={section.blurbCriteria?.goals.join('\n') || ''}
                              onChange={(e) => updateSection(section.id, {
                                blurbCriteria: {
                                  goals: e.target.value.split('\n').map(goal => goal.trim()).filter(Boolean)
                                }
                              })}
                              placeholder="Describe the purpose and goals for this paragraph..."
                              disabled={!isEditing}
                              rows={2}
                              className="mt-2"
                            />
                          </div>
                          
                          <div className="pt-2">
                            <Badge variant="outline" className="text-xs">
                              LLM will suggest best matching blurbs based on job description and goals
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {isEditing && (
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
                )}
              </div>
            </>
          ) : view === 'library' && (editingBlurb || creatingBlurbType) ? (
            <TemplateBlurbDetail
              blurb={editingBlurb}
              isEditing={true}
              onSave={handleSaveBlurb}
              onCancel={() => {
                setEditingBlurb(null);
                setCreatingBlurbType(null);
                setView('template');
              }}
              type={creatingBlurbType}
            />
          ) : (
            <TemplateBlurbMaster
              blurbs={templateBlurbs}
              selectedBlurbId={undefined}
              onSelectBlurb={handleSelectBlurbFromLibrary}
              onCreateBlurb={handleCreateBlurb}
              onEditBlurb={handleEditBlurb}
              onDeleteBlurb={handleDeleteBlurb}
            />
          )}

          {/* Blurb Selector Modal */}
          {showBlurbSelector && selectedSection && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
                <CardHeader>
                  <CardTitle>Choose a Blurb</CardTitle>
                  <CardDescription>
                    Select a pre-written blurb for your {getSectionTypeLabel(template.sections.find(s => s.id === selectedSection)?.type || '')} section
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-y-auto">
                  <div className="space-y-3">
                    {getAvailableBlurbs(template.sections.find(s => s.id === selectedSection)?.type || '').map((blurb) => (
                      <Card key={blurb.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">{blurb.title}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{blurb.content}</p>
                          <Button 
                            size="sm" 
                            onClick={() => selectBlurbForSection(selectedSection, blurb)}
                          >
                            Use This Blurb
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
                <div className="flex justify-end gap-2 p-6 pt-0">
                  <Button variant="outline" onClick={() => {
                    setShowBlurbSelector(false);
                    setSelectedSection(null);
                  }}>
                    Cancel
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CoverLetterTemplate;