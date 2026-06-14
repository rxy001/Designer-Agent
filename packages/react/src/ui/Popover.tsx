import type { ReactNode } from "react";
import { cn } from "./cn";

export function Popover({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  if (!open) return null;

  return <>{children}</>;
}

export function PopoverContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 bg-white shadow-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
