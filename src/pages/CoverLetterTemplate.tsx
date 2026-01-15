import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, Save, ArrowLeft, Plus, GripVertical, Trash2, Edit, FileText, Library, MoreHorizontal, Copy, Clock, LayoutTemplate, CheckCircle, X, ChevronRight, BookOpen, Eye } from "lucide-react";
import { TemplateBanner } from "@/components/layout/TemplateBanner";
import { Link, useNavigate } from "react-router-dom";
import { TemplateBlurbHierarchical } from "@/components/template-blurbs/TemplateBlurbHierarchical";
import { type TemplateBlurb } from "@/components/template-blurbs/TemplateBlurbMaster";
import { WorkHistoryBlurbSelector } from "@/components/work-history/WorkHistoryBlurbSelector";
import { SectionInsertButton } from "@/components/template-blurbs/SectionInsertButton";
import { CoverLetterViewModal } from "@/components/cover-letters/CoverLetterViewModal";
import type { CoverLetterSection, CoverLetterTemplate, WorkHistoryBlurb, WorkHistoryCompany, WorkHistoryRole } from "@/types/workHistory";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useTour } from "@/contexts/TourContext";
import { TourBannerFull } from "@/components/onboarding/TourBannerFull";
import { FormModal } from "@/components/shared/FormModal";
import { CoverLetterTemplateService, type SavedSection } from "@/services/coverLetterTemplateService";
import { SyntheticUserService } from "@/services/syntheticUserService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/shared/LoadingState";

const DEFAULT_TEMPLATE_NAME = "Professional Template";

