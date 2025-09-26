import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Save, X, FileText, Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateBlurb } from "./TemplateBlurbMaster";
import { TagSuggestionButton } from "@/components/ui/TagSuggestionButton";
import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";

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

  // Tag suggestion state
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<any[]>([]);

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

  // Tag suggestion handlers
  const handleTagSuggestions = async (tags: string[]) => {
    // Generate mock tag suggestions based on content
    const mockTags = await generateMockTags(formData.content);
    
    const tagSuggestions = mockTags.map((tag, index) => ({
      id: `tag-${index}`,
      value: tag,
      confidence: Math.random() > 0.5 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low'
    }));
    setSuggestedTags(tagSuggestions);
    setIsTagModalOpen(true);
  };

  // Mock tag generation function
  const generateMockTags = async (content: string): Promise<string[]> => {
    // No delay for demo purposes
    
    const keywords = content.toLowerCase();
    const suggestedTags: string[] = [];
    
    // Cover letter specific tags
    if (keywords.includes('passionate') || keywords.includes('excited')) {
      suggestedTags.push('Passionate');
    }
    if (keywords.includes('professional') || keywords.includes('experienced')) {
      suggestedTags.push('Professional');
    }
    if (keywords.includes('technical') || keywords.includes('engineering')) {
      suggestedTags.push('Technical');
    }
    if (keywords.includes('leadership') || keywords.includes('lead')) {
      suggestedTags.push('Leadership');
    }
    if (keywords.includes('innovation') || keywords.includes('creative')) {
      suggestedTags.push('Innovation');
    }
    if (keywords.includes('collaboration') || keywords.includes('team')) {
      suggestedTags.push('Collaboration');
    }
    if (keywords.includes('results') || keywords.includes('achievement')) {
      suggestedTags.push('Results-driven');
    }
    if (keywords.includes('growth') || keywords.includes('scale')) {
      suggestedTags.push('Growth');
    }
    
    // Remove duplicates and limit to 5 tags
    return [...new Set(suggestedTags)].slice(0, 5);
  };

  const handleApplyTags = (selectedTags: string[]) => {
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, ...selectedTags.filter(tag => !prev.tags.includes(tag))]
    }));
    setIsTagModalOpen(false);
    setSuggestedTags([]);
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
        <CardTitle className="flex items-center gap-4">
          <FileText className="h-5 w-5" />
          {blurb ? 'Edit' : 'Create New Saved Section'}
        </CardTitle>
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
          <Label htmlFor="blurb-title">Title</Label>
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
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tags.length > 0 && formData.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            <TagSuggestionButton
              content={formData.content}
              onTagsSuggested={handleTagSuggestions}
              onClick={() => handleTagSuggestions([])}
              variant="tertiary"
              size="sm"
            />
          </div>
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
            Separate tags with commas. Tags help with matching saved sections to job requirements.
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
              Use this saved section as the default for new {getSectionTypeLabel(formData.type).toLowerCase()}s
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
          <Card className={cn(
            "mt-2",
            (blurb as any).hasGaps && "border-warning bg-warning/5"
          )}>
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
              <h4 className="font-medium mb-2">{formData.title || 'Untitled Saved Section'}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {formData.content || 'No content yet...'}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Gap Detection Cards */}
        {(blurb as any).hasGaps && (
          <div className="mt-4 border-warning bg-warning/5 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="font-medium text-warning">Content Gap</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Content needs improvement based on cover letter best practices.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => {
                console.log('Generate content for blurb gap:', blurb?.title);
                // TODO: Implement content generation
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Content
            </Button>
          </div>
        )}
      </CardContent>
      
      {/* Footer with Action Buttons */}
      <div className="flex justify-between p-6 border-t">
        <Button 
          variant="secondary" 
          onClick={() => {
            console.log('Generate content for blurb:', blurb?.title);
            // TODO: Implement content generation
          }}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Content
        </Button>
        <Button onClick={handleSave} disabled={!isFormValid}>
          <Save className="h-4 w-4 mr-2" />
          Save Section
        </Button>
      </div>
    </Card>

    {/* Tag Suggestion Modal */}
    <ContentGenerationModal
      isOpen={isTagModalOpen}
      onClose={() => {
        setIsTagModalOpen(false);
        setSuggestedTags([]);
      }}
      mode="tag-suggestion"
      content={formData.content}
      suggestedTags={suggestedTags}
      onApplyTags={handleApplyTags}
    />
  );
};