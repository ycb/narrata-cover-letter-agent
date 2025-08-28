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

  const isAssessmentChild = (pathname: string): boolean => {
    return pathname.startsWith("/assessment/") && pathname !== "/assessment";
  };

  const activePage = getCurrentPage(location.pathname);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-brand bg-clip-text text-transparent">
              TruthLetter
            </span>
          </div>
          
          {/* Dropdown Navigation */}
          <nav className="hidden md:flex">
            <div className="flex items-center gap-1">
              {/* Dashboard - Simple Link */}
              <Link 
                to="/dashboard"
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:text-foreground",
                  activePage === "dashboard" 
                    ? "text-foreground border-b-2 border-primary" 
                    : "text-muted-foreground"
                )}
              >
                <Target className="h-4 w-4" />
                Dashboard
              </Link>

              {/* Work History - Main Link + Dropdown */}
              <div className="relative group">
                <Link 
                  to="/work-history"
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:text-foreground",
                    activePage === "work-history" 
                      ? "text-foreground font-bold" 
                      : "text-muted-foreground"
                  )}
                >
                  <Briefcase className="h-4 w-4" />
                  Work History
                </Link>
                
                {/* Hover Dropdown */}
                <div className="absolute top-full left-0 pt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="bg-background border rounded-lg shadow-lg p-2 min-w-48">
                    <Link 
                      to="/show-all-stories" 
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors",
                        isWorkHistoryChild(location.pathname) && location.pathname.startsWith("/show-all-stories")
                          ? "font-bold text-foreground"
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
                        "flex items-center justify-between px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors",
                        isWorkHistoryChild(location.pathname) && location.pathname.startsWith("/show-all-links")
                          ? "font-bold text-foreground"
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

              {/* Cover Letters - Main Link + Dropdown */}
              <div className="relative group">
                <Link 
                  to="/cover-letters"
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:text-foreground",
                    activePage === "cover-letters" 
                      ? "text-foreground font-bold" 
                      : "text-muted-foreground"
                  )}
                >
                  <Mail className="h-4 w-4" />
                  Cover Letters
                </Link>
                
                {/* Hover Dropdown */}
                <div className="absolute top-full left-0 pt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="bg-background border rounded-lg shadow-lg p-2 min-w-48">
                    <Link 
                      to="/show-all-saved-sections" 
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors",
                        isCoverLettersChild(location.pathname) && location.pathname.startsWith("/show-all-saved-sections")
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
                        "flex items-center justify-between px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors",
                        isCoverLettersChild(location.pathname) && location.pathname.startsWith("/cover-letter-template")
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <LayoutTemplate className="h-4 w-4" />
                        Templates
                      </span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Assessment - Main Link + Dropdown */}
              <div className="relative group">
                <Link 
                  to="/assessment"
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:text-foreground",
                    activePage === "assessment" 
                      ? "text-foreground font-bold" 
                      : "text-muted-foreground"
                  )}
                >
                  <TrendingUp className="h-4 w-4" />
                  Assessment
                </Link>
                
                {/* Hover Dropdown */}
                <div className="absolute top-full left-0 pt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="bg-background border rounded-lg shadow-lg p-2 min-w-56">
                    <Link 
                      to="/assessment/overall-level" 
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors",
                        isAssessmentChild(location.pathname) && location.pathname === "/assessment/overall-level"
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Overall Level
                      </span>
                    </Link>
                    
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Competencies
                    </div>
                    <Link 
                      to="/assessment/competencies/execution" 
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors",
                        isAssessmentChild(location.pathname) && location.pathname === "/assessment/competencies/execution"
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Users className="h-4 w-4" />
                      Execution
                    </Link>
                    <Link 
                      to="/assessment/competencies/customer-insight" 
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors",
                        isAssessmentChild(location.pathname) && location.pathname === "/assessment/competencies/customer-insight"
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Users className="h-4 w-4" />
                      Customer Insight
                    </Link>
                    <Link 
                      to="/assessment/competencies/strategy" 
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors",
                        isAssessmentChild(location.pathname) && location.pathname === "/assessment/competencies/strategy"
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Users className="h-4 w-4" />
                      Strategy
                    </Link>
                    <Link 
                      to="/assessment/competencies/influence" 
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors",
                        isAssessmentChild(location.pathname) && location.pathname === "/assessment/competencies/influence"
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Users className="h-4 w-4" />
                      Influence
                    </Link>
                    
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Specialization
                    </div>
                    <Link 
                      to="/assessment/specializations/growth" 
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors",
                        isAssessmentChild(location.pathname) && location.pathname === "/assessment/specializations/growth"
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Lightbulb className="h-4 w-4" />
                      Growth
                    </Link>
                    <Link 
                      to="/assessment/specializations/technical" 
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors",
                        isAssessmentChild(location.pathname) && location.pathname === "/assessment/specializations/technical"
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Lightbulb className="h-4 w-4" />
                      Technical
                    </Link>
                    <Link 
                      to="/assessment/specializations/founding" 
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors",
                        isAssessmentChild(location.pathname) && location.pathname === "/assessment/specializations/founding"
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Lightbulb className="h-4 w-4" />
                      Founding
                    </Link>
                    <Link 
                      to="/assessment/specializations/platform" 
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors",
                        isAssessmentChild(location.pathname) && location.pathname === "/assessment/specializations/platform"
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Lightbulb className="h-4 w-4" />
                      Platform
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};