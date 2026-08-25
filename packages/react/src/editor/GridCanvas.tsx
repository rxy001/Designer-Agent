import type { CSSProperties } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Root } from "../components/Root";
import { cn } from "../ui/cn";
import { SectionCanvas } from "./SectionCanvas";
import type { PageDocument, SectionNode, ToolNode, Viewport } from "./types";

type GridCanvasProps = {
  page: PageDocument;
  selectedSectionIds: ReadonlySet<string>;
  selectedToolIds: ReadonlySet<string>;
  viewport: Viewport;
  zoom: number;
  onSelectPage: () => void;
  onSelectSection: (sectionId: string) => void;
  onSelectTool: (toolId?: string) => void;
  onAddSection: (afterSectionId?: string) => void;
  onAddTool: (type: ToolNode["type"], sectionId?: string) => void;
  onUpdateSection: (sectionId: string, changes: Partial<SectionNode>) => void;
  onUpdateTool: (toolId: string, changes: Partial<ToolNode>) => void;
  editingDisabled?: boolean;
};

const viewportWidths: Record<Viewport, string> = {
  desktop: "min(100%, 1440px)",
  tablet: "768px",
  mobile: "406px",
};

const desktopViewportWidth = 1440;

const fixedViewportWidths: Partial<Record<Viewport, number>> = {
  tablet: 768,
  mobile: 406,
};

export function GridCanvas({
  page,
  selectedSectionIds,
  selectedToolIds,
  viewport,
  zoom,
  onSelectPage,
  onSelectSection,
  onSelectTool,
  onAddSection,
  onAddTool,
  onUpdateSection,
  onUpdateTool,
  editingDisabled = false,
}: GridCanvasProps) {
  const scale = zoom / 100;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });

  const measureContentSize = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const style = window.getComputedStyle(el);
    const horizontalPadding =
      Number.parseFloat(style.paddingLeft) +
      Number.parseFloat(style.paddingRight);
    const availableWidth = Math.max(0, el.clientWidth - horizontalPadding);
    const fixedWidth = fixedViewportWidths[viewport];
    const nextSize = {
      width:
        fixedWidth !== undefined
          ? fixedWidth
          : Math.min(availableWidth, desktopViewportWidth),
      height: contentRef.current?.offsetHeight ?? 0,
    };

    setContentSize((current) =>
      current.width === nextSize.width && current.height === nextSize.height
        ? current
        : nextSize,
    );
  }, [viewport]);

  useLayoutEffect(() => {
    measureContentSize();
  });

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(measureContentSize);

    measureContentSize();
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [measureContentSize]);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    let frame = 0;
    const measure = () => {
      const nextHeight = el.offsetHeight;

      setContentSize((current) =>
        current.height === nextHeight
          ? current
          : { ...current, height: nextHeight },
      );
    };
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(scheduleMeasure);

    measure();
    observer.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [viewport]);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const nextHeight = el.offsetHeight;

    setContentSize((current) =>
      current.height === nextHeight
        ? current
        : { ...current, height: nextHeight },
    );
  }, [contentSize.width, page, viewport]);

  return (
    <div
      ref={scrollerRef}
      className="x:min-h-0 x:flex-1 x:overflow-auto x:bg-neutral-100 x:p-8"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('[data-slot="section"]')) {
          return;
        }
        onSelectPage();
      }}
    >
      <div
        className="x:relative x:mx-auto x:shrink-0 x:overflow-hidden"
        style={{
          width:
            contentSize.width > 0
              ? `${contentSize.width * scale}px`
              : viewportWidths[viewport],
          height:
            contentSize.height > 0
              ? `${contentSize.height * scale}px`
              : undefined,
        }}
      >
        <div
          ref={contentRef}
          className="canvas-scale x:origin-top-left"
          style={
            {
              "--canvas-scale": scale,
              width:
                contentSize.width > 0
                  ? `${contentSize.width}px`
                  : viewportWidths[viewport],
            } as CSSProperties
          }
        >
          <Root
            id={page.id}
            className={cn("@container bg-white", page.props?.className)}
          >
            {page.sections.map((section) => (
              <SectionCanvas
                key={section.id}
                section={section}
                selected={selectedSectionIds.has(section.id)}
                selectedToolIds={selectedToolIds}
                viewport={viewport}
                onSelectSection={onSelectSection}
                onSelectTool={onSelectTool}
                onAddSection={() => onAddSection(section.id)}
                onAddTool={(type) => onAddTool(type, section.id)}
                onUpdateSection={onUpdateSection}
                onUpdateTool={onUpdateTool}
                editingDisabled={editingDisabled}
              />
            ))}
          </Root>
        </div>
      </div>
    </div>
  );
}
