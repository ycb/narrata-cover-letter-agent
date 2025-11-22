/**
 * SectionInsertButton
 *
 * Visual divider with "+ Add Section" button for inserting content between sections
 * Used in cover letter editing to add sections from library
 */

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SectionInsertButtonProps {
  onClick: () => void;
  className?: string;
}

export function SectionInsertButton({ onClick, className }: SectionInsertButtonProps) {
  return (
    <div className={cn("relative h-12 flex items-center justify-center group", className)}>
      {/* Divider line */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border group-hover:bg-primary/30 transition-colors" />

      {/* Add Section Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className="relative z-10 bg-background border border-dashed border-border group-hover:border-primary/50 group-hover:bg-primary/5 transition-all"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Section
      </Button>
    </div>
  );
}
