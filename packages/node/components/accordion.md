# Accordion

A set of collapsible panels with headings.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Accordion } from "@/components";

export default function App() {
  return (
    <Accordion
      items={[
        { key: "1", title: "Panel 1", content: "Content for panel 1" },
        { key: "2", title: "Panel 2", content: "Content for panel 2" },
        { key: "3", title: "Panel 3", content: "Content for panel 3" },
      ]}
      slots={{
        root: {
          className: "***",
        },
        item: {
          className: "***",
        },
        header: {
          className: "***",
        },
        trigger: {
          className: "***",
        },
        panel: {
          className: "***",
        },
        content: {
          className: "***",
        },
        "trigger-icon": {
          className: "***",
        },
      }}
    />
  );
}
```

## DOM structure

This shows the DOM structure and default class names of every slot.

```html
<div data-slot="root">
  <div data-slot="item">
    <h3 data-slot="header" class="flex">
      <button data-slot="trigger">
        Panel title
        <svg
          data-slot="trigger-icon"
          class="lucide lucide-chevron-down pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
        ></svg>
        <svg
          data-slot="trigger-icon"
          class="lucide lucide-chevron-up pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
        ></svg>
      </button>
    </h3>
    <div data-slot="panel" class="h-(--accordion-panel-height) overflow-hidden">
      <div data-slot="content">Panel content</div>
    </div>
  </div>
  <!-- More accordion items -->
</div>
```

## API reference

### Accordion Props:

| Prop             | Type                         | Default      | Description                                                                                                                                                                                                 |
| :--------------- | :--------------------------- | :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| hiddenUntilFound | `boolean`                    | `false`      | Allows the browser's built-in page search to find and expand the panel contents. Overrides the `keepMounted` prop and uses `hidden="until-found"`&#xA;to hide the element without removing it from the DOM. |
| loopFocus        | `boolean`                    | `true`       | Whether to loop keyboard focus back to the first item&#xA;when the end of the list is reached while using the arrow keys.                                                                                   |
| multiple         | `boolean`                    | `false`      | Whether multiple items can be open at the same time.                                                                                                                                                        |
| disabled         | `boolean`                    | `false`      | Whether the component should ignore user interaction.                                                                                                                                                       |
| orientation      | `"horizontal" \| "vertical"` | `'vertical'` | The visual orientation of the accordion.&#xA;Controls whether roving focus uses left/right or up/down arrow keys.                                                                                           |
| className        | `string`                     | -            | CSS class applied to the root element.                                                                                                                                                                      |
| style            | `React.CSSProperties`        | -            | Style applied to the root element.                                                                                                                                                                          |
| keepMounted      | `boolean`                    | `false`      | Whether to keep the element in the DOM while the panel is closed.&#xA;This prop is ignored when `hiddenUntilFound` is used.                                                                                 |
| slots            | `SlotsProp`                  | -            | The component&#x27;s named slots.                                                                                                                                                                           |
| items            | `ItemsProp`                  | -            | A collection of Accordion items                                                                                                                                                                             |

**Additional Type**

```typescript
type SlotsProp = {
  item?: ItemProps;
  header?: HeaderProps;
  trigger?: TriggerProps;
  panel?: PanelProps;
  content?: ContentProps;
  "trigger-icon"?: TriggerIconProps;
};

type ItemsProp = {
  key: string;
  title?: string;
  content?: string;
}[];
```

### Slots

**Root Data Attributes:**

| Attribute        | Type | Description                                 |
| :--------------- | :--- | :------------------------------------------ |
| data-orientation | -    | Indicates the orientation of the accordion. |
| data-disabled    | -    | Present when the accordion is disabled.     |

**Item Props:**

| Prop      | Type                  | Default | Description                                           |
| :-------- | :-------------------- | :------ | :---------------------------------------------------- |
| disabled  | `boolean`             | `false` | Whether the component should ignore user interaction. |
| className | `string`              | -       | CSS class applied to the element.                     |
| style     | `React.CSSProperties` | -       | Style applied to the element.                         |

**Item Data Attributes:**

| Attribute     | Type     | Description                                  |
| :------------ | :------- | :------------------------------------------- |
| data-open     | -        | Present when the accordion item is open.     |
| data-disabled | -        | Present when the accordion item is disabled. |
| data-index    | `number` | Indicates the index of the accordion item.   |

**Header Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Header Data Attributes:**

| Attribute     | Type     | Description                                  |
| :------------ | :------- | :------------------------------------------- |
| data-open     | -        | Present when the accordion item is open.     |
| data-disabled | -        | Present when the accordion item is disabled. |
| data-index    | `number` | Indicates the index of the accordion item.   |

**Trigger Props:**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Trigger Data Attributes:**

| Attribute       | Type | Description                                  |
| :-------------- | :--- | :------------------------------------------- |
| data-panel-open | -    | Present when the accordion panel is open.    |
| data-disabled   | -    | Present when the accordion item is disabled. |

**Trigger Icon Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Panel Props:**

| Prop             | Type                  | Default | Description                                                                                                                                                                                                 |
| :--------------- | :-------------------- | :------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| hiddenUntilFound | `boolean`             | `false` | Allows the browser's built-in page search to find and expand the panel contents. Overrides the `keepMounted` prop and uses `hidden="until-found"`&#xA;to hide the element without removing it from the DOM. |
| className        | `string`              | -       | CSS class applied to the element.                                                                                                                                                                           |
| style            | `React.CSSProperties` | -       | Style applied to the element.                                                                                                                                                                               |
| keepMounted      | `boolean`             | `false` | Whether to keep the element in the DOM while the panel is closed.&#xA;This prop is ignored when `hiddenUntilFound` is used.                                                                                 |

**Panel Data Attributes:**

| Attribute           | Type     | Description                                  |
| :------------------ | :------- | :------------------------------------------- |
| data-open           | -        | Present when the accordion panel is open.    |
| data-orientation    | -        | Indicates the orientation of the accordion.  |
| data-disabled       | -        | Present when the accordion item is disabled. |
| data-index          | `number` | Indicates the index of the accordion item.   |
| data-starting-style | -        | Present when the panel is animating in.      |
| data-ending-style   | -        | Present when the panel is animating out.     |

**Panel CSS Variables:**

| Variable         | Type     | Description                   |
| :--------------- | :------- | :---------------------------- |
| `--panel-height` | `number` | The accordion panel's height. |
| `--panel-width`  | `number` | The accordion panel's width.  |

**Content Props:**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |
