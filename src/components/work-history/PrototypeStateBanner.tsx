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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t-2 border-orange-400 shadow-2xl">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-3">
          {/* Prototype indicator */}
          <div className="flex items-center gap-2 text-orange-400 font-mono text-xs">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
            PROTOTYPE CONTROLS
          </div>
          
          <div className="w-px h-6 bg-slate-600"></div>
          
          <button
            className={`px-4 py-2 text-sm font-mono border transition-colors ${
              getCurrentState() === 'marketing' 
                ? 'bg-orange-500 text-white border-orange-500' 
                : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
            }`}
            onClick={handleMarketingSite}
          >
            Marketing Site
          </button>
          
          <div className="text-slate-500 font-mono text-sm">Web App:</div>
          
          <button
            className={`px-4 py-2 text-sm font-mono border transition-colors ${
              getCurrentState() === 'new-user' 
                ? 'bg-orange-500 text-white border-orange-500' 
                : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
            }`}
            onClick={() => setPrototypeState('new-user')}
          >
            New User Onboarding
          </button>
          
          <button
            className={`px-4 py-2 text-sm font-mono border transition-colors ${
              getCurrentState() === 'existing-user' 
                ? 'bg-orange-500 text-white border-orange-500' 
                : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
            }`}
            onClick={() => setPrototypeState('existing-user')}
          >
            Existing User
          </button>
          
          <div className="w-px h-6 bg-slate-600"></div>
          
          <div className="text-slate-500 font-mono text-xs">
            v0.1.0-demo
          </div>
        </div>
      </div>
    </div>
  );
}