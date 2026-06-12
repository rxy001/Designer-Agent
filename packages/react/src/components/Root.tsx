import type { ReactNode } from "react";

export interface RootProps {
  className?: string;
  children?: ReactNode;
  id?: string;
}

export function Root({ id, children, className }: RootProps) {
  return (
    <div data-slot="root" id={id} className={className}>
      {children}
    </div>
  );
}
