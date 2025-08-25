import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Link, 
  Tag, 
  Edit, 
  Copy, 
  Files, 
  Trash2 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BlurbCardProps {
  id: string;
  title: string;
  content: string;
  status: 'approved' | 'draft' | 'needs-review';
  confidence: 'high' | 'medium' | 'low';
  tags: string[];
  lastUsed?: string;
  timesUsed: number;
  linkedExternalLinks?: string[];
  externalLinks?: Array<{id: string; label: string; url: string}>;
  onEdit?: (id: string) => void;
  onCopy?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const BlurbCard = ({ 
  id,
  title, 
  content, 
  status, 
  confidence, 
  tags, 
  lastUsed, 
  timesUsed,
  linkedExternalLinks = [],
  externalLinks = [],
  onEdit,
  onCopy,
  onDuplicate,
  onDelete
}: BlurbCardProps) => {
  const confidenceColors = {
    high: 'bg-confidence-high',
    medium: 'bg-confidence-medium', 
    low: 'bg-confidence-low'
  };

  const renderContentWithLinks = (content: string, linkIds: string[], availableLinks: Array<{id: string; label: string; url: string}>) => {
    if (linkIds.length === 0) return content;
    
    // Find the primary linked external link for company/role reference
    const primaryLink = linkIds.length > 0 ? availableLinks.find(l => l.id === linkIds[0]) : null;
    
    if (!primaryLink) return content;
    
    // Replace [CompanyName] or [RoleName] patterns with clickable links
    const linkPattern = /\[([^\]]+)\]/g;
    const parts = content.split(linkPattern);
    
    return parts.map((part, index) => {
      // If this is an odd index, it's the content inside brackets
      if (index % 2 === 1) {
        return (
          <a
            key={index}
            href={primaryLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <Card className="shadow-soft hover:shadow-medium transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg">{title}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCopy?.(id)}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(id)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate?.(id)}>
                <Files className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete?.(id)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="text-muted-foreground mb-4 line-clamp-3">
          {renderContentWithLinks(content, linkedExternalLinks, externalLinks)}
        </div>
        
        {linkedExternalLinks.length > 0 && (
          <div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 shrink-0">
                <Link className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">External Link</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {externalLinks.find(link => link.id === linkedExternalLinks[0])?.label}
              </Badge>
            </div>
          </div>
        )}
        
        {tags.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 shrink-0">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Tags</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="border-t pt-3 mb-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Used {timesUsed} times</span>
            {lastUsed && <span>Last used {lastUsed}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};