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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, Trash2, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { addUserTag, mergeUserTags, removeUserTag } from "@/lib/userTags";
import { GapDetectionService } from "@/services/gapDetectionService";
import { UserTagService } from "@/services/userTagService";
import { STORY_TEMPLATES } from "@/lib/constants/storyTemplates";
import { LinkPicker } from "./LinkPicker";
import type { ExternalLink, WorkHistoryBlurb } from "@/types/workHistory";
import type { ContentVariationInsert } from "@/types/variations";
import { isExternalLinksEnabled } from "@/lib/flags";
import { clearDraft, loadDraft, saveDraft } from "@/lib/localDraft";

interface AddStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId?: string; // Optional for View All context
  workItemId?: string; // The actual work_item UUID for database operations
  onSave?: (content: any) => void; // Legacy callback, still supported
  onStoryAdded?: () => void; // New callback for refresh
  onStoryDeleted?: () => void;
  existingLinks?: ExternalLink[];
  editingStory?: WorkHistoryBlurb | null;
  // For View All context where Company/Role need to be selected
  isViewAllContext?: boolean;
  availableCompanies?: string[];
  availableRoles?: string[];
}

export function AddStoryModal({ 
  open, 
  onOpenChange, 
  roleId, 
  workItemId,
  onSave, 
  onStoryAdded,
  onStoryDeleted,
  existingLinks = [], 
  editingStory,
  isViewAllContext = false,
  availableCompanies = [],
  availableRoles = []
}: AddStoryModalProps) {
  const { user } = useAuth();
  // Story state
  const [storyTitle, setStoryTitle] = useState(editingStory?.title || "");
  const [storyContent, setStoryContent] = useState(editingStory?.content || "");
  const [storyOutcomeMetrics, setStoryOutcomeMetrics] = useState<string[]>(editingStory?.outcomeMetrics || []);
  const [outcomeMetricInput, setOutcomeMetricInput] = useState("");
  const [storyTags, setStoryTags] = useState<string[]>(editingStory?.tags || []);
  const [storyTagInput, setStoryTagInput] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  // Company/Role selection state for View All context
  const [selectedCompany, setSelectedCompany] = useState(editingStory?.company || "");
  const [selectedRole, setSelectedRole] = useState(editingStory?.role || "");
  
  // Feature flag
  const ENABLE_EXTERNAL_LINKS = isExternalLinksEnabled();
  
  // Link picker state
  const [isLinkPickerOpen, setIsLinkPickerOpen] = useState(false);
  
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { toast } = useToast();

  const isEditing = !!editingStory;
  const draftKey = `draft:edit-story:${user?.id ?? 'anon'}:${editingStory?.id ?? workItemId ?? roleId ?? 'new'}`;

  const baseStoryTitle = editingStory?.title || "";
  const baseStoryContent = editingStory?.content || "";
  const baseOutcomeMetrics = editingStory?.outcomeMetrics || [];
  const baseStoryTags = editingStory?.tags || [];
  const baseSelectedCompany = editingStory?.company || "";
  const baseSelectedRole = editingStory?.role || "";

  // Update form when editing story changes
  useEffect(() => {
    if (editingStory) {
      setStoryTitle(editingStory.title);
      setStoryContent(editingStory.content);
      setStoryOutcomeMetrics(editingStory.outcomeMetrics || []);
      setOutcomeMetricInput("");
      setStoryTags(editingStory.tags || []);
      setSelectedCompany(editingStory.company || "");
      setSelectedRole(editingStory.role || "");
    } else {
      // Reset form when not editing
      setStoryTitle("");
      setStoryContent("");
      setStoryOutcomeMetrics([]);
      setOutcomeMetricInput("");
      setStoryTags([]);
      setSelectedTemplate("");
      setSelectedCompany("");
      setSelectedRole("");
    }
  }, [editingStory]);

  const persistDraftIfDirty = () => {
    const dirty =
      storyTitle !== baseStoryTitle ||
      storyContent !== baseStoryContent ||
      JSON.stringify(storyOutcomeMetrics) !== JSON.stringify(baseOutcomeMetrics) ||
      JSON.stringify(storyTags) !== JSON.stringify(baseStoryTags) ||
      (isViewAllContext && (selectedCompany !== baseSelectedCompany || selectedRole !== baseSelectedRole));

    if (!dirty) {
      clearDraft(draftKey);
      return;
    }

    saveDraft(draftKey, {
      storyTitle,
      storyContent,
      storyOutcomeMetrics,
      storyTags,
      selectedTemplate,
      selectedCompany,
      selectedRole,
      isViewAllContext,
    });
  };

  useEffect(() => {
    if (!open) return;
    const draft = loadDraft<{
      storyTitle?: string;
      storyContent?: string;
      storyOutcomeMetrics?: string[];
      storyTags?: string[];
      selectedTemplate?: string;
      selectedCompany?: string;
      selectedRole?: string;
      isViewAllContext?: boolean;
    }>(draftKey);
    if (!draft?.data) return;

    const pristine =
      storyTitle === baseStoryTitle &&
      storyContent === baseStoryContent &&
      JSON.stringify(storyOutcomeMetrics) === JSON.stringify(baseOutcomeMetrics) &&
      JSON.stringify(storyTags) === JSON.stringify(baseStoryTags) &&
      (!isViewAllContext || (selectedCompany === baseSelectedCompany && selectedRole === baseSelectedRole));

    if (!pristine) return;

    setStoryTitle(draft.data.storyTitle ?? storyTitle);
    setStoryContent(draft.data.storyContent ?? storyContent);
    setStoryOutcomeMetrics(Array.isArray(draft.data.storyOutcomeMetrics) ? draft.data.storyOutcomeMetrics : storyOutcomeMetrics);
    setStoryTags(Array.isArray(draft.data.storyTags) ? draft.data.storyTags : storyTags);
    setSelectedTemplate(draft.data.selectedTemplate ?? selectedTemplate);
    setSelectedCompany(draft.data.selectedCompany ?? selectedCompany);
    setSelectedRole(draft.data.selectedRole ?? selectedRole);
    toast({ title: "Restored draft", description: "Recovered your unsaved story edits." });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draftKey]);

  useEffect(() => {
    if (!open) return;
    const handler = () => persistDraftIfDirty();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storyTitle, storyContent, storyOutcomeMetrics, storyTags, selectedCompany, selectedRole, selectedTemplate]);

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
  }, [open, storyTitle, storyContent, storyOutcomeMetrics, storyTags, selectedCompany, selectedRole, selectedTemplate]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      persistDraftIfDirty();
    }, 500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storyTitle, storyContent, storyOutcomeMetrics, storyTags, selectedCompany, selectedRole, selectedTemplate]);

  const handleModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Ignore Radix dismiss attempts caused by switching browser tabs (focus-loss).
      if (typeof document !== "undefined" && document.hidden) return;
      persistDraftIfDirty();
    }
    onOpenChange(nextOpen);
  };

  const handleAddStoryTag = () => {
    const nextTags = addUserTag(storyTags, storyTagInput);
    if (nextTags === storyTags) return;
    setStoryTags(nextTags);
    setStoryTagInput("");
  };

  const handleRemoveStoryTag = (tagToRemove: string) => {
    setStoryTags(removeUserTag(storyTags, tagToRemove));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!storyTitle.trim() || !storyContent.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in both title and content for the story.",
        variant: "destructive",
      });
      return;
    }

    // Validate Company and Role for View All context
    if (isViewAllContext && (!selectedCompany.trim() || !selectedRole.trim())) {
      toast({
        title: "Missing information",
        description: "Please select both company and role for this story.",
        variant: "destructive",
      });
      return;
    }

    // If using legacy onSave callback without database operations
    if (onSave && !workItemId && !editingStory) {
      const normalizedTags = mergeUserTags(storyTags);
      const storyData = {
        type: "story" as const,
        roleId: isViewAllContext ? undefined : roleId,
        title: storyTitle.trim(),
        content: storyContent.trim(),
        outcomeMetrics: storyOutcomeMetrics,
        tags: normalizedTags,
        source: "manual" as const,
        status: "draft" as const,
        confidence: "medium" as const,
        timesUsed: 0,
        linkedExternalLinks: [],
        ...(isViewAllContext && {
          company: selectedCompany.trim(),
          role: selectedRole.trim()
        })
      };

      onSave(storyData);
      clearDraft(draftKey);
      resetForm();
      onOpenChange(false);
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
      // Convert outcomeMetrics to the expected format
      const metricsJson = storyOutcomeMetrics.map(m => ({ value: m, context: '', type: 'absolute' as const }));
      const normalizedTags = mergeUserTags(storyTags);

      if (isEditing && editingStory) {
        const nextTitle = storyTitle.trim();
        const nextContent = storyContent.trim();
        const previousContent = String((editingStory as any)?.content ?? '').trim();
        const storyChanged = previousContent !== nextContent;

        // Update existing story
        const { error } = await supabase
          .from('stories')
          .update({
            title: nextTitle,
            content: nextContent,
            tags: normalizedTags,
            metrics: metricsJson,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingStory.id)
          .eq('user_id', user.id);

        if (error) throw error;

        // Create a variation snapshot for manual edits so we can track shifts over time.
        // NOTE: We store stories as `approved_content` in the variation model for consistency with gaps.
        if (storyChanged) {
          try {
            const { data: existingVariation } = await supabase
              .from('content_variations')
              .select('id')
              .eq('user_id', user.id)
              .eq('parent_entity_type', 'approved_content')
              .eq('parent_entity_id', editingStory.id)
              .eq('content', nextContent)
              .limit(1)
              .maybeSingle();

            if (!existingVariation?.id) {
              const variationInsert: ContentVariationInsert = {
                user_id: user.id,
                parent_entity_type: 'approved_content',
                parent_entity_id: editingStory.id,
                title: `${nextTitle} (manual edit)`,
                content: nextContent,
                created_by: 'user',
                times_used: 0,
              };

              const { error: variationError } = await supabase
                .from('content_variations')
                .insert(variationInsert as any);

              if (variationError) {
                console.warn('[AddStoryModal] Failed to create story variation (non-blocking):', variationError);
              }
            }
          } catch (variationError) {
            console.warn('[AddStoryModal] Exception creating story variation (non-blocking):', variationError);
          }
        }

        await GapDetectionService.resolveSatisfiedStoryMetricsGaps({
          userId: user.id,
          storyId: editingStory.id,
          content: nextContent,
          metrics: metricsJson,
        });
        await GapDetectionService.resolveSatisfiedStorySpecificsGaps({
          userId: user.id,
          storyId: editingStory.id,
          content: nextContent,
        });

        if (normalizedTags.length > 0) {
          await UserTagService.upsertTags(user.id, normalizedTags, 'story');
        }

        toast({
          title: "Story updated",
          description: "Your story has been updated successfully.",
        });
      } else {
        // Create new story
        const targetWorkItemId = workItemId || roleId;
        if (!targetWorkItemId) {
          throw new Error("No work item ID provided for new story");
        }

        const { data: insertedStory, error } = await supabase
          .from('stories')
          .insert({
            user_id: user.id,
            work_item_id: targetWorkItemId,
            title: storyTitle.trim(),
            content: storyContent.trim(),
            tags: normalizedTags,
            metrics: metricsJson,
            source: 'manual',
            status: 'approved',
          })
          .select('id')
          .single();

        if (error) throw error;

        if (normalizedTags.length > 0) {
          await UserTagService.upsertTags(user.id, normalizedTags, 'story');
        }

        if (insertedStory?.id) {
          await GapDetectionService.resolveSatisfiedStoryMetricsGaps({
            userId: user.id,
            storyId: insertedStory.id,
            content: storyContent.trim(),
            metrics: metricsJson,
          });
          await GapDetectionService.resolveSatisfiedStorySpecificsGaps({
            userId: user.id,
            storyId: insertedStory.id,
            content: storyContent.trim(),
          });
        }

        toast({
          title: "Story added",
          description: "Your new story has been added successfully.",
        });
	      }

	      clearDraft(draftKey);
	      resetForm();
	      onStoryAdded?.();
	      onOpenChange(false);
	    } catch (error) {
      console.error('Error saving story:', error);
      const message =
        (error as any)?.message ||
        (error as any)?.error_description ||
        (error as any)?.details ||
        "Failed to save story.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingStory || !user) return;

    setIsDeleting(true);

    try {
      // Delete gaps for this story
      await supabase
        .from('gaps')
        .delete()
        .eq('entity_id', editingStory.id);

      // Delete the story
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', editingStory.id)
        .eq('user_id', user.id);

      if (error) throw error;

	      toast({
	        title: "Story deleted",
	        description: "Your story has been deleted.",
	      });

	      clearDraft(draftKey);
	      onStoryDeleted?.();
	      onOpenChange(false);
	    } catch (error) {
      console.error('Error deleting story:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete story.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setStoryTitle("");
    setStoryContent("");
    setStoryOutcomeMetrics([]);
    setOutcomeMetricInput("");
    setStoryTags([]);
    setStoryTagInput("");
    setSelectedTemplate("");
    setSelectedCompany("");
    setSelectedRole("");
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
    <Dialog open={open} onOpenChange={handleModalOpenChange}>
      <DialogContent
        className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto"
        onFocusOutside={(e) => {
          // Prevent the dialog from closing when the browser window/tab loses focus.
          e.preventDefault();
        }}
      >
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
              
              {/* Company and Role Selection for View All Context */}
              {isViewAllContext && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company *</Label>
                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCompanies.map((company) => (
                          <SelectItem key={company} value={company}>
                            {company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="storyTitle">Story Title</Label>
                <GrammarInput
                  id="storyTitle"
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder="e.g., Product Strategy Leadership"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="storyContent">Story Content</Label>
                <div className="space-y-3">
                  <GrammarTextarea
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
                    {ENABLE_EXTERNAL_LINKS && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsLinkPickerOpen(true)}
                      className="h-8 px-3"
                      type="button"
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Pick Links
                    </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <Label htmlFor="storyOutcomeMetrics">Outcome Metrics (Optional)</Label>
                <div className="space-y-2">
                  {storyOutcomeMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1">
                        <GrammarInput
                          value={metric}
                          onChange={(e) => {
                            const updatedMetrics = [...storyOutcomeMetrics];
                            updatedMetrics[index] = e.target.value;
                            setStoryOutcomeMetrics(updatedMetrics);
                          }}
                          placeholder="Enter outcome metric..."
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updatedMetrics = storyOutcomeMetrics.filter((_, i) => i !== index);
                          setStoryOutcomeMetrics(updatedMetrics);
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex w-full gap-2">
                    <div className="flex-1">
                      <GrammarInput
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
                    </div>
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
                  <TagAutocompleteInput
                    id="storyTags"
                    value={storyTagInput}
                    onChange={(e) => setStoryTagInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Add a tag and press Enter"
                    category="story"
                    localTags={storyTags}
                    useGrammarInput
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
                        <AlertDialogTitle>Delete this story?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the story "{editingStory?.title}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete Story
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
                    {isEditing ? "Update Story" : "Add Story"}
                  </Button>
                </div>
              </div>
                        </form>
        </DialogContent>
        
        {/* Link Picker Modal */}
        {ENABLE_EXTERNAL_LINKS && (
        <LinkPicker
          open={isLinkPickerOpen}
          onOpenChange={setIsLinkPickerOpen}
          existingLinks={existingLinks}
          onLinkSelected={handleLinkSelected}
        />
        )}
      </Dialog>
  );
}
