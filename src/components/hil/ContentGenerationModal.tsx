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
    
    // Mock content generation based on gap type and suggestion
    setTimeout(() => {
      let content = '';
      
      switch (gap.type) {
        case 'core-requirement':
          content = `I have extensive experience with ${gap.description.toLowerCase().includes('python') ? 'Python' : 'the required technologies'}, having successfully delivered multiple projects that demonstrate my expertise. In my previous role, I ${gap.suggestion.toLowerCase().includes('python') ? 'developed a Python-based data processing pipeline that improved efficiency by 40%' : 'implemented solutions that directly address this requirement'}.\n\nThis experience aligns perfectly with your needs and demonstrates my ability to contribute immediately to your team's success.`;
          break;
          
        case 'preferred-requirement':
          content = `Beyond the core requirements, I also bring ${gap.description.toLowerCase().includes('leadership') ? 'strong leadership experience' : 'additional valuable skills'} to the table. ${gap.suggestion}.\n\nThis combination of technical expertise and ${gap.description.toLowerCase().includes('leadership') ? 'leadership' : 'additional skills'} makes me an ideal candidate for this role.`;
          break;
          
        case 'best-practice':
          content = `I believe in backing up claims with concrete results. ${gap.suggestion}.\n\nFor example, in my previous position, I ${gap.description.toLowerCase().includes('metrics') ? 'increased user engagement by 35% and reduced system downtime by 60%' : 'delivered measurable improvements'} that directly impacted the company's bottom line.`;
          break;
          
        case 'content-enhancement':
          content = `To further strengthen my application, I want to highlight ${gap.suggestion.toLowerCase()}.\n\nThis demonstrates my commitment to continuous improvement and my ability to deliver exceptional results.`;
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
            AI-powered content generation to address: {gap.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Gap Context */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Gap Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={gap.severity === 'high' ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'}>
                  {gap.severity} priority
                </Badge>
                <Badge variant="outline">
                  {gap.type.replace('-', ' ')}
                </Badge>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Issue:</h4>
                <p className="text-sm text-muted-foreground">{gap.description}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Impact:</h4>
                <p className="text-sm text-muted-foreground">{gap.impact}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Suggestion:</h4>
                <p className="text-sm text-muted-foreground">{gap.suggestion}</p>
              </div>
            </CardContent>
          </Card>

          {/* Content Generation */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Generated Content</CardTitle>
                <div className="flex items-center gap-2">
                  {contentQuality === 'draft' && (
                    <Badge variant="outline" className="text-muted-foreground">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Draft
                    </Badge>
                  )}
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
