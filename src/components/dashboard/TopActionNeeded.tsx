import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus,
  CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { TopAction } from "@/types/dashboard";

interface TopActionNeededProps {
  actions: TopAction[];
}

export function TopActionNeeded({ actions }: TopActionNeededProps) {
  // Get the highest priority action only
  const topAction = actions.find(a => a.priority === 'high') || actions[0];

  const getStoryContext = (action: TopAction) => {
    if (action.context) {
      return `for ${action.context.role} at ${action.context.company}`;
    }
    return 'for your current role';
  };

  if (!topAction) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Top Action Needed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
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
        <CardTitle className="text-lg font-semibold">
          Top Action Needed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Single Primary Action - Integrated CTA */}
        <div className="p-6 bg-accent/5 border border-accent/20 rounded-lg">
          <div className="mb-4">
            <div className="mb-3">
              <h4 className="text-lg font-semibold">{topAction.title}</h4>
            </div>
                                <p className="text-base text-muted-foreground mb-3">
                      Strengthen your <strong>Product Strategy</strong> skills
                    </p>
            {topAction.context && (
              <p className="text-base text-muted-foreground">
                for <strong>Senior PM</strong> at <strong>TechCorp</strong>
              </p>
            )}
          </div>
          
          {/* Integrated CTA - Job-specific action */}
          <div className="space-y-3">
            <Button size="default" className="px-8" asChild>
              <Link to={topAction.action}>
                <Plus className="h-4 w-4 mr-2" />
                Add Story
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
