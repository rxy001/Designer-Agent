import type { ComponentProps } from "react";

export type TextProps = ComponentProps<"p">;

export function Text({ children, ...props }: TextProps) {
  return <p {...props}>{children}</p>;
}
