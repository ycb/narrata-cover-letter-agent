import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Copy, Download, Share2, Star, X, Wand2, Upload, Send, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CoverLetterDraftView } from './CoverLetterDraftView';
import { UserGoalsModal } from '@/components/user-goals/UserGoalsModal';
import { useUserGoals } from '@/contexts/UserGoalsContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface CoverLetterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  coverLetter: any;
  onEditGoals?: () => void; // Agent C: goals CTA handler
  onAddStory?: (requirement?: string, severity?: string) => void; // Agent C: add story CTA
  onEnhanceSection?: (sectionId: string, requirement?: string) => void; // Agent C: enhance section CTA
  onAddMetrics?: (sectionId?: string) => void; // Agent C: add metrics CTA
}

export function CoverLetterEditModal({ isOpen, onClose, coverLetter, onEditGoals, onAddStory, onEnhanceSection, onAddMetrics }: CoverLetterEditModalProps) {
  const { goals, setGoals } = useUserGoals();
  const { toast } = useToast();
  const [editedContent, setEditedContent] = useState<any>(null);
  const [mainTabValue, setMainTabValue] = useState<'cover-letter' | 'job-description'>('cover-letter');
  const [isSaving, setIsSaving] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [jobDescriptionRecord, setJobDescriptionRecord] = useState<any | null>(null);

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

  // Fetch parsed job description for this draft so match bar gets canonical fields
  useEffect(() => {
    const loadJD = async () => {
      const jdId = coverLetter?.jobDescriptionId;
      if (!jdId) {
        setJobDescriptionRecord(null);
        return;
      }
      const { data } = await supabase
        .from('job_descriptions' as any)
        .select('id, company, role, structured_data, analysis, standard_requirements, preferred_requirements')
        .eq('id', jdId)
        .maybeSingle();
      setJobDescriptionRecord(data || null);
    };
    loadJD();
  }, [coverLetter?.jobDescriptionId]);

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
      <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto flex flex-col">
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
        <div className="w-full flex-1 flex flex-col overflow-hidden">
          <Tabs value={mainTabValue} onValueChange={(value) => setMainTabValue(value as 'job-description' | 'cover-letter')} className="flex flex-col h-full">
            <TabsList className="grid w-fit grid-cols-2 mb-4 flex-shrink-0">
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
            <TabsContent value="job-description" className="space-y-6 flex-1 overflow-y-auto">
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
                    variant="secondary"
                    className="w-full flex items-center gap-2"
                    size="lg"
                  >
                    <Wand2 className="h-4 w-4" />
                    Re-Generate Cover Letter
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cover Letter Tab - Shows draft with content cards */}
            <TabsContent value="cover-letter" className="space-y-6 flex-1 overflow-y-auto">
              {/* Use shared CoverLetterDraftView component */}
              <CoverLetterDraftView
                sections={editedContent.content?.sections || []}
                hilProgressMetrics={editedContent.llmFeedback?.metrics || null}
                enhancedMatchData={editedContent.llmFeedback?.enhancedMatchData || editedContent.enhancedMatchData || null}
                goNoGoAnalysis={editedContent.llmFeedback?.goNoGoAnalysis || null}
                jobDescription={jobDescriptionRecord ? {
                  id: jobDescriptionRecord.id,
                  role: jobDescriptionRecord.role,
                  company: jobDescriptionRecord.company,
                  // Normalized fields for UI consumption
                  standardRequirements:
                    (jobDescriptionRecord as any).standard_requirements
                    ?? (jobDescriptionRecord as any).standardRequirements
                    ?? jobDescriptionRecord.analysis?.llm?.standardRequirements
                    ?? jobDescriptionRecord.structured_data?.standardRequirements
                    ?? [],
                  preferredRequirements:
                    (jobDescriptionRecord as any).preferred_requirements
                    ?? (jobDescriptionRecord as any).preferredRequirements
                    ?? jobDescriptionRecord.analysis?.llm?.preferredRequirements
                    ?? jobDescriptionRecord.structured_data?.preferredRequirements
                    ?? [],
                  salary:
                    jobDescriptionRecord.structured_data?.salary
                    ?? jobDescriptionRecord.structured_data?.compensation
                    ?? jobDescriptionRecord.analysis?.llm?.structuredData?.compensation
                    ?? undefined,
                  location:
                    jobDescriptionRecord.structured_data?.location
                    ?? jobDescriptionRecord.analysis?.llm?.structuredData?.location
                    ?? undefined,
                  workType:
                    jobDescriptionRecord.structured_data?.workType
                    ?? jobDescriptionRecord.analysis?.llm?.structuredData?.workType
                    ?? undefined,
                } : null}
                onEditGoals={() => setShowGoalsModal(true)}
                onAddStory={onAddStory}
                onEnhanceSection={onEnhanceSection}
                onAddMetrics={onAddMetrics}
                isEditable={true}
                hilCompleted={false}
                onSectionChange={handleSectionChange}
                onSectionDelete={(sectionId) => {
                  console.log('Delete section:', sectionId);
                  // TODO: Implement delete section
                }}
                onSectionDuplicate={(sectionId) => {
                  console.log('Duplicate section:', sectionId);
                  // TODO: Implement duplicate section
                }}
              />

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

      {/* User Goals Modal */}
      <UserGoalsModal
        isOpen={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
        onSave={async (updatedGoals) => {
          await setGoals(updatedGoals);
          setShowGoalsModal(false);
          toast({
            title: 'Goals Updated',
            description: 'Your career goals have been updated successfully',
          });
        }}
        initialGoals={goals || undefined}
      />
    </Dialog>
  );
}
