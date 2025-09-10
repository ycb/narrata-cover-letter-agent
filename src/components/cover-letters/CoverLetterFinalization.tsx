import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Copy, Download, Mail, Share2, Star, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CoverLetterSection {
  id: string;
  type: string;
  content: string;
  isEnhanced?: boolean;
}

interface CoverLetterFinalizationProps {
  isOpen: boolean;
  onClose: () => void;
  coverLetter: {
    sections: CoverLetterSection[];
  };
  onBackToDraft: () => void;
  onSave?: () => void;
}

export function CoverLetterFinalization({
  isOpen,
  onClose,
  coverLetter,
  onBackToDraft,
  onSave
}: CoverLetterFinalizationProps) {
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const formatCoverLetter = () => {
    const sections = coverLetter.sections.map(section => {
      let content = section.content;
      
      // Format signature section specially
      if (section.type === 'signature') {
        content = content.replace(/\[Your Name\]/g, 'John Smith');
        content = content.replace(/\[Your Phone\]/g, '(555) 123-4567');
        content = content.replace(/\[Your Email\]/g, 'john.smith@email.com');
        content = content.replace(/\[Your LinkedIn\]/g, 'linkedin.com/in/johnsmith');
      }
      
      return content;
    });
    
    return sections.join('\n\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatCoverLetter());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([formatCoverLetter()], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'cover-letter.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const finalLetter = formatCoverLetter();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBackToDraft}
                  className="p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle className="text-2xl font-bold">
                    Cover Letter Finalized
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    Your cover letter is ready! Copy, download, or share it.
                  </DialogDescription>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  <Star className="h-3 w-3 mr-1" />
                  ATS Optimized
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  AI Enhanced
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Success Metrics */}
            <Card className="bg-gradient-to-r from-success/5 to-primary/5 border-success/20 -mt-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-success">Final Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-success">95%</div>
                    <div className="text-xs text-muted-foreground">ATS Score</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-success">Strong</div>
                    <div className="text-xs text-muted-foreground">Overall Rating</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-success">4/4</div>
                    <div className="text-xs text-muted-foreground">Core Requirements</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-success">3/4</div>
                    <div className="text-xs text-muted-foreground">Preferred Requirements</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cover Letter Preview */}
            <Card className="border-2 border-success/20 bg-success/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  Final Cover Letter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white border rounded-lg p-6 font-serif text-sm leading-relaxed whitespace-pre-line">
                  {finalLetter}
                </div>
              </CardContent>
            </Card>


            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button 
                onClick={handleCopy} 
                variant="outline" 
                className="h-12 flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
              
              <Button 
                onClick={handleDownload} 
                variant="outline"
                className="h-12 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download as Text
              </Button>
              
              <Button 
                onClick={() => setShowShareModal(true)} 
                variant="outline"
                className="h-12 flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>

              {onSave && (
                <Button 
                  onClick={onSave} 
                  className="h-12 flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Save to Cover Letters
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Cover Letter</DialogTitle>
            <DialogDescription>
              Choose how you'd like to share your cover letter
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Mail className="h-4 w-4 mr-2" />
              Email to yourself
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Share2 className="h-4 w-4 mr-2" />
              Copy shareable link
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="h-4 w-4 mr-2" />
              Export to PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
