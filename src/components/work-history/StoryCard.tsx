import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkHistoryBlurb } from "@/types/workHistory";
import { cn } from "@/lib/utils";

interface StoryCardProps {
  story: WorkHistoryBlurb;
  onEdit?: (story: WorkHistoryBlurb) => void;
  onDuplicate?: (story: WorkHistoryBlurb) => void;
  onDelete?: (story: WorkHistoryBlurb) => void;
  className?: string;
}

export const StoryCard = ({ 
  story, 
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
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg truncate">{story.title}</CardTitle>
              {getStatusIcon()}
            </div>
            
            {/* Source and Confidence Badges */}
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={getSourceColor()}>
                {story.source}
              </Badge>
              <Badge variant="outline" className={getConfidenceColor()}>
                {story.confidence} confidence
              </Badge>
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
        <div className="mb-4">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {story.content}
          </p>
        </div>

        {/* Outcome Metrics */}
        {story.outcomeMetrics && (
          <div className="mb-4 p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Outcome Metrics</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {story.outcomeMetrics}
            </p>
          </div>
        )}

        {/* Tags */}
        {story.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {story.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
