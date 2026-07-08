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
      borderWidth: 0,
      contentWidth: 0,
      contentHeight: 0,
    });

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
          const borderBox = getObservedBoxSize(entry, "border");
          const contentBox = getObservedBoxSize(entry, "content");

          setSize({
            borderWidth: borderBox.width,
            contentWidth: contentBox.width,
            contentHeight: contentBox.height,
          });
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const baseGrid = { columns, rows, height, columnGap, rowGap };
    const activeGrid = getActiveGrid(baseGrid, responsive, size.borderWidth);
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

function getObservedBoxSize(
  entry: ResizeObserverEntry,
  box: "border" | "content",
) {
  const boxSize = box === "border" ? entry.borderBoxSize : entry.contentBoxSize;
  const size = Array.isArray(boxSize) ? boxSize[0] : boxSize;

  if (size) {
    return {
      width: size.inlineSize,
      height: size.blockSize,
    };
  }

  if (box === "border") {
    const rect = entry.target.getBoundingClientRect();

    return {
      width: rect.width,
      height: rect.height,
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
  width: number,
): SectionGrid {
  if (width > 0 && width < 640) {
    return { ...baseGrid, ...responsive?.tablet, ...responsive?.mobile };
  }

  if (width > 0 && width < 1024) {
    return { ...baseGrid, ...responsive?.tablet };
  }

  return baseGrid;
}
