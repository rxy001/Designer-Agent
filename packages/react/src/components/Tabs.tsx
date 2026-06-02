import { Tabs as BaseTabs } from "@base-ui/react/tabs";

export interface TabsProps extends BaseTabs.Root.Props {
  items?: { title?: string; content?: string; key: string }[];
  slots?: {
    list?: BaseTabs.List.Props;
    tab?: BaseTabs.Tab.Props;
    panel?: BaseTabs.Panel.Props;
  };
}

export function Tabs({ items, slots, ...rest }: TabsProps) {
  return (
    <BaseTabs.Root {...rest} data-slot="root">
      <BaseTabs.List {...slots?.list} data-slot="list">
        {items?.map((item) => (
          <BaseTabs.Tab
            {...slots?.tab}
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
          {...slots?.panel}
          key={item.key}
          value={item.key}
        >
          {item.content}
        </BaseTabs.Panel>
      ))}
    </BaseTabs.Root>
  );
}
