import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Download, Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CoverLetterViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  coverLetter: any;
}

export function CoverLetterViewModal({ isOpen, onClose, coverLetter }: CoverLetterViewModalProps) {
  const [copied, setCopied] = useState(false);

  if (!coverLetter) return null;

  const formatCoverLetter = () => {
    if (!coverLetter.content?.sections) return "";
    
    return coverLetter.content.sections
      .map((section: any) => section.content)
      .join("\n\n");
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
    element.download = `${coverLetter.title.replace(/\s+/g, '_')}_cover_letter.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleShare = async () => {
    console.log('Share button clicked!');
    const text = formatCoverLetter();
    const title = coverLetter.title;
    
    console.log('Share data:', { title, text: text.substring(0, 100) + '...' });
    
    if (navigator.share) {
      console.log('Using Web Share API');
      try {
        await navigator.share({
          title: title,
          text: text,
        });
        console.log('Share successful');
      } catch (err) {
        console.error('Error sharing:', err);
        // Fallback to copy
        console.log('Falling back to copy');
        handleCopy();
      }
    } else {
      // Fallback to copy if Web Share API is not available
      console.log('Web Share API not available, falling back to copy');
      handleCopy();
    }
  };

  const finalLetter = formatCoverLetter();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div>
            <DialogTitle className="text-2xl font-bold">
              {coverLetter.title}
            </DialogTitle>
            <DialogDescription className="text-base">
              View and manage your cover letter
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              onClick={handleShare} 
              className="h-12 flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
