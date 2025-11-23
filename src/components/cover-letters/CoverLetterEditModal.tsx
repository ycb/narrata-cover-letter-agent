import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import { AddSectionFromLibraryModal, type InvocationType } from './AddSectionFromLibraryModal';
import { useUserGoals } from '@/contexts/UserGoalsContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { transformMetricsToMatchData, type MatchMetricsData } from './useMatchMetricsDetails';
import { computeSectionAttribution } from './useSectionAttribution';
import { supabase } from '@/lib/supabase';
import { CoverLetterDraftService } from '@/services/coverLetterDraftService';
import { CoverLetterTemplateService, type SavedSection } from '@/services/coverLetterTemplateService';
import type { WorkHistoryCompany } from '@/types/workHistory';
import type { Gap } from '@/services/gapTransformService';
import type { CoverLetterMatchMetric, ParsedJobDescription } from '@/types/coverLetters';

interface CoverLetterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  coverLetter: any;
  onSave?: () => void; // Callback to refetch data after save
  onEditGoals?: () => void; // Agent C: goals CTA handler
  onAddStory?: (requirement?: string, severity?: string) => void; // Agent C: add story CTA
  onEnhanceSection?: (sectionId: string, requirement?: string, gapData?: { gaps?: Array<{ id: string; title?: string; description: string }>; gapSummary?: string | null }) => void; // Agent C: enhance section CTA
  onAddMetrics?: (sectionId?: string) => void; // Agent C: add metrics CTA
}

