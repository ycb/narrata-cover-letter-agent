import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId?: string; // Optional for View All context
  onSave: (content: any) => void;
  editingLink?: any;
  // For View All context where Company/Role need to be selected
  isViewAllContext?: boolean;
  availableCompanies?: string[];
  availableRoles?: string[];
}

export function AddLinkModal({ 
  open, 
  onOpenChange, 
  roleId, 
  onSave, 
  editingLink,
  isViewAllContext = false,
  availableCompanies = [],
  availableRoles = []
}: AddLinkModalProps) {
  // Link state
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkType, setLinkType] = useState<"case-study" | "blog" | "portfolio" | "other">("blog");
  const [linkTags, setLinkTags] = useState<string[]>([]);
  const [linkTagInput, setLinkTagInput] = useState("");
  
  // Company/Role selection state for View All context
  const [selectedCompany, setSelectedCompany] = useState(editingLink?.company || "");
  const [selectedRole, setSelectedRole] = useState(editingLink?.role || "");
  
  const { toast } = useToast();

  // Populate form when editing
  useEffect(() => {
    if (editingLink) {
      setLinkLabel(editingLink.label || "");
      setLinkUrl(editingLink.url || "");
      setLinkType(editingLink.type || "blog");
      setLinkTags(editingLink.tags || []);
      setSelectedCompany(editingLink.company || "");
      setSelectedRole(editingLink.role || "");
    } else {
      // Reset form when not editing
      setLinkLabel("");
      setLinkUrl("");
      setLinkType("blog");
      setLinkTags([]);
      setLinkTagInput("");
      setSelectedCompany("");
      setSelectedRole("");
    }
  }, [editingLink]);

  const handleAddLinkTag = () => {
    if (linkTagInput.trim() && !linkTags.includes(linkTagInput.trim())) {
      setLinkTags([...linkTags, linkTagInput.trim()]);
      setLinkTagInput("");
    }
  };

  const handleRemoveLinkTag = (tagToRemove: string) => {
    setLinkTags(linkTags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!linkLabel.trim() || !linkUrl.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in both label and URL for the link.",
        variant: "destructive",
      });
      return;
    }

    // Validate Company and Role for View All context
    if (isViewAllContext && (!selectedCompany.trim() || !selectedRole.trim())) {
      toast({
        title: "Missing information",
        description: "Please select both company and role for this link.",
        variant: "destructive",
      });
      return;
    }

    const linkData = {
      type: "link" as const,
      roleId: isViewAllContext ? undefined : roleId,
      label: linkLabel.trim(),
      url: linkUrl.trim(),
      linkType,
      tags: linkTags,
      timesUsed: 0,
      // Include company and role for View All context
      ...(isViewAllContext && {
        company: selectedCompany.trim(),
        role: selectedRole.trim()
      })
    };

    onSave(linkData);
    
    // Reset link form
    setLinkLabel("");
    setLinkUrl("");
    setLinkType("blog");
    setLinkTags([]);
    setLinkTagInput("");

    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddLinkTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingLink ? 'Edit External Link' : 'Add External Link'}</DialogTitle>
          <DialogDescription>
            {editingLink ? 'Update the link details below.' : 'Add a supporting link to provide evidence for your work. This could be a case study, blog article, portfolio, or other relevant resource.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="linkLabel">Link Label</Label>
            <Input
              id="linkLabel"
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              placeholder="e.g., Product Strategy Framework - Medium Article"
            />
          </div>
          
          {/* Company and Role Selection for View All Context */}
          {isViewAllContext && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <select
                  id="company"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="">Select company</option>
                  {availableCompanies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <select
                  id="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="">Select role</option>
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="linkUrl">URL</Label>
            <Input
              id="linkUrl"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/article"
              type="url"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="linkType">Link Type</Label>
            <select
              id="linkType"
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as any)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="blog">Blog Article</option>
              <option value="case-study">Case Study</option>
              <option value="portfolio">Portfolio</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="linkTags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="linkTags"
                value={linkTagInput}
                onChange={(e) => setLinkTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a tag and press Enter"
              />
              <Button type="button" onClick={handleAddLinkTag} size="sm">
                Add
              </Button>
            </div>
            
            {linkTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {linkTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveLinkTag(tag)}
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
            <Button type="submit">
              {editingLink ? 'Update Link' : 'Add Link'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
