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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { GapDetectionService } from "@/services/gapDetectionService";
import type { WorkHistoryCompany, WorkHistoryRole } from "@/types/workHistory";

interface AddRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: WorkHistoryCompany | null;
  onRoleAdded?: () => void;
  onRoleDeleted?: () => void;
  editingRole?: WorkHistoryRole | null;
}

export function AddRoleModal({ open, onOpenChange, company, onRoleAdded, onRoleDeleted, editingRole }: AddRoleModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [outcomeMetrics, setOutcomeMetrics] = useState<string[]>([]);
  const [outcomeMetricInput, setOutcomeMetricInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStats, setDeleteStats] = useState<{ stories: number } | null>(null);
  const { toast } = useToast();

  const isEditing = !!editingRole;

  // Populate form with editing role data
  useEffect(() => {
    if (editingRole) {
      setTitle(editingRole.title || "");
      // Convert date strings to month format (YYYY-MM)
      setStartDate(editingRole.startDate ? editingRole.startDate.substring(0, 7) : "");
      setEndDate(editingRole.endDate ? editingRole.endDate.substring(0, 7) : "");
      setDescription(editingRole.description || "");
      setTags(editingRole.tags || []);
      setOutcomeMetrics(editingRole.outcomeMetrics || []);
    } else {
      // Reset form when not editing
      setTitle("");
      setStartDate("");
      setEndDate("");
      setDescription("");
      setTags([]);
      setTagInput("");
      setOutcomeMetrics([]);
      setOutcomeMetricInput("");
    }
  }, [editingRole, open]);

  // Fetch delete stats when editing
  useEffect(() => {
    const fetchDeleteStats = async () => {
      if (!editingRole || !user) {
        setDeleteStats(null);
        return;
      }

      try {
        // Get work_item IDs for this role (could be multiple if merged cluster)
        const workItemIds = editingRole.workItemIds || [editingRole.id];
        
        // Count stories for this role
        const { count: storiesCount } = await supabase
          .from('stories')
          .select('id', { count: 'exact', head: true })
          .in('work_item_id', workItemIds);

        setDeleteStats({ stories: storiesCount || 0 });
      } catch (error) {
        console.error('Error fetching delete stats:', error);
        setDeleteStats(null);
      }
    };

    fetchDeleteStats();
  }, [editingRole, user]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddOutcomeMetric = () => {
    if (outcomeMetricInput.trim() && !outcomeMetrics.includes(outcomeMetricInput.trim())) {
      setOutcomeMetrics([...outcomeMetrics, outcomeMetricInput.trim()]);
      setOutcomeMetricInput("");
    }
  };

  const handleRemoveOutcomeMetric = (metricToRemove: string) => {
    setOutcomeMetrics(outcomeMetrics.filter(metric => metric !== metricToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !startDate) {
      toast({
        title: "Missing information",
        description: "Please fill in both title and start date.",
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

    if (!company && !isEditing) {
      toast({
        title: "No company selected",
        description: "Please select a company first.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert month format to full date
      const startDateFull = startDate ? `${startDate}-01` : null;
      const endDateFull = endDate ? `${endDate}-01` : null;

      // Convert outcomeMetrics strings to the expected format
      const metricsJson = outcomeMetrics.map(m => ({ value: m, context: '', type: 'absolute' as const }));

      if (isEditing && editingRole) {
        // Update existing role - get the first work_item ID
        const workItemId = editingRole.workItemIds?.[0] || editingRole.id;
        
        const { error } = await supabase
          .from('work_items')
          .update({
            title: title.trim(),
            start_date: startDateFull,
            end_date: endDateFull,
            description: description.trim(),
            tags,
            metrics: metricsJson,
            achievements: outcomeMetrics,
            updated_at: new Date().toISOString(),
          })
          .eq('id', workItemId)
          .eq('user_id', user.id);

        if (error) throw error;

        await GapDetectionService.resolveSatisfiedRoleMetricsGaps({
          userId: user.id,
          workItemId,
          metrics: metricsJson,
        });

        toast({
          title: "Role updated",
          description: "Your role has been updated successfully.",
        });
      } else {
        // Create new role
        const { error } = await supabase
          .from('work_items')
          .insert({
            user_id: user.id,
            company_id: company!.id,
            title: title.trim(),
            start_date: startDateFull,
            end_date: endDateFull,
            description: description.trim(),
            tags,
            metrics: metricsJson,
            achievements: outcomeMetrics,
          });

        if (error) throw error;

        toast({
          title: "Role added",
          description: "Your new role has been added successfully.",
        });
      }

      // Reset form
      setTitle("");
      setStartDate("");
      setEndDate("");
      setDescription("");
      setTags([]);
      setTagInput("");
      setOutcomeMetrics([]);
      setOutcomeMetricInput("");
      
      onRoleAdded?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving role:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save role.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingRole || !user) return;

    setIsDeleting(true);

    try {
      // Get work_item IDs for this role (could be multiple if merged cluster)
      const workItemIds = editingRole.workItemIds || [editingRole.id];

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
      const { error } = await supabase
        .from('work_items')
        .delete()
        .in('id', workItemIds)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Role deleted",
        description: `${editingRole.title} and all associated data has been deleted.`,
      });

      onRoleDeleted?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete role.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Role" : "Add New Role"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? `Update your role details${company ? ` at ${company.name}` : ''}`
              : (company ? `Add a new role at ${company.name}` : "Add a new role to your work history")
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Senior Product Manager"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="month"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Leave empty if current"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your role and responsibilities..."
              rows={3}
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

          <div className="space-y-2">
            <Label htmlFor="outcomeMetrics">Outcome Metrics</Label>
            <div className="flex gap-2">
              <Input
                id="outcomeMetrics"
                value={outcomeMetricInput}
                onChange={(e) => setOutcomeMetricInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddOutcomeMetric();
                  }
                }}
                placeholder="Add an outcome metric and press Enter"
              />
              <Button type="button" onClick={handleAddOutcomeMetric} size="sm">
                Add
              </Button>
            </div>
            
            {outcomeMetrics.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {outcomeMetrics.map((metric) => (
                  <Badge key={metric} variant="secondary" className="text-xs">
                    {metric}
                    <button
                      type="button"
                      onClick={() => handleRemoveOutcomeMetric(metric)}
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
                    <AlertDialogTitle>Delete {editingRole?.title}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the role
                      {deleteStats && deleteStats.stories > 0 && (
                        <span className="block mt-2 font-medium text-destructive">
                          This will also delete {deleteStats.stories} stor{deleteStats.stories !== 1 ? 'ies' : 'y'}.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Role
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            {/* Spacer when not editing */}
            {!isEditing && <div />}
            
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting || isDeleting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Role" : "Add Role"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
