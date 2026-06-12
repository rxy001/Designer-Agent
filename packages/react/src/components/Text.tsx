export interface TextProps {
  content?: string;
  className?: string;
}

export function Text({ content, className }: TextProps) {
  return (
    <p className={className} data-slot="text">
      {content}
    </p>
  );
}
