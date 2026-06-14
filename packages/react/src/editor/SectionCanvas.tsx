import { useRef, useState } from "react";
import { cn } from "../ui/cn";
import { getSortedTools } from "./pageDocument";
import { ToolRenderer } from "./ToolRenderer";
import type { GridArea, SectionNode, ToolNode, Viewport } from "./types";

type SectionCanvasProps = {
  section: SectionNode;
  selectedToolId?: string;
  viewport: Viewport;
  zoom: number;
  onSelectTool: (toolId: string) => void;
  onClearToolSelection?: () => void;
  onResizeSection: (height: number) => void;
  onUpdateTool: (toolId: string, changes: Partial<ToolNode>) => void;
};

type DragKind = "move" | "resize";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function moveGridArea(
  area: GridArea,
  section: SectionNode,
  rowDelta: number,
  columnDelta: number,
) {
  const rowSpan = area.rowEnd - area.rowStart;
  const columnSpan = area.columnEnd - area.columnStart;
  const rowStart = clamp(area.rowStart + rowDelta, 1, section.grid.rows - rowSpan + 1);
  const columnStart = clamp(
    area.columnStart + columnDelta,
    1,
    section.grid.columns - columnSpan + 1,
  );

  return {
    rowStart,
    columnStart,
    rowEnd: rowStart + rowSpan,
    columnEnd: columnStart + columnSpan,
  };
}

function resizeGridArea(
  area: GridArea,
  section: SectionNode,
  rowDelta: number,
  columnDelta: number,
) {
  return {
    ...area,
    rowEnd: clamp(area.rowEnd + rowDelta, area.rowStart + 1, section.grid.rows + 1),
    columnEnd: clamp(
      area.columnEnd + columnDelta,
      area.columnStart + 1,
      section.grid.columns + 1,
    ),
  };
}

function isSameGridArea(first: GridArea, second: GridArea) {
  return (
    first.rowStart === second.rowStart &&
    first.columnStart === second.columnStart &&
    first.rowEnd === second.rowEnd &&
    first.columnEnd === second.columnEnd
  );
}

export function SectionCanvas({
  section,
  selectedToolId,
  viewport,
  zoom,
  onSelectTool,
  onClearToolSelection,
  onResizeSection,
  onUpdateTool,
}: SectionCanvasProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [dragPreview, setDragPreview] = useState<Record<string, GridArea>>({});
  const [sectionHeightPreview, setSectionHeightPreview] = useState<number>();
  const isMobile = viewport === "mobile";
  const sortedTools = getSortedTools(section);

  const startDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    tool: ToolNode,
    kind: DragKind,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectTool(tool.id);

    if (tool.locked) return;

    const sectionEl = sectionRef.current;
    if (!sectionEl) return;

    const rect = sectionEl.getBoundingClientRect();
    const cellWidth =
      (rect.width - (section.grid.columns - 1) * section.grid.columnGap) /
      section.grid.columns;
    const cellHeight =
      (rect.height - (section.grid.rows - 1) * section.grid.rowGap) /
      section.grid.rows;
    const startX = event.clientX;
    const startY = event.clientY;
    const initialArea = tool.layout.gridArea;
    let nextArea = initialArea;

    const handleMove = (moveEvent: PointerEvent) => {
      const columnDelta = Math.round((moveEvent.clientX - startX) / cellWidth);
      const rowDelta = Math.round((moveEvent.clientY - startY) / cellHeight);
      const gridArea =
        kind === "move"
          ? moveGridArea(initialArea, section, rowDelta, columnDelta)
          : resizeGridArea(initialArea, section, rowDelta, columnDelta);

      nextArea = gridArea;
      setDragPreview((current) => ({ ...current, [tool.id]: gridArea }));
    };

    const stop = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      setDragPreview((current) => {
        const rest = { ...current };
        delete rest[tool.id];
        return rest;
      });

      if (isSameGridArea(initialArea, nextArea)) return;

      onUpdateTool(tool.id, {
        layout: {
          ...tool.layout,
          gridArea: nextArea,
        },
      } as Partial<ToolNode>);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  const startSectionResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const sectionEl = sectionRef.current;
    if (!sectionEl) return;

    const startY = event.clientY;
    const zoomScale = zoom / 100;
    const startHeight = section.layout?.height ?? 680;
    let nextHeight = startHeight;

    const handleMove = (moveEvent: PointerEvent) => {
      const logicalDeltaY = (moveEvent.clientY - startY) / zoomScale;
      nextHeight = Math.max(280, Math.round(startHeight + logicalDeltaY));
      setSectionHeightPreview(nextHeight);
    };

    const stop = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      setSectionHeightPreview(undefined);

      if (Math.round(startHeight) !== nextHeight) {
        onResizeSection(nextHeight);
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  if (isMobile) {
    return (
      <section className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4">
        {sortedTools.map((tool) => {
          if (tool.hidden) return null;

          return (
            <div
              key={tool.id}
              className={cn(
                "relative min-h-10 rounded-md outline-offset-2",
                selectedToolId === tool.id && "outline-2 outline-blue-500",
              )}
              onClick={() => onSelectTool(tool.id)}
            >
              <ToolRenderer tool={tool} />
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative grid w-full overflow-hidden rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
      style={{
        height: `${sectionHeightPreview ?? section.layout?.height ?? 680}px`,
        gridTemplateColumns: `repeat(${section.grid.columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${section.grid.rows}, minmax(0, 1fr))`,
        columnGap: `${section.grid.columnGap}px`,
        rowGap: `${section.grid.rowGap}px`,
      }}
      onClick={() => onClearToolSelection?.()}
    >
      {sortedTools.map((tool) => {
        if (tool.hidden) return null;

        const previewArea = dragPreview[tool.id] ?? tool.layout.gridArea;
        const { rowStart, columnStart, rowEnd, columnEnd } = previewArea;
        const selected = selectedToolId === tool.id;

        return (
          <div
            key={tool.id}
            className={cn(
              "group relative min-h-0 min-w-0 overflow-hidden rounded-md outline-offset-2",
              tool.locked ? "cursor-default" : "cursor-move",
              selected && "outline-2 outline-blue-500",
            )}
            style={{
              gridArea: `${rowStart} / ${columnStart} / ${rowEnd} / ${columnEnd}`,
              zIndex: tool.layout.zIndex,
            }}
            onClick={(event) => {
              event.stopPropagation();
              onSelectTool(tool.id);
            }}
            onPointerDown={(event) => startDrag(event, tool, "move")}
          >
            <ToolRenderer tool={tool} />
            {tool.locked && (
              <div className="absolute right-2 top-2 rounded bg-neutral-950/80 px-2 py-1 text-[10px] font-medium text-white">
                Locked
              </div>
            )}
            {selected && !tool.locked && (
              <div
                className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize rounded-tl bg-blue-600"
                onPointerDown={(event) => startDrag(event, tool, "resize")}
              />
            )}
          </div>
        );
      })}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex h-4 cursor-row-resize items-end justify-center"
        onPointerDown={startSectionResize}
        title="Resize section height"
      >
        <div className="mb-1 h-1 w-12 rounded-full bg-neutral-300 transition-colors hover:bg-blue-500" />
      </div>
    </section>
  );
}
