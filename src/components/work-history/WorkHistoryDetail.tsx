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
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";
import { TagSuggestionButton } from "@/components/ui/TagSuggestionButton";
import { LinkedInDataSource } from "./LinkedInDataSource";
import { ResumeDataSource } from "./ResumeDataSource";
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
}: WorkHistoryDetailProps) => {
  const [detailView, setDetailView] = useState<DetailView>(initialTab);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<WorkHistoryRole | null>(null);
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [editingStory, setEditingStory] = useState<WorkHistoryBlurb | null>(null);
  
  // Content Generation Modal state
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [selectedGap, setSelectedGap] = useState<any>(null);
  
  // Tag suggestion state
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagContent, setTagContent] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<any[]>([]);
  
  // Success state management - tracks which success cards have been dismissed
  const [dismissedSuccessCards, setDismissedSuccessCards] = useState<Set<string>>(new Set());
  
  // Inline editing state for company description
  const [isEditingCompanyDescription, setIsEditingCompanyDescription] = useState(false);
  const [companyDescriptionDraft, setCompanyDescriptionDraft] = useState('');

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
  };

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

  const handleApplyContent = (content: string) => {
    console.log('Applied generated content:', content);
    
    // Mark this gap as resolved
    if (selectedGap) {
      onResolvedGapsChange(new Set([...resolvedGaps, selectedGap.id]));
      
      // Auto-dismiss success card after 3 seconds
      setTimeout(() => {
        setDismissedSuccessCards(prev => new Set([...prev, selectedGap.id]));
      }, 3000);
    }
    
    // TODO: Implement content application logic
    
    // Show temporary success state
    setTimeout(() => {
      setIsContentModalOpen(false);
      setSelectedGap(null);
    }, 1000);
  };

  const handleDismissSuccessCard = (gapId: string) => {
    setDismissedSuccessCards(prev => new Set([...prev, gapId]));
  };

  // Tag suggestion handlers
  const handleTagSuggestions = (tags: string[]) => {
    console.log('handleTagSuggestions called with:', tags);
    // Generate mock tag suggestions based on content
    const content = `${selectedRole.title} at ${selectedCompany.name}: ${selectedRole.description}`;
    console.log('Generating tags for content:', content);
    
    // Generate mock tags immediately without delay
    const mockTags = generateMockTagsSync(content);
    console.log('Generated mock tags:', mockTags);
    
    const tagSuggestions = mockTags.map((tag, index) => ({
      id: `tag-${index}`,
      value: tag,
      confidence: Math.random() > 0.5 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low'
    }));
    console.log('Tag suggestions:', tagSuggestions);
    setSuggestedTags(tagSuggestions);
    setTagContent(content);
    console.log('Setting isTagModalOpen to true');
    setIsTagModalOpen(true);
    console.log('Modal should be opening now');
  };

  // Mock tag generation function
  const generateMockTags = async (content: string): Promise<string[]> => {
    // No delay for demo purposes
    
    const keywords = content.toLowerCase();
    const suggestedTags: string[] = [];
    
    // Industry tags
    if (keywords.includes('product') || keywords.includes('pm')) {
      suggestedTags.push('Product Management');
    }
    if (keywords.includes('saas') || keywords.includes('software')) {
      suggestedTags.push('SaaS');
    }
    if (keywords.includes('fintech') || keywords.includes('finance')) {
      suggestedTags.push('Fintech');
    }
    if (keywords.includes('healthcare') || keywords.includes('medical')) {
      suggestedTags.push('Healthcare');
    }
    if (keywords.includes('ecommerce') || keywords.includes('retail')) {
      suggestedTags.push('E-commerce');
    }
    
    // Competency tags
    if (keywords.includes('strategy') || keywords.includes('strategic')) {
      suggestedTags.push('Strategy');
    }
    if (keywords.includes('growth') || keywords.includes('scale')) {
      suggestedTags.push('Growth');
    }
    if (keywords.includes('ux') || keywords.includes('user experience')) {
      suggestedTags.push('UX');
    }
    if (keywords.includes('data') || keywords.includes('analytics')) {
      suggestedTags.push('Data Analytics');
    }
    if (keywords.includes('leadership') || keywords.includes('team')) {
      suggestedTags.push('Leadership');
    }
    if (keywords.includes('launch') || keywords.includes('release')) {
      suggestedTags.push('Product Launch');
    }
    if (keywords.includes('revenue') || keywords.includes('monetization')) {
      suggestedTags.push('Monetization');
    }
    
    // Business model tags
    if (keywords.includes('b2b') || keywords.includes('enterprise')) {
      suggestedTags.push('B2B');
    }
    if (keywords.includes('b2c') || keywords.includes('consumer')) {
      suggestedTags.push('B2C');
    }
    if (keywords.includes('marketplace') || keywords.includes('platform')) {
      suggestedTags.push('Platform');
    }
    
    // Remove duplicates and limit to 5 tags
    return [...new Set(suggestedTags)].slice(0, 5);
  };

  const handleApplyTags = (selectedTags: string[]) => {
    console.log('Applied tags:', selectedTags);
    // TODO: Update role tags in the data
    setIsTagModalOpen(false);
    setSuggestedTags([]);
  };

  // Company tag suggestion handlers
  const handleCompanyTagSuggestions = (tags: string[]) => {
    console.log('handleCompanyTagSuggestions called with:', tags);
    // Generate mock tag suggestions based on company content
    const content = `${selectedCompany.name}: ${selectedCompany.description || 'Company information'}`;
    console.log('Generating company tags for content:', content);
    
    // Generate mock tags immediately without delay
    const mockTags = generateMockTagsSync(content);
    console.log('Generated company mock tags:', mockTags);
    
    const tagSuggestions = mockTags.map((tag, index) => ({
      id: `company-tag-${index}`,
      value: tag,
      confidence: Math.random() > 0.5 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low'
    }));
    console.log('Company tag suggestions:', tagSuggestions);
    setSuggestedTags(tagSuggestions);
    setTagContent(content);
    console.log('Setting isTagModalOpen to true for company tags');
    setIsTagModalOpen(true);
    console.log('Company tag modal should be opening now');
  };

  // Story tag suggestion handlers
  const handleStoryTagSuggestions = async (tags: string[]) => {
    console.log('handleStoryTagSuggestions called with:', tags);
    // Get the actual story content from the current story
    const currentStory = selectedRole?.blurbs?.[0]; // Get first story for now
    const content = currentStory?.content || 'Story content for analysis';
    console.log('Generating story tags for content:', content);
    
    // Open modal first with loading state
    setTagContent(content);
    setSuggestedTags([]); // Start with empty tags to show loading
    setIsTagModalOpen(true);
    console.log('Modal opened with loading state');
    
    // Generate tags asynchronously
    const mockTags = await generateMockTags(content);
    console.log('Generated story mock tags:', mockTags);
    
    const tagSuggestions = mockTags.map((tag, index) => ({
      id: `story-tag-${index}`,
      value: tag,
      confidence: Math.random() > 0.5 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low'
    }));
    console.log('Story tag suggestions:', tagSuggestions);
    setSuggestedTags(tagSuggestions);
    console.log('Updated modal with tag suggestions');
  };

  // Synchronous mock tag generation for stories
  const generateMockTagsSync = (content: string): string[] => {
    const keywords = content.toLowerCase();
    const suggestedTags: string[] = [];
    
    // Story-specific tags
    if (keywords.includes('achievement') || keywords.includes('success')) {
      suggestedTags.push('Achievement');
    }
    if (keywords.includes('leadership') || keywords.includes('lead')) {
      suggestedTags.push('Leadership');
    }
    if (keywords.includes('innovation') || keywords.includes('creative')) {
      suggestedTags.push('Innovation');
    }
    if (keywords.includes('collaboration') || keywords.includes('team')) {
      suggestedTags.push('Collaboration');
    }
    if (keywords.includes('results') || keywords.includes('impact')) {
      suggestedTags.push('Results-driven');
    }
    if (keywords.includes('growth') || keywords.includes('scale')) {
      suggestedTags.push('Growth');
    }
    if (keywords.includes('technical') || keywords.includes('engineering')) {
      suggestedTags.push('Technical');
    }
    if (keywords.includes('strategy') || keywords.includes('strategic')) {
      suggestedTags.push('Strategy');
    }
    
    // Remove duplicates and limit to 5 tags
    return [...new Set(suggestedTags)].slice(0, 5);
  };

  // Link tag suggestion handlers
  const handleLinkTagSuggestions = (tags: string[]) => {
    console.log('handleLinkTagSuggestions called with:', tags);
    // Get the actual link content from the current link
    const currentLink = selectedRole?.externalLinks?.[0]; // Get first link for now
    const content = currentLink ? `${currentLink.label}: ${currentLink.url}` : 'Link content for analysis';
    console.log('Generating link tags for content:', content);
    
    // Generate mock tags immediately without delay
    const mockTags = generateMockTagsSync(content);
    console.log('Generated link mock tags:', mockTags);
    
    const tagSuggestions = mockTags.map((tag, index) => ({
      id: `link-tag-${index}`,
      value: tag,
      confidence: Math.random() > 0.5 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low'
    }));
    console.log('Link tag suggestions:', tagSuggestions);
    setSuggestedTags(tagSuggestions);
    setTagContent(content);
    console.log('Setting isTagModalOpen to true for link tags');
    setIsTagModalOpen(true);
    console.log('Link tag modal should be opening now');
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
                      onTagsSuggested={handleCompanyTagSuggestions}
                      onClick={() => handleCompanyTagSuggestions([])}
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
                      onTagsSuggested={handleCompanyTagSuggestions}
                      onClick={() => handleCompanyTagSuggestions([])}
                      variant="tertiary"
                      size="sm"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <span className="mr-2">No company tags available</span>
                    <TagSuggestionButton
                      content={`${roleCompany.name}: ${hasCompanyDescription ? roleCompany.description : 'Company information'}`}
                      onTagsSuggested={handleCompanyTagSuggestions}
                      onClick={() => handleCompanyTagSuggestions([])}
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
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {/* Title */}
                  <h2 className="text-2xl font-bold text-foreground mb-4">{selectedRole.title}</h2>
                  
                  {/* Date */}
                  <div className="text-sm text-muted-foreground mb-4">
                    {formatDateRange(selectedRole.startDate, selectedRole.endDate)}
                  </div>
                  
                  {/* Description */}
                  {selectedRole.description && (
                    <p className={cn(
                      "text-muted-foreground",
                      (selectedRole as any).hasGaps && !resolvedGaps.has('role-description-gap') && "border-warning bg-warning/5 border rounded-lg px-4 py-3"
                    )}>
                      {selectedRole.description}
                    </p>
                  )}
                </div>
                
                {/* Role Actions Menu */}
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
            </div>
            
            {/* Outcome Metrics */}
            <div>
              <OutcomeMetrics
                metrics={selectedRole.outcomeMetrics}
              />
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
                <TagSuggestionButton
                  content={`${selectedRole.title} at ${selectedCompany.name}: ${selectedRole.description}`}
                  onTagsSuggested={handleTagSuggestions}
                  onClick={() => {
                    setTagContent(`${selectedRole.title} at ${selectedCompany.name}: ${selectedRole.description}`);
                    handleTagSuggestions([]);
                  }}
                  variant="tertiary"
                  size="sm"
                />
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
                        <div key={story.id} className={index > 0 ? "mt-6" : ""}>
                          <StoryCard
                            story={story}
                            linkedLinks={linkedLinks}
                            onEdit={() => handleEditStory(story)}
                            onDuplicate={() => onDuplicateStory?.(story)}
                            onDelete={() => onDeleteStory?.(story)}
                            onTagSuggestions={handleStoryTagSuggestions}
                            isGapResolved={resolvedGaps.has('story-content-gap')}
                            hasGaps={(story as any).hasGaps}
                            onGenerateContent={(story as any).hasGaps && !resolvedGaps.has('story-content-gap') ? () => handleGenerateContent('story-content') : undefined}
                          />
                      
                      {/* Success State - Story Content */}
                      {resolvedGaps.has('story-content-gap') && !dismissedSuccessCards.has('story-content-gap') && (
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
                              onClick={() => handleDismissSuccessCard('story-content-gap')}
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
                          onTagSuggestions={handleLinkTagSuggestions}
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
              onTagsSuggested={handleCompanyTagSuggestions}
              onClick={() => handleCompanyTagSuggestions([])}
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

  return null;
};