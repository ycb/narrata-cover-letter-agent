import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
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
            <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground">Effective Date: September 1, 2025</p>
          </div>

          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Narrata Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p className="text-sm text-muted-foreground mb-6">
                Narrata respects your privacy. This Privacy Policy explains how we collect, use, and protect your information.
              </p>

              <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
              <ul className="list-disc pl-6 mb-6">
                <li><strong>Personal Info:</strong> Name, email, login credentials</li>
                <li><strong>Content Data:</strong> Resume, job history, cover letters, saved text</li>
                <li><strong>Usage Data:</strong> Pages visited, features used, feedback provided</li>
                <li><strong>Third-Party Auth Data:</strong> If you log in with Google or LinkedIn</li>
              </ul>

              <h2 className="text-xl font-semibold mb-3">2. How We Use Your Data</h2>
              <ul className="list-disc pl-6 mb-6">
                <li>Generate cover letters and recommendations</li>
                <li>Improve product features and analytics</li>
                <li>Communicate with you (e.g., updates or support)</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h2 className="text-xl font-semibold mb-3">3. Sharing of Data</h2>
              <p className="mb-3">We do not sell your data. We only share data with:</p>
              <ul className="list-disc pl-6 mb-6">
                <li>Trusted service providers (e.g., hosting, email)</li>
                <li>Law enforcement if required by law</li>
              </ul>

              <h2 className="text-xl font-semibold mb-3">4. Data Retention</h2>
              <p className="mb-6">
                We retain your data while your account is active or as needed to provide the Service. You may delete your account at any time.
              </p>

              <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
              <p className="mb-3">You may:</p>
              <ul className="list-disc pl-6 mb-6">
                <li>Access or export your data</li>
                <li>Request correction or deletion</li>
                <li>Withdraw consent or delete your account</li>
              </ul>
              <p className="mb-6">
                Email <a href="mailto:privacy@narrata.co" className="text-accent hover:underline">privacy@narrata.co</a> with any request.
              </p>

              <h2 className="text-xl font-semibold mb-3">6. Security</h2>
              <p className="mb-6">
                We use modern encryption and security practices. No system is 100% secure, so please protect your credentials.
              </p>

              <h2 className="text-xl font-semibold mb-3">7. International Users</h2>
              <p className="mb-6">
                Your data may be stored and processed in the United States. By using Narrata, you consent to this transfer.
              </p>

              <h2 className="text-xl font-semibold mb-3">8. Changes to This Policy</h2>
              <p className="mb-6">
                We may update this Privacy Policy from time to time. We'll notify users of material changes.
              </p>

              <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
              <p className="mb-6">
                Questions? Email us at <a href="mailto:privacy@narrata.co" className="text-accent hover:underline">privacy@narrata.co</a>
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

export default PrivacyPolicy;
