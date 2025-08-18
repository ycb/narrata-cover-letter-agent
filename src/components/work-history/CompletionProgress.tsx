import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, Circle } from "lucide-react";

interface CompletionProgressProps {
  completed: number;
  total: number;
  steps: {
    name: string;
    completed: boolean;
    required?: boolean;
  }[];
  className?: string;
}

export const CompletionProgress = ({ 
  completed, 
  total, 
  steps, 
  className 
}: CompletionProgressProps) => {
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Setup Progress</span>
        <Badge variant="secondary" className="text-xs">
          {completed}/{total} Complete
        </Badge>
      </div>
      
      <Progress value={percentage} className="h-2" />
      
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-2">
            {step.completed ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={cn(
              "text-sm",
              step.completed ? "text-foreground" : "text-muted-foreground"
            )}>
              {step.name}
              {step.required && <span className="text-red-500 ml-1">*</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
