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

              {/* Work History Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:text-foreground data-[state=open]:text-foreground",
                      activePage === "work-history" 
                        ? "text-foreground border-b-2 border-primary" 
                        : "text-muted-foreground"
                    )}
                  >
                    <Briefcase className="h-4 w-4" />
                    Work History
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/work-history" className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Stories
                      </span>
                      <Badge variant="secondary" className="ml-auto">47</Badge>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/show-all-links" className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        External Links
                      </span>
                      <Badge variant="secondary" className="ml-auto">12</Badge>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Cover Letters Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:text-foreground data-[state=open]:text-foreground",
                      activePage === "cover-letters" 
                        ? "text-foreground border-b-2 border-primary" 
                        : "text-muted-foreground"
                    )}
                  >
                    <Mail className="h-4 w-4" />
                    Cover Letters
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/show-all-saved-sections" className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Saved Sections
                      </span>
                      <Badge variant="secondary" className="ml-auto">23</Badge>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/cover-letter-template" className="flex items-center gap-2">
                      <LayoutTemplate className="h-4 w-4" />
                      Templates
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Assessment Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:text-foreground data-[state=open]:text-foreground",
                      activePage === "assessment" 
                        ? "text-foreground border-b-2 border-primary" 
                        : "text-muted-foreground"
                    )}
                  >
                    <TrendingUp className="h-4 w-4" />
                    Assessment
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/assessment" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Overall Level
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Users className="h-4 w-4 mr-2" />
                      Competencies
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem>Execution</DropdownMenuItem>
                      <DropdownMenuItem>Customer Insight</DropdownMenuItem>
                      <DropdownMenuItem>Strategy</DropdownMenuItem>
                      <DropdownMenuItem>Influence</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Specialization
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem>Growth</DropdownMenuItem>
                      <DropdownMenuItem>Technical</DropdownMenuItem>
                      <DropdownMenuItem>Founding</DropdownMenuItem>
                      <DropdownMenuItem>Platform</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
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