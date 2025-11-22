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
  onReplace?: (sectionId: string, content: string, source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string }) => void;
  onInsertBelow?: (sectionIndex: number, sectionType: string, content: string, source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string }) => void;
  onInsertHere?: (insertIndex: number, sectionType: string, content: string, source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string }) => void;
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
    const itemId = selectedContent.id!;

    onReplace?.(invocation.sectionId, itemContent, {
      kind: "library",
      contentType,
      itemId,
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
    const itemId = selectedContent.id!;

    onInsertBelow?.(invocation.sectionIndex, invocation.sectionType, itemContent, {
      kind: "library",
      contentType,
      itemId,
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
    const itemId = selectedContent.id!;

    onInsertHere?.(invocation.insertIndex, invocation.preferredSectionType, itemContent, {
      kind: "library",
      contentType,
      itemId,
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

  // If preview mode, show preview card with actions
  if (showPreview && selectedContent) {
    const sectionType = inferSectionType(invocation);
    const sectionTypeLabel = sectionType === "intro" ? "Introduction" : sectionType === "closing" ? "Closing" : "Body Paragraph";
    const itemContent = "content" in selectedContent ? selectedContent.content! : (selectedContent as WorkHistoryBlurb).content;
    const itemTitle = "title" in selectedContent ? selectedContent.title : "";

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
        <div className="w-full max-w-3xl max-h-[90vh] bg-background rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold">Preview & Confirm</h2>
              <p className="text-muted-foreground">Review the content before adding to your cover letter</p>
            </div>
            <button
              onClick={handleClose}
              className="h-8 w-8 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            >
              <span className="sr-only">Close</span>
              ✕
            </button>
          </div>

          {/* Preview Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
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
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/20">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>

            {invocation.type === "replace_or_insert_below" ? (
              <>
                <button
                  onClick={handleInsertBelow}
                  className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
                >
                  Insert below as new section
                </button>
                <button
                  onClick={handleReplace}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Replace current section
                </button>
              </>
            ) : (
              <button
                onClick={handleInsertHere}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Insert section
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, show selection modal
  return (
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
