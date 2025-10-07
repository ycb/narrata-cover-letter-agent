import { useState, useEffect, useCallback } from "react";
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
  X,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShowAllTemplate, FilterOption, SortOption } from "@/components/shared/ShowAllTemplate";
import { AddLinkModal } from "@/components/work-history/AddLinkModal";
import { LinkCard } from "@/components/work-history/LinkCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";

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
  const { user } = useAuth();
  const [links, setLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [viewingLink, setViewingLink] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);

  // Fetch links from database
  const fetchLinks = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch external links with work item and company info
      const { data: externalLinks, error: linksError } = await supabase
        .from('external_links')
        .select(`
          *,
          work_item:work_items!work_item_id (
            title,
            company:companies!company_id (
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (linksError) throw linksError;

      // Transform to link format
      const transformedLinks = (externalLinks || []).map((link: any) => {
        const workItem = link.work_item || {};
        const company = workItem.company || {};
        
        return {
          id: link.id,
          title: link.label,
          url: link.url,
          company: company.name || 'Unknown Company',
          role: workItem.title || 'Unknown Role',
          type: 'other', // Default type
          date: link.created_at,
          description: link.label,
          tags: link.tags || [],
          timesUsed: link.times_used || 0
        };
      });

      setLinks(transformedLinks);
    } catch (err) {
      console.error('Error fetching links:', err);
      setError(err instanceof Error ? err.message : 'Failed to load links');
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Get unique values for filtering
  const companies = [...new Set(links.map(l => l.company))];
  const roles = [...new Set(links.map(l => l.role))];
  const types = [...new Set(links.map(l => l.type))];
  const allTags = links.flatMap(l => l.tags || []);
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
    { label: 'Link', value: 'title', category: 'other' as const },
    { label: 'Type', value: 'type', category: 'other' as const },
    { label: 'Description', value: 'description', category: 'other' as const },
    { label: 'Date', value: 'date', category: 'other' as const }
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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your links...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-destructive font-medium">Error loading links</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchLinks}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

        sortOptions={sortOptions}
        searchKeys={["title", "company", "role", "description"]}
        emptyStateMessage="No external links found. Add your first link to get started."
      />

      {/* Add Link Modal */}
      <AddLinkModal
        open={isAddLinkModalOpen}
        onOpenChange={setIsAddLinkModalOpen}
        onSave={(link) => {
          console.log("Link saved:", link);
          setIsAddLinkModalOpen(false);
        }}
        editingLink={editingLink}
        isViewAllContext={true}
        availableCompanies={companies}
        availableRoles={roles}
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
