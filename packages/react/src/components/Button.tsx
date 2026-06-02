import {
  Button as BaseButton,
  type ButtonProps,
  type ButtonState,
} from "@base-ui/react";

export function Button(props: ButtonProps) {
  return <BaseButton {...props} />;
}

export type { ButtonProps, ButtonState };
