import { Button } from "./Button";
import type { ButtonProps } from "./Button";

export interface CardProps extends React.ComponentProps<"div"> {
  imgSrc?: string;
  imgAlt?: string;
  title?: string;
  description?: string;
  content?: string;
  buttonLabel?: string;
  slots?: {
    img?: React.ComponentProps<"img">;
    header?: React.ComponentProps<"div">;
    title?: React.ComponentProps<"div">;
    description?: React.ComponentProps<"div">;
    content?: React.ComponentProps<"div">;
    footer?: React.ComponentProps<"div">;
    action?: ButtonProps;
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
    slots,
    ...rest
  } = props;

  return (
    <div {...rest} data-slot="root">
      {imgSrc && (
        <img
          data-slot="img"
          src={imgSrc}
          draggable={false}
          alt={imgAlt || ""}
          {...slots?.["img"]}
        />
      )}
      {(title || description) && (
        <div {...slots?.["header"]} data-slot="header">
          {title && (
            <div {...slots?.["title"]} data-slot="title">
              {title}
            </div>
          )}
          {description && (
            <div {...slots?.["description"]} data-slot="description">
              {description}
            </div>
          )}
        </div>
      )}
      {content && (
        <div {...slots?.["content"]} data-slot="content">
          {content}
        </div>
      )}
      {buttonLabel && (
        <div {...slots?.["footer"]} data-slot="footer">
          <Button {...slots?.["action"]} data-slot="action">
            {buttonLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
