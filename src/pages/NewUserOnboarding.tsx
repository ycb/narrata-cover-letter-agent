import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  Linkedin, 
  Mail, 
  BookOpen, 
  CheckCircle, 
  ArrowRight,
  Trophy,
  Sparkles,
  Target,
  Users,
  Lightbulb
} from "lucide-react";
import { SimpleContentReview } from "@/components/onboarding/SimpleContentReview";
import { FileUploadCard } from "@/components/onboarding/FileUploadCard";
import { ScoreReveal } from "@/components/onboarding/ScoreReveal";

type OnboardingStep = 'welcome' | 'upload' | 'score' | 'review' | 'integrate' | 'tour';

interface OnboardingData {
  resume?: File;
  linkedinUrl?: string;
  coverLetter?: string;
  coverLetterFile?: File;
  caseStudies?: string[];
  pmLevel?: string;
  confidence?: number;
  progress?: number;
}

export default function NewUserOnboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNextStep = () => {
    console.log('handleNextStep called, current step:', currentStep);
    
    switch (currentStep) {
      case 'welcome':
        console.log('Moving from welcome to upload');
        setCurrentStep('upload');
        break;
      case 'upload':
        console.log('Moving from upload to score');
        // Simulate processing
        setIsProcessing(true);
        setTimeout(() => {
          console.log('Processing complete, setting score step');
          setOnboardingData(prev => ({
            ...prev,
            pmLevel: 'Product Manager (Mid-Level)',
            confidence: 65,
            progress: 75
          }));
          setIsProcessing(false);
          setCurrentStep('score');
        }, 1000); // Reduced to 1 second for faster testing
        break;
      case 'score':
        console.log('Moving from score to review');
        setCurrentStep('review');
        break;
      case 'review':
        console.log('Moving from review to integrate');
        setCurrentStep('integrate');
        break;
      case 'integrate':
        console.log('Moving from integrate to tour');
        setCurrentStep('tour');
        break;
      case 'tour':
        console.log('Moving to dashboard');
        // Navigate to dashboard
        window.location.href = '/dashboard';
        break;
      default:
        console.log('Unknown step in handleNextStep:', currentStep);
    }
  };

  const handleFileUpload = (type: 'resume' | 'coverLetter', file: File) => {
    if (type === 'coverLetter') {
      setOnboardingData(prev => ({ ...prev, coverLetterFile: file }));
    } else {
      setOnboardingData(prev => ({ ...prev, [type]: file }));
    }
  };

  const handleLinkedInUrl = (url: string) => {
    setOnboardingData(prev => ({ ...prev, linkedinUrl: url }));
  };

  const handleCoverLetterText = (text: string) => {
    setOnboardingData(prev => ({ ...prev, coverLetter: text }));
  };

  const renderWelcomeStep = () => (
    <div className="text-center space-y-6">
      <div className="space-y-4">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">
          Welcome to TruthLetter!
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Let's unlock your job search superpowers.
        </p>
      </div>
      
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>Get your personalized PM Level Assessment</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>Build a reusable story library</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>Generate targeted cover letters</span>
        </div>
      </div>

      <Button 
        size="lg" 
        onClick={handleNextStep}
        className="px-8 py-3 text-lg"
      >
        Get Started
        <ArrowRight className="ml-2 w-5 h-5" />
      </Button>
    </div>
  );

  const renderScoreStep = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Your PM Level Assessment
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Based on your uploaded content, here's what we discovered:
        </p>
      </div>

      <ScoreReveal
        pmLevel={onboardingData.pmLevel || 'Product Manager (Mid-Level)'}
        confidence={onboardingData.confidence || 65}
        progress={onboardingData.progress || 75}
        onContinue={handleNextStep}
      />
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          What Does Your Work Say About You?
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          We analyze your resume, work history, and best cover letter to give you a personalized PM Level Assessment.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FileUploadCard
          type="resume"
          title="Resume"
          description="Upload your resume to get started"
          icon={FileText}
          onFileUpload={handleFileUpload}
          required
          currentValue={onboardingData.resume}
        />
        
        <FileUploadCard
          type="linkedin"
          title="LinkedIn Profile"
          description="Connect your professional profile"
          icon={Linkedin}
          onLinkedInUrl={handleLinkedInUrl}
          required
          currentValue={onboardingData.linkedinUrl}
        />
        
        <FileUploadCard
          type="coverLetter"
          title="Best Cover Letter"
          description="Paste or upload your strongest cover letter"
          icon={Mail}
          onTextInput={handleCoverLetterText}
          required
          currentValue={onboardingData.coverLetter}
        />
        
        <FileUploadCard
          type="caseStudies"
          title="Case Studies (Optional)"
          description="Add any relevant case studies or projects"
          icon={BookOpen}
          onFileUpload={handleFileUpload}
          optional
          currentValue={onboardingData.caseStudies?.[0]}
        />
      </div>

      <div className="text-center">
        {/* Debug info */}
        <div className="mb-4 p-4 bg-gray-100 rounded text-sm text-left max-w-md mx-auto">
          <div>Resume: {onboardingData.resume ? '✅' : '❌'}</div>
          <div>LinkedIn: {onboardingData.linkedinUrl ? '✅' : '❌'}</div>
          <div>Cover Letter Text: {onboardingData.coverLetter ? '✅' : '❌'}</div>
          <div>Cover Letter File: {onboardingData.coverLetterFile ? '✅' : '❌'}</div>
          <div>Button Disabled: {(!onboardingData.resume || !onboardingData.linkedinUrl || (!onboardingData.coverLetter && !onboardingData.coverLetterFile)) ? 'Yes' : 'No'}</div>
        </div>
        
        <Button 
          size="lg" 
          onClick={handleNextStep}
          disabled={!onboardingData.resume || !onboardingData.linkedinUrl || (!onboardingData.coverLetter && !onboardingData.coverLetterFile)}
          className="px-8 py-3 text-lg"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              See My Score
              <ArrowRight className="ml-2 w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );



  const renderLibraryStep = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Your Library is Ready
        </h2>
        <p className="text-lg text-muted-foreground">
          We've organized your content into reusable building blocks:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-blue-900">Work History</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-blue-800 text-sm">
              Stories + Links extracted from your resume
            </p>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {onboardingData.resume ? '3 Stories Found' : 'Upload Resume'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed border-purple-200 bg-purple-50/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-purple-900">Templates</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-purple-800 text-sm">
              Saved Sections from your cover letter
            </p>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              {onboardingData.coverLetter ? '2 Sections Saved' : 'Add Cover Letter'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button 
          size="lg" 
          onClick={handleNextStep}
          className="px-8 py-3 text-lg"
        >
          Continue
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    // Mock review items for testing
    const mockItems = [
      {
        id: '1',
        type: 'resume' as const,
        title: 'Senior Product Manager Role',
        content: 'Led cross-functional team of 8 engineers and designers to launch new mobile app feature, resulting in 25% increase in user engagement and 15% improvement in retention metrics.',
        quality: 'high' as const,
        details: ['6 roles extracted', '14 achievements found', 'Skills: Product Strategy, User Research, Agile'],
        suggestions: ['Add more quantifiable results', 'Include stakeholder management examples'],
        icon: FileText
      },
      {
        id: '2',
        type: 'linkedin' as const,
        title: 'LinkedIn Profile',
        content: 'Product Manager with 5+ years experience in B2B SaaS. Passionate about user-centered design and data-driven decision making.',
        quality: 'medium' as const,
        details: ['4 roles found', 'Skills: Product Management, User Research, Analytics'],
        suggestions: ['Add more recent experience', 'Include specific project outcomes'],
        icon: Users
      },
      {
        id: '3',
        type: 'coverLetter' as const,
        title: 'Cover Letter Content',
        content: 'I am excited to apply for the Senior Product Manager position at your company. My experience in leading product teams and driving user engagement aligns perfectly with your needs.',
        quality: 'high' as const,
        details: ['3 sections identified', '2 stories extracted', 'Professional tone detected'],
        suggestions: ['Add more specific examples', 'Include metrics where possible'],
        icon: Mail
      }
    ];

    return (
      <div className="space-y-8">
        <SimpleContentReview 
          items={mockItems}
          onReviewComplete={(keptItems) => {
            console.log('Review completed, kept items:', keptItems);
            handleNextStep();
          }}
        />
      </div>
    );
  };

  const renderIntegrateStep = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Your Content is Ready
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          We've organized your imported content into structured objects.
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-600 mb-4">Integrate step loaded successfully!</p>
        <Button onClick={handleNextStep}>
          Continue to Tour
        </Button>
      </div>
    </div>
  );

  const renderTourStep = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Let's Take a Quick Tour
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Learn how to use your new profile and generate your first cover letter
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-600 mb-4">Tour step loaded successfully!</p>
        <Button onClick={handleNextStep}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    console.log('renderCurrentStep called with step:', currentStep);
    console.log('Onboarding data:', onboardingData);
    
    try {
      switch (currentStep) {
        case 'welcome':
          console.log('Rendering welcome step');
          return renderWelcomeStep();
        case 'upload':
          console.log('Rendering upload step');
          return renderUploadStep();
        case 'score':
          console.log('Rendering score step');
          return renderScoreStep();
        case 'review':
          console.log('Rendering review step');
          return renderReviewStep();
        case 'integrate':
          console.log('Rendering integrate step');
          return renderIntegrateStep();
        case 'tour':
          console.log('Rendering tour step');
          return renderTourStep();
        default:
          console.log('Unknown step, defaulting to welcome');
          return renderWelcomeStep();
      }
    } catch (error) {
      console.error('Error rendering step:', error);
      return (
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-600">Error Loading Step</h2>
          <p className="text-gray-600">Current step: {currentStep}</p>
          <p className="text-gray-600">Error: {error.message}</p>
          <Button onClick={() => setCurrentStep('welcome')}>
            Return to Welcome
          </Button>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Progress</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Welcome</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Upload</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-blue-500" />
                    <span className="text-sm font-medium">Score</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    <span className="text-sm text-gray-500">Review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    <span className="text-sm text-gray-500">Integrate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    <span className="text-sm text-gray-500">Tour</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderCurrentStep()}
          </div>
        </div>
      </div>
    </div>
  );
}
