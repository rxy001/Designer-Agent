import * as React from "react";
import { twMerge } from "tailwind-merge";

type NavbarItem = {
  label: string;
  href?: string;
  active?: boolean;
};

type NavbarAction = {
  label: string;
  href?: string;
};

export type NavbarProps = {
  brand?: string;
  logoSrc?: string;
  logoAlt?: string;
  items?: NavbarItem[];
  primaryAction?: NavbarAction;
  secondaryAction?: NavbarAction;
  sticky?: boolean;
  showMobileMenu?: boolean;
  classNames?: {
    navbar?: string;
    "navbar-inner"?: string;
    "navbar-logo"?: string;
    "navbar-brand"?: string;
    "navbar-nav-list"?: string;
    "navbar-nav-item"?: string;
    "navbar-active-nav-item"?: string;
    "navbar-actions"?: string;
    "navbar-primary-action"?: string;
    "navbar-secondary-action"?: string;
    "navbar-mobile-toggle"?: string;
    "navbar-mobile-panel"?: string;
  };
};

function ActionLink({
  action,
  className,
  style,
  slot,
}: {
  action?: NavbarAction;
  className?: string;
  style?: React.CSSProperties;
  slot: string;
}) {
  if (!action?.label) return null;

  return (
    <a
      data-slot={slot}
      href={action.href || "#"}
      className={className}
      style={style}
    >
      {action.label}
    </a>
  );
}

export function Navbar({
  brand = "Brand",
  logoSrc,
  logoAlt,
  items = [],
  primaryAction,
  secondaryAction,
  sticky = false,
  showMobileMenu = true,
  classNames,
}: NavbarProps) {
  const [open, setOpen] = React.useState(false);

  const hasActions = Boolean(primaryAction?.label || secondaryAction?.label);

  return (
    <nav
      data-slot="navbar"
      data-open={open ? "" : undefined}
      className={twMerge(
        "w-full min-w-0 overflow-hidden rounded-none",
        sticky && "sticky top-0 z-50",
        classNames?.navbar,
      )}
    >
      <div
        data-slot="navbar-inner"
        className={twMerge(
          "flex h-full min-h-14 w-full items-center px-5 py-3",
          classNames?.["navbar-inner"],
        )}
      >
        <a
          data-slot="navbar-brand"
          href="#"
          className={twMerge(
            "flex min-w-0 shrink-0 items-center gap-3 text-sm font-semibold tracking-normal",
            classNames?.["navbar-brand"],
          )}
        >
          {logoSrc ? (
            <img
              data-slot="navbar-logo"
              src={logoSrc}
              alt={logoAlt || `${brand} logo`}
              className={twMerge(
                "h-8 w-8 shrink-0 object-contain",
                classNames?.["navbar-logo"],
              )}
            />
          ) : (
            <span
              data-slot="navbar-logo"
              className={twMerge(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-950 text-xs font-semibold text-white",
                classNames?.["navbar-logo"],
              )}
              aria-hidden="true"
            >
              {brand.slice(0, 1).toUpperCase()}
            </span>
          )}

          <span className="truncate">{brand}</span>
        </a>

        {items.length > 0 ? (
          <div
            data-slot="navbar-nav-list"
            className={twMerge(
              "hidden min-w-0 flex-1 items-center gap-1 md:flex",
              classNames?.["navbar-nav-list"],
            )}
          >
            {items.map((item, index) => (
              <a
                key={`${item.label}-${index}`}
                data-slot="navbar-nav-item"
                data-active={item.active ? "" : undefined}
                href={item.href || "#"}
                className={twMerge(
                  "rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950",
                  item.active && "bg-neutral-100 text-neutral-950",
                  classNames?.["navbar-nav-item"],
                  item.active && classNames?.["navbar-active-nav-item"],
                )}
              >
                {item.label}
              </a>
            ))}
          </div>
        ) : null}

        {hasActions ? (
          <div
            data-slot="navbar-actions"
            className={twMerge(
              "hidden shrink-0 items-center gap-2 md:flex",
              classNames?.["navbar-actions"],
            )}
          >
            <ActionLink
              action={secondaryAction}
              slot="navbar-secondary-action"
              className={twMerge(
                "rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950",
                classNames?.["navbar-secondary-action"],
              )}
            />
            <ActionLink
              action={primaryAction}
              slot="navbar-primary-action"
              className={twMerge(
                "rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800",
                classNames?.["navbar-primary-action"],
              )}
            />
          </div>
        ) : null}
        {showMobileMenu && (items.length > 0 || hasActions) ? (
          <button
            data-slot="navbar-mobile-toggle"
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={open}
            className={twMerge(
              "ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 md:hidden",
              classNames?.["navbar-mobile-toggle"],
            )}
            onClick={() => setOpen((value) => !value)}
          >
            <span aria-hidden="true">{open ? "×" : "☰"}</span>
          </button>
        ) : null}
      </div>

      {showMobileMenu && open ? (
        <div
          data-slot="navbar-mobile-panel"
          className={twMerge(
            "grid gap-2 border-t border-neutral-200 px-5 py-4 md:hidden",
            classNames?.["navbar-mobile-panel"],
          )}
        >
          {items.map((item, index) => (
            <a
              key={`${item.label}-mobile-${index}`}
              data-slot="navbar-nav-item"
              data-active={item.active ? "" : undefined}
              href={item.href || "#"}
              className={twMerge(
                "rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100",
                item.active && "bg-neutral-100 text-neutral-950",
                classNames?.["navbar-nav-item"],
                item.active && classNames?.["navbar-active-nav-item"],
              )}
            >
              {item.label}
            </a>
          ))}

          {hasActions ? (
            <div className="mt-2 grid gap-2">
              <ActionLink
                action={secondaryAction}
                slot="navbar-secondary-action"
                className={twMerge(
                  "rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100",
                  classNames?.["navbar-secondary-action"],
                )}
              />
              <ActionLink
                action={primaryAction}
                slot="navbar-primary-action"
                className={twMerge(
                  "rounded-md bg-neutral-950 px-4 py-2 text-center text-sm font-semibold text-white",
                  classNames?.["navbar-primary-action"],
                )}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
