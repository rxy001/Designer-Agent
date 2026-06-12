import { Button as BaseButton } from "@base-ui/react";
import { twMerge } from "tailwind-merge";

export interface ButtonProps {
  label?: string;
  className?: string;
  type?: BaseButton.Props["type"];
}

export function Button({ className, label, type, ...rest }: ButtonProps) {
  return (
    <BaseButton
      data-slot="button"
      type={type}
      {...rest}
      className={twMerge(
        "focus-visible:outline-2 focus-visible:outline-offset-3 inline-flex justify-center items-center transition-[color,opacity,background-color,box-shadow] duration-200 ease-in-out",
        className,
      )}
    >
      {label}
    </BaseButton>
  );
}
