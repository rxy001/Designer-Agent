import { cn } from "./cn";

export function Separator({ className }: { className?: string }) {
  return <div className={cn("x:h-px x:w-full x:bg-neutral-200", className)} />;
}
