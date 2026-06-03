import { Accordion as BaseAccordion } from "@base-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import clsx from "clsx";

export interface AccordionProps {
  items?: Array<{
    key: string;
    title?: string;
    content?: string;
  }>;
  classNames?: {
    root?: string;
    item?: string;
    header?: string;
    trigger?: string;
    panel?: string;
    content?: string;
    "trigger-icon"?: string;
  };
  disabled?: boolean;
  hiddenUntilFound?: boolean;
  keepMounted?: boolean;
  loopFocus?: boolean;
  multiple?: boolean;
  orientation?: "horizontal" | "vertical";
}

export function Accordion({ items, classNames, ...rest }: AccordionProps) {
  return (
    <BaseAccordion.Root {...rest} className={classNames?.root} data-slot="root">
      {items?.map((item, index) => (
        <BaseAccordion.Item
          className={classNames?.item}
          data-slot="item"
          key={item.key || index}
          value={item.key}
        >
          <BaseAccordion.Header
            className={clsx("flex", classNames?.header)}
            data-slot="header"
          >
            <BaseAccordion.Trigger
              className={clsx(
                "group/accordion-trigger flex flex-1 items-start justify-between",
                classNames?.trigger,
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
            className={clsx(
              "h-(--accordion-panel-height) overflow-hidden",
              classNames?.panel,
            )}
            data-slot="panel"
          >
            <div data-slot="content" className={classNames?.content}>
              {item.content}
            </div>
          </BaseAccordion.Panel>
        </BaseAccordion.Item>
      ))}
    </BaseAccordion.Root>
  );
}
