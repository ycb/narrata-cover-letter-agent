// Synthetic user selector component for admin testing
import React, { useState, useEffect } from 'react';
import { SyntheticUserService, SyntheticUserContext } from '../../services/syntheticUserService';
import { Button } from '../ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '../ui/dropdown-menu';
import { ChevronDown, User, Users } from 'lucide-react';
import { getSyntheticLocalOnlyFlag } from '../../utils/storage';

interface SyntheticUserSelectorProps {
  className?: string;
}

export const SyntheticUserSelector: React.FC<SyntheticUserSelectorProps> = ({ className }) => {
  const [context, setContext] = useState<SyntheticUserContext>({
    currentUser: null,
    availableUsers: [],
    isSyntheticTestingEnabled: false
  });
  const [isLocalOnly] = useState<boolean>(getSyntheticLocalOnlyFlag());
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isContextLoading, setIsContextLoading] = useState(true);

  const syntheticUserService = new SyntheticUserService();

  useEffect(() => {
    loadSyntheticUserContext();
  }, []);

  const loadSyntheticUserContext = async () => {
    setIsContextLoading(true);
    const startTime = Date.now();
    try {
      console.log('[SyntheticUserSelector] Loading synthetic user context...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Context loading timeout after 10 seconds')), 10000);
      });
      
      const contextPromise = syntheticUserService.getSyntheticUserContext();
      const context = await Promise.race([contextPromise, timeoutPromise]) as SyntheticUserContext;
      
      const loadTime = Date.now() - startTime;
      console.log(`[SyntheticUserSelector] Context loaded in ${loadTime}ms:`, {
        enabled: context.isSyntheticTestingEnabled,
        currentUser: context.currentUser?.profileId,
        availableUsers: context.availableUsers.length,
        fullContext: context
      });
      
      if (!context.isSyntheticTestingEnabled) {
        console.warn('[SyntheticUserSelector] Synthetic testing is DISABLED - component will not render');
      } else {
        console.log('[SyntheticUserSelector] Synthetic testing is ENABLED - component will render');
      }
      
      setContext(context);
      try {
        if (context.currentUser?.profileId) {
          localStorage.setItem('synthetic_active_profile_id', context.currentUser.profileId);
        } else {
          localStorage.removeItem('synthetic_active_profile_id');
        }
      } catch {}
    } catch (error) {
      const loadTime = Date.now() - startTime;
      console.error(`[SyntheticUserSelector] Error loading synthetic user context (after ${loadTime}ms):`, error);
      console.error('[SyntheticUserSelector] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      // Set context to disabled state on error so component can render (or not render) properly
      setContext({
        currentUser: null,
        availableUsers: [],
        isSyntheticTestingEnabled: false
      });
    } finally {
      const totalTime = Date.now() - startTime;
      console.log(`[SyntheticUserSelector] Finished loading context (total time: ${totalTime}ms)`);
      setIsContextLoading(false);
    }
  };

  const handleSwitchUser = async (profileId: string) => {
    setIsLoading(true);
    try {
      const result = await syntheticUserService.switchSyntheticUser(profileId);
      if (result.success) {
        // Reload context to get updated current user
        await loadSyntheticUserContext();
        if (!isLocalOnly) {
          // Trigger a page refresh to clear any cached data when using shared RPC mode
          window.location.reload();
        }
      } else {
        console.error('Failed to switch synthetic user:', result.error);
      }
    } catch (error) {
      console.error('Error switching synthetic user:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  // Show nothing while loading (prevents flash of empty content)
  if (isContextLoading) {
    console.log('[SyntheticUserSelector] Still loading context...');
    return null;
  }

  // Don't render if synthetic testing is not enabled (after context has loaded)
  if (!context.isSyntheticTestingEnabled) {
    console.warn('[SyntheticUserSelector] Not rendering - synthetic testing disabled');
    console.warn('[SyntheticUserSelector] Context state:', {
      isContextLoading,
      isSyntheticTestingEnabled: context.isSyntheticTestingEnabled,
      hasCurrentUser: !!context.currentUser,
      availableUsersCount: context.availableUsers.length
    });
    return null;
  }

  console.log('[SyntheticUserSelector] Rendering component - synthetic testing is enabled');

  return (
    <div className={className}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-left font-normal"
            disabled={isLoading}
          >
            <User className="mr-2 h-4 w-4" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {context.currentUser ? context.currentUser.profileName : 'No Profile'}
              </span>
              <span className="text-xs text-muted-foreground">
                {context.currentUser ? `Profile ${context.currentUser.profileId}` : 'Select Profile'}
              </span>
            </div>
            <ChevronDown className="ml-auto h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">Synthetic Testing</p>
            <p className="text-xs text-muted-foreground">
              {isLocalOnly ? 'Switch personas (local to this browser)' : 'Switch between test personas'}
            </p>
          </div>
          <DropdownMenuSeparator />
          {context.availableUsers.map((user) => (
            <DropdownMenuItem
              key={user.profileId}
              onClick={() => handleSwitchUser(user.profileId)}
              disabled={isLoading || user.isActive}
              className="flex items-center space-x-2"
            >
              <div className="flex items-center space-x-2 flex-1">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {user.profileName ? user.profileName.split(' ').map(n => n[0]).join('') : '??'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {user.profileName || 'Unknown Profile'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Profile {user.profileId || '??'}
                  </span>
                </div>
              </div>
              {user.isActive && (
                <div className="w-2 h-2 rounded-full bg-green-500" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5">
            <p className="text-xs text-muted-foreground">
              {context.availableUsers.length} profiles available
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
