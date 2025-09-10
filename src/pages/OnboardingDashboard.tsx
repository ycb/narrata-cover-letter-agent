import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Circle, 
  ArrowRight,
  Users,
  BookOpen,
  Mail,
  Trophy,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'pending' | 'optional';
  icon: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    path: string;
  };
}

export default function OnboardingDashboard() {
  const onboardingTasks: OnboardingTask[] = [
    {
      id: 'upload',
      title: 'Upload Documents',
      description: 'Resume, LinkedIn, and Cover Letter uploaded and processed',
      status: 'completed',
      icon: CheckCircle,
      action: {
        label: 'View Content',
        path: '/work-history'
      }
    },
    {
      id: 'review',
      title: 'Review & Approve Content',
      description: 'Stories and sections approved for use',
      status: 'completed',
      icon: CheckCircle,
      action: {
        label: 'Edit Content',
        path: '/work-history'
      }
    },
    {
      id: 'tour',
      title: 'Product Tour',
      description: 'Learn how to use your content and generate cover letters',
      status: 'pending',
      icon: Circle,
      action: {
        label: 'Start Tour',
        path: '/work-history'
      }
    },
    {
      id: 'first-letter',
      title: 'Generate First Cover Letter',
      description: 'Create your first targeted cover letter using your content',
      status: 'pending',
      icon: Circle,
      action: {
        label: 'Create Letter',
        path: '/cover-letters'
      }
    },
    {
      id: 'enhance',
      title: 'Enhance Your Profile',
      description: 'Add more stories, improve competencies, and track progress',
      status: 'optional',
      icon: Circle,
      action: {
        label: 'Get Started',
        path: '/assessment'
      }
    }
  ];

  const completedTasks = onboardingTasks.filter(task => task.status === 'completed');
  const pendingTasks = onboardingTasks.filter(task => task.status === 'pending');
  const optionalTasks = onboardingTasks.filter(task => task.status === 'optional');
  const progress = (completedTasks.length / (completedTasks.length + pendingTasks.length)) * 100;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Circle className="w-5 h-5 text-blue-600" />;
      case 'optional':
        return <Circle className="w-5 h-5 text-gray-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'optional':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            Welcome to TruthLetter!
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your onboarding is complete. Here's what you can do next to get the most out of your new profile.
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="max-w-2xl mx-auto mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Onboarding Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Essential Steps</span>
              <span>{completedTasks.length} of {completedTasks.length + pendingTasks.length} completed</span>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {progress === 100 ? 'All essential steps completed!' : 'Complete the remaining steps to unlock full functionality.'}
            </p>
          </CardContent>
        </Card>

        {/* Task Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Essential Tasks */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Essential Next Steps</h2>
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <Card key={task.id} className="border-2 border-blue-200 bg-blue-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <h3 className="font-medium text-blue-900">{task.title}</h3>
                        <p className="text-sm text-blue-800 mt-1">{task.description}</p>
                        {task.action && (
                          <Button 
                            size="sm" 
                            className="mt-3"
                            asChild
                          >
                            <Link to={task.action.path}>
                              {task.action.label}
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Optional Tasks */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Enhance Your Profile</h2>
            <div className="space-y-3">
              {optionalTasks.map((task) => (
                <Card key={task.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        {task.action && (
                          <Button 
                            variant="outline"
                            size="sm" 
                            className="mt-3"
                            asChild
                          >
                            <Link to={task.action.path}>
                              {task.action.label}
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="max-w-4xl mx-auto mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4 flex-col" asChild>
                  <Link to="/work-history">
                    <Users className="w-8 h-8 mb-2 text-blue-600" />
                    <span className="font-medium">Work History</span>
                    <span className="text-sm text-muted-foreground">View your stories</span>
                  </Link>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex-col" asChild>
                  <Link to="/templates">
                    <BookOpen className="w-8 h-8 mb-2 text-purple-600" />
                    <span className="font-medium">Templates</span>
                    <span className="text-sm text-muted-foreground">Saved sections</span>
                  </Link>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex-col" asChild>
                  <Link to="/cover-letters">
                    <Mail className="w-8 h-8 mb-2 text-green-600" />
                    <span className="font-medium">Cover Letters</span>
                    <span className="text-sm text-muted-foreground">Generate letters</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exit to Main Dashboard */}
        <div className="text-center mt-8">
          <Button 
            size="lg" 
            variant="outline"
            asChild
          >
            <Link to="/dashboard">
              Go to Main Dashboard
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
