import { CheckIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

export interface ListProps {
  items?: Array<{
    key: string;
    title?: string;
    description?: string;
    href?: string;
  }>;
  ordered?: boolean;
  marker?: "default" | "check" | "none";
  id?: string;
  classNames?: {
    list?: string;
    "list-item"?: string;
    "list-marker"?: string;
    "list-content"?: string;
    "list-title"?: string;
    "list-description"?: string;
  };
}

export function List({
  items,
  ordered = false,
  marker = "default",
  id,
  classNames,
}: ListProps) {
  const Root = ordered ? "ol" : "ul";

  return (
    <Root
      id={id}
      data-slot="list"
      className={twMerge(marker !== "default" && "list-none", classNames?.list)}
    >
      {items?.map((item, index) => {
        const title = item.href ? <a href={item.href}>{item.title}</a> : item.title;

        return (
          <li
            key={item.key || index}
            data-slot="list-item"
            className={classNames?.["list-item"]}
          >
            {marker === "check" ? (
              <CheckIcon
                aria-hidden="true"
                data-slot="list-marker"
                className={twMerge("shrink-0", classNames?.["list-marker"])}
              />
            ) : null}
            <div data-slot="list-content" className={classNames?.["list-content"]}>
              {item.title ? (
                <div data-slot="list-title" className={classNames?.["list-title"]}>
                  {title}
                </div>
              ) : null}
              {item.description ? (
                <div
                  data-slot="list-description"
                  className={classNames?.["list-description"]}
                >
                  {item.description}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </Root>
  );
}
