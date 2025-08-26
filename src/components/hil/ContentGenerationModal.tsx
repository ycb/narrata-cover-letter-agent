import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import type { GapAnalysis } from './HILProgressPanel';

interface ContentGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  gap: GapAnalysis | null;
  onApplyContent: (content: string) => void;
}

export function ContentGenerationModal({
  isOpen,
  onClose,
  gap,
  onApplyContent
}: ContentGenerationModalProps) {
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [contentQuality, setContentQuality] = useState<'draft' | 'review' | 'ready'>('draft');

  const handleGenerate = async () => {
    if (!gap) return;
    
    setIsGenerating(true);
    
    // Mock content generation based on gap type, suggestion, and paragraph context
    setTimeout(() => {
      let content = '';
      
      // Generate content specific to the paragraph and gap
      switch (gap.paragraphId) {
        case 'intro':
          if (gap.type === 'best-practice') {
            content = `I am writing to express my strong interest in this position. With over 5 years of experience in the field, I have consistently delivered measurable results that demonstrate my value. ${gap.suggestion}.\n\nFor example, in my previous role, I increased user engagement by 35% and reduced system downtime by 60%, directly contributing to a 25% improvement in overall team productivity.`;
          } else {
            content = `I am writing to express my strong interest in this position. ${gap.suggestion}.\n\nMy background includes extensive experience with the required technologies, and I am confident I can contribute immediately to your team's success.`;
          }
          break;
          
        case 'experience':
          if (gap.type === 'core-requirement') {
            content = `In my previous role as a Lead Developer, I successfully ${gap.suggestion.toLowerCase()}.\n\nSpecifically, I developed and maintained systems using the latest technologies, ensuring high performance and scalability. This hands-on experience with the core requirements makes me an ideal candidate for your team.`;
          } else if (gap.type === 'preferred-requirement') {
            content = `Beyond technical skills, I also bring strong leadership experience to the table. ${gap.suggestion}.\n\nI led a team of 8 developers and successfully delivered 12 major projects on time and under budget, demonstrating my ability to manage both technical and business challenges.`;
          }
          break;
          
        case 'closing':
          content = `I am particularly excited about this opportunity because ${gap.suggestion.toLowerCase()}.\n\nMy combination of technical expertise and proven track record of delivering results makes me confident I can contribute significantly to your team's success. I look forward to discussing how my background aligns with your needs.`;
          break;
          
        default:
          content = `I am confident that my background and experience make me an excellent fit for this position. ${gap.suggestion}.\n\nI look forward to discussing how I can contribute to your team's success.`;
      }
      
      setGeneratedContent(content);
      setContentQuality('review');
      setIsGenerating(false);
    }, 2000);
  };

  const handleRegenerate = () => {
    setGeneratedContent('');
    setContentQuality('draft');
    handleGenerate();
  };

  const handleApply = () => {
    if (generatedContent.trim()) {
      onApplyContent(generatedContent);
      onClose();
      // Reset state
      setGeneratedContent('');
      setContentQuality('draft');
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setGeneratedContent('');
    setContentQuality('draft');
  };

  if (!gap) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Content for Gap
          </DialogTitle>
          <DialogDescription>
            Generate enhanced content to address this gap
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Gap Context */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Gap Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={gap.severity === 'high' ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'}>
                  {gap.severity} priority
                </Badge>
                <Badge variant="outline">
                  {gap.type.replace('-', ' ')}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Issue:</h4>
                  <p className="text-sm text-muted-foreground">{gap.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Suggestion:</h4>
                  <p className="text-sm text-muted-foreground">{gap.suggestion}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing Content */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Existing Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {gap.paragraphId === 'intro' && "I am writing to express my strong interest in the Senior Software Engineer position at TechCorp. With over 5 years of experience in full-stack development and a passion for creating innovative solutions, I am excited about the opportunity to contribute to your team's mission of building cutting-edge technology."}
                  {gap.paragraphId === 'experience' && "In my previous role as a Lead Developer at InnovateTech, I successfully architected and implemented a microservices platform that reduced system latency by 40% and improved scalability for over 100,000 daily active users. My expertise in React, Node.js, and cloud technologies aligns perfectly with TechCorp's technology stack."}
                  {gap.paragraphId === 'closing' && "What particularly excites me about TechCorp is your commitment to innovation and sustainable technology solutions. I led a green technology initiative that reduced our infrastructure costs by 30% while improving performance, demonstrating my ability to balance technical excellence with business impact."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Content Generation */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {!generatedContent ? 'Generated Content' : 'Generated Content'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {contentQuality === 'review' && (
                    <Badge variant="outline" className="text-warning">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Review
                    </Badge>
                  )}
                  {contentQuality === 'ready' && (
                    <Badge variant="outline" className="text-success">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ready
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!generatedContent ? (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Click "Generate Content" to create AI-powered content that addresses this gap.
                  </p>
                  <Button onClick={handleGenerate} disabled={isGenerating}>
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
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleRegenerate}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleClose}>
                        Cancel
                      </Button>
                      <Button onClick={handleApply}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Apply to Cover Letter
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
