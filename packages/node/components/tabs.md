# Tabs

A set of tab triggers and panels for switching between related content.

## Usage guidelines

- **Item keys**: Each item must have a unique `key`; the key is used as the tab and panel value.
- **Orientation**: Use `orientation="horizontal"` or `orientation="vertical"` to control the tab layout direction.
- **Styling**: Use the `classNames` prop to style the root and internal elements.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Tabs } from "@/components";

export default function App() {
  return (
    <Tabs
      items={[
        { key: "overview", title: "Overview", content: "Overview content" },
        { key: "details", title: "Details", content: "Details content" },
      ]}
      classNames={{
        root: "***",
        list: "***",
        tab: "***",
        panel: "***",
      }}
    />
  );
}
```

## DOM structure

```html
<div data-slot="root">
  <div data-slot="list">
    <button data-slot="tab">Overview</button>
    <button data-slot="tab">Details</button>
  </div>
  <div data-slot="panel">Overview content</div>
  <div data-slot="panel">Details content</div>
</div>
```

## API reference

### Tabs Props:

| Prop        | Type                         | Default | Description                                                 |
| :---------- | :--------------------------- | :------ | :---------------------------------------------------------- |
| items       | `ItemsProp`                  | -       | The tabs and panel contents to display.                     |
| classNames  | `ClassNamesProp`             | -       | CSS classes applied to internal elements.                   |
| orientation | `"horizontal" \| "vertical"` | `"horizontal"` | The orientation of the tabs.                                |

**Additional Types**

```typescript
type ItemsProp = {
  key: string;
  title?: string;
  content?: string;
}[];

type ClassNamesProp = {
  root?: string;
  list?: string;
  tab?: string;
  panel?: string;
};
```

### Data Attributes

**Root Data Attributes:**

| Attribute                 | Type                                            | Description                                       |
| :------------------------ | :---------------------------------------------- | :------------------------------------------------ |
| data-slot                 | -                                               | Identifies the element as `root`.                 |
| data-orientation          | `"horizontal" \| "vertical"`                    | Indicates the orientation of the tabs.            |
| data-activation-direction | `"left" \| "right" \| "up" \| "down" \| "none"` | Indicates the direction of the active tab change. |

**List Data Attributes:**

| Attribute                 | Type                                            | Description                                       |
| :------------------------ | :---------------------------------------------- | :------------------------------------------------ |
| data-slot                 | -                                               | Identifies the element as `list`.                 |
| data-orientation          | `"horizontal" \| "vertical"`                    | Indicates the orientation of the tabs.            |
| data-activation-direction | `"left" \| "right" \| "up" \| "down" \| "none"` | Indicates the direction of the active tab change. |

**Tab Data Attributes:**

| Attribute                 | Type                                            | Description                                       |
| :------------------------ | :---------------------------------------------- | :------------------------------------------------ |
| data-slot                 | -                                               | Identifies the element as `tab`.                  |
| data-active               | -                                               | Present when the tab is active.                   |
| data-disabled             | -                                               | Present when the tab is disabled.                 |
| data-orientation          | `"horizontal" \| "vertical"`                    | Indicates the orientation of the tabs.            |
| data-activation-direction | `"left" \| "right" \| "up" \| "down" \| "none"` | Indicates the direction of the active tab change. |

**Panel Data Attributes:**

| Attribute                 | Type                                            | Description                                       |
| :------------------------ | :---------------------------------------------- | :------------------------------------------------ |
| data-slot                 | -                                               | Identifies the element as `panel`.                |
| data-index                | `number`                                        | Indicates the index of the tab panel.             |
| data-hidden               | -                                               | Present when the panel is hidden.                 |
| data-orientation          | `"horizontal" \| "vertical"`                    | Indicates the orientation of the tabs.            |
| data-activation-direction | `"left" \| "right" \| "up" \| "down" \| "none"` | Indicates the direction of the active tab change. |
| data-starting-style       | -                                               | Present when the panel is animating in.           |
| data-ending-style         | -                                               | Present when the panel is animating out.          |
