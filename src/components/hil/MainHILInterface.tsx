import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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
  Clock,
  Users,
  FileText,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { useHIL } from '@/contexts/HILContext';
import { VariationsHILBridge } from './VariationsHILBridge';
import { HILEditorPanel } from './HILEditorPanel';
import { GapAnalysisPanel } from './GapAnalysisPanel';
import { ATSAssessmentPanel } from './ATSAssessmentPanel';
import { PMAssessmentPanel } from './PMAssessmentPanel';
import { ContentGenerationPanel } from './ContentGenerationPanel';
import type { WorkHistoryBlurb, BlurbVariation } from '@/types/workHistory';
import type { HILContentMetadata, ImprovementSuggestion, GapAnalysis, ContentRecommendation } from '@/types/content';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CoverLetterTemplateService, type SavedSection } from '@/services/coverLetterTemplateService';

interface MainHILInterfaceProps {
  story: WorkHistoryBlurb;
  targetRole: string;
  jobKeywords: string[];
  onContentUpdated: (updatedContent: string) => void;
  onClose: () => void;
}

export function MainHILInterface({
  story,
  targetRole,
  jobKeywords,
  onContentUpdated,
  onClose,
}: MainHILInterfaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { state, dispatch, setActiveSection } = useHIL();
  const [selectedVariation, setSelectedVariation] = useState<BlurbVariation | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'analyzing' | 'generating' | 'reviewing'>('idle');
  const [appliedSuggestions, setAppliedSuggestions] = useState<ImprovementSuggestion[]>([]);
  const [latestAnalysis, setLatestAnalysis] = useState<GapAnalysis | null>(null);

  const workflowSteps = [
    { id: 0, name: 'Select Variation', icon: FileText, description: 'Choose a story variation to work with' },
    { id: 1, name: 'Gap Analysis', icon: Target, description: 'Analyze content gaps and improvement areas' },
    { id: 2, name: 'ATS Assessment', icon: TrendingUp, description: 'Check ATS compatibility and optimization' },
    { id: 3, name: 'PM Assessment', icon: Users, description: 'Evaluate PM role alignment and competencies' },
    { id: 4, name: 'Content Generation', icon: Sparkles, description: 'Generate enhanced content with AI' },
    { id: 5, name: 'Review & Edit', icon: Edit, description: 'Review and finalize the content' },
  ];

  const handleVariationSelect = (variation: BlurbVariation, metadata?: HILContentMetadata) => {
    if (metadata) {
      dispatch({ type: 'UPDATE_METADATA', payload: metadata });
    }
    setSelectedVariation(variation);
    setCurrentStep(1);
    setWorkflowStatus('analyzing');
    setAppliedSuggestions([]);
    setLatestAnalysis(null);
  };

  const handleStepComplete = (step: number) => {
    if (step < workflowSteps.length - 1) {
      const nextStep = step + 1;
      setCurrentStep(nextStep);
      if (nextStep === 4) {
        setWorkflowStatus('generating');
      } else {
        setWorkflowStatus('analyzing');
      }
    } else {
      setWorkflowStatus('reviewing');
    }
  };

  const handleContentGenerated = (content: string) => {
    if (selectedVariation) {
      const updatedVariation = {
        ...selectedVariation,
        content,
      };
      setSelectedVariation(updatedVariation);
      setCurrentStep(5);
      setWorkflowStatus('reviewing');
    }
  };

  const handleSaveContent = () => {
    if (selectedVariation) {
      onContentUpdated(selectedVariation.content);
      setAppliedSuggestions([]);
      setWorkflowStatus('reviewing');
    }
  };

  const handleResetWorkflow = () => {
    setSelectedVariation(null);
    setCurrentStep(0);
    setWorkflowStatus('idle');
    setAppliedSuggestions([]);
    setLatestAnalysis(null);
    dispatch({ type: 'RESET_STATE' });
  };

  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'active';
    return 'pending';
  };

  const getStepIcon = (step: number) => {
    const status = getStepStatus(step);
    const IconComponent = workflowSteps[step].icon;

    if (status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-success" />;
    }
    if (status === 'active') {
      return IconComponent ? <IconComponent className="h-4 w-4 text-primary" /> : null;
    }
    return IconComponent ? <IconComponent className="h-4 w-4 text-muted-foreground" /> : null;
  };

  const handleApplySuggestion = (suggestion: ImprovementSuggestion) => {
    setAppliedSuggestions(prev => {
      if (prev.some(item => item.type === suggestion.type && item.content === suggestion.content)) {
        return prev;
      }
      return [...prev, suggestion];
    });
    setWorkflowStatus('generating');
  };

  const handleViewRelatedContent = (content: ContentRecommendation) => {
    setActiveSection(content.id);
    setWorkflowStatus('reviewing');
  };

  const renderFinalizationSummary = () => {
    if (!latestAnalysis) {
      return null;
    }

    const resolvedGaps = appliedSuggestions.filter(suggestion => suggestion.type === 'fill-gap').length;
    const outstandingGaps = latestAnalysis.paragraphGaps.length - resolvedGaps;

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-4 w-4 text-success" /> Finalization Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-md border bg-muted/30">
              <p className="text-xs text-muted-foreground">Applied Suggestions</p>
              <p className="text-lg font-semibold">{appliedSuggestions.length}</p>
            </div>
            <div className="p-3 rounded-md border bg-muted/30">
              <p className="text-xs text-muted-foreground">Remaining Gaps</p>
              <p className={`text-lg font-semibold ${outstandingGaps === 0 ? 'text-success' : 'text-destructive'}`}>
                {Math.max(outstandingGaps, 0)}
              </p>
            </div>
            <div className="p-3 rounded-md border bg-muted/30">
              <p className="text-xs text-muted-foreground">Auto-tagged Keywords</p>
              <p className="text-lg font-semibold">{latestAnalysis.autoTags?.length ?? 0}</p>
            </div>
          </div>
          {latestAnalysis.autoTags && latestAnalysis.autoTags.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {latestAnalysis.autoTags.slice(0, 6).map(tag => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {latestAnalysis.summary?.targetRole
              ? `Optimized for ${latestAnalysis.summary.targetRole} using differentiator focus on ${latestAnalysis.summary.keywordEmphasis?.join(', ') || 'key requirements'}.`
              : 'Summary data ready for final review.'}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCurrentStep = () => {
    if (currentStep === 0) {
      return (
        <VariationsHILBridge
          story={story}
          variations={story.variations ?? []}
          onVariationEdit={(variation) => undefined}
          onVariationCreate={(content, metadata) => undefined}
          onVariationDelete={(variationId) => undefined}
          onHILEdit={(variation, metadata) => handleVariationSelect(variation, metadata)}
        />
      );
    }

    if (!selectedVariation) {
      return (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Select a Variation</h3>
          <p className="text-muted-foreground">Choose a story variation to begin the HIL workflow</p>
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <GapAnalysisPanel
            variation={selectedVariation}
            targetRole={targetRole}
            jobKeywords={jobKeywords}
            onApplySuggestion={handleApplySuggestion}
            onViewRelatedContent={handleViewRelatedContent}
            onComplete={analysis => {
              setLatestAnalysis(analysis);
              setWorkflowStatus('reviewing');
            }}
          />
        );
      case 2:
        return (
          <ATSAssessmentPanel
            variation={selectedVariation}
            targetRole={targetRole}
            jobKeywords={jobKeywords}
            onOptimizeContent={optimizedContent => {
              setSelectedVariation({ ...selectedVariation, content: optimizedContent });
            }}
            onComplete={() => handleStepComplete(2)}
          />
        );
      case 3:
        return (
          <PMAssessmentPanel
            variation={selectedVariation}
            targetRole={targetRole}
            jobKeywords={jobKeywords}
            onApplySuggestion={() => {
              setWorkflowStatus('analyzing');
            }}
            onComplete={() => handleStepComplete(3)}
          />
        );
      case 4:
        return (
          <ContentGenerationPanel
            variation={selectedVariation}
            targetRole={targetRole}
            jobKeywords={jobKeywords}
            onContentGenerated={handleContentGenerated}
          />
        );
      case 5:
        return (
          <>
            {renderFinalizationSummary()}
            <HILEditorPanel
              variation={selectedVariation}
              story={story}
              metadata={state.metadata as HILContentMetadata}
              onSave={async (content, metadata) => {
                const updatedVariation = { ...selectedVariation, content };
                setSelectedVariation(updatedVariation);
                dispatch({ type: 'UPDATE_METADATA', payload: metadata });
                onContentUpdated(content);
                await persistCrossSaves(content, metadata);
              }}
              onCancel={onClose}
            />
          </>
        );
      default:
        return null;
    }
  };

  const persistCrossSaves = async (content: string, metadata: HILContentMetadata) => {
    if (!user?.id) {
      toast({
        title: 'Not saved to library',
        description: 'Log in to save this edit to Saved Sections or Stories.',
        variant: 'destructive',
      });
      return;
    }

    // Story -> Saved Section
    if (metadata.saveAsSavedSection && metadata.source === 'work-history') {
      try {
        const section: SavedSection = {
          user_id: user.id,
          type: 'paragraph',
          title: story.title || 'Body Paragraph',
          content,
          tags: Array.from(new Set([...(story.tags ?? []), ...(metadata.tags ?? [])])),
          times_used: 0,
          last_used: null,
          source_id: null,
          paragraph_index: null,
          function_type: null,
          purpose_summary: null,
          purpose_tags: story.tags ?? [],
        } as any;

        const created = await CoverLetterTemplateService.createSavedSection(section);
        toast({
          title: 'Saved to Saved Sections',
          description: `Created reusable paragraph: ${created.title}`,
        });
      } catch (error) {
        console.error('[MainHILInterface] Failed to save to Saved Sections', error);
        toast({
          title: 'Save failed',
          description: 'Could not add this edit to Saved Sections.',
          variant: 'destructive',
        });
      }
    }

    // Saved Section -> Story (scoped placeholder)
    if (metadata.saveAsStory && metadata.source === 'reusable') {
      toast({
        title: 'Add to Stories not yet supported here',
        description: 'We need role context to create a story. Save skipped.',
      });
    }
  };

  const appliedSummary = latestAnalysis
    ? `${appliedSuggestions.length}/${latestAnalysis.paragraphGaps.length + latestAnalysis.suggestions.length}`
    : `${appliedSuggestions.length}`;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Human-in-the-Loop Editor</h1>
            </div>
            <Badge variant="outline" className="ml-2">
              {targetRole}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetWorkflow}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex items-center gap-1"
            >
              Close
            </Button>
          </div>
        </div>

        {/* Workflow Progress */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Workflow Progress</h3>
            <div className="flex items-center gap-2">
              <Badge variant={workflowStatus === 'idle' ? 'secondary' : 'default'}>
                {workflowStatus === 'idle' && <Clock className="h-3 w-3 mr-1" />}
                {workflowStatus === 'analyzing' && <BarChart3 className="h-3 w-3 mr-1" />}
                {workflowStatus === 'generating' && <Sparkles className="h-3 w-3 mr-1" />}
                {workflowStatus === 'reviewing' && <Edit className="h-3 w-3 mr-1" />}
                {workflowStatus.charAt(0).toUpperCase() + workflowStatus.slice(1)}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {workflowSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                      getStepStatus(index) === 'completed'
                        ? 'border-success bg-success/10'
                        : getStepStatus(index) === 'active'
                        ? 'border-primary bg-primary/10'
                        : 'border-muted bg-muted/50'
                    }`}
                  >
                    {getStepIcon(index)}
                  </div>
                  <div className="hidden sm:block">
                    <div
                      className={`text-xs font-medium ${
                        getStepStatus(index) === 'completed'
                          ? 'text-success'
                          : getStepStatus(index) === 'active'
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                </div>
                {index < workflowSteps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-4">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {(() => {
                    const IconComponent = workflowSteps[currentStep].icon;
                    return IconComponent ? <IconComponent className="h-5 w-5 text-primary" /> : null;
                  })()}
                  {workflowSteps[currentStep].name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="flex items-center gap-1"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Previous
                    </Button>
                  )}
                  {currentStep < workflowSteps.length - 1 && currentStep > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStepComplete(currentStep)}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                  {currentStep === workflowSteps.length - 1 && (
                    <Button onClick={handleSaveContent} className="flex items-center gap-1">
                      <Save className="h-4 w-4" />
                      Save Content
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-full overflow-auto">{renderCurrentStep()}</CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="border-t bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Quick Actions:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(1)}
              disabled={!selectedVariation}
              className="flex items-center gap-1"
            >
              <Target className="h-4 w-4" />
              Gap Analysis
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(4)}
              disabled={!selectedVariation}
              className="flex items-center gap-1"
            >
              <Sparkles className="h-4 w-4" />
              Generate Content
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(5)}
              disabled={!selectedVariation}
              className="flex items-center gap-1"
            >
              <Edit className="h-4 w-4" />
              Edit Content
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Step {currentStep + 1} of {workflowSteps.length}
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span>Suggestions applied: {appliedSummary}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
