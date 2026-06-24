import * as React from "react";
import { cn } from "./cn";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "icon";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  default:
    "x:bg-neutral-950 x:text-white x:shadow-sm x:hover:bg-neutral-800 x:disabled:bg-neutral-300",
  secondary:
    "x:bg-neutral-100 x:text-neutral-900 x:hover:bg-neutral-200 x:disabled:text-neutral-400",
  ghost: "x:text-neutral-700 x:hover:bg-neutral-100 x:disabled:text-neutral-400",
  outline:
    "x:border x:border-neutral-200 x:bg-white x:text-neutral-800 x:hover:bg-neutral-50 x:disabled:text-neutral-400",
  danger: "x:bg-red-600 x:text-white x:hover:bg-red-700 x:disabled:bg-red-200",
};

const sizes: Record<ButtonSize, string> = {
  sm: "x:h-8 x:gap-1.5 x:px-3 x:text-xs",
  md: "x:h-9 x:gap-2 x:px-4 x:text-sm",
  icon: "x:h-9 x:w-9 x:p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "x:inline-flex x:shrink-0 x:items-center x:justify-center x:rounded-md x:font-medium x:transition-colors x:focus-visible:outline-2 x:focus-visible:outline-offset-2 x:focus-visible:outline-neutral-950 x:disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
