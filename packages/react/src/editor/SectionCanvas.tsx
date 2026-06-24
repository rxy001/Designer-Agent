import { Fragment, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Section } from "../components/Section";
import { cn } from "../ui/cn";
import { getSortedTools } from "./pageDocument";
import {
  getActiveToolLayout,
  getToolLayoutChangeForViewport,
  getToolPlacementClassName,
  withToolLayoutClasses,
} from "./toolLayout";
import { ToolRenderer } from "./ToolRenderer";
import type { GridArea, SectionNode, ToolNode, Viewport } from "./types";

type SectionCanvasProps = {
  section: SectionNode;
  selectedToolId?: string;
  viewport: Viewport;
  onSelectSection: (sectionId: string) => void;
  onSelectTool: (toolId: string) => void;
  onClearToolSelection?: () => void;
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
  const rowStart = clamp(
    area.rowStart + rowDelta,
    1,
    section.grid.rows - rowSpan + 1,
  );
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
    rowEnd: clamp(
      area.rowEnd + rowDelta,
      area.rowStart + 1,
      section.grid.rows + 1,
    ),
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

function getActiveSectionGrid(section: SectionNode, viewport: Viewport) {
  if (viewport === "desktop") {
    return {
      ...section.grid,
      ...section.grid.responsive?.tablet,
      ...section.grid.responsive?.desktop,
    };
  }

  if (viewport === "tablet") {
    return {
      ...section.grid,
      ...section.grid.responsive?.tablet,
    };
  }

  return section.grid;
}

export function SectionCanvas({
  section,
  selectedToolId,
  viewport,
  onSelectSection,
  onSelectTool,
  onClearToolSelection,
  onUpdateTool,
}: SectionCanvasProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [dragPreview, setDragPreview] = useState<Record<string, GridArea>>({});
  const sortedTools = getSortedTools(section);
  const activeGrid = getActiveSectionGrid(section, viewport);

  const startDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    tool: ToolNode,
    kind: DragKind,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectTool(tool.id);

    if (tool.locked) return;

    const dragTarget = event.currentTarget;
    const pointerId = event.pointerId;

    dragTarget.setPointerCapture(pointerId);

    const sectionEl = sectionRef.current;
    if (!sectionEl) return;

    const rect = sectionEl.getBoundingClientRect();
    const scaleX = rect.width / sectionEl.clientWidth;
    const scaleY = rect.height / sectionEl.clientHeight;
    const cellWidth =
      (sectionEl.clientWidth - (activeGrid.columns - 1) * activeGrid.columnGap) /
      activeGrid.columns;
    const cellHeight =
      (sectionEl.clientHeight - (activeGrid.rows - 1) * activeGrid.rowGap) /
      activeGrid.rows;
    const columnStep = cellWidth + activeGrid.columnGap;
    const rowStep = cellHeight + activeGrid.rowGap;

    if (
      !Number.isFinite(columnStep) ||
      !Number.isFinite(rowStep) ||
      !Number.isFinite(scaleX) ||
      !Number.isFinite(scaleY)
    ) {
      return;
    }
    if (columnStep <= 0 || rowStep <= 0 || scaleX <= 0 || scaleY <= 0) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const initialArea = getActiveToolLayout(tool, viewport).gridArea;
    let nextArea = initialArea;

    const handleMove = (moveEvent: PointerEvent) => {
      const logicalDeltaX = (moveEvent.clientX - startX) / scaleX;
      const logicalDeltaY = (moveEvent.clientY - startY) / scaleY;
      const columnDelta = Math.round(
        logicalDeltaX / columnStep,
      );
      const rowDelta = Math.round(logicalDeltaY / rowStep);
      const gridArea =
        kind === "move"
          ? moveGridArea(
              initialArea,
              { ...section, grid: activeGrid },
              rowDelta,
              columnDelta,
            )
          : resizeGridArea(
              initialArea,
              { ...section, grid: activeGrid },
              rowDelta,
              columnDelta,
            );

      nextArea = gridArea;
      setDragPreview((current) => ({ ...current, [tool.id]: gridArea }));
    };

    const stop = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);

      if (!isSameGridArea(initialArea, nextArea)) {
        flushSync(() => {
          onUpdateTool(
            tool.id,
            getToolLayoutChangeForViewport(tool, viewport, nextArea),
          );
        });
      }

      if (dragTarget.hasPointerCapture(pointerId)) {
        dragTarget.releasePointerCapture(pointerId);
      }

      setDragPreview((current) => {
        const rest = { ...current };
        delete rest[tool.id];
        return rest;
      });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  return (
    <Section
      id={section.id}
      ref={sectionRef}
      columns={section.grid.columns}
      rows={section.grid.rows}
      columnGap={section.grid.columnGap}
      rowGap={section.grid.rowGap}
      responsive={section.grid.responsive}
      className={section.props?.className}
      onClick={() => {
        onSelectSection(section.id);
        onClearToolSelection?.();
      }}
    >
      {sortedTools.map((tool) => {
        if (tool.hidden) return null;

        const previewArea =
          dragPreview[tool.id] ?? getActiveToolLayout(tool, viewport).gridArea;
        const selected = selectedToolId === tool.id;
        const renderedTool = withToolLayoutClasses(tool, viewport, previewArea);
        const placementClassName = getToolPlacementClassName(
          tool,
          viewport,
          previewArea,
        );

        return (
          <Fragment key={tool.id}>
            <ToolRenderer tool={renderedTool} />
            <div
              className={cn(
                placementClassName,
                "x:group x:relative x:min-h-0 x:min-w-0 x:rounded-md x:outline-offset-2",
                tool.locked ? "x:cursor-default" : "x:cursor-move",
                selected && "x:outline-2 x:outline-blue-500",
              )}
              style={{
                zIndex: getActiveToolLayout(tool, viewport).zIndex + 1000,
              }}
              onClick={(event) => {
                event.stopPropagation();
                onSelectSection(section.id);
                onSelectTool(tool.id);
              }}
              onPointerDown={(event) => startDrag(event, tool, "move")}
            >
              {tool.locked && (
                <div className="x:absolute x:right-2 x:top-2 x:rounded x:bg-neutral-950/80 x:px-2 x:py-1 x:text-[10px] x:font-medium x:text-white">
                  Locked
                </div>
              )}
              {selected && !tool.locked && (
                <div
                  className="x:absolute x:bottom-0 x:right-0 x:z-10 x:h-4 x:w-4 x:cursor-nwse-resize x:rounded-tl x:bg-blue-600"
                  onPointerDown={(event) => startDrag(event, tool, "resize")}
                />
              )}
            </div>
          </Fragment>
        );
      })}
    </Section>
  );
}
