import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";
import { TourProvider } from "@/contexts/TourContext";
import { UserGoalsProvider } from "@/contexts/UserGoalsContext";
import { UserVoiceProvider } from "@/contexts/UserVoiceContext";
import { UploadProgressProvider } from "@/contexts/UploadProgressContext";
import { GapsJobProvider } from "@/contexts/GapsJobContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FeedbackSystem } from "@/components/feedback/FeedbackSystem";
import { FeedbackAdmin } from "@/components/feedback/FeedbackAdmin";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { isExternalLinksEnabled } from "@/lib/flags";

// Environment-based feedback system initialization
const shouldShowFeedbackSystem = (): boolean => {
  // Check explicit environment variable first
  if (import.meta.env.VITE_ENABLE_FEEDBACK_SYSTEM === 'true') {
    return true;
  }
  
  // If not explicitly enabled, check if we're in production
  if (import.meta.env.VITE_ENABLE_FEEDBACK_SYSTEM === 'false') {
    return false;
  }
  
  // Default: only show in production
  return import.meta.env.PROD;
};
import LandingPage from "./pages/LandingPage";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import DashboardRouter from "./pages/DashboardRouter";
import WorkHistory from "./pages/WorkHistory";
import CoverLetters from "./pages/CoverLetters";
import CoverLetterTemplate from "./pages/CoverLetterTemplate";
import Assessment from "./pages/Assessment";
import NewUserDashboard from "./pages/NewUserDashboard";

import { HILDemo } from "./pages/HILDemo";
import TooltipDemo from "./pages/TooltipDemo";
import StreamingDemo from "./pages/StreamingDemo";
import ShowAllStories from "./pages/ShowAllStories";
import ShowAllLinks from "./pages/ShowAllLinks";
import SavedSections from "./pages/SavedSections";
import NewUserOnboarding from "./pages/NewUserOnboarding";
import { EvaluationDashboard } from "./components/evaluation/EvaluationDashboard";
import { PipelineEvaluationDashboard } from "./components/evaluation/PipelineEvaluationDashboard";

