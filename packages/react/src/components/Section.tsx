import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export interface SectionProps extends ComponentProps<"div"> {
  children?: ReactNode;
  columns?: number;
  rows?: number;
  height?: number;
  columnGap?: number;
  rowGap?: number;
  responsive?: {
    tablet?: Partial<SectionGrid>;
    mobile?: Partial<SectionGrid>;
  };
}

type SectionGrid = {
  columns: number;
  rows: number;
  height: number;
  columnGap: number;
  rowGap: number;
};

type SectionViewport = "desktop" | "tablet" | "mobile";

export const Section = forwardRef<HTMLDivElement, SectionProps>(
  function Section(
    {
      id,
      children,
      className,
      columns = 22,
      rows = 13,
      height = 720,
      columnGap = 11,
      rowGap = 11,
      responsive,
      style,
      ...props
    },
    forwardedRef,
  ) {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({
      contentWidth: 0,
      contentHeight: 0,
    });
    const [viewport, setViewport] = useState<SectionViewport>("desktop");

    function setRef(node: HTMLDivElement | null) {
      ref.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    }

    useEffect(() => {
      const el = ref.current;
      if (!el) return;

      const observer = new ResizeObserver(([entry]) => {
        if (entry) {
          const contentBox = getObservedContentBoxSize(entry);

          setSize({
            contentWidth: contentBox.width,
            contentHeight: contentBox.height,
          });
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      const mobileQuery = window.matchMedia("(width < 640px)");
      const tabletQuery = window.matchMedia("(width < 1024px)");
      const updateViewport = () => {
        setViewport(
          mobileQuery.matches
            ? "mobile"
            : tabletQuery.matches
              ? "tablet"
              : "desktop",
        );
      };

      updateViewport();
      mobileQuery.addEventListener("change", updateViewport);
      tabletQuery.addEventListener("change", updateViewport);

      return () => {
        mobileQuery.removeEventListener("change", updateViewport);
        tabletQuery.removeEventListener("change", updateViewport);
      };
    }, []);

    const baseGrid = { columns, rows, height, columnGap, rowGap };
    const activeGrid = getActiveGrid(baseGrid, responsive, viewport);
    const cellWidth =
      size.contentWidth > 0
        ? Math.floor(
            (size.contentWidth -
              (activeGrid.columns - 1) * activeGrid.columnGap) /
              activeGrid.columns,
          )
        : 0;
    const cellHeight =
      size.contentHeight > 0
        ? Math.floor(
            (size.contentHeight - (activeGrid.rows - 1) * activeGrid.rowGap) /
              activeGrid.rows,
          )
        : 0;

    const gridTemplateColumns =
      cellWidth > 0
        ? `repeat(${activeGrid.columns}, ${cellWidth}px)`
        : `repeat(${activeGrid.columns}, 1fr)`;
    const gridTemplateRows =
      cellHeight > 0
        ? `repeat(${activeGrid.rows}, ${cellHeight}px)`
        : `repeat(${activeGrid.rows}, minmax(40px, auto))`;

    return (
      <div
        {...props}
        id={id}
        ref={setRef}
        className={twMerge("grid", className)}
        style={
          {
            ...style,
            height: `${activeGrid.height}px`,
            gridTemplateColumns,
            gridTemplateRows,
            columnGap: `${activeGrid.columnGap}px`,
            rowGap: `${activeGrid.rowGap}px`,
          } as CSSProperties
        }
        data-slot="section"
      >
        {children}
      </div>
    );
  },
);

function getObservedContentBoxSize(entry: ResizeObserverEntry) {
  const boxSize = entry.contentBoxSize;
  const size = Array.isArray(boxSize) ? boxSize[0] : boxSize;

  if (size) {
    return {
      width: size.inlineSize,
      height: size.blockSize,
    };
  }

  return {
    width: entry.contentRect.width,
    height: entry.contentRect.height,
  };
}

function getActiveGrid(
  baseGrid: SectionGrid,
  responsive: SectionProps["responsive"],
  viewport: SectionViewport,
): SectionGrid {
  if (viewport === "mobile") {
    return { ...baseGrid, ...responsive?.tablet, ...responsive?.mobile };
  }

  if (viewport === "tablet") {
    return { ...baseGrid, ...responsive?.tablet };
  }

  return baseGrid;
}
