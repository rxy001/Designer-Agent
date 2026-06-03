import clsx from "clsx";
import { Button } from "./Button";

export interface ContactProps {
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
  classNames?: {
    root?: string;
    field?: string;
    input?: string;
    textarea?: string;
    button?: string;
    "field-group"?: string;
    "field-label"?: string;
  };
}

export function Contact(props: ContactProps) {
  const { classNames, labels, placeholders, buttonLabel } = props;

  return (
    <form data-slot="root" className={classNames?.root}>
      <div data-slot="field-group" className={classNames?.["field-group"]}>
        <div role="group" data-slot="field" className={classNames?.field}>
          <label
            data-slot="field-label"
            className={classNames?.["field-label"]}
          >
            {labels?.name || "Name"}
          </label>
          <input
            className={clsx(
              "focus-visible:outline-2 focus-visible:outline-offset-3",
              classNames?.input,
            )}
            data-slot="input"
            placeholder={placeholders?.name}
          />
        </div>
        <div role="group" data-slot="field" className={classNames?.field}>
          <label
            data-slot="field-label"
            className={classNames?.["field-label"]}
          >
            {labels?.email || "Email"}
          </label>
          <input
            data-slot="input"
            className={clsx(
              "focus-visible:outline-2 focus-visible:outline-offset-3",
              classNames?.input,
            )}
            placeholder={placeholders?.email}
          />
        </div>
        <div role="group" data-slot="field" className={classNames?.field}>
          <label
            className={classNames?.["field-label"]}
            data-slot="field-label"
          >
            {labels?.message || "Message"}
          </label>
          <textarea
            className={clsx(
              "focus-visible:outline-2 focus-visible:outline-offset-3",
              classNames?.textarea,
            )}
            data-slot="textarea"
            placeholder={placeholders?.message}
          />
        </div>
      </div>
      <div role="group" data-slot="field" className={classNames?.field}>
        <Button
          type="submit"
          className={classNames?.button}
          data-slot="button"
          label={buttonLabel || "Submit"}
        />
      </div>
    </form>
  );
}
