import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SentimentType, CategoryType, FeedbackFormState } from '@/types/feedback';
import { cn } from '@/lib/utils';

interface FeedbackFormProps {
  formState: FeedbackFormState;
  onSubmit: (data: FeedbackFormState) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  onFormDataChange?: (field: string, value: string) => void;
}

const SENTIMENT_OPTIONS: { value: SentimentType; emoji: string; label: string; color: string }[] = [
  { value: 'positive', emoji: '😊', label: 'Positive', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'neutral', emoji: '😐', label: 'Neutral', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 'negative', emoji: '😞', label: 'Negative', color: 'bg-red-100 text-red-800 border-red-200' },
];

const CATEGORY_OPTIONS: { value: CategoryType; label: string; color: string }[] = [
  { value: 'bug', label: 'Bug Report', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'suggestion', label: 'Suggestion', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'praise', label: 'Praise', color: 'bg-green-100 text-green-800 border-green-200' },
];

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  formState,
  onSubmit,
  onCancel,
  isSubmitting,
  onFormDataChange,
}) => {
  const [localState, setLocalState] = useState<FeedbackFormState>(formState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof FeedbackFormState, value: string) => {
    setLocalState(prev => ({ ...prev, [field]: value }));
    
    // Notify parent component of changes
    if (onFormDataChange) {
      onFormDataChange(field, value);
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!localState.message.trim()) {
      newErrors.message = 'Please provide feedback message';
    }

    if (localState.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(localState.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(localState);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Screenshot Preview */}
      {localState.screenshot && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Page Context
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <img
                src={localState.screenshot}
                alt="Page screenshot"
                className="w-full h-32 object-cover rounded-md border"
              />
              {localState.clickLocation && localState.clickLocation.x > 0 && localState.clickLocation.y > 0 && (
                <div
                  className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse"
                  style={{
                    left: `${(localState.clickLocation.x / window.innerWidth) * 100}%`,
                    top: `${(localState.clickLocation.y / window.innerHeight) * 100}%`,
                  }}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Screenshot captured automatically when you selected the area to discuss.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sentiment Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">How do you feel about this?</Label>
        <div className="flex gap-3">
          {SENTIMENT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={localState.sentiment === option.value ? 'default' : 'outline'}
              className={cn(
                'flex-1 h-12 flex-col gap-1',
                localState.sentiment === option.value && option.color
              )}
              onClick={() => handleInputChange('sentiment', option.value)}
            >
              <span className="text-lg">{option.emoji}</span>
              <span className="text-xs">{option.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Category Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">What type of feedback is this?</Label>
        <Select
          value={localState.category}
          onValueChange={(value: CategoryType) => handleInputChange('category', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={option.color}>
                    {option.label}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Message Input */}
      <div className="space-y-3">
        <Label htmlFor="message" className="text-sm font-medium">
          Your feedback
        </Label>
        <Textarea
          id="message"
          placeholder="Tell us what you think, what you'd like to see, or report any issues..."
          value={localState.message}
          onChange={(e) => handleInputChange('message', e.target.value)}
          className="min-h-[100px] resize-none"
          required
        />
        {errors.message && (
          <p className="text-sm text-red-600">{errors.message}</p>
        )}
      </div>

      {/* Email Input */}
      <div className="space-y-3">
        <Label htmlFor="email" className="text-sm font-medium">
          Email (optional)
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={localState.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Including your email helps us act on your feedback. When we launch, you'll also get 1 month of free access!
        </p>
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !localState.message.trim()}
          className="flex-1"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </div>
    </form>
  );
};
