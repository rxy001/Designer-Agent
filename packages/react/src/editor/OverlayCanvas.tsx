import { useState } from "react";
import { Button } from "../ui/Button";
import { GridCanvas } from "./GridCanvas";
import { OverlayRenderer } from "./OverlayRenderer";
import type { OverlayNode } from "./types";
import type { GridCanvasProps } from "./GridCanvas";

type OverlayCanvasProps = GridCanvasProps & {
  overlay: OverlayNode;
  selectedSlot?: string;
  onSelectOverlay: (overlayId: string, slot?: string) => void;
};

export function OverlayCanvas({
  overlay,
  selectedSlot,
  onSelectOverlay,
  ...canvasProps
}: OverlayCanvasProps) {
  const [testing, setTesting] = useState(false);

  return (
    <div className="x:relative x:flex x:min-h-0 x:flex-1 x:flex-col">
      <div className="x:flex x:items-center x:justify-between x:border-b x:border-neutral-200 x:bg-white x:px-4 x:py-2">
        <div className="x:min-w-0 x:text-sm">
          <span className="x:text-neutral-500">Current page / Overlays / </span>
          <span className="x:font-medium">{overlay.name}</span>
        </div>
        <Button size="sm" variant={testing ? "default" : "outline"} onClick={() => setTesting((current) => !current)}>
          {testing ? "Finish testing" : "Test interaction"}
        </Button>
      </div>
      <div className="x:relative x:flex x:min-h-0 x:flex-1 x:overflow-hidden">
        <div className="x:pointer-events-none x:flex x:min-h-0 x:flex-1">
          <GridCanvas {...canvasProps} editingDisabled />
        </div>
        <OverlayRenderer
          overlay={overlay}
          selectedSlot={selectedSlot}
          interactive={testing}
          onSelectSlot={(slot) => onSelectOverlay(overlay.id, slot)}
        />
      </div>
    </div>
  );
}
