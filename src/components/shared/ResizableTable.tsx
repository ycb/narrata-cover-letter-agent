import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ResizableTableProps {
  children: React.ReactNode;
  className?: string;
}

interface ResizableColumnProps {
  children: React.ReactNode;
  className?: string;
  minWidth?: number;
  defaultWidth?: number;
  onResize?: (width: number) => void;
}

export function ResizableTable({ children, className }: ResizableTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      {children}
    </div>
  );
}

export function ResizableColumn({ 
  children, 
  className, 
  minWidth = 100, 
  defaultWidth = 150,
  onResize 
}: ResizableColumnProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - startX.current;
      const newWidth = Math.max(minWidth, startWidth.current + deltaX);
      setWidth(newWidth);
      onResize?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isResizing, width, minWidth, onResize]);

  return (
    <th 
      className={cn("relative", className)}
      style={{ width: `${width}px`, minWidth: `${minWidth}px` }}
    >
      {children}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize select-none",
          "hover:bg-primary/20 transition-colors",
          isResizing && "bg-primary/40"
        )}
        onMouseDown={handleMouseDown}
        title="Drag to resize column"
      />
    </th>
  );
}

export function ResizableTableHeader({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <thead className={cn("bg-muted/50", className)}>
      {children}
    </thead>
  );
}

export function ResizableTableBody({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <tbody className={className}>
      {children}
    </tbody>
  );
}
