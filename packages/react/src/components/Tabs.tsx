import { Tabs as BaseTabs } from "@base-ui/react/tabs";

export interface TabsProps {
  items?: { title?: string; content?: string; key: string }[];
  classNames?: {
    tabs?: string;
    "tabs-list"?: string;
    "tabs-tab"?: string;
    "tabs-content"?: string;
  };
  orientation?: "horizontal" | "vertical";
  id?: string;
}

export function Tabs({ items, id, classNames, orientation }: TabsProps) {
  return (
    <BaseTabs.Root
      orientation={orientation}
      className={classNames?.tabs}
      data-slot="tabs"
      id={id}
    >
      <BaseTabs.List
        className={classNames?.["tabs-list"]}
        data-slot="tabs-list"
      >
        {items?.map((item) => (
          <BaseTabs.Tab
            className={classNames?.["tabs-tab"]}
            data-slot="tabs-tab"
            key={item.key}
            value={item.key}
          >
            {item.title}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
      {items?.map((item) => (
        <BaseTabs.Panel
          data-slot="tabs-content"
          className={classNames?.["tabs-content"]}
          key={item.key}
          value={item.key}
        >
          {item.content}
        </BaseTabs.Panel>
      ))}
    </BaseTabs.Root>
  );
}
