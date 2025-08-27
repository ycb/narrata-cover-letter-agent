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
  Eye
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShowAllTemplate, FilterOption } from "@/components/shared/ShowAllTemplate";
import { Story } from "@/types/workHistory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    tags: ["leadership", "mvp", "user-engagement"]
  },
  {
    id: "story-2",
    title: "Optimized customer onboarding flow reducing drop-off by 30%",
    company: "StartupXYZ",
    role: "Product Manager",
    impact: "medium",
    metrics: "Reduced onboarding time from 15 to 10 minutes",
    date: "2024-01-10",
    tags: ["optimization", "customer-experience", "onboarding"]
  },
  {
    id: "story-3",
    title: "Launched new feature driving $2M in additional revenue",
    company: "Enterprise Corp",
    role: "Senior Product Manager",
    impact: "high",
    metrics: "Generated $2M in first quarter",
    date: "2024-01-05",
    tags: ["revenue", "launch", "feature-development"]
  },
  {
    id: "story-4",
    title: "Managed product roadmap for 3 engineering teams",
    company: "ScaleUp Inc.",
    role: "Product Manager",
    impact: "medium",
    metrics: "Delivered 12 features on schedule",
    date: "2023-12-20",
    tags: ["roadmap", "team-management", "delivery"]
  },
  {
    id: "story-5",
    title: "Conducted user research leading to pivot decision",
    company: "Innovation Labs",
    role: "Product Manager",
    impact: "high",
    metrics: "Avoided $500K in development costs",
    date: "2023-12-15",
    tags: ["user-research", "pivot", "cost-savings"]
  }
];

export default function ShowAllStories() {
  const [stories, setStories] = useState<Story[]>(mockAllStories);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Get unique companies, roles, and tags for filtering
  const companies = [...new Set(stories.map(s => s.company))];
  const roles = [...new Set(stories.map(s => s.role))];
  const allTags = stories.flatMap(s => s.tags);
  const tags = [...new Set(allTags)];

  const filters: FilterOption[] = [
    { label: "High Impact", value: "high", count: stories.filter(s => s.impact === "high").length },
    { label: "Medium Impact", value: "medium", count: stories.filter(s => s.impact === "medium").length },
    { label: "Low Impact", value: "low", count: stories.filter(s => s.impact === "low").length },
    ...companies.map(company => ({ 
      label: company, 
      value: `company-${company}`, 
      count: stories.filter(s => s.company === company).length 
    })),
    ...roles.map(role => ({ 
      label: role, 
      value: `role-${role}`, 
      count: stories.filter(s => s.role === role).length 
    })),
    ...tags.map(tag => ({ 
      label: tag, 
      value: `tag-${tag}`, 
      count: stories.filter(s => s.tags.includes(tag)).length 
    }))
  ];

  const handleAddNew = () => {
    // TODO: Implement add new story functionality
    console.log("Add new story");
  };

  const handleFilterChange = (filter: string) => {
    // TODO: Implement filter logic
    console.log("Filter changed to:", filter);
  };

  const handleEdit = (story: Story) => {
    // TODO: Implement edit story functionality
    console.log("Edit story:", story.id);
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

  const renderHeader = () => (
    <tr>
      <th className="text-left p-4 font-medium text-muted-foreground">Story</th>
      <th className="text-left p-4 font-medium text-muted-foreground">Company</th>
      <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
      <th className="text-left p-4 font-medium text-muted-foreground">Impact</th>
      <th className="text-left p-4 font-medium text-muted-foreground">Metrics</th>
      <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
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
        filters={filters}
        onFilterChange={handleFilterChange}
        searchKeys={["title", "company", "role", "metrics"]}
        emptyStateMessage="No stories found. Create your first story to get started."
      />

      {/* View Story Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>View Story</DialogTitle>
          </DialogHeader>
          {viewingStory && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">{viewingStory.title}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Company:</span>
                    <p>{viewingStory.company}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Role:</span>
                    <p>{viewingStory.role}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Impact:</span>
                    <Badge className={getImpactColor(viewingStory.impact)}>
                      {viewingStory.impact.charAt(0).toUpperCase() + viewingStory.impact.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Date:</span>
                    <p>{new Date(viewingStory.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-muted-foreground mb-2">Metrics & Impact</h4>
                <p className="text-sm">{viewingStory.metrics}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-muted-foreground mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {viewingStory.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setIsViewModalOpen(false);
                  handleEdit(viewingStory);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Story
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
