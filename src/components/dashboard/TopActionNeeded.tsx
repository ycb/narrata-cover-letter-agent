import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  TrendingUp,
  Plus,
  Edit,
  Users,
  BarChart3,
  Zap,
  Lightbulb
} from "lucide-react";
import { Link } from "react-router-dom";

interface TopAction {
  id: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  category: 'stories' | 'assessment' | 'letters' | 'improvement';
  competency?: string;
}

interface TopActionNeededProps {
  actions: TopAction[];
}

export function TopActionNeeded({ actions }: TopActionNeededProps) {
  // Get the highest priority action
  const topAction = actions.find(a => a.priority === 'high') || actions[0];
  
  // Get 2-3 other important actions
  const otherActions = actions
    .filter(a => a.id !== topAction?.id)
    .slice(0, 2);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'stories':
        return <Plus className="h-4 w-4" />;
      case 'assessment':
        return <Target className="h-4 w-4" />;
      case 'letters':
        return <Edit className="h-4 w-4" />;
      case 'improvement':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'stories':
        return 'bg-blue-100 text-blue-800';
      case 'assessment':
        return 'bg-purple-100 text-purple-800';
      case 'letters':
        return 'bg-green-100 text-green-800';
      case 'improvement':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!topAction) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-success" />
            Top Action Needed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">
              Your profile is in great shape. Keep adding new stories as you gain experience.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" />
          Top Action Needed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Action */}
        <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <div className={`p-2 rounded-lg ${getCategoryColor(topAction.category)} flex-shrink-0`}>
              {getCategoryIcon(topAction.category)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-base">{topAction.title}</h4>
                <Badge variant="destructive" size="sm">
                  Top Priority
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {topAction.description}
              </p>
            </div>
          </div>
          <Button className="w-full" asChild>
            <Link to={topAction.action}>
              <Target className="h-4 w-4 mr-2" />
              Start Now
            </Link>
          </Button>
        </div>

        {/* Other Actions - Simplified */}
        {otherActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Other Actions
            </h4>
            {otherActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                className="w-full justify-start h-auto p-3"
                asChild
              >
                <Link to={action.action}>
                  <div className="flex items-center gap-3 w-full">
                    <div className={`p-2 rounded-lg ${getCategoryColor(action.category)} flex-shrink-0`}>
                      {getCategoryIcon(action.category)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{action.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {action.description}
                      </div>
                    </div>
                  </div>
                </Link>
              </Button>
            ))}
          </div>
        )}

        {/* Quick Stats - Simplified */}
        <div className="pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent mb-1">
              {actions.filter(a => a.priority === 'high').length}
            </div>
            <div className="text-xs text-muted-foreground">Priority Items</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Import CheckCircle for the success state
import { CheckCircle } from "lucide-react";
