import React from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { Check, X } from 'lucide-react';

interface CoverLetterRatingTooltipProps {
  children: React.ReactNode;
  className?: string;
}

export function CoverLetterRatingTooltip({ 
  children, 
  className 
}: CoverLetterRatingTooltipProps) {
  const content = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {/* Structure & Flow */}
               <div className="space-y-2">
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Compelling Opening</span>
                     <p className="text-xs text-gray-500 mt-0.5">Strong hook that captures attention</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-red-50">
                   <X className="h-3 w-3 text-red-500 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-500">Understanding of Business/Users</span>
                     <p className="text-xs text-gray-400 mt-0.5">Demonstrates knowledge of company</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Quantified Impact</span>
                     <p className="text-xs text-gray-500 mt-0.5">Specific metrics and achievements</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-red-50">
                   <X className="h-3 w-3 text-red-500 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-500">Action Verbs</span>
                     <p className="text-xs text-gray-400 mt-0.5">Strong, active language</p>
                   </div>
                 </div>
               </div>

               {/* Content Quality */}
               <div className="space-y-2">
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Concise Length</span>
                     <p className="text-xs text-gray-500 mt-0.5">3-4 paragraphs, under 400 words</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Error-Free Writing</span>
                     <p className="text-xs text-gray-500 mt-0.5">No spelling or grammar errors</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-red-50">
                   <X className="h-3 w-3 text-red-500 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-500">Personalized Content</span>
                     <p className="text-xs text-gray-400 mt-0.5">Tailored to specific role</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Specific Examples</span>
                     <p className="text-xs text-gray-500 mt-0.5">Concrete examples from work history</p>
                   </div>
                 </div>
               </div>

               {/* Professional Standards */}
               <div className="space-y-2">
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Professional Tone</span>
                     <p className="text-xs text-gray-500 mt-0.5">Appropriate formality level</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-red-50">
                   <X className="h-3 w-3 text-red-500 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-500">Company Research</span>
                     <p className="text-xs text-gray-400 mt-0.5">Shows understanding of culture</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Role Understanding</span>
                     <p className="text-xs text-gray-500 mt-0.5">Clear grasp of responsibilities</p>
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
