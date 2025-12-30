import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";
import { TourProvider } from "@/contexts/TourContext";
import { UserGoalsProvider } from "@/contexts/UserGoalsContext";
import { UserVoiceProvider } from "@/contexts/UserVoiceContext";
import { UploadProgressProvider } from "@/contexts/UploadProgressContext";
import { GapsJobProvider } from "@/contexts/GapsJobContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { FeedbackSystem } from "@/components/feedback/FeedbackSystem";
import { FeedbackAdmin } from "@/components/feedback/FeedbackAdmin";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { isExternalLinksEnabled, isSignupEnabled } from "@/lib/flags";
import { useAuth } from "@/contexts/AuthContext";
import { useUiZoom } from "@/hooks/useUiZoom";
import { FloatingZoomControls } from "@/components/shared/FloatingZoomControls";

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
import WaitlistSignup from "./pages/WaitlistSignup";
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
import MyLibrary from "./pages/MyLibrary";
import MyTags from "./pages/MyTags";
import NewUserOnboarding from "./pages/NewUserOnboarding";
import GoNoGoDemo from "./pages/GoNoGoDemo";
import { EvaluationDashboard } from "./components/evaluation/EvaluationDashboard";
import { PipelineEvaluationDashboard } from "./components/evaluation/PipelineEvaluationDashboard";
import { AdminEvalsDashboard } from "./pages/admin/AdminEvalsDashboard";
import { AdminEvaluationDashboard } from "./pages/admin/AdminEvaluationDashboard";
import { AdminFunnelDashboard } from "./pages/admin/AdminFunnelDashboard";
import { AdminLeaderboardDashboard } from "./pages/admin/AdminLeaderboardDashboard";
import { AdminDebug } from "./pages/admin/AdminDebug";

import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import ForgotPassword from "./pages/ForgotPassword";
import LinkedInCallback from "./pages/LinkedInCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import JobCleaningTest from "./pages/JobCleaningTest";
import NotFound from "./pages/NotFound";
import Demo from "./pages/Demo";
import DemoLauncher from "./pages/DemoLauncher";

const queryClient = new QueryClient();

function AppLayout() {
  const signupEnabled = isSignupEnabled();
  const { isDemo, user } = useAuth();
  const location = useLocation();
  const shouldHideFeedbackOnLanding = location.pathname === '/';
  const isPublicRoute =
    location.pathname === "/" ||
    location.pathname === "/waitlist" ||
    location.pathname === "/marketing" ||
    location.pathname === "/signin" ||
    location.pathname === "/signup" ||
    location.pathname === "/forgot-password" ||
    location.pathname.startsWith("/demo") ||
    location.pathname === "/peter" ||
    location.pathname.startsWith("/auth/");

  const isZoomExcludedRoute = location.pathname.startsWith("/cover-letters");
  const shouldShowUiZoom = Boolean(user) && !isPublicRoute && !isZoomExcludedRoute;
  const { zoomLevel, minZoom, maxZoom, zoomIn, zoomOut } = useUiZoom({
    storageKey: "uiZoom:global",
    minZoom: 30,
    maxZoom: 100,
    step: 10,
    defaultZoom: 100
  });

  return (
    <div className={`min-h-screen flex flex-col ${isDemo ? 'pb-14' : ''}`}>
      <div className="flex-1">
        <div
          style={
            shouldShowUiZoom
              ? {
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: "top left",
                  width: `${100 / (zoomLevel / 100)}%`
                }
              : undefined
          }
        >
          <Routes>
	        <Route path="/" element={<LandingPage />} />
	        <Route path="/waitlist" element={<WaitlistSignup />} />
	        <Route path="/marketing" element={<Landing />} />
	        <Route path="/peter" element={<DemoLauncher slugOverride="peter" />} />
	        <Route path="/demo/:slug" element={<DemoLauncher />} />
	        <Route path="/demo-data/:slug" element={<Demo />} />
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
        <Route path="/dev/go-no-go-demo" element={
          <ProtectedRoute>
            <Header />
            <GoNoGoDemo />
          </ProtectedRoute>
        } />
        <Route path="/saved-sections" element={
          <ProtectedRoute>
            <Header />
            <SavedSections />
          </ProtectedRoute>
        } />
        <Route path="/my-library" element={
          <ProtectedRoute>
            <Header />
            <MyLibrary />
          </ProtectedRoute>
        } />
        <Route path="/my-tags" element={
          <ProtectedRoute>
            <Header />
            <MyTags />
          </ProtectedRoute>
        } />
        <Route path="/new-user" element={
          <ProtectedRoute>
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
        
        {/* Admin Routes */}
        <Route path="/admin/debug" element={
          <ProtectedRoute>
            <AdminDebug />
          </ProtectedRoute>
        } />
        <Route path="/admin/evals" element={
          <ProtectedRoute>
            <AdminEvalsDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/evaluation" element={
          <ProtectedRoute>
            <AdminEvaluationDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/funnel" element={
          <ProtectedRoute>
            <AdminFunnelDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/leaderboard" element={
          <ProtectedRoute>
            <AdminLeaderboardDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dev/job-cleaning" element={
          <ProtectedRoute>
            <Header />
            <JobCleaningTest />
          </ProtectedRoute>
        } />
        <Route
          path="/signup"
          element={
            signupEnabled ? (
              <ProtectedRoute requireAuth={false}><SignUp /></ProtectedRoute>
            ) : (
              <Navigate to="/waitlist" replace />
            )
          }
        />
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
        </div>
	      </div>

        {shouldShowUiZoom && (
          <FloatingZoomControls
            zoomLevel={zoomLevel}
            minZoom={minZoom}
            maxZoom={maxZoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
          />
        )}
	      
	      {/* Show prototype banner on all pages - DISABLED FOR USABILITY TESTING */}
	      {/* <PrototypeStateBanner /> */}
      
      {/* Feedback system available on all pages */}
      {shouldShowFeedbackSystem() && !shouldHideFeedbackOnLanding && (
        <FeedbackSystem hideFloatingButton={isDemo} />
      )}
      
      {/* Footer on all pages */}
      <Footer />
      <DemoBanner />
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
