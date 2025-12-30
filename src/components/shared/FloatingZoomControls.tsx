import { ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";

type FloatingZoomControlsProps = {
  zoomLevel: number;
  minZoom: number;
  maxZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function FloatingZoomControls({
  zoomLevel,
  minZoom,
  maxZoom,
  onZoomIn,
  onZoomOut
}: FloatingZoomControlsProps) {
  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg px-2 py-1.5 shadow-lg z-50">
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomOut}
        disabled={zoomLevel === minZoom}
        className="h-7 w-7 p-0"
        title="Zoom out (10%)"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-xs font-medium text-muted-foreground px-2 tabular-nums min-w-[3ch] text-center">
        {zoomLevel}%
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomIn}
        disabled={zoomLevel === maxZoom}
        className="h-7 w-7 p-0"
        title="Zoom in (10%)"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
}

