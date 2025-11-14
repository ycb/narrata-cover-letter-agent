/**
 * Personal Data Card Component
 * Displays resume or cover letter assets with dependency callouts and actions
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePersonalData } from '@/hooks/usePersonalData';
import { PersonalDataService, type PersonalDataAsset, type SourceType } from '@/services/personalDataService';
import { FileText, Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import LogRocket from 'logrocket';

interface PersonalDataCardProps {
  sourceType: SourceType;
  title: string;
  description: string;
  dependencyMessage: string;
  isLinkedIn?: boolean;
}

export function PersonalDataCard({ sourceType, title, description, dependencyMessage, isLinkedIn = false }: PersonalDataCardProps) {
  const { assets, isLoading, isDeleting, deleteAsset, downloadAsset, checkDependencies } = usePersonalData();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<PersonalDataAsset | null>(null);
  const [dependencies, setDependencies] = useState<{
    workHistory: boolean;
    coverLetterTemplates: boolean;
    savedSections: boolean;
  } | null>(null);

  // Filter assets by type and LinkedIn status
  const filteredAssets = assets.filter((asset) => {
    if (asset.sourceType !== sourceType) return false;
    if (isLinkedIn) {
      return asset.fileName.toLowerCase().includes('linkedin');
    } else {
      return !asset.fileName.toLowerCase().includes('linkedin');
    }
  });

  const handleDeleteClick = async (asset: PersonalDataAsset) => {
    setAssetToDelete(asset);
    const deps = await checkDependencies(asset.id, asset.sourceType);
    setDependencies(deps);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    // First confirmation - show warning dialog
    setDeleteDialogOpen(false);
    setConfirmDeleteDialogOpen(true);
  };

  const handleFinalDeleteConfirm = async () => {
    if (!assetToDelete) return;

    const result = await deleteAsset(assetToDelete.id);
    if (result.success) {
      LogRocket.track('Personal Data Deleted', {
        sourceType: assetToDelete.sourceType,
        fileName: assetToDelete.fileName,
        hasDependencies: !!(
          dependencies?.workHistory ||
          dependencies?.coverLetterTemplates ||
          dependencies?.savedSections
        ),
      });
      setConfirmDeleteDialogOpen(false);
      setAssetToDelete(null);
      setDependencies(null);
    }
  };

  const handleDownload = async (asset: PersonalDataAsset) => {
    const blob = await downloadAsset(asset.id);
    if (blob) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = asset.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const getDependencyWarnings = () => {
    if (!dependencies) return null;

    const warnings: string[] = [];
    if (sourceType === 'resume' && dependencies.workHistory) {
      warnings.push('Deleting this resume will affect your work history');
    }
    if (sourceType === 'cover_letter' && dependencies.coverLetterTemplates) {
      warnings.push('Deleting this cover letter will affect your cover letter templates');
    }
    if (sourceType === 'cover_letter' && dependencies.savedSections) {
      warnings.push('Deleting this cover letter will affect your saved sections');
    }

    return warnings;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No {isLinkedIn ? 'LinkedIn data' : sourceType === 'resume' ? 'resume' : 'cover letter'} uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssets.map((asset, index) => (
                <div key={asset.id}>
                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{asset.fileName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          {PersonalDataService.formatFileSize(asset.fileSize)} • Uploaded{' '}
                          {PersonalDataService.formatDate(asset.createdAt)}
                        </div>
                        {index === 0 && (
                          <div className="flex items-start gap-1 mt-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                            <span className="text-xs">
                              <span className="font-medium">Required:</span> {dependencyMessage}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(asset)}
                        disabled={asset.processingStatus !== 'completed'}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDeleteClick(asset)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {index < filteredAssets.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* First Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {assetToDelete?.fileName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The file will be permanently deleted after 30 days.
              {getDependencyWarnings() && getDependencyWarnings()!.length > 0 && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {getDependencyWarnings()!.map((warning, idx) => (
                        <div key={idx}>{warning}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setAssetToDelete(null);
              setDependencies(null);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final Delete Confirmation Dialog */}
      <AlertDialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Final Confirmation Required
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-medium">
                Your account will not be accessible until you provide a new {isLinkedIn ? 'LinkedIn data' : sourceType === 'resume' ? 'resume' : 'cover letter'} to replace the one you're deleting.
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <p className="text-sm font-medium text-destructive mb-2">What happens next:</p>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>This file will be deleted immediately</li>
                  <li>Your account will return to onboarding phase</li>
                  <li>You'll need to upload a new {isLinkedIn ? 'LinkedIn data' : sourceType === 'resume' ? 'resume' : 'cover letter'} to continue using Narrata</li>
                  <li>Existing items will be preserved and filled in during onboarding</li>
                </ul>
              </div>
              {getDependencyWarnings() && getDependencyWarnings()!.length > 0 && (
                <Alert className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {getDependencyWarnings()!.map((warning, idx) => (
                        <div key={idx}>{warning}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                Are you sure you want to proceed?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setConfirmDeleteDialogOpen(false);
                setDeleteDialogOpen(true);
              }}
              disabled={isDeleting}
            >
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinalDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, Delete Permanently'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

