import React from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { Check, X } from 'lucide-react';

interface ATSScoreTooltipProps {
  children: React.ReactNode;
  className?: string;
  atsScore?: number;
  isPostHIL?: boolean;
}

export function ATSScoreTooltip({ 
  children, 
  className,
  atsScore = 0,
  isPostHIL = false
}: ATSScoreTooltipProps) {
  const content = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {/* Content Quality */}
               <div className="space-y-2">
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Spelling and Grammar</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>No errors that confuse ATS</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Email Format</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Professional email address</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>LinkedIn Profile</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Profile mentioned or linked</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Complete Contact Info</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Name, email, phone included</p>
                   </div>
                 </div>
               </div>

               {/* ATS Essentials */}
               <div className="space-y-2">
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>File Format</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>PDF or Word format</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>File Size</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Under 2MB for processing</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Simple Layout</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Clean formatting</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Standard Fonts</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Arial, Calibri, Times New Roman</p>
                   </div>
                 </div>
               </div>

               {/* Skills & Keywords */}
               <div className="space-y-2">
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Hard Skills</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Technical skills mentioned</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Soft Skills</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Leadership, communication</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Keyword Density</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Appropriate keyword use</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Industry Terms</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Industry-specific terminology</p>
                   </div>
                 </div>
               </div>

               {/* Structure & Formatting */}
               <div className="space-y-2">
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Clear Headers</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Proper section headers</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>Consistent Formatting</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Consistent date formats</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-destructive/10">
                   <X className="h-3 w-3 text-destructive flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-muted-foreground">Chronological Order</span>
                     <p className="text-xs text-muted-foreground/70 mt-0.5">Reverse chronological order</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-success/10' : 'bg-destructive/10'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-success flex-shrink-0" /> : <X className="h-3 w-3 text-destructive flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-foreground' : 'text-muted-foreground'}`}>No Tables</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>Linear text format</p>
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
