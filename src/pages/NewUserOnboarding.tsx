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
  CheckCircle, 
  ArrowRight,
  Trophy,
  Sparkles,
  Target,
  Users,
  Lightbulb
} from "lucide-react";
import { ContentReviewStep } from "@/components/onboarding/ContentReviewStep";
import { FileUploadCard } from "@/components/onboarding/FileUploadCard";
import { useTour } from "@/contexts/TourContext";
import { useAuth } from "@/contexts/AuthContext";

type OnboardingStep = 'welcome' | 'upload' | 'review';

interface OnboardingData {
  resume?: File;
  linkedinUrl?: string;
  coverLetter?: string;
  coverLetterFile?: File;
  pmLevel?: string;
  confidence?: number;
  progress?: number;
  approvedContent?: Array<{
    id: string;
    type: 'resume' | 'linkedin' | 'coverLetter';
    title: string;
    source: string;
    content: string;
    sections?: Array<{
      id: string;
      title: string;
      content: string;
      type: 'intro' | 'paragraph' | 'closer' | 'signature';
    }>;
    stories?: Array<{
      id: string;
      title: string;
      content: string;
      company: string;
      role: string;
      dates: string;
    }>;
    approved: boolean;
    confidence: 'high' | 'medium' | 'low';
  }>;
}

