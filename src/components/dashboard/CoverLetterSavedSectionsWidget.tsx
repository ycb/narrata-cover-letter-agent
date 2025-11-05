import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LayoutTemplate, AlertTriangle, Target, Circle, ChevronRight, ArrowRight } from 'lucide-react';
import { ContentItemWithGaps } from '@/services/gapDetectionService';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CoverLetterSavedSectionsWidgetProps {
  items: ContentItemWithGaps[];
  isLoading?: boolean;
}

const SEVERITY_CONFIG = {
  high: {
    label: 'High',
    icon: AlertTriangle,
    color: 'text-destructive',
    badgeColor: 'bg-destructive/20 text-destructive border-destructive/30',
  },
  medium: {
    label: 'Medium',
    icon: Target,
    color: 'text-warning',
    badgeColor: 'bg-warning/20 text-warning border-warning/30',
  },
  low: {
    label: 'Low',
    icon: Circle,
    color: 'text-muted-foreground',
    badgeColor: 'bg-muted/20 text-muted-foreground border-muted',
  },
};

export function CoverLetterSavedSectionsWidget({ items, isLoading }: CoverLetterSavedSectionsWidgetProps) {
  const navigate = useNavigate();
  const [selectedSeverity, setSelectedSeverity] = useState<'high' | 'medium' | 'low' | 'all'>('all');

  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" />
            Cover Letter Saved Sections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading saved sections gaps...</div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="shadow-soft border-success/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-success" />
            Cover Letter Saved Sections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No gaps in saved sections.</div>
        </CardContent>
      </Card>
    );
  }

  // Filter by severity
  const filteredItems = selectedSeverity === 'all' 
    ? items 
    : items.filter(item => item.max_severity === selectedSeverity);

  // Count items by severity
  const severityCounts = {
    high: items.filter(item => item.max_severity === 'high').length,
    medium: items.filter(item => item.max_severity === 'medium').length,
    low: items.filter(item => item.max_severity === 'low').length,
  };

  const handleReview = (item: ContentItemWithGaps) => {
    const params = new URLSearchParams(item.navigation_params);
    navigate(`${item.navigation_path}?${params.toString()}`);
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutTemplate className="w-5 h-5" />
          Cover Letter Saved Sections
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Severity Tabs */}
        <Tabs value={selectedSeverity} onValueChange={(v) => setSelectedSeverity(v as typeof selectedSeverity)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="high">
              High {severityCounts.high > 0 && <Badge variant="destructive" className="ml-1.5">{severityCounts.high}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="medium">
              Medium {severityCounts.medium > 0 && <Badge variant="secondary" className="ml-1.5">{severityCounts.medium}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="low">
              Low {severityCounts.low > 0 && <Badge variant="outline" className="ml-1.5">{severityCounts.low}</Badge>}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No {selectedSeverity === 'all' ? '' : `${SEVERITY_CONFIG[selectedSeverity].label.toLowerCase()} priority`} items
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.slice(0, 10).map((item, index) => {
              const config = SEVERITY_CONFIG[item.max_severity];
              const Icon = config.icon;
              
              return (
                <div
                  key={item.entity_id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-sm font-semibold text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.display_title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn("text-xs", config.badgeColor)}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label} Priority
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReview(item)}
                    className="ml-2"
                  >
                    Review
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* View All */}
        {filteredItems.length > 10 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate('/cover-letter-template?filter=gaps')}
          >
            View All {filteredItems.length} Items
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

