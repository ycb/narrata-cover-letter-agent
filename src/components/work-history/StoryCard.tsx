import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OutcomeMetrics } from "@/components/work-history/OutcomeMetrics";
import { 
  FileText, 
  Target, 
  Calendar, 
  Edit, 
  Copy, 
  MoreHorizontal,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Link as LinkIcon,
  ExternalLink as ExternalLinkIcon,
  Tags
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkHistoryBlurb, ExternalLink } from "@/types/workHistory";
import { cn } from "@/lib/utils";

interface StoryCardProps {
  story: WorkHistoryBlurb;
  linkedLinks?: ExternalLink[]; // Pass linked links from parent
  onEdit?: (story: WorkHistoryBlurb) => void;
  onDuplicate?: (story: WorkHistoryBlurb) => void;
  onDelete?: (story: WorkHistoryBlurb) => void;
  className?: string;
}

export const StoryCard = ({ 
  story, 
  linkedLinks = [],
  onEdit, 
  onDuplicate, 
  onDelete,
  className 
}: StoryCardProps) => {
  const getStatusIcon = () => {
    switch (story.status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'draft':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'needs-review':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  const getSourceColor = () => {
    switch (story.source) {
      case 'resume':
        return 'bg-blue-100 text-blue-800';
      case 'manual':
        return 'bg-green-100 text-green-800';
      case 'llm-suggested':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = () => {
    switch (story.confidence) {
      case 'high':
        return 'bg-success text-success-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <CardTitle className="text-lg truncate">{story.title}</CardTitle>
            </div>
            
            {/* Usage Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Used {story.timesUsed} time{story.timesUsed !== 1 ? 's' : ''}
              </div>
              {story.lastUsed && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Last used {new Date(story.lastUsed).toLocaleDateString()}
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
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(story)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Story
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(story)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate Story
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(story)}
                  className="text-destructive"
                >
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  Delete Story
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Story Content */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {story.content}
          </p>
        </div>

        {/* Outcome Metrics */}
        <OutcomeMetrics
          metrics={story.outcomeMetrics}
          className="mb-6"
        />

        {/* Tags */}
        {story.tags.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Tags className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Story Tags</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {story.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Variations */}
        {story.variations && story.variations.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Variations</span>
              <Badge variant="outline" className="text-xs">
                {story.variations.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {story.variations.map((variation, index) => (
                <div key={variation.id} className="p-3 bg-muted/30 rounded-lg border-l-4 border-primary">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground mb-1">
                        {variation.filledGap ? `Fills Gap: ${variation.filledGap}` : 
                         variation.developedForJobTitle ? `For ${variation.developedForJobTitle}` : 
                         `Variant #${index + 1} (${variation.createdBy === 'AI' ? 'AI' : 'User'})`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {variation.createdBy === 'AI' ? 'AI Generated' : 'User Created'} • {new Date(variation.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {variation.createdBy === 'AI' ? 'AI' : 'User'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {variation.content}
                  </p>
                  {variation.tags && variation.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {variation.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {variation.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{variation.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link Details - Bottom Right */}
        {linkedLinks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-muted">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Linked Content</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {linkedLinks.length} link{linkedLinks.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="mt-2 space-y-2">
              {linkedLinks.slice(0, 2).map((link) => (
                <div key={link.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{link.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{link.url}</div>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="ml-2">
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLinkIcon className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              ))}
              {linkedLinks.length > 2 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  +{linkedLinks.length - 2} more links
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
