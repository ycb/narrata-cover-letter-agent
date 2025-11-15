import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagSuggestionButton } from "@/components/ui/TagSuggestionButton";
import { ContentGapBanner } from "@/components/shared/ContentGapBanner";
import { RequirementTagTooltip } from "@/components/cover-letters/RequirementTagTooltip";
import { 
  Calendar,
  MoreHorizontal,
  Edit,
  Copy,
  TrendingUp,
  Tags,
  Trash2,
  Plus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { RequirementTag } from "@/types/coverLetters";

interface ContentCardProps {
  title: string;
  content?: string; // Made optional to support empty state
  tags?: (string | RequirementTag)[]; // Support both simple strings and structured tags
  timesUsed?: number;
  lastUsed?: string;
  hasGaps?: boolean;
  gaps?: Array<{ id: string; description: string }>;
  isGapResolved?: boolean;
  onGenerateContent?: () => void;
  onDismissGap?: () => void; // Callback for gap dismissal
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onTagSuggestions?: (tags: string[]) => void;
  className?: string;
  tagsLabel?: string; // "Story Tags" vs "Content Tags"
  showUsage?: boolean; // Show "Used X times" (default true)
  children?: React.ReactNode; // Additional content sections (metrics, links, variations, etc.) - renders between tags and gap banner
  renderChildrenBeforeTags?: boolean; // If true, render children before tags (for cover letter inline editing)
}

/**
 * Unified Content Card Component
 * Used for Stories, Saved Sections, and Cover Letter Drafts
 * 
 * Structure:
 * - Title | Overflow menu
 * - [📈] Used X times (conditional)
 * - Content (read-only paragraph)
 * - Tags: [list] + Auto-suggest CTA
 * - If gap: Gap banner at bottom
 */
export const ContentCard = ({
  title,
  content,
  tags = [],
  timesUsed = 0,
  onDismissGap,
  lastUsed,
  hasGaps = false,
  gaps = [],
  isGapResolved = false,
  onGenerateContent,
  onEdit,
  onDuplicate,
  onDelete,
  onTagSuggestions,
  className,
  tagsLabel = "Tags",
  showUsage = true,
  children,
  renderChildrenBeforeTags = false
}: ContentCardProps) => {
  // Helper to check if a tag is structured
  const isStructuredTag = (tag: string | RequirementTag): tag is RequirementTag => {
    return typeof tag === 'object' && 'id' in tag && 'type' in tag;
  };

  // Helper to get badge variant based on tag type
  const getTagVariant = (tag: RequirementTag): "default" | "secondary" => {
    return tag.type === 'core' ? 'default' : 'secondary';
  };

  // Helper to get badge className based on tag type
  const getTagClassName = (tag: RequirementTag): string => {
    if (tag.type === 'core') {
      return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
    } else {
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
    }
  };

  // Helper to get tag label
  const getTagLabel = (tag: RequirementTag): string => {
    return tag.label;
  };

  return (
    <Card className={cn(
      "hover:shadow-md transition-shadow",
      hasGaps && !isGapResolved && "border-warning",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <CardTitle className="text-lg truncate">{title}</CardTitle>
            </div>
            
            {/* Usage Stats */}
            {showUsage && (
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
            )}
          </div>

          {/* Overflow Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {(onEdit || onDuplicate) && onDelete && <DropdownMenuSeparator />}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
              {!onEdit && !onDuplicate && !onDelete && (
                <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Primary content preview - only show if content exists */}
        {content && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">{content}</p>
          </div>
        )}

        {/* Render children before tags if requested (for cover letter inline editing) */}
        {renderChildrenBeforeTags && children}

        {/* Tags */}
        {tagsLabel && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Tags className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{tagsLabel}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.length > 0 && tags.map((tag, index) => {
                // If structured tag, wrap with tooltip
                if (isStructuredTag(tag)) {
                  return (
                    <RequirementTagTooltip key={tag.id} tag={tag}>
                      <Badge 
                        variant={getTagVariant(tag)}
                        className={cn("text-xs cursor-help", getTagClassName(tag))}
                        data-severity={tag.severity}
                      >
                        {getTagLabel(tag)}
                      </Badge>
                    </RequirementTagTooltip>
                  );
                }
                
                // Simple string tag (no tooltip)
                return (
                  <Badge 
                    key={`${tag}-${index}`}
                    variant="secondary"
                    className="text-xs"
                  >
                    {tag}
                  </Badge>
                );
              })}
              {tags.length === 0 && onEdit && (
                <Badge 
                  variant="outline" 
                  className="text-xs cursor-pointer hover:bg-muted border-dashed"
                  onClick={onEdit}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add tag
                </Badge>
              )}
              {tags.length === 0 && !onEdit && (
                <Badge 
                  variant="outline" 
                  className="text-xs text-muted-foreground border-dashed bg-muted/30"
                >
                  None yet
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Additional content sections (metrics, links, variations, etc.) - renders after tags if not renderChildrenBeforeTags */}
        {!renderChildrenBeforeTags && children}

        {/* Gap Banner - Inside card at bottom */}
        {hasGaps && !isGapResolved && gaps.length > 0 && onGenerateContent && (
          <ContentGapBanner
            gaps={gaps}
            onGenerateContent={onGenerateContent}
            onDismiss={onDismissGap}
            isResolved={isGapResolved}
          />
        )}
      </CardContent>
    </Card>
  );
};