const createEmptyTemplate = (name: string = DEFAULT_TEMPLATE_NAME): CoverLetterTemplate => ({
  id: "draft-template",
  name,
  sections: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

export default function CoverLetterTemplate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [template, setTemplate] = useState<CoverLetterTemplate>(createEmptyTemplate());
  const [templateBlurbs, setTemplateBlurbs] = useState<TemplateBlurb[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showBlurbSelector, setShowBlurbSelector] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [showWorkHistorySelector, setShowWorkHistorySelector] = useState(false);
  const [showAddContentTypeModal, setShowAddContentTypeModal] = useState(false);
  const [newContentType, setNewContentType] = useState({ label: '', description: '' });
  const [showAddReusableContentModal, setShowAddReusableContentModal] = useState(false);
  const [newReusableContent, setNewReusableContent] = useState({ title: '', content: '', tags: '', contentType: '' });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewCoverLetter, setPreviewCoverLetter] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const [lastSavedAtIso, setLastSavedAtIso] = useState<string | null>(null);
  const [userContentTypes, setUserContentTypes] = useState<Array<{
    type: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    isDefault: boolean;
  }>>([]);
  const [workHistoryLibrary, setWorkHistoryLibrary] = useState<WorkHistoryCompany[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Add Section Modal State
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<'story' | 'saved' | null>(null);
  const [contentMethod, setContentMethod] = useState<'dynamic' | 'static' | null>(null);
  const [showSelectionPanel, setShowSelectionPanel] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedReusableType, setSelectedReusableType] = useState<string>('');
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const loadMountedRef = useRef(true);
  const templateRef = useRef(template);
  const isDirtyRef = useRef(isDirty);
  const revisionRef = useRef(0);
  const [dirtyRevision, setDirtyRevision] = useState(0);
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const saveInFlightRef = useRef<Promise<boolean> | null>(null);

  
  // Tour integration
  const { isActive: isTourActive, currentStep: tourStep, tourSteps, currentTourStep, nextStep, previousStep, cancelTour } = useTour();

  // Handle URL parameter for initial tab
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'saved') {
    }
  }, [searchParams]);

  // Auto-advance through tabs during tour
  useEffect(() => {
    if (isTourActive) {
      // Start on template tab, then switch to saved sections after 3 seconds
      setTimeout(() => {
      }, 3000);
    }
  }, [isTourActive]);

  useEffect(() => {
    loadMountedRef.current = true;

    const loadData = async () => {
      if (!user?.id) {
        if (loadMountedRef.current) {
          setIsLoading(false);
          setTemplate(createEmptyTemplate());
          setTemplateBlurbs([]);
          setWorkHistoryLibrary([]);
          setIsDirty(false);
          setLastSavedAtIso(null);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const syntheticUserService = new SyntheticUserService();
        const syntheticContext = await syntheticUserService.getSyntheticUserContext();
        const profileId = syntheticContext.isSyntheticTestingEnabled
          ? syntheticContext.currentUser?.profileId
          : undefined;

        const templates = await CoverLetterTemplateService.getUserTemplates(user.id);
        const sections = await CoverLetterTemplateService.getUserSavedSections(user.id, profileId);
        const libraryCompanies = await fetchWorkHistoryLibrary(user.id, profileId);

        if (!loadMountedRef.current) {
          return;
        }

        const normalizeContentKey = (text: string | undefined | null) =>
          (text ?? "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

        const extractSignoffParts = (text: string | undefined | null) => {
          if (!text) {
            return null;
          }

          const lines = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

          if (lines.length < 2) {
            return null;
          }

          const signoffKeywords = ["regards", "sincerely", "best", "thanks", "thank you", "cheers"];
          let signoffIndex = -1;

          for (let idx = 0; idx < lines.length; idx += 1) {
            const lower = lines[idx].toLowerCase();
            if (signoffKeywords.some((keyword) => lower.startsWith(keyword))) {
              signoffIndex = idx;
              break;
            }
          }

          if (signoffIndex <= 0) {
            return null;
          }

          const body = lines.slice(0, signoffIndex).join("\n").trim();
          const signature = lines.slice(signoffIndex).join("\n").trim();

          if (!body || !signature) {
            return null;
          }

          return { body, signature };
        };

        const savedSectionMap = new Map<string, SavedSection>();
        const savedSectionContentMap = new Map<string, string>();

        const blurbs: TemplateBlurb[] = sections.map((section) => {
          const allowedTypes: TemplateBlurb["type"][] = ["intro", "paragraph", "closer", "signature"];
          const sectionType = allowedTypes.includes(section.type as TemplateBlurb["type"])
            ? (section.type as TemplateBlurb["type"])
            : "intro";

          if (section.id) {
            savedSectionMap.set(section.id, section);
          }
          const normalizedKey = normalizeContentKey(section.content);
          if (normalizedKey && !savedSectionContentMap.has(normalizedKey)) {
            savedSectionContentMap.set(normalizedKey, section.content);
          }

          const signoffParts = extractSignoffParts(section.content);
          if (signoffParts) {
            const baseKey = normalizeContentKey(signoffParts.body);
            if (baseKey && !savedSectionContentMap.has(baseKey)) {
              savedSectionContentMap.set(baseKey, section.content);
            }
          }

          return {
            id: section.id!,
            type: sectionType,
            title: section.title,
            content: section.content,
            tags: Array.from(new Set([...(section.tags ?? []), ...(section.purpose_tags ?? [])])),
            isDefault: (section.type as string) === "intro",
            status: "approved" as const,
            confidence: "high" as const,
            timesUsed: section.times_used || 0,
            lastUsed: section.last_used,
            createdAt: section.created_at!,
            updatedAt: section.updated_at!
          };
        });

        const templateToUse =
          templates.length > 0 ? templates[0] : buildTemplateFromSections(sections);

        const templateWithSignatures = {
          ...templateToUse,
          sections: (templateToUse.sections || []).map((section) => {
            // For static sections, prefer the latest saved section content so edits to
            // saved_sections are reflected in the template view without manual copy/paste.
            if (!section.isStatic) {
              return section;
            }

            let replacementContent: string | undefined;

            const savedSectionId = (section as any).savedSectionId as string | undefined;
            if (savedSectionId) {
              const saved = savedSectionMap.get(savedSectionId);
              if (saved?.content) {
                replacementContent = saved.content;
              }
            }

            if (!replacementContent && section.staticContent) {
              const normalized = normalizeContentKey(section.staticContent);
              const matched = normalized ? savedSectionContentMap.get(normalized) : undefined;
              if (matched) {
                replacementContent = matched;
              }
            }

            if (replacementContent && replacementContent !== section.staticContent) {
              return {
                ...section,
                staticContent: replacementContent
              };
            }

            return section;
          })
        };

        setTemplate(templateWithSignatures);
        setTemplateBlurbs(blurbs);
        setIsDirty(false);
        setLastSavedAtIso(templateWithSignatures.updatedAt ?? null);
        setWorkHistoryLibrary(libraryCompanies);
      } catch (err) {
        if (!loadMountedRef.current) {
          return;
        }
        console.error("Error loading template data:", err);
        const message = err instanceof Error ? err.message : "Failed to load template data";
        setError(message);
        setTemplate(createEmptyTemplate());
        setTemplateBlurbs([]);
        setWorkHistoryLibrary([]);
        setIsDirty(false);
        setLastSavedAtIso(null);
      } finally {
        if (loadMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      loadMountedRef.current = false;
    };
  }, [user?.id]);

  const getBlurbTitleByContent = (content: string, sectionType: string) => {
    const blurb = templateBlurbs.find(b => b.content === content && b.type === sectionType);
    return blurb?.title || 'Custom Content';
  };

  const getSectionTypeLabel = (type: string) => {
    switch (type) {
      case 'intro': return 'Introduction';
      case 'paragraph': return 'Body Paragraph';
      case 'closer': return 'Closing';
      case 'signature': return 'Signature';
      default: return type;
    }
  };

  const updateTemplateState = (updater: (prev: CoverLetterTemplate) => CoverLetterTemplate) => {
    setTemplate((prev) => {
      const next = updater(prev);
      if (next !== prev) {
        revisionRef.current += 1;
        setDirtyRevision(revisionRef.current);
        setIsDirty(true);
        setAutoSaveError(null);
      }
      return next;
    });
  };

  useEffect(() => {
    templateRef.current = template;
  }, [template]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const isPersistableTemplate = (templateId: string | undefined) =>
    Boolean(templateId && templateId !== 'draft-template');

  const saveTemplate = async (reason: 'autosave' | 'done'): Promise<boolean> => {
    const templateId = templateRef.current.id;
    if (!isPersistableTemplate(templateId)) return true;

    if (saveInFlightRef.current) {
      await saveInFlightRef.current;
    }

    if (!isDirtyRef.current) return true;

    const revisionAtStart = revisionRef.current;
    const payload = {
      name: templateRef.current.name,
      sections: templateRef.current.sections,
    };

    const savePromise = (async () => {
      if (reason === 'autosave') setIsAutoSaving(true);
      else setIsSaving(true);
      setAutoSaveError(null);

      try {
        await CoverLetterTemplateService.updateTemplate(templateId, payload);
        const nowIso = new Date().toISOString();
        setLastSavedAtIso(nowIso);

        if (revisionRef.current === revisionAtStart) {
          setIsDirty(false);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Please try again.';
        console.error('[CoverLetterTemplate] saveTemplate failed:', err);
        setAutoSaveError(message);
        return false;
      } finally {
        if (reason === 'autosave') setIsAutoSaving(false);
        else setIsSaving(false);
      }
    })();

    saveInFlightRef.current = savePromise;
    const ok = await savePromise;
    if (saveInFlightRef.current === savePromise) {
      saveInFlightRef.current = null;
    }
    return ok;
  };

  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      window.clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    if (!isDirty) return;
    if (!isPersistableTemplate(template.id)) return;
    if (isSaving) return;

    autoSaveTimeoutRef.current = window.setTimeout(() => {
      void saveTemplate('autosave');
    }, 1200);

    return () => {
      if (autoSaveTimeoutRef.current) {
        window.clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, [dirtyRevision, isDirty, template.id, isSaving]);

  const updateSection = (sectionId: string, updates: Partial<CoverLetterSection>) => {
    updateTemplateState(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  const addSection = (insertAfterIndex?: number) => {
    setShowAddSectionModal(true);
  };

  const createSectionFromModal = () => {
    if (!selectedContentType) return;
    
    if (editingSection) {
      // Update existing section
      if (contentMethod === 'static' && selectedContent) {
        const isSavedSection = selectedContentType === 'saved';
        updateSection(editingSection, {
          contentType: selectedContentType === 'story' ? 'work-history' : 'saved',
          isStatic: true,
          staticContent: selectedContent.content || selectedContent.staticContent,
          savedSectionId: isSavedSection ? selectedContent.id ?? selectedContent.savedSectionId : undefined,
          blurbCriteria: undefined
        });
      } else if (contentMethod === 'dynamic') {
        updateSection(editingSection, {
          contentType: selectedContentType === 'story' ? 'work-history' : 'saved',
          isStatic: false,
          staticContent: undefined,
          savedSectionId: undefined,
          blurbCriteria: {
            goals: [`add ${selectedContentType === 'story' ? 'work history story' : 'saved section'} based on job description`]
          }
        });
      }
      
      // Reset modal state
      setShowAddSectionModal(false);
      setSelectedContentType(null);
      setContentMethod(null);
      setShowSelectionPanel(false);
      setSelectedCompany('');
      setSelectedRole('');
      setSelectedReusableType('');
      setSelectedContent(null);
      setEditingSection(null);
      return;
    }
    
    // Create new section
    let newSection: CoverLetterSection;
    
    if (contentMethod === 'dynamic') {
      // For dynamic selection, create a section with blurb criteria
      newSection = {
        id: `section-${Date.now()}`,
        type: 'paragraph',
        contentType: selectedContentType === 'story' ? 'work-history' : 'saved',
        isStatic: false,
        staticContent: undefined,
        savedSectionId: undefined,
        blurbCriteria: {
          goals: [`add ${selectedContentType === 'story' ? 'work history story' : 'saved section'} based on job description`]
        },
        order: template.sections.length + 1
      };
    } else {
      // For static selection, require selected content
      if (!selectedContent) return;
      
      const isSavedSection = selectedContentType === 'saved';
      newSection = {
        id: `section-${Date.now()}`,
        type: 'paragraph',
        contentType: selectedContentType === 'story' ? 'work-history' : 'saved',
        isStatic: true,
        staticContent: selectedContent.content || selectedContent.staticContent,
        savedSectionId: isSavedSection ? selectedContent.id ?? selectedContent.savedSectionId : undefined,
        blurbCriteria: undefined,
        order: template.sections.length + 1
      };
    }
    
    updateTemplateState(prev => {
      const newSections = [...prev.sections, newSection];
      return { ...prev, sections: newSections };
    });
    
    // Reset modal state
    setShowAddSectionModal(false);
    setSelectedContentType(null);
    setContentMethod(null);
    setShowSelectionPanel(false);
    setSelectedCompany('');
    setSelectedRole('');
    setSelectedReusableType('');
    setSelectedContent(null);
  };

  const handleContentSelection = (content: any) => {
    setSelectedContent(content);
    createSectionFromModal();
  };

  const selectBlurbForSection = (sectionId: string, blurb: TemplateBlurb) => {
    updateSection(sectionId, { 
      contentType: 'saved',
      isStatic: true,
      staticContent: blurb.content,
      savedSectionId: blurb.id,
      blurbCriteria: undefined
    });
    setShowBlurbSelector(false);
    setSelectedSection(null);
  };

  const getAvailableBlurbs = (sectionType: string) => {
    if (!sectionType) return templateBlurbs;
    return templateBlurbs.filter(blurb => blurb.type === sectionType);
  };

  const handleSelectWorkHistoryBlurb = (blurb: WorkHistoryBlurb) => {
    if (selectedSection) {
      updateSection(selectedSection, { 
        contentType: 'work-history',
        isStatic: true,
        staticContent: blurb.content,
        savedSectionId: undefined,
        blurbCriteria: undefined
      });
      setShowWorkHistorySelector(false);
      setSelectedSection(null);
    }
  };

  const handleCreateContentType = () => {
    if (newContentType.label.trim() && newContentType.description.trim()) {
      const newType = {
        type: newContentType.label.toLowerCase().replace(/\s+/g, '-'),
        label: newContentType.label,
        description: newContentType.description,
        icon: FileText,
        isDefault: false
      };
      
      setUserContentTypes(prev => [...prev, newType]);
      setNewContentType({ label: '', description: '' });
      setShowAddContentTypeModal(false);
    }
  };

  const handleCreateReusableContent = () => {
    if (newReusableContent.title.trim() && newReusableContent.content.trim()) {
      const allowedTypes: TemplateBlurb['type'][] = ['intro', 'paragraph', 'closer', 'signature'];
      const sectionType = allowedTypes.includes(newReusableContent.contentType as TemplateBlurb['type'])
        ? newReusableContent.contentType as TemplateBlurb['type']
        : 'intro';

      const newBlurb: TemplateBlurb = {
        id: `${newReusableContent.contentType}-${Date.now()}`,
        type: sectionType,
        title: newReusableContent.title,
        content: newReusableContent.content,
        tags: newReusableContent.tags ? newReusableContent.tags.split(',').map(tag => tag.trim()) : [],
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setTemplateBlurbs(prev => [...prev, newBlurb]);
      setNewReusableContent({ title: '', content: '', tags: '', contentType: '' });
      setShowAddReusableContentModal(false);
    }
  };

  const removeSection = (sectionId: string) => {
    updateTemplateState(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'bg-confidence-high',
      medium: 'bg-confidence-medium',
      low: 'bg-confidence-low'
    };
    return colors[confidence];
  };

  const savedSectionGroups = [
    {
      value: 'intro',
      label: 'Introduction',
      description: 'Opening paragraphs that grab attention and introduce you'
    },
    {
      value: 'paragraph',
      label: 'Body Paragraph',
      description: 'Static supporting paragraphs kept verbatim from uploads'
    },
    {
      value: 'closer',
      label: 'Closing',
      description: 'Professional closing paragraphs that wrap up your letter'
    }
  ];

  const matchesProfilePrefix = (fileName: string | null | undefined, profileId: string) => {
    if (!fileName) return false;
    const normalized = fileName.toUpperCase();
    const pid = profileId.toUpperCase();
    return (
      normalized.startsWith(`${pid}_`) ||
      normalized.startsWith(`${pid}-`) ||
      normalized.startsWith(`${pid} `) ||
      normalized.startsWith(`${pid}.`)
    );
  };

  const fetchWorkHistoryLibrary = async (currentUserId: string, currentProfileId?: string): Promise<WorkHistoryCompany[]> => {
    setIsLibraryLoading(true);
    setLibraryError(null);

    try {
      const client = supabase as any;

      const { data: sourceRows, error: sourceError } = await client
        .from('sources')
        .select('id, file_name')
        .eq('user_id', currentUserId);

      if (sourceError) throw sourceError;

      let allowedSourceIds: string[] | undefined;

      if (currentProfileId) {
        const matchingSources = (sourceRows || []).filter((row) =>
          matchesProfilePrefix(row.file_name, currentProfileId)
        );

        if (matchingSources.length === 0) {
          setWorkHistoryLibrary([]);
          return [];
        }

        allowedSourceIds = matchingSources.map((row) => row.id);
      }

      const buildWorkItemsQuery = () => {
        let query = client
          .from('work_items')
          .select('id, title, description, company_id, source_id, created_at, updated_at, start_date, end_date, tags, metrics')
          .eq('user_id', currentUserId);

        if (allowedSourceIds && allowedSourceIds.length > 0) {
          query = query.in('source_id', allowedSourceIds);
        }

        return query;
      };

      const buildStoriesQuery = () => {
        let query = client
          .from('stories')
          .select('id, title, content, status, confidence, tags, times_used, last_used, work_item_id, source_id, created_at, updated_at')
          .eq('user_id', currentUserId);

        if (allowedSourceIds && allowedSourceIds.length > 0) {
          query = query.in('source_id', allowedSourceIds);
        }

        return query;
      };

      const buildCompaniesQuery = () =>
        client
          .from('companies')
          .select('id, name, description, created_at, updated_at')
          .eq('user_id', currentUserId);

      const [
        { data: workItems, error: workItemsError },
        { data: stories, error: storiesError },
        { data: companies, error: companiesError }
      ] = await Promise.all([
        buildWorkItemsQuery(),
        buildStoriesQuery(),
        buildCompaniesQuery()
      ]);

      if (workItemsError) throw workItemsError;
      if (storiesError) throw storiesError;
      if (companiesError) throw companiesError;

      const storyIds = (stories || []).map((story) => story.id).filter(Boolean);
      let variationsByParent = new Map<string, any[]>();
      if (storyIds.length > 0) {
        let variationsQuery = client
          .from('content_variations')
          .select('id, content, parent_entity_id, target_job_title, gap_tags, created_at, created_by')
          .eq('user_id', currentUserId)
          .eq('parent_entity_type', 'approved_content');

        if (allowedSourceIds && allowedSourceIds.length > 0) {
          variationsQuery = variationsQuery.in('parent_entity_id', storyIds);
        } else {
          variationsQuery = variationsQuery.in('parent_entity_id', storyIds);
        }

        const { data: variations, error: variationsError } = await variationsQuery
          .order('created_at', { ascending: false });

        if (variationsError) {
          console.warn('[CoverLetterTemplate] Failed to load story variations for library:', variationsError);
        } else {
          (variations || []).forEach((variation: any) => {
            const parentId = variation.parent_entity_id;
            if (!parentId) return;
            const list = variationsByParent.get(parentId) || [];
            list.push(variation);
            variationsByParent.set(parentId, list);
          });
        }
      }

      const companyMap = new Map<string, WorkHistoryCompany>();
      const roleMap = new Map<string, WorkHistoryRole>();

      const ensureCompany = (companyId?: string | null) => {
        const fallbackId = companyId ?? 'unknown-company';
        if (!companyMap.has(fallbackId)) {
          const companyRecord = (companies || []).find((company) => company.id === fallbackId);
          companyMap.set(fallbackId, {
            id: fallbackId,
            name: companyRecord?.name || 'Untitled Company',
            description: companyRecord?.description || '',
            tags: [],
            source: 'resume',
            createdAt: companyRecord?.created_at || new Date().toISOString(),
            updatedAt: companyRecord?.updated_at || companyRecord?.created_at || new Date().toISOString(),
            roles: []
          });
        }

        return companyMap.get(fallbackId)!;
      };

      (workItems || []).forEach((item) => {
        const company = ensureCompany(item.company_id);
        const metricsArray = Array.isArray(item.metrics)
          ? item.metrics.map((metric: any) => String(metric))
          : [];
        const tagsArray = Array.isArray(item.tags)
          ? item.tags.map((tag: any) => String(tag))
          : [];

        const role: WorkHistoryRole = {
          id: item.id,
          companyId: company.id,
          title: item.title || 'Role',
          type: 'full-time',
          startDate: item.start_date || '',
          endDate: item.end_date || undefined,
          description: item.description || '',
          tags: tagsArray,
          outcomeMetrics: metricsArray,
          blurbs: [],
          externalLinks: [],
          createdAt: item.created_at || new Date().toISOString(),
          updatedAt: item.updated_at || item.created_at || new Date().toISOString()
        };

        roleMap.set(item.id, role);
        company.roles.push(role);
      });

      (stories || []).forEach((story) => {
        if (!story.work_item_id) return;
        const role = roleMap.get(story.work_item_id);
        if (!role) return;

        const blurb: WorkHistoryBlurb = {
          id: story.id,
          roleId: story.work_item_id,
          title: story.title || 'Untitled Story',
          content: story.content || '',
          outcomeMetrics: [],
          tags: Array.isArray(story.tags)
            ? story.tags.map((tag: any) => String(tag))
            : [],
          source: 'resume',
          status: (story.status as WorkHistoryBlurb['status']) || 'draft',
          confidence: (story.confidence as WorkHistoryBlurb['confidence']) || 'medium',
          timesUsed: story.times_used ?? 0,
          lastUsed: story.last_used ?? undefined,
          linkedExternalLinks: [],
          hasGaps: false,
          gapCount: 0,
          variations: (variationsByParent.get(story.id) || []).map((variation: any) => ({
            id: variation.id,
            content: variation.content,
            developedForJobTitle: variation.target_job_title || undefined,
            filledGap: undefined,
            jdTags: variation.gap_tags || [],
            tags: variation.gap_tags || [],
            createdAt: variation.created_at,
            createdBy: variation.created_by || 'AI',
          })),
          createdAt: story.created_at || new Date().toISOString(),
          updatedAt: story.updated_at || story.created_at || new Date().toISOString()
        };

        role.blurbs.push(blurb);
      });

      const companiesWithStories = Array.from(companyMap.values())
        .map((company) => ({
          ...company,
          roles: company.roles
            .map((role) => ({
              ...role,
              blurbs: role.blurbs
            }))
            .filter((role) => role.blurbs.length > 0)
        }))
        .filter((company) => company.roles.length > 0);

      setWorkHistoryLibrary(companiesWithStories);
      return companiesWithStories;
    } catch (libraryErr: any) {
      console.error('Error loading work history library:', libraryErr);
      setLibraryError(libraryErr?.message || 'Failed to load work history blurbs');
      setWorkHistoryLibrary([]);
      return [];
    } finally {
      setIsLibraryLoading(false);
    }

    return [];
  };

  const buildTemplateFromSections = (sections: SavedSection[]): CoverLetterTemplate => {
    if (!sections || sections.length === 0) {
      return createEmptyTemplate();
    }

    const sortedSections = [...sections].sort((a, b) => {
      const aDate = a.created_at || '';
      const bDate = b.created_at || '';
      return aDate.localeCompare(bDate);
    });

    const templateSections: CoverLetterSection[] = sortedSections.map((section, index) => {
      const allowedTypes: CoverLetterSection['type'][] = ['intro', 'paragraph', 'closer', 'signature'];
      const sectionType = allowedTypes.includes(section.type as CoverLetterSection['type'])
        ? (section.type as CoverLetterSection['type'])
        : 'paragraph';

      return {
        id: section.id || `${sectionType}-${index}`,
        type: sectionType,
        contentType: 'saved',
        isStatic: true,
        staticContent: section.content,
        order: index + 1
      };
    });

    return {
      ...createEmptyTemplate(),
      id: 'derived-template',
      sections: templateSections
    };
  };

  const buildPreviewSections = () => {
    const sections = [...(template.sections ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (sections.length === 0) {
      return [{
        content: 'Your template does not have any sections yet. Add introductions, body paragraphs, and a closing to preview the final letter.'
      }];
    }

    return sections.map((section, index) => {
      const typeLabel = getSectionTypeLabel(section.type);
      let content = '';

      if (section.isStatic && section.staticContent?.trim()) {
        content = section.staticContent.trim();
      } else {
        const goals = section.blurbCriteria?.goals;
        const goalsText = goals && goals.length > 0 ? ` focused on ${goals.join(', ')}` : '';

        if (section.contentType === 'work-history') {
          content = `[Dynamic ${typeLabel} story will be selected from your work history${goalsText}.]`;
        } else if (section.contentType === 'saved') {
          content = `[Dynamic ${typeLabel} from your saved sections will be inserted${goalsText}.]`;
        } else {
          content = `[Dynamic ${typeLabel} content will be generated when drafting the cover letter.]`;
        }
      }

      if (!content.trim()) {
        content = `[${typeLabel} content not provided yet.]`;
      }

      return { content };
    });
  };

  const handlePreviewTemplate = () => {
    const sections = buildPreviewSections();
    const preview = {
      id: 'template-preview',
      title: template.name || 'Template Preview',
      content: { sections },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setPreviewCoverLetter(preview);
    setShowPreviewModal(true);
  };

const reorderSections = (fromIndex: number, toIndex: number) => {
  updateTemplateState((prev) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= prev.sections.length) {
      return prev;
    }

    const sections = [...prev.sections];
    const [moved] = sections.splice(fromIndex, 1);
    let insertIndex = toIndex;

    if (fromIndex < toIndex) {
      insertIndex = insertIndex - 1;
    }

    if (insertIndex < 0) insertIndex = 0;
    if (insertIndex > sections.length) insertIndex = sections.length;

    sections.splice(insertIndex, 0, moved);

    const updatedSections = sections.map((section, idx) => ({
      ...section,
      order: idx + 1
    }));

    return {
      ...prev,
      sections: updatedSections
    };
  });
};

const handleDragStart = (event: React.DragEvent<HTMLDivElement>, index: number, sectionId: string) => {
  dragIndexRef.current = index;
  setDragOverIndex(index);
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', sectionId);
};

const handleDragOver = (event: React.DragEvent<HTMLDivElement>, index: number) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  if (dragOverIndex !== index) {
    setDragOverIndex(index);
  }
};

const handleDrop = (event: React.DragEvent<HTMLDivElement>, index: number) => {
  event.preventDefault();
  const fromIndex = dragIndexRef.current;
  if (fromIndex === null) return;
  reorderSections(fromIndex, index);
  dragIndexRef.current = null;
  setDragOverIndex(null);
};

const handleDropAtEnd = (event: React.DragEvent<HTMLDivElement>) => {
  event.preventDefault();
  const fromIndex = dragIndexRef.current;
  if (fromIndex === null) return;
  reorderSections(fromIndex, template.sections.length);
  dragIndexRef.current = null;
  setDragOverIndex(null);
};

const handleDragEnd = () => {
  dragIndexRef.current = null;
  setDragOverIndex(null);
};

const handleDone = async () => {
  if (!isPersistableTemplate(template.id)) {
    setIsDirty(false);
    navigate('/cover-letters');
    return;
  }

  const wasDirty = isDirtyRef.current;
  if (wasDirty) {
    const ok = await saveTemplate('done');
    if (!ok) {
      toast({
        title: 'Unable to save template',
        description: autoSaveError ?? 'Please try again.',
        variant: 'destructive',
      });
      return;
    }
  }

  if (wasDirty) {
    toast({
      title: 'Template saved',
      description: 'Your cover letter template is up to date.',
    });
  }
  navigate('/cover-letters');
};

  return (
    <div className="min-h-screen bg-background">
      <TemplateBanner
        onDone={handleDone}
        doneLabel="Done"
        isDoneDisabled={isSaving || isAutoSaving}
        statusNode={
          isPersistableTemplate(template.id) ? (
            <div className="flex items-center gap-2 text-xs">
              {isAutoSaving ? (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Saving…
                </span>
              ) : autoSaveError ? (
                <span className="flex items-center gap-1 text-destructive">
                  <X className="h-3.5 w-3.5" />
                  Auto-save failed
                </span>
              ) : isDirty ? (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Unsaved changes
                </span>
              ) : lastSavedAtIso ? (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                  Saved
                </span>
              ) : null}
            </div>
          ) : null
        }
        isDoneLoading={isSaving}
        previewButton={
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePreviewTemplate}
            className="flex items-center gap-2 hover:text-[#E32D9A] hover:border-[#E32D9A]"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        }
      />
      <div className={isTourActive ? 'pt-24' : ''}>
      
      {/* Page Header */}
      <div className="bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between py-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Cover Letter Templates</h1>
                <p className="text-muted-foreground">
                  Create and manage your cover letter templates
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4" />
                Add New Template
              </Button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="mb-6">
                <LoadingState isLoading loadingText="Loading template..." />
              </div>
            )}

            {/* Content Area */}
            <div>
              <div className="template-content-spacing mt-2">
                  {/* Template Settings */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Template Settings</CardTitle>
                        <div className="flex items-center gap-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                console.info('Duplicate template action coming soon');
                              }}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate Template
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                console.info('Export template action coming soon');
                              }}>
                                <FileText className="mr-2 h-4 w-4" />
                                Export Template
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                console.info('Template history action coming soon');
                              }}>
                                <Clock className="mr-2 h-4 w-4" />
                                Template History
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="template-name">Template Name</Label>
                          <Input
                            id="template-name"
                            value={template.name}
                            onChange={(e) => {
                              const { value } = e.target;
                              updateTemplateState(prev => (prev.name === value ? prev : { ...prev, name: value }));
                            }}
                            placeholder="Enter template name..."
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Insert Button at Top (if sections exist) */}
                  {template.sections.length > 0 && (
                    <SectionInsertButton
                      onClick={() => addSection(-1)}
                      variant="default"
                    />
                  )}
                  
                  {/* Sections */}
                  <div>
                    {template.sections.map((section, index) => (
                      <div
                        key={section.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, index, section.id)}
                        onDragOver={(event) => handleDragOver(event, index)}
                        onDrop={(event) => handleDrop(event, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <Card className={`relative ${dragOverIndex === index ? 'ring-2 ring-primary/40' : ''}`}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <CardTitle className="text-lg">
                                    {getSectionTypeLabel(section.type)} {section.type === 'paragraph' ? `${index}` : ''}
                                  </CardTitle>
                                  <CardDescription>
                                    {section.isStatic ? 'Static content' : 'Dynamic story matching'}
                                  </CardDescription>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                {/* Static Toggle - Always Visible */}
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`static-${section.id}`} className="text-sm">
                                    Static
                                  </Label>
                                  <Switch
                                    id={`static-${section.id}`}
                                    checked={section.isStatic}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        // If turning static ON, show blurb selector first
                                        setSelectedSection(section.id);
                                        if (section.type === 'intro' || section.type === 'closer' || section.type === 'signature') {
                                          setShowBlurbSelector(true);
                                        } else {
                                          setShowWorkHistorySelector(true);
                                        }
                                      } else {
                                        // If turning static OFF, just update the section
                                        updateSection(section.id, { 
                                          isStatic: false, 
                                          staticContent: undefined,
                                          blurbCriteria: {
                                            goals: ["describe the purpose of this paragraph"]
                                          }
                                        });
                                      }
                                    }}
                                  />
                                </div>
                                
                                {/* Overflow Menu for Other Actions */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      // Open edit modal with current section data
                                      if (section.isStatic) {
                                        // For static sections, pre-fill with current content
                                        setSelectedContentType(section.contentType === 'work-history' ? 'story' : 'saved');
                                        setContentMethod('static');
                                        setSelectedContent({
                                          content: section.staticContent,
                                          staticContent: section.staticContent
                                        });
                                      } else {
                                        // For dynamic sections, start with current settings
                                        setSelectedContentType(section.contentType === 'work-history' ? 'story' : 'saved');
                                        setContentMethod('dynamic');
                                        setSelectedContent(null);
                                      }
                                      setShowAddSectionModal(true);
                                      setEditingSection(section.id);
                                    }}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Content
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      // TODO: Implement duplicate section
                                    }}>
                                      <Copy className="mr-2 h-4 w-4" />
                                      Duplicate Section
                                    </DropdownMenuItem>
                                    {section.type === 'paragraph' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => {
                                          updateTemplateState(prev => ({
                                            ...prev,
                                            sections: prev.sections.filter(s => s.id !== section.id)
                                          }));
                                        }} className="text-destructive">
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete Section
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent>
                            {section.isStatic ? (
                              <div>
                                <div className="mb-3">
                                  <Badge variant="secondary" className="mb-2">
                                    {getBlurbTitleByContent(section.staticContent || '', section.type)}
                                  </Badge>
                                  <div className="text-sm text-muted-foreground whitespace-pre-line">
                                    {section.staticContent}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                Use best matching body paragraph story based on job description and goals
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        
                        {/* Insert Button Between Sections */}
                        {index < template.sections.length - 1 && (
                          <SectionInsertButton
                            onClick={() => addSection(index)}
                            variant="default"
                          />
                        )}
                      </div>
                    ))}

                    {template.sections.length > 0 && (
                      <div
                        className={`mt-4 h-10 rounded-lg border-2 border-dashed transition-colors ${dragOverIndex === template.sections.length ? 'border-primary/60 bg-primary/5' : 'border-muted'}`}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragOverIndex(template.sections.length);
                        }}
                        onDrop={handleDropAtEnd}
                        onDragLeave={(event) => {
                          event.preventDefault();
                          if (dragOverIndex === template.sections.length) {
                            setDragOverIndex(null);
                          }
                        }}
                      />
                    )}
                  </div>
                  
                  {/* Bottom Add Section Button - Only show if no sections exist */}
                  {template.sections.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mb-4">
                        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                          <Plus className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No sections yet</h3>
                        <p className="text-muted-foreground mb-6">
                          Start building your cover letter template by adding your first section
                        </p>
                      </div>
                      <Button 
                        variant="primary" 
                        onClick={() => addSection()}
                        size="lg"
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-5 w-5" />
                        Add Your First Section
                      </Button>
                    </div>
                  ) : (
                    <SectionInsertButton
                      onClick={() => addSection()}
                      variant="default"
                    />
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Blurb Selector Modal */}
      {showBlurbSelector && selectedSection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Choose a Story</CardTitle>
                  <CardDescription>
                    Select a pre-written story for your {getSectionTypeLabel(template.sections.find(s => s.id === selectedSection)?.type || '')} section
                  </CardDescription>
                </div>
                <Button 
                  variant="tertiary" 
                  onClick={() => {
                    setShowBlurbSelector(false);
                    setSelectedSection(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <div className="space-y-3">
                {/* Add New Button */}
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center">
                      <Button 
                        variant="secondary"
                        onClick={() => {
                          const allowedTypesForCreation: TemplateBlurb['type'][] = ['intro', 'paragraph', 'closer', 'signature'];
                          const rawType = template.sections.find(s => s.id === selectedSection)?.type;
                          const sectionType = allowedTypesForCreation.includes(rawType as TemplateBlurb['type'])
                            ? rawType as TemplateBlurb['type']
                            : 'intro';
                          setShowBlurbSelector(false);
                          setSelectedSection(null);
                          setNewReusableContent({
                            title: '',
                            content: '',
                            tags: '',
                            contentType: sectionType
                          });
                          setShowAddReusableContentModal(true);
                        }}
                        className="flex items-center gap-2"
                      >
                      <Plus className="h-4 w-4" />
                      Create New {getSectionTypeLabel(template.sections.find(s => s.id === selectedSection)?.type || '')} Story
                    </Button>
                  </CardContent>
                </Card>
                
                {/* Existing Stories */}
                {getAvailableBlurbs(template.sections.find(s => s.id === selectedSection)?.type || '').map((blurb) => (
                  <Card 
                    key={blurb.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => selectBlurbForSection(selectedSection, blurb)}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">{blurb.title}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{blurb.content}</p>
                      <div className="text-xs text-muted-foreground">
                        Click to select this story
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Work History Blurb Selector */}
      {showWorkHistorySelector && selectedSection && (
        <WorkHistoryBlurbSelector
          companies={workHistoryLibrary}
          isLoading={isLibraryLoading}
          error={libraryError}
          onSelectBlurb={handleSelectWorkHistoryBlurb}
          onCancel={() => {
            setShowWorkHistorySelector(false);
            setSelectedSection(null);
          }}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upload New Cover Letter</CardTitle>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Free plans are limited to one template. Uploading a new cover letter will replace your existing content and overwrite your existing selections.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="primary" 
                  className="flex-1"
                  asChild
                >
                  <Link to="/cover-letters">
                    I understand, proceed
                  </Link>
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => {
                    // TODO: Add navigation to pricing page
                    setShowUploadModal(false);
                  }}
                >
                  Explore paid plans
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add New Content Type Modal */}
      {showAddContentTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add New Content Type</CardTitle>
                <button
                  onClick={() => setShowAddContentTypeModal(false)}
                  className="h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="content-type-label">Label</Label>
                  <Input
                    id="content-type-label"
                    placeholder="e.g., Experience Summary, Skills Highlight"
                    value={newContentType.label}
                    onChange={(e) => setNewContentType({ ...newContentType, label: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="content-type-description">Description</Label>
                  <Textarea
                    id="content-type-description"
                    placeholder="Describe what this content type is for..."
                    value={newContentType.description}
                    onChange={(e) => setNewContentType({ ...newContentType, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button 
                  variant="primary" 
                  className="w-full"
                  onClick={handleCreateContentType}
                  disabled={!newContentType.label.trim() || !newContentType.description.trim()}
                >
                  Create Content Type
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

              {/* Add Saved Section Modal */}
      <FormModal
        isOpen={showAddReusableContentModal}
        onClose={() => setShowAddReusableContentModal(false)}
        title={`Add New ${newReusableContent.contentType ? newReusableContent.contentType.charAt(0).toUpperCase() + newReusableContent.contentType.slice(1) : 'Section'}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="reusable-content-title">Title</Label>
            <Input
              id="reusable-content-title"
              placeholder="e.g., Professional Introduction, Passionate Closing"
              value={newReusableContent.title}
              onChange={(e) => setNewReusableContent({ ...newReusableContent, title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="reusable-content-content">Content</Label>
            <Textarea
              id="reusable-content-content"
              placeholder="Write your content here..."
              value={newReusableContent.content}
              onChange={(e) => setNewReusableContent({ ...newReusableContent, content: e.target.value })}
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="reusable-content-tags">Tags (comma-separated)</Label>
            <Input
              id="reusable-content-tags"
              placeholder="e.g., professional, passionate, technical"
              value={newReusableContent.tags}
              onChange={(e) => setNewReusableContent({ ...newReusableContent, tags: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button 
            variant="primary" 
            className="w-full"
            onClick={handleCreateReusableContent}
            disabled={!newReusableContent.title.trim() || !newReusableContent.content.trim()}
          >
            Create Content
          </Button>
        </div>
      </FormModal>

      {/* Add New Section Modal */}
      {showAddSectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-6xl max-h-[90vh] bg-background rounded-lg shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold">{editingSection ? 'Edit Section' : 'Add New Section'}</h2>
                <p className="text-muted-foreground">
                  {editingSection ? 'Modify the content and settings of this section' : 'Choose how you want to add content to your template'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddSectionModal(false);
                  setSelectedContentType(null);
                  setContentMethod(null);
                  setShowSelectionPanel(false);
                  setSelectedCompany('');
                  setSelectedRole('');
                  setSelectedReusableType('');
                  setSelectedContent(null);
                  setEditingSection(null);
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="flex h-auto relative">
              {/* Single Panel - Content Type Selection */}
              <div className={`w-full p-6 transition-transform duration-300 ease-in-out ${showSelectionPanel ? '-translate-x-full' : 'translate-x-0'}`}>
                <div className="space-y-6">
                  {/* Combined Step 1 & 2: Content Type and Method Selection */}
                  <div className="space-y-6">
                    {/* Step 1: Content Type */}
                    <div className="mb-4">
                      <Label className="text-base font-medium">1. Choose Content Type</Label>
                      <div className="flex gap-3 mt-2">
                        <Button
                          variant={selectedContentType === 'story' ? 'default' : 'secondary'}
                          onClick={() => setSelectedContentType('story')}
                          className="flex-1 h-20 flex-col justify-center items-center gap-1"
                        >
                          <div className="text-center">
                            <div className="font-medium">Story</div>
                            <div className="text-sm text-muted-foreground">From your work history</div>
                          </div>
                        </Button>
                        <Button
                          variant={selectedContentType === 'saved' ? 'default' : 'secondary'}
                          onClick={() => setSelectedContentType('saved')}
                          className="flex-1 h-20 flex-col justify-center items-center gap-1"
                        >
                          <div className="text-center">
                            <div className="font-medium">Saved Sections</div>
                            <div className="text-sm text-muted-foreground">Custom templates</div>
                          </div>
                        </Button>
                      </div>
                    </div>

                    {/* Step 2: Content Method */}
                    <div className="mt-4">
                      <Label className="text-base font-medium">2. Choose Method</Label>
                      <div className="flex gap-3 mt-2">
                        <Button
                          variant={contentMethod === 'dynamic' ? 'default' : 'secondary'}
                          onClick={() => setContentMethod('dynamic')}
                          className="flex-1 h-20 flex-col justify-center items-center gap-1"
                        >
                          <div className="text-center">
                            <span className="font-medium">Dynamic (Default)</span>
                            <span className="text-sm text-muted-foreground block">Intelligently match {selectedContentType === 'story' ? 'stories' : 'content'} based on job description</span>
                          </div>
                        </Button>
                        <Button
                          variant={contentMethod === 'static' ? 'default' : 'secondary'}
                          onClick={() => setContentMethod('static')}
                          className="flex-1 h-20 flex-col justify-center items-center gap-1"
                        >
                          <div className="text-center">
                            <span className="font-medium">Static (Custom)</span>
                            <span className="text-sm text-muted-foreground block">Choose specific content from your library</span>
                          </div>
                        </Button>
                      </div>
                    </div>

                    {/* CTA Button - Always visible, enabled when both selections are made */}
                    <div className="pt-4 flex justify-end">
                      {contentMethod === 'dynamic' && (
                        <Button
                          variant="default"
                          disabled={!selectedContentType || !contentMethod}
                          onClick={() => {
                            // Create dynamic section
                            createSectionFromModal();
                          }}
                        >
                          {editingSection ? 'Update Section' : 'Add Section'}
                        </Button>
                      )}
                      {contentMethod === 'static' && (
                        <Button
                          variant="default"
                          disabled={!selectedContentType || !contentMethod}
                          onClick={() => {
                            if (editingSection && selectedContent) {
                              // If editing and content is already selected, update immediately
                              createSectionFromModal();
                            } else {
                              // Otherwise, show selection panel
                              setShowSelectionPanel(true);
                            }
                          }}
                        >
                          {editingSection && selectedContent ? 'Update Section' : 'Continue to Selection'}
                        </Button>
                      )}
                      {!contentMethod && (
                        <Button
                          variant="default"
                          disabled={!selectedContentType || !contentMethod}
                          onClick={() => {}}
                        >
                          {editingSection ? 'Update Section' : 'Add Section'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

                                {/* Content Selection Panel - Slides in from right */}
                  <div className={`absolute top-0 right-0 w-full h-full bg-background transition-transform duration-300 ease-in-out ${showSelectionPanel ? 'translate-x-0' : 'translate-x-full'}`}>

                  {/* Content Selection */}
                  <div className="p-6 h-full overflow-y-auto">
                    {/* Single Dynamic Back Button - Always visible on slide-in panel */}
                    <div className="mb-4">
                      <span 
                        className="cursor-pointer text-primary hover:text-primary/80 font-medium text-sm"
                        onClick={() => {
                          if (selectedRole) {
                            setSelectedRole('');
                          } else if (selectedCompany) {
                            setSelectedCompany('');
                          } else if (selectedReusableType) {
                            setSelectedReusableType('');
                          } else {
                            // Go back to main modal screen
                            setShowSelectionPanel(false);
                          }
                        }}
                      >
                        {selectedRole ? '← Back to Role' : selectedCompany ? '← Back to Company' : selectedReusableType ? '← Back to Content Types' : '← Back'}
                      </span>
                    </div>
                    
                    {selectedContentType === 'story' && (
                      <div>
                        {isLibraryLoading ? (
                          <div className="p-4 border border-dashed rounded-lg text-sm text-muted-foreground text-center">
                            Loading stories...
                          </div>
                        ) : libraryError ? (
                          <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg text-sm text-destructive">
                            {libraryError}
                          </div>
                        ) : workHistoryLibrary.length === 0 ? (
                          <div className="p-4 border border-dashed rounded-lg text-sm text-muted-foreground text-center">
                            No approved stories available yet. Upload a resume or add work history blurbs to populate this list.
                          </div>
                        ) : (
                          <div className="space-y-4">
                        {!selectedCompany && (
                          <div className="space-y-2">
                                {workHistoryLibrary.map((company) => {
                                  const roleCount = company.roles.filter((role) => role.blurbs.length > 0).length;
                                  return (
                              <div
                                key={company.id}
                                className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                                      onClick={() => {
                                        if (roleCount === 0) return;
                                        setSelectedCompany(company.id);
                                        setSelectedRole('');
                                      }}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium">{company.name}</h4>
                                          {company.description && (
                                    <p className="text-sm text-muted-foreground">{company.description}</p>
                                          )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                          <Badge variant="secondary">{roleCount} role{roleCount === 1 ? '' : 's'}</Badge>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>
                                  );
                                })}
                          </div>
                        )}

                        {selectedCompany && !selectedRole && (
                          <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCompany('');
                                      setSelectedRole('');
                                    }}
                                    className="h-8 px-2"
                                  >
                                    ← Back
                                  </Button>
                                </div>
                                {workHistoryLibrary
                                  .find((company) => company.id === selectedCompany)
                                  ?.roles.filter((role) => role.blurbs.length > 0)
                                  .map((role) => (
                                <div
                                  key={role.id}
                                  className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                                  onClick={() => setSelectedRole(role.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-medium">{role.title}</h4>
                                          {role.description && (
                                      <p className="text-sm text-muted-foreground">{role.description}</p>
                                          )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                          <Badge variant="secondary">{role.blurbs.length} story{role.blurbs.length === 1 ? '' : 's'}</Badge>
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}

                        {selectedRole && (
                          <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedRole('')}
                                    className="h-8 px-2"
                                  >
                                    ← Back
                                  </Button>
                                </div>
                                {workHistoryLibrary
                                  .find((company) => company.id === selectedCompany)
                                  ?.roles.find((role) => role.id === selectedRole)
                              ?.blurbs.map((blurb) => (
                                <div
                                  key={blurb.id}
                                  className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                                  onClick={() => handleContentSelection(blurb)}
                                >
                                  <div className="space-y-3">
                                    <h4 className="font-medium">{blurb.title}</h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                                          {blurb.content || 'No story content captured yet.'}
                                        </p>
                                  </div>
                                </div>
                              ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedContentType === 'saved' && (
                      <div>
                        {!selectedReusableType ? (
                          <div className="space-y-2">
                            {savedSectionGroups.map((group) => {
                              const count = templateBlurbs.filter(blurb => blurb.type === group.value).length;
                              return (
                              <div
                                  key={group.value}
                                className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                                  onClick={() => {
                                    if (count === 0) return;
                                    setSelectedReusableType(group.value);
                                  }}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                      <h4 className="font-medium">{group.label}</h4>
                                      <p className="text-sm text-muted-foreground">{group.description}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                        {count} item{count === 1 ? '' : 's'}
                                    </Badge>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>
                              );
                            })}
                            {templateBlurbs.length === 0 && (
                              <div className="p-3 border border-dashed rounded-lg text-sm text-muted-foreground text-center">
                                Upload a cover letter or create a saved section to populate this library.
                          </div>
                        )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedReusableType('')}
                                className="h-8 px-2"
                              >
                                ← Back
                              </Button>
                              <span className="text-sm text-muted-foreground">
                                {savedSectionGroups.find(group => group.value === selectedReusableType)?.label}
                              </span>
                            </div>
                            {templateBlurbs.filter(blurb => blurb.type === selectedReusableType).length === 0 ? (
                              <div className="p-4 border border-dashed rounded-lg text-sm text-muted-foreground text-center">
                                No saved sections of this type yet.
                              </div>
                            ) : (
                              templateBlurbs
                                .filter(blurb => blurb.type === selectedReusableType)
                              .map((blurb) => (
                                <div
                                  key={blurb.id}
                                  className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                                  onClick={() => handleContentSelection(blurb)}
                                >
                                  <div className="space-y-3">
                                    <h4 className="font-medium">{blurb.title}</h4>
                                      <p className="text-sm text-muted-foreground whitespace-pre-line">{blurb.content}</p>
                                  </div>
                                </div>
                                ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tour Banner */}
      {isTourActive && currentTourStep && (
        <TourBannerFull
          currentStep={tourStep}
          totalSteps={tourSteps.length}
          title={currentTourStep.title}
          description={currentTourStep.description}
          onNext={nextStep}
          onPrevious={previousStep}
          onCancel={cancelTour}
          canGoNext={tourStep < tourSteps.length - 1}
          canGoPrevious={tourStep > 0}
          isLastStep={tourStep === tourSteps.length - 1}
        />
      )}

      {/* Preview Modal */}
      <CoverLetterViewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        coverLetter={previewCoverLetter}
      />
      </div>
    </div>
  );
}
