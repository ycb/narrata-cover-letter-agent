import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, Clock, Link, FileText } from "lucide-react";

interface StatusBadgeProps {
  type: 'linkedin' | 'resume' | 'connection' | 'completion';
  status: 'connected' | 'disconnected' | 'pending' | 'uploaded' | 'not-uploaded' | 'in-progress' | 'complete';
  lastSync?: string;
  fileName?: string;
  completed?: number;
  total?: number;
  className?: string;
}

export const StatusBadge = ({ 
  type, 
  status, 
  lastSync, 
  fileName, 
  completed, 
  total, 
  className 
}: StatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
      case 'uploaded':
      case 'complete':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          text: type === 'linkedin' ? 'Connected' : 
                type === 'resume' ? 'Uploaded' : 
                type === 'completion' ? `${completed}/${total} Complete` : 'Connected'
        };
      case 'disconnected':
      case 'not-uploaded':
        return {
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-600 border-gray-200',
          icon: AlertCircle,
          text: type === 'linkedin' ? 'Not Connected' : 
                type === 'resume' ? 'Not Uploaded' : 'Not Connected'
        };
      case 'pending':
      case 'in-progress':
        return {
          variant: 'outline' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          text: 'Pending'
        };
      default:
        return {
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-600 border-gray-200',
          icon: AlertCircle,
          text: 'Unknown'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{config.text}</span>
      {lastSync && (
        <span className="text-xs opacity-75">
          • {new Date(lastSync).toLocaleDateString()}
        </span>
      )}
      {fileName && (
        <span className="text-xs opacity-75">
          • {fileName}
        </span>
      )}
    </Badge>
  );
};
