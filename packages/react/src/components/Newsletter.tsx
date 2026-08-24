import { Field } from "@base-ui/react/field";
import { Form as BaseForm } from "@base-ui/react/form";
import { Input as BaseInput } from "@base-ui/react/input";
import { twMerge } from "tailwind-merge";
import { Button } from "./Button";

export interface NewsletterProps {
  title?: string;
  description?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  buttonLabel?: string;
  privacyText?: string;
  action?: string;
  method?: "get" | "post";
  id?: string;
  classNames?: {
    newsletter?: string;
    "newsletter-title"?: string;
    "newsletter-description"?: string;
    "newsletter-form"?: string;
    "newsletter-field"?: string;
    "newsletter-label"?: string;
    "newsletter-input"?: string;
    "newsletter-button"?: string;
    "newsletter-privacy"?: string;
  };
}

export function Newsletter({
  title,
  description,
  emailLabel = "Email",
  emailPlaceholder,
  buttonLabel = "Subscribe",
  privacyText,
  action,
  method = "post",
  id,
  classNames,
}: NewsletterProps) {
  return (
    <section id={id} data-slot="newsletter" className={classNames?.newsletter}>
      {title ? (
        <div data-slot="newsletter-title" className={classNames?.["newsletter-title"]}>
          {title}
        </div>
      ) : null}
      {description ? (
        <div
          data-slot="newsletter-description"
          className={classNames?.["newsletter-description"]}
        >
          {description}
        </div>
      ) : null}
      <BaseForm
        action={action}
        method={method}
        data-slot="newsletter-form"
        className={classNames?.["newsletter-form"]}
      >
        <Field.Root
          name="email"
          data-slot="newsletter-field"
          className={twMerge(
            "flex min-w-0 flex-1 flex-col",
            classNames?.["newsletter-field"],
          )}
        >
          <Field.Label
            data-slot="newsletter-label"
            className={classNames?.["newsletter-label"]}
          >
            {emailLabel}
          </Field.Label>
          <BaseInput
            type="email"
            required
            placeholder={emailPlaceholder}
            autoComplete="email"
            data-slot="newsletter-input"
            className={twMerge(
              "focus-visible:outline-2 focus-visible:outline-offset-3",
              classNames?.["newsletter-input"],
            )}
          />
        </Field.Root>
        <Button
          type="submit"
          label={buttonLabel}
          data-slot="newsletter-button"
          className={classNames?.["newsletter-button"]}
        />
      </BaseForm>
      {privacyText ? (
        <div data-slot="newsletter-privacy" className={classNames?.["newsletter-privacy"]}>
          {privacyText}
        </div>
      ) : null}
    </section>
  );
}
