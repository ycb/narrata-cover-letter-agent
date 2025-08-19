import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, FileText, Target } from "lucide-react";
import { STORY_TEMPLATES, STORY_TEMPLATE_CATEGORIES } from "@/lib/constants/storyTemplates";
import type { WorkHistoryBlurb, StoryTemplate } from "@/types/workHistory";

interface AddStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId: string;
  onSave: (story: Omit<WorkHistoryBlurb, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialStory?: Partial<WorkHistoryBlurb>;
}

export const AddStoryModal = ({ 
  open, 
  onOpenChange, 
  roleId, 
  onSave,
  initialStory 
}: AddStoryModalProps) => {
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [title, setTitle] = useState(initialStory?.title || '');
  const [content, setContent] = useState(initialStory?.content || '');
  const [outcomeMetrics, setOutcomeMetrics] = useState(initialStory?.outcomeMetrics || '');
  const [tags, setTags] = useState<string[]>(initialStory?.tags || []);
  const [newTag, setNewTag] = useState('');

  // Auto-fill template when selected
  useEffect(() => {
    if (useTemplate && selectedTemplate && STORY_TEMPLATES[selectedTemplate]) {
      setContent(STORY_TEMPLATES[selectedTemplate].prompt);
    }
  }, [useTemplate, selectedTemplate]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      if (initialStory) {
        setTitle(initialStory.title || '');
        setContent(initialStory.content || '');
        setOutcomeMetrics(initialStory.outcomeMetrics || '');
        setTags(initialStory.tags || []);
        setUseTemplate(false);
        setSelectedTemplate('');
      } else {
        setTitle('');
        setContent('');
        setOutcomeMetrics('');
        setTags([]);
        setUseTemplate(false);
        setSelectedTemplate('');
      }
    }
  }, [open, initialStory]);

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;

    const story: Omit<WorkHistoryBlurb, 'id' | 'createdAt' | 'updatedAt'> = {
      roleId,
      title: title.trim(),
      content: content.trim(),
      outcomeMetrics: outcomeMetrics.trim() || undefined,
      tags,
      source: 'manual',
      status: 'approved', // All user-created stories are approved by default
      confidence: 'high',
      timesUsed: 0,
      linkedExternalLinks: []
    };

    onSave(story);
    onOpenChange(false);
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const isFormValid = title.trim() && content.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {initialStory ? 'Edit Story' : 'Add Story'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Toggle */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={useTemplate}
                  onCheckedChange={setUseTemplate}
                />
                <Label className="text-sm font-medium">
                  Use a template to get started
                </Label>
              </div>
            </CardHeader>
            
            {useTemplate && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <Label>Story Type</Label>
                  <Select 
                    value={selectedTemplate}
                    onValueChange={setSelectedTemplate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a story template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(STORY_TEMPLATES).map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{template.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {template.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedTemplate && STORY_TEMPLATES[selectedTemplate] && (
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Template Preview</span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {STORY_TEMPLATES[selectedTemplate].prompt}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Story Title */}
          <div className="space-y-2">
            <Label htmlFor="story-title">Story Title *</Label>
            <Input
              id="story-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title for your story..."
            />
          </div>

          {/* Story Content */}
          <div className="space-y-2">
            <Label htmlFor="story-content">Story Content *</Label>
            <Textarea
              id="story-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your story here..."
              className="min-h-[200px] resize-none"
            />
          </div>

          {/* Outcome Metrics */}
          <div className="space-y-2">
            <Label htmlFor="outcome-metrics">Outcome Metrics (Optional)</Label>
            <Textarea
              id="outcome-metrics"
              value={outcomeMetrics}
              onChange={(e) => setOutcomeMetrics(e.target.value)}
              placeholder="e.g., Increased user engagement by 40%, Reduced churn by 25%..."
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a tag..."
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm"
                  onClick={addTag}
                  disabled={!newTag.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6">
          <Button 
            variant="secondary" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isFormValid}
          >
            {initialStory ? 'Update Story' : 'Save Story'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
