import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  FileText, 
  LayoutTemplate, 
  Mail, 
  Trophy, 
  Users, 
  BarChart3,
  Target,
  Sparkles,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: string;
  completed: boolean;
  link: string;
}

export default function NewUserDashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<OnboardingTask[]>([
    // Work History Tasks
    {
      id: 'work-history-metrics',
      title: 'Add/revise Metrics',
      description: 'Enhance your stories with quantifiable achievements',
      category: 'Review Work History',
      completed: false,
      link: '/work-history'
    },
    {
      id: 'work-history-stories',
      title: 'Add/revise core Stories',
      description: 'Refine your professional narratives for impact',
      category: 'Review Work History',
      completed: false,
      link: '/work-history'
    },
    
    // Cover Letter Template Tasks
    {
      id: 'template-customize',
      title: 'Customize your Template',
      description: 'Personalize your cover letter structure',
      category: 'Review Cover Letter Template',
      completed: false,
      link: '/cover-letter-template'
    },
    {
      id: 'template-saved-sections',
      title: 'Add/revise Saved Sections',
      description: 'Build your library of reusable content',
      category: 'Review Cover Letter Template',
      completed: false,
      link: '/cover-letter-template'
    },
    
    // Cover Letter Creation Tasks
    {
      id: 'cover-letter-create',
      title: 'Create a new cover letter',
      description: 'Generate your first targeted cover letter',
      category: 'Create Your First Cover Letter!',
      completed: false,
      link: '/cover-letters'
    },
    {
      id: 'cover-letter-track',
      title: 'Track progress',
      description: 'Monitor your application progress',
      category: 'Create Your First Cover Letter!',
      completed: false,
      link: '/cover-letters'
    },
    
    // PM Level Tasks
    {
      id: 'pm-overall',
      title: 'Review Overall Analysis',
      description: 'Understand your comprehensive PM level',
      category: 'Review your PM Level',
      completed: false,
      link: '/assessment'
    },
    {
      id: 'pm-core-skills',
      title: 'Review Core Skills Analysis',
      description: 'Assess your fundamental competencies',
      category: 'Review your PM Level',
      completed: false,
      link: '/assessment'
    },
    {
      id: 'pm-specialization',
      title: 'Review Specialization Analysis',
      description: 'Explore your area of expertise',
      category: 'Review your PM Level',
      completed: false,
      link: '/assessment'
    }
  ]);

  const [showCongratulations, setShowCongratulations] = useState(false);

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const progress = (completedTasks / totalTasks) * 100;

  const handleTaskToggle = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleTaskClick = (task: OnboardingTask) => {
    navigate(task.link);
  };

  useEffect(() => {
    if (completedTasks === totalTasks && !showCongratulations) {
      setShowCongratulations(true);
    }
  }, [completedTasks, totalTasks, showCongratulations]);

  const handleContinueToDashboard = () => {
    navigate('/dashboard');
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, OnboardingTask[]>);

  if (showCongratulations) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-foreground">
                🎉 Congratulations!
              </h1>
              <p className="text-xl text-muted-foreground">
                You've completed your onboarding and are ready to start your job search journey!
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-lg text-foreground">
                You now have access to the full TruthLetter experience with:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Complete Work History</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Personalized Templates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Cover Letter Generator</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>PM Level Assessment</span>
                </div>
              </div>
            </div>

            <Button 
              size="lg" 
              onClick={handleContinueToDashboard}
              className="px-8 py-3 text-lg"
            >
              Continue to Dashboard
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">
              Welcome to TruthLetter!
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Let's get you set up with everything you need to create powerful cover letters and land your dream job.
            </p>
          </div>

          {/* Progress Overview */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Onboarding Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {completedTasks} of {totalTasks} tasks completed
                </span>
                <Badge variant="secondary" className="text-sm">
                  {Math.round(progress)}%
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>

          {/* Task Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(groupedTasks).map(([category, categoryTasks]) => (
              <Card key={category} className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category === 'Review Work History' && <Users className="w-5 h-5" />}
                    {category === 'Review Cover Letter Template' && <LayoutTemplate className="w-5 h-5" />}
                    {category === 'Create Your First Cover Letter!' && <Mail className="w-5 h-5" />}
                    {category === 'Review your PM Level' && <Trophy className="w-5 h-5" />}
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryTasks.map((task) => (
                    <div 
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => handleTaskClick(task)}
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleTaskToggle(task.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </h4>
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <p className={`text-sm text-muted-foreground ${task.completed ? 'line-through' : ''}`}>
                          {task.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <Link to="/work-history">
                    <Users className="w-4 h-4 mr-2" />
                    Work History
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/cover-letter-template">
                    <LayoutTemplate className="w-4 h-4 mr-2" />
                    Edit Template
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/cover-letters">
                    <Mail className="w-4 h-4 mr-2" />
                    Cover Letters
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/assessment">
                    <Trophy className="w-4 h-4 mr-2" />
                    Assessment
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
