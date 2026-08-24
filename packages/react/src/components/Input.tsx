import { Field } from "@base-ui/react/field";
import { Input as BaseInput } from "@base-ui/react/input";
import { twMerge } from "tailwind-merge";

export interface InputProps {
  label?: string;
  description?: string;
  error?: string;
  name?: string;
  type?: "text" | "email" | "tel" | "url" | "search" | "password" | "number";
  placeholder?: string;
  defaultValue?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  classNames?: {
    input?: string;
    "input-label"?: string;
    "input-control"?: string;
    "input-description"?: string;
    "input-error"?: string;
  };
}

export function Input({
  label,
  description,
  error,
  name,
  type = "text",
  placeholder,
  defaultValue,
  autoComplete,
  required = false,
  disabled = false,
  id,
  classNames,
}: InputProps) {
  return (
    <Field.Root
      id={id}
      name={name}
      disabled={disabled}
      invalid={Boolean(error)}
      data-slot="input"
      className={classNames?.input}
    >
      {label ? (
        <Field.Label
          data-slot="input-label"
          className={classNames?.["input-label"]}
        >
          {label}
        </Field.Label>
      ) : null}
      <BaseInput
        data-slot="input-control"
        className={twMerge(
          "focus-visible:outline-2 focus-visible:outline-offset-3",
          classNames?.["input-control"],
        )}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
      />
      {description ? (
        <Field.Description
          data-slot="input-description"
          className={classNames?.["input-description"]}
        >
          {description}
        </Field.Description>
      ) : null}
      {error ? (
        <Field.Error
          match
          data-slot="input-error"
          className={classNames?.["input-error"]}
        >
          {error}
        </Field.Error>
      ) : null}
    </Field.Root>
  );
}
