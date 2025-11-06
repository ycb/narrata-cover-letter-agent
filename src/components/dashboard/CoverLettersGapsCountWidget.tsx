import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';

interface CoverLettersGapsCountWidgetProps {
  count?: number;
  isLoading?: boolean;
  onClick?: () => void;
}

export function CoverLettersGapsCountWidget({ count = 0, isLoading, onClick }: CoverLettersGapsCountWidgetProps) {
  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-center">Cover Letters</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft border-muted cursor-pointer hover:shadow-medium transition-shadow" onClick={onClick}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-center gap-2">
          <Mail className="w-4 h-4" />
          Cover Letters
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="text-3xl font-bold text-foreground">{count}</div>
        <div className="text-xs text-muted-foreground mt-1">items with gaps</div>
      </CardContent>
    </Card>
  );
}

