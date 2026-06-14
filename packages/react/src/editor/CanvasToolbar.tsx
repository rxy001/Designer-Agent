import {
  AlignCenterIcon,
  MousePointer2Icon,
  Redo2Icon,
  Undo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import { useEditorStore } from "./editorStore";

type CanvasToolbarProps = {
  zoom: number;
  selectedToolId?: string;
  onZoomChange: (zoom: number) => void;
};

export function CanvasToolbar({
  zoom,
  selectedToolId,
  onZoomChange,
}: CanvasToolbarProps) {
  const canUndo = useEditorStore((state) => state.past.length > 0);
  const canRedo = useEditorStore((state) => state.future.length > 0);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  return (
    <div className="flex h-12 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4">
      <div className="flex min-w-0 items-center gap-1">
        <Tooltip label="Select">
          <Button size="icon" variant="secondary">
            <MousePointer2Icon className="h-4 w-4" />
          </Button>
        </Tooltip>
        <div className="mx-1 h-6 w-px bg-neutral-200" />
        <Button size="sm" variant="ghost" disabled={!canUndo} onClick={undo}>
          <Undo2Icon className="h-4 w-4" />
          Undo
        </Button>
        <Button size="sm" variant="ghost" disabled={!canRedo} onClick={redo}>
          <Redo2Icon className="h-4 w-4" />
          Redo
        </Button>
        <Button size="sm" variant="ghost" disabled={!selectedToolId}>
          <AlignCenterIcon className="h-4 w-4" />
          Align
        </Button>
      </div>
      <div className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onZoomChange(Math.max(50, zoom - 10))}
        >
          <ZoomOutIcon className="h-4 w-4" />
        </Button>
        <div className="w-14 text-center text-xs font-medium text-neutral-600">
          {zoom}%
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onZoomChange(Math.min(140, zoom + 10))}
        >
          <ZoomInIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
