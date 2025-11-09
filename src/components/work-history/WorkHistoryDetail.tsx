import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { StoryCard } from "@/components/work-history/StoryCard";
import { LinkCard } from "@/components/work-history/LinkCard";
import { OutcomeMetrics } from "@/components/work-history/OutcomeMetrics";
import { cn } from "@/lib/utils";
import { 
  Building2, 
  Calendar, 
  FileText, 
  Plus, 
  Target,
  Tags,
  User,
  MoreHorizontal,
  Edit,
  Copy,
  Files,
  Trash2,
  Link as LinkIcon,
  ChevronRight,
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";
import { TagSuggestionButton } from "@/components/ui/TagSuggestionButton";
import { ContentGapBanner } from "@/components/shared/ContentGapBanner";
import { LinkedInDataSource } from "./LinkedInDataSource";
import { ResumeDataSource } from "./ResumeDataSource";
import { useAuth } from "@/contexts/AuthContext";
import { useUserGoals } from "@/contexts/UserGoalsContext";
import { GapDetectionService } from "@/services/gapDetectionService";
import { TagSuggestionService } from "@/services/tagSuggestionService";
import { TagService } from "@/services/tagService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkHistoryCompany, WorkHistoryRole, WorkHistoryBlurb } from "@/types/workHistory";

interface WorkHistoryDetailProps {
  selectedCompany: WorkHistoryCompany | null;
  selectedRole: WorkHistoryRole | null;
  companies: WorkHistoryCompany[]; // Add companies to find role's company
  initialTab?: 'role' | 'stories' | 'links';
  resolvedGaps: Set<string>;
  onResolvedGapsChange: (gaps: Set<string>) => void;
  onRoleSelect?: (role: WorkHistoryRole) => void;
  onAddRole?: () => void;
  onAddStory?: () => void;
  onAddLink?: () => void;
  onEditCompany?: (company: WorkHistoryCompany) => void;
  onEditStory?: (story: WorkHistoryBlurb) => void;
  onEditLink?: (link: any) => void;
  onDuplicateStory?: (story: WorkHistoryBlurb) => void;
  selectedDataSource?: 'work-history' | 'linkedin' | 'resume';
  onDeleteStory?: (story: WorkHistoryBlurb) => void;
  onRefresh?: () => void; // Callback to refresh parent data after gap resolution
}

type DetailView = 'role' | 'stories' | 'links';

export const WorkHistoryDetail = ({ 
  selectedCompany, 
  selectedRole,
  companies,
  initialTab = 'role',
  resolvedGaps,
  onResolvedGapsChange,
  onRoleSelect,
  onAddRole,
  onAddStory,
  onAddLink,
  onEditCompany,
  onEditStory,
  onEditLink,
  onDuplicateStory,
  onDeleteStory,
  selectedDataSource = 'work-history',
  onRefresh,
}: WorkHistoryDetailProps) => {
  const { user } = useAuth();
  const { goals } = useUserGoals();
  const [detailView, setDetailView] = useState<DetailView>(initialTab);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<WorkHistoryRole | null>(null);
  const [roleTagInput, setRoleTagInput] = useState('');
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [editingStory, setEditingStory] = useState<WorkHistoryBlurb | null>(null);
  const [storyTagInput, setStoryTagInput] = useState('');
  
  // Content Generation Modal state
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [selectedGap, setSelectedGap] = useState<any>(null);
  
  // Tag suggestion state
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagContent, setTagContent] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [tagContentType, setTagContentType] = useState<'company' | 'role' | 'saved_section'>('company');
  const [tagEntityId, setTagEntityId] = useState<string | undefined>();
  
  // Success state management - tracks which success cards have been dismissed
  const [dismissedSuccessCards, setDismissedSuccessCards] = useState<Set<string>>(new Set());
  
  // Inline editing state for company description
  const [isEditingCompanyDescription, setIsEditingCompanyDescription] = useState(false);
  const [companyDescriptionDraft, setCompanyDescriptionDraft] = useState('');

  // Mock gap data for content generation
  const mockGapData = useMemo(() => ({
    'role-description': {
      id: 'role-description-gap',
      type: 'content-enhancement',
      severity: 'high',
      description: 'Role description is too generic and lacks specific achievements',
      suggestion: 'Add quantifiable results, specific projects, and measurable impact to demonstrate value',
      paragraphId: 'role-description',
      origin: 'ai' as const,
      addresses: ['quantifiable achievements', 'specific metrics', 'KPIs from past projects'],
      existingContent: 'Led product strategy for core platform'
    },
    'outcome-metrics': {
      id: 'outcome-metrics-gap',
      type: 'content-enhancement',
      severity: 'high',
      description: 'Outcome metrics need more specificity and context',
      suggestion: 'Include percentages, dollar amounts, timeframes, and business impact metrics',
      paragraphId: 'outcome-metrics',
      origin: 'ai' as const,
      addresses: ['specific percentages', 'dollar amounts', 'timeframes', 'business impact'],
      existingContent: 'Increased user engagement by 25% and reduced churn by 15%'
    },
    'role-metrics': {
      id: 'role-metrics-gap',
      type: 'content-enhancement',
      severity: 'medium',
      description: 'Role-level metrics are missing or insufficient',
      suggestion: 'Add quantified metrics at the role level to demonstrate overall impact (e.g., revenue increases, team size, project scope)',
      paragraphId: 'role-metrics',
      origin: 'ai' as const,
      addresses: ['role-level metrics', 'quantified outcomes', 'business impact'],
      existingContent: selectedRole?.description || ''
    },
    'story-content': {
      id: 'story-content-gap',
      type: 'content-enhancement',
      severity: 'medium',
      description: 'Story needs more specific examples and quantifiable results',
      suggestion: 'Add concrete examples, metrics, and outcomes to strengthen the narrative',
      paragraphId: 'story-content',
      origin: 'ai' as const,
      addresses: ['concrete examples', 'specific metrics', 'measurable outcomes'],
      existingContent: 'Successfully launched new product features that improved user experience'
    }
  }), [selectedRole]);

  const handleGenerateContent = (gapType: string) => {
    setSelectedGap(mockGapData[gapType as keyof typeof mockGapData]);
    setIsContentModalOpen(true);
  };

  const handleGenerateCompanyContent = () => {
    // Create a company-level gap for content generation
    const companyGap = {
      id: 'company-description-gap',
      type: 'content-enhancement' as const,
      severity: 'medium' as const,
      description: 'Generate company description and information',
      suggestion: 'Research company and generate description, tags, and relevant information',
      paragraphId: 'company-description',
      origin: 'user' as const
    };
    setSelectedGap(companyGap);
    setIsContentModalOpen(true);
  };

  // Inline editing handlers for company description
  const handleSaveCompanyDescription = async () => {
    if (selectedRole) {
      const currentCompany = companies.find(c => c.id === selectedRole.companyId);
      if (currentCompany && companyDescriptionDraft !== currentCompany.description) {
        // Update company description
        if (onEditCompany) {
          onEditCompany({ ...currentCompany, description: companyDescriptionDraft });
        }
      }
    }
    setIsEditingCompanyDescription(false);
  };

  const handleCancelEditCompanyDescription = () => {
    if (selectedRole) {
      const currentCompany = companies.find(c => c.id === selectedRole.companyId);
      setCompanyDescriptionDraft(currentCompany?.description || '');
    }
    setIsEditingCompanyDescription(false);
  };

  // Reset editing state when company/role changes
  useEffect(() => {
    if (selectedRole) {
      const currentCompany = companies.find(c => c.id === selectedRole.companyId);
      if (currentCompany) {
        setCompanyDescriptionDraft(currentCompany.description || '');
        setIsEditingCompanyDescription(false);
      }
    }
  }, [selectedRole?.companyId, companies]);

  const handleApplyContent = async (content: string) => {
    if (!user || !selectedGap) return;
    
    console.log('Applied generated content:', content);
    
    // Resolve gap in database with 'content_added' reason (not 'user_override')
    // This distinguishes content-generated resolution from manual dismissal
    const gapId = selectedGap.id;
    const isDatabaseId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gapId);
    
    if (isDatabaseId) {
      try {
        // TODO: Get the actual content ID after saving content to database
        // For now, we resolve without linking content (will be updated when content saving is implemented)
        // Persist gap resolution with 'content_added' reason
        // When content saving is implemented, pass the content ID as 4th parameter:
        // await GapDetectionService.resolveGap(gapId, user.id, 'content_added', contentId);
        await GapDetectionService.resolveGap(gapId, user.id, 'content_added');
        
        // Trigger parent refresh to update data
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error('Error resolving gap after content generation:', error);
        // Continue with local state update even if DB update fails
      }
    }
    
    // Mark this gap as resolved AND track that content was generated (not just dismissed)
      const gapKey = selectedGap.storyId 
        ? `story-content-gap-${selectedGap.storyId}`
        : selectedGap.id;
      const generatedKey = selectedGap.storyId
        ? `story-content-generated-${selectedGap.storyId}`
        : `${selectedGap.id}-generated`;
      
    // Update local state (for immediate UI feedback)
      onResolvedGapsChange(new Set([...resolvedGaps, gapKey, generatedKey]));
    
    // TODO: Implement content application logic (save content to database)
      
      // Auto-dismiss success card after 3 seconds
      setTimeout(() => {
        setDismissedSuccessCards(prev => new Set([...prev, generatedKey]));
      }, 3000);
    
    // Show temporary success state
    setTimeout(() => {
      setIsContentModalOpen(false);
      setSelectedGap(null);
    }, 1000);
  };

  const handleDismissSuccessCard = (gapId: string) => {
    setDismissedSuccessCards(prev => new Set([...prev, gapId]));
  };

  const handleResolveGap = async (gapId: string, localId?: string) => {
    if (!user) return;
    
    // If gapId is a real database ID (UUID format), persist to database
    // UUID format: 8-4-4-4-12 hex characters
    const isDatabaseId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gapId);
    
    if (isDatabaseId) {
      try {
        // Persist gap resolution to database
        await GapDetectionService.resolveGap(gapId, user.id, 'user_override');
        
        // Trigger parent refresh to update data (so ShowAllStories will see resolved gaps on next fetch)
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error('Error resolving gap in database:', error);
        // Continue with local state update even if DB update fails
      }
    }
    
    // Update local state (for immediate UI feedback)
    // Use localId if provided, otherwise use gapId
    const stateKey = localId || gapId;
    onResolvedGapsChange(new Set([...resolvedGaps, stateKey]));
  };

  // NOTE: Role-level tag suggestions removed
  // Tags are now extracted during onboarding from resume + cover letter in a single LLM call
  // This avoids sending the same data to LLM twice
  // Users can manually edit tags if needed, but auto-suggest is no longer needed for roles

  const handleApplyTags = async (selectedTags: string[]) => {
    if (!user || !tagEntityId) return;
    
    try {
      if (tagContentType === 'role') {
        // Merge with existing tags
        const allTags = [...new Set([...(selectedRole?.tags || []), ...selectedTags])];
        await TagService.updateWorkItemTags(tagEntityId, allTags, user.id);
      } else if (tagContentType === 'company') {
        // Find company by ID if not selectedCompany
        const targetCompany = selectedCompany || companies.find(c => c.id === tagEntityId);
        if (targetCompany) {
          // Merge with existing tags
          const allTags = [...new Set([...(targetCompany.tags || []), ...selectedTags])];
          await TagService.updateCompanyTags(tagEntityId, allTags, user.id);
        }
      }
      
      // Refresh work history
      if (onRefresh) {
        onRefresh();
      }
      
      setIsTagModalOpen(false);
      setSuggestedTags([]);
      setTagContent('');
      setSearchError(null);
    } catch (error) {
      console.error('Error updating tags:', error);
      setSearchError(error instanceof Error ? error.message : 'Failed to update tags. Please try again.');
    }
  };

  // Company tag suggestion handlers
  const handleCompanyTagSuggestions = async (company?: WorkHistoryCompany) => {
    const targetCompany = company || selectedCompany;
    if (!targetCompany) return;
    
    const content = `${targetCompany.name}: ${targetCompany.description || 'Company information'}`;
    
    setTagContent(content);
    setTagContentType('company');
    setTagEntityId(targetCompany.id);
    setSuggestedTags([]);
    setSearchError(null);
    setIsSearching(true); // Show "Researching company..." indicator
    setIsTagModalOpen(true);
    
    try {
      const suggestions = await TagSuggestionService.suggestTags({
        content,
        contentType: 'company',
        companyName: targetCompany.name, // Pass company name for browser search
        userGoals: goals ? {
          industries: goals.industries,
          businessModels: goals.businessModels
        } : undefined,
        existingTags: targetCompany.tags || []
      });
      
      setSuggestedTags(suggestions);
      setIsSearching(false);
    } catch (error) {
      console.error('Error generating tag suggestions:', error);
      setIsSearching(false);
      setSearchError(error instanceof Error ? error.message : 'Failed to research company. Please try again.');
    }
  };

  // Retry handler for company tag suggestions
  const handleRetryCompanyTags = () => {
    handleCompanyTagSuggestions();
  };

  // NOTE: Story and link tag suggestions removed
  // Story tags are auto-generated when creating content to address gaps (using gapContext)
  // Link tags are not needed - links are supporting evidence, not primary content

  // Update detail view when initialTab prop changes
  useEffect(() => {
    setDetailView(initialTab);
  }, [initialTab]);
  
  const formatDateRange = (startDate: string, endDate?: string) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
    const end = endDate 
      ? new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      : 'Present';
    return `${start} - ${end}`;
  };

  const handleEditRole = () => {
    if (selectedRole) {
      setEditingRole({ ...selectedRole, tags: selectedRole.tags || [] });
      setRoleTagInput('');
      setIsEditingRole(true);
    }
  };

  const handleAddRoleTag = () => {
    if (roleTagInput.trim() && editingRole && !editingRole.tags?.includes(roleTagInput.trim())) {
      setEditingRole({
        ...editingRole,
        tags: [...(editingRole.tags || []), roleTagInput.trim()]
      });
      setRoleTagInput('');
    }
  };

  const handleRemoveRoleTag = (tagToRemove: string) => {
    if (editingRole) {
      setEditingRole({
        ...editingRole,
        tags: (editingRole.tags || []).filter(tag => tag !== tagToRemove)
      });
    }
  };

  const handleSaveRole = () => {
    if (editingRole && selectedRole) {
      // Update the selected role with edited data
      Object.assign(selectedRole, editingRole);
      setIsEditingRole(false);
      setEditingRole(null);
      setRoleTagInput('');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingRole(false);
    setEditingRole(null);
    setRoleTagInput('');
  };

  const handleEditStory = (story: WorkHistoryBlurb) => {
    setEditingStory({ ...story, tags: story.tags || [] });
    setStoryTagInput('');
    setIsEditingStory(true);
  };

  const handleAddStoryTag = () => {
    if (storyTagInput.trim() && editingStory && !editingStory.tags?.includes(storyTagInput.trim())) {
      setEditingStory({
        ...editingStory,
        tags: [...(editingStory.tags || []), storyTagInput.trim()]
      });
      setStoryTagInput('');
    }
  };

  const handleRemoveStoryTag = (tagToRemove: string) => {
    if (editingStory) {
      setEditingStory({
        ...editingStory,
        tags: (editingStory.tags || []).filter(tag => tag !== tagToRemove)
      });
    }
  };

  const handleSaveStory = () => {
    if (editingStory && selectedRole) {
      // Find and update the story in the selected role
      const storyIndex = selectedRole.blurbs.findIndex(s => s.id === editingStory.id);
      if (storyIndex !== -1) {
        selectedRole.blurbs[storyIndex] = { ...editingStory };
      }
      setIsEditingStory(false);
      setEditingStory(null);
    }
  };

  const handleCancelEditStory = () => {
    setIsEditingStory(false);
    setEditingStory(null);
    setStoryTagInput('');
  };

  // Edit Role Modal - Check this first
  if (isEditingRole && editingRole) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Edit Role</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Empty div to ensure proper spacing for first real section */}
            <div></div>
            
            {/* Basic Role Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editingRole.title}
                  onChange={(e) => setEditingRole({ ...editingRole, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingRole.description || ''}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  placeholder="Describe your role and responsibilities..."
                />
              </div>
              
              {/* Outcome Metrics */}
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Outcome Metrics</Label>
                </div>
                <div className="space-y-2 mt-2">
                  {editingRole.outcomeMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={metric}
                        onChange={(e) => {
                          const updatedMetrics = [...editingRole.outcomeMetrics];
                          updatedMetrics[index] = e.target.value;
                          setEditingRole({ ...editingRole, outcomeMetrics: updatedMetrics });
                        }}
                        placeholder="Enter outcome metric..."
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updatedMetrics = editingRole.outcomeMetrics.filter((_, i) => i !== index);
                          setEditingRole({ ...editingRole, outcomeMetrics: updatedMetrics });
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingRole({
                        ...editingRole,
                        outcomeMetrics: [...editingRole.outcomeMetrics, '']
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Metric
                  </Button>
                </div>
              </div>
              
              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="roleTags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="roleTags"
                    value={roleTagInput}
                    onChange={(e) => setRoleTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRoleTag();
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                  />
                  <Button type="button" onClick={handleAddRoleTag} size="sm">
                    Add
                  </Button>
                </div>
                
                {editingRole.tags && editingRole.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editingRole.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveRoleTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveRole} className="flex-1">
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edit Story Modal - Check this second
  if (isEditingStory && editingStory) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Edit Story</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEditStory}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Empty div to ensure proper spacing for first real section */}
            <div></div>
            
            {/* Basic Story Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="storyTitle">Title</Label>
                <Input
                  id="storyTitle"
                  value={editingStory.title}
                  onChange={(e) => setEditingStory({ ...editingStory, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="storyContent">Content</Label>
                <Textarea
                  id="storyContent"
                  value={editingStory.content}
                  onChange={(e) => setEditingStory({ ...editingStory, content: e.target.value })}
                  placeholder="Describe your story and achievements..."
                  rows={4}
                />
              </div>
              
              {/* Outcome Metrics */}
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Outcome Metrics</Label>
                </div>
                <div className="space-y-2 mt-2">
                  {editingStory.outcomeMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={metric}
                        onChange={(e) => {
                          const updatedMetrics = [...editingStory.outcomeMetrics];
                          updatedMetrics[index] = e.target.value;
                          setEditingStory({ ...editingStory, outcomeMetrics: updatedMetrics });
                        }}
                        placeholder="Enter outcome metric..."
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updatedMetrics = editingStory.outcomeMetrics.filter((_, i) => i !== index);
                          setEditingStory({ ...editingStory, outcomeMetrics: updatedMetrics });
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingStory({
                        ...editingStory,
                        outcomeMetrics: [...editingStory.outcomeMetrics, '']
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Metric
                  </Button>
                </div>
              </div>
              
              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="storyTags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="storyTags"
                    value={storyTagInput}
                    onChange={(e) => setStoryTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddStoryTag();
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                  />
                  <Button type="button" onClick={handleAddStoryTag} size="sm">
                    Add
                  </Button>
                </div>
                
                {editingStory.tags && editingStory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editingStory.tags.map((tag) => (
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
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveStory} className="flex-1">
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle different data sources FIRST - before any other checks
  if (selectedDataSource === 'linkedin') {
    return (
      <div className="h-full">
        <LinkedInDataSource 
          onConnectLinkedIn={() => console.log('Connect LinkedIn')}
          onRefresh={() => window.location.reload()}
        />
      </div>
    );
  }

  if (selectedDataSource === 'resume') {
    return (
      <div className="h-full">
        <ResumeDataSource 
          onUploadResume={() => console.log('Upload Resume')}
          onRefresh={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!selectedCompany && !selectedRole) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Welcome to Work History
          </h3>
          <p className="text-muted-foreground">
            Select a company or role to get started
          </p>
        </div>
      </Card>
    );
  }

  // Show role details if a role is selected (this takes priority)
  if (selectedRole) {
    // Find the company for this role
    const roleCompany = companies.find(c => c.id === selectedRole.companyId);
    const totalContent = selectedRole.blurbs.length + selectedRole.externalLinks.length;
    
    return (
      <div className="space-y-6 h-full flex flex-col">
        {/* Company Section - Persistent at Top */}
        {roleCompany && (() => {
          // Detect if description is role-level (contains action verbs typical of role descriptions)
          const isRoleLevelDescription = (desc: string | null | undefined): boolean => {
            if (!desc) return false;
            const descLower = desc.trim().toLowerCase();
            // Role-level descriptions typically start with action verbs or contain role-specific language
            const roleLevelIndicators = [
              /^(led|owned|delivered|managed|built|designed|developed|created|improved|increased|reduced|launched|defined|scaled|drove|achieved|implemented|optimized|established|overhauled|enhanced)/i,
              /\b(scaling|improving|driving|reducing|enhancing|optimizing|building|delivering|managing|owning)\b/i,
              // Phrases that indicate role-level (first-person actions)
              /\b(owned|led|delivered|managed)\b.*\b(platform|product|system|feature|process|initiative|project|organization|team)\b/i
            ];
            return roleLevelIndicators.some(pattern => pattern.test(desc));
          };
          
          const hasCompanyDescription = roleCompany.description && 
            roleCompany.description.trim() !== '' && 
            !isRoleLevelDescription(roleCompany.description);
          const hasCompanyTags = roleCompany.tags && roleCompany.tags.length > 0;
          const hasCompanyInfo = hasCompanyDescription || hasCompanyTags;
          
          // Empty state if no company info
          if (!hasCompanyInfo) {
            return (
              <div className="space-y-4">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-foreground mb-4">{roleCompany.name}</h1>
                      {isEditingCompanyDescription ? (
                        <div>
                          <Textarea
                            value={companyDescriptionDraft}
                            onChange={(e) => setCompanyDescriptionDraft(e.target.value)}
                            className="min-h-[60px] text-muted-foreground resize-none"
                            placeholder="Enter company description..."
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-3">
                            <Button size="sm" onClick={handleSaveCompanyDescription}>
                              Save
                            </Button>
                            <Button variant="secondary" size="sm" onClick={handleCancelEditCompanyDescription}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 text-muted-foreground cursor-pointer"
                          onClick={() => setIsEditingCompanyDescription(true)}
                        >
                          <span className="text-sm italic">Company description not available</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditingCompanyDescription(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Company Overflow Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onAddRole}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleGenerateCompanyContent}>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Content
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditCompany?.(roleCompany)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Company
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                          Delete Company
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {/* Company Tags - Empty State */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Tags className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Company Tags</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="mr-2">No company tags available</span>
                    <TagSuggestionButton
                      content={`${roleCompany.name}: Company information`}
                      onTagsSuggested={() => {}}
                      onClick={() => {
                        const actualCompany = companies.find(c => c.name === roleCompany.name);
                        if (actualCompany) {
                          handleCompanyTagSuggestions(actualCompany);
                        }
                      }}
                      variant="tertiary"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            );
          }
          
          // Normal state with company info
          return (
            <div className="space-y-4">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-foreground mb-4">{roleCompany.name}</h1>
                      {isEditingCompanyDescription ? (
                        <div>
                          <Textarea
                            value={companyDescriptionDraft}
                            onChange={(e) => setCompanyDescriptionDraft(e.target.value)}
                            className="min-h-[60px] text-muted-foreground resize-none"
                            placeholder="Enter company description..."
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-3">
                            <Button size="sm" onClick={handleSaveCompanyDescription}>
                              Save
                            </Button>
                            <Button variant="secondary" size="sm" onClick={handleCancelEditCompanyDescription}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                    ) : hasCompanyDescription ? (
                      <div 
                        className="flex items-center gap-2 group cursor-pointer"
                        onClick={() => setIsEditingCompanyDescription(true)}
                      >
                        <p className="text-muted-foreground flex-1">{roleCompany.description}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingCompanyDescription(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center gap-2 text-muted-foreground cursor-pointer"
                        onClick={() => setIsEditingCompanyDescription(true)}
                      >
                        <span className="text-sm italic">Company description not available</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingCompanyDescription(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Company Overflow Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={onAddRole}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Role
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleGenerateCompanyContent}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Content
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditCompany?.(roleCompany)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Company
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                        Delete Company
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Company Tags */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Company Tags</span>
                </div>
                {hasCompanyTags ? (
                  <div className="flex flex-wrap gap-1">
                    {roleCompany.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    <TagSuggestionButton
                      content={`${roleCompany.name}: ${hasCompanyDescription ? roleCompany.description : 'Company information'}`}
                      onTagsSuggested={() => {}}
                      onClick={() => {
                        const actualCompany = companies.find(c => c.name === roleCompany.name);
                        if (actualCompany) {
                          handleCompanyTagSuggestions(actualCompany);
                        }
                      }}
                      variant="tertiary"
                      size="sm"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <span className="mr-2">No company tags available</span>
                    <TagSuggestionButton
                      content={`${roleCompany.name}: ${hasCompanyDescription ? roleCompany.description : 'Company information'}`}
                      onTagsSuggested={() => {}}
                      onClick={() => {
                        const actualCompany = companies.find(c => c.name === roleCompany.name);
                        if (actualCompany) {
                          handleCompanyTagSuggestions(actualCompany);
                        }
                      }}
                      variant="tertiary"
                      size="sm"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Navigation Tabs - Below Company Section */}
        <div className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex space-x-8">
              <button
                className={cn(
                  "flex items-center gap-2 py-4 px-1 border-b-4 font-medium text-sm transition-colors",
                  detailView === 'role' 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-[#E32D9A]"
                )}
                onClick={() => setDetailView('role')}
              >
                <User className="h-4 w-4" />
                Role
              </button>
              <button
                className={cn(
                  "flex items-center gap-2 py-4 px-1 border-b-4 font-medium text-sm transition-colors",
                  detailView === 'stories' 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-[#E32D9A]"
                )}
                onClick={() => setDetailView('stories')}
              >
                <FileText className="h-4 w-4" />
                Stories ({selectedRole.blurbs.length})
              </button>
              <button
                className={cn(
                  "flex items-center gap-2 py-4 px-1 border-b-4 font-medium text-sm transition-colors",
                  detailView === 'links' 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-[#E32D9A]"
                )}
                onClick={() => setDetailView('links')}
              >
                <LinkIcon className="h-4 w-4" />
                Links ({selectedRole.externalLinks.length})
              </button>
            </div>
            
            {/* Dynamic CTA */}
            <div className="flex gap-2">
              {detailView === 'role' && onAddRole && (
                <Button onClick={onAddRole} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Role
                </Button>
              )}
              {detailView === 'stories' && onAddStory && (
                <Button onClick={onAddStory} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Story
                </Button>
              )}
              {detailView === 'links' && onAddLink && (
                <Button onClick={onAddLink} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Role Details View */}
        {detailView === 'role' && (
          <div className="space-y-4">
            {/* Title with Overflow Menu - Inline */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground mb-2">{selectedRole.title}</h2>
                <div className="text-sm text-muted-foreground mb-4">
                  {formatDateRange(selectedRole.startDate, selectedRole.endDate)}
                </div>
              </div>
              
              {/* Role Actions Menu - Next to title */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEditRole}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Role
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    // Trigger HIL workflow for role content generation
                    handleGenerateContent('role-description');
                  }}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Content
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                    Delete Role
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Role Description Card - Full Width */}
            {selectedRole.description && (
              <Card className={cn(
                "border w-full",
                // Show orange border only when description-specific gaps exist
                (() => {
                  const descriptionGaps = (selectedRole as any).gaps?.filter((gap: any) => {
                    // Filter for description-specific gap categories (future: missing_role_description, generic_role_description, etc.)
                    // For now, we only have metrics gaps, so this will be empty until we add description gap detection
                    return gap.gap_category?.includes('description') || 
                           gap.gap_category === 'generic_role_description' ||
                           gap.gap_category === 'missing_role_description';
                  }) || [];
                  return descriptionGaps.length > 0 && !resolvedGaps.has('role-description-gap');
                })() && "border-warning"
              )}>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    {selectedRole.description}
                  </p>
                  
                  {/* Role Description Gap Banner - only description-specific gaps */}
                  {(() => {
                    const descriptionGaps = (selectedRole as any).gaps?.filter((gap: any) => {
                      return gap.gap_category?.includes('description') || 
                             gap.gap_category === 'generic_role_description' ||
                             gap.gap_category === 'missing_role_description';
                    }) || [];
                    return descriptionGaps.length > 0 && !resolvedGaps.has('role-description-gap') ? (
                      <ContentGapBanner
                        gaps={descriptionGaps}
                        onGenerateContent={() => handleGenerateContent('role-description')}
                        onDismiss={() => {
                          // Resolve all description gaps (use first gap's ID for DB, but keep local ID for state)
                          if (descriptionGaps.length > 0 && descriptionGaps[0].id) {
                            descriptionGaps.forEach(gap => {
                              if (gap.id) {
                                handleResolveGap(gap.id, 'role-description-gap');
                              }
                            });
                          }
                        }}
                        isResolved={resolvedGaps.has('role-description-gap')}
                      />
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}
            
            {/* Outcome Metrics */}
            <div>
              <Card id="role-metrics" className={cn(
                "border",
                // Show orange border only when metrics-specific gaps exist
                (() => {
                  const metricsGaps = (selectedRole as any).gaps?.filter((gap: any) => 
                    gap.gap_category === 'missing_role_metrics' || 
                    gap.gap_category === 'insufficient_role_metrics'
                  ) || [];
                  return metricsGaps.length > 0 && !resolvedGaps.has('role-metrics-gap');
                })() && "border-warning"
              )}>
                <CardContent className="pt-6">
                  {/* Always show OutcomeMetrics (it handles empty state internally) */}
                  <OutcomeMetrics
                    metrics={selectedRole.outcomeMetrics || []}
                  />
                  
                  {/* Role Metrics Gap Banner - only metrics-specific gaps */}
                  {(() => {
                    // Filter to only metrics-specific gap categories
                    const metricsGaps = (selectedRole as any).gaps?.filter((gap: any) => 
                      gap.gap_category === 'missing_role_metrics' || 
                      gap.gap_category === 'insufficient_role_metrics'
                    ) || [];
                    return metricsGaps.length > 0 && !resolvedGaps.has('role-metrics-gap') ? (
                      <ContentGapBanner
                        gaps={metricsGaps}
                        onGenerateContent={() => handleGenerateContent('role-metrics')}
                        onDismiss={() => {
                          // Resolve all metrics gaps (use first gap's ID for DB, but keep local ID for state)
                          if (metricsGaps.length > 0 && metricsGaps[0].id) {
                            metricsGaps.forEach(gap => {
                              if (gap.id) {
                                handleResolveGap(gap.id, 'role-metrics-gap');
                              }
                            });
                          }
                        }}
                        isResolved={resolvedGaps.has('role-metrics-gap')}
                      />
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            </div>
            
            {/* Role Tags */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Tags className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Role Tags</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedRole.tags.length > 0 && selectedRole.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                <Badge 
                  variant="outline" 
                  className="text-xs cursor-pointer hover:bg-muted border-dashed"
                  onClick={handleEditRole}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {selectedRole.tags.length === 0 ? 'Add tag' : ''}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Stories View */}
        {detailView === 'stories' && selectedRole && (
              <div>
                {selectedRole.blurbs.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No stories yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first story to showcase your achievements in this role
                    </p>
                  </div>
                ) : (
                  <div>
                    {selectedRole.blurbs.map((story, index) => {
                      // Find linked external links for this story
                      const linkedLinks = story.linkedExternalLinks
                        .map(linkId => selectedRole.externalLinks.find(link => link.id === linkId))
                        .filter(Boolean) as any[];
                      
                      return (
                        <div key={story.id} id={`story-${story.id}`} className={index > 0 ? "mt-6" : ""}>
                          <StoryCard
                            story={story}
                            linkedLinks={linkedLinks}
                            onEdit={() => handleEditStory(story)}
                            onDuplicate={() => onDuplicateStory?.(story)}
                            onDelete={() => onDeleteStory?.(story)}
                            isGapResolved={resolvedGaps.has(`story-content-gap-${story.id}`)}
                            hasGaps={(story as any).hasGaps}
                            gaps={(story as any).gaps}
                            onGenerateContent={(story as any).hasGaps && !resolvedGaps.has(`story-content-gap-${story.id}`) ? () => {
                              setSelectedGap({ ...mockGapData['story-content'], storyId: story.id });
                              setIsContentModalOpen(true);
                            } : undefined}
                            onDismissGap={(story as any).hasGaps && !resolvedGaps.has(`story-content-gap-${story.id}`) ? () => {
                              // Resolve all story gaps using real database IDs
                              const storyGaps = (story as any).gaps || [];
                              if (storyGaps.length > 0) {
                                storyGaps.forEach((gap: any) => {
                                  if (gap.id) {
                                    handleResolveGap(gap.id, `story-content-gap-${story.id}`);
                                  }
                                });
                              }
                            } : undefined}
                          />
                      
                      {/* Success State - Story Content (only show if content was generated, not just dismissed) */}
                      {resolvedGaps.has(`story-content-generated-${story.id}`) && !dismissedSuccessCards.has(`story-content-generated-${story.id}`) && (
                        <div className="mt-4 border-success bg-success/5 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-success" />
                              <span className="font-medium text-success">Story Content Enhanced</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-success/10"
                              onClick={() => handleDismissSuccessCard(`story-content-generated-${story.id}`)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Content has been successfully generated and applied.
                          </p>
                        </div>
                      )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
        )}

        {/* Links View */}
        {detailView === 'links' && selectedRole && (
              <div>
                {selectedRole.externalLinks.length === 0 ? (
                  <div className="text-center py-8">
                    <LinkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No links yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Add external links to provide supporting evidence for your stories
                    </p>
                  </div>
                ) : (
                  <div>
                    {selectedRole.externalLinks.map((link, index) => (
                      <div key={link.id} className={index > 0 ? "mt-6" : ""}>
                        <LinkCard
                          id={link.id}
                          label={link.label}
                          url={link.url}
                          tags={link.tags}
                          timesUsed={link.timesUsed}
                          lastUsed={link.lastUsed}
                          onEdit={() => onEditLink?.(link)}
                          onDuplicate={() => {}} // TODO: Implement link duplication
                          onDelete={() => {}} // TODO: Implement link deletion
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
        
        {/* Content Generation Modal */}
        <ContentGenerationModal
          isOpen={isContentModalOpen}
          onClose={() => {
            setIsContentModalOpen(false);
            setSelectedGap(null);
          }}
          gap={selectedGap}
          onApplyContent={handleApplyContent}
        />

        {/* Tag Suggestion Modal */}
        <ContentGenerationModal
          isOpen={isTagModalOpen}
          onClose={() => {
            console.log('Closing tag suggestion modal');
            setIsTagModalOpen(false);
            setSuggestedTags([]);
          }}
          mode="tag-suggestion"
          content={tagContent}
          suggestedTags={suggestedTags}
          onApplyTags={handleApplyTags}
        />
      </div>
    );
  }

  // Show company details if only company is selected (and no role is selected)
  // Note: With auto-selection, this should rarely appear, but handle it for edge cases
  if (selectedCompany && !selectedRole) {
    return (
      <div className="space-y-8 h-full flex flex-col">
        {/* Company Header - Clean, No Card Styling */}
        <div>
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-4">{selectedCompany.name}</h1>
                {selectedCompany.description && (
                  <p className="text-muted-foreground">{selectedCompany.description}</p>
                )}
              </div>
              
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onAddRole}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Role
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEditCompany?.(selectedCompany)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Company
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                  Delete Company
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Company Tags - Clean Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Tags className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Company Tags</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-3">
            {selectedCompany.tags.length > 0 && selectedCompany.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            <TagSuggestionButton
              content={`${selectedCompany.name}: ${selectedCompany.description || 'Company information'}`}
              onTagsSuggested={() => {}}
              onClick={handleCompanyTagSuggestions}
              variant="tertiary"
              size="sm"
            />
          </div>
        </div>

        {/* Roles Section - Cards Only */}
        <div className="flex-1">
          <div className="flex flex-col gap-6"> {/* Design system: 24px between role cards */}
            {selectedCompany.roles.map((role) => (
              <Card key={role.id} className="assessment-card cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors group" onClick={() => onRoleSelect?.(role)}>
                <CardContent className="assessment-card-content">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-lg text-foreground group-hover:text-primary-foreground">{role.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-primary-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDateRange(role.startDate, role.endDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="group-hover:bg-primary-foreground group-hover:text-primary group-hover:border-primary-foreground">
                        {role.blurbs.length === 0 ? '0 stories' : `${role.blurbs.length} story${role.blurbs.length === 1 ? '' : 's'}`}
                      </Badge>
                      <Badge variant="outline" className="group-hover:bg-primary-foreground group-hover:text-primary group-hover:border-primary-foreground">
                        {role.externalLinks?.length || 0} link{(role.externalLinks?.length || 0) === 1 ? '' : 's'}
                      </Badge>
                    </div>
                  </div>
                  
                  {role.description && (
                    <p className="text-muted-foreground group-hover:text-primary-foreground">{role.description}</p>
                  )}
                  
                  {role.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {role.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs group-hover:bg-primary-foreground group-hover:text-primary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tag Suggestion Modal */}
        <ContentGenerationModal
          isOpen={isTagModalOpen}
          onClose={() => {
            setIsTagModalOpen(false);
            setSuggestedTags([]);
            setTagContent('');
            setSearchError(null);
            setIsSearching(false);
          }}
          mode="tag-suggestion"
          content={tagContent}
          contentType={tagContentType}
          entityId={tagEntityId}
          existingTags={
            tagContentType === 'company' 
              ? (selectedCompany?.tags || companies.find(c => c.id === tagEntityId)?.tags || [])
              : tagContentType === 'role'
              ? (selectedRole?.tags || [])
              : []
          }
          suggestedTags={suggestedTags}
          onApplyTags={handleApplyTags}
          isSearching={isSearching}
          searchError={searchError}
          onRetry={tagContentType === 'company' ? handleRetryCompanyTags : undefined}
        />
      </div>
    );
  }

  return null;
};