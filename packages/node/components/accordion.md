# Accordion

A set of collapsible panels with headings.

## Usage guidelines

- **Item keys**: Each item must have a unique `key`; the key is used as the accordion item value.
- **Multiple panels**: Set `multiple={true}` when more than one item can be open at the same time.
- **Class names**: Use the `classNames` prop to style the root and internal parts.
- **Trigger icons**: The component renders two icon SVGs for the open and closed states. `classNames["trigger-icon"]` is declared in the type, but is not currently applied to those SVGs.
- **Panel mounting**: Use `keepMounted` to keep closed panels in the DOM, or `hiddenUntilFound` to support browser find-in-page for hidden panel content.

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
      classNames={{
        root: "***",
        item: "***",
        header: "***",
        trigger: "***",
        panel: "***",
        content: "***",
      }}
    />
  );
}
```

## DOM structure

This shows the rendered DOM structure and key data attributes.

```html
<div data-slot="root">
  <div data-slot="item">
    <h3 data-slot="header" class="flex">
      <button
        data-slot="trigger"
        class="group/accordion-trigger flex flex-1 items-start justify-between"
      >
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

| Prop             | Type                         | Default      | Description                                                                                                                               |
| :--------------- | :--------------------------- | :----------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| items            | `ItemsProp`                  | -            | A collection of accordion items.                                                                                                          |
| classNames       | `ClassNamesProp`             | -            | CSS classes applied to the root and internal parts.                                                                                       |
| disabled         | `boolean`                    | `false`      | Whether the accordion should ignore user interaction.                                                                                     |
| hiddenUntilFound | `boolean`                    | `false`      | Allows browser find-in-page to find and expand panel contents. Overrides `keepMounted` and uses `hidden="until-found"` for hidden panels. |
| keepMounted      | `boolean`                    | `false`      | Whether to keep panel elements in the DOM while closed. Ignored when `hiddenUntilFound` is used.                                          |
| loopFocus        | `boolean`                    | `true`       | Whether to loop keyboard focus back to the first item when the end of the list is reached while using arrow keys.                         |
| multiple         | `boolean`                    | `false`      | Whether multiple items can be open at the same time.                                                                                      |
| orientation      | `"horizontal" \| "vertical"` | `"vertical"` | The visual orientation of the accordion. Controls whether roving focus uses left/right or up/down arrow keys.                             |

**Additional Types**

```typescript
type ItemsProp = {
  key: string;
  title?: string;
  content?: string;
}[];

type ClassNamesProp = {
  root?: string;
  item?: string;
  header?: string;
  trigger?: string;
  panel?: string;
  content?: string;
  "trigger-icon"?: string;
};
```

### Data Attributes

**Root Data Attributes:**

| Attribute        | Type                         | Description                                 |
| :--------------- | :--------------------------- | :------------------------------------------ |
| data-slot        | -                            | Identifies the element as `root`.           |
| data-disabled    | -                            | Present when the accordion is disabled.     |
| data-orientation | `"horizontal" \| "vertical"` | Indicates the orientation of the accordion. |

**Item Data Attributes:**

| Attribute     | Type     | Description                                  |
| :------------ | :------- | :------------------------------------------- |
| data-slot     | -        | Identifies the element as `item`.            |
| data-index    | `number` | Indicates the index of the accordion item.   |
| data-open     | -        | Present when the accordion item is open.     |
| data-disabled | -        | Present when the accordion item is disabled. |

**Header Data Attributes:**

| Attribute     | Type     | Description                                  |
| :------------ | :------- | :------------------------------------------- |
| data-slot     | -        | Identifies the element as `header`.          |
| data-index    | `number` | Indicates the index of the accordion item.   |
| data-open     | -        | Present when the accordion item is open.     |
| data-disabled | -        | Present when the accordion item is disabled. |

**Trigger Data Attributes:**

| Attribute       | Type | Description                                  |
| :-------------- | :--- | :------------------------------------------- |
| data-slot       | -    | Identifies the element as `trigger`.         |
| data-panel-open | -    | Present when the accordion panel is open.    |
| data-disabled   | -    | Present when the accordion item is disabled. |

**Panel Data Attributes:**

| Attribute           | Type                         | Description                                  |
| :------------------ | :--------------------------- | :------------------------------------------- |
| data-slot           | -                            | Identifies the element as `panel`.           |
| data-index          | `number`                     | Indicates the index of the accordion item.   |
| data-open           | -                            | Present when the accordion panel is open.    |
| data-disabled       | -                            | Present when the accordion item is disabled. |
| data-orientation    | `"horizontal" \| "vertical"` | Indicates the orientation of the accordion.  |
| data-starting-style | -                            | Present when the panel is animating in.      |
| data-ending-style   | -                            | Present when the panel is animating out.     |

**Content Data Attributes:**

| Attribute | Type | Description                          |
| :-------- | :--- | :----------------------------------- |
| data-slot | -    | Identifies the element as `content`. |
