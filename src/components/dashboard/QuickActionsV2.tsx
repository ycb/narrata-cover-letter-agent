import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Briefcase, 
  FileText, 
  Award, 
  Target,
  TrendingUp,
  Edit,
  Lightbulb,
  Users,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  icon: React.ComponentType<{ className?: string }>;
  category: 'stories' | 'assessment' | 'letters' | 'improvement';
}

interface QuickActionsV2Props {
  actions: QuickAction[];
}

export function QuickActionsV2({ actions }: QuickActionsV2Props) {
  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'text-destructive';
      case 'medium':
        return 'text-warning';
      case 'low':
        return 'text-success';
    }
  };

  const getPriorityVariant = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'stories':
        return <FileText className="h-4 w-4" />;
      case 'assessment':
        return <Award className="h-4 w-4" />;
      case 'letters':
        return <Briefcase className="h-4 w-4" />;
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

  // Group actions by priority
  const highPriorityActions = actions.filter(a => a.priority === 'high');
  const mediumPriorityActions = actions.filter(a => a.priority === 'medium');
  const lowPriorityActions = actions.filter(a => a.priority === 'low');

  const renderActionGroup = (actions: QuickAction[], title: string, variant: 'destructive' | 'secondary' | 'default') => {
    if (actions.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </h4>
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            className="w-full justify-start h-auto p-3"
            asChild
          >
            <Link to={action.action}>
              <div className="flex items-start gap-3 w-full">
                <div className={`p-2 rounded-lg ${getCategoryColor(action.category)} flex-shrink-0`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {action.description}
                  </div>
                </div>
                <Badge variant={getPriorityVariant(action.priority)} size="sm" className="flex-shrink-0">
                  {action.priority === 'high' ? 'Critical' : action.priority === 'medium' ? 'Important' : 'Optional'}
                </Badge>
              </div>
            </Link>
          </Button>
        ))}
      </div>
    );
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" />
          Smart Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* High Priority Actions */}
        {renderActionGroup(highPriorityActions, 'Priority Actions', 'destructive')}
        
        {/* Medium Priority Actions */}
        {renderActionGroup(mediumPriorityActions, 'Recommended Actions', 'secondary')}
        
        {/* Low Priority Actions */}
        {renderActionGroup(lowPriorityActions, 'Optional Actions', 'default')}

        {/* Quick Stats */}
        <div className="pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-accent">
                {actions.filter(a => a.priority === 'high').length}
              </div>
              <div className="text-xs text-muted-foreground">Priority Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent">
                {actions.length}
              </div>
              <div className="text-xs text-muted-foreground">Total Actions</div>
            </div>
          </div>
        </div>

        {/* View All Link */}
        <div className="pt-2">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link to="/work-history">
              <BarChart3 className="h-4 w-4 mr-2" />
              View All Work History
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
