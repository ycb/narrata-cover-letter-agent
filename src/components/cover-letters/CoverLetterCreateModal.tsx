import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LinkIcon, Upload, Wand2, RefreshCw, Save, Send, AlertTriangle, CheckCircle, X, Target, Pencil, Sparkles } from "lucide-react";
import { HILProgressPanel } from "@/components/hil/HILProgressPanel";
import { GapAnalysisPanel } from "@/components/hil/GapAnalysisPanel";
import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";
import { UnifiedGapCard } from "@/components/hil/UnifiedGapCard";
import { CoverLetterFinalization } from "./CoverLetterFinalization";
import { ProgressIndicatorWithTooltips } from "./ProgressIndicatorWithTooltips";

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
  const [jobDescriptionMethod, setJobDescriptionMethod] = useState<'url' | 'paste'>('paste');
  const [jobUrl, setJobUrl] = useState('');
  const [jobContent, setJobContent] = useState(`Senior Product Manager - Growth & SaaS Platform

Requirements: 6+ years PM experience, SaaS background, growth metrics, SQL/Python, Tableau/Looker, fintech experience

Responsibilities: Lead growth initiatives, analyze user behavior, optimize conversion funnels, collaborate with engineering teams

Nice to have: 1-for ROB SaaS experience, mobile app development, team leadership`);


  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetterGenerated, setCoverLetterGenerated] = useState(false);
  const [goNoGoAnalysis, setGoNoGoAnalysis] = useState<GoNoGoAnalysis | null>(null);
  const [showGoNoGoModal, setShowGoNoGoModal] = useState(false);
  const [userOverrideDecision, setUserOverrideDecision] = useState(false);
  const [hilProgressMetrics, setHilProgressMetrics] = useState<HILProgressMetrics | null>(null);
  const [gaps, setGaps] = useState<GapAnalysis[]>([]);
  const [hilCompleted, setHilCompleted] = useState(false);
  const [showContentGenerationModal, setShowContentGenerationModal] = useState(false);
  const [selectedGap, setSelectedGap] = useState<GapAnalysis | null>(null);
  const [mainTabValue, setMainTabValue] = useState<'job-description' | 'cover-letter'>('cover-letter');
  const [showFinalizationModal, setShowFinalizationModal] = useState(false);





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

  // Enhanced Go/No-Go analysis function
  const analyzeGoNoGo = (jobDescription: string): GoNoGoAnalysis => {
    // Mock analysis - in real implementation, this would call AI service
    const hasGeographyMismatch = jobDescription.toLowerCase().includes('remote') && jobDescription.toLowerCase().includes('new york');
    const hasPayMismatch = jobDescription.toLowerCase().includes('$50,000') || jobDescription.toLowerCase().includes('50k');
    const hasCoreRequirementsGap = jobDescription.toLowerCase().includes('python') && !jobDescription.toLowerCase().includes('javascript');
    const hasWorkHistoryGap = jobDescription.toLowerCase().includes('10+ years') && jobDescription.toLowerCase().includes('senior');

    const mismatches = [];
    
    if (hasGeographyMismatch) {
      mismatches.push({
        type: 'geography',
        severity: 'high',
        description: 'Job requires on-site work in New York, but you prefer remote positions'
      });
    }
    
    if (hasPayMismatch) {
      mismatches.push({
        type: 'pay',
        severity: 'high',
        description: 'Salary range ($50,000) is below your minimum requirements'
      });
    }
    
    if (hasCoreRequirementsGap) {
      mismatches.push({
        type: 'core-requirements',
        severity: 'medium',
        description: 'Job requires Python expertise, but your primary experience is in JavaScript'
      });
    }
    
    if (hasWorkHistoryGap) {
      mismatches.push({
        type: 'work-history',
        severity: 'medium',
        description: 'Job requires 10+ years experience for senior role, but you have 5 years'
      });
    }

    // Binary decision: if any high-severity mismatches, it's a no-go
    const decision = mismatches.some(m => m.severity === 'high') ? 'no-go' : 'go';
    const confidence = Math.max(50, 100 - (mismatches.length * 15));

    return {
      decision,
      confidence,
      mismatches
    };
  };

  // HIL Progress Analysis function
  const analyzeHILProgress = (jobDescription: string): { metrics: HILProgressMetrics; gaps: GapAnalysis[] } => {
    // Mock HIL analysis - in real implementation, this would call AI service
    const hasPython = jobDescription.toLowerCase().includes('python');
    const hasReact = jobDescription.toLowerCase().includes('react');
    const hasLeadership = jobDescription.toLowerCase().includes('lead') || jobDescription.toLowerCase().includes('team');
    const hasMetrics = jobDescription.toLowerCase().includes('metrics') || jobDescription.toLowerCase().includes('kpi');
    
    // Calculate metrics based on job description analysis
    const coreRequirements = ['javascript', 'react', 'node.js', 'api'];
    const preferredRequirements = ['python', 'leadership', 'metrics', 'agile'];
    
    const coreMet = coreRequirements.filter(req => 
      jobDescription.toLowerCase().includes(req)
    ).length;
    const preferredMet = preferredRequirements.filter(req => 
      jobDescription.toLowerCase().includes(req)
    ).length;
    
    const metrics: HILProgressMetrics = {
      goalsMatch: hasLeadership ? 'strong' : hasReact ? 'average' : 'weak',
      experienceMatch: hasReact ? 'strong' : hasPython ? 'average' : 'weak',
      coverLetterRating: 'weak', // Start with weak rating
      atsScore: 65, // Start with 65% ATS score
      coreRequirementsMet: { met: 2, total: 4 }, // 2/4 for demo purposes
      preferredRequirementsMet: { met: 1, total: 4 } // 1/4 for demo purposes
    };
    
    // Generate initial gaps for intro and closing paragraphs
    const gaps: GapAnalysis[] = [
      {
        id: 'intro-gap',
        type: 'best-practice',
        severity: 'medium',
        description: 'Quantifiable achievements not prominently featured',
        suggestion: 'Include specific metrics and KPIs from past projects',
        paragraphId: 'intro',
        origin: 'ai',
        addresses: []
      },
      {
        id: 'closing-gap',
        type: 'preferred-requirement',
        severity: 'medium',
        description: 'Closing statement lacks enthusiasm and specific interest',
        suggestion: 'Add more enthusiasm and specific reasons for interest in the role',
        paragraphId: 'closing',
        origin: 'ai',
        addresses: []
      }
    ];
    
    return { metrics, gaps };
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // First, analyze Go/No-Go
    const analysis = analyzeGoNoGo(jobContent || jobUrl);
    setGoNoGoAnalysis(analysis);
    
    // If no-go, show modal for user decision
    if (analysis.decision === 'no-go') {
      setIsGenerating(false);
      setShowGoNoGoModal(true);
      return;
    }
    
    // If go, proceed with generation and HIL analysis
    // After 3 seconds, show initial analysis (not post-HIL)
    setTimeout(() => {
      const initialAnalysis = analyzeHILProgress(jobContent || jobUrl);
      setHilProgressMetrics(initialAnalysis.metrics);
      setGaps(initialAnalysis.gaps);
      setIsGenerating(false);
      setCoverLetterGenerated(true); // This just means "draft is ready for HIL"
    }, 3000);
  };

  const handleGoNoGoOverride = () => {
    setUserOverrideDecision(true);
    setShowGoNoGoModal(false);
    // Proceed with generation despite no-go
    setIsGenerating(true);
    
    // First, show initial analysis
    const initialAnalysis = analyzeHILProgress(jobContent || jobUrl);
    setHilProgressMetrics(initialAnalysis.metrics);
    setGaps(initialAnalysis.gaps);
    
    // Then after 3 seconds, show post-HIL analysis
    setTimeout(() => {
      setIsGenerating(false);
      setCoverLetterGenerated(true);
    }, 3000);
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

  const handleSaveCoverLetter = () => {
    // Create the cover letter object to save
    const coverLetterToSave = {
      id: `cl-${Date.now()}`,
      title: `${jobContent.split('\n')[0]} - ${jobContent.split('\n')[1]?.split(':')[0] || 'Unknown Company'}`,
      company: jobContent.split('\n')[1]?.split(':')[0] || 'Unknown Company',
      position: jobContent.split('\n')[0] || 'Unknown Position',
      status: 'finalized',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      atsScore: hilProgressMetrics?.atsScore || 85,
      overallRating: hilProgressMetrics?.coverLetterRating || 'average',
      content: generatedLetter,
      metrics: hilProgressMetrics
    };

    // Call the callback to save the cover letter
    if (onCoverLetterCreated) {
      onCoverLetterCreated(coverLetterToSave);
    }

    // Close the modal
    onClose();
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

  // Function to get specific requirements addressed for each paragraph type
  const getRequirementsForParagraph = (paragraphType: string): string[] => {
    switch (paragraphType) {
      case 'intro':
        return ['growth metrics', 'KPIs', 'quantifiable achievements'];
      case 'experience':
        return ['SQL/Python experience', 'technical leadership', 'cross-functional collaboration'];
      case 'closing':
        return ['SaaS background', 'sustainability focus', 'innovation commitment'];
      case 'signature':
        return ['professional closing', 'contact information', 'call to action'];
      default:
        return ['job requirements'];
    }
  };

  const handleClose = () => {
    // Reset form state when closing
    setJobUrl('');
    // Don't reset jobContent - keep the pre-filled Senior PM content
    setCoverLetterGenerated(false);
    setIsGenerating(false);
    setGoNoGoAnalysis(null);
    setUserOverrideDecision(false);
    setHilProgressMetrics(null);
    setGaps([]);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
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

                {/* Generate Button */}
                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating || (!jobUrl && !jobContent)}
                  className="w-full flex items-center gap-2 mt-4"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating Cover Letter...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Generate Cover Letter
                    </>
                  )}
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

                {/* Cover Letter Tab - Shows draft with gap/requirement cards */}
                <TabsContent value="cover-letter" className="space-y-8">
                  {/* Section Headers */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="text-lg font-semibold text-muted-foreground">Cover Letter Draft</div>
                    <div className="text-lg font-semibold text-muted-foreground">Analysis & Requirements</div>
                  </div>
                  
                  {/* Content Grid - Each section gets its own row */}
                  {generatedLetter.sections.map((section, index) => (
                    <div key={section.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                      {/* Left: Section Label + Paragraph Content */}
                      <div className="space-y-4">
                        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          {section.type === 'intro' ? 'Introduction' : 
                           section.type === 'experience' ? 'Experience' : 
                           section.type === 'closing' ? 'Closing' : 
                           section.type === 'signature' ? 'Signature' : section.type}
                        </div>
                        <Textarea
                          value={section.content}
                          onChange={() => {}}
                          className={`resize-none h-[200px] flex items-center ${(section as any).isEnhanced ? 'border-success/30 bg-success/5' : ''}`}
                        />
                      </div>

                      {/* Right: Gap/Requirement Card */}
                      <div className="space-y-4">
                        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          {section.type === 'intro' ? 'Intro Analysis' : 
                           section.type === 'experience' ? 'Experience Analysis' : 
                           section.type === 'closing' ? 'Closing Analysis' : 
                           section.type === 'signature' ? 'Signature Analysis' : 'Analysis'}
                        </div>
                        {(() => {
                          const sectionGaps = gaps.filter(gap => gap.paragraphId === section.type);
                          const isResolved = sectionGaps.length === 0;
                          
                          if (isResolved) {
                            return (
                              <UnifiedGapCard
                                status="met"
                                title="Matches Job Req"
                                addresses={getRequirementsForParagraph(section.type)}
                                origin={section.isEnhanced ? "ai" : "library"}
                                paragraphId={section.type}
                              />
                            );
                          }

                          return sectionGaps.map((gap) => (
                            <UnifiedGapCard
                              key={gap.id}
                              status="gap"
                              title="Issue"
                              issue={gap.description}
                              suggestion={gap.suggestion}
                              origin={gap.origin || 'ai'}
                              paragraphId={gap.paragraphId || section.type}
                              severity={gap.severity}
                              onEdit={() => handleAddressGap(gap)}
                              onGenerate={() => handleAddressGap(gap)}
                            />
                          ));
                        })()}
                      </div>
                    </div>
                  ))}

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
            <AlertDialogAction onClick={handleGoNoGoOverride} className="bg-warning hover:bg-warning/90">
              Override & Continue
            </AlertDialogAction>
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
    </>
  );
};

export default CoverLetterCreateModal;
