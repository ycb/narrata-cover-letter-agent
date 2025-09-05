import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PrototypeProvider } from "@/contexts/PrototypeContext";
import { TourProvider } from "@/contexts/TourContext";
import { PrototypeStateBanner } from "@/components/work-history/PrototypeStateBanner";
import { Header } from "@/components/layout/Header";
import { FeedbackSystem } from "@/components/feedback/FeedbackSystem";
import { FeedbackAdmin } from "@/components/feedback/FeedbackAdmin";

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
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import WorkHistory from "./pages/WorkHistory";
import CoverLetters from "./pages/CoverLetters";
import CoverLetterTemplate from "./pages/CoverLetterTemplate";
import Assessment from "./pages/Assessment";
import OnboardingDashboard from "./pages/OnboardingDashboard";
import NewUserDashboard from "./pages/NewUserDashboard";

import { HILDemo } from "./pages/HILDemo";
import ShowAllStories from "./pages/ShowAllStories";
import ShowAllLinks from "./pages/ShowAllLinks";
import SavedSections from "./pages/SavedSections";
import NewUserOnboarding from "./pages/NewUserOnboarding";

import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppLayout() {
  return (
    <div className="pb-16">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={
          <>
            <Header />
            <Dashboard />
          </>
        } />
        <Route path="/work-history" element={
          <>
            <Header />
            <WorkHistory />
          </>
        } />
        <Route path="/cover-letters" element={
          <>
            <Header />
            <CoverLetters />
          </>
        } />
        <Route path="/cover-letter-template" element={
          <>
            <Header />
            <CoverLetterTemplate />
          </>
        } />
        <Route path="/assessment" element={
          <>
            <Header />
            <Assessment />
          </>
        } />

        {/* Assessment Section Routes */}
        <Route path="/assessment/overall-level" element={
          <>
            <Header />
            <Assessment initialSection="overall-level" />
          </>
        } />
        <Route path="/assessment/competencies/execution" element={
          <>
            <Header />
            <Assessment initialSection="competency-execution" />
          </>
        } />
        <Route path="/assessment/competencies/customer-insight" element={
          <>
            <Header />
            <Assessment initialSection="competency-customer-insight" />
          </>
        } />
        <Route path="/assessment/competencies/strategy" element={
          <>
            <Header />
            <Assessment initialSection="competency-strategy" />
          </>
        } />
        <Route path="/assessment/competencies/influence" element={
          <>
            <Header />
            <Assessment initialSection="competency-influence" />
          </>
        } />
        <Route path="/assessment/specializations/growth" element={
          <>
            <Header />
            <Assessment initialSection="specialization-growth" />
          </>
        } />
        <Route path="/assessment/specializations/technical" element={
          <>
            <Header />
            <Assessment initialSection="specialization-technical" />
          </>
        } />
        <Route path="/assessment/specializations/founding" element={
          <>
            <Header />
            <Assessment initialSection="specialization-founding" />
          </>
        } />
        <Route path="/assessment/specializations/platform" element={
          <>
            <Header />
            <Assessment initialSection="specialization-platform" />
          </>
        } />

        <Route path="/hil-demo" element={
          <>
            <Header />
            <HILDemo />
          </>
        } />
        <Route path="/show-all-stories" element={
          <>
            <Header />
            <ShowAllStories />
          </>
        } />
        <Route path="/show-all-links" element={
          <>
            <Header />
            <ShowAllLinks />
          </>
        } />
        <Route path="/saved-sections" element={
          <>
            <Header />
            <SavedSections />
          </>
        } />
        <Route path="/new-user" element={<NewUserOnboarding />} />
        <Route path="/onboarding-dashboard" element={<OnboardingDashboard />} />
        <Route path="/new-user-dashboard" element={<NewUserDashboard />} />
        <Route path="/feedback-admin" element={
          <>
            <Header />
            <FeedbackAdmin />
          </>
        } />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {/* Show prototype banner on all pages */}
      <PrototypeStateBanner />
      
      {/* Feedback system available on all pages */}
      {shouldShowFeedbackSystem() && <FeedbackSystem />}
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PrototypeProvider>
        <BrowserRouter>
          <TourProvider>
            <AppLayout />
          </TourProvider>
        </BrowserRouter>
      </PrototypeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
