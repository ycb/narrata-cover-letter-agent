import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LinkIcon, Upload, Wand2, RefreshCw, Save, Send, AlertTriangle, CheckCircle, X } from "lucide-react";
import { HILProgressPanel } from "@/components/hil/HILProgressPanel";
import { ContentGenerationModal } from "@/components/hil/ContentGenerationModal";

interface CoverLetterCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  impact: string;
  suggestion: string;
  canAddress: boolean;
}

const CoverLetterCreateModal = ({ isOpen, onClose }: CoverLetterCreateModalProps) => {
  const [jobDescriptionMethod, setJobDescriptionMethod] = useState<'url' | 'paste'>('url');
  const [jobUrl, setJobUrl] = useState('');
  const [jobContent, setJobContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetterGenerated, setCoverLetterGenerated] = useState(false);
  const [goNoGoAnalysis, setGoNoGoAnalysis] = useState<GoNoGoAnalysis | null>(null);
  const [showGoNoGoModal, setShowGoNoGoModal] = useState(false);
  const [userOverrideDecision, setUserOverrideDecision] = useState(false);
  const [hilProgressMetrics, setHilProgressMetrics] = useState<HILProgressMetrics | null>(null);
  const [gaps, setGaps] = useState<GapAnalysis[]>([]);
  const [showContentGenerationModal, setShowContentGenerationModal] = useState(false);
  const [selectedGap, setSelectedGap] = useState<GapAnalysis | null>(null);

  // Enhanced mock data for generated cover letter
  const mockGeneratedLetter = {
    sections: [
      {
        id: 'intro',
        type: 'intro',
        content: "I am writing to express my strong interest in the Senior Software Engineer position at TechCorp. With over 5 years of experience in full-stack development and a passion for creating innovative solutions, I am excited about the opportunity to contribute to your team's mission of building cutting-edge technology.",
        usedBlurbs: ['blurb-1', 'blurb-2'],
        isModified: false
      },
      {
        id: 'paragraph-1',
        type: 'paragraph',
        content: "In my previous role as a Lead Developer at InnovateTech, I successfully architected and implemented a microservices platform that reduced system latency by 40% and improved scalability for over 100,000 daily active users. My expertise in React, Node.js, and cloud technologies aligns perfectly with TechCorp's technology stack.",
        usedBlurbs: ['blurb-3', 'blurb-4'],
        isModified: false
      },
      {
        id: 'paragraph-2',
        type: 'paragraph',
        content: "What particularly excites me about TechCorp is your commitment to innovation and sustainable technology solutions. I led a green technology initiative that reduced our infrastructure costs by 30% while improving performance, demonstrating my ability to balance technical excellence with business impact.",
        usedBlurbs: ['blurb-5'],
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
  };

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
      coverLetterRating: hasMetrics ? 'strong' : hasLeadership ? 'average' : 'weak',
      atsScore: Math.min(100, 60 + (coreMet * 10) + (preferredMet * 5)),
      coreRequirementsMet: { met: coreMet, total: coreRequirements.length },
      preferredRequirementsMet: { met: preferredMet, total: preferredRequirements.length }
    };
    
    // Generate gaps based on analysis
    const gaps: GapAnalysis[] = [];
    
    if (!hasPython && jobDescription.toLowerCase().includes('python')) {
      gaps.push({
        id: 'python-gap',
        type: 'core-requirement',
        severity: 'high',
        description: 'Python expertise required but not highlighted in experience',
        suggestion: 'Add specific Python projects and achievements',
        paragraphId: 'experience'
      });
    }
    
    if (!hasLeadership && jobDescription.toLowerCase().includes('lead')) {
      gaps.push({
        id: 'leadership-gap',
        type: 'preferred-requirement',
        severity: 'medium',
        description: 'Leadership experience not clearly demonstrated',
        suggestion: 'Highlight team leadership and project management experience',
        paragraphId: 'experience'
      });
    }
    
    if (!hasMetrics) {
      gaps.push({
        id: 'metrics-gap',
        type: 'best-practice',
        severity: 'medium',
        description: 'Quantifiable achievements not prominently featured',
        suggestion: 'Include specific metrics and KPIs from past projects',
        paragraphId: 'intro'
      });
    }
    
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
    setTimeout(() => {
      setIsGenerating(false);
      setCoverLetterGenerated(true);
      
      // Analyze HIL progress after draft generation
      const hilAnalysis = analyzeHILProgress(jobContent || jobUrl);
      setHilProgressMetrics(hilAnalysis.metrics);
      setGaps(hilAnalysis.gaps);
    }, 3000);
  };

  const handleGoNoGoOverride = () => {
    setUserOverrideDecision(true);
    setShowGoNoGoModal(false);
    // Proceed with generation despite no-go
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setCoverLetterGenerated(true);
      
      // Analyze HIL progress after draft generation
      const hilAnalysis = analyzeHILProgress(jobContent || jobUrl);
      setHilProgressMetrics(hilAnalysis.metrics);
      setGaps(hilAnalysis.gaps);
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
    const firstGap = gaps.find(gap => gap.canAddress);
    if (firstGap) {
      setSelectedGap(firstGap);
      setShowContentGenerationModal(true);
    }
  };



  const handleApplyGeneratedContent = (content: string) => {
    console.log('Applying generated content:', content);
    
    if (!selectedGap?.paragraphId) return;
    
    // Find and update the specific paragraph section
    const updatedSections = mockGeneratedLetter.sections.map(section => {
      if (section.type === selectedGap.paragraphId) {
        return {
          ...section,
          content: content,
          isEnhanced: true
        };
      }
      return section;
    });
    
    // Update the mock letter with the enhanced content
    mockGeneratedLetter.sections = updatedSections;
    
    // Update HIL metrics to reflect improvement
    if (hilProgressMetrics) {
      const updatedMetrics = { ...hilProgressMetrics };
      
      // Improve scores based on content enhancement
      updatedMetrics.coverLetterRating = 
        updatedMetrics.coverLetterRating === 'weak' ? 'average' : 
        updatedMetrics.coverLetterRating === 'average' ? 'strong' : 'strong';
      
      updatedMetrics.atsScore = Math.min(100, updatedMetrics.atsScore + 10);
      
      // Update requirements met if applicable
      if (selectedGap?.type === 'core-requirement') {
        updatedMetrics.coreRequirementsMet.met = Math.min(
          updatedMetrics.coreRequirementsMet.total,
          updatedMetrics.coreRequirementsMet.met + 1
        );
      } else if (selectedGap?.type === 'preferred-requirement') {
        updatedMetrics.preferredRequirementsMet.met = Math.min(
          updatedMetrics.preferredRequirementsMet.total,
          updatedMetrics.preferredRequirementsMet.met + 1
        );
      }
      
      setHilProgressMetrics(updatedMetrics);
    }
    
    // Remove the addressed gap
    if (selectedGap) {
      setGaps(prevGaps => prevGaps.filter(gap => gap.id !== selectedGap.id));
    }
    
    // Force re-render by updating state
    setCoverLetterGenerated(false);
    setTimeout(() => setCoverLetterGenerated(true), 100);
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

  const handleClose = () => {
    // Reset form state when closing
    setJobUrl('');
    setJobContent('');
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
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-bold">Create Cover Letter</DialogTitle>
            <DialogDescription className="text-base">
              Generate a personalized cover letter for your job application
            </DialogDescription>
          </DialogHeader>

          {/* Top Progress Bar */}
          {hilProgressMetrics && (
            <div className="w-full bg-card border rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">MATCH WITH GOALS</div>
                  <Badge variant="outline" className={getRatingColor(hilProgressMetrics.goalsMatch)}>
                    {hilProgressMetrics.goalsMatch}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">MATCH WITH EXPERIENCE</div>
                  <Badge variant="outline" className={getRatingColor(hilProgressMetrics.experienceMatch)}>
                    {hilProgressMetrics.experienceMatch}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">COVER LETTER RATING</div>
                  <Badge variant="outline" className={getRatingColor(hilProgressMetrics.coverLetterRating)}>
                    {hilProgressMetrics.coverLetterRating}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">ATS</div>
                  <div className="text-lg font-bold">{hilProgressMetrics.atsScore}%</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Core Reqs</div>
                  <div className="text-lg font-bold">{hilProgressMetrics.coreRequirementsMet.met}/{hilProgressMetrics.coreRequirementsMet.total}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Preferred Reqs</div>
                  <div className="text-lg font-bold">{hilProgressMetrics.preferredRequirementsMet.met}/{hilProgressMetrics.preferredRequirementsMet.total}</div>
                </div>
              </div>
            </div>
          )}

          {/* Job Description Input - Compact */}
          <div className="mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Job Description</CardTitle>
                <CardDescription>
                  Provide the job description to generate a targeted cover letter
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={jobDescriptionMethod} onValueChange={(value) => setJobDescriptionMethod(value as 'url' | 'paste')}>
                  <TabsList className="grid w-full grid-cols-2">
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
                        placeholder="https://company.com/jobs/senior-engineer"
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
                        rows={4}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

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
          </div>

          {/* Main Content Area - Left: Draft, Right: Gap Analysis */}
          {coverLetterGenerated && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Cover Letter Draft */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Generated Cover Letter</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="secondary" size="sm">
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {mockGeneratedLetter.sections.map((section) => (
                      <div key={section.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium capitalize">
                            {section.type}
                          </Label>
                          <div className="flex items-center gap-2">
                            {section.usedBlurbs && section.usedBlurbs.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {section.usedBlurbs.length} blurbs used
                              </Badge>
                            )}
                            {(section as any).isEnhanced && (
                              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI Enhanced
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Textarea
                          value={section.content}
                          onChange={() => {}}
                          rows={4}
                          className={`resize-none ${(section as any).isEnhanced ? 'border-success/30 bg-success/5' : ''}`}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1">
                    Save Draft
                  </Button>
                  <Button className="flex-1 flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Finalize Letter
                  </Button>
                </div>
              </div>

              {/* Right Column - Gap Analysis & Requirements */}
              <div className="space-y-6">
                <GapAnalysisPanel
                  gaps={gaps}
                  requirements={hilProgressMetrics ? {
                    core: hilProgressMetrics.coreRequirementsMet,
                    preferred: hilProgressMetrics.preferredRequirementsMet
                  } : null}
                  onAddressGap={handleAddressGap}
                />
              </div>
            </div>
          )}

          {/* Cover Letter Preview - When not generated */}
          {!coverLetterGenerated && (
            <Card className="h-96 flex items-center justify-center">
              <CardContent className="text-center">
                <Wand2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Cover Letter Preview</h3>
                <p className="text-muted-foreground">
                  Your generated cover letter will appear here
                </p>
              </CardContent>
            </Card>
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
    </>
  );
};

export default CoverLetterCreateModal;
