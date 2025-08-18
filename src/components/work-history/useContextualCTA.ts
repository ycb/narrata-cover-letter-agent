import { useMemo } from 'react';
import type { WorkHistoryCompany, WorkHistoryRole } from '@/types/workHistory';

interface UseContextualCTAProps {
  company?: WorkHistoryCompany | null;
  role?: WorkHistoryRole | null;
  hasLinkedInConnection?: boolean;
  hasResumeUpload?: boolean;
}

export const useContextualCTA = ({
  company,
  role,
  hasLinkedInConnection = false,
  hasResumeUpload = false
}: UseContextualCTAProps) => {
  const ctaConfig = useMemo(() => {
    // Company-level CTAs
    const companyCTA = {
      text: company?.roles.length === 0 ? 'Add First Role' : 'Add Role',
      icon: 'Briefcase' as const,
      priority: 'high' as const,
      disabled: false
    };

    // Role-level CTAs
    const roleCTA = {
      text: role?.blurbs.length === 0 ? 'Add First Story' : 'Add Story',
      icon: 'MessageSquare' as const,
      priority: 'medium' as const,
      disabled: false
    };

    // Connection CTAs
    const linkedInCTA = {
      text: hasLinkedInConnection ? 'Refresh LinkedIn' : 'Connect LinkedIn',
      icon: 'ExternalLink' as const,
      priority: hasLinkedInConnection ? 'low' : 'high' as const,
      disabled: false
    };

    const resumeCTA = {
      text: hasResumeUpload ? 'Update Resume' : 'Upload Resume',
      icon: 'Upload' as const,
      priority: hasResumeUpload ? 'low' : 'high' as const,
      disabled: false
    };

    // Completion status
    const getCompletionStatus = () => {
      if (!company) return { completed: 0, total: 4, percentage: 0 };
      
      const steps = [
        true, // Company always exists
        company.roles.length > 0,
        company.roles.some(r => r.blurbs.length > 0),
        hasLinkedInConnection || hasResumeUpload
      ];
      
      const completed = steps.filter(Boolean).length;
      return { completed, total: 4, percentage: (completed / 4) * 100 };
    };

    // Next action suggestion
    const getNextAction = () => {
      if (!company) return 'Add Company';
      if (company.roles.length === 0) return 'Add your first role at this company';
      if (!company.roles.some(r => r.blurbs.length > 0)) return 'Add stories to your roles';
      if (!hasLinkedInConnection && !hasResumeUpload) return 'Connect LinkedIn or upload resume';
      return 'All set! Your profile is complete';
    };

    return {
      company: companyCTA,
      role: roleCTA,
      linkedIn: linkedInCTA,
      resume: resumeCTA,
      completion: getCompletionStatus(),
      nextAction: getNextAction()
    };
  }, [company, role, hasLinkedInConnection, hasResumeUpload]);

  return ctaConfig;
};
