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

const CoverLetterCreateModal = ({ isOpen, onClose }: CoverLetterCreateModalProps) => {
  const [jobDescriptionMethod, setJobDescriptionMethod] = useState<'url' | 'paste'>('url');
  const [jobUrl, setJobUrl] = useState('');
  const [jobContent, setJobContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetterGenerated, setCoverLetterGenerated] = useState(false);
  const [goNoGoAnalysis, setGoNoGoAnalysis] = useState<GoNoGoAnalysis | null>(null);
  const [showGoNoGoModal, setShowGoNoGoModal] = useState(false);
  const [userOverrideDecision, setUserOverrideDecision] = useState(false);

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
    
    // If go, proceed with generation
    setTimeout(() => {
      setIsGenerating(false);
      setCoverLetterGenerated(true);
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
    }, 3000);
  };

  const handleGoNoGoReturn = () => {
    setShowGoNoGoModal(false);
    setGoNoGoAnalysis(null);
    setIsGenerating(false);
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

  const handleClose = () => {
    // Reset form state when closing
    setJobUrl('');
    setJobContent('');
    setCoverLetterGenerated(false);
    setIsGenerating(false);
    setGoNoGoAnalysis(null);
    setUserOverrideDecision(false);
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Input */}
            <div className="space-y-6">
              {/* Job Description Input */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Description</CardTitle>
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
                          rows={8}
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
                className="w-full flex items-center gap-2"
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

              {/* Go/No-Go Analysis Display */}
              {goNoGoAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Go/No-Go Analysis</span>
                      <Badge className={getGoNoGoColor(goNoGoAnalysis.decision)}>
                        {goNoGoAnalysis.decision.toUpperCase()}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Confidence Score:</span>
                      <span className={`font-bold ${getScoreColor(goNoGoAnalysis.confidence)}`}>
                        {goNoGoAnalysis.confidence}%
                      </span>
                    </div>
                    
                    {goNoGoAnalysis.mismatches.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Identified Mismatches:</h4>
                        <div className="space-y-2">
                          {goNoGoAnalysis.mismatches.map((mismatch, index) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getSeverityColor(mismatch.severity)}>
                                  {mismatch.severity} priority
                                </Badge>
                                <Badge variant="outline">
                                  {mismatch.type}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{mismatch.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {userOverrideDecision && (
                      <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                        <div className="flex items-center gap-2 text-warning">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">User Override Applied</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          You've chosen to proceed despite the no-go recommendation
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Generated Letter */}
            <div className="space-y-6">
              {coverLetterGenerated ? (
                <>
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
                            {section.usedBlurbs && (
                              <Badge variant="outline" className="text-xs">
                                {section.usedBlurbs.length} blurbs used
                              </Badge>
                            )}
                          </div>
                          <Textarea
                            value={section.content}
                            onChange={() => {}}
                            rows={4}
                            className="resize-none"
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
                </>
              ) : (
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
            </div>
          </div>
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
    </>
  );
};

export default CoverLetterCreateModal;
