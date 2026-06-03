import clsx from "clsx";
import type { ReactNode, CSSProperties } from "react";
import { useRef, useState, useEffect } from "react";

export interface SectionProps {
  children?: ReactNode;
  columns?: number;
  rows?: number;
  columnGap?: number;
  rowGap?: number;
  className?: string;
}

export function Section({
  children,
  className,
  columns = 22,
  rows = 13,
  columnGap = 11,
  rowGap = 11,
}: SectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

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

  const cellWidth =
    size.width > 0 ? (size.width - (columns - 1) * columnGap) / columns : 0;
  const cellHeight =
    size.height > 0 ? (size.height - (rows - 1) * rowGap) / rows : 0;

  const gridTemplateColumns =
    cellWidth > 0
      ? `repeat(${columns}, ${cellWidth}px)`
      : `repeat(${columns}, 1fr)`;
  const gridTemplateRows =
    cellHeight > 0
      ? `repeat(${rows}, ${cellHeight}px)`
      : `repeat(${rows}, minmax(40px, auto))`;

  return (
    <div
      ref={ref}
      className={clsx("grid", className)}
      style={
        {
          gridTemplateColumns,
          gridTemplateRows,
          columnGap: `${columnGap}px`,
          rowGap: `${rowGap}px`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