import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import ForgotPassword from "./pages/ForgotPassword";
import LinkedInCallback from "./pages/LinkedInCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import JobCleaningTest from "./pages/JobCleaningTest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppLayout() {

  return (
    <div className="pb-16">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/marketing" element={<Landing />} />
        <Route path="/work-history" element={
          <ProtectedRoute>
            <Header />
            <WorkHistory />
          </ProtectedRoute>
        } />
        <Route path="/cover-letters" element={
          <ProtectedRoute>
            <Header />
            <CoverLetters />
          </ProtectedRoute>
        } />
        <Route path="/cover-letter-template" element={
          <ProtectedRoute>
            <Header />
            <CoverLetterTemplate />
          </ProtectedRoute>
        } />
        <Route path="/assessment" element={
          <ProtectedRoute>
            <Header />
            <Assessment />
          </ProtectedRoute>
        } />

        {/* Assessment Section Routes */}
        <Route path="/assessment/overall-level" element={
          <ProtectedRoute>
            <Header />
            <Assessment initialSection="overall-level" />
          </ProtectedRoute>
        } />
        <Route path="/assessment/competencies/execution" element={
          <ProtectedRoute>
            <Header />
            <Assessment initialSection="competency-execution" />
          </ProtectedRoute>
        } />
        <Route path="/assessment/competencies/customer-insight" element={
          <ProtectedRoute>
            <Header />
            <Assessment initialSection="competency-customer-insight" />
          </ProtectedRoute>
        } />
        <Route path="/assessment/competencies/strategy" element={
          <ProtectedRoute>
            <Header />
            <Assessment initialSection="competency-strategy" />
          </ProtectedRoute>
        } />
        <Route path="/assessment/competencies/influence" element={
          <ProtectedRoute>
            <Header />
            <Assessment initialSection="competency-influence" />
          </ProtectedRoute>
        } />
        <Route path="/assessment/specializations/growth" element={
          <ProtectedRoute>
            <Header />
            <Assessment initialSection="specialization-growth" />
          </ProtectedRoute>
        } />
        <Route path="/assessment/specializations/platform" element={
          <ProtectedRoute>
            <Header />
            <Assessment initialSection="specialization-platform" />
          </ProtectedRoute>
        } />
        <Route path="/assessment/specializations/ai-ml" element={
          <ProtectedRoute>
            <Header />
            <Assessment initialSection="specialization-ai_ml" />
          </ProtectedRoute>
        } />
        <Route path="/assessment/specializations/founding" element={
          <ProtectedRoute>
            <Header />
            <Assessment initialSection="specialization-founding" />
          </ProtectedRoute>
        } />

        <Route path="/hil-demo" element={
          <ProtectedRoute>
            <Header />
            <HILDemo />
          </ProtectedRoute>
        } />
        <Route path="/tooltip-demo" element={
          <ProtectedRoute>
            <Header />
            <TooltipDemo />
          </ProtectedRoute>
        } />
        <Route path="/streaming-demo" element={
          <ProtectedRoute>
            <Header />
            <StreamingDemo />
          </ProtectedRoute>
        } />
        <Route path="/show-all-stories" element={
          <ProtectedRoute>
            <Header />
            <ShowAllStories />
          </ProtectedRoute>
        } />
        {isExternalLinksEnabled() && (
          <Route path="/show-all-links" element={
            <ProtectedRoute>
              <Header />
              <ShowAllLinks />
            </ProtectedRoute>
          } />
        )}
        <Route path="/saved-sections" element={
          <ProtectedRoute>
            <Header />
            <SavedSections />
          </ProtectedRoute>
        } />
        <Route path="/new-user" element={
          <ProtectedRoute>
            <Header />
            <NewUserOnboarding />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Header />
            <DashboardRouter />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/onboarding" element={
          <ProtectedRoute>
            <Header />
            <NewUserDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/main" element={
          <ProtectedRoute>
            <Header />
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/feedback-admin" element={
          <ProtectedRoute>
            <Header />
            <FeedbackAdmin />
          </ProtectedRoute>
        } />
        <Route path="/evaluation-dashboard" element={
          <ProtectedRoute>
            <Header />
            <EvaluationDashboard />
          </ProtectedRoute>
        } />
        <Route path="/evals" element={
          <ProtectedRoute>
            <Header />
            <PipelineEvaluationDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dev/job-cleaning" element={
          <ProtectedRoute>
            <Header />
            <JobCleaningTest />
          </ProtectedRoute>
        } />
        <Route path="/signup" element={<ProtectedRoute requireAuth={false}><SignUp /></ProtectedRoute>} />
        <Route path="/signin" element={<ProtectedRoute requireAuth={false}><SignIn /></ProtectedRoute>} />
        <Route path="/forgot-password" element={<ProtectedRoute requireAuth={false}><ForgotPassword /></ProtectedRoute>} />
        <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/terms" element={<TermsOfService />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {/* Show prototype banner on all pages - DISABLED FOR USABILITY TESTING */}
      {/* <PrototypeStateBanner /> */}
      
      {/* Feedback system available on all pages */}
      {shouldShowFeedbackSystem() && <FeedbackSystem />}
      
      {/* Footer on all pages */}
      <Footer />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthErrorBoundary>
        <AuthProvider>
          <UploadProgressProvider>
            <GapsJobProvider>
              <BrowserRouter>
                <TourProvider>
                  <UserGoalsProvider>
                    <UserVoiceProvider>
                      <AppLayout />
                    </UserVoiceProvider>
                  </UserGoalsProvider>
                </TourProvider>
              </BrowserRouter>
            </GapsJobProvider>
          </UploadProgressProvider>
        </AuthProvider>
      </AuthErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
