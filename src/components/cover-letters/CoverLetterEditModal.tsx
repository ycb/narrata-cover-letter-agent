import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Copy, Download, Share2, Star, X, Wand2, Upload, Send, Save, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CoverLetterDraftView } from './CoverLetterDraftView';
import { CoverLetterViewModal } from './CoverLetterViewModal';
import { UserGoalsModal } from '@/components/user-goals/UserGoalsModal';
import { ContentGenerationModal } from '@/components/hil/ContentGenerationModal';
import { useUserGoals } from '@/contexts/UserGoalsContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Gap } from '@/services/gapTransformService';

interface CoverLetterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  coverLetter: any;
  onEditGoals?: () => void; // Agent C: goals CTA handler
  onAddStory?: (requirement?: string, severity?: string) => void; // Agent C: add story CTA
  onEnhanceSection?: (sectionId: string, requirement?: string, gapData?: { gaps?: Array<{ id: string; title?: string; description: string }>; gapSummary?: string | null }) => void; // Agent C: enhance section CTA
  onAddMetrics?: (sectionId?: string) => void; // Agent C: add metrics CTA
}

export function CoverLetterEditModal({ isOpen, onClose, coverLetter, onEditGoals, onAddStory, onEnhanceSection, onAddMetrics }: CoverLetterEditModalProps) {
  const { goals, setGoals } = useUserGoals();
  const { toast } = useToast();
  const [editedContent, setEditedContent] = useState<any>(null);
  const [mainTabValue, setMainTabValue] = useState<'cover-letter' | 'job-description'>('cover-letter');
  const [isSaving, setIsSaving] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showContentGenerationModal, setShowContentGenerationModal] = useState(false);
  const [selectedGap, setSelectedGap] = useState<Gap & { section_id?: string } | null>(null);
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
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2 pr-12">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                Edit Cover Letter
              </DialogTitle>
              <DialogDescription className="text-base">
                {coverLetter.company} • {coverLetter.position} • {formatDate(coverLetter.createdAt)}
              </DialogDescription>
            </div>
            {mainTabValue === 'cover-letter' && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="gap-2" onClick={() => setShowPreviewModal(true)}>
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Main Tabs */}
        <div className="w-full flex-1 flex flex-col min-h-0">
          <Tabs value={mainTabValue} onValueChange={(value) => setMainTabValue(value as 'job-description' | 'cover-letter')} className="flex flex-col flex-1 min-h-0">
            <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0 relative z-10">
              <TabsTrigger value="cover-letter">
                <span>Cover Letter</span>
              </TabsTrigger>
              <TabsTrigger value="job-description">
                <span>Job Description</span>
              </TabsTrigger>
            </TabsList>

            {/* Job Description Tab - Shows full JD with Re-Generate button */}
            <TabsContent value="job-description" className="flex-1 overflow-hidden mt-0 flex flex-col data-[state=inactive]:!hidden">
              <Card className="flex-1 flex flex-col min-h-0">
                <CardContent className="flex-1 flex flex-col min-h-0 space-y-4 pt-6">
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap overflow-y-auto">
                      {coverLetter.jobDescription || "Senior Product Manager position requiring 5+ years of experience in product management, strong analytical skills, and experience with cross-functional team leadership. The role involves driving product strategy, analyzing user behavior, and optimizing conversion funnels. Experience with SQL/Python, Tableau/Looker, and fintech is preferred."}
                    </div>
                  </div>
                  <Button 
                    variant="secondary"
                    className="w-full flex items-center gap-2 flex-shrink-0"
                    size="lg"
                  >
                    <Wand2 className="h-4 w-4" />
                    Re-Generate Cover Letter
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cover Letter Tab - Shows draft with content cards */}
            <TabsContent value="cover-letter" className="flex-1 overflow-hidden mt-0 flex flex-col data-[state=inactive]:!hidden">
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
                  onEnhanceSection={(sectionId, requirement, gapData) => {
                    // Always open HIL workflow - create gap object for ContentGenerationModal
                    const section = editedContent.content?.sections?.find((s: any) => s.id === sectionId);
                    if (section) {
                      const existingContent = section.content ?? '';
                      // Map section type to paragraphId for the gap service
                      const paragraphIdMap: Record<string, string> = {
                        'intro': 'intro',
                        'introduction': 'intro',
                        'paragraph': 'experience',
                        'experience': 'experience',
                        'closer': 'closing',
                        'closing': 'closing',
                        'signature': 'closing'
                      };
                      const paragraphId = paragraphIdMap[section.type] || paragraphIdMap[section.slug] || 'experience';

                      setSelectedGap({
                        id: requirement ? `section-${sectionId}-${requirement}` : `section-${sectionId}-enhancement`,
                        type: 'content-enhancement',
                        severity: 'medium',
                        description: requirement || `Enhance ${section.title || section.type} section with more specific content and quantifiable achievements`,
                        suggestion: requirement || `Add detail that directly speaks to ${(section.title || section.type).toLowerCase()} requirements and demonstrates your experience`,
                        origin: 'ai',
                        section_id: sectionId,
                        paragraphId: paragraphId,
                        existingContent: existingContent,
                        // Pass through rich gap structure from ContentCard
                        gaps: gapData?.gaps,
                        gapSummary: gapData?.gapSummary
                      });
                      setShowContentGenerationModal(true);
                    } else if (onEnhanceSection) {
                      // Fallback to parent handler if section not found
                      onEnhanceSection(sectionId, requirement);
                    }
                  }}
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
                  className="flex-1 min-h-0"
                />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

      {/* Preview Modal */}
      <CoverLetterViewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        coverLetter={{
          ...coverLetter,
          content: editedContent?.content || coverLetter.content,
          title: `${coverLetter.company} - ${coverLetter.position}`,
        }}
      />

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

      {/* Content Generation Modal */}
      <ContentGenerationModal
        isOpen={showContentGenerationModal}
        onClose={() => {
          setShowContentGenerationModal(false);
          setSelectedGap(null);
        }}
        gap={selectedGap ? {
          id: selectedGap.id,
          type: selectedGap.type,
          severity: selectedGap.severity,
          description: selectedGap.description,
          suggestion: selectedGap.suggestion,
          paragraphId: selectedGap.paragraphId,
          origin: selectedGap.origin,
          existingContent: selectedGap.existingContent,
          // Pass through rich gap structure
          gaps: selectedGap.gaps,
          gapSummary: selectedGap.gapSummary
        } : null}
        onApplyContent={async (content: string) => {
          if (!selectedGap || !editedContent) return;
          
          const sectionId = selectedGap.section_id;
          if (sectionId) {
            // Update the section content
            handleSectionChange(sectionId, content);
            
            // TODO: Save to database
            console.log('[CoverLetterEditModal] Content generated for section:', sectionId);
          }
          
          setShowContentGenerationModal(false);
          setSelectedGap(null);
        }}
      />
    </Dialog>
  );
}
