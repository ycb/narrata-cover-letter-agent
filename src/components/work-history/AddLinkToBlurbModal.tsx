
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Plus, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ExternalLink as ExternalLinkType } from "@/types/workHistory";

interface AddLinkToBlurbModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLinks: ExternalLinkType[];
  onLinkInserted: (linkText: string) => void;
}

export function AddLinkToBlurbModal({ 
  open, 
  onOpenChange, 
  existingLinks, 
  onLinkInserted 
}: AddLinkToBlurbModalProps) {
  const [displayText, setDisplayText] = useState("");
  const [selectedLinkId, setSelectedLinkId] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const { toast } = useToast();

  const handleAddNewTag = () => {
    if (newTagInput.trim() && !newTags.includes(newTagInput.trim())) {
      setNewTags([...newTags, newTagInput.trim()]);
      setNewTagInput("");
    }
  };

  const handleRemoveNewTag = (tagToRemove: string) => {
    setNewTags(newTags.filter(tag => tag !== tagToRemove));
  };

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleInsertExisting = () => {
    if (!displayText.trim() || !selectedLinkId) {
      toast({
        title: "Missing information",
        description: "Please enter display text and select a link.",
        variant: "destructive",
      });
      return;
    }

    const selectedLink = existingLinks.find(link => link.id === selectedLinkId);
    if (selectedLink) {
      const linkText = `[${displayText}](${selectedLink.url})`;
      onLinkInserted(linkText);
      handleClose();
    }
  };

  const handleInsertNew = () => {
    if (!displayText.trim() || !newUrl.trim() || !newLabel.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in display text, URL, and label.",
        variant: "destructive",
      });
      return;
    }

    if (!validateUrl(newUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL (including http:// or https://).",
        variant: "destructive",
      });
      return;
    }

    // Here you would typically save the new link to your backend/state management
    console.log("Creating new external link:", { url: newUrl, label: newLabel, tags: newTags });
    
    const linkText = `[${displayText}](${newUrl})`;
    onLinkInserted(linkText);
    handleClose();
  };

  const handleClose = () => {
    setDisplayText("");
    setSelectedLinkId("");
    setNewUrl("");
    setNewLabel("");
    setNewTags([]);
    setNewTagInput("");
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNewTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Add Link to Blurb</DialogTitle>
          <DialogDescription>
            Choose display text and select an existing link or create a new one to insert into your blurb.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayText">Display Text</Label>
            <Input
              id="displayText"
              value={displayText}
              onChange={(e) => setDisplayText(e.target.value)}
              placeholder="e.g., TechCorp"
            />
          </div>

          <Tabs defaultValue="existing" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Use Existing Link</TabsTrigger>
              <TabsTrigger value="new">Add New Link</TabsTrigger>
            </TabsList>
            
            <TabsContent value="existing" className="space-y-4">
              {existingLinks.length > 0 ? (
                <div className="space-y-3">
                  {existingLinks.map((link) => (
                    <Card 
                      key={link.id} 
                      className={`p-4 cursor-pointer transition-all border-2 hover:border-primary/20 hover:bg-accent/30 ${
                        selectedLinkId === link.id 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-border hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedLinkId(link.id)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="mt-1">
                              {selectedLinkId === link.id ? (
                                <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary/20">
                                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                                </div>
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/50" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-foreground">{link.label}</h4>
                              <p className="text-xs text-muted-foreground truncate mt-1">{link.url}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(link.url, '_blank', 'noopener,noreferrer');
                            }}
                            className="shrink-0 h-8 w-8 p-0 hover:bg-accent"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {link.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-7">
                            {link.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>No external links available yet.</p>
                  <p className="text-sm">Use the "Add New Link" tab to create one.</p>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleInsertExisting} disabled={!displayText.trim() || !selectedLinkId}>
                  Insert Link
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="new" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newUrl">URL</Label>
                <Input
                  id="newUrl"
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/your-case-study"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newLabel">Label</Label>
                <Input
                  id="newLabel"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g., Product Strategy Framework - Medium Article"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newTags">Tags (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="newTags"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a tag and press Enter"
                  />
                  <Button type="button" onClick={handleAddNewTag} size="sm">
                    Add
                  </Button>
                </div>
                
                {newTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {newTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveNewTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleInsertNew} disabled={!displayText.trim() || !newUrl.trim() || !newLabel.trim()}>
                  Create & Insert Link
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
