import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { usePrototype } from "@/contexts/PrototypeContext";

export function PrototypeStateBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { prototypeState, setPrototypeState } = usePrototype();
  
  const handleMarketingSite = () => {
    navigate('/');
  };

  // Determine current state based on route and prototype state
  const getCurrentState = () => {
    if (location.pathname === '/') return 'marketing';
    return prototypeState;
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={getCurrentState() === 'marketing' ? 'default' : 'outline'}
            onClick={handleMarketingSite}
            className="h-9"
          >
            Marketing Site
          </Button>
          
          <span className="text-sm text-muted-foreground mx-2">Web App:</span>
          
          <Button
            variant={getCurrentState() === 'new-user' ? 'default' : 'outline'}
            onClick={() => setPrototypeState('new-user')}
            className="h-9"
          >
            New User Onboarding
          </Button>
          
          <Button
            variant={getCurrentState() === 'existing-user' ? 'default' : 'outline'}
            onClick={() => setPrototypeState('existing-user')}
            className="h-9"
          >
            Existing User
          </Button>
        </div>
      </div>
    </div>
  );
}