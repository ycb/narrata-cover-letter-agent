import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">🔐 Narrata – Privacy Policy</CardTitle>
            <div className="text-sm text-muted-foreground mt-2">
              <p><strong>Effective Date:</strong> 11/13/2025</p>
              <p><strong>Last Updated:</strong> 11/13/2025</p>
            </div>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              Narrata ("we," "our," "us") is committed to privacy and transparency. This Policy explains what information we collect, how we use it, and your rights.
            </p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.1 Information You Provide</h3>
            <p>Including but not limited to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>résumés, CVs, documents, and text input</li>
              <li>LinkedIn or other profile URLs you choose to provide</li>
              <li>job preferences</li>
              <li>job descriptions (for employers)</li>
              <li>communication with support</li>
              <li>account details (name, email)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.2 Automatically Collected Information</h3>
            <p>We collect:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>device and browser information</li>
              <li>usage logs</li>
              <li>timestamps</li>
              <li>interactions</li>
              <li>diagnostics and error data</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">1.3 External Data Retrieved at Your Direction</h3>
            <p>
              If you provide URLs to public professional pages, we may retrieve publicly available information from those pages solely to provide requested features.
            </p>
            <p>We do not access content behind logins, paywalls, or technical barriers.</p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
            <p>We use information to:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Provide résumé analysis, career insights, and job-matching tools</li>
              <li>Generate Derived Data (parsed fields, scores, suggestions)</li>
              <li>Improve accuracy, structure, and user experience</li>
              <li>Communicate with you</li>
              <li>Protect the platform and enforce Terms</li>
              <li>Process data retrieved from external sources only as you direct</li>
            </ol>
            <p className="mt-4"><strong>We do not sell personal data.</strong></p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. AI Providers & Data Processing</h2>
            <p>Narrata uses third-party AI services to perform text analysis and generate insights.</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>We send only the data necessary for inference.</li>
              <li>We configure vendors to disable training/retention whenever possible.</li>
              <li>Vendors process data under their own terms and privacy policies.</li>
              <li>Narrata does not intentionally allow AI vendors to use your data for model training.</li>
            </ul>
            <p className="mt-4">Links to vendor policies are available within the app or by request.</p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Sharing of Data</h2>
            <p>We may share information only with:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>vendors and subprocessors (hosting, infrastructure, AI inference)</li>
              <li>analytics and monitoring services</li>
              <li>employers only when you explicitly opt in</li>
              <li>legal authorities if required</li>
            </ul>
            <p className="mt-4"><strong>We do not sell or rent personal data.</strong></p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Retention & Deletion</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Personal data is stored only as long as needed to provide the Service.</li>
              <li>Upon account deletion, personal data and Derived Data associated with you are deleted or anonymized.</li>
              <li>Aggregated data that cannot identify individuals may be retained for analytics.</li>
              <li>Backups are purged on their standard cycle.</li>
            </ul>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Rights</h2>
            <p>Depending on your jurisdiction, you may:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>access your data</li>
              <li>request deletion</li>
              <li>correct inaccuracies</li>
              <li>download/export your data</li>
              <li>object to certain processing</li>
              <li>opt out of communications</li>
            </ul>
            <p className="mt-4"><strong>Contact:</strong> support@narrata.com</p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Security</h2>
            <p>We use industry-standard security protections, including encryption, access controls, and monitoring.</p>
            <p>No system is perfectly secure.</p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Children's Privacy</h2>
            <p>Narrata is not intended for individuals under 18.</p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Changes to This Policy</h2>
            <p>We may update this Policy and will notify users of material changes.</p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Contact</h2>
            <p><strong>support@narrata.com</strong></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

