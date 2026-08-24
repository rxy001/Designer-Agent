import { twMerge } from "tailwind-merge";

export interface BadgeProps {
  label?: string;
  href?: string;
  className?: string;
  id?: string;
}

export function Badge({ label, href, className, id }: BadgeProps) {
  const mergedClassName = twMerge("inline-flex items-center", className);

  if (href) {
    return (
      <a id={id} href={href} data-slot="badge" className={mergedClassName}>
        {label}
      </a>
    );
  }

  return (
    <span id={id} data-slot="badge" className={mergedClassName}>
      {label}
    </span>
  );
}
