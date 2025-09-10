import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  BookOpen, 
  Plus,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Target
} from "lucide-react";

export function CTADeck() {
  const actions = [
    {
      id: 'work-history',
      title: 'Add a Work History Story',
      description: 'Share a specific achievement or project that demonstrates your PM skills',
      icon: Users,
      color: 'blue',
      badge: 'Recommended',
      benefits: ['Build your story library', 'Improve assessment accuracy', 'Generate better cover letters']
    },
    {
      id: 'cover-letter',
      title: 'Generate Your First Cover Letter',
      description: 'Create a targeted cover letter using your uploaded content and PM assessment',
      icon: FileText,
      color: 'green',
      badge: 'Quick Win',
      benefits: ['See immediate value', 'Test the system', 'Get a reusable template']
    },
    {
      id: 'case-study',
      title: 'Add a Case Study Link',
      description: 'Link to portfolio pieces, case studies, or project documentation',
      icon: BookOpen,
      color: 'purple',
      badge: 'Optional',
      benefits: ['Strengthen your profile', 'Showcase specific skills', 'Increase confidence score']
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          card: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50',
          icon: 'bg-blue-100 text-blue-600',
          badge: 'bg-blue-100 text-blue-800',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
      case 'green':
        return {
          card: 'border-green-200 bg-green-50/50 hover:bg-green-50',
          icon: 'bg-green-100 text-green-600',
          badge: 'bg-green-100 text-green-800',
          button: 'bg-green-600 hover:bg-green-700 text-white'
        };
      case 'purple':
        return {
          card: 'border-purple-200 bg-purple-50/50 hover:bg-purple-50',
          icon: 'bg-purple-100 text-purple-600',
          badge: 'bg-purple-100 text-purple-800',
          button: 'bg-purple-600 hover:bg-purple-700 text-white'
        };
      default:
        return {
          card: 'border-muted-foreground/25 bg-muted/30 hover:bg-muted/50',
          icon: 'bg-muted text-muted-foreground',
          badge: 'bg-muted text-muted-foreground',
          button: 'bg-primary hover:bg-primary/90 text-white'
        };
    }
  };

  const handleActionClick = (actionId: string) => {
    switch (actionId) {
      case 'work-history':
        // Navigate to work history page
        window.location.href = '/work-history';
        break;
      case 'cover-letter':
        // Navigate to cover letter creation
        window.location.href = '/cover-letters';
        break;
      case 'case-study':
        // Navigate to work history to add links
        window.location.href = '/work-history';
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-foreground">
          Choose Your Next Action
        </h3>
        <p className="text-muted-foreground">
          Each action builds your profile and improves your PM assessment
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {actions.map((action) => {
          const colors = getColorClasses(action.color);
          const IconComponent = action.icon;
          
          return (
            <Card 
              key={action.id} 
              className={`shadow-soft border-2 transition-all duration-200 hover:shadow-lg ${colors.card}`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                    <IconComponent className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <Badge variant="secondary" className={`text-xs ${colors.badge}`}>
                    {action.badge}
                  </Badge>
                </div>
                <CardTitle className="text-lg text-foreground">
                  {action.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Benefits */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Benefits:</p>
                  <ul className="space-y-1">
                    {action.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <Button 
                  onClick={() => handleActionClick(action.id)}
                  className={`w-full ${colors.button}`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {action.id === 'work-history' && 'Add Story'}
                  {action.id === 'cover-letter' && 'Generate Letter'}
                  {action.id === 'case-study' && 'Add Link'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Progress Summary */}
      <Card className="shadow-soft bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Your Progress Journey</h4>
              </div>
              <p className="text-sm text-blue-700">
                Each action you take improves your profile and unlocks new capabilities
              </p>
            </div>
            
            <div className="text-right space-y-1">
              <div className="text-2xl font-bold text-blue-900">3</div>
              <div className="text-sm text-blue-700">Actions Available</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="shadow-soft bg-muted/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">Pro Tips</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="font-medium text-foreground">Start with Work History</div>
              <p className="text-muted-foreground">
                Adding detailed stories about your achievements provides the foundation for everything else.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-foreground">Generate a Cover Letter</div>
              <p className="text-muted-foreground">
                See immediate value by creating your first targeted cover letter using the system.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
