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
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Spelling and Grammar</span>
                     <p className="text-xs text-gray-500 mt-0.5">No errors that confuse ATS</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Email Format</span>
                     <p className="text-xs text-gray-500 mt-0.5">Professional email address</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-red-50'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-green-600 flex-shrink-0" /> : <X className="h-3 w-3 text-red-500 flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-500'}`}>LinkedIn Profile</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-400'}`}>Profile mentioned or linked</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Complete Contact Info</span>
                     <p className="text-xs text-gray-500 mt-0.5">Name, email, phone included</p>
                   </div>
                 </div>
               </div>

               {/* ATS Essentials */}
               <div className="space-y-2">
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">File Format</span>
                     <p className="text-xs text-gray-500 mt-0.5">PDF or Word format</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">File Size</span>
                     <p className="text-xs text-gray-500 mt-0.5">Under 2MB for processing</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-red-50'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-green-600 flex-shrink-0" /> : <X className="h-3 w-3 text-red-500 flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-500'}`}>Simple Layout</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-400'}`}>Clean formatting</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Standard Fonts</span>
                     <p className="text-xs text-gray-500 mt-0.5">Arial, Calibri, Times New Roman</p>
                   </div>
                 </div>
               </div>

               {/* Skills & Keywords */}
               <div className="space-y-2">
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Hard Skills</span>
                     <p className="text-xs text-gray-500 mt-0.5">Technical skills mentioned</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-red-50'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-green-600 flex-shrink-0" /> : <X className="h-3 w-3 text-red-500 flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-500'}`}>Soft Skills</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-400'}`}>Leadership, communication</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Keyword Density</span>
                     <p className="text-xs text-gray-500 mt-0.5">Appropriate keyword use</p>
                   </div>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded ${isPostHIL ? 'bg-green-50' : 'bg-red-50'}`}>
                   {isPostHIL ? <Check className="h-3 w-3 text-green-600 flex-shrink-0" /> : <X className="h-3 w-3 text-red-500 flex-shrink-0" />}
                   <div className="flex-1 min-w-0">
                     <span className={`text-sm ${isPostHIL ? 'text-gray-700' : 'text-gray-500'}`}>Industry Terms</span>
                     <p className={`text-xs mt-0.5 ${isPostHIL ? 'text-gray-500' : 'text-gray-400'}`}>Industry-specific terminology</p>
                   </div>
                 </div>
               </div>

               {/* Structure & Formatting */}
               <div className="space-y-2">
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Clear Headers</span>
                     <p className="text-xs text-gray-500 mt-0.5">Proper section headers</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">Consistent Formatting</span>
                     <p className="text-xs text-gray-500 mt-0.5">Consistent date formats</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-red-50">
                   <X className="h-3 w-3 text-red-500 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-500">Chronological Order</span>
                     <p className="text-xs text-gray-400 mt-0.5">Reverse chronological order</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                   <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-sm text-gray-700">No Tables</span>
                     <p className="text-xs text-gray-500 mt-0.5">Linear text format</p>
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
