import clsx from "clsx";
import * as React from "react";

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
    root?: string;
    inner?: string;
    logo?: string;
    brand?: string;
    nav?: string;
    navItem?: string;
    activeNavItem?: string;
    actions?: string;
    primaryAction?: string;
    secondaryAction?: string;
    mobileToggle?: string;
    mobilePanel?: string;
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
      data-slot="root"
      data-open={open ? "" : undefined}
      className={clsx(
        "w-full min-w-0 overflow-hidden rounded-none",
        sticky && "sticky top-0 z-50",
        classNames?.root,
      )}
    >
      <div
        data-slot="inner"
        className={clsx(
          "flex h-full min-h-14 w-full items-center px-5 py-3",
          classNames?.inner,
        )}
      >
        <a
          data-slot="brand"
          href="#"
          className={clsx(
            "flex min-w-0 shrink-0 items-center gap-3 text-sm font-semibold tracking-normal",
            classNames?.brand,
          )}
        >
          {logoSrc ? (
            <img
              data-slot="logo"
              src={logoSrc}
              alt={logoAlt || `${brand} logo`}
              className={clsx(
                "h-8 w-8 shrink-0 object-contain",
                classNames?.logo,
              )}
            />
          ) : (
            <span
              data-slot="logo"
              className={clsx(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-950 text-xs font-semibold text-white",
                classNames?.logo,
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
            data-slot="nav"
            className={clsx(
              "hidden min-w-0 flex-1 items-center gap-1 md:flex",
              classNames?.nav,
            )}
          >
            {items.map((item, index) => (
              <a
                key={`${item.label}-${index}`}
                data-slot="nav-item"
                data-active={item.active ? "" : undefined}
                href={item.href || "#"}
                className={clsx(
                  "rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950",
                  item.active && "bg-neutral-100 text-neutral-950",
                  classNames?.navItem,
                  item.active && classNames?.activeNavItem,
                )}
              >
                {item.label}
              </a>
            ))}
          </div>
        ) : null}

        {hasActions ? (
          <div
            data-slot="actions"
            className={clsx(
              "hidden shrink-0 items-center gap-2 md:flex",
              classNames?.actions,
            )}
          >
            <ActionLink
              action={secondaryAction}
              slot="secondary-action"
              className={clsx(
                "rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950",
                classNames?.secondaryAction,
              )}
            />
            <ActionLink
              action={primaryAction}
              slot="primary-action"
              className={clsx(
                "rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800",
                classNames?.primaryAction,
              )}
            />
          </div>
        ) : null}

        {showMobileMenu && (items.length > 0 || hasActions) ? (
          <button
            data-slot="mobile-toggle"
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={open}
            className={clsx(
              "ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 md:hidden",
              classNames?.mobileToggle,
            )}
            onClick={() => setOpen((value) => !value)}
          >
            <span aria-hidden="true">{open ? "×" : "☰"}</span>
          </button>
        ) : null}
      </div>

      {showMobileMenu && open ? (
        <div
          data-slot="mobile-panel"
          className={clsx(
            "grid gap-2 border-t border-neutral-200 px-5 py-4 md:hidden",
            classNames?.mobilePanel,
          )}
        >
          {items.map((item, index) => (
            <a
              key={`${item.label}-mobile-${index}`}
              data-slot="nav-item"
              data-active={item.active ? "" : undefined}
              href={item.href || "#"}
              className={clsx(
                "rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100",
                item.active && "bg-neutral-100 text-neutral-950",
                classNames?.navItem,
                item.active && classNames?.activeNavItem,
              )}
            >
              {item.label}
            </a>
          ))}

          {hasActions ? (
            <div className="mt-2 grid gap-2">
              <ActionLink
                action={secondaryAction}
                slot="secondary-action"
                className={clsx(
                  "rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100",
                  classNames?.secondaryAction,
                )}
              />
              <ActionLink
                action={primaryAction}
                slot="primary-action"
                className={clsx(
                  "rounded-md bg-neutral-950 px-4 py-2 text-center text-sm font-semibold text-white",
                  classNames?.primaryAction,
                )}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
