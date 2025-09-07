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
  Cpu
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
  const { goals, setGoals } = useUserGoals();
  const { voice, setVoice } = useUserVoice();
  
  // Determine current page based on pathname
  const getCurrentPage = (pathname: string): string => {
    if (pathname === "/dashboard") return "dashboard";
    if (pathname === "/work-history") return "work-history";
    if (pathname === "/cover-letters" || pathname === "/cover-letter-template" || pathname === "/cover-letter-create") return "cover-letters";
    if (pathname === "/assessment") return "assessment";
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
            <span className="text-white font-sans text-xl">Narrata</span>
          </div>
          
          {/* Dropdown Navigation */}
          <nav className="hidden md:flex">
            <div className="flex items-center gap-1">
              {/* Dashboard - Simple Link */}
                            <Link
                to="/dashboard"
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:font-bold",
                  activePage === "dashboard" 
                    ? "text-white border-b-2 border-white" 
                    : "text-white hover:text-white"
                )}
              >
                <Target className="h-4 w-4" />
                Dashboard
              </Link>

              {/* Work History - Main Link + Dropdown */}
              <div className="relative group">
                <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white cursor-default hover:font-bold transition-all">
                  <Briefcase className="h-4 w-4" />
                  Work History
                  <ChevronDown className="h-3 w-3" />
                </div>
                
                {/* Hover Dropdown */}
                <div className="absolute top-full left-0 pt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="border shadow-lg p-3 min-w-80" style={{ backgroundColor: '#121212', borderRadius: '0 0 8px 8px' }}>
                    {/* Timeline View CTA - Spans full width */}
                    <Link
                      to="/work-history"
                      className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors mb-3 border border-blue-600 text-blue-600 group",
                        activePage === "work-history"
                          ? "font-bold text-blue-600"
                          : "text-blue-600"
                      )}
                    >
                      <Calendar className="h-4 w-4 transition-colors" />
                      Timeline View
                    </Link>
                    
                    {/* Table View Section */}
                    <div>
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        TABLE VIEW
                      </div>
                      <div className="space-y-1">
                        <Link 
                          to="/show-all-stories" 
                          className={cn(
                            "flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors",
                            isWorkHistoryChild(location.pathname) && location.pathname.startsWith("/show-all-stories")
                              ? "font-bold text-foreground bg-blue-50"
                              : "text-muted-foreground"
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
                            "flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors",
                            isWorkHistoryChild(location.pathname) && location.pathname.startsWith("/show-all-links")
                              ? "font-bold text-foreground bg-blue-50"
                              : "text-muted-foreground"
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
                <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white cursor-default hover:font-bold transition-all">
                  <Mail className="h-4 w-4" />
                  Cover Letters
                  <ChevronDown className="h-3 w-3" />
                </div>
                
                {/* Hover Dropdown */}
                <div className="absolute top-full left-0 pt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="border shadow-lg p-4 min-w-64" style={{ backgroundColor: '#121212', borderRadius: '0 0 8px 8px' }}>
                    <Link 
                      to="/cover-letters" 
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors",
                        location.pathname === "/cover-letters"
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
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
                        "flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors",
                        location.pathname === "/saved-sections"
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
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
                        "flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors",
                        location.pathname === "/cover-letter-template"
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
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
                <button 
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:font-bold cursor-default",
                    activePage === "assessment" 
                      ? "text-white font-bold" 
                      : "text-white hover:text-white"
                  )}
                >
                  <TrendingUp className="h-4 w-4" />
                  Assessment
                  <ChevronDown className="h-3 w-3" />
                </button>
                
                {/* Hover Dropdown */}
                <div className="absolute top-full left-0 pt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="border shadow-lg p-3 min-w-80" style={{ backgroundColor: '#121212', borderRadius: '0 0 8px 8px' }}>
                    {/* Overall Level - Spans full width */}
                               <button
             onClick={() => window.location.href = "/assessment/overall-level"}
             className="flex items-center justify-center gap-2 px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors mb-3 border border-blue-600 text-blue-600 group w-full"
           >
             <BarChart3 className="h-4 w-4 transition-colors" />
             Overall Level
           </button>
                    
                    {/* Two-column layout */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Left Column - Competencies */}
                      <div>
                        <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Competencies
                        </div>
                                                 <div className="space-y-1">
                           <button 
                             onClick={() => window.location.href = "/assessment/competencies/execution"}
                             className="block px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors text-muted-foreground w-full text-left"
                           >
                             Execution
                           </button>
                           <button 
                             onClick={() => window.location.href = "/assessment/competencies/customer-insight"}
                             className="block px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors text-muted-foreground w-full text-left"
                           >
                             Customer Insight
                           </button>
                           <button 
                             onClick={() => window.location.href = "/assessment/competencies/strategy"}
                             className="block px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors text-muted-foreground w-full text-left"
                           >
                             Strategy
                           </button>
                           <button 
                             onClick={() => window.location.href = "/assessment/competencies/influence"}
                             className="block px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors text-muted-foreground w-full text-left"
                           >
                             Influence
                           </button>
                         </div>
                      </div>
                      
                      {/* Right Column - Specializations */}
                      <div>
                        <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Specialization
                        </div>
                                                 <div className="space-y-1">
                           <button 
                             onClick={() => window.location.href = "/assessment/specializations/growth"}
                             className="block px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors text-muted-foreground w-full text-left"
                           >
                             Growth
                           </button>
                           <button 
                             onClick={() => window.location.href = "/assessment/specializations/technical"}
                             className="block px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors text-muted-foreground w-full text-left"
                           >
                             Technical
                           </button>
                           <button 
                             onClick={() => window.location.href = "/assessment/specializations/founding"}
                             className="block px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors text-muted-foreground w-full text-left"
                           >
                             Founding
                           </button>
                           <button 
                             onClick={() => window.location.href = "/assessment/specializations/platform"}
                             className="block px-3 py-2 text-sm hover:bg-blue-600 hover:text-white rounded-md transition-colors text-muted-foreground w-full text-left"
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setShowDataModal(true)}>
                <span>My Data</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowGoalsModal(true)}>
                <span>My Goals</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowVoiceModal(true)}>
                <span>My Voice</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
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