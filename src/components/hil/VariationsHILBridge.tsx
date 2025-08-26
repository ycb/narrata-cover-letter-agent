import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Layers, 
  Edit, 
  Plus, 
  Trash2, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import type { WorkHistoryBlurb, BlurbVariation } from '@/types/workHistory';
import type { VariationMetadata, HILContentMetadata } from '@/types/content';
import { cn } from '@/lib/utils';

interface VariationsHILBridgeProps {
  story: WorkHistoryBlurb;
  variations: BlurbVariation[];
  onVariationEdit: (variation: BlurbVariation) => void;
  onVariationCreate: (content: string, metadata: VariationMetadata) => void;
  onVariationDelete: (variationId: string) => void;
  onHILEdit: (variation: BlurbVariation, metadata: HILContentMetadata) => void;
}

export function VariationsHILBridge({
  story,
  variations,
  onVariationEdit,
  onVariationCreate,
  onVariationDelete,
  onHILEdit
}: VariationsHILBridgeProps) {
  const [expandedVariations, setExpandedVariations] = useState<Record<string, boolean>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Sort variations by priority (gap-filling first, then job-specific, then fallback)
  const sortedVariations = useMemo(() => {
    if (!variations || !Array.isArray(variations)) {
      return [];
    }
    return [...variations].sort((a, b) => {
      const getPriority = (variation: BlurbVariation) => {
        if (variation.filledGap) return 1; // Highest priority
        if (variation.developedForJobTitle) return 2; // Medium priority
        return 3; // Lowest priority (fallback)
      };
      return getPriority(a) - getPriority(b);
    });
  }, [variations]);

  const toggleVariation = (variationId: string) => {
    setExpandedVariations(prev => ({
      ...prev,
      [variationId]: !prev[variationId]
    }));
  };

  const toggleAllVariations = () => {
    const allExpanded = Object.values(expandedVariations).every(Boolean);
    const newState: Record<string, boolean> = {};
    variations.forEach(variation => {
      newState[variation.id] = !allExpanded;
    });
    setExpandedVariations(newState);
  };

  const getVariationLabel = (variation: BlurbVariation, index: number): string => {
    if (variation.filledGap) {
      return `Fills Gap: ${variation.filledGap}`;
    }
    if (variation.developedForJobTitle) {
      return `For ${variation.developedForJobTitle}`;
    }
    return `Variant #${index + 1} (${variation.createdBy === 'AI' ? 'AI' : 'User'})`;
  };

  const getVariationPriority = (variation: BlurbVariation): number => {
    if (variation.filledGap) return 1; // Highest priority
    if (variation.developedForJobTitle) return 2; // Medium priority
    return 3; // Lowest priority (fallback)
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-success/10 text-success border-success/20';
      case 2: return 'bg-primary/10 text-primary border-primary/20';
      case 3: return 'bg-muted text-muted-foreground border-muted';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getCreatedByIcon = (createdBy: string) => {
    switch (createdBy) {
      case 'AI': return <Sparkles className="h-3 w-3" />;
      case 'user': return <Edit className="h-3 w-3" />;
      case 'user-edited-AI': return <Copy className="h-3 w-3" />;
      default: return <Edit className="h-3 w-3" />;
    }
  };

  const handleHILEdit = (variation: BlurbVariation) => {
    const metadata: HILContentMetadata = {
      source: 'variation',
      sourceId: variation.id,
      confidence: 'high',
      lastVerified: new Date().toISOString(),
      competencyTags: [],
      usageCount: 0,
      variationId: variation.id,
      originalContent: variation.content,
      changeType: 'modification',
      linkedVariations: [variation.id],
      competencyMapping: {}
    };
    onHILEdit(variation, metadata);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Variations Bridge</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {variations?.length || 0} variation{(variations?.length || 0) !== 1 ? 's' : ''}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAllVariations}
              className="h-8 w-8 p-0"
              aria-label="Toggle all variations"
            >
              {Object.values(expandedVariations).every(Boolean) ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Story Summary */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <h4 className="font-medium text-sm mb-1">Base Story</h4>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {story.content}
          </p>
        </div>

        {/* Variations List */}
        {sortedVariations.length > 0 ? (
          <div className="space-y-3">
            {sortedVariations.map((variation, index) => {
              const priority = getVariationPriority(variation);
              const isExpanded = expandedVariations[variation.id];
              
              return (
                <Card key={variation.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getPriorityColor(priority))}
                        >
                          {getVariationLabel(variation, index)}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {getCreatedByIcon(variation.createdBy)}
                          <span>{variation.createdBy}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleVariation(variation.id)}
                          className="h-6 w-6 p-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Variation Content */}
                    {isExpanded && (
                      <div className="space-y-3">
                        <div className="p-3 bg-background border rounded-md">
                          <p className="text-sm">{variation.content}</p>
                        </div>
                        
                        {/* Variation Metadata */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {variation.filledGap && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-success" />
                              <span className="text-muted-foreground">Gap:</span>
                              <span>{variation.filledGap}</span>
                            </div>
                          )}
                          {variation.developedForJobTitle && (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 text-primary" />
                              <span className="text-muted-foreground">For:</span>
                              <span>{variation.developedForJobTitle}</span>
                            </div>
                          )}
                          {variation.outcomeMetrics && variation.outcomeMetrics.length > 0 && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Metrics:</span>
                              <span className="ml-1">{variation.outcomeMetrics.join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleHILEdit(variation)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            HIL Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onVariationEdit(variation)}
                            className="flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onVariationDelete(variation.id)}
                            className="flex items-center gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No variations yet</p>
            <p className="text-xs">Create variations to fill different gaps and job requirements</p>
          </div>
        )}

        {/* Create New Variation Button */}
        <Separator />
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create New Variation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

