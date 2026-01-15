import { ContentCard } from "@/components/shared/ContentCard";
import { OutcomeMetrics } from "@/components/work-history/OutcomeMetrics";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useState, useMemo } from "react";
import { 
  Layers, 
  Link as LinkIcon,
  ExternalLink as ExternalLinkIcon,
  Tags,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Trash2
} from "lucide-react";
import type { WorkHistoryBlurb, ExternalLink } from "@/types/workHistory";
import { cn } from "@/lib/utils";
import { generateGapSummary } from "@/utils/gapSummaryGenerator";

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
  onDeleteVariation?: (storyId: string, variationId: string) => void;
  onTagSuggestions?: (tags: string[]) => void;
  className?: string;
  isGapResolved?: boolean;
  hasGaps?: boolean;
  gaps?: Array<{ id: string; description: string }>; // Actual gap objects (supports single or list)
  onGenerateContent?: () => void;
  onDismissGap?: () => void; // Callback for gap dismissal
}

export const StoryCard = ({ 
  story, 
  linkedLinks = [],
  onEdit, 
  onDuplicate, 
  onDelete,
  onDeleteVariation,
  onTagSuggestions,
  className,
  isGapResolved = false,
  hasGaps = false,
  gaps,
  onGenerateContent,
  onDismissGap
}: StoryCardProps) => {
  const [expandedVariations, setExpandedVariations] = useState<Record<string, boolean>>({});

  // Use provided gaps, or fallback to story.gaps, or create default gap
  const storyGaps = gaps || (story as any).gaps || (hasGaps ? [{
    id: `story-gap-${story.id}`,
    description: "Story needs more specific examples and quantifiable results."
  }] : []);

  // Generate gapSummary from gap categories
  const gapSummary = useMemo(() => {
    if (!hasGaps || storyGaps.length === 0) return null;
    
    // Extract gap categories from gaps (they may have gap_category property)
    const gapCategories = storyGaps
      .map(gap => (gap as any).gap_category)
      .filter(Boolean) as string[];
    
    // If no categories, try to infer from description or use default
    if (gapCategories.length === 0) {
      // Check if gaps have standard categories
      const allCategories = storyGaps.map(g => {
        const desc = g.description?.toLowerCase() || '';
        if (desc.includes('structure') || desc.includes('star')) return 'incomplete_story';
        if (desc.includes('metric')) return 'missing_metrics';
        if (desc.includes('generic') || desc.includes('specific')) return 'story_needs_specifics';
        return null;
      }).filter(Boolean) as string[];
      
      if (allCategories.length > 0) {
        return generateGapSummary(allCategories, 'story');
      }
      
      // Default summary if we can't determine categories
      return 'Story needs improvement';
    }
    
    return generateGapSummary(gapCategories, 'story');
  }, [hasGaps, storyGaps]);

  return (
    <ContentCard
      title={story.title}
      content={story.content}
      tags={story.tags}
      timesUsed={story.timesUsed}
      lastUsed={story.lastUsed}
      hasGaps={hasGaps}
      gaps={storyGaps}
      gapSummary={gapSummary}
      isGapResolved={isGapResolved}
      onGenerateContent={onGenerateContent}
      onDismissGap={onDismissGap}
      onEdit={onEdit ? () => onEdit(story) : undefined}
      onDuplicate={onDuplicate ? () => onDuplicate(story) : undefined}
      onDelete={onDelete ? () => onDelete(story) : undefined}
      onTagSuggestions={onTagSuggestions}
      className={className}
      tagsLabel="Story Tags"
    >
      {/* Story-specific sections: Outcome Metrics, Links, Variations */}
      
      {/* Outcome Metrics */}
      <OutcomeMetrics
        metrics={story.outcomeMetrics}
        className="mb-6"
        showHeading={true}
      />

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
              const variations = story.variations ?? [];
              const allExpanded =
                variations.length > 0 &&
                variations.every(variation => expandedVariations[variation.id]);
              const nextState: Record<string, boolean> = {};
              variations.forEach(variation => {
                nextState[variation.id] = !allExpanded;
              });
              setExpandedVariations(nextState);
            }}
          >
            <Layers className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm font-medium group-hover:text-primary transition-colors">
              Variations ({story.variations.length})
            </span>
            {story.variations.every(variation => expandedVariations[variation.id]) ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
            )}
          </div>

          {/* Variations content - only show when expanded */}
          {story.variations.some(variation => expandedVariations[variation.id]) && (
            <div className="space-y-2">
              {story.variations.map((variation, index) => (
                <div key={variation.id} className="p-3 bg-muted/30 rounded-lg border-l-4 border-primary">
                  {/* Header */}
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground mb-1">
                        {variation.filledGap
                          ? `Fills Gap: ${variation.filledGap}`
                          : variation.developedForJobTitle
                          ? `For ${variation.developedForJobTitle}`
                          : `Variant #${index + 1}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(variation.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {onDeleteVariation && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onDeleteVariation(story.id, variation.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
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
                        {variation.tags.map(tag => (
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
    </ContentCard>
  );
};
