import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, CheckCircle, RefreshCw, Sparkles } from 'lucide-react';
import { clearDraft, loadDraft, saveDraft } from '@/lib/localDraft';

export interface TagSuggestion {
  id: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
  category?: 'industry' | 'business_model' | 'skill' | 'competency' | 'other';
}

interface TagSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  content?: string;
  contentType?: 'company' | 'role' | 'saved_section' | 'story';
  entityId?: string;
  existingTags?: string[];
  suggestedTags?: TagSuggestion[];
  otherTags?: TagSuggestion[];
  onApplyTags?: (tags: string[]) => void;
  isSearching?: boolean;
  searchError?: string | null;
  onRetry?: () => void;
}

export function TagSuggestionModal({
  isOpen,
  onClose,
  content,
  contentType,
  entityId,
  existingTags = [],
  suggestedTags = [],
  otherTags = [],
  onApplyTags,
  isSearching = false,
  searchError = null,
  onRetry,
}: TagSuggestionModalProps) {
  const { toast } = useToast();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [restoredDraft, setRestoredDraft] = useState(false);

  const draftKey = useMemo(() => {
    const type = contentType ?? 'unknown';
    const id = entityId ?? 'unknown';
    return `draft:tag-suggestions:${type}:${id}`;
  }, [contentType, entityId]);

  const normalizeTag = (tag: string) => (tag || '').trim().toLowerCase();

  useEffect(() => {
    if (isOpen) return;
    setSelectedTags([]);
    setRestoredDraft(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const draft = loadDraft<{ selectedTags?: string[] }>(draftKey);
    if (!draft?.data) return;
    if (selectedTags.length > 0) return;

    if (Array.isArray(draft.data.selectedTags) && draft.data.selectedTags.length) {
      setSelectedTags(draft.data.selectedTags);
      setRestoredDraft(true);
      toast({ title: 'Restored draft', description: 'Recovered your selected tags.' });
    }
  }, [draftKey, isOpen, selectedTags.length, toast]);

  useEffect(() => {
    if (!isOpen) return;
    if (restoredDraft) return;
    if (selectedTags.length > 0) return;
    if (!suggestedTags.length) return;

    const existing = new Set((existingTags || []).map(normalizeTag));
    const autoSelected = suggestedTags
      .map((tag) => tag.value)
      .filter((value) => value && !existing.has(normalizeTag(value)));

    if (autoSelected.length) setSelectedTags(autoSelected);
  }, [existingTags, isOpen, restoredDraft, selectedTags.length, suggestedTags]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = () => {
      if (!selectedTags.length) return;
      saveDraft(draftKey, { selectedTags });
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [draftKey, isOpen, selectedTags]);

  useEffect(() => {
    if (!isOpen) return;
    const onVisibilityChange = () => {
      if (!document.hidden || !selectedTags.length) return;
      saveDraft(draftKey, { selectedTags });
    };
    const onPageHide = () => {
      if (!selectedTags.length) return;
      saveDraft(draftKey, { selectedTags });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [draftKey, isOpen, selectedTags]);

  const toggleTag = (tagValue: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagValue) ? prev.filter((t) => t !== tagValue) : [...prev, tagValue],
    );
  };

  const handleClose = () => {
    if (selectedTags.length) {
      saveDraft(draftKey, { selectedTags });
    } else {
      clearDraft(draftKey);
    }
    onClose();
    setSelectedTags([]);
    setRestoredDraft(false);
  };

  const handleApply = () => {
    if (!selectedTags.length) return;
    onApplyTags?.(selectedTags);
    clearDraft(draftKey);
    onClose();
    setSelectedTags([]);
    setRestoredDraft(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen) return;
        // Switching browser tabs can trigger Radix "dismiss" via focus-loss.
        // Ignore dismiss attempts while the document is hidden.
        if (typeof document !== 'undefined' && document.hidden) return;
        handleClose();
      }}
    >
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          // Prevent closing when the browser window/tab loses focus (Radix reports this as an "interact outside").
          const originalEvent = (e as any)?.detail?.originalEvent;
          if (originalEvent instanceof FocusEvent) e.preventDefault();
        }}
        onFocusOutside={(e) => {
          // Prevent the dialog from closing when the browser window/tab loses focus.
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Suggest Tags
          </DialogTitle>
          <DialogDescription>AI-powered tag suggestions for your content</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Content to analyze:</p>
              <p className="text-sm whitespace-pre-wrap">{content ?? ''}</p>
            </div>

            {existingTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Existing tags:</p>
                <div className="flex flex-wrap gap-2">
                  {existingTags.map((tag) => (
                    <Badge key={`existing-${tag}`} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {isSearching && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Researching company information...
                </span>
              </div>
            )}

            {searchError && (
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-700 dark:text-red-300">{searchError}</p>
                </div>
                {onRetry && (
                  <Button variant="secondary" size="sm" onClick={onRetry} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
              </div>
            )}

            {suggestedTags.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Suggested Tags</p>
                  <Badge variant="outline" className="text-xs">
                    {suggestedTags.filter((tag) => selectedTags.includes(tag.value)).length} selected
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.value) ? 'default' : 'outline'}
                      className="cursor-pointer transition-all"
                      onClick={() => toggleTag(tag.value)}
                    >
                      {selectedTags.includes(tag.value) && <CheckCircle className="h-3 w-3 mr-1" />}
                      {tag.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {otherTags.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Other Suggestions</p>
                <div className="flex flex-wrap gap-2">
                  {otherTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.value) ? 'default' : 'outline'}
                      className="cursor-pointer opacity-70 hover:opacity-100 transition-all"
                      onClick={() => toggleTag(tag.value)}
                    >
                      {tag.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(suggestedTags.length > 0 || otherTags.length > 0) && (
              <Button onClick={handleApply} disabled={selectedTags.length === 0} className="w-full">
                Apply {selectedTags.length} selected tag{selectedTags.length !== 1 ? 's' : ''}
              </Button>
            )}

            {!isSearching && !searchError && suggestedTags.length === 0 && otherTags.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No tag suggestions available</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
