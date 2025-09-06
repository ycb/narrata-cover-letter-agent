import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserVoice, DEFAULT_VOICE_PROMPT } from '@/types/userVoice';

interface MyVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (voice: UserVoice) => void;
  initialVoice?: UserVoice;
}

export function MyVoiceModal({ isOpen, onClose, onSave, initialVoice }: MyVoiceModalProps) {
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (initialVoice) {
      setPrompt(initialVoice.prompt);
    } else {
      setPrompt(DEFAULT_VOICE_PROMPT);
    }
  }, [initialVoice]);

  const handleSave = () => {
    const voice: UserVoice = {
      prompt: prompt.trim(),
      lastUpdated: new Date().toISOString()
    };
    onSave(voice);
    onClose();
  };

  const handleReset = () => {
    setPrompt(DEFAULT_VOICE_PROMPT);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>My Voice</DialogTitle>
          <DialogDescription>
            Define your writing style to ensure content creation is authentic to your voice
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="voice-prompt" className="text-lg font-semibold">
                Writing Style Prompt
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
                id="voice-prompt"
                placeholder="Describe your writing style..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[300px] resize-none"
              />
              <div className="text-sm text-muted-foreground">
                This prompt will be used to ensure all generated content matches your authentic writing style.
              </div>
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Your voice is inferred from uploaded content and can be manually edited</li>
              <li>• This prompt is sent to the LLM to ensure authentic content generation</li>
              <li>• The more specific you are, the better the AI can match your style</li>
              <li>• You can update this anytime as your writing evolves</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Voice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
