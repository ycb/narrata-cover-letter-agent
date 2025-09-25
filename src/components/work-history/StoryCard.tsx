import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OutcomeMetrics } from "@/components/work-history/OutcomeMetrics";
import { useState } from "react";
import { 
  FileText, 
  Layers, 
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
  Tags,
  ChevronUp,
  ChevronDown
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

// Function to highlight changes between original story and variation
const highlightChanges = (originalContent: string, variationContent: string): React.ReactNode[] => {
  // Simple word-level diff highlighting
  const originalWords = originalContent.split(' ');
  const variationWords = variationContent.split(' ');
  
  const highlightedContent: React.ReactNode[] = [];
  let i = 0, j = 0;
  
  while (i < originalWords.length || j < variationWords.length) {
    if (i < originalWords.length && j < variationWords.length && originalWords[i] === variationWords[j]) {
      // Same word, no highlighting
      highlightedContent.push(originalWords[i] + ' ');
      i++;
      j++;
    } else if (j < variationWords.length) {
      // New word in variation - highlight as addition
      highlightedContent.push(
        <span key={`add-${j}`} className="bg-green-100 text-green-800 px-1 rounded">
          {variationWords[j]}
        </span>
      );
      highlightedContent.push(' ');
      j++;
    } else if (i < originalWords.length) {
      // Word removed from original - highlight as deletion
      highlightedContent.push(
        <span key={`del-${i}`} className="bg-red-100 text-red-800 px-1 rounded line-through">
          {originalWords[i]}
        </span>
      );
      highlightedContent.push(' ');
      i++;
    }
  }
  
  return highlightedContent;
};

interface StoryCardProps {
  story: WorkHistoryBlurb;
  linkedLinks?: ExternalLink[]; // Pass linked links from parent
  onEdit?: (story: WorkHistoryBlurb) => void;
  onDuplicate?: (story: WorkHistoryBlurb) => void;
  onDelete?: (story: WorkHistoryBlurb) => void;
  className?: string;
  isGapResolved?: boolean;
}

export const StoryCard = ({ 
  story, 
  linkedLinks = [],
  onEdit, 
  onDuplicate, 
  onDelete, 
  className,
  isGapResolved = false
}: StoryCardProps) => {
  const [expandedVariations, setExpandedVariations] = useState<Record<string, boolean>>({});
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
    <Card className={cn(
      "hover:shadow-md transition-shadow", 
      (story as any).hasGaps && !isGapResolved && "border-warning bg-warning/5",
      className
    )}>
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

        {/* Link Details - Above Variations */}
        {linkedLinks.length > 0 && (
          <div className="mb-6 pt-4 border-t border-muted">
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
                      <ExternalLinkIcon className="h-4 w-4" />
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

        {/* Variations */}
        {story.variations && story.variations.length > 0 && (
          <div className="mb-6 pt-4 border-t border-muted">
            <div 
              className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-muted/30 rounded-lg p-2 transition-colors group"
              onClick={() => {
                // Toggle all variations to expanded state
                const allExpanded = Object.values(expandedVariations).every(Boolean);
                const newState: Record<string, boolean> = {};
                story.variations?.forEach(variation => {
                  newState[variation.id] = !allExpanded;
                });
                setExpandedVariations(newState);
              }}
            >
              <Layers className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium group-hover:text-primary transition-colors">
                Variations ({story.variations.length})
              </span>
              {Object.values(expandedVariations).every(Boolean) ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
              )}
            </div>
            
            {/* Variations content - only show when expanded */}
            {Object.values(expandedVariations).some(Boolean) && (
              <div className="space-y-2">
                {story.variations.map((variation, index) => (
                  <div key={variation.id} className="p-3 bg-muted/30 rounded-lg border-l-4 border-primary">
                    {/* Header */}
                    <div className="mb-3">
                      <div className="text-sm font-medium text-foreground mb-1">
                        {variation.filledGap ? `Fills Gap: ${variation.filledGap}` : 
                         variation.developedForJobTitle ? `For ${variation.developedForJobTitle}` : 
                         `Variant #${index + 1}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(variation.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {/* Content area */}
                    <div className="text-sm text-muted-foreground mb-3">
                      {highlightChanges(story.content, variation.content)}
                    </div>
                    {variation.tags && variation.tags.length > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Tags className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Gap Tags</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {variation.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


      </CardContent>
    </Card>
  );
};
