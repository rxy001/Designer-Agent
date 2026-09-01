import type { ReactNode } from "react";
import { OverlayProvider } from "./OverlayRegistry";

export interface RootProps {
  className?: string;
  children?: ReactNode;
  id?: string;
}

export function Root({ id, children, className }: RootProps) {
  return (
    <OverlayProvider>
      <div data-slot="root" id={id} className={className}>
        {children}
      </div>
    </OverlayProvider>
  );
}
