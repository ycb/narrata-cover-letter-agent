import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LinkIcon, Upload, Wand2, RefreshCw, Save, Send, X } from "lucide-react";

interface CoverLetterCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CoverLetterCreateModal = ({ isOpen, onClose }: CoverLetterCreateModalProps) => {
  const [jobDescriptionMethod, setJobDescriptionMethod] = useState<'url' | 'paste'>('url');
  const [jobUrl, setJobUrl] = useState('');
  const [jobContent, setJobContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetterGenerated, setCoverLetterGenerated] = useState(false);

  // Mock data for generated cover letter
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

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate API call
    setTimeout(() => {
      setIsGenerating(false);
      setCoverLetterGenerated(true);
    }, 3000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getGoNoGoColor = (status: string) => {
    switch (status) {
      case 'go': return 'bg-success text-success-foreground';
      case 'needs-work': return 'bg-warning text-warning-foreground';
      case 'no-go': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleClose = () => {
    // Reset form state when closing
    setJobUrl('');
    setJobContent('');
    setCoverLetterGenerated(false);
    setIsGenerating(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">Create Cover Letter</DialogTitle>
              <DialogDescription className="text-base">
                Generate a personalized cover letter for your job application
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
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

            {/* LLM Feedback */}
            {coverLetterGenerated && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    LLM Analysis
                    <Badge className={getGoNoGoColor(mockGeneratedLetter.llmFeedback.goNoGo)}>
                      {mockGeneratedLetter.llmFeedback.goNoGo.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Confidence Score:</span>
                    <span className={`font-bold ${getScoreColor(mockGeneratedLetter.llmFeedback.score)}`}>
                      {mockGeneratedLetter.llmFeedback.score}%
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Suggestions for Improvement:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {mockGeneratedLetter.llmFeedback.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-accent">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Matched {mockGeneratedLetter.llmFeedback.matchedBlurbs.length} blurbs from your library
                    </span>
                  </div>
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
  );
};

export default CoverLetterCreateModal;
