import { twMerge } from "tailwind-merge";

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Divider({
  orientation = "horizontal",
  className,
}: DividerProps) {
  return (
    <hr
      data-slot="divider"
      className={twMerge(
        "border-gray-400",
        "data-[orientation=horizontal]:w-full data-[orientation=horizontal]:border-t",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:border-l",
        className,
      )}
      data-orientation={orientation}
    />
  );
}
