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
  User,
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
import { StoryCard } from "@/components/work-history/StoryCard";
import { TemplateBlurbDetail } from "@/components/template-blurbs/TemplateBlurbDetail";

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
    tags: ["intro", "product management", "leadership"]
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
    tags: ["achievement", "customer success", "teamwork"]
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
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [viewingSection, setViewingSection] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);

  // Get unique values for filtering
  const companies = [...new Set(sections.map(s => s.company))];
  const roles = [...new Set(sections.map(s => s.role))];
  const types = [...new Set(sections.map(s => s.type))];
  const tags = [...new Set(sections.flatMap(s => s.tags))];

  const sortOptions: SortOption[] = [
    // Section types
    ...types.map(type => ({ 
      label: type.charAt(0).toUpperCase() + type.slice(1), 
      value: type, 
      category: 'section-type' as const 
    })),
    // Tag options
    ...tags.map(tag => ({ 
      label: tag, 
      value: tag, 
      category: 'tag' as const 
    }))
  ];

  const handleAddNew = () => {
    setIsAddSectionModalOpen(true);
  };

  const handleEdit = (section: any) => {
    setEditingSection(section);
    setIsViewModalOpen(false);
    setIsAddSectionModalOpen(true);
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

  const renderHeader = (
    handleSort: (field: keyof any) => void, 
    getSortIcon: (field: keyof any) => React.ReactNode
  ) => (
    <tr>
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('title')}>
        <div className="flex items-center gap-2">
          Section
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
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('type')}>
        <div className="flex items-center gap-2">
          Type
          {getSortIcon('type')}
        </div>
      </th>
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('content')}>
        <div className="flex items-center gap-2">
          Content Preview
          {getSortIcon('content')}
        </div>
      </th>
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('date')}>
        <div className="flex items-center gap-2">
          Date
          {getSortIcon('date')}
        </div>
      </th>
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
        sortOptions={sortOptions}
        searchKeys={["title", "company", "role", "content"]}
        emptyStateMessage="No saved sections found. Create your first section to get started."
      />

      {/* Edit Section Modal */}
      {isAddSectionModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
          <div className="container mx-auto p-4 h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto bg-background rounded-lg shadow-lg">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">
                    {editingSection ? 'Edit Saved Section' : 'Add New Section'}
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setIsAddSectionModalOpen(false);
                      setEditingSection(null);
                    }}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <TemplateBlurbDetail
                  blurb={editingSection ? {
                    id: editingSection.id,
                    title: editingSection.title,
                    content: editingSection.content,
                    type: editingSection.type,
                    tags: editingSection.tags || [],
                    isDefault: false,
                    createdAt: editingSection.date,
                    updatedAt: editingSection.date
                  } : undefined}
                  isEditing={!!editingSection}
                  onSave={(section) => {
                    console.log("Section saved:", section);
                    setIsAddSectionModalOpen(false);
                    setEditingSection(null);
                  }}
                  onCancel={() => {
                    setIsAddSectionModalOpen(false);
                    setEditingSection(null);
                  }}
                  type={editingSection?.type}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Section Modal - Using existing StoryCard */}
      {isViewModalOpen && viewingSection && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
          <div className="container mx-auto p-4 h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto bg-background rounded-lg shadow-lg">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Section Details</h2>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => handleEdit(viewingSection)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Section
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
                    id: viewingSection.id,
                    title: viewingSection.title,
                    content: viewingSection.content,
                    tags: viewingSection.tags || [],
                    status: 'approved',
                    timesUsed: 0,
                    lastUsed: viewingSection.date,
                    linkedLinks: []
                  }}
                  onEdit={() => handleEdit(viewingSection)}
                  onDuplicate={() => handleCopy(viewingSection)}
                  onDelete={() => handleDelete(viewingSection)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
