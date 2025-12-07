import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Settings, 
  LogOut, 
  Zap, 
  FileText, 
  Target, 
  Briefcase,
  Trophy,
  Calendar, 
  TrendingUp, 
  Mail,
  ChevronDown,
  Star,
  LinkIcon,
  LayoutTemplate,
  BarChart3,
  BookOpen,
  Users,
  Lightbulb,
  Rocket,
  Cpu,
  Menu,
  X
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { UserGoalsModal } from "@/components/user-goals/UserGoalsModal";
import { MyVoiceModal } from "@/components/user-voice/MyVoiceModal";
import { MyDataModal } from "@/components/user-data/MyDataModal";
import { SyntheticUserSelector } from "@/components/synthetic/SyntheticUserSelector";
import { useUserGoals } from "@/contexts/UserGoalsContext";
import { useUserVoice } from "@/contexts/UserVoiceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGapSummary } from "@/hooks/useGapSummary";
import { useGapsJob } from "@/contexts/GapsJobContext";
import { isExternalLinksEnabled } from "@/lib/flags";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  currentPage?: string;
}

// Wrapper component that renders the SyntheticUserSelector section with conditional separators
// Only shows separators when synthetic testing is actually enabled
const SyntheticUserSelectorWrapper = () => {
  const [isSyntheticEnabled, setIsSyntheticEnabled] = React.useState(false);
  
  React.useEffect(() => {
    const checkSyntheticMode = async () => {
      try {
        const { SyntheticUserService } = await import('@/services/syntheticUserService');
        const syntheticService = new SyntheticUserService();
        const context = await syntheticService.getSyntheticUserContext();
        setIsSyntheticEnabled(context.isSyntheticTestingEnabled);
      } catch (e) {
        setIsSyntheticEnabled(false);
      }
    };
    checkSyntheticMode();
  }, []);
  
  // Only render separators if synthetic testing is enabled
  if (!isSyntheticEnabled) {
    return null;
  }
  
  return (
    <>
      <DropdownMenuSeparator />
      <div className="px-3 py-2" data-testid="synthetic-selector-wrapper">
        <SyntheticUserSelector className="w-full" />
      </div>
      <DropdownMenuSeparator />
    </>
  );
};

