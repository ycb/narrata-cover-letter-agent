import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Settings, LogOut, Zap, FileText, Target, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";

interface HeaderProps {
  currentPage?: string;
}

export const Header = ({ currentPage }: HeaderProps) => {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-brand bg-clip-text text-transparent">
              TruthLetter
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <Button variant="ghost" className={currentPage === 'dashboard' ? 'bg-accent-light' : ''} asChild>
              <Link to="/dashboard">
                <Target className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" className={currentPage === 'work-history' ? 'bg-accent-light' : ''} asChild>
              <Link to="/work-history">
                <Briefcase className="h-4 w-4" />
                Work History
              </Link>
            </Button>
            <Button variant="ghost" className={currentPage === 'cover-letters' ? 'bg-accent-light' : ''} asChild>
              <Link to="/cover-letters">
                <FileText className="h-4 w-4" />
                Cover Letters
              </Link>
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="bg-success-light text-success">
            <div className="h-2 w-2 rounded-full bg-success mr-2" />
            Truth-Based
          </Badge>
          
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