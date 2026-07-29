import { twMerge } from "tailwind-merge";

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
  id?: string;
}

export function Divider({
  orientation = "horizontal",
  className,
  id,
}: DividerProps) {
  return (
    <hr
      id={id}
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
