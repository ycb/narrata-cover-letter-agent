/**
 * Personal Data Card Component
 * Displays resume or cover letter assets with dependency callouts and actions
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
}

export function PersonalDataCard({ sourceType, title, description, dependencyMessage }: PersonalDataCardProps) {
  const { assets, isLoading, isDeleting, deleteAsset, downloadAsset, checkDependencies } = usePersonalData();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<PersonalDataAsset | null>(null);
  const [dependencies, setDependencies] = useState<{
    workHistory: boolean;
    coverLetterTemplates: boolean;
    savedSections: boolean;
  } | null>(null);

  const filteredAssets = assets.filter((asset) => asset.sourceType === sourceType);

  const handleDeleteClick = async (asset: PersonalDataAsset) => {
    setAssetToDelete(asset);
    const deps = await checkDependencies(asset.id, asset.sourceType);
    setDependencies(deps);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
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
      setDeleteDialogOpen(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
              <p>No {sourceType === 'resume' ? 'resume' : 'cover letter'} uploaded yet</p>
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
                        {getStatusBadge(asset.processingStatus)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          {PersonalDataService.formatFileSize(asset.fileSize)} • Uploaded{' '}
                          {PersonalDataService.formatDate(asset.createdAt)}
                        </div>
                        {index === 0 && (
                          <div className="flex items-start gap-1 mt-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                            <span className="text-xs">{dependencyMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(asset)}
                        disabled={asset.processingStatus !== 'completed'}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
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

      {/* Delete Confirmation Dialog */}
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
                      <div className="mt-2 font-medium">
                        Deleting this file will reset your account to onboarding state.
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

