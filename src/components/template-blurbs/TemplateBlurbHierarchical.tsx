import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Trash2, FileText, Clock, CheckCircle, AlertCircle, MoreHorizontal, Copy, Tags, Sparkles, X, BookOpen } from "lucide-react";
import { IntelligentAlertBadge } from "@/components/ui/IntelligentAlertBadge";
import { TagSuggestionButton } from "@/components/ui/TagSuggestionButton";
import { ContentGapBanner } from "@/components/shared/ContentGapBanner";
import { ContentCard } from "@/components/shared/ContentCard";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TemplateBlurb {
  id: string;
  type: 'intro' | 'paragraph' | 'closer' | 'signature' | string;
  title: string;
  content: string;
  status: 'approved' | 'draft' | 'needs-review';
  confidence: 'high' | 'medium' | 'low';
  tags: string[];
  timesUsed: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

interface BlurbTypeGroup {
  type: 'intro' | 'paragraph' | 'closer' | 'signature' | string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  blurbs: TemplateBlurb[];
}

interface TemplateBlurbHierarchicalProps {
  blurbs: TemplateBlurb[];
  selectedBlurbId?: string;
  onSelectBlurb: (blurb: TemplateBlurb) => void;
  onCreateBlurb: (type?: 'intro' | 'paragraph' | 'closer' | 'signature' | string) => void;
  onEditBlurb: (blurb: TemplateBlurb) => void;
  onDeleteBlurb: (blurbId: string) => void;
  onGenerateContent?: (blurb: TemplateBlurb) => void;
  onTagSuggestions?: (blurb: TemplateBlurb) => void;
  resolvedGaps?: Set<string>;
  dismissedSuccessCards?: Set<string>;
  onDismissSuccessCard?: (gapId: string) => void;
  contentTypes?: Array<{
    type: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    isDefault?: boolean;
  }>;
}

export const TemplateBlurbHierarchical = ({
  blurbs,
  selectedBlurbId,
  onSelectBlurb,
  onCreateBlurb,
  onEditBlurb,
  onDeleteBlurb,
  onGenerateContent,
  onTagSuggestions,
  resolvedGaps = new Set(),
  dismissedSuccessCards = new Set(),
  onDismissSuccessCard,
  contentTypes = []
}: TemplateBlurbHierarchicalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedType, setExpandedType] = useState<string>();
  const [sortBy, setSortBy] = useState<'usage' | 'date' | 'alphabetical-asc' | 'alphabetical-desc'>('usage');

  // Default content types if none provided
  const defaultContentTypes = [
    {
      type: 'intro',
      label: 'Introduction',
      description: 'Opening paragraphs that grab attention and introduce you',
      icon: FileText,
      isDefault: true
    },
    {
      type: 'paragraph',
      label: 'Body Paragraph',
      description: 'Static supporting paragraphs you want to reuse verbatim',
      icon: BookOpen,
      isDefault: true
    },
    {
      type: 'closer',
      label: 'Closing',
      description: 'Concluding paragraphs that reinforce your interest',
      icon: CheckCircle,
      isDefault: true
    }
  ];

  // Use provided content types or fall back to defaults
  const allContentTypes = contentTypes.length > 0 ? contentTypes : defaultContentTypes;

  const uniqueBlurbTypes = Array.from(new Set(blurbs.map((blurb) => blurb.type)));
  const missingConfigs = uniqueBlurbTypes
    .filter((type) => !allContentTypes.some((config) => config.type === type))
    .map((type) => ({
      type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      description: 'Custom content type',
      icon: FileText,
      isDefault: false,
    }));

  const contentTypeConfigs = [...allContentTypes, ...missingConfigs];

  const getTypeConfig = (type: string) => {
    const config = contentTypeConfigs.find(ct => ct.type === type);
    if (config) {
      return config;
    }
    // Fallback for unknown types
    return {
      label: type.charAt(0).toUpperCase() + type.slice(1),
      description: 'Custom content type',
      icon: FileText
    };
  };

  const getStatusConfig = (status: 'approved' | 'draft' | 'needs-review') => {
    const configs = {
      approved: { icon: CheckCircle, color: 'bg-success-light text-success', label: 'Approved' },
      draft: { icon: Clock, color: 'bg-warning-light text-warning', label: 'Draft' },
      'needs-review': { icon: AlertCircle, color: 'bg-destructive/10 text-destructive', label: 'Needs Review' }
    };
    return configs[status];
  };

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'bg-confidence-high',
      medium: 'bg-confidence-medium',
      low: 'bg-confidence-low'
    };
    return colors[confidence];
  };

  // Sort blurbs based on selected criteria
  const sortBlurbs = (blurbs: TemplateBlurb[]) => {
    return [...blurbs].sort((a, b) => {
      switch (sortBy) {
        case 'usage':
          return (b.timesUsed || 0) - (a.timesUsed || 0);
        case 'date':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'alphabetical-asc':
          return a.title.localeCompare(b.title);
        case 'alphabetical-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  };

  // Group blurbs by type and filter by search
  const groupedBlurbs: BlurbTypeGroup[] = contentTypeConfigs.map((contentType) => {
    let typeBlurbs = blurbs.filter(blurb => {
      const matchesType = blurb.type === contentType.type;
      const matchesSearch = searchTerm === '' || 
        blurb.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blurb.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blurb.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesType && matchesSearch;
    });

    // Sort the filtered blurbs
    typeBlurbs = sortBlurbs(typeBlurbs);

    return {
      type: contentType.type,
      label: contentType.label,
      description: contentType.description,
      icon: contentType.icon,
      blurbs: typeBlurbs
    };
  });

  const totalBlurbs = groupedBlurbs.reduce((total, group) => total + group.blurbs.length, 0);
  const hasResults = totalBlurbs > 0;

  const handleKeyActivate = (event: React.KeyboardEvent, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

  const formatGapCategory = (category: string) =>
    category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const hasInitializedRef = React.useRef(false);

  React.useEffect(() => {
    if (!hasInitializedRef.current) {
      const firstGroupWithContent = groupedBlurbs.find((group) => group.blurbs.length > 0);
      if (firstGroupWithContent) {
        setExpandedType(firstGroupWithContent.type);
      }
      hasInitializedRef.current = true;
    }
  }, [groupedBlurbs]);

  return (
    <div className="space-y-6">
      {/* Enhanced Search and Filter Bar */}
      <div className="my-2">
        {/* Search and Sort Controls - Combined into single line */}
        <div className="flex items-center justify-between gap-4">
          {/* Sort Controls - Left side */}
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-by" className="text-sm font-medium">Sort by:</Label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-border rounded-md px-2 py-1 bg-background"
            >
              <option value="usage">Most Used</option>
              <option value="date">Recently Updated</option>
              <option value="alphabetical-asc">A → Z</option>
              <option value="alphabetical-desc">Z → A</option>
            </select>
          </div>
          
          {/* Search Bar - Right side */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, content, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Blurb Groups */}
      {hasResults ? (
        <Accordion
          type="single"
          collapsible
          value={expandedType}
          onValueChange={(value) => setExpandedType(value || undefined)}
          className="accordion-item-spacing"
        >
          {groupedBlurbs.map((group) => {
            const isDefaultType = allContentTypes.find(ct => ct.type === group.type)?.isDefault;
            const firstBlurb = group.blurbs[0];
            const originalGapCount = group.blurbs.reduce((total, blurb) => total + ((blurb as any).gapCount || 0), 0);
            const resolvedCount = group.blurbs.reduce((total, blurb) => {
              return total + (resolvedGaps.has(`blurb-gap-${blurb.id}`) ? (blurb as any).gapCount || 0 : 0);
            }, 0);
            const remainingGapCount = Math.max(0, originalGapCount - resolvedCount);

            return (
              <AccordionItem key={group.type} value={group.type} className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:no-underline focus:outline-none focus-visible:ring-0">
                  <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex items-center gap-4 pr-2 text-left">
                      {remainingGapCount > 0 ? (
                        <IntelligentAlertBadge
                          gapCount={remainingGapCount}
                          onAnalyze={() => {
                            if (onGenerateContent && firstBlurb) {
                              onGenerateContent(firstBlurb);
                            }
                          }}
                        />
                      ) : (
                        <group.icon className="h-6 w-6 text-muted-foreground" />
                      )}
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg leading-none">{group.label}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{group.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        role="button"
                        tabIndex={0}
                        className={buttonVariants({ variant: "tertiary", size: "sm" })}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onCreateBlurb(group.type);
                        }}
                        onKeyDown={(event) => handleKeyActivate(event, () => onCreateBlurb(group.type))}
                      >
                        Add {group.label}
                      </span>
                      {expandedType === group.type && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <span
                              role="button"
                              tabIndex={0}
                              className={cn(
                                buttonVariants({ variant: "ghost", size: "sm" }),
                                "h-8 w-8 p-0 flex items-center justify-center"
                              )}
                              onClick={(event) => {
                                event.stopPropagation();
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.stopPropagation();
                                }
                              }}
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                            <DropdownMenuItem
                              disabled={isDefaultType || !firstBlurb}
                              onClick={() => firstBlurb && onEditBlurb(firstBlurb)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Section
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isDefaultType || !firstBlurb}
                              onClick={() => firstBlurb && onDeleteBlurb(firstBlurb.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Section
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4 mt-6">
                    {group.blurbs.map((blurb) => {
                      const statusConfig = getStatusConfig(blurb.status);
                      const StatusIcon = statusConfig.icon;
 
                      // Map gaps for ContentGapBanner
                      const blurbGapCategories: string[] = ((blurb as any).gapCategories ?? []) as string[];
                      const blurbHasGaps = (blurb as any).hasGaps && !resolvedGaps.has(`blurb-gap-${blurb.id}`) && blurbGapCategories.length > 0;
                      const gaps = blurbHasGaps
                        ? blurbGapCategories.map((category, index) => ({
                            id: `blurb-gap-${blurb.id}-${index}`,
                            description: formatGapCategory(category)
                          }))
                        : [];
 
                      return (
                        <React.Fragment key={blurb.id}>
                          <ContentCard
                            title={blurb.title}
                            content={blurb.content}
                            tags={blurb.tags}
                            timesUsed={blurb.timesUsed}
                            lastUsed={blurb.lastUsed}
                            hasGaps={blurbHasGaps}
                            gaps={gaps}
                            isGapResolved={resolvedGaps.has(`blurb-gap-${blurb.id}`)}
                            onGenerateContent={onGenerateContent ? () => onGenerateContent(blurb) : undefined}
                            onDismissGap={blurbHasGaps ? () => {
                              // setResolvedGaps(prev => new Set([...prev, `blurb-gap-${blurb.id}`])); // This line was removed
                            } : undefined}
                            onEdit={() => onEditBlurb(blurb)}
                            onDuplicate={() => {
                              // TODO: Implement duplicate blurb
                              console.log('Duplicate blurb:', blurb.id);
                            }}
                            onDelete={() => onDeleteBlurb(blurb.id)}
                            onTagSuggestions={onTagSuggestions ? (tags) => {
                              // TagSuggestions expects a blurb callback, but ContentCard uses tags callback
                              // We'll call the blurb callback when tags are suggested
                              if (onTagSuggestions) {
                                onTagSuggestions(blurb);
                              }
                            } : undefined}
                            tagsLabel="Content Tags"
                          />
                          
                          {/* Success State Cards */}
                          {resolvedGaps.has(`blurb-gap-${blurb.id}`) && !dismissedSuccessCards.has(`blurb-gap-${blurb.id}`) && (
                            <div className="mt-4 border-success bg-success/5 p-4 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-success" />
                                  <span className="font-medium text-success">Content Enhanced</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-success/10"
                                  onClick={() => onDismissSuccessCard?.(`blurb-gap-${blurb.id}`)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Content has been successfully generated and applied.
                              </p>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No blurbs found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? "Try adjusting your search terms." 
              : "Create your first blurb to get started."}
          </p>
          {!searchTerm && (
            <Button onClick={() => onCreateBlurb('intro')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Blurb
            </Button>
          )}
        </div>
      )}
    </div>
  );
};