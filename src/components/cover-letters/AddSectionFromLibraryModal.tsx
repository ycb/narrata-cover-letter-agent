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
import type { WorkHistoryBlurb, WorkHistoryCompany } from "@/types/workHistory";
import type { SavedSection } from "@/services/coverLetterTemplateService";

export type InvocationType =
  | { type: "replace_or_insert_below"; sectionId: string; sectionType: "intro" | "body" | "closing"; sectionIndex: number }
  | { type: "insert_here"; insertIndex: number; preferredSectionType: "intro" | "body" | "closing" };

export interface AddSectionFromLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  invocation: InvocationType;
  jobDescription?: string;

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
  workHistoryLibrary,
  savedSections,
  isLibraryLoading,
  libraryError,
  onReplace,
  onInsertBelow,
  onInsertHere,
}: AddSectionFromLibraryModalProps) {
  const [selectedContent, setSelectedContent] = React.useState<WorkHistoryBlurb | SavedSection | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);

  const handleContentSelected = (content: WorkHistoryBlurb | SavedSection) => {
    setSelectedContent(content);
    setShowPreview(true);
  };

  const handleReplace = () => {
    if (!selectedContent || invocation.type !== "replace_or_insert_below") return;

    const contentType: "story" | "saved_section" = "content" in selectedContent && selectedContent.content ? "saved_section" : "story";
    const itemContent = "content" in selectedContent ? selectedContent.content! : (selectedContent as WorkHistoryBlurb).content;
    const itemTitle = "title" in selectedContent ? selectedContent.title : "";
    const itemId = selectedContent.id!;

    onReplace?.(invocation.sectionId, itemContent, {
      kind: "library",
      contentType,
      itemId,
      title: itemTitle,
    });

    // Close modal
    setShowPreview(false);
    setSelectedContent(null);
    onClose();
  };

  const handleInsertBelow = () => {
    if (!selectedContent || invocation.type !== "replace_or_insert_below") return;

    const contentType: "story" | "saved_section" = "content" in selectedContent && selectedContent.content ? "saved_section" : "story";
    const itemContent = "content" in selectedContent ? selectedContent.content! : (selectedContent as WorkHistoryBlurb).content;
    const itemTitle = "title" in selectedContent ? selectedContent.title : "";
    const itemId = selectedContent.id!;

    onInsertBelow?.(invocation.sectionIndex, invocation.sectionType, itemContent, {
      kind: "library",
      contentType,
      itemId,
      title: itemTitle,
    });

    // Close modal
    setShowPreview(false);
    setSelectedContent(null);
    onClose();
  };

  const handleInsertHere = () => {
    if (!selectedContent || invocation.type !== "insert_here") return;

    const contentType: "story" | "saved_section" = "content" in selectedContent && selectedContent.content ? "saved_section" : "story";
    const itemContent = "content" in selectedContent ? selectedContent.content! : (selectedContent as WorkHistoryBlurb).content;
    const itemTitle = "title" in selectedContent ? selectedContent.title : "";
    const itemId = selectedContent.id!;

    onInsertHere?.(invocation.insertIndex, invocation.preferredSectionType, itemContent, {
      kind: "library",
      contentType,
      itemId,
      title: itemTitle,
    });

    // Close modal
    setShowPreview(false);
    setSelectedContent(null);
    onClose();
  };

  const handleClose = () => {
    setShowPreview(false);
    setSelectedContent(null);
    onClose();
  };

  // Conditional rendering without early return to maintain consistent hook calls
  const sectionType = inferSectionType(invocation);
  const sectionTypeLabel = sectionType === "intro" ? "Introduction" : sectionType === "closing" ? "Closing" : "Body Paragraph";
  const itemContent = selectedContent && ("content" in selectedContent ? selectedContent.content! : (selectedContent as WorkHistoryBlurb).content);
  const itemTitle = selectedContent && ("title" in selectedContent ? selectedContent.title : "");

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
            <div>
              <h3 className="font-semibold text-lg">{itemTitle}</h3>
              <p className="text-sm text-muted-foreground">Section type: {sectionTypeLabel}</p>
            </div>
            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm whitespace-pre-line">{itemContent}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>

          {invocation.type === "replace_or_insert_below" ? (
            <>
              <Button variant="secondary" onClick={handleInsertBelow}>
                Insert below as new section
              </Button>
              <Button onClick={handleReplace}>
                Replace current section
              </Button>
            </>
          ) : (
            <Button onClick={handleInsertHere}>
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
    />
  );
}
