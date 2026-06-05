import { Button } from "./Button";
import clsx from "clsx";

export interface CardProps {
  imgSrc?: string;
  imgAlt?: string;
  title?: string;
  description?: string;
  content?: string;
  buttonLabel?: string;
  classNames?: {
    root?: string;
    img?: string;
    header?: string;
    title?: string;
    description?: string;
    content?: string;
    footer?: string;
    button?: string;
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
    classNames,
  } = props;

  return (
    <div
      className={clsx("flex flex-col justify-between", classNames?.root)}
      data-slot="root"
    >
      {imgSrc && (
        <img
          data-slot="img"
          src={imgSrc}
          draggable={false}
          alt={imgAlt || ""}
          className={classNames?.img}
        />
      )}
      {(title || description) && (
        <div className={classNames?.header} data-slot="header">
          {title && (
            <div className={classNames?.title} data-slot="title">
              {title}
            </div>
          )}
          {description && (
            <div className={classNames?.description} data-slot="description">
              {description}
            </div>
          )}
        </div>
      )}
      {content && (
        <div className={classNames?.content} data-slot="content">
          {content}
        </div>
      )}
      {buttonLabel && (
        <div className={classNames?.footer} data-slot="footer">
          <Button
            className={classNames?.button}
            data-slot="button"
            label={buttonLabel}
          />
        </div>
      )}
    </div>
  );
}
