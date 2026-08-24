import { twMerge } from "tailwind-merge";
import { Button } from "./Button";

export interface CardProps {
  imgSrc?: string;
  imgAlt?: string;
  title?: string;
  description?: string;
  content?: string;
  buttonLabel?: string;
  buttonHref?: string;
  id?: string;
  classNames?: {
    card?: string;
    "card-img"?: string;
    "card-header"?: string;
    "card-title"?: string;
    "card-description"?: string;
    "card-content"?: string;
    "card-footer"?: string;
    "card-action"?: string;
  };
}

export function Card(props: CardProps) {
  const {
    imgSrc,
    imgAlt,
    title,
    description,
    content,
    buttonLabel,
    buttonHref,
    classNames,
    id,
  } = props;

  return (
    <div
      className={twMerge(
        "flex flex-col justify-between *:grow-0 *:shrink-0",
        classNames?.card,
      )}
      id={id}
      data-slot="card"
    >
      {imgSrc && (
        <img
          data-slot="card-img"
          src={imgSrc}
          draggable={false}
          alt={imgAlt || ""}
          className={classNames?.["card-img"]}
        />
      )}
      {(title || description) && (
        <div className={classNames?.["card-header"]} data-slot="card-header">
          {title && (
            <div className={classNames?.["card-title"]} data-slot="card-title">
              {title}
            </div>
          )}
          {description && (
            <div
              className={classNames?.["card-description"]}
              data-slot="card-description"
            >
              {description}
            </div>
          )}
        </div>
      )}
      {content && (
        <div className={classNames?.["card-content"]} data-slot="card-content">
          {content}
        </div>
      )}
      {buttonLabel && (
        <div className={classNames?.["card-footer"]} data-slot="card-footer">
          <Button
            className={classNames?.["card-action"]}
            data-slot="card-action"
            label={buttonLabel}
            href={buttonHref}
          />
        </div>
      )}
    </div>
  );
}
