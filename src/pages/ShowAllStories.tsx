import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, 
  Trash2, 
  Copy,
  Calendar,
  Building2,
  User,
  Star,
  MoreHorizontal,
  Eye,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShowAllTemplate, FilterOption, SortOption } from "@/components/shared/ShowAllTemplate";
import { Story } from "@/types/workHistory";
import { AddStoryModal } from "@/components/work-history/AddStoryModal";
import { StoryCard } from "@/components/work-history/StoryCard";

// Mock data for all stories
const mockAllStories: Story[] = [
  {
    id: "story-1",
    title: "Led cross-functional team to deliver MVP in 6 weeks",
    company: "TechCorp Inc.",
    role: "Senior Product Manager",
    impact: "high",
    metrics: "Increased user engagement by 45%",
    date: "2024-01-15",
    tags: ["leadership", "mvp", "user engagement"]
  },
  {
    id: "story-2",
    title: "Optimized customer onboarding flow reducing drop-off by 30%",
    company: "StartupXYZ",
    role: "Product Manager",
    impact: "medium",
    metrics: "Reduced onboarding time from 15 to 10 minutes",
    date: "2024-01-10",
    tags: ["optimization", "customer experience", "onboarding"]
  },
  {
    id: "story-3",
    title: "Launched new feature driving $2M in additional revenue",
    company: "Enterprise Corp",
    role: "Senior Product Manager",
    impact: "high",
    metrics: "Generated $2M in first quarter",
    date: "2024-01-05",
    tags: ["revenue", "launch", "feature development"]
  },
  {
    id: "story-4",
    title: "Managed product roadmap for 3 engineering teams",
    company: "ScaleUp Inc.",
    role: "Product Manager",
    impact: "medium",
    metrics: "Delivered 12 features on schedule",
    date: "2023-12-20",
    tags: ["roadmap", "team management", "delivery"]
  },
  {
    id: "story-5",
    title: "Conducted user research leading to pivot decision",
    company: "Innovation Labs",
    role: "Product Manager",
    impact: "high",
    metrics: "Avoided $500K in development costs",
    date: "2023-12-15",
    tags: ["user research", "pivot", "cost savings"]
  }
];

