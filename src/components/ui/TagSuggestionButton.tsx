import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface TagSuggestionButtonProps {
  content: string;
  onTagsSuggested: (tags: string[]) => void;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'tertiary';
  onClick?: () => void;
}

export const TagSuggestionButton = ({
  content,
  onTagsSuggested,
  disabled = false,
  size = 'sm',
  variant = 'outline',
  onClick
}: TagSuggestionButtonProps) => {
  const handleSuggestTags = () => {
    console.log('TagSuggestionButton clicked');
    if (onClick) {
      console.log('Using onClick prop');
      onClick();
    } else {
      console.log('Using onTagsSuggested fallback');
      // Fallback: trigger the parent component's tag suggestion flow
      onTagsSuggested([]);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSuggestTags}
      disabled={disabled}
      className="flex items-center gap-2"
    >
      <Sparkles className="h-4 w-4" />
      Auto-suggest tags
    </Button>
  );
};

// Mock tag suggestion service
const suggestTags = async (content: string): Promise<string[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simple keyword-based tag suggestions
  const keywords = content.toLowerCase();
  const suggestedTags: string[] = [];
  
  // Industry tags
  if (keywords.includes('product') || keywords.includes('pm')) {
    suggestedTags.push('Product Management');
  }
  if (keywords.includes('saas') || keywords.includes('software')) {
    suggestedTags.push('SaaS');
  }
  if (keywords.includes('fintech') || keywords.includes('finance')) {
    suggestedTags.push('Fintech');
  }
  if (keywords.includes('healthcare') || keywords.includes('medical')) {
    suggestedTags.push('Healthcare');
  }
  if (keywords.includes('ecommerce') || keywords.includes('retail')) {
    suggestedTags.push('E-commerce');
  }
  
  // Competency tags
  if (keywords.includes('strategy') || keywords.includes('strategic')) {
    suggestedTags.push('Strategy');
  }
  if (keywords.includes('growth') || keywords.includes('scale')) {
    suggestedTags.push('Growth');
  }
  if (keywords.includes('ux') || keywords.includes('user experience')) {
    suggestedTags.push('UX');
  }
  if (keywords.includes('data') || keywords.includes('analytics')) {
    suggestedTags.push('Data Analytics');
  }
  if (keywords.includes('leadership') || keywords.includes('team')) {
    suggestedTags.push('Leadership');
  }
  if (keywords.includes('launch') || keywords.includes('release')) {
    suggestedTags.push('Product Launch');
  }
  if (keywords.includes('revenue') || keywords.includes('monetization')) {
    suggestedTags.push('Monetization');
  }
  
  // Business model tags
  if (keywords.includes('b2b') || keywords.includes('enterprise')) {
    suggestedTags.push('B2B');
  }
  if (keywords.includes('b2c') || keywords.includes('consumer')) {
    suggestedTags.push('B2C');
  }
  if (keywords.includes('marketplace') || keywords.includes('platform')) {
    suggestedTags.push('Platform');
  }
  
  // Remove duplicates and limit to 5 tags
  return [...new Set(suggestedTags)].slice(0, 5);
};
