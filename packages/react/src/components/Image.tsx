export interface ImageProps {
  src?: string;
  alt?: string;
  className?: string;
}

export function Image(props: ImageProps) {
  return <img {...props} draggable="false" />;
}
