import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

const DEMO_SLUG_STORAGE_KEY = 'narrata_demo_slug';

export function DemoBanner() {
  const { isDemo } = useAuth();

  if (!isDemo) return null;

  const handleSignup = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      localStorage.removeItem(DEMO_SLUG_STORAGE_KEY);
    } catch {
      // ignore
    }
    window.location.assign('/signup');
  };

  const handleFeedback = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('narrata:open-feedback'));
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-orange-700 bg-orange-500 text-black">
      <div className="container mx-auto px-4 py-3 text-sm grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center">
        <div className="text-left">You are viewing a read-only public demo.</div>
        <div className="flex items-center justify-start gap-2 sm:justify-center">
          <Button
            variant="secondary"
            size="sm"
            className="bg-black text-white hover:bg-black/90"
            onClick={handleSignup}
          >
            Sign up
          </Button>
          <span>for the complete experience</span>
        </div>
        <div className="flex justify-start sm:justify-end">
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
            onClick={handleFeedback}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Provide Feedback
          </Button>
        </div>
      </div>
    </div>
  );
}
