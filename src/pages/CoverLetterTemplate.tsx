import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, Save, ArrowLeft, Plus, GripVertical, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import type { CoverLetterSection, CoverLetterTemplate } from "@/types/workHistory";

// Mock template data
const mockTemplate: CoverLetterTemplate = {
  id: "template-1",
  name: "Professional Template",
  sections: [
    {
      id: "intro",
      type: "intro" as const,
      isStatic: false,
      blurbCriteria: {
        tags: ["introduction", "passion"],
        goals: ["engagement"]
      },
      order: 1
    },
    {
      id: "paragraph-1",
      type: "paragraph" as const,
      isStatic: false,
      blurbCriteria: {
        tags: ["experience", "technical"],
        goals: ["showcase-skills"]
      },
      order: 2
    },
    {
      id: "paragraph-2", 
      type: "paragraph" as const,
      isStatic: false,
      blurbCriteria: {
        tags: ["achievements", "impact"],
        goals: ["prove-value"]
      },
      order: 3
    },
    {
      id: "closer",
      type: "closer" as const,
      isStatic: true,
      staticContent: "I would welcome the opportunity to discuss how my background and passion can contribute to your team's continued success.",
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
  const [isEditing, setIsEditing] = useState(false);

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
        tags: [],
        goals: []
      },
      order: template.sections.length + 1
    };
    
    setTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
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
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Cover Letters
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Cover Letter Template</h1>
                <p className="text-muted-foreground">Configure your template structure</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Template
              </Button>
              <Button className="flex items-center gap-2" onClick={() => setIsEditing(!isEditing)}>
                <Save className="h-4 w-4" />
                {isEditing ? 'Save Changes' : 'Edit Template'}
              </Button>
            </div>
          </div>

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
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`tags-${section.id}`}>Required Tags</Label>
                        <Input
                          id={`tags-${section.id}`}
                          value={section.blurbCriteria?.tags.join(', ') || ''}
                          onChange={(e) => updateSection(section.id, {
                            blurbCriteria: {
                              ...section.blurbCriteria!,
                              tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                            }
                          })}
                          placeholder="e.g., technical, leadership, problem-solving"
                          disabled={!isEditing}
                          className="mt-2"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`goals-${section.id}`}>Content Goals</Label>
                        <Input
                          id={`goals-${section.id}`}
                          value={section.blurbCriteria?.goals.join(', ') || ''}
                          onChange={(e) => updateSection(section.id, {
                            blurbCriteria: {
                              ...section.blurbCriteria!,
                              goals: e.target.value.split(',').map(goal => goal.trim()).filter(Boolean)
                            }
                          })}
                          placeholder="e.g., showcase-skills, prove-value, demonstrate-fit"
                          disabled={!isEditing}
                          className="mt-2"
                        />
                      </div>
                      
                      <div className="pt-2">
                        <Badge variant="outline" className="text-xs">
                          Blurb matching will find relevant content based on tags and goals
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
        </div>
      </main>
    </div>
  );
};

export default CoverLetterTemplate;