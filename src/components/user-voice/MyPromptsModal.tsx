import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserVoice, DEFAULT_VOICE_PROMPT } from '@/types/userVoice';
import { ContentGenerationInstructions, DEFAULT_CONTENT_GENERATION_INSTRUCTIONS } from '@/types/contentGenerationInstructions';
import { ChevronRight, FileText } from 'lucide-react';

interface MyPromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (voice: UserVoice) => void;
  onSaveContentGen?: (instructions: ContentGenerationInstructions) => void;
  initialVoice?: UserVoice;
  initialContentGen?: ContentGenerationInstructions;
}

interface PromptDefinition {
  id: string;
  title: string;
  description: string;
  category: 'content-generation' | 'analysis' | 'matching';
  isEditable: boolean;
  defaultValue: string;
}

// Define all available prompts (MVP: Writing Style + Content Generation Instructions)
const AVAILABLE_PROMPTS: PromptDefinition[] = [
  {
    id: 'writing-style',
    title: 'Writing Style',
    description: 'Define your authentic voice for all generated content',
    category: 'content-generation',
    isEditable: true,
    defaultValue: DEFAULT_VOICE_PROMPT
  },
  {
    id: 'content-generation-instructions',
    title: 'Content Generation Instructions',
    description: 'Customize how stories, role descriptions, and saved sections are generated',
    category: 'content-generation',
    isEditable: true,
    defaultValue: DEFAULT_CONTENT_GENERATION_INSTRUCTIONS
  }
];

export function MyPromptsModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onSaveContentGen,
  initialVoice, 
  initialContentGen 
}: MyPromptsModalProps) {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptDefinition | null>(null);
  const [promptValue, setPromptValue] = useState('');

  // Show list view when modal opens (we have 2+ prompts now)
  useEffect(() => {
    if (isOpen) {
      // Reset to list view every time modal opens
      setView('list');
      setSelectedPrompt(null);
      setPromptValue('');
    } else {
      // Also reset when modal closes
      setView('list');
      setSelectedPrompt(null);
      setPromptValue('');
    }
  }, [isOpen]);

  const handlePromptSelect = (prompt: PromptDefinition) => {
    setSelectedPrompt(prompt);
    // Load current value for this prompt
    if (prompt.id === 'writing-style') {
      setPromptValue(initialVoice?.prompt || prompt.defaultValue);
    } else if (prompt.id === 'content-generation-instructions') {
      setPromptValue(initialContentGen?.prompt || prompt.defaultValue);
    } else {
      setPromptValue(prompt.defaultValue);
    }
    setView('edit');
  };

  const handleSave = () => {
    if (!selectedPrompt) return;
    
    if (selectedPrompt.id === 'writing-style') {
      const voice: UserVoice = {
        prompt: promptValue.trim(),
        lastUpdated: new Date().toISOString()
      };
      onSave(voice);
    } else if (selectedPrompt.id === 'content-generation-instructions' && onSaveContentGen) {
      const instructions: ContentGenerationInstructions = {
        prompt: promptValue.trim(),
        lastUpdated: new Date().toISOString()
      };
      onSaveContentGen(instructions);
    }
    onClose();
  };

  const handleReset = () => {
    if (selectedPrompt) {
      setPromptValue(selectedPrompt.defaultValue);
    }
  };

  const handleBack = () => {
    setView('list');
    setSelectedPrompt(null);
  };

  // List View (for future when there are multiple prompts)
  const renderListView = () => (
    <>
      <DialogHeader>
        <DialogTitle>My Prompts</DialogTitle>
        <DialogDescription>
          Customize prompts to personalize your experience
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Edit the prompts below to customize how Narrata generates content, analyzes your profile, and matches you with opportunities.
        </div>

        <div className="space-y-3">
          {AVAILABLE_PROMPTS.filter(p => p.isEditable).map((prompt) => (
            <Card 
              key={prompt.id}
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors group"
              onClick={() => handlePromptSelect(prompt)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground mt-0.5 transition-colors" />
                    <div>
                      <CardTitle className="text-base group-hover:text-primary-foreground transition-colors">{prompt.title}</CardTitle>
                      <CardDescription className="mt-1 group-hover:text-primary-foreground/80 transition-colors">
                        {prompt.description}
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="bg-muted/30 p-4 rounded-lg">
          <h4 className="font-medium mb-2 text-sm">About Prompts:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Prompts guide the AI in understanding your preferences</li>
            <li>• Each prompt serves a specific purpose in the system</li>
            <li>• You can reset any prompt to its default at any time</li>
            <li>• Changes take effect immediately for new content</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  );

  // Edit View
  const renderEditView = () => {
    if (!selectedPrompt) return null;

    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {AVAILABLE_PROMPTS.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-2"
              >
                ← Back
              </Button>
            )}
            <div>
              <DialogTitle>My Prompts</DialogTitle>
              <DialogDescription>
                {selectedPrompt.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt-editor" className="text-lg font-semibold">
                {selectedPrompt.title}
              </Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleReset}
              >
                Reset to Default
              </Button>
            </div>
            
            <div className="space-y-3">
              <Textarea
                id="prompt-editor"
                placeholder={`Enter your ${selectedPrompt.title.toLowerCase()}...`}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                className="min-h-[300px] resize-none font-mono text-sm"
              />
              <div className="text-sm text-muted-foreground">
                {selectedPrompt.id === 'writing-style' ? (
                  <>This prompt will be used to ensure all generated content matches your authentic writing style.</>
                ) : selectedPrompt.id === 'content-generation-instructions' ? (
                  <>These instructions guide how the AI generates stories, role descriptions, and saved sections. They control structure, length, metric emphasis, and fidelity.</>
                ) : (
                  <>This prompt will be sent to the AI to guide content generation.</>
                )}
              </div>
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {selectedPrompt.id === 'writing-style' ? (
                <>
                  <li>• Your voice is inferred from uploaded content and can be manually edited</li>
                  <li>• This prompt is sent to the LLM to ensure authentic content generation</li>
                  <li>• The more specific you are, the better the AI can match your style</li>
                  <li>• You can update this anytime as your writing evolves</li>
                </>
              ) : selectedPrompt.id === 'content-generation-instructions' ? (
                <>
                  <li>• These instructions control how stories, role descriptions, and saved sections are generated</li>
                  <li>• You can customize structure (STAR format), length, and metric emphasis</li>
                  <li>• Changes take effect immediately for new content generation</li>
                  <li>• Reset to default anytime to restore original behavior</li>
                </>
              ) : (
                <>
                  <li>• This prompt guides how the AI processes your information</li>
                  <li>• Changes take effect immediately for new operations</li>
                  <li>• You can customize the instructions to match your needs</li>
                  <li>• Reset to default anytime to restore original behavior</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {view === 'list' ? renderListView() : renderEditView()}
      </DialogContent>
    </Dialog>
  );
}

// Export with old name for backward compatibility
export { MyPromptsModal as MyVoiceModal };