export default function ShowAllStories() {
  const [stories, setStories] = useState<Story[]>(mockAllStories);
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);

  // Get unique companies, roles, and tags for filtering
  const companies = [...new Set(stories.map(s => s.company))];
  const roles = [...new Set(stories.map(s => s.role))];
  const allTags = stories.flatMap(s => s.tags);
  const tags = [...new Set(allTags)];

  const sortOptions: SortOption[] = [
    // Company options - all companies from Work History
    ...companies.map(company => ({ 
      label: company, 
      value: company, 
      category: 'company' as const 
    })),
    // Role options - all roles from Work History
    ...roles.map(role => ({ 
      label: role, 
      value: role, 
      category: 'role' as const 
    })),
    // Tag options - all tags from Work History
    ...tags.map(tag => ({ 
      label: tag, 
      value: tag, 
      category: 'tag' as const 
    })),
    // Other options
    { label: 'Story', value: 'title', category: 'other' as const },
    { label: 'Impact', value: 'impact', category: 'other' as const },
    { label: 'Metrics', value: 'metrics', category: 'other' as const },
    { label: 'Date', value: 'date', category: 'other' as const }
  ];

  const handleAddNew = () => {
    setIsAddStoryModalOpen(true);
  };



  const handleEdit = (story: Story) => {
    setEditingStory(story);
    setIsViewModalOpen(false);
    setIsAddStoryModalOpen(true);
  };

  const handleDelete = (story: Story) => {
    setStories(stories.filter(s => s.id !== story.id));
  };

  const handleCopy = (story: Story) => {
    // TODO: Implement copy story functionality
    console.log("Copy story:", story.id);
  };

  const handleView = (story: Story) => {
    setViewingStory(story);
    setIsViewModalOpen(true);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "bg-success text-success-foreground";
      case "medium": return "bg-warning text-warning-foreground";
      case "low": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const renderHeader = (
    handleSort: (field: keyof Story) => void, 
    getSortIcon: (field: keyof Story) => React.ReactNode
  ) => (
    <tr>
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('title')}>
        <div className="flex items-center gap-2">
          Story
          {getSortIcon('title')}
        </div>
      </th>
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('company')}>
        <div className="flex items-center gap-2">
          Company
          {getSortIcon('company')}
        </div>
      </th>
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('role')}>
        <div className="flex items-center gap-2">
          Role
          {getSortIcon('role')}
        </div>
      </th>
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('impact')}>
        <div className="flex items-center gap-2">
          Impact
          {getSortIcon('impact')}
        </div>
      </th>
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('metrics')}>
        <div className="flex items-center gap-2">
          Metrics
          {getSortIcon('metrics')}
        </div>
      </th>
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('date')}>
        <div className="flex items-center gap-2">
          Date
          {getSortIcon('date')}
        </div>
      </th>
      <th className="text-left p-4 font-medium text-muted-foreground">Tags</th>
      <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
    </tr>
  );

  const renderRow = (story: Story, index: number) => (
    <tr key={story.id} className="border-b hover:bg-muted/50 transition-colors">
      <td className="p-4">
        <div className="max-w-xs">
          <h4 className="font-medium text-foreground line-clamp-2">{story.title}</h4>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-3 w-3" />
          {story.company}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-3 w-3" />
          {story.role}
        </div>
      </td>
      <td className="p-4">
        <Badge className={getImpactColor(story.impact)}>
          {story.impact.charAt(0).toUpperCase() + story.impact.slice(1)}
        </Badge>
      </td>
      <td className="p-4">
        <div className="max-w-xs">
          <p className="text-sm text-foreground line-clamp-2">{story.metrics}</p>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(story.date).toLocaleDateString()}
        </div>
      </td>
      <td className="p-4">
        <div className="flex flex-wrap gap-1">
          {story.tags.slice(0, 2).map((tag, tagIndex) => (
            <Badge key={tagIndex} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {story.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{story.tags.length - 2}
            </Badge>
          )}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleView(story)}
            className="hover:text-[#E32D9A] hover:border-[#E32D9A]"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(story)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopy(story)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDelete(story)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <ShowAllTemplate
        title="All Stories"
        description="View and manage all your impact stories across companies and roles"
        data={stories}
        searchPlaceholder="Search stories by title, company, role, or metrics..."
        renderHeader={renderHeader}
        renderRow={renderRow}
        onAddNew={handleAddNew}
        addNewLabel="Add Story"
        sortOptions={sortOptions}
        searchKeys={["title", "company", "role", "metrics"]}
        emptyStateMessage="No stories found. Create your first story to get started."
      />

      {/* Add Story Modal */}
      <AddStoryModal
        open={isAddStoryModalOpen}
        onOpenChange={setIsAddStoryModalOpen}
        onSave={(story) => {
          console.log("Story saved:", story);
          setIsAddStoryModalOpen(false);
        }}
        editingStory={editingStory}
        isViewAllContext={true}
        availableCompanies={companies}
        availableRoles={roles}
      />

      {/* View Story Modal - Using existing StoryCard */}
      {isViewModalOpen && viewingStory && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
          <div className="container mx-auto p-4 h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto bg-background rounded-lg shadow-lg">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Story Details</h2>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => handleEdit(viewingStory)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Story
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setIsViewModalOpen(false)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <StoryCard
                  story={{
                    id: viewingStory.id,
                    title: viewingStory.title,
                    content: viewingStory.metrics,
                    tags: viewingStory.tags || [],
                    status: 'approved',
                    timesUsed: 0,
                    lastUsed: viewingStory.date,
                    linkedLinks: []
                  }}
                  onEdit={() => handleEdit(viewingStory)}
                  onDuplicate={() => handleCopy(viewingStory)}
                  onDelete={() => handleDelete(viewingStory)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
