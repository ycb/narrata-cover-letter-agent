import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Trash2, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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

  // Group blurbs by type and filter by search
  const groupedBlurbs: BlurbTypeGroup[] = ['intro', 'closer', 'signature'].map(type => {
    const typeBlurbs = blurbs.filter(blurb => {
      const matchesType = blurb.type === type;
      const matchesSearch = searchTerm === '' || 
        blurb.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blurb.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blurb.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesType && matchesSearch;
    });

    const config = getTypeConfig(type as 'intro' | 'closer' | 'signature');
    
    return {
      type: type as 'intro' | 'closer' | 'signature',
      label: config.label,
      description: config.description,
      blurbs: typeBlurbs
    };
  }).filter(group => group.blurbs.length > 0 || searchTerm === '');

  // Auto-expand if only one type has results
  React.useEffect(() => {
    const typesWithBlurbs = groupedBlurbs.filter(group => group.blurbs.length > 0);
    if (typesWithBlurbs.length === 1 && !expandedType) {
      setExpandedType(typesWithBlurbs[0].type);
    }
  }, [groupedBlurbs, expandedType]);

  const formatDateRange = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Template Blurb Library</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Organize and manage your reusable content by section type
            </p>
          </div>
          <Button onClick={() => onCreateBlurb()} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Blurb
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blurbs, tags, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto">
        {groupedBlurbs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No blurbs found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first template blurb'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => onCreateBlurb('intro')} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Introduction
              </Button>
              <Button onClick={() => onCreateBlurb('closer')} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Closing
              </Button>
              <Button onClick={() => onCreateBlurb('signature')} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Signature
              </Button>
            </div>
          </div>
        ) : (
          <Accordion 
            type="single" 
            value={expandedType} 
            onValueChange={(value) => setExpandedType(value === expandedType ? undefined : value)}
            className="space-y-2"
            collapsible
          >
            {groupedBlurbs.map((group) => {
              const config = getTypeConfig(group.type);
              const Icon = config.icon;
              
              return (
                <AccordionItem key={group.type} value={group.type} className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <Icon className="h-5 w-5 text-primary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{group.label}</span>
                          <Badge variant="secondary" className="text-xs">
                            {group.blurbs.length} {group.blurbs.length === 1 ? 'blurb' : 'blurbs'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3">
                      {group.blurbs.map((blurb) => {
                        const statusConfig = getStatusConfig(blurb.status);
                        const StatusIcon = statusConfig.icon;
                        const isSelected = selectedBlurbId === blurb.id;
                        
                        return (
                          <Card 
                            key={blurb.id}
                            className={cn(
                              "cursor-pointer transition-all duration-200 hover:shadow-medium",
                              isSelected && "ring-2 ring-primary shadow-medium"
                            )}
                            onClick={() => onSelectBlurb(blurb)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge className={statusConfig.color}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {statusConfig.label}
                                  </Badge>
                                  <div 
                                    className={`h-2 w-2 rounded-full ${getConfidenceColor(blurb.confidence)}`} 
                                    title={`${blurb.confidence} confidence`} 
                                  />
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditBlurb(blurb);
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteBlurb(blurb.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              <h4 className="font-semibold mb-2">{blurb.title}</h4>
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {blurb.content}
                              </p>
                              
                              {blurb.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {blurb.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Used {blurb.timesUsed} times</span>
                                <span>
                                  {blurb.lastUsed 
                                    ? `Last used ${formatDateRange(blurb.lastUsed)}`
                                    : `Created ${formatDateRange(blurb.createdAt)}`
                                  }
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      
                      <Button
                        variant="outline"
                        className="w-full border-dashed"
                        onClick={() => onCreateBlurb(group.type)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add {group.label} Blurb
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};