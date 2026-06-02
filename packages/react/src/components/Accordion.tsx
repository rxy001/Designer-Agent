import { Accordion as BaseAccordion } from "@base-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import clsx from "clsx";

export interface AccordionProps extends BaseAccordion.Root.Props {
  items?: Array<{
    key: string;
    title?: string;
    content?: string;
  }>;
  slots?: {
    item?: BaseAccordion.Item.Props;
    header?: BaseAccordion.Header.Props;
    trigger?: BaseAccordion.Trigger.Props;
    panel?: BaseAccordion.Panel.Props;
    content?: React.ComponentProps<"div">;
    "trigger-icon"?: React.ComponentProps<"svg">;
  };
}

export function Accordion({ items, slots, ...rest }: AccordionProps) {
  return (
    <BaseAccordion.Root {...rest} data-slot="root">
      {items?.map((item, index) => (
        <BaseAccordion.Item
          {...slots?.["item"]}
          data-slot="item"
          key={item.key || index}
          value={item.key}
        >
          <BaseAccordion.Header
            {...slots?.["header"]}
            className={clsx("flex", slots?.header?.className)}
            data-slot="header"
          >
            <BaseAccordion.Trigger
              {...slots?.["trigger"]}
              className={clsx(
                "group/accordion-trigger flex flex-1 items-start justify-between",
                slots?.trigger?.className,
              )}
              data-slot="trigger"
            >
              {item.title}
              <ChevronDownIcon
                data-slot="trigger-icon"
                className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
              />
              <ChevronUpIcon
                data-slot="trigger-icon"
                className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
              />
            </BaseAccordion.Trigger>
          </BaseAccordion.Header>
          <BaseAccordion.Panel
            {...slots?.["panel"]}
            className={clsx(
              "h-(--accordion-panel-height) overflow-hidden",
              slots?.panel?.className,
            )}
            data-slot="panel"
          >
            <div {...slots?.["content"]} data-slot="content">
              {item.content}
            </div>
          </BaseAccordion.Panel>
        </BaseAccordion.Item>
      ))}
    </BaseAccordion.Root>
  );
}
