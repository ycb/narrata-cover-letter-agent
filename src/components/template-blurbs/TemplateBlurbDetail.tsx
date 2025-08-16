import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Save, X, FileText } from "lucide-react";
import type { TemplateBlurb } from "./TemplateBlurbMaster";

interface TemplateBlurbDetailProps {
  blurb?: TemplateBlurb;
  isEditing: boolean;
  onSave: (blurb: Partial<TemplateBlurb>) => void;
  onCancel: () => void;
  type?: 'intro' | 'closer' | 'signature';
}

export const TemplateBlurbDetail = ({
  blurb,
  isEditing,
  onSave,
  onCancel,
  type
}: TemplateBlurbDetailProps) => {
  const [formData, setFormData] = useState({
    title: blurb?.title || '',
    content: blurb?.content || '',
    type: blurb?.type || type || 'intro',
    tags: blurb?.tags || [],
    isDefault: blurb?.isDefault || false
  });

  useEffect(() => {
    if (blurb) {
      setFormData({
        title: blurb.title,
        content: blurb.content,
        type: blurb.type,
        tags: blurb.tags || [],
        isDefault: blurb.isDefault || false
      });
    } else if (type) {
      setFormData(prev => ({ ...prev, type }));
    }
  }, [blurb, type]);

  const getSectionTypeLabel = (type: string) => {
    switch (type) {
      case 'intro': return 'Introduction';
      case 'closer': return 'Closing';
      case 'signature': return 'Signature';
      default: return type;
    }
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'intro':
        return "I am writing to express my strong interest in the [Position] role at [Company]. With my background in [Industry/Field], I am excited about the opportunity to contribute to your team's success.";
      case 'closer':
        return "I would welcome the opportunity to discuss how my background and passion can contribute to your team's continued success. Thank you for your time and consideration.";
      case 'signature':
        return "Sincerely,\n[Your Name]";
      default:
        return "";
    }
  };

  const handleSave = () => {
    onSave({
      ...formData,
      id: blurb?.id,
      createdAt: blurb?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };

  const useDefaultContent = () => {
    setFormData(prev => ({
      ...prev,
      content: getDefaultContent(prev.type)
    }));
  };

  const isFormValid = formData.title.trim() !== '' && formData.content.trim() !== '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-4">
              <FileText className="h-5 w-5" />
              {blurb ? 'Edit' : 'Create'} {getSectionTypeLabel(formData.type)} Blurb
            </CardTitle>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isFormValid}>
              <Save className="h-4 w-4 mr-2" />
              Save Blurb
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Type Selection */}
        <div>
          <Label>Section Type</Label>
          <div className="flex gap-2 mt-2">
            {(['intro', 'closer', 'signature'] as const).map((typeOption) => (
              <Button
                key={typeOption}
                variant={formData.type === typeOption ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData(prev => ({ ...prev, type: typeOption }))}
                disabled={!!blurb} // Can't change type of existing blurb
              >
                {getSectionTypeLabel(typeOption)}
              </Button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="blurb-title">Blurb Title</Label>
          <Input
            id="blurb-title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Professional Opening, Passionate Connection"
            className="mt-2"
          />
        </div>

        {/* Tags */}
        <div>
          <Label htmlFor="blurb-tags">Tags</Label>
          <Input
            id="blurb-tags"
            value={formData.tags.join(', ')}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
            }))}
            placeholder="e.g., professional, passionate, technical"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Separate tags with commas. Tags help with matching blurbs to job requirements.
          </p>
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="blurb-content">Content</Label>
            {!blurb && (
              <Button
                variant="outline"
                size="sm"
                onClick={useDefaultContent}
                className="text-xs"
              >
                Use Default Template
              </Button>
            )}
          </div>
          <Textarea
            id="blurb-content"
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Enter your cover letter content here..."
            rows={6}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use placeholders like [Position], [Company], [Industry/Field] for dynamic content
          </p>
        </div>

        {/* Default Setting */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div>
            <Label htmlFor="is-default" className="font-medium">
              Set as Default
            </Label>
            <p className="text-sm text-muted-foreground">
              Use this blurb as the default for new {getSectionTypeLabel(formData.type).toLowerCase()} sections
            </p>
          </div>
          <Switch
            id="is-default"
            checked={formData.isDefault}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
          />
        </div>

        {/* Preview */}
        <div>
          <Label>Preview</Label>
          <Card className="mt-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {getSectionTypeLabel(formData.type)}
                </Badge>
                {formData.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <h4 className="font-medium mb-2">{formData.title || 'Untitled Blurb'}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {formData.content || 'No content yet...'}
              </p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};