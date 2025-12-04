import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  FileText, 
  LayoutTemplate, 
  Mail, 
  Trophy, 
  Users, 
  BarChart3,
  Target,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Calendar,
  TrendingUp
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ContentQualityWidget, ContentQualityWidgetRef, ContentTypeFilter, SeverityFilter } from "@/components/dashboard/ContentQualityWidget";
import { UserGoalsModal } from "@/components/user-goals/UserGoalsModal";
import { MyVoiceModal } from "@/components/user-voice/MyVoiceModal";
import { MyDataModal } from "@/components/user-data/MyDataModal";
import { TotalGapsWidget } from "@/components/dashboard/TotalGapsWidget";
import { WorkHistoryGapsCountWidget } from "@/components/dashboard/WorkHistoryGapsCountWidget";
import { SavedSectionsGapsCountWidget } from "@/components/dashboard/SavedSectionsGapsCountWidget";
import { CoverLettersGapsCountWidget } from "@/components/dashboard/CoverLettersGapsCountWidget";
import { HighSeverityGapsWidget } from "@/components/dashboard/HighSeverityGapsWidget";
import { MediumSeverityGapsWidget } from "@/components/dashboard/MediumSeverityGapsWidget";
import { LowSeverityGapsWidget } from "@/components/dashboard/LowSeverityGapsWidget";
import { useGapSummary } from "@/hooks/useGapSummary";
import { useContentItemsWithGaps } from "@/hooks/useContentItemsWithGaps";
import { useAuth } from "@/contexts/AuthContext";

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: string;
  completed: boolean;
  link: string;
}

