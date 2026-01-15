import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFinalCheck } from '@/hooks/useFinalCheck';
import { cn } from '@/lib/utils';

interface FinalCheckPanelProps {
  draftId: string;
  onClose: () => void;
  className?: string;
}

export function FinalCheckPanel({ draftId, onClose, className }: FinalCheckPanelProps) {
  const { runFinalCheck, data, isLoading, error } = useFinalCheck();
  const hasRequestedRef = useRef(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    hasRequestedRef.current = false;
  }, [draftId]);

  useEffect(() => {
    if (!draftId) return;
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    runFinalCheck({ draftId }).catch(() => null);
  }, [draftId, runFinalCheck]);

  const suggestions = useMemo(() => (data?.suggestions ?? '').trim(), [data?.suggestions]);

  const parsedSuggestions = useMemo(() => {
    if (!suggestions) return [];
    const normalized = suggestions.replace(/\r\n/g, '\n');
    if (normalized.includes('No changes recommended')) return [];
    const parts = normalized
      .split(/\n-{12}\n/g)
      .map((part) => part.trim())
      .filter(Boolean);

    const items: Array<{
      title: string;
      issue: string;
      suggestion: string;
      replacement: string;
    }> = [];

    for (const part of parts) {
      const lines = part.split('\n').map((line) => line.trimEnd());
      const title = lines[0] ?? '';
      const issueIndex = lines.findIndex((line) => line.startsWith('Issue:'));
      const suggestionIndex = lines.findIndex((line) => line.startsWith('Suggestion:'));
      const fenceIndexes = lines
        .map((line, index) => (line.startsWith('=') ? index : -1))
        .filter((index) => index >= 0);

      const issue =
        issueIndex >= 0
          ? lines.slice(issueIndex + 1, suggestionIndex >= 0 ? suggestionIndex : lines.length).join('\n').trim()
          : '';
      const suggestionText =
        suggestionIndex >= 0
          ? lines.slice(suggestionIndex, fenceIndexes[0] ?? lines.length).join('\n').trim()
          : '';
      const replacement =
        fenceIndexes.length >= 2
          ? lines.slice(fenceIndexes[0] + 1, fenceIndexes[1]).join('\n').trim()
          : '';

      if (title || issue || suggestionText || replacement) {
        items.push({
          title,
          issue,
          suggestion: suggestionText,
          replacement,
        });
      }
    }

    return items;
  }, [suggestions]);

  const handleRetry = async () => {
    if (!draftId) return;
    await runFinalCheck({ draftId }).catch(() => null);
  };

  const copyText = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopySuggestion = async (index: number, text: string) => {
    if (!text) return;
    const ok = await copyText(text);
    if (!ok) return;
    setCopiedIndex(index);
    window.setTimeout(() => {
      setCopiedIndex((current) => (current === index ? null : current));
    }, 1500);
  };

  return (
    <div
      className={cn(
        'w-full h-full bg-card border flex flex-col md:w-96 animate-in slide-in-from-left-4',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span>Final Check</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close final check">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
          {isLoading ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Reviewing to identify high-impact improvements...</span>
            </div>
          ) : error ? (
            <div className="mt-3 text-xs text-destructive">
              {error.message || 'Final check unavailable. Please try again.'}
            </div>
          ) : suggestions ? (
            <div className="mt-3 space-y-3 text-xs text-foreground/90">
              {parsedSuggestions.length > 0 ? (
                parsedSuggestions.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rounded-lg border border-border/50 bg-background/60 p-2">
                    {item.title && <div className="font-medium text-foreground">{item.title}</div>}
                    {item.issue && (
                      <div className="mt-2 text-foreground/80">
                        <div className="font-medium text-foreground">Issue:</div>
                        <div className="mt-1 whitespace-pre-wrap">{item.issue}</div>
                      </div>
                    )}
                    {(item.suggestion || item.replacement) && (
                      <div className="mt-2 text-foreground/80">
                        <div className="font-medium text-foreground">Suggestion:</div>
                        {item.suggestion && (
                          <div className="mt-1 whitespace-pre-wrap">
                            {item.suggestion.replace(/^Suggestion:\s*/i, '')}
                          </div>
                        )}
                        {item.replacement && (
                          <div className="mt-2 rounded border border-dashed border-border/70 bg-muted/10 px-2 py-1 whitespace-pre-wrap">
                            {item.replacement}
                          </div>
                        )}
                      </div>
                    )}
                    {(item.replacement || item.suggestion) && (
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            handleCopySuggestion(
                              index,
                              item.replacement || item.suggestion.replace(/^Suggestion:\s*/i, ''),
                            )
                          }
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          {copiedIndex === index ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="whitespace-pre-wrap">{suggestions}</div>
              )}
            </div>
          ) : (
            <div className="mt-3 text-xs text-muted-foreground">
              No suggestions returned.
            </div>
          )}
        </div>
      </div>

      <div className="border-t px-3 py-2 flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">Suggestions are optional. Apply manually.</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRetry} disabled={isLoading}>
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
