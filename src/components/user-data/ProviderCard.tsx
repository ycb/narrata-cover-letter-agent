/**
 * Provider Card Component
 * Displays current AI provider status and allows BYOM configuration
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProviderSettings } from '@/hooks/useProviderSettings';
import { CheckCircle, XCircle, AlertCircle, Settings, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import LogRocket from 'logrocket';

export function ProviderCard() {
  const {
    settings,
    isLoading,
    isValidating,
    isSaving,
    saveSettings,
    revertToDefault,
    validateProvider,
  } = useProviderSettings();

  const [showBYOMDialog, setShowBYOMDialog] = useState(false);
  const [providerType, setProviderType] = useState<'openai_compatible' | 'custom'>('openai_compatible');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelId, setModelId] = useState('gpt-3.5-turbo');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);

  const handleValidate = async () => {
    setValidationError(null);
    setIsValidated(false);

    const result = await validateProvider(
      providerType,
      {
        apiKey,
        baseUrl: baseUrl || undefined,
        modelId,
      },
      modelId
    );

    if (result.success) {
      setIsValidated(true);
      if (result.modelId) {
        setModelId(result.modelId);
      }
      LogRocket.track('Provider Validated', { providerType, modelId: result.modelId || modelId });
    } else {
      setValidationError(result.error || 'Validation failed');
      LogRocket.track('Provider Validation Failed', {
        providerType,
        error: result.error,
      });
    }
  };

  const handleSave = async () => {
    const success = await saveSettings(
      providerType,
      {
        apiKey,
        baseUrl: baseUrl || undefined,
        modelId,
      },
      modelId
    );

    if (success) {
      LogRocket.track('Provider Connected', {
        providerType,
        modelId,
        hasCustomBaseUrl: !!baseUrl,
      });
      setShowBYOMDialog(false);
      resetForm();
    }
  };

  const handleRevert = async () => {
    if (confirm('Are you sure you want to revert to Narrata\'s default provider?')) {
      const success = await revertToDefault();
      if (success) {
        LogRocket.track('Provider Reverted to Default');
      }
    }
  };

  const resetForm = () => {
    setApiKey('');
    setBaseUrl('');
    setModelId('gpt-3.5-turbo');
    setValidationError(null);
    setIsValidated(false);
  };

  const getStatusBadge = () => {
    if (isLoading) {
      return <Skeleton className="h-5 w-20" />;
    }

    const status = settings?.validationStatus || 'valid';
    const isDefault = settings?.providerType === 'narrata_default';

    if (isDefault) {
      return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
    }

    switch (status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case 'invalid':
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    }

    const status = settings?.validationStatus || 'valid';
    const isDefault = settings?.providerType === 'narrata_default';

    if (isDefault || status === 'valid') {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }

    if (status === 'invalid' || status === 'error') {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }

    return <AlertCircle className="h-5 w-5 text-yellow-600" />;
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

  const isDefault = settings?.providerType === 'narrata_default';
  const providerName = isDefault
    ? 'Narrata Managed OpenAI'
    : settings?.providerType === 'openai_compatible'
    ? 'OpenAI-Compatible Provider'
    : 'Custom Provider';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div>
                <CardTitle>AI Model Provider</CardTitle>
                <CardDescription>{providerName}</CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isDefault && settings?.modelId && (
              <div className="text-sm text-muted-foreground">
                Model: <span className="font-medium">{settings.modelId}</span>
              </div>
            )}
            {settings?.validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{settings.validationError}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              {isDefault ? (
                <Button onClick={() => setShowBYOMDialog(true)} variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Bring Your Own Model
                </Button>
              ) : (
                <>
                  <Button onClick={() => setShowBYOMDialog(true)} variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                  <Button onClick={handleRevert} variant="ghost" size="sm">
                    Revert to Default
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BYOM Dialog */}
      <Dialog open={showBYOMDialog} onOpenChange={setShowBYOMDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bring Your Own Model</DialogTitle>
            <DialogDescription>
              Configure your own AI provider. Your credentials are encrypted and stored securely.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="provider-type">Provider Type</Label>
              <Select
                value={providerType}
                onValueChange={(value: 'openai_compatible' | 'custom') => setProviderType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai_compatible">OpenAI-Compatible</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">API Key *</Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="base-url">Base URL (Optional)</Label>
              <Input
                id="base-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for standard OpenAI endpoints
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model-id">Model ID</Label>
              <Input
                id="model-id"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="gpt-3.5-turbo"
              />
            </div>

            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {isValidated && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>Provider validated successfully!</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleValidate}
                disabled={!apiKey || isValidating || isSaving}
                variant="outline"
                className="flex-1"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Validate'
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={!isValidated || isSaving || !apiKey}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

