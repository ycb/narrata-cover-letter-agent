import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, RefreshCw, CheckCircle, AlertTriangle, Save, FileStack } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { Gap } from '@/services/gapDetectionService';
import {
  ContentGenerationService,
  type ValidationResult,
  type ContentSaveRequest
} from '@/services/contentGenerationService';
import type { WorkHistoryContext, JobContext } from '@/prompts/contentGeneration';

interface ContentGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Gap context
  gap: Gap;

  // Entity context
  entityType: 'work_item' | 'approved_content' | 'saved_section';
  entityId: string;
  existingContent: string;

  // Work history context for LLM
  workHistoryContext: WorkHistoryContext;

  // Job context (optional, for variations)
  jobContext?: JobContext;

  // Section type for saved sections
  sectionType?: 'introduction' | 'closer' | 'signature' | 'custom';

  // Callbacks
  onContentApplied?: () => void; // Called after successful save
}

export function ContentGenerationModal({
  isOpen,
  onClose,
  gap,
  entityType,
  entityId,
  existingContent,
  workHistoryContext,
  jobContext,
  sectionType,
  onContentApplied
}: ContentGenerationModalProps) {
  const { toast } = useToast();

  // Content generation state
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Validation state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [allGaps, setAllGaps] = useState<Gap[]>([gap]); // Start with current gap

  // Save mode state
  const [saveMode, setSaveMode] = useState<'replace' | 'variation'>('replace');
  const [showSaveModeSelection, setShowSaveModeSelection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Variation metadata state
  const [variationMetadata, setVariationMetadata] = useState({
    title: `Fills Gap: ${gap.gap_category.replace(/_/g, ' ')}`,
    gapTags: [gap.gap_category],
    targetJobTitle: jobContext?.jobTitle || '',
    targetCompany: jobContext?.company || '',
    jobDescriptionId: ''
  });

  // Service instance
  const [service] = useState(() => new ContentGenerationService());

  // Fetch all gaps for this entity to enable multi-gap validation
  useEffect(() => {
    const fetchAllGaps = async () => {
      try {
        const { data: gaps, error } = await supabase
          .from('gaps')
          .select('*')
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .eq('user_id', workHistoryContext.userId)
          .eq('resolved', false);

        if (error) throw error;

        // Include current gap if not in fetched gaps
        const allEntityGaps = gaps || [];
        if (!allEntityGaps.find(g => g.id === gap.id)) {
          allEntityGaps.push(gap);
        }

        setAllGaps(allEntityGaps);
      } catch (error) {
        console.error('Error fetching gaps:', error);
        // Fall back to just current gap
        setAllGaps([gap]);
      }
    };

    if (isOpen) {
      fetchAllGaps();
    }
  }, [isOpen, entityType, entityId, workHistoryContext.userId, gap]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setValidationResult(null);

    try {
      // Call ContentGenerationService
      const content = await service.generateContent({
        gap,
        existingContent,
        entityType,
        entityId,
        workHistoryContext,
        jobContext,
        sectionType
      });

      setGeneratedContent(content);

      // Run validation on ALL gaps for this entity
      setIsValidating(true);
      const validation = await service.validateContent(
        content,
        allGaps,
        entityType,
        workHistoryContext.userId
      );

      setValidationResult(validation);
      setIsValidating(false);

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate content',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setGeneratedContent('');
    setValidationResult(null);
    handleGenerate();
  };

  const handleApply = async () => {
    if (!generatedContent.trim()) return;

    // Context-dependent save mode logic:
    // - Cover Letter Draft context (jobContext exists) → ALWAYS variation
    // - Work History context (no jobContext) → Default to replace, but show option for variations

    if (jobContext) {
      // Cover letter draft context: ALWAYS create variation (no user choice needed)
      await saveContent('variation');
      return;
    }

    // Work History context: Show save mode selection for entities that support variations
    if (entityType === 'approved_content' || entityType === 'saved_section') {
      setShowSaveModeSelection(true);
      return;
    }

    // For work_item (role descriptions), always replace
    await saveContent('replace');
  };

  const saveContent = async (mode: 'replace' | 'variation') => {
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const saveRequest: ContentSaveRequest = {
        mode,
        entityType,
        entityId,
        content: generatedContent,
        userId: user.id,
        gapId: gap.id!,
        variationData: mode === 'variation' ? variationMetadata : undefined
      };

      const result = await service.saveContent(saveRequest);

      if (result.success) {
        toast({
          title: mode === 'replace' ? 'Content Updated' : 'Variation Created',
          description: mode === 'replace'
            ? 'Your content has been updated successfully'
            : `Variation "${variationMetadata.title}" created successfully`,
        });

        // Call callback
        onContentApplied?.();

        // Close modal and reset
        handleClose();
      }

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save content',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setGeneratedContent('');
    setValidationResult(null);
    setShowSaveModeSelection(false);
    setSaveMode('replace');
  };

  const getValidationBadge = () => {
    if (!validationResult) return null;

    switch (validationResult.status) {
      case 'pass':
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            All Gaps Addressed
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {validationResult.addressedGaps.length}/{allGaps.length} Gaps Addressed
          </Badge>
        );
      case 'fail':
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Gaps Remain
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Content
          </DialogTitle>
          <DialogDescription>
            AI-assisted content generation with gap validation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Gap Context */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Gap Analysis</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={
                    gap.severity === 'high' ? 'bg-red-500 text-white' :
                    gap.severity === 'medium' ? 'bg-yellow-500 text-white' :
                    'bg-blue-500 text-white'
                  }>
                    {gap.severity} priority
                  </Badge>
                  <Badge variant="outline">
                    {gap.gap_category.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <h4 className="font-medium text-sm min-w-[80px]">Issue:</h4>
                  <p className="text-sm text-muted-foreground">{gap.description}</p>
                </div>

                {gap.suggestions && gap.suggestions.length > 0 && (
                  <div className="flex items-start gap-2">
                    <h4 className="font-medium text-sm min-w-[80px]">Suggestion:</h4>
                    <p className="text-sm text-muted-foreground">
                      {Array.isArray(gap.suggestions) ? gap.suggestions.join('; ') : gap.suggestions}
                    </p>
                  </div>
                )}
              </div>

              {allGaps.length > 1 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    This content has {allGaps.length} total gaps. Validation will check all simultaneously.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Existing Content */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Existing Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingContent || 'No existing content'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Generated Content */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Generated Content</CardTitle>
                <div className="flex items-center gap-2">
                  {isValidating && (
                    <Badge variant="outline" className="text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                      Validating...
                    </Badge>
                  )}
                  {getValidationBadge()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!generatedContent ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Click "Generate Content" to create AI-powered content that addresses this gap.
                  </p>
                  <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Content
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <Textarea
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    placeholder="Generated content will appear here..."
                    rows={8}
                    className="resize-none"
                  />

                  {/* Validation Results */}
                  {validationResult && (
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                      <h4 className="font-medium text-sm">Validation Results:</h4>

                      {validationResult.addressedGaps.length > 0 && (
                        <div>
                          <p className="text-xs text-green-600 font-medium mb-1">
                            ✓ Addressed Gaps ({validationResult.addressedGaps.length}):
                          </p>
                          <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                            {validationResult.addressedGaps.map(g => (
                              <li key={g.id} className="list-disc">
                                {g.gap_category.replace(/_/g, ' ')}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {validationResult.remainingGaps.length > 0 && (
                        <div>
                          <p className="text-xs text-yellow-600 font-medium mb-1">
                            ! Remaining Gaps ({validationResult.remainingGaps.length}):
                          </p>
                          <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                            {validationResult.remainingGaps.map(g => (
                              <li key={g.id} className="list-disc">
                                {g.gap_category.replace(/_/g, ' ')}: {g.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {validationResult.suggestions.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">Suggestions:</p>
                          <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                            {validationResult.suggestions.map((s, i) => (
                              <li key={i} className="list-disc">{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleRegenerate} disabled={isGenerating}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleClose}>
                        Cancel
                      </Button>
                      <Button onClick={handleApply} disabled={isSaving || !generatedContent.trim()}>
                        {jobContext ? (
                          <>
                            <FileStack className="h-4 w-4 mr-2" />
                            Save as Variation
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {entityType === 'work_item' ? 'Update Content' : 'Continue'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Save Mode Selection (Work History context only) */}
          {showSaveModeSelection && (
            <Card className="border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Save Options</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose how to save this content
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className={`cursor-pointer transition-colors ${saveMode === 'replace' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                    onClick={() => setSaveMode('replace')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Save className="h-4 w-4" />
                        <h4 className="font-medium">Replace Content</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Update the original content with this improved version
                      </p>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-colors ${saveMode === 'variation' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                    onClick={() => setSaveMode('variation')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileStack className="h-4 w-4" />
                        <h4 className="font-medium">Save as Variation</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Keep original, save this as a reusable variation
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Variation Metadata Form */}
                {saveMode === 'variation' && (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="variation-title">Variation Title</Label>
                      <Input
                        id="variation-title"
                        value={variationMetadata.title}
                        onChange={(e) => setVariationMetadata({ ...variationMetadata, title: e.target.value })}
                        placeholder="e.g., Fills Gap: Leadership Philosophy"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="target-job-title">Target Job Title (Optional)</Label>
                        <Input
                          id="target-job-title"
                          value={variationMetadata.targetJobTitle}
                          onChange={(e) => setVariationMetadata({ ...variationMetadata, targetJobTitle: e.target.value })}
                          placeholder="e.g., Senior Product Manager"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="target-company">Target Company (Optional)</Label>
                        <Input
                          id="target-company"
                          value={variationMetadata.targetCompany}
                          onChange={(e) => setVariationMetadata({ ...variationMetadata, targetCompany: e.target.value })}
                          placeholder="e.g., TechCorp"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowSaveModeSelection(false)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => saveContent(saveMode)}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        {saveMode === 'replace' ? 'Update Content' : 'Create Variation'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
