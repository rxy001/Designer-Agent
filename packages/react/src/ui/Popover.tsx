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
        "x:rounded-lg x:border x:border-neutral-200 x:bg-white x:shadow-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
