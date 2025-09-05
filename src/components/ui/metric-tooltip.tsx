import React, { useState, useRef, useEffect } from 'react';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  description?: string;
}

export interface TooltipSection {
  title: string;
  items: ChecklistItem[];
  description?: string;
}

interface MetricTooltipProps {
  children: React.ReactNode;
  title: string;
  sections: TooltipSection[];
  className?: string;
  disabled?: boolean;
}

export function MetricTooltip({ 
  children, 
  title, 
  sections, 
  className,
  disabled = false 
}: MetricTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current && 
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Dynamic positioning
  useEffect(() => {
    if (isOpen && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Reset positioning classes
      tooltip.className = tooltip.className.replace(/tooltip-(top|bottom|left|right)/g, '');
      
      // Determine best position
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = viewportWidth - rect.left;
      const spaceLeft = rect.left;
      
      if (spaceBelow >= 300 || spaceBelow > spaceAbove) {
        // Position below
        tooltip.classList.add('tooltip-bottom');
        tooltip.style.top = `${rect.bottom + 8}px`;
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.transform = 'translateX(0)';
      } else if (spaceAbove >= 300) {
        // Position above
        tooltip.classList.add('tooltip-top');
        tooltip.style.top = `${rect.top - 8}px`;
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.transform = 'translateX(0) translateY(-100%)';
      } else if (spaceRight >= 400) {
        // Position to the right
        tooltip.classList.add('tooltip-right');
        tooltip.style.top = `${rect.top}px`;
        tooltip.style.left = `${rect.right + 8}px`;
        tooltip.style.transform = 'translateY(0)';
      } else {
        // Position to the left
        tooltip.classList.add('tooltip-left');
        tooltip.style.top = `${rect.top}px`;
        tooltip.style.left = `${rect.left - 8}px`;
        tooltip.style.transform = 'translateX(-100%) translateY(0)';
      }
    }
  }, [isOpen]);

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionTitle)) {
        newSet.delete(sectionTitle);
      } else {
        newSet.add(sectionTitle);
      }
      return newSet;
    });
  };

  const handleTriggerClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleTriggerHover = () => {
    if (!disabled && window.innerWidth >= 768) { // Desktop hover
      setIsOpen(true);
    }
  };

  const handleTriggerLeave = () => {
    if (!disabled && window.innerWidth >= 768) { // Desktop hover
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={handleTriggerClick}
        onMouseEnter={handleTriggerHover}
        onMouseLeave={handleTriggerLeave}
        className={cn(
          "cursor-pointer transition-colors",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        {children}
      </div>

      {isOpen && (
        <div
          ref={tooltipRef}
          className={cn(
            "fixed z-50 w-80 max-w-sm bg-background border rounded-lg shadow-lg p-4",
            "tooltip-bottom" // Default class, will be overridden by positioning logic
          )}
          style={{
            position: 'fixed',
            zIndex: 50,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-foreground">{title}</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-2">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center justify-between w-full text-left hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
                >
                  <div>
                    <h4 className="font-medium text-xs text-foreground">{section.title}</h4>
                    {section.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                    )}
                  </div>
                  {expandedSections.has(section.title) ? (
                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>

                {/* Section Items */}
                {expandedSections.has(section.title) && (
                  <div className="space-y-1.5 pl-2">
                    {section.items.map((item) => (
                      <div key={item.id} className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          {item.checked ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <div className="h-3 w-3 border border-muted-foreground rounded-sm" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            "text-xs",
                            item.checked ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {item.label}
                          </span>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
