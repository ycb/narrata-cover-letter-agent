import React, { useState, useEffect, useMemo } from 'react';
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
import { transformMetricsToMatchData, type MatchMetricsData } from './useMatchMetricsDetails';
import { computeSectionAttribution } from './useSectionAttribution';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { CoverLetterDraftService } from '@/services/coverLetterDraftService';
import type { Gap } from '@/services/gapTransformService';
import type { CoverLetterMatchMetric, ParsedJobDescription } from '@/types/coverLetters';

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
  const coverLetterDraftService = useMemo(() => new CoverLetterDraftService(), []);
  const [editedContent, setEditedContent] = useState<any>(null);
  const [mainTabValue, setMainTabValue] = useState<'cover-letter' | 'job-description'>('cover-letter');
  const [isSaving, setIsSaving] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showContentGenerationModal, setShowContentGenerationModal] = useState(false);
  const [selectedGap, setSelectedGap] = useState<Gap & { section_id?: string; gaps?: Array<{ id: string; title?: string; description: string }>; gapSummary?: string | null } | null>(null);
  const [jobDescriptionRecord, setJobDescriptionRecord] = useState<any | null>(null);
  const [sectionFocusContent, setSectionFocusContent] = useState<Record<string, string>>({});
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Initialize edited content when cover letter changes
  useEffect(() => {
    if (coverLetter) {
      // Diagnostic logging (Task 2.1)
      if (process.env.NODE_ENV === 'development') {
        console.log('[CoverLetterEditModal] coverLetter prop structure:', {
          hasMetrics: !!coverLetter.metrics,
          metricsType: typeof coverLetter.metrics,
          metricsIsArray: Array.isArray(coverLetter.metrics),
          hasLlmFeedback: !!coverLetter.llmFeedback,
          hasLlmFeedbackMetrics: !!coverLetter.llmFeedback?.metrics,
          llmFeedbackMetricsType: typeof coverLetter.llmFeedback?.metrics,
          llmFeedbackMetricsIsArray: Array.isArray(coverLetter.llmFeedback?.metrics),
        });
      }
      
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

  const handleSectionFocus = (sectionId: string) => {
    // Track content at focus time
    const section = editedContent?.content?.sections?.find((s: any) => s.id === sectionId);
    if (section) {
      setSectionFocusContent(prev => ({
        ...prev,
        [sectionId]: section.content || '',
      }));
    }
  };

  const handleSectionBlur = async (sectionId: string, newContent: string) => {
    const focusContent = sectionFocusContent[sectionId];
    const section = editedContent?.content?.sections?.find((s: any) => s.id === sectionId);
    const originalContent = section?.content || '';
    
    // Only recalculate if content changed since focus
    if (newContent !== focusContent && newContent !== originalContent && editedContent?.id) {
      try {
        // Save the section first
        const updatedDraft = await coverLetterDraftService.updateDraftSection(
          editedContent.id,
          sectionId,
          newContent
        );
        
        // Update local state with saved draft
        setEditedContent({
          ...editedContent,
          ...updatedDraft,
        });
        
        // Trigger metrics recalculation
        setIsRecalculating(true);
        try {
          await coverLetterDraftService.calculateMetricsForDraft(
            editedContent.id,
            editedContent.userId || coverLetter.userId,
            editedContent.jobDescriptionId || coverLetter.jobDescriptionId,
            (phase, message) => {
              console.log('[CoverLetterEditModal] Metrics calculation:', phase, message);
            }
          );
          console.log('[CoverLetterEditModal] Metrics recalculated after manual edit');
          
          // Refresh editedContent to get updated metrics
          const { data: updatedRow } = await supabase
            .from('cover_letters')
            .select('*')
            .eq('id', editedContent.id)
            .single();
          
          if (updatedRow) {
            setEditedContent(updatedRow);
          }
        } catch (error) {
          console.error('[CoverLetterEditModal] Failed to recalculate metrics:', error);
          // Don't block UI on recalculation failure
        } finally {
          setIsRecalculating(false);
        }
      } catch (error) {
        console.error('[CoverLetterEditModal] Failed to save section:', error);
        toast({
          title: "Failed to save section",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    }
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
              {(() => {
                // Transform metrics to MatchMetricsData format
                // FIX: Use top-level metrics first (guaranteed array), then fallback to llmFeedback.metrics
                const rawMetrics = editedContent?.metrics || editedContent?.llmFeedback?.metrics;
                
                // Diagnostic logging (Task 3.1)
                if (process.env.NODE_ENV === 'development') {
                  console.log('[CoverLetterEditModal] rawMetrics type:', typeof rawMetrics, 'isArray:', Array.isArray(rawMetrics), rawMetrics);
                  console.log('[CoverLetterEditModal] editedContent.metrics:', editedContent?.metrics);
                  console.log('[CoverLetterEditModal] editedContent.llmFeedback?.metrics:', editedContent?.llmFeedback?.metrics);
                }
                
                let matchMetrics: MatchMetricsData | null = null;
                
                if (rawMetrics) {
                  if (Array.isArray(rawMetrics)) {
                    try {
                      matchMetrics = transformMetricsToMatchData(rawMetrics as CoverLetterMatchMetric[]);
                      // Diagnostic logging (Task 3.2)
                      if (process.env.NODE_ENV === 'development') {
                        console.log('[CoverLetterEditModal] matchMetrics after transformation:', matchMetrics);
                      }
                    } catch (error) {
                      console.error('[CoverLetterEditModal] Error transforming metrics:', error);
                      matchMetrics = null;
                    }
                  } else if (typeof rawMetrics === 'object' && rawMetrics !== null) {
                    // FIX: Better error handling for object type
                    console.warn('[CoverLetterEditModal] rawMetrics is object, not array. Expected CoverLetterMatchMetric[].', rawMetrics);
                    // Try to extract array from object if it has a metrics property
                    const possibleArray = (rawMetrics as any).metrics || (rawMetrics as any).data;
                    if (Array.isArray(possibleArray)) {
                      try {
                        matchMetrics = transformMetricsToMatchData(possibleArray as CoverLetterMatchMetric[]);
                      } catch (error) {
                        console.error('[CoverLetterEditModal] Error transforming extracted metrics:', error);
                        matchMetrics = null;
                      }
                    }
                  }
                }
                
                // Extract rating criteria from llmFeedback
                const ratingDataForCriteria = editedContent?.llmFeedback?.rating as any;
                if (ratingDataForCriteria?.criteria && Array.isArray(ratingDataForCriteria.criteria) && matchMetrics) {
                  matchMetrics.ratingCriteria = ratingDataForCriteria.criteria.map((c: any) => ({
                    id: c.id || '',
                    label: c.label || '',
                    met: c.met === true,
                    evidence: c.evidence || '',
                    suggestion: c.suggestion || '',
                  }));
                }
                
                // FIX 1: Check analytics.overallScore first (for finalized drafts)
                const analyticsScore = editedContent?.analytics?.overallScore;
                if (analyticsScore !== undefined && analyticsScore !== null) {
                  if (!matchMetrics) {
                    matchMetrics = {
                      goalsMatchScore: undefined,
                      experienceMatchScore: undefined,
                      overallScore: analyticsScore,
                      atsScore: 0,
                      coreRequirementsMet: { met: 0, total: 0 },
                      preferredRequirementsMet: { met: 0, total: 0 },
                    };
                  } else {
                    matchMetrics.overallScore = analyticsScore;
                  }
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[CoverLetterEditModal] Using analytics.overallScore:', analyticsScore);
                  }
                }
                
                // FIX 2: Calculate score from criteria data if rating metric missing
                if (!matchMetrics || matchMetrics.overallScore === undefined) {
                  if (matchMetrics?.ratingCriteria && matchMetrics.ratingCriteria.length > 0) {
                    const metCount = matchMetrics.ratingCriteria.filter(c => c.met).length;
                    const totalCount = matchMetrics.ratingCriteria.length;
                    if (totalCount > 0) {
                      const calculatedScore = Math.round((metCount / totalCount) * 100);
                      matchMetrics.overallScore = calculatedScore;
                      if (process.env.NODE_ENV === 'development') {
                        console.log('[CoverLetterEditModal] Calculated score from criteria:', calculatedScore, `(${metCount}/${totalCount})`);
                      }
                    }
                  } else {
                    // FIX 3: Calculate score from hardcoded criteria logic (matches CoverLetterRatingInsights)
                    // When isPostHIL=false: 3/11 criteria met (hardcoded true) = 27%
                    // When isPostHIL=true: 10/11 criteria met (7 from isPostHIL + 3 hardcoded) = 91%
                    // Check draft status to determine if HIL is completed
                    const isHILCompleted = editedContent?.status === 'finalized' || editedContent?.status === 'reviewed';
                    const calculatedScore = isHILCompleted ? 91 : 27;
                    if (!matchMetrics) {
                      matchMetrics = {
                        goalsMatchScore: undefined,
                        experienceMatchScore: undefined,
                        overallScore: calculatedScore,
                        atsScore: 0,
                        coreRequirementsMet: { met: 0, total: 0 },
                        preferredRequirementsMet: { met: 0, total: 0 },
                      };
                    } else {
                      matchMetrics.overallScore = calculatedScore;
                    }
                    if (process.env.NODE_ENV === 'development') {
                      console.log('[CoverLetterEditModal] Calculated score from draft status (isHILCompleted:', isHILCompleted, '):', calculatedScore);
                    }
                  }
                }
                
                // FIX: Provide fallback metrics structure (but keep scores undefined if no data)
                if (!matchMetrics) {
                  matchMetrics = {
                    goalsMatchScore: undefined,
                    experienceMatchScore: undefined,
                    overallScore: undefined,
                    atsScore: 0,
                    coreRequirementsMet: { met: 0, total: 0 },
                    preferredRequirementsMet: { met: 0, total: 0 },
                  };
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('[CoverLetterEditModal] No metrics data found. rawMetrics was:', rawMetrics);
                  }
                }
                
                return (
                  <CoverLetterDraftView
                    sections={editedContent.content?.sections || []}
                    matchMetrics={matchMetrics}
                    ratingCriteria={matchMetrics?.ratingCriteria}
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
                  onEnhanceSection={(sectionId, requirement, ratingCriteria) => {
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

                      // Get requirement gaps for this section from enhancedMatchData
                      const enhancedMatchData = editedContent.llmFeedback?.enhancedMatchData || editedContent.enhancedMatchData;
                      const sectionInsight = enhancedMatchData?.sectionGapInsights?.find(
                        (insight: any) => insight.sectionId === sectionId || insight.sectionSlug === section.slug || insight.sectionSlug === section.type
                      );
                      const requirementGaps = sectionInsight?.requirementGaps?.map((gap: any) => ({
                        id: gap.id,
                        title: gap.label,
                        description: `${gap.rationale} ${gap.recommendation}`,
                      })) || [];

                      // Convert rating criteria to gap format if provided
                      // Note: ratingCriteria structure is { id, label, description, suggestion, evidence }
                      const gapsFromRating = ratingCriteria?.map(rc => ({
                        id: rc.id,
                        title: rc.label,
                        description: `${rc.evidence || rc.description || ''}. ${rc.suggestion || ''}`.trim(),
                      })) || [];
                      
                      console.log('[CoverLetterEditModal] gapsFromRating:', gapsFromRating);

                      // Keep requirement gaps and rating criteria gaps separate
                      const gapSummaryParts: string[] = [];
                      if (requirementGaps.length > 0) {
                        gapSummaryParts.push(`${requirementGaps.length} requirement gap${requirementGaps.length > 1 ? 's' : ''}`);
                      }
                      if (gapsFromRating.length > 0) {
                        gapSummaryParts.push(`${gapsFromRating.length} content quality criteria: ${gapsFromRating.map(g => g.title).join(', ')}`);
                      }

                      // Compute section attribution for HIL modal
                      const { attribution: sectionAttribution } = computeSectionAttribution({
                        sectionId: section.id,
                        sectionType: section.slug || section.type,
                        enhancedMatchData: enhancedMatchData,
                        ratingCriteria: matchMetrics?.ratingCriteria,
                      });

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
                        // Store requirement gaps and rating criteria gaps separately
                        gaps: requirementGaps,
                        ratingCriteriaGaps: gapsFromRating,
                        gapSummary: gapSummaryParts.length > 0 ? gapSummaryParts.join(' • ') : null,
                        // Pass section attribution to show what's working in HIL
                        sectionAttribution: sectionAttribution
                      });
                      setShowContentGenerationModal(true);
                    } else if (onEnhanceSection) {
                      // Fallback to parent handler if section not found
                      // Convert ratingCriteria to gapData format
                      const gapData = ratingCriteria ? {
                        gaps: ratingCriteria.map(rc => ({
                          id: rc.id,
                          title: rc.label,
                          description: `${rc.description}. ${rc.suggestion}`,
                        })),
                        gapSummary: `Improve ${ratingCriteria.length} content quality criteria: ${ratingCriteria.map(rc => rc.label).join(', ')}`,
                      } : undefined;
                      onEnhanceSection(sectionId, requirement, gapData);
                    }
                  }}
                    onAddMetrics={onAddMetrics}
                    isEditable={true}
                    hilCompleted={editedContent?.status === 'finalized' || editedContent?.status === 'reviewed'}
                    onSectionChange={handleSectionChange}
                    onSectionFocus={handleSectionFocus}
                    onSectionBlur={handleSectionBlur}
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
                );
              })()}
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
          gapSummary: selectedGap.gapSummary,
          ratingCriteriaGaps: selectedGap.ratingCriteriaGaps,
          // Pass section attribution to show what's working in HIL
          sectionAttribution: selectedGap.sectionAttribution
        } : null}
        onApplyContent={async (content: string) => {
          if (!selectedGap || !editedContent) return;
          
          const sectionId = selectedGap.section_id;
          if (sectionId && editedContent.id) {
            // Update local state first
            handleSectionChange(sectionId, content);
            
            // Save the section to database
            try {
              const updatedDraft = await coverLetterDraftService.updateDraftSection(
                editedContent.id,
                sectionId,
                content
              );
              
              // Update local state with saved draft
              setEditedContent({
                ...editedContent,
                ...updatedDraft,
              });
              
              // Trigger metrics recalculation after HIL content is applied
              setIsRecalculating(true);
              try {
                await coverLetterDraftService.calculateMetricsForDraft(
                  editedContent.id,
                  editedContent.userId || coverLetter.userId,
                  editedContent.jobDescriptionId || coverLetter.jobDescriptionId,
                  (phase, message) => {
                    console.log('[CoverLetterEditModal] Metrics calculation:', phase, message);
                  }
                );
                console.log('[CoverLetterEditModal] Metrics recalculated after HIL content applied');
                
                // Refresh editedContent to get updated metrics
                const { data: updatedRow } = await supabase
                  .from('cover_letters')
                  .select('*')
                  .eq('id', editedContent.id)
                  .single();
                
                if (updatedRow) {
                  setEditedContent(updatedRow);
                }
              } catch (error) {
                console.error('[CoverLetterEditModal] Failed to recalculate metrics:', error);
                // Don't block UI on recalculation failure
              } finally {
                setIsRecalculating(false);
              }
            } catch (error) {
              console.error('[CoverLetterEditModal] Failed to save section:', error);
              toast({
                title: "Failed to save section",
                description: error instanceof Error ? error.message : "Please try again.",
                variant: "destructive",
              });
            }
          }
          
          setShowContentGenerationModal(false);
          setSelectedGap(null);
        }}
      />
    </Dialog>
  );
}
