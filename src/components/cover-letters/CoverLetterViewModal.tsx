import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Copy, 
  Download, 
  Share2, 
  Star, 
  CheckCircle, 
  TrendingUp,
  Building2,
  User,
  Calendar,
  X,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CoverLetterViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  coverLetter: any;
}

export function CoverLetterViewModal({ isOpen, onClose, coverLetter }: CoverLetterViewModalProps) {
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  if (!coverLetter) return null;

  const formatCoverLetter = () => {
    if (!coverLetter.content?.sections) return "";
    
    return coverLetter.content.sections
      .map((section: any) => section.content)
      .join("\n\n");
  };

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      const formattedLetter = formatCoverLetter();
      await navigator.clipboard.writeText(formattedLetter);
      toast({
        title: "Copied to clipboard",
        description: "Cover letter has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy cover letter to clipboard.",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      const formattedLetter = formatCoverLetter();
      const blob = new Blob([formattedLetter], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${coverLetter.title.replace(/\s+/g, '_')}_cover_letter.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded",
        description: "Cover letter has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download cover letter.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    toast({
      title: "Share feature",
      description: "Share functionality coming soon!",
    });
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "strong":
        return "bg-success text-success-foreground";
      case "average":
        return "bg-warning text-warning-foreground";
      case "weak":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
                <X className="h-4 w-4" />
              </Button>
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {coverLetter.title}
                </DialogTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {coverLetter.company}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {coverLetter.position}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(coverLetter.createdAt)}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <Star className="h-3 w-3 mr-1" /> ATS Optimized
              </Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <CheckCircle className="h-3 w-3 mr-1" /> AI Enhanced
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Success Metrics */}
          <Card className="bg-gradient-to-r from-success/5 to-primary/5 border-success/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-success">Success Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="text-xs text-muted-foreground mb-2">MATCH WITH GOALS</div>
                  <Badge variant="outline" className={getRatingColor(coverLetter.metrics?.goalsMatch)}>
                    {coverLetter.metrics?.goalsMatch}
                  </Badge>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="text-xs text-muted-foreground mb-2">EXPERIENCE MATCH</div>
                  <Badge variant="outline" className={getRatingColor(coverLetter.metrics?.experienceMatch)}>
                    {coverLetter.metrics?.experienceMatch}
                  </Badge>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="text-xs text-muted-foreground mb-2">COVER LETTER RATING</div>
                  <Badge variant="outline" className={getRatingColor(coverLetter.metrics?.coverLetterRating)}>
                    {coverLetter.metrics?.coverLetterRating}
                  </Badge>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="text-xs text-muted-foreground mb-2">ATS SCORE</div>
                  <div className="text-lg font-bold text-primary">{coverLetter.atsScore}%</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="text-xs text-muted-foreground mb-2">CORE REQUIREMENTS</div>
                  <div className="text-lg font-bold text-success">
                    {coverLetter.metrics?.coreRequirementsMet?.met}/{coverLetter.metrics?.coreRequirementsMet?.total}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="text-xs text-muted-foreground mb-2">PREFERRED REQUIREMENTS</div>
                  <div className="text-lg font-bold text-primary">
                    {coverLetter.metrics?.preferredRequirementsMet?.met}/{coverLetter.metrics?.preferredRequirementsMet?.total}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cover Letter Content */}
          <Card className="border-2 border-success/20 bg-success/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Cover Letter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white border rounded-lg p-6 font-serif text-sm leading-relaxed whitespace-pre-line">
                {formatCoverLetter()}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={handleCopy}
              disabled={isCopying}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              {isCopying ? "Copying..." : "Copy to Clipboard"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? "Downloading..." : "Download as Text"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleShare}
              className="flex items-center gap-2"
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
