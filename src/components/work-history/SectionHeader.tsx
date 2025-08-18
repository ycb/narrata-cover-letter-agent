import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  ctaText: string;
  onCtaClick: () => void;
  ctaIcon?: React.ComponentType<{ className?: string }>;
  className?: string;
  subtitle?: string;
  disabled?: boolean;
}

export const SectionHeader = ({ 
  title, 
  ctaText, 
  onCtaClick, 
  ctaIcon = Plus,
  className,
  subtitle,
  disabled = false
}: SectionHeaderProps) => {
  const Icon = ctaIcon;

  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onCtaClick}
        disabled={disabled}
        className="flex items-center gap-2"
      >
        <Icon className="h-4 w-4" />
        {ctaText}
      </Button>
    </div>
  );
};
