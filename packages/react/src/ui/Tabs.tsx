import type { ReactNode } from "react";
import { cn } from "./cn";

export function Tabs({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-md bg-neutral-100 p-1", className)}>
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
        "rounded px-3 py-1 text-xs font-medium text-neutral-600 transition disabled:pointer-events-none disabled:opacity-40",
        active && "bg-white text-neutral-950 shadow-sm",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
