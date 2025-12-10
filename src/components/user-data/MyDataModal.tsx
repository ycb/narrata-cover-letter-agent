/**
 * My Data Modal
 * Main component for managing user's data, AI provider settings, and privacy preferences
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ProviderCard } from './ProviderCard';
import { PersonalDataCard } from './PersonalDataCard';
import { PrivacySection } from './PrivacySection';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect } from 'react';
import LogRocket from 'logrocket';
import { isLinkedInScrapingEnabled } from '@/lib/flags';

interface MyDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MyDataModal({ isOpen, onClose }: MyDataModalProps) {
  useEffect(() => {
    if (isOpen) {
      LogRocket.track('My Data Modal Opened');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>My Data</DialogTitle>
          <DialogDescription>
            Manage your AI provider settings, personal data assets, and privacy preferences
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 overflow-y-auto">
          <div className="space-y-6 pb-4 pr-4">
            {/* AI Provider Section */}
            <ProviderCard />

            <Separator />

            {/* Personal Data Assets */}
            <div className="space-y-4">
              <PersonalDataCard
                sourceType="resume"
                title="Resume"
                description="Your uploaded resume files"
                dependencyMessage="A resume is required to use Narrata. Deleting your only resume will return you to onboarding."
              />

              <PersonalDataCard
                sourceType="cover_letter"
                title="Cover Letters"
                description="Your uploaded cover letter files"
                dependencyMessage="A cover letter is required to use Narrata. Deleting your only cover letter will return you to onboarding."
              />

              {/* LinkedIn section - HIDDEN when feature flag is OFF */}
              {isLinkedInScrapingEnabled() && (
                <PersonalDataCard
                  sourceType="linkedin"
                  title="LinkedIn"
                  description="Your LinkedIn profile data"
                  dependencyMessage="LinkedIn data is required to use Narrata. Deleting your LinkedIn data will return you to onboarding."
                  isLinkedIn={true}
                />
              )}
            </div>

            <Separator />

            {/* Privacy Section */}
            <PrivacySection />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
