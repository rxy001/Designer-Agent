import * as React from "react";
import { cn } from "./cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "x:min-h-20 x:w-full x:resize-none x:rounded-md x:border x:border-neutral-200 x:bg-white x:px-3 x:py-2 x:text-sm x:leading-5 x:text-neutral-900 x:shadow-sm x:outline-none x:transition x:focus:border-neutral-400 x:disabled:cursor-not-allowed x:disabled:bg-neutral-100 x:disabled:text-neutral-500",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