export const Header = ({ currentPage }: HeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const gapSummary = useGapSummary();
  const { user, profile, signOut, getOAuthData } = useAuth();
  const { isRunning } = useGapsJob();
  const ENABLE_EXTERNAL_LINKS = isExternalLinksEnabled();
  const { isAdmin } = useAdminAuth();
  const [showDataModal, setShowDataModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Use hooks - they should be available since Header is within providers in App.tsx
  // But add error boundary handling in case of hot reload issues
  const { goals, setGoals } = useUserGoals();
  const { voice, setVoice } = useUserVoice();

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSigningOut) {
      return;
    }
    
    setIsSigningOut(true);
    
    try {
      const { error } = await signOut();
      
      // Always redirect regardless of signOut result
      // The AuthContext handles clearing local state
      navigate('/signin', { replace: true });
    } catch (navError) {
      console.error('Navigation error:', navError);
      // Fallback to window.location
      window.location.href = '/signin';
    } finally {
      setIsSigningOut(false);
    }
  };
  
  // Determine current page based on pathname
  const getCurrentPage = (pathname: string): string => {
    if (pathname === "/dashboard" || pathname === "/new-user-dashboard" || pathname === "/") return "dashboard";
    if (pathname === "/work-history" || pathname.startsWith("/show-all-stories") || pathname.startsWith("/show-all-links")) return "work-history";
    if (pathname === "/cover-letters" || pathname === "/cover-letter-template" || pathname === "/cover-letter-create" || pathname === "/saved-sections" || pathname.startsWith("/show-all-saved-sections")) return "cover-letters";
    if (pathname === "/assessment" || pathname.startsWith("/assessment/")) return "assessment";
    return "";
  };
  const isOnboardingFlow = location.pathname.startsWith("/new-user");

  // Helper functions to check if specific routes are active
  const isWorkHistoryChild = (pathname: string): boolean => {
    return pathname.startsWith("/show-all-stories") || pathname.startsWith("/show-all-links");
  };

  const isCoverLettersChild = (pathname: string): boolean => {
    return pathname.startsWith("/show-all-saved-sections") || pathname.startsWith("/cover-letter-template");
  };

  // Assessment items are now modal triggers, not navigation links
  // const isAssessmentChild = (pathname: string): boolean => {
  //   return pathname.startsWith("/assessment/") && pathname !== "/assessment";
  // };

  const activePage = getCurrentPage(location.pathname);

  return (
    <header className="border-b sticky top-0 z-50" style={{ backgroundColor: '#121212' }}>
      {/* Global subtle progress bar for gap detection jobs */}
      {isRunning && (
        <div className="w-full h-0.5 bg-transparent">
          <div className="h-0.5 w-full overflow-hidden">
            <div className="h-0.5 w-1/3 animate-[progress_1.2s_ease-in-out_infinite] bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 rounded-full" style={{
              // keyframes defined inline via tailwind arbitrary, fallback to simple CSS animation below
            }} />
          </div>
        </div>
      )}
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link 
            to="/dashboard" 
            className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <img 
              src="/narrata-logo.svg" 
              alt="Narrata" 
              className="h-12 w-auto"
            />
            <span className="text-white font-sans text-2xl">Narrata</span>
          </Link>
          
          {/* Dropdown Navigation */}
          {!isOnboardingFlow && (
            <nav className="hidden md:flex">
              <div className="flex items-center gap-1">
                {/* Dashboard - Simple Dynamic Link */}
                  <Link
                  to="/dashboard"
                    className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-md",
                      activePage === "dashboard" 
                        ? "bg-white text-[#121212] hover:bg-white" 
                        : "text-white opacity-90 hover:opacity-100"
                    )}
                  >
                    <Target className="h-4 w-4" />
                    Dashboard
                      </Link>

              {/* Work History - Main Link + Dropdown */}
              <div className="relative group">
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-default transition-all rounded-md",
                  activePage === "work-history" 
                    ? "bg-white text-[#121212] hover:bg-white" 
                    : "text-white opacity-90 hover:opacity-100"
                )}>
                  <Briefcase className="h-4 w-4" />
                  Experience
                  <ChevronDown className="h-3 w-3" />
                </div>
                
                {/* Hover Dropdown */}
                <div className="absolute top-full left-0 pt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="border-0 shadow-lg p-3 min-w-80" style={{ backgroundColor: 'rgba(18, 18, 18, 0.9)', borderRadius: '0 0 8px 8px' }}>
                    {/* Timeline View Section */}
                    <div className="px-3 py-2 text-xs font-medium text-white uppercase tracking-wide mb-2">
                      TIMELINE VIEW
                    </div>
                    
                    {/* Work History - Normal nav link under Timeline View */}
                    <Link
                      to="/work-history"
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm opacity-90 hover:opacity-100 transition-opacity hover:bg-white/10 mb-3 text-white",
                        activePage === "work-history"
                          ? "text-white bg-white/10"
                          : "text-white"
                      )}
                    >
                      <Calendar className="h-4 w-4 transition-colors" />
                      Work History
                    </Link>
                    
                    {/* Table View Section */}
                    <div>
                      <div className="px-3 py-2 text-xs font-medium text-white uppercase tracking-wide mb-2">
                        TABLE VIEW
                      </div>
                      <div className="space-y-1">
                        <Link 
                          to="/show-all-stories" 
                          className={cn(
                            "flex items-center justify-between px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-opacity hover:bg-[#E32D9A]",
                            isWorkHistoryChild(location.pathname) && location.pathname.startsWith("/show-all-stories")
                              ? "text-white bg-white/10"
                              : "text-white"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            All Stories
                          </span>
                          <Badge variant="secondary" className="ml-auto">47</Badge>
                        </Link>
                        {ENABLE_EXTERNAL_LINKS && (
                        <Link 
                          to="/show-all-links" 
                          className={cn(
                            "flex items-center justify-between px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-opacity hover:bg-[#E32D9A]",
                            isWorkHistoryChild(location.pathname) && location.pathname.startsWith("/show-all-links")
                              ? "text-white bg-white/10"
                              : "text-white"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <LinkIcon className="h-4 w-4" />
                            All Links
                          </span>
                          <Badge variant="secondary" className="ml-auto">12</Badge>
                        </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover Letters - Main Link + Dropdown */}
              <div className="relative group">
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-default transition-all rounded-md",
                  activePage === "cover-letters" 
                    ? "bg-white text-[#121212] hover:bg-white" 
                    : "text-white opacity-90 hover:opacity-100"
                )}>
                  <Mail className="h-4 w-4" />
                  Cover Letters
                  <ChevronDown className="h-3 w-3" />
                </div>
                
                {/* Hover Dropdown */}
                <div className="absolute top-full left-0 pt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="border-0 shadow-lg p-3 min-w-64" style={{ backgroundColor: 'rgba(18, 18, 18, 0.9)', borderRadius: '0 0 8px 8px' }}>
                    <Link 
                      to="/cover-letters" 
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-opacity hover:bg-[#E32D9A]",
                        location.pathname === "/cover-letters"
                          ? "text-white bg-white/10"
                          : "text-white"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        All Cover Letters
                      </span>
                    </Link>
                    <Link 
                      to="/saved-sections" 
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-opacity hover:bg-[#E32D9A]",
                        location.pathname === "/saved-sections"
                          ? "text-white bg-white/10"
                          : "text-white"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Saved Sections
                      </span>
                      <Badge variant="secondary" className="ml-auto">23</Badge>
                    </Link>
                    <Link 
                      to="/cover-letter-template" 
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-opacity hover:bg-[#E32D9A]",
                        location.pathname === "/cover-letter-template"
                          ? "text-white bg-white/10"
                          : "text-white"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <LayoutTemplate className="h-4 w-4" />
                        Edit Template
                      </span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Assessment - Main Link + Dropdown */}
              <div className="relative group">
                <button className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all cursor-default rounded-md",
                  activePage === "assessment" 
                    ? "bg-white text-[#121212] hover:bg-white" 
                    : "text-white opacity-90 hover:opacity-100"
                )}>
                  <TrendingUp className="h-4 w-4" />
                  Assessment
                  <ChevronDown className="h-3 w-3" />
                </button>
                
                {/* Hover Dropdown */}
                <div className="absolute top-full left-0 pt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="border-0 shadow-lg p-3 min-w-80" style={{ backgroundColor: 'rgba(18, 18, 18, 0.9)', borderRadius: '0 0 8px 8px' }}>
                    {/* Overall Level - Spans full width */}
                               <button
             onClick={() => window.location.href = "/assessment/overall-level"}
             className="flex items-center justify-center gap-2 px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-colors hover:bg-[#E32D9A] mb-3 border border-white text-white group w-full"
           >
             <BarChart3 className="h-4 w-4 transition-colors" />
             Overall Level
           </button>
                    
                    {/* Two-column layout */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Left Column - Competencies */}
                      <div>
                        <div className="px-3 py-2 text-xs font-medium text-white uppercase tracking-wide mb-2">
                          Competencies
                        </div>
                                                 <div className="space-y-1">
                           <button 
                             onClick={() => window.location.href = "/assessment/competencies/execution"}
                             className="block px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-colors hover:bg-[#E32D9A] text-white w-full text-left"
                           >
                             Execution
                           </button>
                           <button 
                             onClick={() => window.location.href = "/assessment/competencies/customer-insight"}
                             className="block px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-colors hover:bg-[#E32D9A] text-white w-full text-left"
                           >
                             Customer Insight
                           </button>
                           <button 
                             onClick={() => window.location.href = "/assessment/competencies/strategy"}
                             className="block px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-colors hover:bg-[#E32D9A] text-white w-full text-left"
                           >
                             Strategy
                           </button>
                           <button 
                             onClick={() => window.location.href = "/assessment/competencies/influence"}
                             className="block px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-colors hover:bg-[#E32D9A] text-white w-full text-left"
                           >
                             Influence
                           </button>
                         </div>
                      </div>
                      
                      {/* Right Column - Specializations */}
                      <div>
                        <div className="px-3 py-2 text-xs font-medium text-white uppercase tracking-wide mb-2">
                          Specialization
                        </div>
                                                 <div className="space-y-1">
                           <button 
                             onClick={() => window.location.href = "/assessment/specializations/growth"}
                             className="block px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-colors hover:bg-[#E32D9A] text-white w-full text-left"
                           >
                             Growth
                           </button>
                           <button 
                             onClick={() => window.location.href = "/assessment/specializations/platform"}
                             className="block px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-colors hover:bg-[#E32D9A] text-white w-full text-left"
                           >
                             Platform
                           </button>
                           <button 
                             onClick={() => window.location.href = "/assessment/specializations/ai-ml"}
                             className="block px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-colors hover:bg-[#E32D9A] text-white w-full text-left"
                           >
                             AI/ML
                           </button>
                           <button 
                             onClick={() => window.location.href = "/assessment/specializations/founding"}
                             className="block px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-colors hover:bg-[#E32D9A] text-white w-full text-left"
                           >
                             Founding
                           </button>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Tools - Only show for admins */}
              {isAdmin && (
                <div className="relative group">
                  <div className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-default transition-all rounded-md",
                    location.pathname.startsWith("/admin")
                      ? "bg-white text-[#121212] hover:bg-white" 
                      : "text-white opacity-90 hover:opacity-100"
                  )}>
                    <Settings className="h-4 w-4" />
                    Admin
                    <ChevronDown className="h-3 w-3" />
                  </div>
                  
                  {/* Hover Dropdown */}
                  <div className="absolute top-full left-0 pt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                    <div className="border-0 shadow-lg p-3 min-w-64" style={{ backgroundColor: 'rgba(18, 18, 18, 0.9)', borderRadius: '0 0 8px 8px' }}>
                      <Link 
                        to="/admin/evals" 
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-opacity hover:bg-[#E32D9A]",
                          location.pathname === "/admin/evals"
                            ? "text-white bg-white/10"
                            : "text-white"
                        )}
                      >
                        <Cpu className="h-4 w-4" />
                        Pipeline Evals
                      </Link>
                      <Link 
                        to="/admin/evaluation" 
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-opacity hover:bg-[#E32D9A]",
                          location.pathname === "/admin/evaluation"
                            ? "text-white bg-white/10"
                            : "text-white"
                        )}
                      >
                        <FileText className="h-4 w-4" />
                        File Upload Quality
                      </Link>
                      <Link 
                        to="/admin/funnel" 
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-opacity hover:bg-[#E32D9A]",
                          location.pathname === "/admin/funnel"
                            ? "text-white bg-white/10"
                            : "text-white"
                        )}
                      >
                        <TrendingUp className="h-4 w-4" />
                        Funnel Analytics
                      </Link>
                      <Link 
                        to="/admin/leaderboard" 
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-opacity hover:bg-[#E32D9A]",
                          location.pathname === "/admin/leaderboard"
                            ? "text-white bg-white/10"
                            : "text-white"
                        )}
                      >
                        <Trophy className="h-4 w-4" />
                        User Leaderboard
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-white opacity-90 hover:opacity-100 transition-opacity p-2 h-auto">
                <div className="flex items-center gap-2">
                  {/* User Avatar with Gap Badge */}
                  <div className="relative">
                  {(() => {
                    const oauthData = getOAuthData();
                    const avatarUrl = oauthData.picture || profile?.avatar_url;
                    
                    if (avatarUrl) {
                      return (
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          <img 
                            src={avatarUrl} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to initials if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="w-full h-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm">${(oauthData.firstName || user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}</div>`;
                              }
                            }}
                          />
                        </div>
                      );
                    } else {
                      // Show initials if no avatar
                      const oauthData = getOAuthData();
                      const initials = (oauthData.firstName || user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase();
                      return (
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {initials}
                        </div>
                      );
                    }
                  })()}
                    
                    {/* Gap Count Badge */}
                    {gapSummary.data && gapSummary.data.total > 0 && (
                      <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-warning text-warning-foreground text-xs font-semibold flex items-center justify-center px-1 border-2 border-[#121212]">
                        {gapSummary.data.total > 9 ? '9+' : gapSummary.data.total}
                      </div>
                    )}
                  </div>
                  
                  {/* User Name - First Name Only */}
                    <span className="text-sm font-medium">
                      {(() => {
                        const oauthData = getOAuthData();
                        return oauthData.firstName || oauthData.fullName || user?.email?.split('@')[0] || 'User';
                      })()}
                    </span>
                  
                  <ChevronDown className="h-4 w-4" />
                </div>
              </Button>
            </DropdownMenuTrigger>

          {/* Mobile Menu Button - Primary position (rightmost) */}
          {!isOnboardingFlow && (
            <button
              className="md:hidden text-white opacity-90 hover:opacity-100 transition-opacity p-2 rounded-md hover:bg-white/10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
            <DropdownMenuContent align="end" className="w-56 p-3 rounded-t-none border-0" style={{ backgroundColor: 'rgba(18, 18, 18, 0.9)' }}>
              <DropdownMenuItem onClick={() => setShowDataModal(true)} className="text-white opacity-90 hover:opacity-100 transition-opacity px-3 py-2 rounded-md hover:bg-[#E32D9A] focus:bg-[#E32D9A] flex justify-end">
                <span>My Data</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowGoalsModal(true)} className="text-white opacity-90 hover:opacity-100 transition-opacity px-3 py-2 rounded-md hover:bg-[#E32D9A] focus:bg-[#E32D9A] flex justify-end">
                <span>My Goals</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowVoiceModal(true)} className="text-white opacity-90 hover:opacity-100 transition-opacity px-3 py-2 rounded-md hover:bg-[#E32D9A] focus:bg-[#E32D9A] flex justify-end">
                <span>My Voice</span>
              </DropdownMenuItem>
              {gapSummary.data && gapSummary.data.total > 0 && (
                <DropdownMenuItem 
                  onClick={() => navigate('/dashboard/onboarding?contentType=all&severity=all&scrollTo=tabs')}
                  className="text-white opacity-90 hover:opacity-100 transition-opacity px-3 py-2 rounded-md hover:bg-[#E32D9A] focus:bg-[#E32D9A] flex justify-end items-center gap-2"
                >
                  <span>Review Gaps</span>
                  <Badge variant="destructive" className="bg-warning text-warning-foreground">
                    {gapSummary.data.total > 9 ? '9+' : gapSummary.data.total}
                  </Badge>
                </DropdownMenuItem>
              )}
              <SyntheticUserSelectorWrapper />
              {/* Separator before Log out */}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="text-white opacity-90 hover:opacity-100 transition-opacity px-3 py-2 rounded-md hover:bg-[#E32D9A] focus:bg-[#E32D9A] flex justify-end disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isSigningOut ? 'Signing out...' : 'Log out'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t" style={{ backgroundColor: '#121212' }}>
          <div className="container py-4 space-y-4">
            {/* Dashboard - Simple Dynamic Link */}
            <Link
              to="/dashboard"
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all rounded-md",
                activePage === "dashboard" 
                  ? "bg-white text-[#121212]" 
                  : "text-white opacity-90 hover:opacity-100"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Target className="h-4 w-4" />
              Dashboard
            </Link>

            {/* Work History */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-white opacity-90">
                <Briefcase className="h-4 w-4" />
                Experience
              </div>
              <div className="ml-7 space-y-1">
                <Link
                  to="/work-history"
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 text-sm transition-all rounded-md",
                    activePage === "work-history"
                      ? "text-white bg-white/10"
                      : "text-white opacity-75 hover:opacity-100"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Calendar className="h-4 w-4" />
                  Timeline View
                </Link>
                <Link
                  to="/show-all-stories"
                  className={cn(
                    "flex items-center justify-between px-4 py-2 text-sm transition-all rounded-md",
                    isWorkHistoryChild(location.pathname) && location.pathname.startsWith("/show-all-stories")
                      ? "text-white bg-white/10"
                      : "text-white opacity-75 hover:opacity-100"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="flex items-center gap-3">
                    <FileText className="h-4 w-4" />
                    All Stories
                  </span>
                  <Badge variant="secondary">47</Badge>
                </Link>
                {ENABLE_EXTERNAL_LINKS && (
                <Link
                  to="/show-all-links"
                  className={cn(
                    "flex items-center justify-between px-4 py-2 text-sm transition-all rounded-md",
                    isWorkHistoryChild(location.pathname) && location.pathname.startsWith("/show-all-links")
                      ? "text-white bg-white/10"
                      : "text-white opacity-75 hover:opacity-100"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="flex items-center gap-3">
                    <LinkIcon className="h-4 w-4" />
                    All Links
                  </span>
                  <Badge variant="secondary">12</Badge>
                </Link>
                )}
              </div>
            </div>

            {/* Cover Letters */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-white opacity-90">
                <Mail className="h-4 w-4" />
                Cover Letters
              </div>
              <div className="ml-7 space-y-1">
                <Link
                  to="/cover-letters"
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 text-sm transition-all rounded-md",
                    location.pathname === "/cover-letters"
                      ? "text-white bg-white/10"
                      : "text-white opacity-75 hover:opacity-100"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Trophy className="h-4 w-4" />
                  All Cover Letters
                </Link>
                <Link
                  to="/saved-sections"
                  className={cn(
                    "flex items-center justify-between px-4 py-2 text-sm transition-all rounded-md",
                    location.pathname === "/saved-sections"
                      ? "text-white bg-white/10"
                      : "text-white opacity-75 hover:opacity-100"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4" />
                    Saved Sections
                  </span>
                  <Badge variant="secondary">23</Badge>
                </Link>
                <Link
                  to="/cover-letter-template"
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 text-sm transition-all rounded-md",
                    location.pathname === "/cover-letter-template"
                      ? "text-white bg-white/10"
                      : "text-white opacity-75 hover:opacity-100"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LayoutTemplate className="h-4 w-4" />
                  Edit Template
                </Link>
              </div>
            </div>

            {/* Assessment */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-white opacity-90">
                <TrendingUp className="h-4 w-4" />
                Assessment
              </div>
              <div className="ml-7 space-y-1">
                <button
                  onClick={() => {
                    window.location.href = "/assessment/overall-level";
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-white opacity-75 hover:opacity-100 transition-opacity w-full text-left"
                >
                  <BarChart3 className="h-4 w-4" />
                  Overall Level
                </button>
                
                <div className="space-y-1">
                  <div className="px-4 py-1 text-xs font-medium text-white opacity-60 uppercase tracking-wide">
                    Competencies
                  </div>
                  <button
                    onClick={() => {
                      window.location.href = "/assessment/competencies/execution";
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-4 py-2 text-sm text-white opacity-75 hover:opacity-100 transition-opacity w-full text-left"
                  >
                    Execution
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = "/assessment/competencies/customer-insight";
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-4 py-2 text-sm text-white opacity-75 hover:opacity-100 transition-opacity w-full text-left"
                  >
                    Customer Insight
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = "/assessment/competencies/strategy";
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-4 py-2 text-sm text-white opacity-75 hover:opacity-100 transition-opacity w-full text-left"
                  >
                    Strategy
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = "/assessment/competencies/influence";
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-4 py-2 text-sm text-white opacity-75 hover:opacity-100 transition-opacity w-full text-left"
                  >
                    Influence
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="px-4 py-1 text-xs font-medium text-white opacity-60 uppercase tracking-wide">
                    Specialization
                  </div>
                  <button
                    onClick={() => {
                      window.location.href = "/assessment/specializations/growth";
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-4 py-2 text-sm text-white opacity-75 hover:opacity-100 transition-opacity w-full text-left"
                  >
                    Growth
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = "/assessment/specializations/platform";
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-4 py-2 text-sm text-white opacity-75 hover:opacity-100 transition-opacity w-full text-left"
                  >
                    Platform
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = "/assessment/specializations/ai-ml";
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-4 py-2 text-sm text-white opacity-75 hover:opacity-100 transition-opacity w-full text-left"
                  >
                    AI/ML
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = "/assessment/specializations/founding";
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-4 py-2 text-sm text-white opacity-75 hover:opacity-100 transition-opacity w-full text-left"
                  >
                    Founding
                  </button>
                </div>
              </div>
            </div>

            {/* Admin Tools - Only show for admins */}
            {isAdmin && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-white opacity-90">
                  <Settings className="h-4 w-4" />
                  Admin Tools
                </div>
                <div className="ml-7 space-y-1">
                  <Link
                    to="/admin/evals"
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 text-sm transition-all rounded-md",
                      location.pathname === "/admin/evals"
                        ? "text-white bg-white/10"
                        : "text-white opacity-75 hover:opacity-100"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Cpu className="h-4 w-4" />
                    Pipeline Evals
                  </Link>
                  <Link
                    to="/admin/evaluation"
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 text-sm transition-all rounded-md",
                      location.pathname === "/admin/evaluation"
                        ? "text-white bg-white/10"
                        : "text-white opacity-75 hover:opacity-100"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <FileText className="h-4 w-4" />
                    File Upload Quality
                  </Link>
                  <Link
                    to="/admin/funnel"
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 text-sm transition-all rounded-md",
                      location.pathname === "/admin/funnel"
                        ? "text-white bg-white/10"
                        : "text-white opacity-75 hover:opacity-100"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <TrendingUp className="h-4 w-4" />
                    Funnel Analytics
                  </Link>
                  <Link
                    to="/admin/leaderboard"
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 text-sm transition-all rounded-md",
                      location.pathname === "/admin/leaderboard"
                        ? "text-white bg-white/10"
                        : "text-white opacity-75 hover:opacity-100"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Trophy className="h-4 w-4" />
                    User Leaderboard
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <MyDataModal
        isOpen={showDataModal}
        onClose={() => setShowDataModal(false)}
      />
      
      <UserGoalsModal
        isOpen={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
        onSave={setGoals}
        initialGoals={goals || undefined}
      />
      
      <MyVoiceModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSave={setVoice}
        initialVoice={voice || undefined}
      />
    </header>
  );
};
