import { useState, useEffect } from "react";
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
  AlertTriangle
} from "lucide-react";
import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";
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
  onRoleSelect?: (role: WorkHistoryRole) => void;
  onAddRole?: () => void;
  onAddStory?: () => void;
  onAddLink?: () => void;
  onEditCompany?: (company: WorkHistoryCompany) => void;
  onEditStory?: (story: WorkHistoryBlurb) => void;
  onEditLink?: (link: any) => void;
  onDuplicateStory?: (story: WorkHistoryBlurb) => void;
  onDeleteStory?: (story: WorkHistoryBlurb) => void;
}

type DetailView = 'role' | 'stories' | 'links';

export const WorkHistoryDetail = ({ 
  selectedCompany, 
  selectedRole,
  companies,
  initialTab = 'role',
  onRoleSelect,
  onAddRole,
  onAddStory,
  onAddLink,
  onEditCompany,
  onEditStory,
  onEditLink,
  onDuplicateStory,
  onDeleteStory,
}: WorkHistoryDetailProps) => {
  const [detailView, setDetailView] = useState<DetailView>(initialTab);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<WorkHistoryRole | null>(null);
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [editingStory, setEditingStory] = useState<WorkHistoryBlurb | null>(null);
  
  // Content Generation Modal state
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [selectedGap, setSelectedGap] = useState<any>(null);

  // Mock gap data for content generation
  const mockGapData = {
    'role-description': {
      id: 'role-description-gap',
      type: 'content-enhancement',
      severity: 'high',
      description: 'Role description is too generic and lacks specific achievements',
      suggestion: 'Add quantifiable results, specific projects, and measurable impact to demonstrate value',
      paragraphId: 'role-description',
      origin: 'ai' as const,
      addresses: ['quantifiable achievements', 'specific metrics', 'KPIs from past projects']
    },
    'outcome-metrics': {
      id: 'outcome-metrics-gap',
      type: 'content-enhancement',
      severity: 'high',
      description: 'Outcome metrics need more specificity and context',
      suggestion: 'Include percentages, dollar amounts, timeframes, and business impact metrics',
      paragraphId: 'outcome-metrics',
      origin: 'ai' as const,
      addresses: ['specific percentages', 'dollar amounts', 'timeframes', 'business impact']
    },
    'story-content': {
      id: 'story-content-gap',
      type: 'content-enhancement',
      severity: 'medium',
      description: 'Story needs more specific examples and quantifiable results',
      suggestion: 'Add concrete examples, metrics, and outcomes to strengthen the narrative',
      paragraphId: 'story-content',
      origin: 'ai' as const,
      addresses: ['concrete examples', 'specific metrics', 'measurable outcomes']
    }
  };

  const handleGenerateContent = (gapType: string) => {
    setSelectedGap(mockGapData[gapType as keyof typeof mockGapData]);
    setIsContentModalOpen(true);
  };

  const handleApplyContent = (content: string) => {
    console.log('Applied generated content:', content);
    // TODO: Implement content application logic
    setIsContentModalOpen(false);
    setSelectedGap(null);
  };

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
      setEditingRole({ ...selectedRole });
      setIsEditingRole(true);
    }
  };

  const handleSaveRole = () => {
    if (editingRole && selectedRole) {
      // Update the selected role with edited data
      Object.assign(selectedRole, editingRole);
      setIsEditingRole(false);
      setEditingRole(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingRole(false);
    setEditingRole(null);
  };

  const handleEditStory = (story: WorkHistoryBlurb) => {
    setEditingStory({ ...story });
    setIsEditingStory(true);
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

  // Show role details if a role is selected
  if (selectedRole) {
    // Find the company for this role
    const roleCompany = companies.find(c => c.id === selectedRole.companyId);
    const totalContent = selectedRole.blurbs.length + selectedRole.externalLinks.length;
    
    return (
      <div className="space-y-6 h-full flex flex-col">
        {/* Persistent Role Header */}
        <div className="border-b pb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div>
                <h1 className="text-3xl font-bold text-foreground">{selectedRole.title}</h1>
                <p className="text-xl text-muted-foreground mt-1">
                  at {roleCompany?.name || 'Unknown Company'}
                </p>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDateRange(selectedRole.startDate, selectedRole.endDate)}
                </div>
              </div>
            </div>
            
            {/* Role Actions Menu - Inline with role name */}
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
                  console.log('Generate content for role:', selectedRole?.title);
                  // TODO: Implement content generation
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
        </div>

                {/* Navigation Tabs */}
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

                {/* Content Area */}
        <div className="pt-6">
          {/* Role Details View */}
          {detailView === 'role' && (
            <div>
                            {/* Role Description */}
                            {selectedRole.description && (
                              <div className={cn(
                                "mb-6 p-4 rounded-lg",
                                (selectedRole as any).hasGaps && "border-warning bg-warning/5 border"
                              )}>
                                <p className="text-foreground">{selectedRole.description}</p>
                              </div>
                            )}
                            
                            {/* Gap Detection - Role Description Gap */}
                            {(selectedRole as any).hasGaps && (
                              <div className="mb-6 border-warning bg-warning/5 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className="h-4 w-4 text-warning" />
                                  <span className="font-medium text-warning">Role Description Gap</span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Role description is too generic. Add specific achievements and quantifiable results.
                                </p>
                                <Button 
                                  variant="secondary" 
                                  size="sm"
                                  className="w-full"
                                  onClick={() => handleGenerateContent('role-description')}
                                >
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Generate Content
                                </Button>
                              </div>
                            )}
                            
                            {/* Outcome Metrics */}
                            <div className={cn(
                              "mb-6",
                              (selectedRole as any).hasGaps && "border-warning bg-warning/5 border p-4 rounded-lg"
                            )}>
                              <OutcomeMetrics
                                metrics={selectedRole.outcomeMetrics}
                              />
                            </div>

                            {/* Gap Detection - Outcome Metrics Gap */}
                            {(selectedRole as any).hasGaps && (
                              <div className="mb-6 border-warning bg-warning/5 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className="h-4 w-4 text-warning" />
                                  <span className="font-medium text-warning">Outcome Metrics Gap</span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Metrics need more specificity. Include percentages, dollar amounts, and timeframes.
                                </p>
                                <Button 
                                  variant="secondary" 
                                  size="sm"
                                  className="w-full"
                                  onClick={() => handleGenerateContent('outcome-metrics')}
                                >
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Generate Content
                                </Button>
                              </div>
                            )}
                            
                            {/* Role Tags */}
                            {selectedRole.tags.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Tags className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Role Tags</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {selectedRole.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                
              </div>
            )}

            {/* Stories View */}
            {detailView === 'stories' && (
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
                        <div key={story.id} className={index > 0 ? "mt-6" : ""}>
                          <StoryCard
                            story={story}
                            linkedLinks={linkedLinks}
                            onEdit={() => handleEditStory(story)}
                            onDuplicate={() => onDuplicateStory?.(story)}
                            onDelete={() => onDeleteStory?.(story)}
                          />
                          {/* Story Gap Detection */}
                          {(story as any).hasGaps && (
                            <div className="mt-4 border-warning bg-warning/5 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-warning" />
                                <span className="font-medium text-warning">Story Content Gap</span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                Story needs more specific examples and quantifiable results.
                              </p>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={() => handleGenerateContent('story-content')}
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Content
                          </Button>
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
            {detailView === 'links' && (
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
        </div>
        
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
      </div>
    );
  }

      // Show company details if only company is selected
  if (selectedCompany) {
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
        {selectedCompany.tags.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Tags className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Company Tags</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-3">
              {selectedCompany.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

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
      </div>
    );
  }

  return null;
};