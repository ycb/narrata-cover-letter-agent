/**
 * AddSectionFromLibraryModal
 *
 * Wrapper modal for adding sections to cover letters from library
 * Mode: "letter" (hides dynamic mode per spec)
 *
 * Supports two entry points:
 * 1. Overflow menu "Insert from Library..." - offers Replace or Insert Below
 * 2. Plus-row between cards - offers Insert Here only
 */

import React from "react";
import { AddSectionModalBase, type ContentType } from "@/components/shared/AddSectionModalBase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BlurbVariation, WorkHistoryBlurb, WorkHistoryCompany } from "@/types/workHistory";
import type { SavedSection } from "@/services/coverLetterTemplateService";
import { highlightWordDiff } from "@/lib/textDiff";
import { cn } from "@/lib/utils";

export type InvocationType =
  | { type: "replace_or_insert_below"; sectionId: string; sectionType: "intro" | "body" | "closing"; sectionIndex: number }
  | { type: "insert_here"; insertIndex: number; preferredSectionType: "intro" | "body" | "closing" };

export interface AddSectionFromLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  invocation: InvocationType;
  jobDescription?: string;
  initialContentType?: ContentType;
  initialShowSelectionPanel?: boolean;

  // Library data
  workHistoryLibrary: WorkHistoryCompany[];
  savedSections: SavedSection[];
  isLibraryLoading?: boolean;
  libraryError?: string | null;

  // Actions
  onReplace?: (sectionId: string, content: string, source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string; title?: string }) => void;
  onInsertBelow?: (sectionIndex: number, sectionType: string, content: string, source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string; title?: string }) => void;
  onInsertHere?: (insertIndex: number, sectionType: string, content: string, source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string; title?: string }) => void;
}

/**
 * Infer section type from neighbors
 */
function inferSectionType(invocation: InvocationType): "intro" | "body" | "closing" {
  if (invocation.type === "replace_or_insert_below") {
    return invocation.sectionType;
  }

  // For insert_here, use preferred type
  return invocation.preferredSectionType;
}

