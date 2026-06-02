import { Button, type ButtonProps } from "./Button";

export interface ContactProps extends React.ComponentProps<"form"> {
  labels?: {
    name?: string;
    email?: string;
    message?: string;
  };
  placeholders?: {
    name?: string;
    email?: string;
    message?: string;
  };
  buttonLabel?: string;
  slots?: {
    field?: FieldProps;
    "field-set"?: FieldSetProps;
    "field-group"?: FieldGroupProps;
    "field-label"?: FieldLabelProps;
    input?: React.ComponentProps<"input">;
    textarea?: React.ComponentProps<"textarea">;
    button?: ButtonProps;
  };
}

export function Contact(props: ContactProps) {
  const { slots, labels, placeholders, buttonLabel, ...rest } = props;

  return (
    <form {...rest} data-slot="root">
      <FieldSet {...slots?.["field-set"]}>
        <FieldGroup {...slots?.["field-group"]}>
          <Field {...slots?.["field"]}>
            <FieldLabel {...slots?.["field-label"]}>
              {labels?.name || "Name"}
            </FieldLabel>
            <input
              {...slots?.input}
              data-slot="input"
              placeholder={placeholders?.name || slots?.input?.placeholder}
            />
          </Field>
          <Field {...slots?.["field"]}>
            <FieldLabel {...slots?.["field-label"]}>
              {labels?.email || "Email"}
            </FieldLabel>
            <input
              {...slots?.input}
              data-slot="input"
              placeholder={placeholders?.email || slots?.input?.placeholder}
            />
          </Field>
          <Field {...slots?.["field"]}>
            <FieldLabel {...slots?.["field-label"]}>
              {labels?.message || "Message"}
            </FieldLabel>
            <textarea
              {...slots?.textarea}
              data-slot="textarea"
              placeholder={
                placeholders?.message || slots?.textarea?.placeholder
              }
            />
          </Field>
        </FieldGroup>
      </FieldSet>
      <Field {...slots?.["field"]}>
        <Button type="submit" {...slots?.button}>
          {buttonLabel || "Submit"}
        </Button>
      </Field>
    </form>
  );
}

type FieldSetProps = React.ComponentProps<"fieldset">;
function FieldSet(props: FieldSetProps) {
  return <fieldset {...props} data-slot="field-set" />;
}

type FieldGroupProps = React.ComponentProps<"div">;
function FieldGroup(props: FieldGroupProps) {
  return <div {...props} data-slot="field-group" />;
}

type FieldProps = React.ComponentProps<"div">;
function Field(props: FieldProps) {
  return <div {...props} role="group" data-slot="field" />;
}

type FieldLabelProps = React.ComponentProps<"label">;
function FieldLabel({ ...props }: FieldLabelProps) {
  return <label {...props} data-slot="field-label" />;
}
