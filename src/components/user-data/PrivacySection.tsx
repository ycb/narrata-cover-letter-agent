/**
 * Privacy Section Component
 * Displays privacy summary and contact information for preference changes
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Shield, Mail, ExternalLink, Trash2, AlertTriangle } from 'lucide-react';
import LogRocket from 'logrocket';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function PrivacySection() {
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleContactSupport = () => {
    LogRocket.track('Privacy Preferences Update Requested');
    const supportEmail = 'support@narrata.ai';
    const subject = encodeURIComponent('Privacy Preferences Update Request');
    const mailtoLink = `mailto:${supportEmail}?subject=${subject}`;
    
    // Create a temporary anchor element and click it to avoid redirect loops
    const link = document.createElement('a');
    link.href = mailtoLink;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    setIsDeleting(true);
    try {
      // ACCOUNT DELETION: Currently uses email-to-support flow for MVP.
      // This approach is intentional for MVP/beta because:
      // 1. Account deletion is irreversible and requires verification
      // 2. Compliance requirements (GDPR, CCPA) often require manual review
      // 3. Ensures proper cleanup of all user data across tables
      // 4. Allows support to verify identity and handle edge cases
      //
      // For production, consider implementing:
      // - Supabase Edge Function for account deletion
      // - Cascade delete via database triggers (most tables already have ON DELETE CASCADE)
      // - Delete auth.users record (cascades to profiles and related data)
      // - Clean up storage files, provider_settings, and other user data
      // - Add confirmation flow (email verification or 2FA)
      // - Log deletion for audit/compliance purposes
      LogRocket.track('Account Deletion Requested', { userId: user.id });
      
      const supportEmail = 'support@narrata.ai';
      const subject = encodeURIComponent('Account Deletion Request');
      const body = encodeURIComponent(
        `I would like to delete my account and all associated data.\n\nUser ID: ${user.id}\nEmail: ${user.email || 'N/A'}`
      );
      
      const mailtoLink = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
      
      // Create a temporary anchor element and click it to avoid redirect loops
      const link = document.createElement('a');
      link.href = mailtoLink;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Please check your email to complete account deletion');
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      toast.error('Failed to request account deletion. Please contact support directly.');
    } finally {
      setIsDeleting(false);
    }
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
              <p className="text-sm font-medium mb-1">Any questions?</p>
              <p className="text-xs text-muted-foreground">
                We'd be happy to assist you
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleContactSupport}
              className="ml-4"
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Account Management</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
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
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              Terms of Service
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardContent>

      {/* Account Deletion Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Your Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This action cannot be undone. This will permanently delete your account and remove all of your data from our servers.
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mt-3">
                <p className="text-sm font-medium text-destructive mb-1">What will be deleted:</p>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>Your profile and account information</li>
                  <li>All uploaded resumes and cover letters</li>
                  <li>Your work history and stories</li>
                  <li>Cover letter templates and saved sections</li>
                  <li>All AI provider settings</li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                To proceed, you'll be redirected to email our support team to confirm your request.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Processing...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

