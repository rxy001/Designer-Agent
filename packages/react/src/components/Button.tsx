import { Button as BaseButton } from "@base-ui/react";

export interface ButtonProps {
  label?: string;
  className?: string;
}

export function Button({ className, label }: ButtonProps) {
  return <BaseButton className={className}>{label}</BaseButton>;
}
