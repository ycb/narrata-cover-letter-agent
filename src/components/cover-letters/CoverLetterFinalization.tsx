import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Download, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CoverLetterDraftSection } from '@/types/coverLetters';

interface CoverLetterFinalizationProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToDraft: () => void;
  sections: CoverLetterDraftSection[];
  job?: {
    company?: string | null;
    role?: string | null;
  };
  onFinalizeConfirm?: () => void;
  isFinalizing?: boolean;
  errorMessage?: string | null;
  // Legacy props (kept for compatibility, not used in simplified UI)
  metrics?: unknown;
  differentiators?: unknown;
  analytics?: unknown;
  draftId?: string;
  draftUpdatedAt?: string;
  isPostHIL?: boolean;
}

const buildLetter = (sections: CoverLetterDraftSection[]): string =>
  sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(section => section.content?.trim())
    .filter(Boolean)
    .join('\n\n');

const computeWordCount = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

export function CoverLetterFinalization({
  isOpen,
  onClose,
  onBackToDraft,
  sections,
  job,
  onFinalizeConfirm,
  isFinalizing = false,
  errorMessage,
}: CoverLetterFinalizationProps) {
  const [copied, setCopied] = useState(false);

  // Guard: Ensure sections is always an array
  const safeSections = Array.isArray(sections) ? sections : [];

  const sortedSections = useMemo(
    () => [...safeSections].sort((a, b) => a.order - b.order),
    [safeSections],
  );

  const finalLetter = useMemo(() => buildLetter(sortedSections), [sortedSections]);
  const wordCount = computeWordCount(finalLetter);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy cover letter:', error);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([finalLetter], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    const filename = job?.company 
      ? `cover-letter-${job.company.toLowerCase().replace(/\s+/g, '-')}.txt`
      : 'cover-letter.txt';
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Build subtitle: "Company • Role"
  const subtitle = [job?.company, job?.role].filter(Boolean).join(' • ');

  return (
    <Dialog open={isOpen} onOpenChange={open => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dialog-top-anchored">
        {/* 1. Header */}
        <DialogHeader className="pb-4 border-b border-border/50">
          <DialogTitle className="text-xl font-semibold">
            Review & Finalize your cover letter
          </DialogTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </DialogHeader>

        {/* Error message if any */}
        {errorMessage && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {errorMessage}
          </div>
        )}

        {/* 2. The final rendered cover letter */}
        <div className="py-4">
          <div className="bg-white border border-border/50 rounded-lg p-8 shadow-sm">
            <div className="font-serif text-[15px] leading-relaxed whitespace-pre-line text-foreground">
              {finalLetter}
            </div>
          </div>
          
          {/* Word count */}
          <div className="mt-3 text-right">
            <span className="text-xs text-muted-foreground">
              {wordCount} words
            </span>
          </div>
        </div>

        {/* 3. Final action buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          {/* Left: Copy, Download, Share */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleCopy} 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button 
              onClick={handleDownload} 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2"
              onClick={() => {
                // Future: implement share functionality
                handleCopy();
              }}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>

          {/* Right: Finalize & Save (CTA) */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToDraft}
            >
              Back to Edit
            </Button>
            {onFinalizeConfirm && (
              <Button
                onClick={onFinalizeConfirm}
                size="sm"
                disabled={isFinalizing}
                className="min-w-[120px]"
              >
                {isFinalizing ? (
                  <>
                    <LoaderIcon className="h-4 w-4 animate-spin mr-2" />
                    Saving…
                  </>
                ) : (
                  'Finalize & Save'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoaderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
