import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagSuggestionButton } from "@/components/ui/TagSuggestionButton";
import { 
  MoreHorizontal, 
  Tag, 
  Edit, 
  Copy, 
  Files, 
  Trash2,
  ExternalLink as ExternalLinkIcon,
  TrendingUp,
  Calendar,
  Tags
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
  onTagSuggestions?: (tags: string[]) => void;
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
  onDelete,
  onTagSuggestions
}: LinkCardProps) => {
  return (
    <Card className="shadow-soft hover:shadow-medium transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <h3 className="font-semibold text-lg">{label}</h3>
            </div>
            
            {/* Usage Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Used {timesUsed} time{timesUsed !== 1 ? 's' : ''}
              </div>
              {lastUsed && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Last used {new Date(lastUsed).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
                    {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
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

        {/* Link Content - same as Linked Content from Stories */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{label}</div>
              <div className="text-xs text-muted-foreground truncate">{url}</div>
            </div>
            <Button variant="ghost" size="sm" asChild className="ml-2">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
        
        {/* Link Tags - same styling as Role and Story tags */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Tags className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Link Tags</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.length > 0 && tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            <TagSuggestionButton
              content={`${label}: ${url}`}
              onTagsSuggested={onTagSuggestions}
              onClick={() => onTagSuggestions?.([])}
              variant="tertiary"
              size="sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
