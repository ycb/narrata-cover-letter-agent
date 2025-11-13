/**
 * Provider Card Component
 * Displays current AI provider status and allows BYOM configuration
 */

import React, { useState, useMemo } from 'react';
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

// Supported LLM Providers and their models
const LLM_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ],
    requiresBaseUrl: false,
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ],
    requiresBaseUrl: false,
  },
  google: {
    name: 'Google (Gemini)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-pro', name: 'Gemini Pro' },
    ],
    requiresBaseUrl: false,
  },
  mistral: {
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large' },
      { id: 'mistral-medium-latest', name: 'Mistral Medium' },
      { id: 'mistral-small-latest', name: 'Mistral Small' },
    ],
    requiresBaseUrl: false,
  },
  azure: {
    name: 'Azure OpenAI',
    baseUrl: 'https://YOUR_RESOURCE.openai.azure.com',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo' },
    ],
    requiresBaseUrl: true,
  },
  custom: {
    name: 'Custom Provider',
    baseUrl: '',
    models: [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (default)' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'custom', name: 'Custom Model' },
    ],
    requiresBaseUrl: true,
  },
} as const;

type ProviderKey = keyof typeof LLM_PROVIDERS;

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
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey>('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(LLM_PROVIDERS.openai.models[0].id);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);

  // Initialize form when dialog opens with existing settings
  React.useEffect(() => {
    if (showBYOMDialog && settings && settings.providerType !== 'narrata_default') {
      // Try to match provider from base URL
      const existingBaseUrl = settings.baseUrl || '';
      let matchedProvider: ProviderKey = 'openai';
      
      for (const [key, config] of Object.entries(LLM_PROVIDERS)) {
        if (existingBaseUrl.includes(config.baseUrl) || (key === 'openai' && !existingBaseUrl)) {
          matchedProvider = key as ProviderKey;
          break;
        }
      }
      
      if (matchedProvider === 'openai' && existingBaseUrl && !existingBaseUrl.includes('api.openai.com')) {
        matchedProvider = 'custom';
      }
      
      setSelectedProvider(matchedProvider);
      setBaseUrl(existingBaseUrl || LLM_PROVIDERS[matchedProvider].baseUrl);
      setSelectedModel(settings.modelId || LLM_PROVIDERS[matchedProvider].models[0].id);
      // Don't pre-fill API key for security
    } else if (showBYOMDialog) {
      // Reset to defaults for new configuration
      resetForm();
    }
  }, [showBYOMDialog, settings]);

  // Get available models for selected provider
  const availableModels = useMemo(() => {
    return LLM_PROVIDERS[selectedProvider].models;
  }, [selectedProvider]);

  // Check if base URL should be shown
  const showBaseUrl = useMemo(() => {
    return LLM_PROVIDERS[selectedProvider].requiresBaseUrl;
  }, [selectedProvider]);

  // Set default base URL when provider changes
  const handleProviderChange = (provider: ProviderKey) => {
    setSelectedProvider(provider);
    const providerConfig = LLM_PROVIDERS[provider];
    setBaseUrl(providerConfig.baseUrl || '');
    
    // Set default model
    if (providerConfig.models.length > 0) {
      setSelectedModel(providerConfig.models[0].id);
    }
    
    // Reset validation state
    setIsValidated(false);
    setValidationError(null);
  };

  const handleSave = async () => {
    setValidationError(null);
    
    // Validate before saving
    const providerConfig = LLM_PROVIDERS[selectedProvider];
    const finalBaseUrl = showBaseUrl ? baseUrl : providerConfig.baseUrl;
    
    const result = await validateProvider(
      selectedProvider === 'custom' ? 'custom' : 'openai_compatible',
      {
        apiKey,
        baseUrl: finalBaseUrl || undefined,
        modelId: selectedModel,
      },
      selectedModel
    );

    if (!result.success) {
      setValidationError(result.error || 'Validation failed');
      LogRocket.track('Provider Validation Failed', {
        provider: selectedProvider,
        error: result.error,
      });
      return;
    }

    // Save if validation succeeds
    const success = await saveSettings(
      selectedProvider === 'custom' ? 'custom' : 'openai_compatible',
      {
        apiKey,
        baseUrl: finalBaseUrl || undefined,
        modelId: selectedModel,
      },
      selectedModel
    );

    if (success) {
      LogRocket.track('Provider Connected', {
        provider: selectedProvider,
        modelId: selectedModel,
        hasCustomBaseUrl: !!finalBaseUrl,
      });
      setShowBYOMDialog(false);
      resetForm();
    }
  };

  const handleCancel = () => {
    setShowBYOMDialog(false);
    resetForm();
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
    setSelectedProvider('openai');
    setApiKey('');
    setBaseUrl('');
    setSelectedModel(LLM_PROVIDERS.openai.models[0].id);
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

  // Get provider display name from settings
  const getProviderDisplayName = () => {
    if (isLoading) {
      return 'Loading...';
    }

    const isDefault = settings?.providerType === 'narrata_default';
    if (isDefault) {
      return 'Narrata Managed OpenAI';
    }

    // Try to match provider from settings
    const baseUrl = settings?.baseUrl || '';
    for (const [key, config] of Object.entries(LLM_PROVIDERS)) {
      if (baseUrl.includes(config.baseUrl) || (key === 'openai' && !baseUrl)) {
        return config.name;
      }
    }

    return 'Custom Provider';
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
  const providerName = getProviderDisplayName();

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
                <Button onClick={() => setShowBYOMDialog(true)} variant="secondary" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Bring Your Own Model
                </Button>
              ) : (
                <>
                  <Button onClick={() => setShowBYOMDialog(true)} variant="secondary" size="sm">
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
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={selectedProvider}
                onValueChange={(value: ProviderKey) => handleProviderChange(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LLM_PROVIDERS).map(([key, provider]) => (
                    <SelectItem key={key} value={key}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
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

            {showBaseUrl && (
              <div className="space-y-2">
                <Label htmlFor="base-url">Base URL *</Label>
                <Input
                  id="base-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={LLM_PROVIDERS[selectedProvider].baseUrl}
                />
                <p className="text-xs text-muted-foreground">
                  {selectedProvider === 'azure' 
                    ? 'Enter your Azure OpenAI endpoint (e.g., https://YOUR_RESOURCE.openai.azure.com)'
                    : 'Enter the API endpoint URL for your provider'}
                </p>
              </div>
            )}

            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCancel}
                variant="secondary"
                className="flex-1"
                disabled={isSaving || isValidating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!apiKey || isSaving || isValidating || (showBaseUrl && !baseUrl)}
                className="flex-1"
              >
                {isSaving || isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isValidating ? 'Validating...' : 'Saving...'}
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
