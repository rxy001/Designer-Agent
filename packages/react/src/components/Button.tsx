import { Button as BaseButton } from "@base-ui/react/button";
import { twMerge } from "tailwind-merge";
import { renderIcon, type IconName } from "./iconRegistry";

export interface ButtonProps {
  label?: string;
  className?: string;
  href?: string;
  target?: "_self" | "_blank" | "_parent" | "_top";
  rel?: string;
  download?: boolean | string;
  type?: BaseButton.Props["type"];
  disabled?: boolean;
  ariaLabel?: string;
  startIcon?: IconName;
  endIcon?: IconName;
  classNames?: {
    "start-icon"?: string;
    "end-icon"?: string;
  };
  id?: string;
}

export function Button({
  className,
  id,
  href,
  label,
  target,
  rel,
  download,
  type,
  disabled = false,
  ariaLabel,
  startIcon,
  endIcon,
  classNames,
  ...rest
}: ButtonProps) {
  const mergedClassName = twMerge(
    "focus-visible:outline-2 focus-visible:outline-offset-3 inline-flex items-center justify-center gap-2 transition-[color,opacity,background-color,box-shadow] duration-200 ease-in-out",
    className,
  );
  const startIconElement = startIcon
    ? renderIcon(startIcon, {
        "data-slot": "start-icon",
        size: "1em",
        "aria-hidden": true,
        focusable: "false",
        className: twMerge("shrink-0", classNames?.["start-icon"]),
      })
    : null;
  const endIconElement = endIcon
    ? renderIcon(endIcon, {
        "data-slot": "end-icon",
        size: "1em",
        "aria-hidden": true,
        focusable: "false",
        className: twMerge("shrink-0", classNames?.["end-icon"]),
      })
    : null;

  if (href) {
    const resolvedRel =
      target === "_blank" ? rel || "noopener noreferrer" : rel;

    return (
      <a
        id={id}
        data-slot="button"
        {...rest}
        href={disabled ? undefined : href}
        target={target}
        rel={resolvedRel}
        download={disabled ? undefined : download}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? "" : undefined}
        className={mergedClassName}
      >
        {startIconElement}
        {label}
        {endIconElement}
      </a>
    );
  }

  return (
    <BaseButton
      data-slot="button"
      type={type}
      disabled={disabled}
      data-disabled={disabled ? "" : undefined}
      aria-label={ariaLabel}
      {...rest}
      id={id}
      className={mergedClassName}
    >
      {startIconElement}
      {label}
      {endIconElement}
    </BaseButton>
  );
}
