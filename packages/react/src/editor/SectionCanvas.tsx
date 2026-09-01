import { Fragment, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { PlusIcon, SearchIcon } from "lucide-react";
import { MIN_SECTION_HEIGHT } from "@designer-agent/site-contract";
import { Section } from "../components/Section";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Popover, PopoverContent } from "../ui/Popover";
import { cn } from "../ui/cn";
import { addableToolTypes, getSortedTools, overlayTypes } from "./pageDocument";
import {
  getActiveToolLayout,
  getToolLayoutChangeForViewport,
  getToolPlacementClassName,
  withToolLayoutClasses,
} from "./toolLayout";
import { ToolRenderer } from "./ToolRenderer";
import type { GridArea, OverlayNode, SectionNode, ToolNode, Viewport } from "./types";

type SectionCanvasProps = {
  section: SectionNode;
  selected: boolean;
  selectedToolIds: ReadonlySet<string>;
  viewport: Viewport;
  onSelectSection: (sectionId: string) => void;
  onSelectTool: (toolId: string) => void;
  onAddSection: () => void;
  onAddTool: (type: ToolNode["type"]) => void;
  onAddOverlay: (type: OverlayNode["type"]) => void;
  onUpdateSection: (sectionId: string, changes: Partial<SectionNode>) => void;
  onUpdateTool: (toolId: string, changes: Partial<ToolNode>) => void;
  allowNavbar?: boolean;
  editingDisabled?: boolean;
};

type DragKind = "move" | "resize";

const nonNavbarToolTypes = addableToolTypes.filter(
  (type) => type !== "navbar",
);

function formatToolType(type: ToolNode["type"]) {
  return `${type[0].toUpperCase()}${type.slice(1)}`;
}

