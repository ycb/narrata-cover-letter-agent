import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">⚖️ Narrata – Terms of Service</CardTitle>
            <div className="text-sm text-muted-foreground mt-2">
              <p><strong>Effective Date:</strong> 11/13/2025</p>
              <p><strong>Last Updated:</strong> 11/13/2025</p>
            </div>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              Welcome to Narrata ("Narrata," "we," "our," or "the Service"). These Terms form a legally binding agreement between you and Narrata. If you do not agree, you may not use the Service.
            </p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Description of the Service</h2>
            <p>
              Narrata provides software tools to help users analyze professional materials, strengthen career narratives, and identify relevant job opportunities. Features may include:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Résumé/CV analysis</li>
              <li>Cover-letter and narrative generation</li>
              <li>Job-matching recommendations</li>
              <li>AI-powered insights</li>
              <li>Data extraction and structuring from user-directed external sources</li>
            </ul>
            <p className="mt-4">
              Narrata is not an employer, recruiter, or employment agency. We do not guarantee hiring outcomes.
            </p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Eligibility & Accounts</h2>
            <p>You must be at least 18 years old to use Narrata.</p>
            <p>You are responsible for maintaining the confidentiality of your login credentials.</p>
            <p>We may suspend or terminate accounts for violating these Terms.</p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. User Content</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">3.1 Definition</h3>
            <p>
              "User Content" includes résumés, text, documents, URLs, LinkedIn profile links, job histories, job descriptions, or any materials submitted by you.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">3.2 License to Narrata</h3>
            <p>You grant Narrata a non-exclusive, worldwide, royalty-free license to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>host, store, and display your User Content;</li>
              <li>process and analyze it to deliver the Service;</li>
              <li>generate "Derived Data" (structured fields, parsed content, scores, tags, recommendations);</li>
              <li>temporarily transmit your data to subprocessors to perform requested functions.</li>
            </ul>
            <p className="mt-4">You retain ownership of your User Content.</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">3.3 Restrictions on Our Use</h3>
            <p>
              Narrata does not sell User Content and does not share personal data with employers or third parties unless you explicitly direct us to.
            </p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Derived Data</h2>
            <p>
              Narrata may create or store "Derived Data," including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>parsed experience fields</li>
              <li>inferred skills</li>
              <li>summaries</li>
              <li>match scores</li>
              <li>structured metadata</li>
              <li>analytics used to deliver functionality to you</li>
            </ul>
            <p className="mt-4">
              Derived Data is part of providing the Service.
            </p>
            <p>
              If you delete your account, Derived Data tied to you is deleted or anonymized, except where retention is legally required or necessary for security/logs.
            </p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">5. External Data Sources (Important)</h2>
            <p>
              Users may provide URLs or instructions that direct Narrata to retrieve publicly available professional information from external sources.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">5.1 User Responsibility</h3>
            <p>By providing such URLs or instructions, you represent and warrant:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>you have the right to access that data, and</li>
              <li>your use of the Service to retrieve it complies with any applicable third-party terms and laws.</li>
            </ul>
            <p className="mt-4">
              Narrata is not responsible for violations of third-party terms arising from URLs or instructions you provide.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">5.2 Automated Retrieval Tools</h3>
            <p>
              At your direction, Narrata may use automated tools to retrieve publicly accessible information from the links you provide.
            </p>
            <p>We do not bypass authentication, paywalls, captchas, or other technical access controls.</p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Use of AI Providers</h2>
            <p>
              Narrata uses third-party AI vendors (such as OpenAI, Anthropic, or similar) to process inputs and generate outputs.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>We send only data required to perform the requested function.</li>
              <li>We enable no-training or no-retention settings whenever available.</li>
              <li>Vendors process data under their own privacy policies and contractual terms.</li>
              <li>Narrata does not intentionally permit vendors to use user data for their own model training.</li>
            </ul>
            <p className="mt-4">
              Users may review vendor policies to understand how data is handled by those providers.
            </p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>upload unlawful, harmful, or infringing content;</li>
              <li>misuse the Service for discriminatory hiring;</li>
              <li>attempt to reverse engineer Narrata;</li>
              <li>submit URLs that require authentication or violate third-party access terms;</li>
              <li>use the platform for scraping, spam, or harmful automated behavior.</li>
            </ul>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Disclaimers</h2>
            <p>Narrata is provided "AS IS" without warranties of any kind.</p>
            <p>We do not guarantee:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>job placement,</li>
              <li>accuracy of AI-generated outputs,</li>
              <li>uninterrupted operation,</li>
              <li>employer responses or hiring outcomes.</li>
            </ul>
            <p className="mt-4">You use all recommendations at your own discretion.</p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Narrata is not liable for indirect, incidental, or consequential damages.</li>
              <li>Narrata's total liability for any claim is limited to the greater of (a) amounts paid in the prior 12 months or (b) $100.</li>
            </ul>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Intellectual Property</h2>
            <p>Narrata owns all rights in:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>software,</li>
              <li>AI workflows,</li>
              <li>algorithms,</li>
              <li>design,</li>
              <li>analytics,</li>
              <li>Derived Data (once anonymized),</li>
              <li>and all content not provided by users.</li>
            </ul>
            <p className="mt-4">You may not copy or replicate the Service.</p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Termination</h2>
            <p>You may stop using Narrata at any time.</p>
            <p>We may suspend or terminate access for violating the Terms.</p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">12. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of California.</p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">13. Changes</h2>
            <p>We may update these Terms; material changes will be communicated.</p>

            <hr className="my-6" />

            <h2 className="text-2xl font-semibold mt-8 mb-4">Contact</h2>
            <p><strong>support@narrata.co</strong></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

