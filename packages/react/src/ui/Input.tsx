import * as React from "react";
import { cn } from "./cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "x:h-9 x:w-full x:rounded-md x:border x:border-neutral-200 x:bg-white x:px-3 x:text-sm x:text-neutral-900 x:shadow-sm x:outline-none x:transition x:focus:border-neutral-400 x:disabled:cursor-not-allowed x:disabled:bg-neutral-100 x:disabled:text-neutral-500",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
