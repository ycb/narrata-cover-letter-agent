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

interface SyntheticUserSelectorProps {
  className?: string;
}

export const SyntheticUserSelector: React.FC<SyntheticUserSelectorProps> = ({ className }) => {
  const [context, setContext] = useState<SyntheticUserContext>({
    currentUser: null,
    availableUsers: [],
    isSyntheticTestingEnabled: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const syntheticUserService = new SyntheticUserService();

  useEffect(() => {
    loadSyntheticUserContext();
  }, []);

  const loadSyntheticUserContext = async () => {
    try {
      const context = await syntheticUserService.getSyntheticUserContext();
      setContext(context);
    } catch (error) {
      console.error('Error loading synthetic user context:', error);
    }
  };

  const handleSwitchUser = async (profileId: string) => {
    setIsLoading(true);
    try {
      const result = await syntheticUserService.switchSyntheticUser(profileId);
      if (result.success) {
        // Reload context to get updated current user
        await loadSyntheticUserContext();
        // Trigger a page refresh to clear any cached data
        window.location.reload();
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

  // Don't render if synthetic testing is not enabled
  if (!context.isSyntheticTestingEnabled) {
    return null;
  }

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
              Switch between test personas
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
                    {user.profileName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {user.profileName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Profile {user.profileId}
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
