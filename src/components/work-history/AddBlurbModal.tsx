import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddLinkToBlurbModal } from "./AddLinkToBlurbModal";
import type { ExternalLink } from "@/types/workHistory";

interface AddBlurbModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId: string;
  existingLinks: ExternalLink[];
  onBlurbAdded?: () => void;
}

export function AddBlurbModal({ open, onOpenChange, roleId, existingLinks, onBlurbAdded }: AddBlurbModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [addLinkModalOpen, setAddLinkModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleInsertLink = (linkText: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + linkText + content.substring(end);
      setContent(newContent);
      
      // Set cursor position after the inserted link
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + linkText.length, start + linkText.length);
      }, 0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in both title and content.",
        variant: "destructive",
      });
      return;
    }

    // Here you would typically save to your backend/state management
    console.log("Creating blurb:", { roleId, title, content, tags });
    
    toast({
      title: "Blurb created",
      description: "Your new blurb has been added successfully.",
    });

    // Reset form
    setTitle("");
    setContent("");
    setTags([]);
    setTagInput("");
    
    onBlurbAdded?.();
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Blurb</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Product Strategy Leadership"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Content</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => {
                  console.log("Add Link button clicked");
                  setAddLinkModalOpen(true);
                }}
              >
                <Link className="h-3 w-3 mr-1" />
                Add Link
              </Button>
            </div>
            <Textarea
              ref={textareaRef}
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe your achievement or experience. Use [Company Name] to reference external links."
              rows={4}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a tag and press Enter"
              />
              <Button type="button" onClick={handleAddTag} size="sm">
                Add
              </Button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create Blurb
            </Button>
          </div>
        </form>
        
        <AddLinkToBlurbModal
          open={addLinkModalOpen}
          onOpenChange={(open) => {
            console.log("AddLinkToBlurbModal onOpenChange:", open);
            setAddLinkModalOpen(open);
          }}
          existingLinks={existingLinks}
          onLinkInserted={handleInsertLink}
        />
      </DialogContent>
    </Dialog>
  );
}