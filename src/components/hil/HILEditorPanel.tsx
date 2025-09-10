import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Edit,
  Save,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useHIL } from '@/contexts/HILContext';
import type { WorkHistoryBlurb, BlurbVariation } from '@/types/workHistory';
import type { HILContentMetadata, MockAISuggestion, GapAnalysis } from '@/types/content';

interface HILEditorPanelProps {
  variation: BlurbVariation;
  story: WorkHistoryBlurb;
  metadata: HILContentMetadata;
  onSave: (content: string, metadata: HILContentMetadata) => void;
  onCancel: () => void;
}

export function HILEditorPanel({
  variation,
  story,
  metadata,
  onSave,
  onCancel
}: HILEditorPanelProps) {
  const { state, dispatch } = useHIL();
  const [content, setContent] = useState(variation.content);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');

  // Track changes
  useEffect(() => {
    setHasChanges(content !== variation.content);
  }, [content, variation.content]);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (hasChanges) {
      const draft = {
        content,
        metadata,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(`hil-draft-${variation.id}`, JSON.stringify(draft));
    }
  }, [content, metadata, hasChanges, variation.id]);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(`hil-draft-${variation.id}`);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setContent(draft.content);
        // Check if draft is recent (within last hour)
        const draftAge = Date.now() - new Date(draft.timestamp).getTime();
        if (draftAge < 3600000) { // 1 hour
          setHasChanges(true);
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, [variation.id]);

  const handleSave = () => {
    const updatedMetadata: HILContentMetadata = {
      ...metadata,
      changeType: 'modification',
      lastVerified: new Date().toISOString(),
      usageCount: metadata.usageCount + 1
    };

    // Add to content history
    dispatch({
      type: 'ADD_CONTENT_VERSION',
      payload: {
        contentId: variation.id,
        content,
        metadata: updatedMetadata,
        version: 1,
        changeType: 'modification',
        changeReason: 'User edit in HIL editor',
        createdBy: 'user'
      }
    });

    onSave(content, updatedMetadata);
    setIsEditing(false);
    setHasChanges(false);
    
    // Clear draft
    localStorage.removeItem(`hil-draft-${variation.id}`);
  };

  const handleReset = () => {
    setContent(variation.content);
    setHasChanges(false);
    setIsEditing(false);
    localStorage.removeItem(`hil-draft-${variation.id}`);
  };

  const handleAIAssist = () => {
    // This will be implemented in Phase 3
    console.log('AI assistance requested');
  };

  const getVariationLabel = () => {
    if (variation.filledGap) {
      return `Fills Gap: ${variation.filledGap}`;
    }
    if (variation.developedForJobTitle) {
      return `For ${variation.developedForJobTitle}`;
    }
    return `Variant (${variation.createdBy === 'AI' ? 'AI' : 'User'})`;
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-success/10 text-success border-success/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Edit className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-xl">HIL Editor</CardTitle>
              <p className="text-sm text-muted-foreground">
                Human-in-the-Loop Content Refinement
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getConfidenceColor(metadata.confidence)}>
              {metadata.confidence} confidence
            </Badge>
            {hasChanges && (
              <Badge variant="secondary" className="bg-warning/10 text-warning">
                <Clock className="h-3 w-3 mr-1" />
                Unsaved changes
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Variation Context */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-2">Variation Context</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Label:</span>
              <Badge variant="outline" className="ml-2">
                {getVariationLabel()}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Created by:</span>
              <span className="ml-2 capitalize">{variation.createdBy}</span>
            </div>
            {variation.outcomeMetrics && variation.outcomeMetrics.length > 0 && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Metrics:</span>
                <span className="ml-2">{variation.outcomeMetrics.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Editor */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Content</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAIAssist}
                    className="flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    AI Assist
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    {isEditing ? 'Preview' : 'Edit'}
                  </Button>
                </div>
              </div>
              
              {isEditing ? (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Edit your content here..."
                  className="min-h-[200px] resize-none"
                />
              ) : (
                <div className="p-4 border rounded-md bg-background min-h-[200px]">
                  <p className="whitespace-pre-wrap">{content}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={!hasChanges}
                  className="flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="flex items-center gap-1"
                >
                  Cancel
                </Button>
              </div>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                className="flex items-center gap-1"
              >
                <Save className="h-3 w-3" />
                Save Changes
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gap Analysis */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Gap Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {state.gapAnalysis ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Overall Score</span>
                        <Badge variant="outline">
                          {state.gapAnalysis.overallScore}%
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {state.gapAnalysis.suggestions.slice(0, 3).map((suggestion, index) => (
                          <div key={index} className="p-2 bg-muted/30 rounded text-sm">
                            <div className="flex items-center gap-1 mb-1">
                              <AlertCircle className="h-3 w-3 text-warning" />
                              <span className="font-medium">{suggestion.type}</span>
                            </div>
                            <p className="text-muted-foreground">{suggestion.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No gap analysis available</p>
                      <p className="text-xs">Run analysis to see suggestions</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Suggestions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {state.aiSuggestions.length > 0 ? (
                    <div className="space-y-2">
                      {state.aiSuggestions.slice(0, 3).map((suggestion) => (
                        <div key={suggestion.id} className="p-2 bg-muted/30 rounded text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{suggestion.type}</span>
                            <Badge variant="outline" className="text-xs">
                              {suggestion.confidence}%
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{suggestion.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No AI suggestions yet</p>
                      <p className="text-xs">Click "AI Assist" to get suggestions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Edit History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {state.contentHistory.length > 0 ? (
                  <div className="space-y-3">
                    {state.contentHistory
                      .filter(version => version.contentId === variation.id)
                      .slice(0, 5)
                      .map((version) => (
                        <div key={version.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-success" />
                              <span className="text-sm font-medium">
                                Version {version.version}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(version.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {version.changeReason || 'Content updated'}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No edit history yet</p>
                    <p className="text-xs">Changes will be tracked here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
