import { cn } from '@/lib/utils';

interface CoverLetterSkeletonProps {
  company: string;
  role: string;
  userName: string;
  userEmail: string;
  className?: string;
}

/**
 * Skeleton component shown during cover letter generation.
 * Displays real job details (company, role, user info) with animated placeholders for content.
 * Provides immediate visual feedback while draft is being generated.
 */
export const CoverLetterSkeleton = ({
  company,
  role,
  userName,
  userEmail,
  className,
}: CoverLetterSkeletonProps) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with real user data */}
      <div className="text-right space-y-1">
        <p className="font-medium text-foreground">{userName}</p>
        <p className="text-sm text-muted-foreground">{userEmail}</p>
        <p className="text-sm text-muted-foreground mt-4">
          {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Job details with real data */}
      <div className="space-y-1">
        <p className="font-medium text-foreground">{company}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
      </div>

      <div className="text-sm text-muted-foreground">Dear Hiring Manager,</div>

      {/* Skeleton content blocks - Opening paragraph */}
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-[95%]"></div>
        <div className="h-4 bg-muted rounded w-[88%]"></div>
      </div>

      {/* Body paragraph 1 */}
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-[92%]"></div>
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-[85%]"></div>
      </div>

      {/* Body paragraph 2 */}
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-[96%]"></div>
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-[90%]"></div>
        <div className="h-4 bg-muted rounded w-[94%]"></div>
      </div>

      {/* Body paragraph 3 */}
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-[87%]"></div>
        <div className="h-4 bg-muted rounded w-[93%]"></div>
      </div>

      {/* Closing paragraph */}
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-[91%]"></div>
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-[80%]"></div>
      </div>

      {/* Signature */}
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-muted rounded w-32"></div>
        <div className="h-4 bg-muted rounded w-40"></div>
      </div>
    </div>
  );
};

