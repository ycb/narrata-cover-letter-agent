import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Plus, X } from "lucide-react";
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
                  <RadioGroup value={selectedLinkId} onValueChange={setSelectedLinkId}>
                    {existingLinks.map((link) => (
                      <div key={link.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={link.id} id={link.id} />
                        <Card className="flex-1 p-3 cursor-pointer hover:bg-accent" onClick={() => setSelectedLinkId(link.id)}>
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-sm">{link.label}</h4>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                            {link.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {link.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      </div>
                    ))}
                  </RadioGroup>
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