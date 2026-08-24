import { renderIcon, type IconName } from "./iconRegistry";

export type { IconName } from "./iconRegistry";

export interface IconProps {
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
  id?: string;
}

export function Icon({
  name,
  size = 24,
  strokeWidth = 2,
  className,
  ariaLabel,
  id,
}: IconProps) {
  return renderIcon(name, {
    id,
    "data-slot": "icon",
    size,
    strokeWidth,
    className,
    "aria-label": ariaLabel,
    "aria-hidden": ariaLabel ? undefined : true,
    role: ariaLabel ? "img" : undefined,
    focusable: "false",
  });
}