export default function NewUserDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, updateProfile } = useAuth();
  const gapSummary = useGapSummary();
  const contentItemsWithGaps = useContentItemsWithGaps();
  const contentQualityWidgetRef = React.useRef<ContentQualityWidgetRef>(null);
  
  // Modal states for Personalize Narrata
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [contentTypeFilter, setContentTypeFilter] = React.useState<ContentTypeFilter>('all');
  const [severityFilter, setSeverityFilter] = React.useState<SeverityFilter>('all');
  
  // Single source of truth for scroll offset so widgets remain visible above tabs
  const getTabsScrollOffset = React.useCallback(() => {
    const isMobile = window.innerWidth < 1024;
    return isMobile ? 160 : 240; // +20px over previous values
  }, []);
  
  // Retry scroll until widget ref is ready (handles navigation from other pages)
  const scrollTabsWhenReady = React.useCallback((maxAttempts: number = 20, delayMs: number = 75, offsetPx?: number) => {
    let attempts = 0;
    const tryScroll = () => {
      const ref = contentQualityWidgetRef.current;
      if (ref && typeof ref.scrollIntoView === 'function') {
        ref.scrollIntoView(offsetPx);
        return;
      }
      if (attempts < maxAttempts) {
        attempts += 1;
        setTimeout(tryScroll, delayMs);
      }
    };

    // start on next frame for smoother UX
    requestAnimationFrame(tryScroll);
  }, []);

  // Derive a minimal GapSummary from items when the authoritative summary isn't ready
  const derivedSummary = React.useMemo(() => {
    const items = contentItemsWithGaps.data?.byContentType.workHistory || [];
    if (!items || items.length === 0) return null;
    const counts: Record<'high'|'medium'|'low', number> = { high: 0, medium: 0, low: 0 };
    items.forEach(it => { counts[it.max_severity] = (counts[it.max_severity] || 0) + 1; });
    return {
      total: items.length,
      byContentType: {
        stories: 0,
        savedSections: 0,
        roleDescriptions: 0,
        outcomeMetrics: 0,
        coverLetterSections: 0,
      },
      bySeverity: { high: counts.high, medium: counts.medium, low: counts.low },
      bySeverityAndType: {
        high: { stories: 0, savedSections: 0, roleDescriptions: 0, outcomeMetrics: 0, coverLetterSections: 0 },
        medium: { stories: 0, savedSections: 0, roleDescriptions: 0, outcomeMetrics: 0, coverLetterSections: 0 },
        low: { stories: 0, savedSections: 0, roleDescriptions: 0, outcomeMetrics: 0, coverLetterSections: 0 },
      },
    } as const;
  }, [contentItemsWithGaps.data]);

  const summaryForUI = gapSummary.data ?? derivedSummary;

  // Build immediate fallback counts from summary when detailed items are not yet loaded
  const whFallbackCount = React.useMemo(() => {
    if (!summaryForUI) return null;
    const bc = summaryForUI.byContentType || ({} as any);
    return (bc.roleDescriptions || 0) + (bc.outcomeMetrics || 0) + (bc.stories || 0);
  }, [summaryForUI]);

  const ssFallbackCount = React.useMemo(() => {
    if (!summaryForUI) return null;
    const bc = summaryForUI.byContentType || ({} as any);
    // Support both savedSections and coverLetterSections buckets
    return (bc.coverLetterSections || 0) + (bc.savedSections || 0);
  }, [summaryForUI]);

  // Placeholder items so widgets can render counts instantly from cached summary
  const whItems = React.useMemo(() => {
    const items = contentItemsWithGaps.data?.byContentType.workHistory;
    if (items && items.length >= 0) return items;
    if (typeof whFallbackCount === 'number') {
      return Array.from({ length: whFallbackCount }, (_, i) => ({
        entity_id: `wh-ph-${i}`,
        entity_type: 'work_item',
        display_title: '',
        max_severity: 'low',
        gap_categories: [],
        content_type_label: 'Work History',
        navigation_path: '',
        navigation_params: {}
      } as any));
    }
    return [] as any[];
  }, [contentItemsWithGaps.data, whFallbackCount]);

  const ssItems = React.useMemo(() => {
    const items = contentItemsWithGaps.data?.byContentType.coverLetterSavedSections;
    if (items && items.length >= 0) return items;
    if (typeof ssFallbackCount === 'number') {
      return Array.from({ length: ssFallbackCount }, (_, i) => ({
        entity_id: `ss-ph-${i}`,
        entity_type: 'saved_section',
        display_title: '',
        max_severity: 'low',
        gap_categories: [],
        content_type_label: 'Cover Letter Saved Sections',
        navigation_path: '',
        navigation_params: {}
      } as any));
    }
    return [] as any[];
  }, [contentItemsWithGaps.data, ssFallbackCount]);
  
  const handleWidgetClick = (contentType: ContentTypeFilter, severity: SeverityFilter) => {
    setContentTypeFilter(contentType);
    setSeverityFilter(severity);
    // Small delay to ensure state updates before scrolling
    setTimeout(() => {
      scrollTabsWhenReady(20, 75, getTabsScrollOffset());
    }, 100);
  };

  // Handle deep links: /new-user-dashboard?contentType=all&severity=all&scrollTo=tabs
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ct = (params.get('contentType') as ContentTypeFilter) || undefined;
    const sev = (params.get('severity') as SeverityFilter) || undefined;
    const scrollTo = params.get('scrollTo');
    let changed = false;
    if (ct && ct !== contentTypeFilter) {
      setContentTypeFilter(ct);
      changed = true;
    }
    if (sev && sev !== severityFilter) {
      setSeverityFilter(sev);
      changed = true;
    }
    if (scrollTo === 'tabs') {
      // ensure filters applied first, then robust scroll
      setTimeout(() => scrollTabsWhenReady(20, 75, getTabsScrollOffset()), changed ? 150 : 90);
    }
  }, [location.search]);
  const personalizeNarrataTasks: OnboardingTask[] = [
    {
      id: 'my-goals',
      title: 'My Goals',
      description: 'Add target job titles, minimum salary, and other deal-breakers',
      category: 'Personalize Narrata',
      completed: false,
      link: 'modal:goals' // Special prefix to indicate modal action
    },
    {
      id: 'my-voice',
      title: 'My Voice',
      description: 'Review and refine your writing style preferences',
      category: 'Personalize Narrata',
      completed: false,
      link: 'modal:voice'
    },
    {
      id: 'my-data',
      title: 'My Data',
      description: 'Import context from other LLMs via API key',
      category: 'Personalize Narrata',
      completed: false,
      link: 'modal:data'
    }
  ];

  const [tasks, setTasks] = useState<OnboardingTask[]>([
    ...personalizeNarrataTasks,
    // Work History Tasks
    {
      id: 'work-history-metrics',
      title: 'Add/revise Metrics',
      description: 'Enhance your stories with quantifiable achievements',
      category: 'Review Work History',
      completed: false,
      link: '/work-history?tab=role' // Navigate to most recent role's Role tab
    },
    {
      id: 'work-history-stories',
      title: 'Add/revise core Stories',
      description: 'Refine your professional narratives for impact',
      category: 'Review Work History',
      completed: false,
      link: '/work-history?tab=stories' // Navigate to most recent role's Stories tab
    },
    
    // Cover Letter Template Tasks
    {
      id: 'template-customize',
      title: 'Customize your Template',
      description: 'Personalize your cover letter structure',
      category: 'Review Cover Letter Template',
      completed: false,
      link: '/cover-letter-template'
    },
    {
      id: 'template-saved-sections',
      title: 'Add/revise Saved Sections',
      description: 'Build your library of reusable content',
      category: 'Review Cover Letter Template',
      completed: false,
      link: '/cover-letter-template'
    },
    
    // Cover Letter Creation Tasks
    {
      id: 'cover-letter-create',
      title: 'Create a new cover letter',
      description: 'Generate your first targeted cover letter',
      category: 'Create Your First Cover Letter!',
      completed: false,
      link: '/cover-letters'
    },
    {
      id: 'cover-letter-track',
      title: 'Track progress',
      description: 'Monitor your application progress',
      category: 'Create Your First Cover Letter!',
      completed: false,
      link: '/cover-letters'
    },
    
    // PM Level Tasks
    {
      id: 'pm-overall',
      title: 'Review Overall Analysis',
      description: 'Understand your comprehensive PM level',
      category: 'Review your PM Level',
      completed: false,
      link: '/assessment'
    },
    {
      id: 'pm-core-skills',
      title: 'Review Core Skills Analysis',
      description: 'Assess your fundamental competencies',
      category: 'Review your PM Level',
      completed: false,
      link: '/assessment'
    },
    {
      id: 'pm-specialization',
      title: 'Review Specialization Analysis',
      description: 'Explore your area of expertise',
      category: 'Review your PM Level',
      completed: false,
      link: '/assessment'
    }
  ]);

  const [showCongratulations, setShowCongratulations] = useState(false);

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const progress = (completedTasks / totalTasks) * 100;

  const handleTaskToggle = (taskId: string) => {
    setTasks(prev => {
      const updated = prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
      );
      
      // Check if all tasks are now completed
      const allCompleted = updated.every(t => t.completed);
      const preferredDashboard = (profile as any)?.preferred_dashboard;
      
      // If all completed and preference is still onboarding, flip to main
      if (allCompleted && preferredDashboard !== 'main') {
        updateProfile({ preferred_dashboard: 'main' } as any);
        // Show toast notification
        setTimeout(() => {
          alert("Nice! You've completed onboarding. The main dashboard is now your default home.");
        }, 300);
      }
      
      return updated;
    });
  };

  const handleTaskClick = (task: OnboardingTask) => {
    // Handle modal actions for Personalize Narrata tasks
    if (task.link.startsWith('modal:')) {
      const modalType = task.link.replace('modal:', '');
      if (modalType === 'goals') {
        setShowGoalsModal(true);
      } else if (modalType === 'voice') {
        setShowVoiceModal(true);
      } else if (modalType === 'data') {
        setShowDataModal(true);
      }
      return;
    }
    
    // Normal navigation for other tasks
    navigate(task.link);
  };

  useEffect(() => {
    if (completedTasks === totalTasks && !showCongratulations) {
      setShowCongratulations(true);
    }
  }, [completedTasks, totalTasks, showCongratulations]);

  const handleContinueToDashboard = () => {
    // Navigate to main dashboard (preference already updated when completing tasks)
    navigate('/dashboard/main');
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, OnboardingTask[]>);

  if (showCongratulations) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-foreground">
                🎉 Congratulations!
              </h1>
              <p className="text-xl text-muted-foreground">
                You've completed your onboarding and are ready to start your job search journey!
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-lg text-foreground">
                You now have access to the full Narrata experience with:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Complete Work History</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Personalized Templates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Cover Letter Generator</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>PM Level Assessment</span>
                </div>
              </div>
            </div>

            <Button 
              size="lg" 
              onClick={handleContinueToDashboard}
              className="px-8 py-3 text-lg"
            >
              Continue to Dashboard
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSwitchToMain = async () => {
    if (!user) return;
    
    // Update preference to main
    await updateProfile({ preferred_dashboard: 'main' } as any);
    
    // Navigate to main dashboard
    navigate('/dashboard/main');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Dashboard Toggle Banner */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Ready to see your full dashboard?
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Switch to the main dashboard view for ongoing insights
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleSwitchToMain}
                  className="bg-white hover:bg-blue-100 border border-blue-300"
                >
                  View Dashboard for Onboarded Users
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Top Row: Progress (80%) | Total Gaps (20%) */}
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-5 lg:col-span-4">
              <Card className="shadow-soft h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Onboarding Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {completedTasks} of {totalTasks} tasks completed
                    </span>
                    <Badge variant="secondary" className="text-sm">
                      {Math.round(progress)}%
                    </Badge>
                  </div>
                  <Progress value={progress} className="h-2" />
                </CardContent>
              </Card>
            </div>
            <div className="col-span-5 lg:col-span-1">
              <TotalGapsWidget 
                gapSummary={summaryForUI}
                isLoading={summaryForUI ? false : gapSummary.isLoading}
                onClick={() => handleWidgetClick('all', 'all')}
              />
            </div>
          </div>

          {/* Gap Summary Widgets - two columns, each a 3-column subgrid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Content Type Group: [WH | SS | CL] */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <WorkHistoryGapsCountWidget 
                items={whItems}
                isLoading={!summaryForUI && contentItemsWithGaps.isLoading}
                onClick={() => handleWidgetClick('workHistory', 'all')}
              />
              <SavedSectionsGapsCountWidget 
                items={ssItems}
                isLoading={!summaryForUI && contentItemsWithGaps.isLoading}
                onClick={() => handleWidgetClick('savedSections', 'all')}
              />
              <CoverLettersGapsCountWidget 
                count={0}
                isLoading={false}
                onClick={() => handleWidgetClick('coverLetters', 'all')}
              />
            </div>

            {/* Severity Group: [H | M | L] */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <HighSeverityGapsWidget 
                gapSummary={summaryForUI}
                isLoading={summaryForUI ? false : gapSummary.isLoading}
                onClick={() => handleWidgetClick('all', 'high')}
              />
              <MediumSeverityGapsWidget 
                gapSummary={summaryForUI}
                isLoading={summaryForUI ? false : gapSummary.isLoading}
                onClick={() => handleWidgetClick('all', 'medium')}
              />
              <LowSeverityGapsWidget 
                gapSummary={summaryForUI}
                isLoading={summaryForUI ? false : gapSummary.isLoading}
                onClick={() => handleWidgetClick('all', 'low')}
              />
            </div>
          </div>

          {/* Content Quality Widget - Mega Gaps Tabber */}
          <ContentQualityWidget 
            ref={contentQualityWidgetRef}
            gapSummary={summaryForUI}
            contentItems={[
              ...(contentItemsWithGaps.data?.byContentType.workHistory || []),
              ...(contentItemsWithGaps.data?.byContentType.coverLetterSavedSections || [])
            ]}
            isLoading={
              (contentItemsWithGaps.data ? false : contentItemsWithGaps.isLoading)
            }
            initialContentTypeFilter={contentTypeFilter}
            initialSeverityFilter={severityFilter}
            onFilterChange={(contentType, severity) => {
              setContentTypeFilter(contentType);
              setSeverityFilter(severity);
            }}
          />

          {/* Task Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personalize Narrata - Full Width */}
            {groupedTasks['Personalize Narrata'] && (
              <div className="lg:col-span-2">
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Personalize Narrata</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {groupedTasks['Personalize Narrata'].map((task) => (
                        <div 
                          key={task.id}
                          className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                          onClick={() => handleTaskClick(task)}
                        >
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => handleTaskToggle(task.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm truncate">
                                {task.title}
                              </h3>
                              <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {task.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Other Task Categories */}
            {Object.entries(groupedTasks)
              .filter(([category]) => category !== 'Personalize Narrata')
              .map(([category, categoryTasks]) => {
              // Calculate gap counts for badges
              let gapCount = 0;
              let severityCounts = { high: 0, medium: 0, low: 0 };
              
              if (category === 'Review Work History') {
                gapCount = contentItemsWithGaps.data?.byContentType.workHistory.length || 0;
                severityCounts = contentItemsWithGaps.data?.byContentType.workHistory.reduce((acc, item) => {
                  acc[item.max_severity]++;
                  return acc;
                }, { high: 0, medium: 0, low: 0 });
              } else if (category === 'Review Cover Letter Template') {
                gapCount = contentItemsWithGaps.data?.byContentType.coverLetterSavedSections.length || 0;
                severityCounts = contentItemsWithGaps.data?.byContentType.coverLetterSavedSections.reduce((acc, item) => {
                  acc[item.max_severity]++;
                  return acc;
                }, { high: 0, medium: 0, low: 0 });
              }

              return (
              <Card key={category} className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category === 'Review Work History' && <Users className="w-5 h-5" />}
                    {category === 'Review Cover Letter Template' && <LayoutTemplate className="w-5 h-5" />}
                    {category === 'Create Your First Cover Letter!' && <Mail className="w-5 h-5" />}
                    {category === 'Review your PM Level' && <Trophy className="w-5 h-5" />}
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryTasks.map((task) => (
                    <div 
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => handleTaskClick(task)}
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleTaskToggle(task.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </h4>
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <p className={`text-sm text-muted-foreground ${task.completed ? 'line-through' : ''}`}>
                          {task.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              );
            })}
          </div>

          {/* Quick Actions */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" asChild>
                  <Link to="/work-history">
                    <Calendar className="w-4 h-4 mr-2" />
                    Work History
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/cover-letter-template">
                    <LayoutTemplate className="w-4 h-4 mr-2" />
                    Edit Template
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/cover-letters">
                    <Mail className="w-4 h-4 mr-2" />
                    Cover Letters
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/assessment">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Assessment
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Modals for Personalize Narrata */}
      <UserGoalsModal 
        isOpen={showGoalsModal} 
        onClose={() => setShowGoalsModal(false)}
        onSave={async (goals) => {
          // Goals are auto-saved via UserGoalsContext, just close modal
          setShowGoalsModal(false);
        }}
      />
      <MyVoiceModal 
        isOpen={showVoiceModal} 
        onClose={() => setShowVoiceModal(false)}
        onSave={(voice) => {
          // Voice is auto-saved via UserVoiceContext, just close modal
          setShowVoiceModal(false);
        }}
      />
      <MyDataModal 
        isOpen={showDataModal} 
        onClose={() => setShowDataModal(false)} 
      />
    </div>
  );
}