export default function NewUserOnboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const { startTour } = useTour();
  const { user, profile } = useAuth();

  // Check if user signed up with LinkedIn
  const isLinkedInUser = user?.app_metadata?.provider === 'linkedin_oidc' || 
                        user?.identities?.some(identity => identity.provider === 'linkedin_oidc');
  
  // Extract LinkedIn ID from OAuth data if available
  const linkedinIdentity = user?.identities?.find(id => id.provider === 'linkedin_oidc');
  const linkedinId = linkedinIdentity?.identity_data?.id;
  const linkedinUrl = linkedinId ? `https://linkedin.com/in/${linkedinId}` : onboardingData.linkedinUrl;

  // Debug logging for LinkedIn OAuth data (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 LinkedIn OAuth Debug:', {
      isLinkedInUser,
      linkedinId,
      linkedinUrl,
      provider: user?.app_metadata?.provider
    });
  }

  const handleNextStep = () => {
    console.log('handleNextStep called, current step:', currentStep);
    
    switch (currentStep) {
      case 'welcome':
        console.log('Moving from welcome to upload');
        setCurrentStep('upload');
        break;
      case 'upload':
        console.log('Moving from upload to review');
        setCurrentStep('review');
        break;
      case 'review':
        console.log('Moving from review to start tour');
        try {
          // Start tour and navigate to Work History immediately
          console.log('Calling startTour()...');
          startTour();
          console.log('startTour() called successfully');
        } catch (error) {
          console.error('Error starting tour:', error);
        }
        break;
      default:
        console.log('Unknown step in handleNextStep:', currentStep);
    }
  };

  const handleFileUpload = (type: 'resume' | 'coverLetter', file: File | null) => {
    if (file === null) {
      // Clear the file from state
      if (type === 'coverLetter') {
        setOnboardingData(prev => ({ ...prev, coverLetterFile: undefined }));
      } else {
        setOnboardingData(prev => ({ ...prev, [type]: undefined }));
      }
    } else {
      // Set the file in state
      if (type === 'coverLetter') {
        setOnboardingData(prev => ({ ...prev, coverLetterFile: file }));
      } else {
        setOnboardingData(prev => ({ ...prev, [type]: file }));
      }
    }
  };

  const handleUploadComplete = (fileId: string, uploadType: string) => {
    console.log('Background processing completed:', { fileId, uploadType });
    // Store the file ID for later reference
    setOnboardingData(prev => ({ 
      ...prev, 
      [`${uploadType}FileId`]: fileId 
    }));
  };

  const handleUploadError = (error: string) => {
    console.warn('Background processing error:', error);
    // Don't block user flow, just log the error
  };

  const handleLinkedInUrl = (url: string) => {
    setOnboardingData(prev => ({ ...prev, linkedinUrl: url }));
  };

  const handleCoverLetterText = (text: string) => {
    console.log('handleCoverLetterText called with:', text);
    setOnboardingData(prev => ({ ...prev, coverLetter: text }));
    console.log('Updated onboardingData.coverLetter to:', text);
  };

  const renderWelcomeStep = () => (
    <div className="space-y-8">
      {/* Progress Bar */}
      <Card className="p-6">
        <div className="flex items-center justify-center relative">
          <h3 className="font-semibold text-gray-900 absolute left-0">Progress</h3>
          <div className="flex items-center space-x-8">
            {/* Step 1: Welcome */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentStep === 'welcome' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  </div>
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
              </div>
              <span className={`text-sm font-medium ${currentStep === 'welcome' ? 'text-blue-600' : 'text-gray-900'}`}>
                Welcome
              </span>
            </div>
            
            {/* Connector line */}
            <div className="w-12 h-0.5 bg-gray-200"></div>
            
            {/* Step 2: Upload */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentStep === 'upload' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  </div>
                ) : currentStep === 'welcome' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white"></div>
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
              </div>
                     <span className={`text-sm font-medium ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-900'}`}>
                       Content
                     </span>
            </div>
            
            {/* Connector line */}
            <div className="w-12 h-0.5 bg-gray-200"></div>
            
            {/* Step 3: Review */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentStep === 'review' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  </div>
                ) : ['welcome', 'upload'].includes(currentStep) ? (
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white"></div>
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
              </div>
              <span className={`text-sm font-medium ${currentStep === 'review' ? 'text-blue-600' : 'text-gray-900'}`}>
                Review
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Welcome Content */}
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
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-8">
      {/* Progress Bar */}
      <Card className="p-6">
        <div className="flex items-center justify-center relative">
          <h3 className="font-semibold text-gray-900 absolute left-0">Progress</h3>
          <div className="flex items-center space-x-8">
            {/* Step 1: Welcome */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentStep === 'welcome' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  </div>
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
              </div>
              <span className={`text-sm font-medium ${currentStep === 'welcome' ? 'text-blue-600' : 'text-gray-900'}`}>
                Welcome
              </span>
            </div>
            
            {/* Connector line */}
            <div className="w-12 h-0.5 bg-gray-200"></div>
            
            {/* Step 2: Upload */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentStep === 'upload' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  </div>
                ) : currentStep === 'welcome' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white"></div>
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
              </div>
                     <span className={`text-sm font-medium ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-900'}`}>
                       Content
                     </span>
            </div>
            
            {/* Connector line */}
            <div className="w-12 h-0.5 bg-gray-200"></div>
            
            {/* Step 3: Review */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentStep === 'review' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  </div>
                ) : ['welcome', 'upload'].includes(currentStep) ? (
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white"></div>
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
              </div>
              <span className={`text-sm font-medium ${currentStep === 'review' ? 'text-blue-600' : 'text-gray-900'}`}>
                Review
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="text-center space-y-4">
               <h2 className="text-3xl font-bold text-foreground">
                 Add Your Content
               </h2>
      </div>

      <div className="flex flex-col gap-6">
        <FileUploadCard
          type="resume"
          title="Resume"
          description=""
          icon={FileText}
          onFileUpload={handleFileUpload}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          currentValue={onboardingData.resume}
        />
        
        <FileUploadCard
          type="linkedin"
          title="LinkedIn Profile"
          description="Enter your LinkedIn profile URL to import work history and skills"
          icon={Linkedin}
          onLinkedInUrl={handleLinkedInUrl}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          currentValue={linkedinUrl}
        />
        
        <FileUploadCard
          type="coverLetter"
          title="Best Cover Letter"
          description=""
          icon={Mail}
          onTextInput={handleCoverLetterText}
          onFileUpload={handleFileUpload}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          currentValue={onboardingData.coverLetter}
        />
        
      </div>

      <div className="text-center">
        <Button 
          size="lg" 
          onClick={handleNextStep}
          disabled={!onboardingData.resume || (!onboardingData.coverLetter && !onboardingData.coverLetterFile)}
          className="px-8 py-3 text-lg"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              Review & Approve
              <ArrowRight className="ml-2 w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    return (
      <div className="space-y-8">
        {/* Progress Bar */}
        <Card className="p-6">
          <div className="flex items-center justify-center relative">
            <h3 className="font-semibold text-gray-900 absolute left-0">Progress</h3>
            <div className="flex items-center space-x-8">
              {/* Step 1: Welcome */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {currentStep === 'welcome' ? (
                    <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                    </div>
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  )}
                </div>
                <span className={`text-sm font-medium ${currentStep === 'welcome' ? 'text-blue-600' : 'text-gray-900'}`}>
                  Welcome
                </span>
              </div>
              
              {/* Connector line */}
              <div className="w-12 h-0.5 bg-gray-200"></div>
              
              {/* Step 2: Upload */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {currentStep === 'upload' ? (
                    <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                    </div>
                  ) : currentStep === 'welcome' ? (
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white"></div>
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  )}
                </div>
                     <span className={`text-sm font-medium ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-900'}`}>
                       Content
                     </span>
              </div>
              
              {/* Connector line */}
              <div className="w-12 h-0.5 bg-gray-200"></div>
              
              {/* Step 3: Review */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {currentStep === 'review' ? (
                    <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                    </div>
                  ) : ['welcome', 'upload'].includes(currentStep) ? (
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white"></div>
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  )}
                </div>
                <span className={`text-sm font-medium ${currentStep === 'review' ? 'text-blue-600' : 'text-gray-900'}`}>
                  Review
                </span>
              </div>
            </div>
          </div>
        </Card>

        <ContentReviewStep 
          onReviewComplete={(approvedContent) => {
            console.log('Review completed, approved content:', approvedContent);
            // Update onboarding data with approved content
            setOnboardingData(prev => ({
              ...prev,
              approvedContent
            }));
            handleNextStep();
          }}
          onBack={() => setCurrentStep('upload')}
        />
      </div>
    );
  };

  const renderTourStep = () => (
    <div className="space-y-8 text-center">
      <div className="space-y-4">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">
          Ready for Your Product Tour!
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Let's walk through your new profile and show you how to use your content to generate cover letters.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-blue-900">Work History & Stories</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-blue-800 text-sm">
              See your approved stories and LinkedIn connections
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed border-purple-200 bg-purple-50/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-purple-900">Templates & Saved Sections</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-purple-800 text-sm">
              Review your cover letter sections and templates
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed border-green-200 bg-green-50/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-green-900">Cover Letter Generator</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-green-800 text-sm">
              Create your first targeted cover letter
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          The tour will take you through each page and highlight your newly-imported content.
        </p>
        <Button 
          size="lg" 
          onClick={() => {
            console.log('Starting product tour');
            startTour();
          }}
          className="px-8 py-3 text-lg"
        >
          Start Product Tour
          <ArrowRight className="ml-2 w-5 h-5" />
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
        case 'review':
          console.log('Rendering review step');
          return renderReviewStep();

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

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {renderCurrentStep()}
        </div>
        
        {/* Debug Panel at bottom - Development Only */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 right-4 p-3 bg-gray-100 border border-gray-300 rounded text-xs">
            <p className="text-gray-600 font-bold">🔍 Debug: LinkedIn OAuth</p>
            <p className="text-gray-500">LinkedIn User: {isLinkedInUser ? 'Yes' : 'No'} | ID: {linkedinId || 'None'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