export function CoverLetterEditModal({ isOpen, onClose, coverLetter, onSave, onEditGoals, onAddStory, onEnhanceSection, onAddMetrics }: CoverLetterEditModalProps) {
  const { goals, setGoals } = useUserGoals();
  const { user } = useAuth();
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

  // Library modal state
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryInvocation, setLibraryInvocation] = useState<InvocationType | null>(null);
  const [workHistoryLibrary, setWorkHistoryLibrary] = useState<WorkHistoryCompany[]>([]);
  const [savedSections, setSavedSections] = useState<SavedSection[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

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

  // Load work history and saved sections for library modal
  useEffect(() => {
    const loadLibraryData = async () => {
      if (!user?.id) return;

      setIsLibraryLoading(true);
      setLibraryError(null);

      try {
        // Load work history companies with stories
        const { data: workItems } = await supabase
          .from('work_items')
          .select('id, title, company_id')
          .eq('user_id', user.id);

        const { data: stories } = await supabase
          .from('approved_content')
          .select('id, title, content, work_item_id')
          .eq('user_id', user.id);

        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, description')
          .eq('user_id', user.id);

        // Build work history structure
        const companyMap = new Map<string, WorkHistoryCompany>();

        (companies || []).forEach((company) => {
          companyMap.set(company.id, {
            id: company.id,
            name: company.name,
            description: company.description || '',
            tags: [],
            source: 'resume',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            roles: [],
          });
        });

        (workItems || []).forEach((item) => {
          const company = companyMap.get(item.company_id);
          if (company) {
            const itemStories = (stories || []).filter(s => s.work_item_id === item.id);
            company.roles.push({
              id: item.id,
              companyId: item.company_id,
              title: item.title,
              type: 'full-time',
              startDate: '',
              description: '',
              tags: [],
              outcomeMetrics: [],
              blurbs: itemStories.map(s => ({
                id: s.id,
                roleId: item.id,
                title: s.title,
                content: s.content || '',
                outcomeMetrics: [],
                tags: [],
                source: 'resume',
                status: 'approved',
                confidence: 'high',
                timesUsed: 0,
                linkedExternalLinks: [],
                hasGaps: false,
                gapCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })),
              externalLinks: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        });

        setWorkHistoryLibrary(Array.from(companyMap.values()).filter(c => c.roles.length > 0));

        // Load saved sections
        const sections = await CoverLetterTemplateService.getUserSavedSections(user.id);
        setSavedSections(sections);
      } catch (error) {
        console.error('[CoverLetterEditModal] Failed to load library data:', error);
        setLibraryError(error instanceof Error ? error.message : 'Failed to load library');
      } finally {
        setIsLibraryLoading(false);
      }
    };

    if (isOpen) {
      loadLibraryData();
    }
  }, [user?.id, isOpen]);

  const handleSectionChange = (sectionId: string, newContent: string) => {
    if (!editedContent) return;
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
      // Save the sections to database (cover_letters table uses 'sections' column, not 'content')
      const { error } = await supabase
        .from('cover_letters')
        .update({
          sections: editedContent.content.sections,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editedContent.id);

      if (error) throw error;

      toast({
        title: "Cover letter saved",
        description: "Your changes have been saved successfully",
      });

      // Notify parent to refetch data
      if (onSave) {
        onSave();
      }

      onClose();
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Library insertion handlers
  const handleInsertFromLibrary = (sectionId: string) => {
    const section = editedContent.content?.sections?.find((s: any) => s.id === sectionId);
    if (!section) return;

    const sectionIndex = editedContent.content.sections.findIndex((s: any) => s.id === sectionId);
    const sectionType = section.type === 'intro' ? 'intro' : section.type === 'closing' || section.type === 'closer' ? 'closing' : 'body';

    setLibraryInvocation({
      type: 'replace_or_insert_below',
      sectionId,
      sectionType,
      sectionIndex,
    });
    setShowLibraryModal(true);
  };

  const handleInsertBetweenSections = (insertIndex: number) => {
    const sections = editedContent.content?.sections || [];

    // Infer section type from neighbors
    let preferredType: 'intro' | 'body' | 'closing' = 'body';
    if (insertIndex === 0) {
      preferredType = 'intro';
    } else if (insertIndex >= sections.length) {
      preferredType = 'closing';
    }

    setLibraryInvocation({
      type: 'insert_here',
      insertIndex,
      preferredSectionType: preferredType,
    });
    setShowLibraryModal(true);
  };

  const handleReplaceSection = async (sectionId: string, content: string, source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string; title?: string }) => {
    try {
      // Update section content
      const updatedSections = editedContent.content.sections.map((section: any) =>
        section.id === sectionId ? { ...section, content, source, title: source.title || section.title } : section
      );

      setEditedContent({
        ...editedContent,
        content: {
          ...editedContent.content,
          sections: updatedSections,
        },
      });

      // Save to database
      await coverLetterDraftService.updateDraftSection(editedContent.id, sectionId, content);

      toast({
        title: "Section replaced",
        description: "Content from library has been inserted",
      });

      setShowLibraryModal(false);
    } catch (error) {
      console.error('[CoverLetterEditModal] Failed to replace section:', error);
      toast({
        title: "Failed to replace section",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleInsertBelow = async (sectionIndex: number, sectionType: string, content: string, source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string; title?: string }) => {
    try {
      const newSection = {
        id: `section-${Date.now()}`,
        type: sectionType,
        title: source.title || '',
        content,
        source,
      };

      const updatedSections = [...editedContent.content.sections];
      updatedSections.splice(sectionIndex + 1, 0, newSection);

      setEditedContent({
        ...editedContent,
        content: {
          ...editedContent.content,
          sections: updatedSections,
        },
      });

      toast({
        title: "Section inserted",
        description: "New section added from library",
      });

      setShowLibraryModal(false);
    } catch (error) {
      console.error('[CoverLetterEditModal] Failed to insert section:', error);
      toast({
        title: "Failed to insert section",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleInsertHere = async (insertIndex: number, sectionType: string, content: string, source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string; title?: string }) => {
    try {
      const newSection = {
        id: `section-${Date.now()}`,
        type: sectionType,
        title: source.title || '',
        content,
        source,
      };

      const updatedSections = [...editedContent.content.sections];
      updatedSections.splice(insertIndex, 0, newSection);

      setEditedContent({
        ...editedContent,
        content: {
          ...editedContent.content,
          sections: updatedSections,
        },
      });

      toast({
        title: "Section inserted",
        description: "New section added from library",
      });

      setShowLibraryModal(false);
    } catch (error) {
      console.error('[CoverLetterEditModal] Failed to insert section:', error);
      toast({
        title: "Failed to insert section",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSection = (sectionId: string) => {
    try {
      const updatedSections = editedContent.content.sections.filter((section: any) => section.id !== sectionId);

      setEditedContent({
        ...editedContent,
        content: {
          ...editedContent.content,
          sections: updatedSections,
        },
      });

      toast({
        title: "Section deleted",
        description: "The section has been removed",
      });
    } catch (error) {
      console.error('[CoverLetterEditModal] Failed to delete section:', error);
      toast({
        title: "Failed to delete section",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateSection = (sectionId: string) => {
    try {
      const sectionIndex = editedContent.content.sections.findIndex((s: any) => s.id === sectionId);
      if (sectionIndex === -1) return;

      const sectionToDuplicate = editedContent.content.sections[sectionIndex];
      const duplicatedSection = {
        ...sectionToDuplicate,
        id: `section-${Date.now()}`,
        title: `${sectionToDuplicate.title} (Copy)`,
      };

      const updatedSections = [...editedContent.content.sections];
      updatedSections.splice(sectionIndex + 1, 0, duplicatedSection);

      setEditedContent({
        ...editedContent,
        content: {
          ...editedContent.content,
          sections: updatedSections,
        },
      });

      toast({
        title: "Section duplicated",
        description: "A copy has been created below the original",
      });
    } catch (error) {
      console.error('[CoverLetterEditModal] Failed to duplicate section:', error);
      toast({
        title: "Failed to duplicate section",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
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

  // Conditional render without early return to maintain consistent hook calls
  if (!coverLetter || !editedContent) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen && !showLibraryModal} onOpenChange={onClose}>
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
                  onEnhanceSection={(sectionId, requirement, ratingCriteria, providedGapData) => {
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

                      // Use promptSummary from sectionInsight if available (matches ContentCard pattern)
                      // Strip trailing periods for consistency with CreateModal
                      const cleanGapSummary = sectionInsight?.promptSummary
                        ? sectionInsight.promptSummary.replace(/\.+$/, '')
                        : null;

                      // Compute section attribution for HIL modal (or use provided)
                      const sectionAttribution = providedGapData?.sectionAttribution || computeSectionAttribution({
                        sectionId: section.id,
                        sectionType: section.slug || section.type,
                        enhancedMatchData: enhancedMatchData,
                        ratingCriteria: matchMetrics?.ratingCriteria,
                      }).attribution;

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
                        // Store requirement gaps and rating criteria gaps separately - prefer provided data
                        gaps: providedGapData?.gaps || requirementGaps,
                        ratingCriteriaGaps: gapsFromRating,
                        gapSummary: providedGapData?.gapSummary || cleanGapSummary,
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
                    onSectionDelete={handleDeleteSection}
                  onSectionDuplicate={handleDuplicateSection}
                    onInsertFromLibrary={handleInsertFromLibrary}
                    onInsertBetweenSections={handleInsertBetweenSections}
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

      {/* Placeholder background to show edit modal is still "there" when library modal opens */}
      {showLibraryModal && isOpen && createPortal(
        <div className="fixed inset-0 z-40 bg-black/80">
          <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-6xl h-[90vh] bg-background border shadow-lg rounded-lg" />
        </div>,
        document.body
      )}

      {/* Library Modal - Rendered outside Dialog using Portal to escape stacking context */}
      {libraryInvocation && createPortal(
        <AddSectionFromLibraryModal
          isOpen={showLibraryModal}
          onClose={() => {
            setShowLibraryModal(false);
            setLibraryInvocation(null);
          }}
          invocation={libraryInvocation}
          jobDescription={jobDescriptionRecord?.structured_data?.rawText || jobDescriptionRecord?.analysis?.llm?.rawText}
          workHistoryLibrary={workHistoryLibrary}
          savedSections={savedSections}
          isLibraryLoading={isLibraryLoading}
          libraryError={libraryError}
          onReplace={handleReplaceSection}
          onInsertBelow={handleInsertBelow}
          onInsertHere={handleInsertHere}
        />,
        document.body
      )}
    </>
  );
}
