/**
 * AddSectionModalBase
 *
 * Reusable modal for adding sections from library (Stories or Saved Sections)
 * Supports two modes:
 * - "template": Used in template editor (shows Dynamic mode)
 * - "letter": Used in cover letter editor (hides Dynamic mode per spec)
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { WorkHistoryCompany, WorkHistoryBlurb } from "@/types/workHistory";
import type { SavedSection } from "@/services/coverLetterTemplateService";

export type ContentType = 'story' | 'saved';
export type ContentMethod = 'dynamic' | 'static';
export type ModalMode = 'template' | 'letter';

export interface AddSectionModalBaseProps {
  mode: ModalMode;
  isOpen: boolean;
  onClose: () => void;
  onContentSelected: (content: WorkHistoryBlurb | SavedSection) => void;

  // Library data
  workHistoryLibrary: WorkHistoryCompany[];
  savedSections: SavedSection[];
  isLibraryLoading?: boolean;
  libraryError?: string | null;

  // For dynamic mode (template editor only)
  onDynamicModeSelected?: (contentType: ContentType) => void;

  // Pre-selection (for editing existing sections)
  initialContentType?: ContentType;
  initialMethod?: ContentMethod;
  initialContent?: WorkHistoryBlurb | SavedSection | null;
}

const savedSectionGroups = [
  {
    value: 'intro',
    label: 'Introduction',
    description: 'Opening paragraphs that grab attention and introduce you'
  },
  {
    value: 'paragraph',
    label: 'Body Paragraph',
    description: 'Supporting paragraphs kept verbatim from uploads'
  },
  {
    value: 'closer',
    label: 'Closing',
    description: 'Closing paragraphs that wrap up your letter'
  }
];

export function AddSectionModalBase({
  mode,
  isOpen,
  onClose,
  onContentSelected,
  workHistoryLibrary,
  savedSections,
  isLibraryLoading = false,
  libraryError = null,
  onDynamicModeSelected,
  initialContentType,
  initialMethod,
  initialContent,
}: AddSectionModalBaseProps) {
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(initialContentType || null);
  const [contentMethod, setContentMethod] = useState<ContentMethod | null>(initialMethod || null);
  const [showSelectionPanel, setShowSelectionPanel] = useState(false);

  // Story selection state
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');

  // Saved section selection state
  const [selectedSectionType, setSelectedSectionType] = useState<string>('');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedContentType(initialContentType || null);
      setContentMethod(initialMethod || null);
      setShowSelectionPanel(false);
      setSelectedCompany('');
      setSelectedRole('');
      setSelectedSectionType('');
    }
  }, [isOpen, initialContentType, initialMethod]);

  const handleContentTypeChange = (type: ContentType) => {
    console.log('[AddSectionModalBase] handleContentTypeChange called', { type, mode });
    setSelectedContentType(type);
    // Reset selection state when changing content type
    setSelectedCompany('');
    setSelectedRole('');
    setSelectedSectionType('');

    // In letter mode: auto-select static method AND immediately show selection panel
    if (mode === 'letter') {
      console.log('[AddSectionModalBase] Letter mode - auto-selecting static and showing panel');
      setContentMethod('static');
      setShowSelectionPanel(true);
    }
  };

  const handleMethodChange = (method: ContentMethod) => {
    setContentMethod(method);
  };

  const handleContinue = () => {
    console.log('[AddSectionModalBase] handleContinue called', {
      selectedContentType,
      contentMethod,
      showSelectionPanel,
    });

    if (contentMethod === 'dynamic' && onDynamicModeSelected) {
      // For dynamic mode, just notify parent and close
      onDynamicModeSelected(selectedContentType!);
      return;
    }

    if (contentMethod === 'static') {
      if (initialContent) {
        // If editing with pre-selected content, select it immediately
        onContentSelected(initialContent);
      } else {
        // Show selection panel
        console.log('[AddSectionModalBase] Setting showSelectionPanel to true');
        setShowSelectionPanel(true);
      }
    }
  };

  const handleBack = () => {
    if (selectedRole) {
      setSelectedRole('');
    } else if (selectedCompany) {
      setSelectedCompany('');
    } else if (selectedSectionType) {
      setSelectedSectionType('');
    } else {
      setShowSelectionPanel(false);
    }
  };

  const getBreadcrumb = () => {
    if (selectedRole) return '← Back to Roles';
    if (selectedCompany) return '← Back to Companies';
    if (selectedSectionType) return '← Back to Section Types';
    return '← Back';
  };

  console.log('[AddSectionModalBase] Render state:', {
    mode,
    selectedContentType,
    contentMethod,
    showSelectionPanel,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        {/* Modal Header */}
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="text-2xl font-bold">Add New Section</DialogTitle>
          <DialogDescription>
            Choose how you want to add content to your {mode === 'template' ? 'template' : 'cover letter'}
          </DialogDescription>
        </DialogHeader>

        {/* Modal Content - use min-height to ensure selection panel has room */}
        <div className="relative min-h-[400px] overflow-hidden">
          {/* Main Panel - Content Type & Method Selection */}
          <div className={`w-full p-6 transition-transform duration-300 ease-in-out ${showSelectionPanel ? '-translate-x-full absolute inset-0' : 'translate-x-0'}`}>
            <div className="space-y-6">
              {/* Step 1: Content Type */}
              <div className="mb-4">
                <Label className="text-base font-medium">1. Choose Content Type</Label>
                <div className="flex gap-3 mt-2">
                  <Button
                    variant={selectedContentType === 'story' ? 'default' : 'secondary'}
                    onClick={() => handleContentTypeChange('story')}
                    className="flex-1 h-20 flex-col justify-center items-center gap-1 cursor-pointer"
                  >
                    <div className="text-center">
                      <div className="font-medium">Story</div>
                      <div className={selectedContentType === 'story' ? 'text-sm text-white/90' : 'text-sm text-muted-foreground'}>From your work history</div>
                    </div>
                  </Button>
                  <Button
                    variant={selectedContentType === 'saved' ? 'default' : 'secondary'}
                    onClick={() => handleContentTypeChange('saved')}
                    className="flex-1 h-20 flex-col justify-center items-center gap-1 cursor-pointer"
                  >
                    <div className="text-center">
                      <div className="font-medium">Saved Sections</div>
                      <div className={selectedContentType === 'saved' ? 'text-sm text-white/90' : 'text-sm text-muted-foreground'}>Custom templates</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Step 2: Content Method (Template mode only) */}
              {mode === 'template' && (
                <div className="mt-4">
                  <Label className="text-base font-medium">2. Choose Method</Label>
                  <div className="flex gap-3 mt-2">
                    {/* Dynamic Mode */}
                    <Button
                      variant={contentMethod === 'dynamic' ? 'default' : 'secondary'}
                      onClick={() => handleMethodChange('dynamic')}
                      className="flex-1 h-20 flex-col justify-center items-center gap-1"
                    >
                      <div className="text-center">
                        <span className="font-medium">Dynamic (Default)</span>
                        <span className={contentMethod === 'dynamic' ? 'text-sm block text-white/90' : 'text-sm block text-muted-foreground'}>
                          Intelligently match {selectedContentType === 'story' ? 'stories' : 'content'} based on job description
                        </span>
                      </div>
                    </Button>

                    {/* Static Mode */}
                    <Button
                      variant={contentMethod === 'static' ? 'default' : 'secondary'}
                      onClick={() => handleMethodChange('static')}
                      className="flex-1 h-20 flex-col justify-center items-center gap-1"
                    >
                      <div className="text-center">
                        <span className="font-medium">Static (Custom)</span>
                        <span className={contentMethod === 'static' ? 'text-sm block text-white/90' : 'text-sm block text-muted-foreground'}>
                          Choose specific content from your library
                        </span>
                      </div>
                    </Button>
                  </div>
                </div>
              )}

              {/* CTA Button */}
              <div className="pt-4 flex justify-end">
                <Button
                  variant="default"
                  disabled={!selectedContentType || !contentMethod}
                  onClick={handleContinue}
                >
                  {contentMethod === 'dynamic' ? 'Add Section' :
                   initialContent ? 'Update Section' : 'Continue to Selection'}
                </Button>
              </div>
            </div>
          </div>

          {/* Selection Panel - Slides in from right */}
          <div className={`absolute inset-0 w-full h-full bg-background transition-transform duration-300 ease-in-out z-10 ${showSelectionPanel ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}>
            <div className="p-6 h-full overflow-y-auto">
              {/* Back Button */}
              <div className="mb-4">
                <span
                  className="cursor-pointer text-primary hover:text-primary/80 font-medium text-sm"
                  onClick={handleBack}
                >
                  {getBreadcrumb()}
                </span>
              </div>

              {/* Story Selection */}
              {selectedContentType === 'story' && (
                <div>
                  {isLibraryLoading ? (
                    <div className="p-4 border border-dashed rounded-lg text-sm text-muted-foreground text-center">
                      Loading stories...
                    </div>
                  ) : libraryError ? (
                    <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg text-sm text-destructive">
                      {libraryError}
                    </div>
                  ) : workHistoryLibrary.length === 0 ? (
                    <div className="p-4 border border-dashed rounded-lg text-sm text-muted-foreground text-center">
                      No approved stories available yet. Upload a resume or add work history stories to populate this list.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Company List */}
                      {!selectedCompany && (
                        <div className="space-y-2">
                          {workHistoryLibrary.map((company) => {
                            const roles = company.roles ?? [];
                            const roleCount = roles.filter((role) => (role.blurbs ?? []).length > 0).length;
                            return (
                              <div
                                key={company.id}
                                className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                                onClick={() => {
                                  if (roleCount === 0) return;
                                  setSelectedCompany(company.id);
                                  setSelectedRole('');
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium">{company.name}</h4>
                                    {company.description && (
                                      <p className="text-sm text-muted-foreground">{company.description}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">{roleCount} role{roleCount === 1 ? '' : 's'}</Badge>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Role List */}
                      {selectedCompany && !selectedRole && (
                        <div className="space-y-2">
                          {(workHistoryLibrary
                            .find((company) => company.id === selectedCompany)
                            ?.roles ?? [])
                            .filter((role) => (role.blurbs ?? []).length > 0)
                            .map((role) => (
                              <div
                                key={role.id}
                                className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                                onClick={() => setSelectedRole(role.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium">{role.title}</h4>
                                    {role.description && (
                                      <p className="text-sm text-muted-foreground">{role.description}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">{(role.blurbs ?? []).length} story{(role.blurbs ?? []).length === 1 ? '' : 's'}</Badge>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Story List */}
                      {selectedRole && (
                        <div className="space-y-3">
                          {((workHistoryLibrary
                            .find((company) => company.id === selectedCompany)
                            ?.roles ?? [])
                            .find((role) => role.id === selectedRole)
                            ?.blurbs ?? []).map((blurb) => (
                              <div
                                key={blurb.id}
                                className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                                onClick={() => onContentSelected(blurb)}
                              >
                                <div className="space-y-3">
                                  <h4 className="font-medium">{blurb.title}</h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                                    {blurb.content || 'No story content captured yet.'}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Saved Section Selection */}
              {selectedContentType === 'saved' && (
                <div>
                  {!selectedSectionType ? (
                    <div className="space-y-2">
                      {savedSectionGroups.map((group) => {
                        const count = savedSections.filter(section => section.type === group.value).length;
                        return (
                          <div
                            key={group.value}
                            className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                            onClick={() => {
                              if (count === 0) return;
                              setSelectedSectionType(group.value);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{group.label}</h4>
                                <p className="text-sm text-muted-foreground">{group.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                  {count} item{count === 1 ? '' : 's'}
                                </Badge>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {savedSections.length === 0 && (
                        <div className="p-3 border border-dashed rounded-lg text-sm text-muted-foreground text-center">
                          Upload a cover letter or create a saved section to populate this library.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedSections.filter(section => section.type === selectedSectionType).length === 0 ? (
                        <div className="p-4 border border-dashed rounded-lg text-sm text-muted-foreground text-center">
                          No saved sections of this type yet.
                        </div>
                      ) : (
                        savedSections
                          .filter(section => section.type === selectedSectionType)
                          .map((section) => (
                            <div
                              key={section.id}
                              className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                              onClick={() => onContentSelected(section)}
                            >
                              <div className="space-y-3">
                                <h4 className="font-medium">{section.title}</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-line">{section.content}</p>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
