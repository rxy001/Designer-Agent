import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export interface SectionProps extends ComponentProps<"div"> {
  children?: ReactNode;
  columns?: number;
  rows?: number;
  columnGap?: number;
  rowGap?: number;
  responsive?: {
    tablet?: Partial<SectionGrid>;
    desktop?: Partial<SectionGrid>;
  };
}

type SectionGrid = {
  columns: number;
  rows: number;
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
      columnGap = 11,
      rowGap = 11,
      responsive,
      style,
      ...props
    },
    forwardedRef,
  ) {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

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
          setSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const baseGrid = { columns, rows, columnGap, rowGap };
    const activeGrid = getActiveGrid(baseGrid, responsive, size.width);
    const cellWidth =
      size.width > 0
        ? Math.floor(
            (size.width - (activeGrid.columns - 1) * activeGrid.columnGap) /
              activeGrid.columns,
          )
        : 0;
    const cellHeight =
      size.height > 0
        ? Math.floor(
            (size.height - (activeGrid.rows - 1) * activeGrid.rowGap) /
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

function getActiveGrid(
  baseGrid: SectionGrid,
  responsive: SectionProps["responsive"],
  width: number,
): SectionGrid {
  if (width >= 1024 && responsive?.desktop) {
    return { ...baseGrid, ...responsive.desktop };
  }

  if (width >= 768 && responsive?.tablet) {
    return { ...baseGrid, ...responsive.tablet };
  }

  return baseGrid;
}
