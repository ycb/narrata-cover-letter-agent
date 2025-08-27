import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Copy, Download, Share2, Star, X, Wand2, Upload, Send, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UnifiedGapCard } from '@/components/hil/UnifiedGapCard';

interface CoverLetterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  coverLetter: any;
}

export function CoverLetterEditModal({ isOpen, onClose, coverLetter }: CoverLetterEditModalProps) {
  const [editedContent, setEditedContent] = useState<any>(null);
  const [mainTabValue, setMainTabValue] = useState<'cover-letter' | 'job-description'>('cover-letter');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize edited content when cover letter changes
  useEffect(() => {
    if (coverLetter) {
      setEditedContent({
        ...coverLetter,
        content: {
          ...coverLetter.content,
          sections: coverLetter.content?.sections?.map((section: any) => ({ ...section })) || []
        }
      });
    }
  }, [coverLetter]);

  if (!coverLetter || !editedContent) return null;

  const handleSectionChange = (sectionId: string, newContent: string) => {
    setEditedContent({
      ...editedContent,
      content: {
        ...editedContent.content,
        sections: editedContent.content.sections.map((section: any) =>
          section.id === sectionId ? { ...section, content: newContent } : section
        )
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement save functionality
      console.log("Saving edited cover letter:", editedContent);
      
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getRequirementsForParagraph = (paragraphType: string) => {
    switch (paragraphType) {
      case 'intro':
        return ['quantifiable achievements', 'specific metrics', 'KPIs from past projects'];
      case 'experience':
        return ['SQL/Python experience', 'technical leadership', 'cross-functional collaboration'];
      case 'closing':
        return ['enthusiasm', 'specific interest in role', 'company alignment'];
      case 'signature':
        return ['professional closing', 'contact information', 'call to action'];
      default:
        return ['requirements met'];
    }
  };

  const getSectionTitle = (type: string) => {
    switch (type) {
      case 'intro':
        return 'Introduction';
      case 'experience':
        return 'Experience';
      case 'closing':
        return 'Closing';
      case 'signature':
        return 'Signature';
      default:
        return type;
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2"
              >
                <X className="h-4 w-4" />
              </Button>
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Edit Cover Letter
                </DialogTitle>
                <DialogDescription className="text-base">
                  {coverLetter.company} • {coverLetter.position} • {formatDate(coverLetter.createdAt)}
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

        {/* Main Tabs */}
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
                    <label className="text-sm font-medium">Job Description Content</label>
                    <Textarea
                      value={coverLetter.jobDescription || "Senior Product Manager position requiring 5+ years of experience in product management, strong analytical skills, and experience with cross-functional team leadership. The role involves driving product strategy, analyzing user behavior, and optimizing conversion funnels. Experience with SQL/Python, Tableau/Looker, and fintech is preferred."}
                      onChange={() => {}}
                      rows={8}
                      className="resize-none"
                    />
                  </div>
                  <Button 
                    variant="outline"
                    className="w-full flex items-center gap-2"
                    size="lg"
                  >
                    <Wand2 className="h-4 w-4" />
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
              {editedContent.content?.sections?.map((section: any, index: number) => (
                <div key={section.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Left: Section Label + Paragraph Content */}
                  <div className="space-y-4">
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {getSectionTitle(section.type)}
                    </div>
                    <Textarea
                      value={section.content}
                      onChange={(e) => handleSectionChange(section.id, e.target.value)}
                      className={`resize-none h-[200px] flex items-center ${section.isEnhanced ? 'border-success/30 bg-success/5' : ''}`}
                    />
                  </div>

                  {/* Right: Gap/Requirement Card */}
                  <div className="space-y-4">
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {getSectionTitle(section.type)} Analysis
                    </div>
                    <UnifiedGapCard
                      status="met"
                      title="Matches Job Req"
                      addresses={getRequirementsForParagraph(section.type)}
                      origin={section.isEnhanced ? "ai" : "library"}
                      paragraphId={section.type}
                    />
                  </div>
                </div>
              ))}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button variant="link" className="flex-1 text-muted-foreground hover:text-foreground">
                  Save Draft
                </Button>
                <Button 
                  className="flex-1 flex items-center gap-2" 
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
