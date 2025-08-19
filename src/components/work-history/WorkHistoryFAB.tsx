import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Building2, 
  User, 
  FileText, 
  Link,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { WorkHistoryCompany, WorkHistoryRole } from "@/types/workHistory";

interface WorkHistoryFABProps {
  selectedCompany: WorkHistoryCompany | null;
  selectedRole: WorkHistoryRole | null;
  onAddCompany?: () => void;
  onAddRole?: () => void;
  onAddStory?: () => void;
  onAddLink?: () => void;
}

export const WorkHistoryFAB = ({
  selectedCompany,
  selectedRole,
  onAddCompany,
  onAddRole,
  onAddStory,
  onAddLink
}: WorkHistoryFABProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getContextualActions = () => {
    const actions = [];

    // Always show Add Company
    if (onAddCompany) {
      actions.push({
        id: 'company',
        label: 'Add Company',
        icon: Building2,
        onClick: () => {
          onAddCompany();
          setIsOpen(false);
        }
      });
    }

    // Show Add Role if a company is selected
    if (selectedCompany && onAddRole) {
      actions.push({
        id: 'role',
        label: 'Add Role',
        icon: User,
        onClick: () => {
          onAddRole();
          setIsOpen(false);
        }
      });
    }

    // Show Add Story/Link if a role is selected
    if (selectedRole) {
      if (onAddStory) {
        actions.push({
          id: 'story',
          label: 'Add Story',
          icon: FileText,
          onClick: () => {
            onAddStory();
            setIsOpen(false);
          }
        });
      }

      if (onAddLink) {
        actions.push({
          id: 'link',
          label: 'Add Link',
          icon: Link,
          onClick: () => {
            onAddLink();
            setIsOpen(false);
          }
        });
      }
    }

    return actions;
  };

  const actions = getContextualActions();

  if (actions.length === 0) {
    return null;
  }

  // If only one action, show a simple button
  if (actions.length === 1) {
    const action = actions[0];
    const Icon = action.icon;
    
    return (
      <Button
        onClick={action.onClick}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg lg:hidden"
        size="icon"
      >
        <Icon className="h-6 w-6" />
        <span className="sr-only">{action.label}</span>
      </Button>
    );
  }

  // Multiple actions - show action sheet
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg lg:hidden"
          size="icon"
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Add</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[60vh]">
        <SheetHeader>
          <SheetTitle>Add New</SheetTitle>
        </SheetHeader>
        <div className="space-y-2 pt-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="ghost"
                className="w-full justify-start h-auto py-4"
                onClick={action.onClick}
              >
                <Icon className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">{action.label}</div>
                  {action.id === 'role' && selectedCompany && (
                    <div className="text-sm text-muted-foreground">
                      to {selectedCompany.name}
                    </div>
                  )}
                  {action.id === 'story' && selectedRole && (
                    <div className="text-sm text-muted-foreground">
                      to {selectedRole.title}
                    </div>
                  )}
                  {action.id === 'link' && selectedRole && (
                    <div className="text-sm text-muted-foreground">
                      to {selectedRole.title}
                    </div>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
