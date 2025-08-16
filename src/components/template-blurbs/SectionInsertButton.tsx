import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionInsertButtonProps {
  onClick: () => void;
  className?: string;
  variant?: "default" | "subtle";
}

export function SectionInsertButton({ 
  onClick, 
  className,
  variant = "default" 
}: SectionInsertButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex justify-center py-3 relative",
            className
          )}>
            {/* Subtle connecting line */}
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gradient-to-b from-transparent via-muted-foreground/20 to-transparent" />
            
            <Button
              variant={variant === "default" ? "secondary" : "ghost"}
              size="sm"
              onClick={onClick}
              className={cn(
                "h-8 w-8 rounded-full p-0 transition-all duration-200 hover:scale-110 relative z-10",
                variant === "default" 
                  ? "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 shadow-soft" 
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add new section here</span>
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <p>Click to add a new section here</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
