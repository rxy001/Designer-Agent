import type { ComponentProps } from "react";

export type ImageProps = ComponentProps<"img">;

export function Image(props: ImageProps) {
  return <img {...props} draggable="false" />;
}
