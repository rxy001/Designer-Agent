import { Accordion as BaseAccordion } from "@base-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

export interface AccordionProps {
  items?: Array<{
    key: string;
    title?: string;
    content?: string;
  }>;
  classNames?: {
    accordion?: string;
    "accordion-item"?: string;
    "accordion-trigger"?: string;
    "accordion-panel"?: string;
    "accordion-content"?: string;
    "accordion-indicator"?: string;
  };
  disabled?: boolean;
  hiddenUntilFound?: boolean;
  keepMounted?: boolean;
  multiple?: boolean;
}

export function Accordion({ items, classNames, ...rest }: AccordionProps) {
  return (
    <BaseAccordion.Root
      {...rest}
      className={twMerge(classNames?.["accordion"])}
      data-slot="accordion"
    >
      {items?.map((item, index) => (
        <BaseAccordion.Item
          className={classNames?.["accordion-item"]}
          data-slot="accordion-item"
          key={item.key || index}
          value={item.key}
        >
          <BaseAccordion.Header className="flex">
            <BaseAccordion.Trigger
              className={twMerge(
                "group/accordion-trigger flex flex-1 items-start justify-between",
                classNames?.["accordion-trigger"],
              )}
              data-slot="accordion-trigger"
            >
              {item.title}
              <ChevronDownIcon
                data-slot="accordion-indicator"
                className={twMerge(
                  "pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden",
                  classNames?.["accordion-indicator"],
                )}
              />
              <ChevronUpIcon
                data-slot="accordion-indicator"
                className={twMerge(
                  "pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline",
                  classNames?.["accordion-indicator"],
                )}
              />
            </BaseAccordion.Trigger>
          </BaseAccordion.Header>
          <BaseAccordion.Panel
            className={twMerge(
              "h-(--accordion-panel-height) overflow-hidden",
              classNames?.["accordion-panel"],
            )}
            data-slot="accordion-panel"
          >
            <div
              data-slot="accordion-content"
              className={classNames?.["accordion-content"]}
            >
              {item.content}
            </div>
          </BaseAccordion.Panel>
        </BaseAccordion.Item>
      ))}
    </BaseAccordion.Root>
  );
}