export function AddSectionFromLibraryModal({
  isOpen,
  onClose,
  invocation,
  jobDescription,
  initialContentType,
  initialShowSelectionPanel,
  workHistoryLibrary,
  savedSections,
  isLibraryLoading,
  libraryError,
  onReplace,
  onInsertBelow,
  onInsertHere,
}: AddSectionFromLibraryModalProps) {
  const [selectedContent, setSelectedContent] = React.useState<WorkHistoryBlurb | SavedSection | null>(null);
  const [selectedVariationId, setSelectedVariationId] = React.useState<string | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const isSavedSection = (content: WorkHistoryBlurb | SavedSection): content is SavedSection =>
    'type' in content && !('roleId' in content);
  const normalizeVariationContent = React.useCallback((value: string): string => {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
  }, []);
  const getUniqueVariations = React.useCallback(
    (variations: BlurbVariation[] | undefined | null) => {
      const seen = new Set<string>();
      return (variations ?? []).filter((variation) => {
        const key = normalizeVariationContent(variation.content ?? '') || '__empty__';
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    [normalizeVariationContent],
  );
  const formatVariationLabel = (variation: BlurbVariation, index: number) =>
    variation.developedForJobTitle
      ? `Variation ${index + 1} - ${variation.developedForJobTitle}`
      : `Variation ${index + 1}`;
  const resolveActiveContent = () => {
    if (!selectedContent) return null;

    if (isSavedSection(selectedContent)) {
      return {
        content: selectedContent.content,
        title: selectedContent.title ?? '',
        itemId: selectedContent.id!,
      };
    }

    const story = selectedContent as WorkHistoryBlurb;
    const variations = getUniqueVariations(story.variations);
    if (selectedVariationId && variations.length > 0) {
      const variationIndex = variations.findIndex((variation) => variation.id === selectedVariationId);
      const variation = variationIndex >= 0 ? variations[variationIndex] : null;
      if (variation) {
        const variationLabel = formatVariationLabel(variation, variationIndex);
        return {
          content: variation.content || story.content,
          title: `${story.title} (${variationLabel})`,
          itemId: story.id!,
        };
      }
    }

    return {
      content: story.content,
      title: story.title ?? '',
      itemId: story.id!,
    };
  };

  const handleContentSelected = (content: WorkHistoryBlurb | SavedSection) => {
    setSelectedContent(content);
    setSelectedVariationId(null);
    setShowPreview(true);
  };

  const handleReplace = () => {
    if (!selectedContent || invocation.type !== "replace_or_insert_below") return;

    const contentType: "story" | "saved_section" = isSavedSection(selectedContent) ? "saved_section" : "story";
    const activeContent = resolveActiveContent();
    if (!activeContent) return;

    onReplace?.(invocation.sectionId, activeContent.content, {
      kind: "library",
      contentType,
      itemId: activeContent.itemId,
      title: activeContent.title,
    });

    // Close modal
    setShowPreview(false);
    setSelectedContent(null);
    onClose();
  };

  const handleInsertBelow = () => {
    if (!selectedContent || invocation.type !== "replace_or_insert_below") return;

    const contentType: "story" | "saved_section" = isSavedSection(selectedContent) ? "saved_section" : "story";
    const activeContent = resolveActiveContent();
    if (!activeContent) return;

    onInsertBelow?.(invocation.sectionIndex, invocation.sectionType, activeContent.content, {
      kind: "library",
      contentType,
      itemId: activeContent.itemId,
      title: activeContent.title,
    });

    // Close modal
    setShowPreview(false);
    setSelectedContent(null);
    onClose();
  };

  const handleInsertHere = () => {
    if (!selectedContent || invocation.type !== "insert_here") return;

    const contentType: "story" | "saved_section" = isSavedSection(selectedContent) ? "saved_section" : "story";
    const activeContent = resolveActiveContent();
    if (!activeContent) return;

    onInsertHere?.(invocation.insertIndex, invocation.preferredSectionType, activeContent.content, {
      kind: "library",
      contentType,
      itemId: activeContent.itemId,
      title: activeContent.title,
    });

    // Close modal
    setShowPreview(false);
    setSelectedContent(null);
    onClose();
  };

  const handleClose = () => {
    setShowPreview(false);
    setSelectedContent(null);
    setSelectedVariationId(null);
    onClose();
  };

  // Conditional rendering without early return to maintain consistent hook calls
  const sectionType = inferSectionType(invocation);
  const sectionTypeLabel = sectionType === "intro" ? "Introduction" : sectionType === "closing" ? "Closing" : "Body Paragraph";
  const isStoryContent = selectedContent && !isSavedSection(selectedContent);
  const storyContent = isStoryContent ? (selectedContent as WorkHistoryBlurb) : null;
  const storyVariations = getUniqueVariations(storyContent?.variations);
  const activePreview = resolveActiveContent();
  const itemContent = activePreview?.content ?? selectedContent?.content;
  const itemTitle = activePreview?.title ?? selectedContent?.title ?? "";

  React.useEffect(() => {
    if (!selectedVariationId) return;
    const stillExists = storyVariations.some((variation) => variation.id === selectedVariationId);
    if (!stillExists) {
      setSelectedVariationId(null);
    }
  }, [selectedVariationId, storyVariations]);

  // Render preview or selection modal based on state
  return showPreview && selectedContent ? (
    <Dialog open={showPreview} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Preview & Confirm</DialogTitle>
          <DialogDescription>
            Review the content before adding to your cover letter
          </DialogDescription>
        </DialogHeader>

        {/* Preview Content */}
        <div className="py-4 overflow-y-auto max-h-[50vh]">
          <div className="space-y-4">
            {isStoryContent && storyVariations.length > 0 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Choose version</p>
                  <p className="text-xs text-muted-foreground">Section type: {sectionTypeLabel}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-400" />
                    Added
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-400" />
                    Removed
                  </span>
                </div>
                <div className="space-y-2">
                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedVariationId ? 'hover:border-primary/50' : 'border-primary bg-muted/40'
                    }`}
                    onClick={() => setSelectedVariationId(null)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">Main Story</p>
                        <p className="text-xs text-muted-foreground">{storyContent?.title}</p>
                      </div>
                      <Badge variant="secondary">Main Story</Badge>
                    </div>
                    <p
                      className={cn(
                        "text-sm text-muted-foreground whitespace-pre-line",
                        selectedVariationId ? "max-h-24 overflow-hidden" : "max-h-none"
                      )}
                    >
                      {storyContent?.content || 'No story content captured yet.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {storyVariations.map((variation, index) => {
                      const variationLabel = formatVariationLabel(variation, index);
                      const isSelected = selectedVariationId === variation.id;
                      const hasDiff =
                        Boolean(variation.content) &&
                        variation.content.trim() !== (storyContent?.content ?? '').trim();
                      return (
                        <div
                          key={variation.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'border-primary bg-muted/40' : 'hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedVariationId(variation.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="text-sm font-medium">{variationLabel}</h5>
                            <Badge variant="outline">Variation</Badge>
                          </div>
                          {variation.content ? (
                            <div
                              className={cn(
                                "text-sm text-muted-foreground whitespace-pre-line",
                                isSelected ? "max-h-none" : "max-h-24 overflow-hidden"
                              )}
                            >
                              {hasDiff ? (
                                highlightWordDiff(storyContent?.content ?? '', variation.content)
                              ) : (
                                <p className="text-xs text-muted-foreground">No differences from main story.</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No variation content captured yet.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {(!isStoryContent || storyVariations.length === 0) && (
              <>
                <div>
                  <h3 className="font-semibold text-lg">{itemTitle}</h3>
                  <p className="text-sm text-muted-foreground">Section type: {sectionTypeLabel}</p>
                </div>
                <div className="p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm whitespace-pre-line">{itemContent}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleClose}
          >
            Cancel
          </Button>

          {invocation.type === "replace_or_insert_below" ? (
            <>
              <Button
                variant="secondary"
                onClick={handleInsertBelow}
              >
                Insert below as new section
              </Button>
              <Button
                onClick={handleReplace}
              >
                Replace current section
              </Button>
            </>
          ) : (
            <Button
              onClick={handleInsertHere}
            >
              Insert section
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  ) : (
    <AddSectionModalBase
      mode="letter"
      isOpen={isOpen}
      onClose={handleClose}
      onContentSelected={handleContentSelected}
      workHistoryLibrary={workHistoryLibrary}
      savedSections={savedSections}
      isLibraryLoading={isLibraryLoading}
      libraryError={libraryError}
      initialContentType={initialContentType}
      initialMethod="static"
      initialShowSelectionPanel={initialShowSelectionPanel}
    />
  );
}
