import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, 
  Trash2, 
  Copy,
  ExternalLink,
  Calendar,
  Building2,
  User,
  MoreHorizontal,
  LinkIcon,
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
import { ShowAllTemplate, FilterOption, ColumnConfig } from "@/components/shared/ShowAllTemplate";
import { AddLinkModal } from "@/components/work-history/AddLinkModal";
import { LinkCard } from "@/components/work-history/LinkCard";

// Mock data for all external links
const mockAllLinks = [
  {
    id: "link-1",
    title: "Product Launch Case Study",
    url: "https://example.com/case-study",
    company: "TechCorp Inc.",
    role: "Senior Product Manager",
    type: "case-study",
    date: "2024-01-15",
    description: "Detailed analysis of successful product launch"
  },
  {
    id: "link-2",
    title: "User Research Report",
    url: "https://example.com/research",
    company: "StartupXYZ",
    role: "Product Manager",
    type: "research",
    date: "2024-01-10",
    description: "Comprehensive user research findings"
  },
  {
    id: "link-3",
    title: "Portfolio Website",
    url: "https://example.com/portfolio",
    company: "Enterprise Corp",
    role: "Senior Product Manager",
    type: "portfolio",
    date: "2024-01-05",
    description: "Personal portfolio showcasing work"
  },
  {
    id: "link-4",
    title: "Technical Documentation",
    url: "https://example.com/docs",
    company: "ScaleUp Inc.",
    role: "Product Manager",
    type: "documentation",
    date: "2023-12-20",
    description: "Technical specifications and API docs"
  },
  {
    id: "link-5",
    title: "Conference Presentation",
    url: "https://example.com/presentation",
    company: "Innovation Labs",
    role: "Product Manager",
    type: "presentation",
    date: "2023-12-15",
    description: "Slides from industry conference talk"
  }
];

export default function ShowAllLinks() {
  const [links, setLinks] = useState(mockAllLinks);
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [viewingLink, setViewingLink] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);

  // Get unique values for filtering
  const companies = [...new Set(links.map(l => l.company))];
  const roles = [...new Set(links.map(l => l.role))];
  const types = [...new Set(links.map(l => l.type))];

  const filters: FilterOption[] = [
    ...types.map(type => ({ 
      label: type.charAt(0).toUpperCase() + type.slice(1), 
      value: type, 
      count: links.filter(l => l.type === type).length 
    })),
    ...companies.map(company => ({ 
      label: company, 
      value: `company-${company}`, 
      count: links.filter(l => l.company === company).length 
    })),
    ...roles.map(role => ({ 
      label: role, 
      value: `role-${role}`, 
      count: links.filter(l => l.role === role).length 
    }))
  ];

  const columns: ColumnConfig[] = [
    { key: 'title', label: 'Link', minWidth: 200, defaultWidth: 300, sortable: true },
    { key: 'company', label: 'Company', minWidth: 120, defaultWidth: 150, sortable: true },
    { key: 'role', label: 'Role', minWidth: 120, defaultWidth: 150, sortable: true },
    { key: 'type', label: 'Type', minWidth: 100, defaultWidth: 120, sortable: true },
    { key: 'description', label: 'Description', minWidth: 200, defaultWidth: 300, sortable: true },
    { key: 'date', label: 'Date', minWidth: 100, defaultWidth: 120, sortable: true },
    { key: 'actions', label: 'Actions', minWidth: 120, defaultWidth: 150, sortable: false }
  ];

  const handleAddNew = () => {
    setIsAddLinkModalOpen(true);
  };

  const handleEdit = (link: any) => {
    setEditingLink(link);
    setIsViewModalOpen(false);
    setIsAddLinkModalOpen(true);
  };

  const handleDelete = (link: any) => {
    setLinks(links.filter(l => l.id !== link.id));
  };

  const handleCopy = (link: any) => {
    // TODO: Implement copy link functionality
    console.log("Copy link:", link.id);
  };



  const handleView = (link: any) => {
    setViewingLink(link);
    setIsViewModalOpen(true);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "case-study": return "bg-blue-100 text-blue-800";
      case "research": return "bg-green-100 text-green-800";
      case "portfolio": return "bg-purple-100 text-purple-800";
      case "documentation": return "bg-orange-100 text-orange-800";
      case "presentation": return "bg-pink-100 text-pink-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const renderHeader = (
    handleSort: (field: keyof any) => void, 
    getSortIcon: (field: keyof any) => React.ReactNode
  ) => (
    <tr>
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('title')}>
        <div className="flex items-center gap-2">
          Link
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
      <th className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('description')}>
        <div className="flex items-center gap-2">
          Description
          {getSortIcon('description')}
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

  const renderRow = (link: any, index: number) => (
    <tr key={link.id} className="border-b hover:bg-muted/50 transition-colors">
      <td className="p-4">
        <div className="max-w-xs">
          <h4 className="font-medium text-foreground line-clamp-2">{link.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <LinkIcon className="h-3 w-3 text-muted-foreground" />
            <a 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline truncate"
            >
              {link.url}
            </a>
          </div>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-3 w-3" />
          {link.company}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-3 w-3" />
          {link.role}
        </div>
      </td>
      <td className="p-4">
        <Badge className={getTypeColor(link.type)}>
          {link.type.charAt(0).toUpperCase() + link.type.slice(1)}
        </Badge>
      </td>
      <td className="p-4">
        <div className="max-w-xs">
          <p className="text-sm text-foreground line-clamp-2">{link.description}</p>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(link.date).toLocaleDateString()}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleView(link)}
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
              <DropdownMenuItem onClick={() => handleEdit(link)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopy(link)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDelete(link)}
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
        title="All External Links"
        description="View and manage all your external links and references across companies and roles"
        data={links}
        searchPlaceholder="Search links by title, company, role, or description..."
        renderHeader={renderHeader}
        renderRow={renderRow}
        onAddNew={handleAddNew}
        addNewLabel="Add Link"
        filters={filters}
        columns={columns}
        searchKeys={["title", "company", "role", "description"]}
        emptyStateMessage="No external links found. Add your first link to get started."
      />

      {/* Add Link Modal */}
      <AddLinkModal
        open={isAddLinkModalOpen}
        onOpenChange={setIsAddLinkModalOpen}
        roleId="default"
        onSave={(link) => {
          console.log("Link saved:", link);
          setIsAddLinkModalOpen(false);
        }}
        editingLink={editingLink}
      />

      {/* View Link Modal - Using existing LinkCard */}
      {isViewModalOpen && viewingLink && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
          <div className="container mx-auto p-4 h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto bg-background rounded-lg shadow-lg">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Link Details</h2>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => handleEdit(viewingLink)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Link
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
                <LinkCard
                  id={viewingLink.id}
                  label={viewingLink.title}
                  url={viewingLink.url}
                  tags={viewingLink.tags || []}
                  timesUsed={viewingLink.timesUsed || 0}
                  lastUsed={viewingLink.date}
                  onEdit={() => handleEdit(viewingLink)}
                  onCopy={() => handleCopy(viewingLink)}
                  onDuplicate={() => handleCopy(viewingLink)}
                  onDelete={() => handleDelete(viewingLink)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
