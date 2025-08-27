import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PrototypeProvider } from "@/contexts/PrototypeContext";
import { PrototypeStateBanner } from "@/components/work-history/PrototypeStateBanner";
import { Header } from "@/components/layout/Header";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import WorkHistory from "./pages/WorkHistory";
import CoverLetters from "./pages/CoverLetters";
import CoverLetterTemplate from "./pages/CoverLetterTemplate";
import Assessment from "./pages/Assessment";

import { HILDemo } from "./pages/HILDemo";
import ShowAllStories from "./pages/ShowAllStories";
import ShowAllLinks from "./pages/ShowAllLinks";
import ShowAllSavedSections from "./pages/ShowAllSavedSections";

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
        <Route path="/show-all-saved-sections" element={
          <>
            <Header />
            <ShowAllSavedSections />
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
          <AppLayout />
        </BrowserRouter>
      </PrototypeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
