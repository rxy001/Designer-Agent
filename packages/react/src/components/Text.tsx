import { twMerge } from "tailwind-merge";

export interface TextProps {
  content?: string;
  className?: string;
}

export function Text({ content, className }: TextProps) {
  return (
    <p
      className={twMerge("text-pretty whitespace-pre-wrap", className)}
      data-slot="text"
    >
      {content}
    </p>
  );
}
