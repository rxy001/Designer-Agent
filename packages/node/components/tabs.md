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
        tabs: "***",
        "tabs-list": "***",
        "tabs-tab": "***",
        "tabs-content": "***",
      }}
    />
  );
}
```

## DOM structure

This shows the rendered DOM structure and key data attributes.

```html
<div
  data-slot="tabs"
  data-orientation="horizontal"
  data-activation-direction="none"
>
  <div
    data-slot="tabs-list"
    data-orientation="horizontal"
    data-activation-direction="none"
  >
    <button
      data-slot="tabs-tab"
      data-orientation="horizontal"
      data-activation-direction="none"
      data-active
    >
      Overview
    </button>
    <button
      data-slot="tabs-tab"
      data-orientation="horizontal"
      data-activation-direction="none"
    >
      Details
    </button>
  </div>
  <div
    data-slot="tabs-content"
    data-orientation="horizontal"
    data-activation-direction="none"
    data-index="0"
  >
    Overview content
  </div>
  <div
    data-slot="tabs-content"
    data-orientation="horizontal"
    data-activation-direction="none"
    data-index="1"
    data-hidden
  >
    Details content
  </div>
</div>
```

## API reference

### Tabs Props:

| Prop        | Type                         | Default        | Description                               |
| :---------- | :--------------------------- | :------------- | :---------------------------------------- |
| items       | `ItemsProp`                  | -              | The tabs and panel contents to display.   |
| classNames  | `ClassNamesProp`             | -              | CSS classes applied to internal elements. |
| orientation | `"horizontal" \| "vertical"` | `"horizontal"` | The orientation of the tabs.              |

**Additional Types**

```typescript
type ItemsProp = {
  key: string;
  title?: string;
  content?: string;
}[];

type ClassNamesProp = {
  tabs?: string;
  "tabs-list"?: string;
  "tabs-tab"?: string;
  "tabs-content"?: string;
};
```

### Data Attributes

**Tabs Data Attributes:**

| Attribute                 | Type                                            | Description                                                       |
| :------------------------ | :---------------------------------------------- | :---------------------------------------------------------------- |
| data-slot                 | -                                               | Identifies this element as the root slot of the `tabs` component. |
| data-orientation          | `"horizontal" \| "vertical"`                    | Indicates the orientation of the tabs.                            |
| data-activation-direction | `"left" \| "right" \| "up" \| "down" \| "none"` | Indicates the direction of the active tab change.                 |

**TabsList Data Attributes:**

| Attribute                 | Type                                            | Description                                                         |
| :------------------------ | :---------------------------------------------- | :------------------------------------------------------------------ |
| data-slot                 | -                                               | Identifies this element as the `list` slot of the `tabs` component. |
| data-orientation          | `"horizontal" \| "vertical"`                    | Indicates the orientation of the tabs.                              |
| data-activation-direction | `"left" \| "right" \| "up" \| "down" \| "none"` | Indicates the direction of the active tab change.                   |

**TabsTab Data Attributes:**

| Attribute                 | Type                                            | Description                                                        |
| :------------------------ | :---------------------------------------------- | :----------------------------------------------------------------- |
| data-slot                 | -                                               | Identifies this element as the `tab` slot of the `tabs` component. |
| data-orientation          | `"horizontal" \| "vertical"`                    | Indicates the orientation of the tabs.                             |
| data-activation-direction | `"left" \| "right" \| "up" \| "down" \| "none"` | Indicates the direction of the active tab change.                  |
| data-active               | -                                               | Present when the tab is active.                                    |
| data-disabled             | -                                               | Present when the tab is disabled.                                  |

**TabsContent Data Attributes:**

| Attribute                 | Type                                            | Description                                                            |
| :------------------------ | :---------------------------------------------- | :--------------------------------------------------------------------- |
| data-slot                 | -                                               | Identifies this element as the `content` slot of the `tabs` component. |
| data-index                | `number`                                        | Indicates the index of the tab panel.                                  |
| data-orientation          | `"horizontal" \| "vertical"`                    | Indicates the orientation of the tabs.                                 |
| data-activation-direction | `"left" \| "right" \| "up" \| "down" \| "none"` | Indicates the direction of the active tab change.                      |
| data-hidden               | -                                               | Present when the panel is hidden.                                      |
| data-starting-style       | -                                               | Present when the panel is animating in.                                |
| data-ending-style         | -                                               | Present when the panel is animating out.                               |
