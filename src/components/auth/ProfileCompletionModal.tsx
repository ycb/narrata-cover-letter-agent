import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { User } from 'lucide-react';
import { FormModal } from '@/components/shared/FormModal';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export default function ProfileCompletionModal({ isOpen, onComplete }: ProfileCompletionModalProps) {
  const { updateProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await updateProfile({
        full_name: formData.fullName.trim(),
      });
      
      if (error) {
        setError(error.message || 'Failed to update profile');
      } else {
        onComplete();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing without completing profile
      title="Complete Your Profile"
      description="Please provide your name to continue using the application."
      maxWidth="max-w-md"
      showCloseButton={false}
      className="text-center"
    >
      <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <User className="w-6 h-6 text-primary" />
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            placeholder="Enter your full name"
            required
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting || !formData.fullName.trim()}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Updating Profile...
            </>
          ) : (
            'Complete Profile'
          )}
        </Button>
      </form>
    </FormModal>
  );
}
