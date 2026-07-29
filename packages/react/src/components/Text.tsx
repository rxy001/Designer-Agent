import { twMerge } from "tailwind-merge";

export interface TextProps {
  content?: string;
  className?: string;
  id?: string;
}

export function Text({ content, id, className }: TextProps) {
  return (
    <p
      className={twMerge("text-pretty whitespace-pre-wrap", className)}
      data-slot="text"
      id={id}
    >
      {content}
    </p>
  );
}
