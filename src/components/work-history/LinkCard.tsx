import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Tag, 
  Edit, 
  Copy, 
  Files, 
  Trash2,
  ExternalLink as ExternalLinkIcon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ExternalLink } from "@/types/workHistory";

interface LinkCardProps {
  id: string;
  label: string;
  url: string;
  tags: string[];
  timesUsed?: number;
  lastUsed?: string;
  onEdit?: (id: string) => void;
  onCopy?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const LinkCard = ({ 
  id,
  label, 
  url, 
  tags, 
  timesUsed = 0,
  lastUsed,
  onEdit,
  onCopy,
  onDuplicate,
  onDelete
}: LinkCardProps) => {
  return (
    <Card className="shadow-soft hover:shadow-medium transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg">{label}</h3>
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
        {/* URL */}
        <div className="mb-4">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
          >
            {url}
            <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </div>
        
        {/* Tags section with icon-as-label pattern */}
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
        
        {/* Metadata section with divider */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Used {timesUsed} times</span>
            {lastUsed && <span>Last used {lastUsed}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
