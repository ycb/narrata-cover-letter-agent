import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, FileText, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { STORY_TEMPLATES } from "@/lib/constants/storyTemplates";
import { LinkPicker } from "./LinkPicker";
import type { ExternalLink, WorkHistoryBlurb } from "@/types/workHistory";

interface AddStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId: string;
  onSave: (content: any) => void;
  existingLinks?: ExternalLink[];
  editingStory?: WorkHistoryBlurb | null;
}

export function AddStoryModal({ open, onOpenChange, roleId, onSave, existingLinks = [], editingStory }: AddStoryModalProps) {
  // Story state
  const [storyTitle, setStoryTitle] = useState(editingStory?.title || "");
  const [storyContent, setStoryContent] = useState(editingStory?.content || "");
  const [storyOutcomeMetrics, setStoryOutcomeMetrics] = useState<string[]>(editingStory?.outcomeMetrics || []);
  const [outcomeMetricInput, setOutcomeMetricInput] = useState("");
  const [storyTags, setStoryTags] = useState<string[]>(editingStory?.tags || []);
  const [storyTagInput, setStoryTagInput] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  // Link picker state
  const [isLinkPickerOpen, setIsLinkPickerOpen] = useState(false);
  
  const { toast } = useToast();

  // Update form when editing story changes
  useEffect(() => {
    if (editingStory) {
      setStoryTitle(editingStory.title);
      setStoryContent(editingStory.content);
      setStoryOutcomeMetrics(editingStory.outcomeMetrics || []);
      setOutcomeMetricInput("");
      setStoryTags(editingStory.tags);
    } else {
      // Reset form when not editing
      setStoryTitle("");
      setStoryContent("");
      setStoryOutcomeMetrics([]);
      setOutcomeMetricInput("");
      setStoryTags([]);
      setSelectedTemplate("");
    }
  }, [editingStory]);

  const handleAddStoryTag = () => {
    if (storyTagInput.trim() && !storyTags.includes(storyTagInput.trim())) {
      setStoryTags([...storyTags, storyTagInput.trim()]);
      setStoryTagInput("");
    }
  };

  const handleRemoveStoryTag = (tagToRemove: string) => {
    setStoryTags(storyTags.filter(tag => tag !== tagToRemove));
  };

  const handleTemplateSelect = (templateKey: string) => {
    const template = STORY_TEMPLATES[templateKey as keyof typeof STORY_TEMPLATES];
    if (template) {
      setStoryContent(template.prompt);
      setStoryOutcomeMetrics([]);
      setStoryTags([]);
      setSelectedTemplate(templateKey);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storyTitle.trim() || !storyContent.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in both title and content for the story.",
        variant: "destructive",
      });
      return;
    }

    const storyData = {
      type: "story" as const,
      roleId,
      title: storyTitle.trim(),
      content: storyContent.trim(),
      outcomeMetrics: storyOutcomeMetrics,
      tags: storyTags,
      source: "manual" as const,
      status: "draft" as const,
      confidence: "medium" as const,
      timesUsed: 0,
      linkedExternalLinks: [],
    };

    onSave(storyData);
    
    // Reset story form
    setStoryTitle("");
    setStoryContent("");
    setStoryOutcomeMetrics([]);
    setOutcomeMetricInput("");
    setStoryTags([]);
    setStoryTagInput("");
    setSelectedTemplate("");

    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddStoryTag();
    }
  };

  const handleLinkSelected = (link: ExternalLink, customLabel: string) => {
    const linkMarkup = `[${customLabel}](${link.url})`;
    
    // Insert link at cursor position or append to content
    if (storyContent) {
      setStoryContent(prev => prev + ' ' + linkMarkup);
    } else {
      setStoryContent(linkMarkup);
    }
    
    toast({
      title: "Link inserted",
      description: `"${customLabel}" has been added to your story.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingStory ? "Edit Story" : "Add Story"}</DialogTitle>
          <DialogDescription>
            {editingStory ? "Update your story with new details." : "Create a new story to showcase your achievements and impact in this role."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              {/* Story Templates */}
              <div className="space-y-2">
                <Label>Story Template (Optional)</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template to get started" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STORY_TEMPLATES).map(([key, template]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <div className="font-medium">{template.name}</div>
                          <div className="text-xs text-muted-foreground">{template.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="storyTitle">Story Title</Label>
                <Input
                  id="storyTitle"
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder="e.g., Product Strategy Leadership"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="storyContent">Story Content</Label>
                <div className="space-y-3">
                  <Textarea
                    id="storyContent"
                    value={storyContent}
                    onChange={(e) => setStoryContent(e.target.value)}
                    placeholder="Describe your achievement, the challenge you faced, and the impact you made..."
                    rows={6}
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Add supporting links to strengthen your story
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsLinkPickerOpen(true)}
                      className="h-8 px-3"
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Pick Links
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <Label htmlFor="storyOutcomeMetrics">Outcome Metrics (Optional)</Label>
                <div className="space-y-2">
                  {storyOutcomeMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={metric}
                        onChange={(e) => {
                          const updatedMetrics = [...storyOutcomeMetrics];
                          updatedMetrics[index] = e.target.value;
                          setStoryOutcomeMetrics(updatedMetrics);
                        }}
                        placeholder="Enter outcome metric..."
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updatedMetrics = storyOutcomeMetrics.filter((_, i) => i !== index);
                          setStoryOutcomeMetrics(updatedMetrics);
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={outcomeMetricInput}
                      onChange={(e) => setOutcomeMetricInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (outcomeMetricInput.trim() && !storyOutcomeMetrics.includes(outcomeMetricInput.trim())) {
                            setStoryOutcomeMetrics([...storyOutcomeMetrics, outcomeMetricInput.trim()]);
                            setOutcomeMetricInput('');
                          }
                        }
                      }}
                      placeholder="Add an outcome metric and press Enter"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (outcomeMetricInput.trim() && !storyOutcomeMetrics.includes(outcomeMetricInput.trim())) {
                          setStoryOutcomeMetrics([...storyOutcomeMetrics, outcomeMetricInput.trim()]);
                          setOutcomeMetricInput('');
                        }
                      }}
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="storyTags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="storyTags"
                    value={storyTagInput}
                    onChange={(e) => setStoryTagInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a tag and press Enter"
                  />
                  <Button type="button" onClick={handleAddStoryTag} size="sm">
                    Add
                  </Button>
                </div>
                
                {storyTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {storyTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveStoryTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end pt-4">
                <Button type="submit">
                  Add Story
                </Button>
              </div>
                        </form>
        </DialogContent>
        
        {/* Link Picker Modal */}
        <LinkPicker
          open={isLinkPickerOpen}
          onOpenChange={setIsLinkPickerOpen}
          existingLinks={existingLinks}
          onLinkSelected={handleLinkSelected}
        />
      </Dialog>
  );
}
