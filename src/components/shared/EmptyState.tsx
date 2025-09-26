import React from 'react';
import { AlertTriangle, FileText, BookOpen, Users, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const defaultIcons = {
  file: FileText,
  book: BookOpen,
  users: Users,
  mail: Mail,
  warning: AlertTriangle,
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  const IconComponent = Icon || defaultIcons.warning;

  return (
    <div className={`text-center space-y-6 py-12 ${className}`}>
      <IconComponent className="w-12 h-12 text-muted-foreground mx-auto" />
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="secondary">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
