import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagSuggestionButton } from "@/components/ui/TagSuggestionButton";
import { ContentGapBanner } from "@/components/shared/ContentGapBanner";
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

interface ContentCardProps {
  title: string;
  content: string;
  tags: string[];
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
          {(onEdit || onDuplicate || onDelete) && (
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
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={onDelete}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Content - Show read-only preview if children provided (for inline editing), otherwise show content */}
        {!children && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            {content}
          </p>
        </div>
        )}

        {/* Render children before tags if requested (for cover letter inline editing) */}
        {renderChildrenBeforeTags && children}

        {/* Tags */}
        {(tags.length > 0 || onEdit) && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Tags className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{tagsLabel}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.length > 0 && tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
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

