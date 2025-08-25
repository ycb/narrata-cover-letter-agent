import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { useState } from "react";

interface ActivityItem {
  id: string;
  type: 'cover-letter' | 'story' | 'profile' | 'assessment';
  title: string;
  description: string;
  time: string;
  status: 'success' | 'info' | 'warning';
}

interface RecentActivityCollapsibleProps {
  activities: ActivityItem[];
}

export function RecentActivityCollapsible({ activities }: RecentActivityCollapsibleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = (status: 'success' | 'info' | 'warning') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-3 w-3 text-success" />;
      case 'info':
        return <TrendingUp className="h-3 w-3 text-accent" />;
      case 'warning':
        return <AlertCircle className="h-3 w-3 text-warning" />;
    }
  };

  const getStatusColor = (status: 'success' | 'info' | 'warning') => {
    switch (status) {
      case 'success':
        return 'bg-success';
      case 'info':
        return 'bg-accent';
      case 'warning':
        return 'bg-warning';
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <Button
          variant="ghost"
          className="w-full justify-between p-0 h-auto font-normal"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            Recent Activity
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`h-2 w-2 rounded-full ${getStatusColor(activity.status)} mt-2`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
                {getStatusIcon(activity.status)}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
