import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PrototypeProvider } from "@/contexts/PrototypeContext";
import { PrototypeStateBanner } from "@/components/work-history/PrototypeStateBanner";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import WorkHistory from "./pages/WorkHistory";
import CoverLetters from "./pages/CoverLetters";
import CoverLetterTemplate from "./pages/CoverLetterTemplate";
import CoverLetterCreate from "./pages/CoverLetterCreate";
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
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/work-history" element={<WorkHistory />} />
        <Route path="/cover-letters" element={<CoverLetters />} />
        <Route path="/cover-letter-template" element={<CoverLetterTemplate />} />
        <Route path="/cover-letter-create" element={<CoverLetterCreate />} />
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
