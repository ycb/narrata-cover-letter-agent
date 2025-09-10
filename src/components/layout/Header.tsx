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
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { UserGoalsModal } from "@/components/user-goals/UserGoalsModal";
import { MyVoiceModal } from "@/components/user-voice/MyVoiceModal";
import { MyDataModal } from "@/components/user-data/MyDataModal";
import { useUserGoals } from "@/contexts/UserGoalsContext";
import { useUserVoice } from "@/contexts/UserVoiceContext";
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

export const Header = ({ currentPage }: HeaderProps) => {
  const location = useLocation();
  const [showDataModal, setShowDataModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { goals, setGoals } = useUserGoals();
  const { voice, setVoice } = useUserVoice();
  
  // Determine current page based on pathname
  const getCurrentPage = (pathname: string): string => {
    if (pathname === "/dashboard") return "dashboard";
    if (pathname === "/work-history" || pathname.startsWith("/show-all-stories") || pathname.startsWith("/show-all-links")) return "work-history";
    if (pathname === "/cover-letters" || pathname === "/cover-letter-template" || pathname === "/cover-letter-create" || pathname === "/saved-sections" || pathname.startsWith("/show-all-saved-sections")) return "cover-letters";
    if (pathname === "/assessment" || pathname.startsWith("/assessment/")) return "assessment";
    return "";
  };

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
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img 
              src="/narrata-logo.svg" 
              alt="Narrata" 
              className="h-12 w-auto"
            />
            <span className="text-white font-sans text-2xl">Narrata</span>
          </div>
          
          {/* Dropdown Navigation */}
          <nav className="hidden md:flex">
            <div className="flex items-center gap-1">
              {/* Dashboard - Simple Link */}
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
                  Work History
                  <ChevronDown className="h-3 w-3" />
                </div>
                
                {/* Hover Dropdown */}
                <div className="absolute top-full left-0 pt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="border-0 shadow-lg p-3 min-w-80" style={{ backgroundColor: 'rgba(18, 18, 18, 0.9)', borderRadius: '0 0 8px 8px' }}>
                    {/* Timeline View CTA - Spans full width */}
                    <Link
                      to="/work-history"
                      className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-opacity hover:bg-[#E32D9A] mb-3 border border-white text-white group",
                        activePage === "work-history"
                          ? "text-white bg-white/10"
                          : "text-white"
                      )}
                    >
                      <Calendar className="h-4 w-4 transition-colors" />
                      Timeline View
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
                             onClick={() => window.location.href = "/assessment/specializations/technical"}
                             className="block px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-colors hover:bg-[#E32D9A] text-white w-full text-left"
                           >
                             Technical
                           </button>
                           <button 
                             onClick={() => window.location.href = "/assessment/specializations/founding"}
                             className="block px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-colors hover:bg-[#E32D9A] text-white w-full text-left"
                           >
                             Founding
                           </button>
                           <button 
                             onClick={() => window.location.href = "/assessment/specializations/platform"}
                             className="block px-3 py-2 text-sm opacity-90 hover:opacity-100 rounded-md transition-colors hover:bg-[#E32D9A] text-white w-full text-left"
                           >
                             Platform
                           </button>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white opacity-90 hover:opacity-100 transition-opacity"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white opacity-90 hover:opacity-100 transition-opacity">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-white opacity-90 hover:opacity-100 transition-opacity px-3 py-2 rounded-md hover:bg-[#E32D9A] focus:bg-[#E32D9A] flex justify-end">
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t" style={{ backgroundColor: '#121212' }}>
          <div className="container py-4 space-y-4">
            {/* Dashboard */}
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
                Work History
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
                      window.location.href = "/assessment/specializations/technical";
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-4 py-2 text-sm text-white opacity-75 hover:opacity-100 transition-opacity w-full text-left"
                  >
                    Technical
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
                  <button
                    onClick={() => {
                      window.location.href = "/assessment/specializations/platform";
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-4 py-2 text-sm text-white opacity-75 hover:opacity-100 transition-opacity w-full text-left"
                  >
                    Platform
                  </button>
                </div>
              </div>
            </div>
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