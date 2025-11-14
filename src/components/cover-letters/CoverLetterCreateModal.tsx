import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { LinkIcon, Upload, Wand2, RefreshCw, Save, Send, AlertTriangle, CheckCircle, X, Target, Pencil, Sparkles } from "lucide-react";
import { HILProgressPanel } from "@/components/hil/HILProgressPanel";
import { GapAnalysisPanel } from "@/components/hil/GapAnalysisPanel";
import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";
import { UnifiedGapCard } from "@/components/hil/UnifiedGapCard";
import { CoverLetterFinalization } from "./CoverLetterFinalization";
import { ProgressIndicatorWithTooltips } from "./ProgressIndicatorWithTooltips";
import { ContentCard } from "@/components/shared/ContentCard";
import { UserGoalsModal } from "@/components/user-goals/UserGoalsModal";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserGoals } from "@/contexts/UserGoalsContext";
import { useUserVoice } from "@/contexts/UserVoiceContext";
import { usePMLevel } from "@/hooks/usePMLevel";
import { GoNoGoService } from "@/services/goNoGoService";
import { CoverLetterDraftService, type DetailedMatchAnalysis } from "@/services/coverLetterDraftService";
import { useToast } from "@/hooks/use-toast";

interface CoverLetterCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCoverLetterCreated?: (coverLetter: any) => void;
}

// Enhanced Go/No-Go analysis interface
interface GoNoGoAnalysis {
  decision: 'go' | 'no-go';
  confidence: number;
  mismatches: {
    type: 'geography' | 'pay' | 'core-requirements' | 'work-history';
    severity: 'high' | 'medium' | 'low';
    description: string;
    userOverride?: boolean;
  }[];
}

// HIL Progress Metrics interface
interface HILProgressMetrics {
  goalsMatch: 'strong' | 'average' | 'weak';
  experienceMatch: 'strong' | 'average' | 'weak';
  coverLetterRating: 'strong' | 'average' | 'weak';
  atsScore: number;
  coreRequirementsMet: { met: number; total: number };
  preferredRequirementsMet: { met: number; total: number };
}

// Gap Analysis interface
interface GapAnalysis {
  id: string;
  type: 'core-requirement' | 'preferred-requirement' | 'best-practice' | 'content-enhancement';
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
  paragraphId?: string;
  requirementId?: string;
  origin: 'ai' | 'human' | 'library';
  addresses?: string[];
}

