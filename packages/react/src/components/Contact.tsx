import { Button } from "./Button";
import { twMerge } from "tailwind-merge";

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
    contact?: string;
    "contact-field"?: string;
    "contact-input"?: string;
    "contact-textarea"?: string;
    "contact-button"?: string;
    "contact-field-group"?: string;
    "contact-field-label"?: string;
  };
}

export function Contact(props: ContactProps) {
  const { classNames, labels, placeholders, buttonLabel } = props;

  return (
    <form data-slot="contact" className={classNames?.contact}>
      <div
        data-slot="contact-field-group"
        className={classNames?.["contact-field-group"]}
      >
        <div
          role="group"
          data-slot="contact-field"
          className={classNames?.["contact-field"]}
        >
          <label
            data-slot="contact-field-label"
            className={classNames?.["contact-field-label"]}
          >
            {labels?.name || "Name"}
          </label>
          <input
            className={twMerge(
              "focus-visible:outline-2 focus-visible:outline-offset-3",
              classNames?.["contact-input"],
            )}
            data-slot="contact-input"
            placeholder={placeholders?.name}
          />
        </div>
        <div
          role="group"
          data-slot="contact-field"
          className={classNames?.["contact-field"]}
        >
          <label
            data-slot="contact-field-label"
            className={classNames?.["contact-field-label"]}
          >
            {labels?.email || "Email"}
          </label>
          <input
            data-slot="contact-input"
            className={twMerge(
              "focus-visible:outline-2 focus-visible:outline-offset-3",
              classNames?.["contact-input"],
            )}
            placeholder={placeholders?.email}
          />
        </div>
        <div
          role="group"
          data-slot="contact-field"
          className={classNames?.["contact-field"]}
        >
          <label
            className={classNames?.["contact-field-label"]}
            data-slot="contact-field-label"
          >
            {labels?.message || "Message"}
          </label>
          <textarea
            className={twMerge(
              "focus-visible:outline-2 focus-visible:outline-offset-3",
              classNames?.["contact-textarea"],
            )}
            data-slot="contact-textarea"
            placeholder={placeholders?.message}
          />
        </div>
      </div>
      <div
        role="group"
        data-slot="contact-field"
        className={classNames?.["contact-field"]}
      >
        <Button
          type="submit"
          className={classNames?.["contact-button"]}
          data-slot="contact-button"
          label={buttonLabel || "Submit"}
        />
      </div>
    </form>
  );
}
