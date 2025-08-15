import { Button } from "@/components/ui/button";

type PrototypeState = 'marketing' | 'new-user' | 'existing-user';

interface PrototypeStateBannerProps {
  currentState: PrototypeState;
  onStateChange: (state: PrototypeState) => void;
}

export function PrototypeStateBanner({
  currentState,
  onStateChange
}: PrototypeStateBannerProps) {
  
  const handleMarketingSite = () => {
    // For now, just set state to marketing - could open new tab in future
    onStateChange('marketing');
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center">
            <Button
              variant={currentState === 'marketing' ? 'default' : 'outline'}
              onClick={handleMarketingSite}
              className="h-9"
            >
              Marketing Site
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Web App:</span>
            
            <Button
              variant={currentState === 'new-user' ? 'default' : 'outline'}
              onClick={() => onStateChange('new-user')}
              className="h-9"
            >
              New User Onboarding
            </Button>
            
            <Button
              variant={currentState === 'existing-user' ? 'default' : 'outline'}
              onClick={() => onStateChange('existing-user')}
              className="h-9"
            >
              Existing User
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}