function formatOverlayType(type: OverlayNode["type"]) {
  return type
    .split("-")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

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

function getSectionHeightChangeForViewport(
  section: SectionNode,
  viewport: Viewport,
  height: number,
): Partial<SectionNode> {
  if (viewport === "desktop") {
    return {
      grid: {
        ...section.grid,
        height,
      },
    };
  }

  const breakpoint = viewport === "tablet" ? "tablet" : "mobile";

  return {
    grid: {
      ...section.grid,
      responsive: {
        ...section.grid.responsive,
        [breakpoint]: {
          ...section.grid.responsive?.[breakpoint],
          height,
        },
      },
    },
  };
}

function getActiveSectionGrid(section: SectionNode, viewport: Viewport) {
  if (viewport === "desktop") {
    return section.grid;
  }

  if (viewport === "tablet") {
    return {
      ...section.grid,
      ...section.grid.responsive?.tablet,
    };
  }

  return {
    ...section.grid,
    ...section.grid.responsive?.tablet,
    ...section.grid.responsive?.mobile,
  };
}

export function SectionCanvas({
  section,
  selected,
  selectedToolIds,
  viewport,
  onSelectSection,
  onSelectTool,
  onAddSection,
  onAddTool,
  onAddOverlay,
  onUpdateSection,
  onUpdateTool,
  allowNavbar = false,
  editingDisabled = false,
}: SectionCanvasProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const [dragPreview, setDragPreview] = useState<Record<string, GridArea>>({});
  const [heightPreview, setHeightPreview] = useState<number>();
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [toolQuery, setToolQuery] = useState("");
  const sortedTools = getSortedTools(section);
  const activeGrid = getActiveSectionGrid(section, viewport);
  const activeHeight = heightPreview ?? activeGrid.height ?? 720;
  const availableToolTypes = allowNavbar
    ? addableToolTypes
    : nonNavbarToolTypes;
  const normalizedToolQuery = toolQuery.trim().toLowerCase();
  const compactToolQuery = normalizedToolQuery.replaceAll(/[-\s]/g, "");
  const visibleToolTypes = normalizedToolQuery
    ? availableToolTypes.filter((type) =>
        type.includes(normalizedToolQuery),
      )
    : availableToolTypes;
  const visibleOverlayTypes = normalizedToolQuery
    ? overlayTypes.filter((type) =>
        type.replaceAll("-", "").includes(compactToolQuery),
      )
    : overlayTypes;

  useEffect(() => {
    if (!addMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!addMenuRef.current?.contains(event.target as Node)) {
        setAddMenuOpen(false);
        setToolQuery("");
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAddMenuOpen(false);
        setToolQuery("");
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [addMenuOpen]);

  const getToolIdAtPoint = (clientX: number, clientY: number) => {
    const sectionEl = sectionRef.current;
    if (!sectionEl) return undefined;

    const toolOverlays = Array.from(
      sectionEl.querySelectorAll<HTMLElement>("[data-editor-tool-id]"),
    );
    const hitOverlays = toolOverlays.filter((overlay) => {
      const rect = overlay.getBoundingClientRect();

      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    });

    hitOverlays.sort((first, second) => {
      const firstZIndex = Number.parseFloat(getComputedStyle(first).zIndex);
      const secondZIndex = Number.parseFloat(getComputedStyle(second).zIndex);

      return (
        (Number.isFinite(firstZIndex) ? firstZIndex : 0) -
        (Number.isFinite(secondZIndex) ? secondZIndex : 0)
      );
    });

    return hitOverlays.at(-1)?.dataset.editorToolId;
  };

  const startDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    tool: ToolNode,
    kind: DragKind,
  ) => {
    if (editingDisabled) return;
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
      (sectionEl.clientWidth -
        (activeGrid.columns - 1) * activeGrid.columnGap) /
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
      const columnDelta = Math.round(logicalDeltaX / columnStep);
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

  const startHeightDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (editingDisabled) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectSection(section.id);

    const dragTarget = event.currentTarget;
    const pointerId = event.pointerId;
    dragTarget.setPointerCapture(pointerId);

    const sectionEl = sectionRef.current;
    const rect = sectionEl?.getBoundingClientRect();
    const scaleY =
      rect && sectionEl && sectionEl.clientHeight > 0
        ? rect.height / sectionEl.clientHeight
        : 1;
    const startY = event.clientY;
    const initialHeight = activeHeight;
    let nextHeight = initialHeight;

    const handleMove = (moveEvent: PointerEvent) => {
      const logicalDeltaY = (moveEvent.clientY - startY) / scaleY;
      nextHeight = Math.max(
        MIN_SECTION_HEIGHT,
        Math.round(initialHeight + logicalDeltaY),
      );
      setHeightPreview(nextHeight);
    };

    const stop = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);

      if (nextHeight !== initialHeight) {
        flushSync(() => {
          onUpdateSection(
            section.id,
            getSectionHeightChangeForViewport(section, viewport, nextHeight),
          );
        });
      }

      if (dragTarget.hasPointerCapture(pointerId)) {
        dragTarget.releasePointerCapture(pointerId);
      }

      setHeightPreview(undefined);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  return (
    <div
      className={cn(
        "x:group/section x:relative x:p-2",
        "x:rounded-lg x:outline x:-outline-offset-1 x:transition-[background-color,box-shadow,outline-color]",
        selected
          ? "x:bg-blue-50/10 x:shadow-[0_0_0_1px_rgba(59,130,246,0.10),0_10px_30px_rgba(15,23,42,0.06)] x:outline-blue-400"
          : "x:shadow-[0_0_0_1px_rgba(15,23,42,0.04)] x:outline-neutral-200 group-hover/section:x:outline-neutral-300",
      )}
    >
      <div
        ref={addMenuRef}
        className={cn(
          "x:absolute x:left-4 x:top-1.5 x:z-2000 x:flex x:items-center x:rounded-md x:border x:p-0.5 x:text-[10px] x:font-medium x:leading-none x:shadow-sm x:backdrop-blur x:transition-opacity",
          selected || addMenuOpen
            ? "x:pointer-events-auto x:border-blue-200 x:bg-blue-50/95 x:text-blue-700 x:shadow-blue-950/5"
            : "x:pointer-events-none x:border-neutral-200 x:bg-white/90 x:text-neutral-500 x:opacity-0 x:shadow-neutral-950/5 x:group-hover/section:pointer-events-auto x:group-hover/section:opacity-100 x:group-focus-within/section:pointer-events-auto x:group-focus-within/section:opacity-100",
        )}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="x:flex x:h-7 x:max-w-48 x:items-center x:gap-1.5 x:rounded x:px-2 x:text-left x:hover:bg-white/70 x:focus-visible:outline-2 x:focus-visible:outline-blue-500"
          onClick={() => onSelectSection(section.id)}
        >
          <span
            className={cn(
              "x:h-1.5 x:w-1.5 x:shrink-0 x:rounded-full",
              selected ? "x:bg-blue-500" : "x:bg-neutral-300",
            )}
          />
          <span className="x:truncate">{section.name || section.id}</span>
        </button>
        <button
          type="button"
          disabled={editingDisabled}
          aria-label={`Add to ${section.name || "section"}`}
          aria-expanded={addMenuOpen}
          aria-haspopup="dialog"
          className="x:flex x:h-7 x:w-7 x:items-center x:justify-center x:rounded x:border-l x:border-current/10 x:hover:bg-white/70 x:focus-visible:outline-2 x:focus-visible:outline-blue-500 x:disabled:cursor-not-allowed x:disabled:opacity-40"
          onClick={() => {
            onSelectSection(section.id);
            setAddMenuOpen((open) => !open);
          }}
        >
          <PlusIcon className="x:h-3.5 x:w-3.5" />
        </button>
        <Popover open={addMenuOpen}>
          <div
            role="dialog"
            aria-label={`Add content to ${section.name || "section"}`}
            className="x:absolute x:left-0 x:top-full x:mt-2 x:w-72 x:text-left x:text-neutral-950"
          >
            <PopoverContent className="x:overflow-hidden">
              <div className="x:border-b x:border-neutral-200 x:p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="x:w-full x:justify-start"
                  onClick={() => {
                    onAddSection();
                    setAddMenuOpen(false);
                    setToolQuery("");
                  }}
                >
                  <PlusIcon className="x:h-3.5 x:w-3.5" />
                  Add section below
                </Button>
              </div>
              <div className="x:p-3">
                <div className="x:mb-2 x:text-[10px] x:font-semibold x:uppercase x:tracking-wide x:text-neutral-500">
                  Add component
                </div>
                <div className="x:relative x:mb-3">
                  <SearchIcon className="x:pointer-events-none x:absolute x:left-2.5 x:top-1/2 x:h-3.5 x:w-3.5 x:-translate-y-1/2 x:text-neutral-400" />
                  <Input
                    autoFocus
                    value={toolQuery}
                    aria-label="Search components"
                    placeholder="Search components"
                    className="x:h-8 x:pl-8 x:text-xs"
                    onChange={(event) => setToolQuery(event.target.value)}
                  />
                </div>
                <div className="x:max-h-64 x:space-y-3 x:overflow-y-auto">
                  {visibleToolTypes.length > 0 ? (
                    <div>
                      <div className="x:mb-1 x:px-2 x:text-[10px] x:font-semibold x:uppercase x:tracking-wide x:text-neutral-400">
                        Content
                      </div>
                      <div className="x:grid x:grid-cols-2 x:gap-1">
                        {visibleToolTypes.map((type) => (
                          <Button
                            key={type}
                            variant="ghost"
                            size="sm"
                            className="x:justify-start x:px-2"
                            onClick={() => {
                              onAddTool(type);
                              setAddMenuOpen(false);
                              setToolQuery("");
                            }}
                          >
                            {formatToolType(type)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {visibleOverlayTypes.length > 0 ? (
                    <div>
                      <div className="x:mb-1 x:px-2 x:text-[10px] x:font-semibold x:uppercase x:tracking-wide x:text-neutral-400">
                        Overlays
                      </div>
                      <div className="x:grid x:grid-cols-2 x:gap-1">
                        {visibleOverlayTypes.map((type) => (
                          <Button
                            key={type}
                            variant="ghost"
                            size="sm"
                            className="x:justify-start x:px-2"
                            onClick={() => {
                              onAddOverlay(type);
                              setAddMenuOpen(false);
                              setToolQuery("");
                            }}
                          >
                            {formatOverlayType(type)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                {visibleToolTypes.length === 0 && visibleOverlayTypes.length === 0 ? (
                  <div className="x:py-6 x:text-center x:text-xs x:text-neutral-500">
                    No components found.
                  </div>
                ) : null}
              </div>
            </PopoverContent>
          </div>
        </Popover>
      </div>
      <Section
        id={section.id}
        ref={sectionRef}
        columns={activeGrid.columns}
        rows={activeGrid.rows}
        height={activeHeight}
        columnGap={activeGrid.columnGap}
        rowGap={activeGrid.rowGap}
        className={section.props?.className}
        onClickCapture={(event) => {
          if (
            (event.target as HTMLElement).closest("[data-editor-tool-id]")
          ) {
            return;
          }
          const toolId = getToolIdAtPoint(event.clientX, event.clientY);
          if (!toolId) return;

          onSelectTool(toolId);
        }}
        onClick={(event) => {
          if (getToolIdAtPoint(event.clientX, event.clientY)) {
            return;
          }

          onSelectSection(section.id);
        }}
      >
        {sortedTools.map((tool) => {
          if (tool.hidden) return null;

          const previewArea =
            dragPreview[tool.id] ??
            getActiveToolLayout(tool, viewport).gridArea;
          const toolSelected = selectedToolIds.has(tool.id);
          const renderedTool = withToolLayoutClasses(
            tool,
            viewport,
            previewArea,
          );
          const placementClassName = getToolPlacementClassName(
            tool,
            viewport,
            previewArea,
          );

          return (
            <Fragment key={tool.id}>
              <ToolRenderer tool={renderedTool} />
              <div
                data-editor-tool-id={tool.id}
                className={cn(
                  placementClassName,
                  "x:group x:relative x:min-h-0 x:min-w-0 x:rounded-md x:outline-offset-2",
                  tool.locked || editingDisabled
                    ? "x:pointer-events-none x:cursor-default"
                    : "x:cursor-move",
                  toolSelected && "x:outline-2 x:outline-blue-500",
                )}
                style={{
                  zIndex: getActiveToolLayout(tool, viewport).zIndex + 1000,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onPointerDown={(event) => startDrag(event, tool, "move")}
              >
                {tool.locked && (
                  <div className="x:absolute x:right-2 x:top-2 x:rounded x:bg-neutral-950/80 x:px-2 x:py-1 x:text-[10px] x:font-medium x:text-white">
                    Locked
                  </div>
                )}
                {toolSelected && !tool.locked && !editingDisabled && (
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
      <button
        type="button"
        disabled={editingDisabled}
        aria-label="Resize section height"
        title="Resize section height"
        className={cn(
          "x:absolute x:bottom-2 x:left-1/2 x:z-2000 x:h-3 x:w-16 x:-translate-x-1/2 x:touch-none x:select-none x:cursor-ns-resize x:rounded-full x:border-0 x:bg-blue-700 x:p-0 x:transition-opacity",
          selected && !editingDisabled
            ? "x:opacity-100"
            : "x:opacity-0 group-hover/section:x:opacity-100",
        )}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={startHeightDrag}
      />
    </div>
  );
}
