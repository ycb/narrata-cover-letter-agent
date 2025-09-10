import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Link as LinkIcon, ExternalLink } from "lucide-react";
import type { ExternalLink as ExternalLinkType } from "@/types/workHistory";

interface LinkPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLinks: ExternalLinkType[];
  onLinkSelected: (link: ExternalLinkType, customLabel: string) => void;
}

export function LinkPicker({ open, onOpenChange, existingLinks, onLinkSelected }: LinkPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLink, setSelectedLink] = useState<ExternalLinkType | null>(null);
  const [customLabel, setCustomLabel] = useState("");

  const filteredLinks = existingLinks.filter(link =>
    link.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleLinkSelect = (link: ExternalLinkType) => {
    setSelectedLink(link);
    setCustomLabel(link.label); // Default to original label, user can customize
  };

  const handleInsertLink = () => {
    if (selectedLink && customLabel.trim()) {
      onLinkSelected(selectedLink, customLabel.trim());
      onOpenChange(false);
      // Reset state
      setSelectedLink(null);
      setCustomLabel("");
      setSearchTerm("");
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedLink(null);
    setCustomLabel("");
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Insert Link</DialogTitle>
          <DialogDescription>
            Select an existing link and customize the label to insert into your story.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search links by label, URL, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Link Selection */}
          <div className="space-y-3">
            <Label>Select a Link</Label>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredLinks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No links match your search." : "No links available."}
                </div>
              ) : (
                filteredLinks.map((link) => (
                  <div
                    key={link.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedLink?.id === link.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handleLinkSelect(link)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <LinkIcon className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm truncate">{link.label}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate mb-2">
                          {link.url}
                        </div>
                        {link.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {link.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground ml-2" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Custom Label Input */}
          {selectedLink && (
            <div className="space-y-2">
              <Label htmlFor="customLabel">Custom Label (Optional)</Label>
              <Input
                id="customLabel"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Enter custom label for the link..."
              />
              <div className="text-xs text-muted-foreground">
                This will be displayed as the clickable text in your story.
              </div>
            </div>
          )}

          {/* Preview */}
          {selectedLink && customLabel && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-1">Preview:</div>
              <div className="text-sm text-muted-foreground">
                <code className="bg-background px-2 py-1 rounded">
                  [{customLabel}]({selectedLink.url})
                </code>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleInsertLink}
              disabled={!selectedLink || !customLabel.trim()}
            >
              Insert Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
