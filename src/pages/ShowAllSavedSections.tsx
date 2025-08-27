import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, 
  Trash2, 
  Copy,
  Calendar,
  FileText,
  Star,
  MoreHorizontal,
  Eye,
  Building2,
  User
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShowAllTemplate, FilterOption } from "@/components/shared/ShowAllTemplate";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Mock data for all saved sections
const mockAllSavedSections = [
  {
    id: "section-1",
    title: "Product Manager Introduction",
    type: "intro",
    content: "I am writing to express my strong interest in the Product Manager position...",
    company: "TechCorp Inc.",
    role: "Product Manager",
    rating: 5,
    date: "2024-01-15",
    tags: ["intro", "product-management", "leadership"]
  },
  {
    id: "section-2",
    title: "Technical Leadership Experience",
    type: "experience",
    content: "In my previous role as a Senior Product Manager at InnovateTech...",
    company: "StartupXYZ",
    role: "Senior Product Manager",
    rating: 4,
    date: "2024-01-10",
    tags: ["experience", "technical", "leadership"]
  },
  {
    id: "section-3",
    title: "Customer Success Story",
    type: "achievement",
    content: "Successfully led a cross-functional team to deliver a customer-facing feature...",
    company: "Enterprise Corp",
    role: "Product Manager",
    rating: 5,
    date: "2024-01-05",
    tags: ["achievement", "customer-success", "teamwork"]
  },
  {
    id: "section-4",
    title: "Strategic Vision Closing",
    type: "closing",
    content: "I am particularly excited about this opportunity because your focus on...",
    company: "ScaleUp Inc.",
    role: "Senior Product Manager",
    rating: 4,
    date: "2023-12-20",
    tags: ["closing", "strategic", "vision"]
  },
  {
    id: "section-5",
    title: "Data-Driven Decision Making",
    type: "experience",
    content: "Implemented a data-driven approach to product development that resulted in...",
    company: "Innovation Labs",
    role: "Product Manager",
    rating: 5,
    date: "2023-12-15",
    tags: ["experience", "data", "analytics"]
  }
];

export default function ShowAllSavedSections() {
  const [sections, setSections] = useState(mockAllSavedSections);
  const [viewingSection, setViewingSection] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const filters: FilterOption[] = [
    { label: "Introduction", value: "intro", count: sections.filter(s => s.type === "intro").length },
    { label: "Experience", value: "experience", count: sections.filter(s => s.type === "experience").length },
    { label: "Achievement", value: "achievement", count: sections.filter(s => s.type === "achievement").length },
    { label: "Closing", value: "closing", count: sections.filter(s => s.type === "closing").length }
  ];

  const handleAddNew = () => {
    // TODO: Implement add new section functionality
    console.log("Add new section");
  };

  const handleEdit = (section: any) => {
    // TODO: Implement edit section functionality
    console.log("Edit section:", section.id);
  };

  const handleDelete = (section: any) => {
    setSections(sections.filter(s => s.id !== section.id));
  };

  const handleCopy = (section: any) => {
    // TODO: Implement copy section functionality
    console.log("Copy section:", section.id);
  };

  const handleView = (section: any) => {
    setViewingSection(section);
    setIsViewModalOpen(true);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "intro": return "bg-blue-100 text-blue-800";
      case "experience": return "bg-green-100 text-green-800";
      case "achievement": return "bg-purple-100 text-purple-800";
      case "closing": return "bg-orange-100 text-orange-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < rating ? "text-yellow-400 fill-current" : "text-muted-foreground"
        }`}
      />
    ));
  };

  const renderHeader = () => (
    <tr>
      <th className="text-left p-4 font-medium text-muted-foreground">Section</th>
      <th className="text-left p-4 font-medium text-muted-foreground">Company</th>
      <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
      <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
      <th className="text-left p-4 font-medium text-muted-foreground">Content Preview</th>
      <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
      <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
    </tr>
  );

  const renderRow = (section: any, index: number) => (
    <tr key={section.id} className="border-b hover:bg-muted/50 transition-colors">
      <td className="p-4">
        <div className="max-w-xs">
          <h4 className="font-medium text-foreground line-clamp-2">{section.title}</h4>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-3 w-3" />
          {section.company}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-3 w-3" />
          {section.role}
        </div>
      </td>
      <td className="p-4">
        <Badge className={getTypeColor(section.type)}>
          {section.type.charAt(0).toUpperCase() + section.type.slice(1)}
        </Badge>
      </td>
      <td className="p-4">
        <div className="max-w-xs">
          <p className="text-sm text-foreground line-clamp-2">{section.content}</p>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(section.date).toLocaleDateString()}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleView(section)}
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
              <DropdownMenuItem onClick={() => handleEdit(section)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopy(section)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDelete(section)}
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
        title="All Saved Sections"
        description="View and manage all your saved cover letter sections and templates"
        data={sections}
        searchPlaceholder="Search sections by title, company, role, or content..."
        renderHeader={renderHeader}
        renderRow={renderRow}
        onAddNew={handleAddNew}
        addNewLabel="Add Section"
        filters={filters}
        searchKeys={["title", "company", "role", "content"]}
        emptyStateMessage="No saved sections found. Create your first section to get started."
      />

      {/* View Section Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>View Saved Section</DialogTitle>
          </DialogHeader>
          {viewingSection && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">{viewingSection.title}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Company:</span>
                    <p>{viewingSection.company}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Role:</span>
                    <p>{viewingSection.role}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Type:</span>
                    <Badge className={getTypeColor(viewingSection.type)}>
                      {viewingSection.type.charAt(0).toUpperCase() + viewingSection.type.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Date:</span>
                    <p>{new Date(viewingSection.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-muted-foreground mb-2">Content</h4>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{viewingSection.content}</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setIsViewModalOpen(false);
                  handleEdit(viewingSection);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Section
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
