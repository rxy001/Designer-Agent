import type { ReactNode } from "react";
import { cn } from "./cn";

export function Tabs({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("x:flex x:flex-col x:gap-2", className)}>{children}</div>;
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("x:inline-flex x:rounded-md x:bg-neutral-100 x:p-1", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({
  active,
  children,
  className,
  disabled,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "x:rounded x:px-3 x:py-1 x:text-xs x:font-medium x:text-neutral-600 x:transition x:disabled:pointer-events-none x:disabled:opacity-40",
        active && "x:bg-white x:text-neutral-950 x:shadow-sm",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
