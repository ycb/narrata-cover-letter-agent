import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Circle, 
  Trophy, 
  Target,
  Upload,
  FileText,
  Linkedin,
  Mail,
  BookOpen,
  Users,
  Lightbulb
} from "lucide-react";

interface ProgressSidebarProps {
  currentStep: 'welcome' | 'upload' | 'score' | 'library' | 'next-steps';
  pmLevel?: string;
  confidence?: number;
  progress?: number;
}

const steps = [
  { id: 'welcome', label: 'Welcome', icon: Lightbulb },
  { id: 'upload', label: 'Upload Content', icon: Upload },
  { id: 'score', label: 'PM Level', icon: Trophy },
  { id: 'library', label: 'Library Setup', icon: BookOpen },
  { id: 'next-steps', label: 'Next Steps', icon: Target }
];

export function ProgressSidebar({ currentStep, pmLevel, confidence, progress }: ProgressSidebarProps) {
  const getStepIcon = (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return Circle;
    
    if (stepId === currentStep) {
      return step.icon;
    }
    
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    const stepIndex = steps.findIndex(s => s.id === stepId);
    
    if (stepIndex < currentIndex) {
      return CheckCircle;
    }
    
    return Circle;
  };

  const getStepStatus = (stepId: string) => {
    if (stepId === currentStep) return 'current';
    
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    const stepIndex = steps.findIndex(s => s.id === stepId);
    
    if (stepIndex < currentIndex) return 'completed';
    return 'upcoming';
  };

  const getLevelColor = (level?: string) => {
    if (!level) return 'bg-muted text-muted-foreground';
    
    if (level.includes('Senior') || level.includes('GPM')) return 'bg-green-100 text-green-800';
    if (level.includes('Mid-Level') || level.includes('PM')) return 'bg-blue-100 text-blue-800';
    if (level.includes('Junior') || level.includes('APM')) return 'bg-yellow-100 text-yellow-800';
    
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            const IconComponent = getStepIcon(step.id);
            
            return (
              <div key={step.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  status === 'completed' 
                    ? 'bg-green-100 text-green-600' 
                    : status === 'current'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className={`text-sm ${
                  status === 'completed' 
                    ? 'text-green-700 font-medium' 
                    : status === 'current'
                    ? 'text-blue-700 font-medium'
                    : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* PM Level Score */}
      {pmLevel && (
        <Card className="shadow-soft border-2 border-blue-200 bg-blue-50/50">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Trophy className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-blue-900 text-lg">Your PM Level</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Badge className={`text-lg px-4 py-2 ${getLevelColor(pmLevel)}`}>
              {pmLevel}
            </Badge>
            
            {confidence && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Confidence</span>
                  <span className="text-blue-700 font-medium">{confidence}%</span>
                </div>
                <Progress value={confidence} className="h-2" />
              </div>
            )}
            
            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Profile Complete</span>
                  <span className="text-blue-700 font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Status */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Upload Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Resume</span>
            <Badge variant="secondary" className="ml-auto">
              {pmLevel ? '✓ Uploaded' : 'Required'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <Linkedin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">LinkedIn</span>
            <Badge variant="secondary" className="ml-auto">
              {pmLevel ? '✓ Connected' : 'Required'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Cover Letter</span>
            <Badge variant="secondary" className="ml-auto">
              {pmLevel ? '✓ Added' : 'Required'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Case Studies</span>
            <Badge variant="secondary" className="ml-auto">
              Optional
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Add Work History</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>Generate Cover Letter</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span>Upload Case Study</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
