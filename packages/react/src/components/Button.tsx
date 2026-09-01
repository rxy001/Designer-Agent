import { Button as BaseButton } from "@base-ui/react/button";
import { forwardRef, type MouseEventHandler, type Ref } from "react";
import { twMerge } from "tailwind-merge";
import { renderIcon, type IconName } from "./iconRegistry";
import type { ButtonAction } from "./OverlayAction";
import { useOverlayRegistry } from "./OverlayRegistry";

export type { ButtonAction } from "./OverlayAction";

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
  action?: ButtonAction;
  onClick?: MouseEventHandler<HTMLElement>;
  dataSlot?: string;
  classNames?: {
    "start-icon"?: string;
    "end-icon"?: string;
  };
  id?: string;
}

export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  {
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
    action,
    onClick,
    dataSlot = "button",
    classNames,
    ...rest
  },
  ref,
) {
  const registry = useOverlayRegistry();
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

  const actionHref = action?.type === "link" ? action.href : undefined;
  const resolvedHref = action === undefined ? href : actionHref;
  const resolvedTarget = action?.type === "link" ? action.target : target;

  if (resolvedHref) {
    const resolvedRel =
      resolvedTarget === "_blank" ? rel || "noopener noreferrer" : rel;

    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        id={id}
        data-slot={dataSlot}
        {...rest}
        href={disabled ? undefined : resolvedHref}
        target={resolvedTarget}
        rel={resolvedRel}
        download={disabled ? undefined : download}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? "" : undefined}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
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
      ref={ref as Ref<HTMLButtonElement>}
      data-slot={dataSlot}
      type={action?.type === "submit" ? "submit" : type}
      disabled={disabled}
      data-disabled={disabled ? "" : undefined}
      aria-label={ariaLabel}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && action?.type === "overlay") {
          registry?.triggerOverlay(action.targetId);
        }
      }}
      {...rest}
      id={id}
      className={mergedClassName}
    >
      {startIconElement}
      {label}
      {endIconElement}
    </BaseButton>
  );
});
