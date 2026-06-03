import { Button as BaseButton } from "@base-ui/react";
import clsx from "clsx";

export interface ButtonProps {
  label?: string;
  className?: string;
  type?: BaseButton.Props["type"];
}

export function Button({ className, label, type, ...rest }: ButtonProps) {
  return (
    <BaseButton
      {...rest}
      type={type}
      className={clsx(
        "focus-visible:outline-2 focus-visible:outline-offset-3 inline-flex justify-center items-center transition-[color,opacity,background-color,box-shadow] duration-200 ease-in-out",
        className,
      )}
    >
      {label}
    </BaseButton>
  );
}
