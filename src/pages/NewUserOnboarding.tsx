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
import { ProgressSidebar } from "@/components/onboarding/ProgressSidebar";
import { FileUploadCard } from "@/components/onboarding/FileUploadCard";
import { ScoreReveal } from "@/components/onboarding/ScoreReveal";
import { CTADeck } from "@/components/onboarding/CTADeck";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { ParsingResultsCard } from "@/components/onboarding/ParsingResultsCard";
import { SimpleContentReview } from "@/components/onboarding/SimpleContentReview";
import { PMLevelPreview } from "@/components/onboarding/PMLevelPreview";

type OnboardingStep = 'welcome' | 'upload' | 'review' | 'integrate' | 'tour';

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
        console.log('Moving from upload to review');
        // Simulate processing
        setIsProcessing(true);
        setTimeout(() => {
          console.log('Processing complete, setting review step');
          setOnboardingData(prev => ({
            ...prev,
            pmLevel: 'Product Manager (Mid-Level)',
            confidence: 65,
            progress: 75
          }));
          setIsProcessing(false);
          setCurrentStep('review');
        }, 2000);
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
        />
        
        <FileUploadCard
          type="linkedin"
          title="LinkedIn Profile"
          description="Connect your professional profile"
          icon={Linkedin}
          onLinkedInUrl={handleLinkedInUrl}
          required
        />
        
        <FileUploadCard
          type="coverLetter"
          title="Best Cover Letter"
          description="Paste or upload your strongest cover letter"
          icon={Mail}
          onFileUpload={handleFileUpload}
          onTextInput={handleCoverLetterText}
          required
        />
        
        <FileUploadCard
          type="caseStudies"
          title="Case Studies (Optional)"
          description="Add any relevant case studies or projects"
          icon={BookOpen}
          onFileUpload={handleFileUpload}
          optional
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

  const renderScoreStep = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Your PM Level Assessment
        </h2>
        <p className="text-lg text-muted-foreground">
          Based on your uploaded content, here's what we discovered:
        </p>
      </div>

      <ScoreReveal
        pmLevel={onboardingData.pmLevel || ''}
        confidence={onboardingData.confidence || 0}
        progress={onboardingData.progress || 0}
      />

      <div className="text-center">
        <Button 
          size="lg" 
          onClick={handleNextStep}
          className="px-8 py-3 text-lg"
        >
          Continue Setup
          <ArrowRight className="ml-2 w-5 h-5" />
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

  const renderReviewStep = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Review Your Content
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          We've analyzed your uploads and extracted the key information. 
          Review each item and keep what looks good.
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-600 mb-4">Review step loaded successfully!</p>
        <Button onClick={handleNextStep}>
          Continue to Next Step
        </Button>
      </div>
    </div>
  );

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
    console.log('Current step:', currentStep);
    console.log('Onboarding data:', onboardingData);
    
    try {
      switch (currentStep) {
        case 'welcome':
          return renderWelcomeStep();
        case 'upload':
          return renderUploadStep();
        case 'review':
          return renderReviewStep();
        case 'integrate':
          return renderIntegrateStep();
        case 'tour':
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
      {/* Progress Header */}
      <OnboardingHeader currentStep={currentStep} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <ProgressSidebar 
              currentStep={currentStep}
              onboardingData={onboardingData}
              onAddStory={() => console.log('Add story clicked')}
            />
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
