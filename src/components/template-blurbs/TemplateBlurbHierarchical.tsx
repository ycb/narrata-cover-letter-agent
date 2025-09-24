import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Trash2, FileText, Clock, CheckCircle, AlertCircle, MoreHorizontal, Copy, Tags, AlertTriangle, Sparkles } from "lucide-react";
import { IntelligentAlertBadge } from "@/components/ui/IntelligentAlertBadge";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface TemplateBlurb {
  id: string;
  type: 'intro' | 'closer' | 'signature';
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
  type: 'intro' | 'closer' | 'signature';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  blurbs: TemplateBlurb[];
}

interface TemplateBlurbHierarchicalProps {
  blurbs: TemplateBlurb[];
  selectedBlurbId?: string;
  onSelectBlurb: (blurb: TemplateBlurb) => void;
  onCreateBlurb: (type?: 'intro' | 'closer' | 'signature' | string) => void;
  onEditBlurb: (blurb: TemplateBlurb) => void;
  onDeleteBlurb: (blurbId: string) => void;
  onGenerateContent?: (blurb: TemplateBlurb) => void;
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
      type: 'closer',
      label: 'Closing',
      description: 'Concluding paragraphs that reinforce your interest',
      icon: CheckCircle,
      isDefault: true
    },
    {
      type: 'signature',
      label: 'Signature',
      description: 'Professional sign-offs and contact information',
      icon: Edit,
      isDefault: true
    }
  ];

  // Use provided content types or fall back to defaults
  const allContentTypes = contentTypes.length > 0 ? contentTypes : defaultContentTypes;

  const getTypeConfig = (type: string) => {
    const config = allContentTypes.find(ct => ct.type === type);
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
  const groupedBlurbs: BlurbTypeGroup[] = allContentTypes.map((contentType) => {
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
        <Accordion type="single" collapsible value={expandedType} onValueChange={setExpandedType} className="accordion-item-spacing">
          {groupedBlurbs.map((group) => (
            <AccordionItem key={group.type} value={group.type} className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const gapCount = group.blurbs.reduce((total, blurb) => {
                        return total + ((blurb as any).gapCount || 0);
                      }, 0);
                      
                      return gapCount > 0 ? (
                        <IntelligentAlertBadge
                          gapCount={gapCount}
                          onAnalyze={() => {
                            console.log('Analyze gaps for group:', group.type);
                            // TODO: Implement gap analysis
                          }}
                        />
                      ) : (
                        <group.icon className="h-6 w-6 text-muted-foreground" />
                      );
                    })()}
                    <div className="text-left">
                      <h3 className="font-semibold text-lg mb-1">{group.label}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{group.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCreateBlurb(group.type);
                      }}
                    >
                      Add {group.label}
                    </Button>
                    
                    {/* Overflow menu for user-created sections */}
                    {!allContentTypes.find(ct => ct.type === group.type)?.isDefault && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            // TODO: Implement edit section
                            console.log('Edit section:', group.type);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Section
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              // TODO: Implement delete section
                              console.log('Delete section:', group.type);
                            }}
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
                    
                    return (
                      <React.Fragment key={blurb.id}>
                        <Card className={cn(
                          "hover:shadow-md transition-shadow",
                          (blurb as any).hasGaps && "border-warning bg-warning/5"
                        )}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-3">
                                  <h4 className="font-medium truncate text-base">{blurb.title}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{blurb.content}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                                  <span>Used {blurb.timesUsed} times</span>
                                  {blurb.lastUsed && <span>Last used {blurb.lastUsed}</span>}
                                  <span>Updated {new Date(blurb.updatedAt).toLocaleDateString()}</span>
                                </div>
                                {blurb.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Tags className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm font-medium">Content Tags</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {blurb.tags.map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3 ml-6">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEditBlurb(blurb)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      // TODO: Implement duplicate blurb
                                      console.log('Duplicate blurb:', blurb.id);
                                    }}>
                                      <Copy className="mr-2 h-4 w-4" />
                                      Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => onDeleteBlurb(blurb.id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Gap Detection Cards */}
                        {(() => {
                          console.log('Blurb gap check:', blurb.title, (blurb as any).hasGaps, (blurb as any).gapCount);
                          return null;
                        })()}
                        {(blurb as any).hasGaps && (
                          <div className="mt-4 border-warning bg-warning/5 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-warning" />
                              <span className="font-medium text-warning">Content Gap</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              Content needs improvement based on cover letter best practices.
                            </p>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                if (onGenerateContent) {
                                  onGenerateContent(blurb);
                                } else {
                                  console.log('Generate content for blurb gap:', blurb.title);
                                }
                              }}
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              Generate Content
                            </Button>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
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