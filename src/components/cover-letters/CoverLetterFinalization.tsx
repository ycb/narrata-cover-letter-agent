import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Download, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { jsPDF } from 'jspdf';
import type { CoverLetterDraftSection } from '@/types/coverLetters';
import { normalizeFinalContent } from '@/services/coverLetterParser';

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
    .map(section => normalizeFinalContent(section.content || ''))
    .filter(Boolean)
    .join('\n\n');

const computeWordCount = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

const urlPattern = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi;

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
  const isPreviewOnly = !onFinalizeConfirm;

  // Guard: Ensure sections is always an array
  const safeSections = Array.isArray(sections) ? sections : [];

  const sortedSections = useMemo(
    () => [...safeSections].sort((a, b) => a.order - b.order),
    [safeSections],
  );

  const finalLetter = useMemo(() => buildLetter(sortedSections), [sortedSections]);
  const wordCount = computeWordCount(finalLetter);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const pdf = new jsPDF({
        unit: 'pt',
        format: 'letter',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 72;
      const contentWidth = pageWidth - margin * 2;
      const fontSize = 12;
      const lineHeight = fontSize * 1.5;

      pdf.setFont('times', 'normal');
      pdf.setFontSize(fontSize);

      const wrapLine = (line: string) => {
        const words = line.trim().split(/\s+/).filter(Boolean);
        const wrappedLines: string[] = [];
        let currentLine = '';

        words.forEach(word => {
          const candidate = currentLine ? `${currentLine} ${word}` : word;
          if (!currentLine || pdf.getTextWidth(candidate) <= contentWidth) {
            currentLine = candidate;
            return;
          }
          wrappedLines.push(currentLine);
          currentLine = word;
        });

        if (currentLine) {
          wrappedLines.push(currentLine);
        }

        return wrappedLines;
      };

      const renderLineWithLinks = (line: string, x: number, y: number) => {
        let cursorX = x;
        let lastIndex = 0;

        for (const match of line.matchAll(urlPattern)) {
          const url = match[0] || '';
          const index = match.index ?? 0;
          if (index > lastIndex) {
            const text = line.slice(lastIndex, index);
            pdf.text(text, cursorX, y);
            cursorX += pdf.getTextWidth(text);
          }
          const href = url.startsWith('http') ? url : `https://${url}`;
          pdf.textWithLink(url, cursorX, y, { url: href });
          cursorX += pdf.getTextWidth(url);
          lastIndex = index + url.length;
        }

        if (lastIndex < line.length) {
          const text = line.slice(lastIndex);
          pdf.text(text, cursorX, y);
        }
      };

      const paragraphs = finalLetter.split(/\n{2,}/);
      let cursorY = margin;

      const ensureSpace = (height: number) => {
        if (cursorY + height > pageHeight - margin) {
          pdf.addPage();
          cursorY = margin;
        }
      };

      paragraphs.forEach((paragraph, paragraphIndex) => {
        const lines = paragraph.split('\n');
        lines.forEach(line => {
          if (!line.trim()) {
            ensureSpace(lineHeight);
            cursorY += lineHeight;
            return;
          }

          const wrappedLines = wrapLine(line);
          wrappedLines.forEach(wrappedLine => {
            ensureSpace(lineHeight);
            renderLineWithLinks(wrappedLine, margin, cursorY);
            cursorY += lineHeight;
          });

        });

        if (paragraphIndex < paragraphs.length - 1) {
          ensureSpace(lineHeight);
          cursorY += lineHeight;
        }
      });

      const filename = job?.company
        ? `cover-letter-${job.company.toLowerCase().replace(/\s+/g, '-')}.pdf`
        : 'cover-letter.pdf';
      pdf.save(filename);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleShare = async () => {
    if (!finalLetter.trim()) return;
    const title = job?.company
      ? `Cover Letter - ${job.company}${job.role ? ` - ${job.role}` : ''}`
      : 'Cover Letter';

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: finalLetter,
        });
        return;
      } catch (error) {
        console.error('Error sharing cover letter:', error);
      }
    }

    await handleCopy();
  };

  // Build subtitle: "Company • Role"
  const subtitle = [job?.company, job?.role].filter(Boolean).join(' • ');

  return (
    <>
    <Dialog open={isOpen} onOpenChange={open => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-6xl h-[85vh] overflow-hidden flex flex-col dialog-top-anchored">
        {/* 1. Header with CTAs */}
        <DialogHeader className="pb-4 border-b border-border/50 pr-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {isPreviewOnly ? 'Cover letter preview' : 'Review & Finalize your cover letter'}
              </DialogTitle>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            {/* Primary + Secondary CTAs - account for X button with pr-8 above */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={onBackToDraft}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isPreviewOnly ? 'Edit' : 'Back to Edit'}
              </button>
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
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Error message if any */}
          {errorMessage && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
              {errorMessage}
            </div>
          )}

          {/* The final rendered cover letter */}
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

        {/* 3. Utility buttons (centered) - Fixed at bottom */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-border/50">
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
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
            Download as Text
          </Button>
          <Button 
            onClick={handleDownloadPdf} 
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isDownloadingPdf}
          >
            <Download className="h-4 w-4" />
            {isDownloadingPdf ? 'Preparing PDF…' : 'Download as PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
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
