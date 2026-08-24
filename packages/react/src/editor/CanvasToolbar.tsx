import {
  AlignCenterIcon,
  MousePointer2Icon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
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
  inspectorOpen: boolean;
  onZoomChange: (zoom: number) => void;
  onInspectorOpenChange: (open: boolean) => void;
  editingDisabled?: boolean;
};

export function CanvasToolbar({
  zoom,
  selectedToolId,
  inspectorOpen,
  onZoomChange,
  onInspectorOpenChange,
  editingDisabled = false,
}: CanvasToolbarProps) {
  const canUndo = useEditorStore((state) => state.past.length > 0);
  const canRedo = useEditorStore((state) => state.future.length > 0);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  return (
    <div className="x:flex x:h-12 x:items-center x:justify-between x:gap-3 x:border-b x:border-neutral-200 x:bg-white x:px-4">
      <div className="x:flex x:min-w-0 x:items-center x:gap-1">
        <Tooltip label="Select">
          <Button size="icon" variant="secondary">
            <MousePointer2Icon className="x:h-4 x:w-4" />
          </Button>
        </Tooltip>
        <div className="x:mx-1 x:h-6 x:w-px x:bg-neutral-200" />
        <Button size="sm" variant="ghost" disabled={editingDisabled || !canUndo} onClick={undo}>
          <Undo2Icon className="x:h-4 x:w-4" />
          Undo
        </Button>
        <Button size="sm" variant="ghost" disabled={editingDisabled || !canRedo} onClick={redo}>
          <Redo2Icon className="x:h-4 x:w-4" />
          Redo
        </Button>
        <Button size="sm" variant="ghost" disabled={editingDisabled || !selectedToolId}>
          <AlignCenterIcon className="x:h-4 x:w-4" />
          Align
        </Button>
      </div>
      <div className="x:flex x:items-center x:gap-2">
        <div className="x:flex x:items-center x:gap-1 x:rounded-md x:border x:border-neutral-200 x:bg-white x:p-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onZoomChange(Math.max(50, zoom - 10))}
          >
            <ZoomOutIcon className="x:h-4 x:w-4" />
          </Button>
          <div className="x:w-14 x:text-center x:text-xs x:font-medium x:text-neutral-600">
            {zoom}%
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onZoomChange(Math.min(140, zoom + 10))}
          >
            <ZoomInIcon className="x:h-4 x:w-4" />
          </Button>
        </div>
        <Tooltip label={inspectorOpen ? "Close inspector" : "Open inspector"}>
          <Button
            size="icon"
            variant={inspectorOpen ? "secondary" : "outline"}
            aria-label={inspectorOpen ? "Close inspector" : "Open inspector"}
            aria-pressed={inspectorOpen}
            onClick={() => onInspectorOpenChange(!inspectorOpen)}
          >
            {inspectorOpen ? (
              <PanelRightCloseIcon className="x:h-4 x:w-4" />
            ) : (
              <PanelRightOpenIcon className="x:h-4 x:w-4" />
            )}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
