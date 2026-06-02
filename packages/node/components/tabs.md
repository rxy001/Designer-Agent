# Tabs

A set of tab triggers and panels for switching between related content.

## Usage guidelines

- **Item keys**: Each item must have a unique `key`; the key is used as the tab and panel value.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Tabs } from "@/components";

export default function App() {
  return (
    <Tabs
      className="***"
      items={[
        {
          key: "overview",
          title: "Overview",
          content: "Overview content",
        },
        {
          key: "details",
          title: "Details",
          content: "Details content",
        },
      ]}
      slots={{
        panel: {
          className: "***",
        },
        list: {
          className: "***",
        },
        tab: {
          className: "***",
        },
      }}
    />
  );
}
```

## DOM structure

```html
<div data-slot="root">
  <div data-slot="list">
    <button data-slot="tab">Tab Title</button>
  </div>
  <div data-slot="panel">Tab Content</div>
</div>
```

## API reference

### Tabs Props:

| Prop        | Type                         | Default        | Description                             |
| :---------- | :--------------------------- | :------------- | :-------------------------------------- |
| className   | `string`                     | -              | CSS class applied to the root element.  |
| style       | `React.CSSProperties`        | -              | Style applied to the root element.      |
| items       | `ItemsProp`                  | -              | The tabs and panel contents to display. |
| slots       | `SlotsProp`                  | -              | The component&#x27;s named slots.       |
| orientation | `"horizontal" \| "vertical"` | `"horizontal"` | The orientation of the tabs.            |

**Additional Types**

```typescript
type ItemsProp = {
  key: string;
  title?: string;
  content?: string;
}[];

type SlotsProp = {
  list?: ListProps;
  tab?: TabProps;
  panel?: PanelProps;
};
```

### Slots

**Root Data Attributes:**

| Attribute                 | Type                                            | Description                                       |
| :------------------------ | :---------------------------------------------- | :------------------------------------------------ |
| data-orientation          | `"horizontal" \| "vertical"`                    | Indicates the orientation of the tabs.            |
| data-activation-direction | `"left" \| "right" \| "up" \| "down" \| "none"` | Indicates the direction of the active tab change. |

**List Props:**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**List Data Attributes:**

| Attribute                 | Type                                            | Description                                       |
| :------------------------ | :---------------------------------------------- | :------------------------------------------------ |
| data-orientation          | `"horizontal" \| "vertical"`                    | Indicates the orientation of the tabs.            |
| data-activation-direction | `"left" \| "right" \| "up" \| "down" \| "none"` | Indicates the direction of the active tab change. |

**Tab Props:**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |
| disabled  | `boolean`             | `false` | Whether the tab is disabled.      |

**Tab Data Attributes:**

| Attribute                 | Type                                            | Description                                       |
| :------------------------ | :---------------------------------------------- | :------------------------------------------------ |
| data-active               | -                                               | Present when the tab is active.                   |
| data-disabled             | -                                               | Present when the tab is disabled.                 |
| data-orientation          | `"horizontal" \| "vertical"`                    | Indicates the orientation of the tabs.            |
| data-activation-direction | `"left" \| "right" \| "up" \| "down" \| "none"` | Indicates the direction of the active tab change. |

**Panel Props:**

| Prop        | Type                  | Default | Description                                                            |
| :---------- | :-------------------- | :------ | :--------------------------------------------------------------------- |
| className   | `string`              | -       | CSS class applied to the element.                                      |
| style       | `React.CSSProperties` | -       | Style applied to the element.                                          |
| keepMounted | `boolean`             | `false` | Whether to keep the HTML element in the DOM while the panel is hidden. |

**Panel Data Attributes:**

| Attribute                 | Type                                            | Description                                                                   |
| :------------------------ | :---------------------------------------------- | :---------------------------------------------------------------------------- |
| data-orientation          | `'horizontal' \| 'vertical'`                    | Indicates the orientation of the tabs.                                        |
| data-activation-direction | `'left' \| 'right' \| 'up' \| 'down' \| 'none'` | Indicates the direction of the activation (based on the previous active tab). |
| data-hidden               | -                                               | Present when the panel is hidden.                                             |
| data-index                | -                                               | Indicates the index of the tab panel.                                         |
| data-starting-style       | -                                               | Present when the panel is animating in.                                       |
| data-ending-style         | -                                               | Present when the panel is animating out.                                      |
