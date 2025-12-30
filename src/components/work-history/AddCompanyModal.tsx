import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { GrammarInput } from "@/components/ui/grammar-input";
import { TagAutocompleteInput } from "@/components/ui/TagAutocompleteInput";
import { GrammarTextarea } from "@/components/ui/grammar-textarea";
import { Label } from "@/components/ui/label";
	import { Badge } from "@/components/ui/badge";
	import { X, Loader2, Trash2 } from "lucide-react";
	import { useToast } from "@/hooks/use-toast";
	import { useAuth } from "@/contexts/AuthContext";
	import { supabase } from "@/lib/supabase";
import { TagSuggestionButton } from "@/components/ui/TagSuggestionButton";
import { addUserTag, mergeUserTags, removeUserTag } from "@/lib/userTags";
import { UserTagService } from "@/services/userTagService";
	import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";
		import { TagSuggestionService, type TagSuggestion } from "@/services/tagSuggestionService";
		import { TagService } from "@/services/tagService";
		import type { WorkHistoryCompany } from "@/types/workHistory";
		import { clearDraft, loadDraft, saveDraft } from "@/lib/localDraft";

interface AddCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompanyAdded?: () => void;
  onCompanyDeleted?: () => void;
  editingCompany?: WorkHistoryCompany | null;
}

	export function AddCompanyModal({ open, onOpenChange, onCompanyAdded, onCompanyDeleted, editingCompany }: AddCompanyModalProps) {
	  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStats, setDeleteStats] = useState<{ roles: number; stories: number } | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<TagSuggestion[]>([]);
  const [otherTags, setOtherTags] = useState<TagSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
	  const { toast } = useToast();
	
	  const isEditing = !!editingCompany;
	  const draftKey = `draft:edit-company:${user?.id ?? 'anon'}:${editingCompany?.id ?? 'new'}`;
	  const baseName = editingCompany?.name || "";
	  const baseDescription = editingCompany?.description || "";
	  const baseTags = editingCompany?.tags || [];

  // Populate form with editing company data
	  useEffect(() => {
	    if (editingCompany) {
	      setName(editingCompany.name);
	      setDescription(editingCompany.description || "");
	      setTags(editingCompany.tags || []);
    } else {
      // Reset form when not editing
      setName("");
      setDescription("");
      setTags([]);
      setTagInput("");
	    }
	  }, [editingCompany, open]);

	  const persistDraftIfDirty = () => {
	    const dirty =
	      name !== baseName ||
	      description !== baseDescription ||
	      JSON.stringify(tags) !== JSON.stringify(baseTags);
	
	    if (!dirty) {
	      clearDraft(draftKey);
	      return;
	    }
	
	    saveDraft(draftKey, { name, description, tags });
	  };
	
	  useEffect(() => {
	    if (!open) return;
	    const draft = loadDraft<{ name?: string; description?: string; tags?: string[] }>(draftKey);
	    if (!draft?.data) return;
	
	    const pristine =
	      name === baseName &&
	      description === baseDescription &&
	      JSON.stringify(tags) === JSON.stringify(baseTags);
	
	    if (!pristine) return;
	
	    setName(draft.data.name ?? name);
	    setDescription(draft.data.description ?? description);
	    setTags(Array.isArray(draft.data.tags) ? draft.data.tags : tags);
	    toast({ title: "Restored draft", description: "Recovered your unsaved company edits." });
	    // eslint-disable-next-line react-hooks/exhaustive-deps
	  }, [open, draftKey]);
	
	  useEffect(() => {
	    if (!open) return;
	    const handler = () => persistDraftIfDirty();
	    window.addEventListener("beforeunload", handler);
	    return () => window.removeEventListener("beforeunload", handler);
	    // eslint-disable-next-line react-hooks/exhaustive-deps
	  }, [open, name, description, tags]);
	
	  useEffect(() => {
	    if (!open) return;
	    const onVisibilityChange = () => {
	      if (document.hidden) persistDraftIfDirty();
	    };
	    const onPageHide = () => persistDraftIfDirty();
	    document.addEventListener("visibilitychange", onVisibilityChange);
	    window.addEventListener("pagehide", onPageHide);
	    return () => {
	      document.removeEventListener("visibilitychange", onVisibilityChange);
	      window.removeEventListener("pagehide", onPageHide);
	    };
	    // eslint-disable-next-line react-hooks/exhaustive-deps
	  }, [open, name, description, tags]);
	
	  useEffect(() => {
	    if (!open) return;
	    const timer = window.setTimeout(() => {
	      persistDraftIfDirty();
	    }, 500);
	    return () => window.clearTimeout(timer);
	    // eslint-disable-next-line react-hooks/exhaustive-deps
	  }, [open, name, description, tags]);
	
	  const handleModalOpenChange = (nextOpen: boolean) => {
	    if (!nextOpen) {
	      // Ignore Radix dismiss attempts caused by switching browser tabs (focus-loss).
	      if (typeof document !== "undefined" && document.hidden) return;
	      persistDraftIfDirty();
	    }
	    onOpenChange(nextOpen);
	  };

  // Fetch delete stats when editing
  useEffect(() => {
    const fetchDeleteStats = async () => {
      if (!editingCompany || !user) {
        setDeleteStats(null);
        return;
      }

      try {
        // Count roles for this company
        const { count: rolesCount } = await supabase
          .from('work_items')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', editingCompany.id)
          .eq('user_id', user.id);

        // Count stories for roles in this company
        const { data: workItems } = await supabase
          .from('work_items')
          .select('id')
          .eq('company_id', editingCompany.id)
          .eq('user_id', user.id);

        let storiesCount = 0;
        if (workItems && workItems.length > 0) {
          const workItemIds = workItems.map(wi => wi.id);
          const { count } = await supabase
            .from('stories')
            .select('id', { count: 'exact', head: true })
            .in('work_item_id', workItemIds);
          storiesCount = count || 0;
        }

        setDeleteStats({ roles: rolesCount || 0, stories: storiesCount });
      } catch (error) {
        console.error('Error fetching delete stats:', error);
        setDeleteStats(null);
      }
    };

    fetchDeleteStats();
  }, [editingCompany, user]);

  const handleDelete = async () => {
    if (!editingCompany || !user) return;

    setIsDeleting(true);

    try {
      // Get all work_items for this company
      const { data: workItems } = await supabase
        .from('work_items')
        .select('id')
        .eq('company_id', editingCompany.id)
        .eq('user_id', user.id);

      if (workItems && workItems.length > 0) {
        const workItemIds = workItems.map(wi => wi.id);

        // Delete stories first (FK constraint)
        await supabase
          .from('stories')
          .delete()
          .in('work_item_id', workItemIds);

        // Delete gaps for these work items
        await supabase
          .from('gaps')
          .delete()
          .in('entity_id', workItemIds);

        // Delete work_items
        await supabase
          .from('work_items')
          .delete()
          .eq('company_id', editingCompany.id)
          .eq('user_id', user.id);
      }

      // Delete the company
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', editingCompany.id)
        .eq('user_id', user.id);

      if (error) throw error;

	      toast({
	        title: "Company deleted",
	        description: `${editingCompany.name} and all associated data has been deleted.`,
	      });

	      clearDraft(draftKey);
	      onCompanyDeleted?.();
	      onOpenChange(false);
	    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete company.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddTag = () => {
    const nextTags = addUserTag(tags, tagInput);
    if (nextTags === tags) return;
    setTags(nextTags);
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(removeUserTag(tags, tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a company name.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please sign in to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing) {
        // Update existing company
        const { error } = await supabase
          .from('companies')
          .update({
            name: name.trim(),
            description: description.trim(),
            tags: mergeUserTags(tags),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCompany!.id)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Company updated",
          description: "Your company has been updated successfully.",
        });
	      } else {
	        // Create new company
	        const { error } = await supabase
	          .from('companies')
	          .insert({
            user_id: user.id,
            name: name.trim(),
            description: description.trim(),
            tags: mergeUserTags(tags),
          });

        if (error) throw error;

	        toast({
	          title: "Company added",
	          description: "Your new company has been added successfully.",
	        });
	      }

      if (mergeUserTags(tags).length > 0) {
        await UserTagService.upsertTags(user.id, mergeUserTags(tags), 'company');
      }

      clearDraft(draftKey);
	      // Reset form
	      setName("");
	      setDescription("");
	      setTags([]);
      setTagInput("");
      
      onCompanyAdded?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving company:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save company.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSuggestTags = async () => {
    const companyName = name.trim();
    if (!companyName) {
      toast({
        title: "Missing information",
        description: "Add a company name first so we can suggest relevant tags.",
        variant: "destructive",
      });
      return;
    }

    setSuggestedTags([]);
    setOtherTags([]);
    setSearchError(null);
    setIsSearching(true);
    setIsTagModalOpen(true);

    try {
      const content = `${companyName}: ${description.trim() || 'Company information'}`;
      const suggestions = await TagSuggestionService.suggestTags(
        {
          content,
          contentType: 'company',
          companyName,
          existingTags: tags,
        },
        user?.id
      );

      const highConfidence = suggestions.filter((t) => t.confidence === 'high');
      const otherConfidence = suggestions.filter((t) => t.confidence !== 'high');
      setSuggestedTags(highConfidence);
      setOtherTags(otherConfidence);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Failed to suggest tags. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleApplySuggestedTags = async (selectedTags: string[]) => {
    const merged = Array.from(new Set([...(tags || []), ...(selectedTags || [])].map((t) => t.trim()).filter(Boolean)));
    setTags(merged);

    // If editing an existing company, persist immediately so the user doesn’t lose changes.
    if (isEditing && editingCompany?.id && user) {
      try {
        await TagService.updateCompanyTags(editingCompany.id, merged, user.id);
        toast({
          title: 'Tags saved',
          description: `${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''} applied successfully.`,
        });
      } catch (error) {
        toast({
          title: 'Save failed',
          description: error instanceof Error ? error.message : 'Failed to save tags. Please try again.',
          variant: 'destructive',
        });
        return;
      }
    } else {
      toast({
        title: 'Tags added',
        description: 'Tags added to this company draft. Click Save to persist.',
      });
    }

    setIsTagModalOpen(false);
    setSuggestedTags([]);
    setOtherTags([]);
    setSearchError(null);
    setIsSearching(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleModalOpenChange}>
      <DialogContent
        className="sm:max-w-[600px]"
        onFocusOutside={(e) => {
          // Prevent the dialog from closing when the browser window/tab loses focus.
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Company" : "Add New Company"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update your company information and details."
              : "Add a new company to your work history. You can add roles and blurbs after creating the company."
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <GrammarInput
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., TechCorp Inc."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <GrammarTextarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the company..."
              rows={3}
            />
          </div>
          
	          <div className="space-y-2">
	            <div className="flex items-center justify-between">
	              <Label htmlFor="tags">Tags</Label>
	              <TagSuggestionButton
	                content={`${name || 'Company'}: ${description || 'Company information'}`}
	                onTagsSuggested={() => {}}
	                variant="tertiary"
	                size="sm"
	                disabled={!name.trim()}
	                onClick={handleSuggestTags}
	              />
	            </div>
	            <div className="flex gap-2">
	              <TagAutocompleteInput
	                id="tags"
	                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Add a tag and press Enter"
                category="company"
                localTags={tags}
                useGrammarInput
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

	          <ContentGenerationModal
	            isOpen={isTagModalOpen}
	            onClose={() => {
	              setIsTagModalOpen(false);
	              setSuggestedTags([]);
	              setOtherTags([]);
	              setSearchError(null);
	              setIsSearching(false);
	            }}
	            mode="tag-suggestion"
	            content={`${name || 'Company'}: ${description || 'Company information'}`}
	            contentType="company"
	            entityId={editingCompany?.id}
	            existingTags={tags}
	            suggestedTags={suggestedTags}
	            otherTags={otherTags}
	            onApplyTags={handleApplySuggestedTags}
	            isSearching={isSearching}
	            searchError={searchError}
	            onRetry={handleSuggestTags}
	          />
          
          <div className="flex justify-between gap-2 pt-4">
            {/* Delete button (only when editing) */}
            {isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={isSubmitting || isDeleting}>
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {editingCompany?.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the company
                      {deleteStats && (deleteStats.roles > 0 || deleteStats.stories > 0) && (
                        <span className="block mt-2 font-medium text-destructive">
                          This will also delete {deleteStats.roles} role{deleteStats.roles !== 1 ? 's' : ''} 
                          {deleteStats.stories > 0 && ` and ${deleteStats.stories} stor${deleteStats.stories !== 1 ? 'ies' : 'y'}`}.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Company
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            {/* Spacer when not editing */}
            {!isEditing && <div />}
            
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => handleModalOpenChange(false)} disabled={isSubmitting || isDeleting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Company" : "Add Company"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
