import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  LinkedinIcon, 
  Mail, 
  CheckCircle, 
  ArrowRight,
  Trophy,
  Sparkles,
  Target,
  Users,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import { ImportSummaryStep } from "@/components/onboarding/ImportSummaryStep";
import { FileUploadCard } from "@/components/onboarding/FileUploadCard";
import { useTour } from "@/contexts/TourContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useLinkedInUpload } from "@/hooks/useFileUpload";
import { useOnboardingJobStream } from "@/hooks/useJobStream";
import { isValidLinkedInUrl, normalizeLinkedInUrl } from "@/utils/linkedinUtils";

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
    type: 'resume' | 'linkedin' | 'coverLetter' | 'caseStudies';
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
  const [resumeCompleted, setResumeCompleted] = useState(false);
  const [linkedinCompleted, setLinkedinCompleted] = useState(false);
  const [coverLetterCompleted, setCoverLetterCompleted] = useState(false);
  const linkedinRef = useRef<HTMLDivElement>(null);
  const coverLetterRef = useRef<HTMLDivElement>(null);


  const [autoPopulatingLinkedIn, setAutoPopulatingLinkedIn] = useState(false);
  const [linkedinAutoCompleted, setLinkedinAutoCompleted] = useState(false);
  const { startTour } = useTour();
  const { user, profile } = useAuth();
  const linkedInUpload = useLinkedInUpload();

  // Streaming: onboarding analysis
  const {
    state: onboardingJob,
    createJob: createOnboardingJob,
    isStreaming: isOnboardingStreaming,
    error: onboardingError,
  } = useOnboardingJobStream({ pollIntervalMs: 2000, timeout: 300000 });

  const obStageOrder = ['linkedInFetch', 'profileStructuring', 'derivedArtifacts'] as const;
  const obCompleted = obStageOrder.filter(
    (k) => (onboardingJob?.stages as any)?.[k]?.status === 'complete'
  ).length;
  const obPct = Math.round((obCompleted / obStageOrder.length) * 100);

  // Check if user signed up with LinkedIn
  const isLinkedInUser = user?.app_metadata?.provider === 'linkedin_oidc' || 
                        user?.identities?.some(identity => identity.provider === 'linkedin_oidc');
  
  // Extract LinkedIn ID from OAuth data if available
  const linkedinIdentity = user?.identities?.find(id => id.provider === 'linkedin_oidc');
  const linkedinId = linkedinIdentity?.identity_data?.id;
  const linkedinUrl = linkedinId ? `https://linkedin.com/in/${linkedinId}` : onboardingData.linkedinUrl;

  const handleNextStep = () => {
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('upload');
        break;
      case 'upload':
        setCurrentStep('review');
        // Kick off final analysis when entering review if uploads are present
        if (!isOnboardingStreaming) {
          void startFinalAnalysis();
        }
        break;
      case 'review':
        try {
          startTour();
        } catch (error) {
          console.error('Error starting tour:', error);
        }
        break;
      default:
        setCurrentStep('welcome');
    }
  };

  const handleFileUpload = (type: 'resume' | 'coverLetter', file: File | null) => {
    if (file === null) {
      // Clear the file from state
      if (type === 'coverLetter') {
        setOnboardingData(prev => ({ ...prev, coverLetterFile: undefined }));
        setCoverLetterCompleted(false);
      } else if (type === 'resume') {
        setOnboardingData(prev => ({ ...prev, [type]: undefined }));
        setResumeCompleted(false);
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

  const handleUploadComplete = async (fileId: string, uploadType: string) => {
    // Store the file ID for later reference
    setOnboardingData(prev => ({ 
      ...prev, 
      [`${uploadType}FileId`]: fileId 
    }));
    
    // Mark steps as completed
    if (uploadType === 'resume') {
      setResumeCompleted(true);
      
      // Check if resume contains LinkedIn URL and auto-populate
      await checkAndAutoPopulateLinkedIn(fileId);
    } else if (uploadType === 'linkedin') {
      setLinkedinCompleted(true);
    } else if (uploadType === 'coverLetter') {
      setCoverLetterCompleted(true);
    }
  };

  const handleUploadError = (error: string) => {
    console.warn('Background processing error:', error);
    // Don't block user flow, just log the error
  };

  const handleLinkedInUrl = (url: string) => {
    setOnboardingData(prev => ({ ...prev, linkedinUrl: url }));
    // Note: linkedinCompleted will be set by handleUploadComplete when PDL processing finishes
  };

  const handleCoverLetterText = (text: string) => {
    setOnboardingData(prev => ({ ...prev, coverLetter: text }));
  };

  const startFinalAnalysis = async () => {
    try {
      const linkedInData = linkedinUrl ? { url: linkedinUrl } : undefined;
      await createOnboardingJob('onboarding' as any, {
        linkedInData,
        resumeText: undefined,
        coverLetterText: onboardingData.coverLetter,
        source: 'finalAnalysis',
      } as any);
    } catch (e) {
      console.error('[Onboarding] Failed to start streaming analysis', e);
    }
  };

  useEffect(() => {
    const handleFileUploadProgress = (event: Event) => {
      const detail = (event as CustomEvent).detail as { stage?: string } | undefined;
      const stage = detail?.stage;
      if (!stage) return;

      if (['uploading', 'extracting', 'analyzing', 'structuring'].includes(stage)) {
        setIsProcessing(true);
      }

      if (stage === 'complete' || stage === 'duplicate') {
        setIsProcessing(false);
      }
    };

    const handleUploadProgress = (event: Event) => {
      const detail = (event as CustomEvent).detail as { step?: string } | undefined;
      const step = detail?.step;
      if (!step) return;

      if (step === 'saving') {
        setIsProcessing(true);
      }

      if (step === 'complete') {
        setIsProcessing(false);
      }
    };

    window.addEventListener('file-upload-progress', handleFileUploadProgress as EventListener);
    window.addEventListener('upload:progress', handleUploadProgress as EventListener);

    return () => {
      window.removeEventListener('file-upload-progress', handleFileUploadProgress as EventListener);
      window.removeEventListener('upload:progress', handleUploadProgress as EventListener);
    };
  }, []);

  /**
   * Check if resume contains LinkedIn URL and auto-populate Step 2
   */
  const checkAndAutoPopulateLinkedIn = async (resumeFileId: string) => {
    if (!user) return;

    try {
      const { data: fileData, error } = await supabase
        .from('sources')
        .select('structured_data')
        .eq('id', resumeFileId)
        .eq('user_id', user.id)
        .single();

      if (error || !fileData) {
        return;
      }

      const structuredData = (fileData as any).structured_data;
      const linkedinUrl = structuredData?.contactInfo?.linkedin;

      if (!linkedinUrl) {
        return;
      }

      const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
      if (!normalizedUrl || !isValidLinkedInUrl(normalizedUrl)) {
        return;
      }

      setOnboardingData(prev => ({ ...prev, linkedinUrl: normalizedUrl }));
      setAutoPopulatingLinkedIn(true);

      try {
        if (linkedInUpload?.connectLinkedIn) {
          const result = await linkedInUpload.connectLinkedIn(normalizedUrl);
          if (result?.success) {
            setLinkedinAutoCompleted(true);
            await handleUploadComplete(result.fileId || `linkedin_${Date.now()}`, 'linkedin');
          }
        }
        setLinkedinCompleted(true);
      } finally {
        setAutoPopulatingLinkedIn(false);
      }
    } catch (error) {
      console.error('Error during LinkedIn auto-population:', error);
      setAutoPopulatingLinkedIn(false);
    }
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
            Welcome to Narrata!
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
        
        {/* Resume */}
        <div>
          <FileUploadCard
            type="resume"
            title="Resume"
            description="Upload your resume to get started"
            icon={FileText}
            onFileUpload={handleFileUpload}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            currentValue={onboardingData.resume}
            required={true}
          />
        </div>
        
        {/* LinkedIn */}
        <div ref={linkedinRef}>
          <div className={!resumeCompleted ? 'opacity-50 pointer-events-none' : ''}>
            <FileUploadCard
              type="linkedin"
              title="LinkedIn Profile"
              description={autoPopulatingLinkedIn 
                ? "✨ Auto-populating from resume..." 
                : linkedinAutoCompleted && linkedinCompleted
                  ? "LinkedIn profile imported from your resume"
                  : resumeCompleted 
                    ? (linkedinUrl 
                      ? "LinkedIn URL found in resume - click Connect to enrich" 
                      : "Enter your LinkedIn URL to enrich your work history")
                    : "Complete resume upload first"}
              icon={LinkedinIcon}
              onLinkedInUrl={handleLinkedInUrl}
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              currentValue={linkedinUrl}
              disabled={!resumeCompleted || autoPopulatingLinkedIn}
              required={true}
            />
          </div>
        </div>
        
        {/* Cover Letter */}
        <div ref={coverLetterRef}>
          <div className={!linkedinCompleted ? 'opacity-50 pointer-events-none' : ''}>
            <FileUploadCard
              type="coverLetter"
              title="Best Cover Letter"
              description={linkedinCompleted 
                ? "Upload or paste your best cover letter example" 
                : "Complete LinkedIn step first"}
              icon={Mail}
              onTextInput={handleCoverLetterText}
              onFileUpload={handleFileUpload}
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              currentValue={onboardingData.coverLetter}
              disabled={!linkedinCompleted}
              required={true}
            />
          </div>
        </div>
        
      </div>

      <div className="text-center">
        <Button 
          size="lg" 
          onClick={handleNextStep}
          disabled={!resumeCompleted || !linkedinCompleted || !coverLetterCompleted || isProcessing}
          className="px-8 py-3 text-lg"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              Analyzing...
            </>
          ) : !resumeCompleted ? (
            <>
              Upload Resume to Continue
            </>
          ) : !linkedinCompleted ? (
            <>
              Add LinkedIn to Continue
            </>
          ) : !coverLetterCompleted ? (
            <>
              Add Cover Letter to Continue
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
                  Summary
                </span>
              </div>
            </div>
          </div>
        </Card>

        <ImportSummaryStep onNext={handleNextStep} />
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
          onClick={startTour}
          className="px-8 py-3 text-lg"
        >
          Start Product Tour
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    try {
      switch (currentStep) {
        case 'welcome':
          return renderWelcomeStep();
        case 'upload':
          return renderUploadStep();
        case 'review':
          return (
            <>
              {isOnboardingStreaming || onboardingJob?.status === 'running' ? (
                <div className="mb-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Analyzing your profile… {obPct}%</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Streaming stages:
                      </div>
                    </div>
                    <Badge variant="secondary">{onboardingJob?.status ?? 'pending'}</Badge>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {obStageOrder.map((s) => {
                      const done = (onboardingJob?.stages as any)?.[s]?.status === 'complete';
                      return (
                        <Badge key={s} variant={done ? 'default' : 'secondary'}>
                          {s}{done ? ' ✓' : ' …'}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {renderReviewStep()}
            </>
          );
        default:
          return renderWelcomeStep();
      }
    } catch (error: any) {
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
      </div>
    </div>
  );
}
