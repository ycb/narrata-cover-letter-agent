import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
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
  existingContent?: string;
}

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
              content = `I am writing to express my strong interest in the Senior Product Manager position at TechCorp. With over 5 years of experience in product management and a passion for data-driven decision making, I have consistently delivered measurable results that demonstrate my value. ${gap.suggestion}.\n\nFor example, in my previous role at InnovateTech, I increased user engagement by 35% through A/B testing and optimization, reduced customer churn by 40% through improved onboarding flows, and directly contributed to a 25% improvement in overall team productivity through streamlined processes and clear KPIs. My experience with SQL, Python, and analytics tools like Tableau has enabled me to make data-informed decisions that drive business growth.`;
            } else {
              content = `I am writing to express my strong interest in this position. ${gap.suggestion}.\n\nMy background includes extensive experience with the required technologies, and I am confident I can contribute immediately to your team's success.`;
            }
            break;
            
          case 'experience':
            if (gap.type === 'core-requirement') {
              content = `In my previous role as a Senior Product Manager at InnovateTech, I successfully ${gap.suggestion.toLowerCase()}.\n\nSpecifically, I led cross-functional teams of 8-12 engineers, designers, and analysts to deliver products that met both user needs and business objectives. My hands-on experience with SQL, Python, and analytics platforms like Tableau and Looker has enabled me to dive deep into data to inform product decisions and measure success. I've consistently delivered products that exceed user expectations while meeting business goals.`;
            } else if (gap.type === 'preferred-requirement') {
              content = `Beyond technical skills, I also bring strong leadership experience to the table. ${gap.suggestion}.\n\nI led a team of 8 product managers and successfully delivered 12 major product launches on time and under budget, demonstrating my ability to manage both technical and business challenges. My experience in SaaS and fintech has given me deep insights into user behavior and market dynamics.`;
            }
            break;
            
          case 'closing':
            content = `I am particularly excited about this opportunity at TechCorp because ${gap.suggestion.toLowerCase()}.\n\nYour focus on sustainable technology solutions and commitment to innovation aligns perfectly with my values and experience. I led a green technology initiative that reduced our infrastructure costs by 30% while improving performance, demonstrating my ability to balance technical excellence with business impact and environmental responsibility. My combination of technical expertise, proven track record of delivering results, and passion for sustainable solutions makes me confident I can contribute significantly to your team's success. I look forward to discussing how my background aligns with your needs and how I can help drive TechCorp's mission forward.`;
            break;
            
          case 'role-description':
            content = `Led product strategy for core platform. I increased user engagement by 35% through data-driven product decisions, reduced customer churn by 40% through improved user experience flows, and delivered $2M in additional revenue through strategic feature launches. My experience with SQL, Python, and analytics tools like Tableau enabled me to make informed decisions that drove measurable business impact.`;
            break;
            
          case 'outcome-metrics':
            content = `Increased user engagement by 25% and reduced churn by 15%, ${gap.suggestion.toLowerCase()}.\n\nSpecifically, I achieved a 35% increase in daily active users through A/B testing and optimization, reduced customer acquisition cost by 30% through improved conversion funnels, and delivered $1.5M in additional revenue through strategic product initiatives. These metrics were measured over a 12-month period and validated through user research and business impact analysis.`;
            break;
            
          case 'story-content':
            content = `Successfully launched new product features that improved user experience, ${gap.suggestion.toLowerCase()}.\n\nSpecifically, I led the development of a recommendation engine that increased user engagement by 45%, implemented a streamlined checkout process that reduced cart abandonment by 25%, and introduced personalization features that boosted user retention by 30%. These features were built using React, Node.js, and machine learning algorithms, resulting in $500K in additional monthly revenue.`;
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
            Generate Content
          </DialogTitle>
          <DialogDescription>
            Generate enhanced content to address this gap
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Gap Context */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Gap Analysis</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={gap.severity === 'high' ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'}>
                    {gap.severity} priority
                  </Badge>
                  <Badge variant="outline">
                    {gap.type.replace('-', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">Issue:</h4>
                  <p className="text-sm text-muted-foreground">{gap.description}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">Suggestion:</h4>
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
                  {gap.existingContent || 
                    (gap.paragraphId === 'intro' && "I am writing to express my strong interest in the Senior Software Engineer position at TechCorp. With over 5 years of experience in full-stack development and a passion for creating innovative solutions, I am excited about the opportunity to contribute to your team's mission of building cutting-edge technology.") ||
                    (gap.paragraphId === 'experience' && "In my previous role as a Lead Developer at InnovateTech, I successfully architected and implemented a microservices platform that reduced system latency by 40% and improved scalability for over 100,000 daily active users. My expertise in React, Node.js, and cloud technologies aligns perfectly with TechCorp's technology stack.") ||
                    (gap.paragraphId === 'closing' && "What particularly excites me about TechCorp is your commitment to innovation and sustainable technology solutions. I led a green technology initiative that reduced our infrastructure costs by 30% while improving performance, demonstrating my ability to balance technical excellence with business impact.") ||
                    "No existing content available."
                  }
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
                      <Button variant="secondary" onClick={handleRegenerate}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={handleClose}>
                        Cancel
                      </Button>
                      <Button onClick={handleApply}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Apply Content
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
