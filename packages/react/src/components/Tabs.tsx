import { Tabs as BaseTabs } from "@base-ui/react/tabs";

export interface TabsProps {
  items?: { title?: string; content?: string; key: string }[];
  classNames?: {
    root?: string;
    list?: string;
    tab?: string;
    panel?: string;
  };
  orientation?: "horizontal" | "vertical";
}

export function Tabs({ items, classNames, orientation }: TabsProps) {
  return (
    <BaseTabs.Root
      orientation={orientation}
      className={classNames?.root}
      data-slot="root"
    >
      <BaseTabs.List className={classNames?.list} data-slot="list">
        {items?.map((item) => (
          <BaseTabs.Tab
            className={classNames?.tab}
            data-slot="tab"
            key={item.key}
            value={item.key}
          >
            {item.title}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
      {items?.map((item) => (
        <BaseTabs.Panel
          data-slot="panel"
          className={classNames?.panel}
          key={item.key}
          value={item.key}
        >
          {item.content}
        </BaseTabs.Panel>
      ))}
    </BaseTabs.Root>
  );
}
