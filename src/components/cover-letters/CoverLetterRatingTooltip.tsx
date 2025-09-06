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
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-green-50'}`}>
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-700'}`}>Compelling Opening</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-500'}`}>Strong hook that captures attention</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-red-50'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-green-600 flex-shrink-0" /> : <X className="h-3 w-3 text-red-500 flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-500'}`}>Understanding of Business/Users</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-400'}`}>Demonstrates knowledge of company</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-green-50'}`}>
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-700'}`}>Quantified Impact</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-500'}`}>Specific metrics and achievements</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-red-50'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-green-600 flex-shrink-0" /> : <X className="h-3 w-3 text-red-500 flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-500'}`}>Action Verbs</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-400'}`}>Strong, active language</p>
                   </div>
                 </div>
               </div>

               {/* Content Quality */}
               <div className="space-y-2">
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-green-50'}`}>
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-700'}`}>Concise Length</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-500'}`}>3-4 paragraphs, under 400 words</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-green-50'}`}>
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-700'}`}>Error-Free Writing</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-500'}`}>No spelling or grammar errors</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-red-50'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-green-600 flex-shrink-0" /> : <X className="h-3 w-3 text-red-500 flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-500'}`}>Personalized Content</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-400'}`}>Tailored to specific role</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-green-50'}`}>
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-700'}`}>Specific Examples</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-500'}`}>Concrete examples from work history</p>
                   </div>
                 </div>
               </div>

               {/* Professional Standards */}
               <div className="space-y-2">
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-green-50'}`}>
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-700'}`}>Professional Tone</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-500'}`}>Appropriate formality level</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-red-50'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-green-600 flex-shrink-0" /> : <X className="h-3 w-3 text-red-500 flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-500'}`}>Company Research</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-400'}`}>Shows understanding of culture</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-green-50'}`}>
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-700'}`}>Role Understanding</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-500'}`}>Clear grasp of responsibilities</p>
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
