import React from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { Check, X } from 'lucide-react';

interface CoverLetterRatingTooltipProps {
  children: React.ReactNode;
  className?: string;
  isPostHIL?: boolean;
}

export function CoverLetterRatingTooltip({ 
  children, 
  className,
  isPostHIL = false
}: CoverLetterRatingTooltipProps) {
  const content = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {/* Structure & Flow */}
               <div className="space-y-2">
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Compelling Opening</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Strong hook that captures attention</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Understanding of Business/Users</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Demonstrates knowledge of company</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Quantified Impact</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Specific metrics and achievements</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Action Verbs</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Strong, active language</p>
                   </div>
                 </div>
               </div>

               {/* Content Quality */}
               <div className="space-y-2">
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Concise Length</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>3-4 paragraphs, under 400 words</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Error-Free Writing</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>No spelling or grammar errors</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Personalized Content</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Tailored to specific role</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-success/10'}`}>
                   <Check className="h-3 w-3 text-success flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-foreground'}`}>Specific Examples</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground'}`}>Concrete examples from work history</p>
                   </div>
                 </div>
               </div>

               {/* Professional Standards */}
               <div className="space-y-2">
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-success/10'}`}>
                   <Check className="h-3 w-3 text-success flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-foreground'}`}>Professional Tone</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground'}`}>Appropriate formality level</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Company Research</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Shows understanding of culture</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-success/10'}`}>
                   <Check className="h-3 w-3 text-success flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-foreground'}`}>Role Understanding</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground'}`}>Clear grasp of responsibilities</p>
                   </div>
                 </div>
               </div>
             </div>
    </div>
  );

  return (
    <FullWidthTooltip
      content={content}
      className={className}
    >
      {children}
    </FullWidthTooltip>
  );
}
