/**
 * Privacy Section Component
 * Displays privacy summary and contact information for preference changes
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Mail, ExternalLink } from 'lucide-react';
import LogRocket from 'logrocket';

export function PrivacySection() {
  const handleContactSupport = () => {
    LogRocket.track('Privacy Preferences Update Requested');
    // TODO: Replace with actual support email or contact form
    const supportEmail = 'support@narrata.ai';
    window.location.href = `mailto:${supportEmail}?subject=Privacy Preferences Update Request`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Privacy & Data Usage</CardTitle>
            <CardDescription>How we use your data</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-2">
          <p>
            Narrata uses your personal data (resume, cover letters, work history) to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
            <li>Match you with relevant job opportunities</li>
            <li>Analyze your profile to suggest improvements</li>
            <li>Generate personalized cover letter content</li>
            <li>Reach out with relevant job offers and opportunities</li>
          </ul>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Need to update your preferences?</p>
              <p className="text-xs text-muted-foreground">
                Contact our support team to adjust your privacy settings
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleContactSupport}
              className="ml-4"
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex flex-wrap gap-4 text-xs">
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              Privacy Policy
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="/data-handling-faq"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              Data Handling FAQ
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="/account-deletion"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              Account Deletion
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