const CoverLetterCreateModal = ({ isOpen, onClose, onCoverLetterCreated }: CoverLetterCreateModalProps) => {
  // Hooks
  const { user } = useAuth();
  const { toast } = useToast();
  const { goals } = useUserGoals();
  const { voice } = useUserVoice();
  const { levelData } = usePMLevel();

  // Services
  const [goNoGoService] = useState(() => new GoNoGoService());
  const [draftService] = useState(() => new CoverLetterDraftService());

  // State - with sessionStorage persistence to prevent loss on tab switch
  const [jobDescriptionMethod, setJobDescriptionMethod] = useState<'url' | 'paste'>(() => {
    const saved = sessionStorage.getItem('coverLetterModal_jobMethod');
    return (saved as 'url' | 'paste') || 'paste';
  });

  const [jobUrl, setJobUrl] = useState(() => {
    return sessionStorage.getItem('coverLetterModal_jobUrl') || '';
  });

  const [jobContent, setJobContent] = useState(() => {
    return sessionStorage.getItem('coverLetterModal_jobContent') || '';
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatingStep, setGeneratingStep] = useState('');
  const [generatingDetail, setGeneratingDetail] = useState('');
  const [coverLetterGenerated, setCoverLetterGenerated] = useState(() => {
    return sessionStorage.getItem('coverLetterModal_generated') === 'true';
  });
  const [goNoGoAnalysis, setGoNoGoAnalysis] = useState<GoNoGoAnalysis | null>(null);
  const [showGoNoGoModal, setShowGoNoGoModal] = useState(false);
  const [userOverrideDecision, setUserOverrideDecision] = useState(false);
  const [hilProgressMetrics, setHilProgressMetrics] = useState<HILProgressMetrics | null>(null);
  const [detailedAnalysis, setDetailedAnalysis] = useState<DetailedMatchAnalysis | null>(null);
  const [gaps, setGaps] = useState<GapAnalysis[]>([]);
  const [hilCompleted, setHilCompleted] = useState(false);
  const [showContentGenerationModal, setShowContentGenerationModal] = useState(false);
  const [selectedGap, setSelectedGap] = useState<GapAnalysis | null>(null);
  const [mainTabValue, setMainTabValue] = useState<'job-description' | 'cover-letter'>('cover-letter');
  const [showFinalizationModal, setShowFinalizationModal] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [currentJobDescription, setCurrentJobDescription] = useState<{ id: string; role?: string; company?: string; location?: string; salary?: string; extracted_requirements?: string[]; } | null>(null);
  const [showGoalsModal, setShowGoalsModal] = useState(false);





  // Persist state to sessionStorage to survive tab switches
  useEffect(() => {
    sessionStorage.setItem('coverLetterModal_jobMethod', jobDescriptionMethod);
  }, [jobDescriptionMethod]);

  useEffect(() => {
    sessionStorage.setItem('coverLetterModal_jobUrl', jobUrl);
  }, [jobUrl]);

  useEffect(() => {
    sessionStorage.setItem('coverLetterModal_jobContent', jobContent);
  }, [jobContent]);

  useEffect(() => {
    sessionStorage.setItem('coverLetterModal_generated', String(coverLetterGenerated));
  }, [coverLetterGenerated]);

  // Clear sessionStorage when modal is explicitly closed
  // Track previous isOpen state to only clear on transitions from true -> false
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    if (prevIsOpenRef.current && !isOpen) {
      // Only clear when modal was open and now is closed (explicit user action)
      sessionStorage.removeItem('coverLetterModal_jobMethod');
      sessionStorage.removeItem('coverLetterModal_jobUrl');
      sessionStorage.removeItem('coverLetterModal_jobContent');
      sessionStorage.removeItem('coverLetterModal_generated');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Enhanced mock data for generated cover letter
  const [generatedLetter, setGeneratedLetter] = useState({
    sections: [
      {
        id: 'intro',
        type: 'intro',
        content: "I am writing to express my strong interest in the Senior Software Engineer position at TechCorp. With over 5 years of experience in full-stack development and a passion for creating innovative solutions, I am excited about the opportunity to contribute to your team's mission of building cutting-edge technology.",
        usedBlurbs: ['blurb-1', 'blurb-2'],
        isModified: false
      },
      {
        id: 'experience',
        type: 'experience',
        content: "In my previous role as a Lead Developer at InnovateTech, I successfully architected and implemented a microservices platform that reduced system latency by 40% and improved scalability for over 100,000 daily active users. My expertise in React, Node.js, and cloud technologies aligns perfectly with TechCorp's technology stack.",
        usedBlurbs: ['blurb-3', 'blurb-4'],
        isModified: false
      },
      {
        id: 'closing',
        type: 'closing',
        content: "What particularly excites me about TechCorp is your commitment to innovation and sustainable technology solutions. I led a green technology initiative that reduced our infrastructure costs by 30% while improving performance, demonstrating my ability to balance technical excellence with business impact.",
        usedBlurbs: ['blurb-5'],
        isModified: false
      },
      {
        id: 'signature',
        type: 'signature',
        content: "I look forward to discussing how my background aligns with your needs and how I can contribute to TechCorp's continued success.\n\nBest regards,\n[Your Name]\n[Your Phone]\n[Your Email]\n[Your LinkedIn]",
        usedBlurbs: [],
        isModified: false
      }
    ],
    llmFeedback: {
      goNoGo: 'go' as const,
      score: 87,
      matchedBlurbs: ['blurb-1', 'blurb-2', 'blurb-3', 'blurb-4', 'blurb-5'],
      gaps: [],
      suggestions: [
        'Consider adding specific metrics about team leadership',
        'Mention experience with the specific frameworks mentioned in the job description'
      ]
    }
  });

  // Generate cover letter draft using real services
  const handleGenerate = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a cover letter',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setGeneratingStep('Starting analysis...');
    setGeneratingProgress(0);

    try {
      // Step 1: Analyze Go/No-Go (integrated into progress flow)
      setGeneratingStep('Analyzing job fit...');
      setGeneratingProgress(5);
      setGeneratingDetail('Checking if this role matches your profile');

      const analysis = await goNoGoService.analyzeJobFit(user.id, jobContent || jobUrl);
      setGoNoGoAnalysis(analysis);

      // If no-go, show inline warning and let user decide to continue
      if (analysis.decision === 'no-go') {
        setIsGenerating(false);
        setShowGoNoGoModal(true);
        return;
      }

      // Step 2: Create draft using DraftService with streaming progress
      const draft = await draftService.createDraftWithProgress(
        user.id,
        jobContent || jobUrl,
        (step, progress, detail) => {
          setGeneratingStep(step);
          setGeneratingProgress(progress);
          setGeneratingDetail(detail || '');
        },
        jobDescriptionMethod === 'url' ? jobUrl : undefined,
        goals,
        voice,
        levelData?.levelCode,
        goNoGoAnalysis
      );

      // Step 3: Update state with draft data and show result (no toast)
      setCurrentDraftId(draft.draftId);
      setCurrentJobDescription(draft.jobDescription);
      setGeneratedLetter({ sections: draft.sections });
      setHilProgressMetrics(draft.metrics);
      setDetailedAnalysis(draft.detailedAnalysis || null);
      setGaps(draft.gaps);
      setCoverLetterGenerated(true);
      setIsGenerating(false);

      // Clear progress state
      setGeneratingStep('');
      setGeneratingProgress(0);
      setGeneratingDetail('');
    } catch (error) {
      console.error('Error generating cover letter:', error);
      setIsGenerating(false);

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate cover letter',
        variant: 'destructive',
      });
    }
  };

  const handleGoNoGoOverride = async () => {
    if (!user) return;

    setUserOverrideDecision(true);
    setShowGoNoGoModal(false);
    setIsGenerating(true);
    setGeneratingStep('Continuing with draft...');
    setGeneratingProgress(5);

    try {
      // Mark user override in analysis
      if (goNoGoAnalysis) {
        const overriddenAnalysis = goNoGoService.markUserOverride(goNoGoAnalysis);
        setGoNoGoAnalysis(overriddenAnalysis);
      }

      // Proceed with draft creation despite no-go
      const draft = await draftService.createDraftWithProgress(
        user.id,
        jobContent || jobUrl,
        (step, progress, detail) => {
          setGeneratingStep(step);
          setGeneratingProgress(progress);
          setGeneratingDetail(detail || '');
        },
        jobDescriptionMethod === 'url' ? jobUrl : undefined,
        goals,
        voice,
        levelData?.levelCode,
        goNoGoAnalysis
      );

      setCurrentDraftId(draft.draftId);
      setCurrentJobDescription(draft.jobDescription);
      setGeneratedLetter({ sections: draft.sections });
      setHilProgressMetrics(draft.metrics);
      setDetailedAnalysis(draft.detailedAnalysis || null);
      setGaps(draft.gaps);
      setCoverLetterGenerated(true);
      setIsGenerating(false);

      // Clear progress state
      setGeneratingStep('');
      setGeneratingProgress(0);
      setGeneratingDetail('');
    } catch (error) {
      console.error('Error generating cover letter:', error);
      setIsGenerating(false);

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate cover letter',
        variant: 'destructive',
      });
    }
  };

  const handleGoNoGoReturn = () => {
    setShowGoNoGoModal(false);
    setGoNoGoAnalysis(null);
    setIsGenerating(false);
  };

  // HIL Action Handlers
  const handleAddressGap = (gap: GapAnalysis) => {
    setSelectedGap(gap);
    setShowContentGenerationModal(true);
  };

  const handleGenerateContent = () => {
    // Generate content for the first available gap
    const firstGap = gaps[0];
    if (firstGap) {
      setSelectedGap(firstGap);
      setShowContentGenerationModal(true);
    }
  };

  const handleFinalizeLetter = () => {
    setShowFinalizationModal(true);
  };

  const handleSaveCoverLetter = async () => {
    if (!currentDraftId || !user) {
      toast({
        title: 'Error',
        description: 'No draft found to save',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Import supabase
      const { supabase } = await import('@/lib/supabase');

      // Update draft status to 'finalized' in database
      await draftService.updateDraft(
        currentDraftId,
        generatedLetter.sections,
        gaps,
        hilProgressMetrics || undefined
      );

      // Also update status field
      const { error } = await supabase
        .from('cover_letters')
        .update({ status: 'finalized' })
        .eq('id', currentDraftId);

      if (error) {
        throw new Error(`Failed to finalize draft: ${error.message}`);
      }

      toast({
        title: 'Success',
        description: 'Cover letter saved successfully',
      });

      // Call parent callback if provided
      if (onCoverLetterCreated) {
        onCoverLetterCreated({
          id: currentDraftId,
          status: 'finalized',
          sections: generatedLetter.sections,
          metrics: hilProgressMetrics,
        });
      }

      // Close modals
      setShowFinalizationModal(false);
      onClose();
    } catch (error) {
      console.error('Error saving cover letter:', error);

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save cover letter',
        variant: 'destructive',
      });
    }
  };



  const handleApplyGeneratedContent = (content: string) => {
    console.log('Applying generated content:', content);
    
    if (!selectedGap?.paragraphId) return;
    
    // Find and update the specific paragraph section
    const updatedSections = generatedLetter.sections.map(section => {
      if (section.type === selectedGap.paragraphId) {
        return {
          ...section,
          content: content,
          isEnhanced: true
        };
      }
      return section;
    });
    
    // Update the generated letter with the enhanced content
    setGeneratedLetter(prev => ({
      ...prev,
      sections: updatedSections
    }));
    
    // Update HIL metrics to reflect improvement
    if (hilProgressMetrics) {
      const updatedMetrics = { ...hilProgressMetrics };
      
      // Improve scores based on content enhancement
      updatedMetrics.coverLetterRating = 'strong';
      updatedMetrics.atsScore = 90; // Increase to 90%
      updatedMetrics.coreRequirementsMet = { met: 4, total: 4 }; // All core requirements met
      updatedMetrics.preferredRequirementsMet = { met: 2, total: 4 }; // 2 preferred requirements met
      
      setHilProgressMetrics(updatedMetrics);
    }
    
    // Remove the addressed gap
    if (selectedGap) {
      setGaps(prevGaps => prevGaps.filter(gap => gap.id !== selectedGap.id));
    }
    
    // Mark HIL as completed when gaps are addressed
    setHilCompleted(true);
    
    // Close the modal and return to draft view
    setShowContentGenerationModal(false);
    setSelectedGap(null);
    
    // Force re-render to show updated content and metrics
    // Note: We don't need to toggle coverLetterGenerated state here
    // as it should remain true after generation
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getGoNoGoColor = (status: string) => {
    switch (status) {
      case 'go': return 'bg-success text-success-foreground';
      case 'no-go': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'strong': return 'text-success';
      case 'average': return 'text-warning';
      case 'weak': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  // Get requirements from real job description data
  const getRequirementsForSection = (): string[] => {
    return currentJobDescription?.extracted_requirements || [];
  };

  const handleClose = () => {
    // Allow closing at any time - user can re-open and start fresh
    // Reset form state when closing
    setJobUrl('');
    setJobContent('');
    setCoverLetterGenerated(false);
    setIsGenerating(false);
    setGoNoGoAnalysis(null);
    setUserOverrideDecision(false);
    setHilProgressMetrics(null);
    setGaps([]);
    setCurrentDraftId(null);
    setCurrentJobDescription(null);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => {
        // DO NOT close on blur/tab switch
        // Only close via explicit X button or Cancel actions
      }} modal={false}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-2xl font-bold">Create Cover Letter</DialogTitle>
            <DialogDescription className="text-base">
              Generate a personalized cover letter for your job application
            </DialogDescription>
          </DialogHeader>

          {/* Top Progress Bar with Tooltips - Show when draft is ready */}
          {hilProgressMetrics && coverLetterGenerated && (
            <ProgressIndicatorWithTooltips
              metrics={hilProgressMetrics}
              className="mb-4"
              isPostHIL={hilCompleted} // Show post-HIL tooltips after HIL completion
              goNoGoAnalysis={goNoGoAnalysis || undefined}
              jobDescription={currentJobDescription || undefined}
              detailedAnalysis={detailedAnalysis || undefined}
              onEditGoals={() => setShowGoalsModal(true)}
            />
          )}

          {/* Job Description Input - Modal 1 - Only show when NOT generated */}
          {!coverLetterGenerated && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Description</CardTitle>
                <CardDescription>
                  Provide the job description to generate a targeted cover letter
                </CardDescription>
              </CardHeader>
              <CardContent>
                               <Tabs value={jobDescriptionMethod} onValueChange={(value) => setJobDescriptionMethod(value as 'url' | 'paste')}>
                 <TabsList className="grid w-fit grid-cols-2">
                   <TabsTrigger value="url" className="flex items-center gap-2">
                     <LinkIcon className="h-4 w-4" />
                     URL
                   </TabsTrigger>
                   <TabsTrigger value="paste" className="flex items-center gap-2">
                     <Upload className="h-4 w-4" />
                     Paste
                   </TabsTrigger>
                 </TabsList>
                  
                  <TabsContent value="url" className="mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="job-url">Job Posting URL</Label>
                      <Input
                        id="job-url"
                        placeholder="https://company.com/jobs/senior-pm"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="paste" className="mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="job-content">Job Description</Label>
                      <Textarea
                        id="job-content"
                        placeholder="Paste the job description here..."
                        value={jobContent}
                        onChange={(e) => setJobContent(e.target.value)}
                        rows={8}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Progress Display - Show above button when generating */}
                {isGenerating && (
                  <div className="mt-4 space-y-2 p-4 bg-muted/30 rounded-lg border border-muted">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        <span className="font-medium">{generatingStep || 'Processing...'}</span>
                      </div>
                      <span className="text-muted-foreground tabular-nums">{generatingProgress}%</span>
                    </div>
                    {generatingDetail && (
                      <p className="text-xs text-muted-foreground pl-6">{generatingDetail}</p>
                    )}
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${generatingProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || (!jobUrl && !jobContent)}
                  className="w-full mt-4"
                  size="lg"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Cover Letter
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Main Tabs for Draft Modal - Only show when cover letter is generated */}
          {coverLetterGenerated && (
            <div className="w-full">
              <Tabs value={mainTabValue} onValueChange={(value) => setMainTabValue(value as 'job-description' | 'cover-letter')}>
                <TabsList className="grid w-fit grid-cols-2 mb-4">
                    <TabsTrigger value="cover-letter" className="flex items-center gap-2">
                      <Wand2 className="h-4 w-4" />
                      Cover Letter
                    </TabsTrigger>
                    <TabsTrigger value="job-description" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Job Description
                    </TabsTrigger>
                  </TabsList>

                {/* Job Description Tab - Shows full JD with Re-Generate button */}
                <TabsContent value="job-description" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Job Description</CardTitle>
                      <CardDescription>
                        The job description used to generate this cover letter
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Job Description Content</Label>
                        <Textarea
                          value={jobContent || jobUrl}
                          onChange={(e) => setJobContent(e.target.value)}
                          rows={8}
                          className="resize-none"
                        />
                      </div>
                      <Button 
                        variant="outline"
                        className="w-full flex items-center gap-2"
                        size="lg"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Re-Generate Cover Letter
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Cover Letter Tab - Shows draft with content cards */}
                <TabsContent value="cover-letter" className="space-y-6">
                  {/* Single Column Layout - Content Cards */}
                  {generatedLetter.sections.map((section, index) => {
                    const sectionGaps = gaps.filter(gap => gap.paragraphId === section.type);
                    const hasGaps = sectionGaps.length > 0;
                    const sectionTitle = section.type === 'intro' ? 'Introduction' :
                           section.type === 'experience' ? 'Experience' :
                           section.type === 'closing' ? 'Closing' :
                                        section.type === 'signature' ? 'Signature' : section.type;
                    const realRequirements = getRequirementsForSection();

                    return (
                      <ContentCard
                        key={section.id}
                        title={sectionTitle}
                        content={section.content}
                        tags={realRequirements}
                        hasGaps={hasGaps}
                        gaps={sectionGaps.map(g => ({ id: g.id, description: g.description }))}
                        isGapResolved={!hasGaps}
                        onGenerateContent={hasGaps ? () => handleAddressGap(sectionGaps[0]) : undefined}
                        onDismissGap={hasGaps ? () => {
                          // Mock gap dismissal for now
                          setGaps(gaps.filter(g => g.id !== sectionGaps[0].id));
                        } : undefined}
                        onEdit={() => {
                          // Handle inline editing - will be handled by Textarea in children
                        }}
                        onDuplicate={() => {
                          // TODO: Implement duplicate section
                          console.log('Duplicate section:', section.id);
                        }}
                        onDelete={() => {
                          // TODO: Implement delete section
                          console.log('Delete section:', section.id);
                        }}
                        tagsLabel="Job Requirements"
                        showUsage={false}
                        renderChildrenBeforeTags={true}
                        className={cn((section as any).isEnhanced && 'border-success/30')}
                      >
                        {/* Inline editable Textarea - renders before tags */}
                        <div className="mb-6">
                        <Textarea
                          value={section.content}
                            ref={(textarea) => {
                              if (textarea) {
                                // Set initial height based on content
                                textarea.style.height = 'auto';
                                textarea.style.height = `${textarea.scrollHeight}px`;
                              }
                            }}
                            onChange={(e) => {
                              const updatedSections = generatedLetter.sections.map(s => 
                                s.id === section.id ? { ...s, content: e.target.value } : s
                              );
                              setGeneratedLetter({ ...generatedLetter, sections: updatedSections });
                              // Auto-resize textarea
                              e.target.style.height = 'auto';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            className="resize-none overflow-hidden"
                            placeholder="Enter cover letter content..."
                            rows={1}
                          />
                        </div>
                      </ContentCard>
                    );
                  })}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button variant="link" className="flex-1 text-muted-foreground hover:text-foreground">
                      Save Draft
                    </Button>
                    <Button className="flex-1 flex items-center gap-2" onClick={handleFinalizeLetter}>
                      <Send className="h-4 w-4" />
                      Finalize Letter
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}


        </DialogContent>
      </Dialog>

      {/* Go/No-Go Modal */}
      <AlertDialog open={showGoNoGoModal} onOpenChange={setShowGoNoGoModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              No-Go Recommendation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Our analysis suggests this job may not be a good match based on the following factors:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 my-4">
            {goNoGoAnalysis?.mismatches.map((mismatch, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={getSeverityColor(mismatch.severity)}>
                    {mismatch.severity} priority
                  </Badge>
                  <Badge variant="outline">
                    {mismatch.type}
                  </Badge>
                </div>
                <p className="text-sm">{mismatch.description}</p>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleGoNoGoReturn}>
              Return to Job Description
            </AlertDialogCancel>
            <Button variant="warning" onClick={handleGoNoGoOverride} asChild>
              <AlertDialogPrimitive.Action>
                Override & Continue
              </AlertDialogPrimitive.Action>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Content Generation Modal */}
      <ContentGenerationModal
        isOpen={showContentGenerationModal}
        onClose={() => setShowContentGenerationModal(false)}
        gap={selectedGap}
        onApplyContent={handleApplyGeneratedContent}
      />

      {/* Cover Letter Finalization Modal */}
      <CoverLetterFinalization
        isOpen={showFinalizationModal}
        onClose={() => setShowFinalizationModal(false)}
        coverLetter={generatedLetter}
        onBackToDraft={() => setShowFinalizationModal(false)}
        onSave={handleSaveCoverLetter}
      />

      {/* User Goals Modal */}
      <UserGoalsModal
        isOpen={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
        onSave={async (updatedGoals) => {
          await saveGoals(updatedGoals);
          setShowGoalsModal(false);
          // Optionally: Re-run analysis with new goals
          toast({
            title: 'Goals Updated',
            description: 'Your career goals have been updated successfully',
          });
        }}
        initialGoals={goals || undefined}
      />
    </>
  );
};

export default CoverLetterCreateModal;
