import * as React from "react";
import { cn } from "./cn";

export type SwitchProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function Switch({
  checked = false,
  onCheckedChange,
  className,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        "x:relative x:h-5 x:w-9 x:rounded-full x:border x:border-transparent x:transition-colors",
        checked ? "x:bg-neutral-950" : "x:bg-neutral-200",
        className,
      )}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    >
      <span
        className={cn(
          "x:absolute x:left-px x:top-[50%] x:translate-y-[-50%] x:h-4 x:w-4 x:rounded-full x:bg-white x:shadow x:transition-transform",
          checked ? "x:translate-x-4" : "x:translate-x-0",
        )}
      />
    </button>
  );
}
