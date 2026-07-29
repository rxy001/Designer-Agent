export interface ImageProps {
  src?: string;
  alt?: string;
  className?: string;
  id?: string;
}

export function Image({ src, id, alt, className }: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      id={id}
      className={className}
      data-slot="image"
      draggable="false"
    />
  );
}
