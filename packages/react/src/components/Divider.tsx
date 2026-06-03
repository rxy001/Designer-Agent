import clsx from "clsx";

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Divider({
  orientation = "horizontal",
  className,
  ...props
}: DividerProps) {
  return (
    <hr
      {...props}
      className={clsx(
        "border-gray-400",
        "data-[orientation=horizontal]:w-full data-[orientation=horizontal]:border-t",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:border-l",
        className,
      )}
      data-orientation={orientation}
    />
  );
}
