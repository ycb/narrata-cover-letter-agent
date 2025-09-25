import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link to="/signup" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign Up
            </Link>
            <h1 className="text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
            <p className="text-muted-foreground">Effective Date: September 1, 2025</p>
          </div>

          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Narrata Terms of Service</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p className="text-sm text-muted-foreground mb-6">
                Welcome to Narrata! By using our website, applications, and services (collectively, the "Service"), you agree to the following Terms of Service ("Terms"). Please read them carefully.
              </p>

              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="mb-6">
                By accessing or using Narrata, you confirm that you are at least 18 years old and agree to be bound by these Terms. If you do not agree, do not use the Service.
              </p>

              <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
              <p className="mb-6">
                Narrata provides an AI-assisted platform to generate and manage modular cover letters and career storytelling content based on your input. We do not guarantee job placement or interview success.
              </p>

              <h2 className="text-xl font-semibold mb-3">3. User Responsibilities</h2>
              <p className="mb-3">You agree to:</p>
              <ul className="list-disc pl-6 mb-6">
                <li>Provide accurate information</li>
                <li>Maintain the confidentiality of your account</li>
                <li>Use the Service in compliance with all laws</li>
              </ul>
              <p className="mb-6">
                You retain ownership of your content. You grant Narrata a limited license to process and display your content only for the purposes of operating the Service.
              </p>

              <h2 className="text-xl font-semibold mb-3">4. Prohibited Uses</h2>
              <p className="mb-3">You may not:</p>
              <ul className="list-disc pl-6 mb-6">
                <li>Use the Service for illegal or harmful activities</li>
                <li>Use automated systems to access the Service</li>
                <li>Reproduce or exploit the Service without permission</li>
              </ul>

              <h2 className="text-xl font-semibold mb-3">5. AI Disclaimer</h2>
              <p className="mb-6">
                AI-generated content is based on your input and system prompts. Narrata is not responsible for factual errors, omissions, or outcomes from use of generated content.
              </p>

              <h2 className="text-xl font-semibold mb-3">6. Account Termination</h2>
              <p className="mb-6">
                We may suspend or terminate your account if you violate these Terms. You may cancel at any time.
              </p>

              <h2 className="text-xl font-semibold mb-3">7. Modifications</h2>
              <p className="mb-6">
                We may update these Terms from time to time. We'll notify you of material changes.
              </p>

              <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
              <p className="mb-6">
                Narrata is provided "as is." To the maximum extent permitted by law, we disclaim all warranties and are not liable for indirect, incidental, or consequential damages.
              </p>

              <h2 className="text-xl font-semibold mb-3">9. Governing Law</h2>
              <p className="mb-6">
                These Terms are governed by the laws of the State of California without regard to conflict of laws principles.
              </p>

              <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
              <p className="mb-6">
                For questions, contact: <a href="mailto:support@narrata.co" className="text-accent hover:underline">support@narrata.co</a>
              </p>

              <div className="border-t pt-6 mt-8">
                <p className="text-sm text-muted-foreground">© 2025 Narrata. All rights reserved.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
