import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Trash2, FileText, Clock, CheckCircle, AlertCircle, MoreHorizontal, Copy } from "lucide-react";
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
  onCreateBlurb: (type?: 'intro' | 'closer' | 'signature') => void;
  onEditBlurb: (blurb: TemplateBlurb) => void;
  onDeleteBlurb: (blurbId: string) => void;
}

export const TemplateBlurbHierarchical = ({
  blurbs,
  selectedBlurbId,
  onSelectBlurb,
  onCreateBlurb,
  onEditBlurb,
  onDeleteBlurb
}: TemplateBlurbHierarchicalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedType, setExpandedType] = useState<string>();
  const [sortBy, setSortBy] = useState<'usage' | 'date' | 'alphabetical-asc' | 'alphabetical-desc'>('usage');

  const getTypeConfig = (type: 'intro' | 'closer' | 'signature') => {
    const configs = {
      intro: {
        label: 'Introduction',
        description: 'Opening paragraphs that grab attention and introduce you',
        icon: FileText
      },
      closer: {
        label: 'Closing',
        description: 'Concluding paragraphs that reinforce your interest',
        icon: CheckCircle
      },
      signature: {
        label: 'Signature',
        description: 'Professional sign-offs and contact information',
        icon: Edit
      }
    };
    return configs[type];
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
  const groupedBlurbs: BlurbTypeGroup[] = (['intro', 'closer', 'signature'] as const).map((type) => {
    let typeBlurbs = blurbs.filter(blurb => {
      const matchesType = blurb.type === type;
      const matchesSearch = searchTerm === '' || 
        blurb.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blurb.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blurb.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesType && matchesSearch;
    });

    // Sort the filtered blurbs
    typeBlurbs = sortBlurbs(typeBlurbs);

    const config = getTypeConfig(type);
    return {
      type,
      label: config.label,
      description: config.description,
      icon: config.icon,
      blurbs: typeBlurbs
    };
  });

  const totalBlurbs = groupedBlurbs.reduce((total, group) => total + group.blurbs.length, 0);
  const hasResults = totalBlurbs > 0;

  return (
    <div className="space-y-6">
      {/* Enhanced Search and Filter Bar */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blurbs by title, content, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Sort Options */}
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
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            {hasResults ? `${totalBlurbs} blurbs found` : 'No blurbs found'}
          </div>
        </div>
      </div>

      {/* Blurb Groups */}
      {hasResults ? (
        <Accordion type="single" collapsible value={expandedType} onValueChange={setExpandedType}>
          {groupedBlurbs.map((group) => (
            <AccordionItem key={group.type} value={group.type} className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <group.icon className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <h3 className="font-semibold">{group.label}</h3>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{group.blurbs.length} blurbs</Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCreateBlurb(group.type);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add {group.label}
                    </Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3 mt-4">
                  {group.blurbs.map((blurb) => {
                    const statusConfig = getStatusConfig(blurb.status);
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <Card key={blurb.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium truncate">{blurb.title}</h4>
                                <Badge className={statusConfig.color}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                                <div className={`h-2 w-2 rounded-full ${getConfidenceColor(blurb.confidence)}`} 
                                     title={`${blurb.confidence} confidence`} />
                              </div>
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{blurb.content}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Used {blurb.timesUsed} times</span>
                                {blurb.lastUsed && <span>Last used {blurb.lastUsed}</span>}
                                <span>Updated {new Date(blurb.updatedAt).toLocaleDateString()}</span>
                              </div>
                              {blurb.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {blurb.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="tertiary"
                                size="sm"
                                onClick={() => onSelectBlurb(blurb)}
                              >
                                Use
                              </Button>
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