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

  const handleNewUser = () => {
    navigate('/new-user');
    setPrototypeState('new-user');
  };

  const handleExistingUser = () => {
    navigate('/dashboard');
    setPrototypeState('existing-user');
  };

  // Determine current state based on route and prototype state
  const getCurrentState = () => {
    if (location.pathname === '/') return 'marketing';
    return prototypeState || 'existing-user'; // Default to existing-user if no state set
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 border-t border-gray-600">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-3 text-sm">
          <span className="text-gray-400">
            Viewing:
          </span>
          
          <button
            className={`px-3 py-1 rounded ${
              getCurrentState() === 'marketing' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={handleMarketingSite}
          >
            Marketing Site
          </button>
          
          <button
            className={`px-3 py-1 rounded ${
              getCurrentState() === 'existing-user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={handleExistingUser}
          >
            Existing User
          </button>
          
          <button
            className={`px-3 py-1 rounded ${
              getCurrentState() === 'new-user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={handleNewUser}
          >
            New User Onboarding
          </button>
        </div>
      </div>
    </div>
  );
}