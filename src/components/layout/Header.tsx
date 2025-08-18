import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Settings, LogOut, Zap, FileText, Target, Briefcase, TrendingUp } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HeaderProps {
  currentPage?: string;
}

export const Header = ({ currentPage }: HeaderProps) => {
  const location = useLocation();
  const isProduction = window.location.hostname !== 'localhost';
  const basePath = isProduction ? '/cla' : '';
  
  // Determine current page based on pathname
  const getCurrentPage = (pathname: string): string => {
    if (pathname === "/cla/dashboard" || pathname === "/dashboard") return "dashboard";
    if (pathname === "/cla/work-history" || pathname === "/work-history") return "work-history";
    if (pathname === "/cla/cover-letters" || pathname === "/cover-letters" || pathname === "/cla/cover-letter-template" || pathname === "/cover-letter-template" || pathname === "/cla/cover-letter-create" || pathname === "/cover-letter-create") return "cover-letters";
    if (pathname === "/cla/assessment" || pathname === "/assessment") return "assessment";
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
          
          {/* Clean Navigation */}
          <nav className="hidden md:flex">
            <div className="flex items-center">
              <Link 
                to={`${basePath}/dashboard`}
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
              <Link 
                to={`${basePath}/work-history`}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:text-foreground",
                  activePage === "work-history" 
                    ? "text-foreground border-b-2 border-primary" 
                    : "text-muted-foreground"
                )}
              >
                <Briefcase className="h-4 w-4" />
                Work History
              </Link>
              <Link 
                to={`${basePath}/cover-letters`}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:text-foreground",
                  activePage === "cover-letters" 
                    ? "text-foreground border-b-2 border-primary" 
                    : "text-muted-foreground"
                )}
              >
                <FileText className="h-4 w-4" />
                Cover Letters
              </Link>
              <Link 
                to={`${basePath}/assessment`}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:text-foreground",
                  activePage === "assessment" 
                    ? "text-foreground border-b-2 border-primary" 
                    : "text-muted-foreground"
                )}
              >
                <TrendingUp className="h-4 w-4" />
                Assessment
              </Link>
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