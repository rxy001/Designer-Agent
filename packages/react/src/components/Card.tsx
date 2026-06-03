import { Button } from "@base-ui/react";

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
    action?: string;
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
    <div className={classNames?.root} data-slot="root">
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
          <Button className={classNames?.action} data-slot="action">
            {buttonLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
