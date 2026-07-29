# Accordion

A set of collapsible panels with headings.

## Usage guidelines

- **Item keys**: Each item must have a unique `key`; the key is used as the accordion item value.
- **Multiple panels**: Set `multiple={true}` when more than one item can be open at the same time.
- **Styling**: Use the `classNames` prop to style the root and internal elements.
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
      ]}
      classNames={{
        accordion: "***",
        "accordion-item": "***",
        "accordion-trigger": "***",
        "accordion-panel": "***",
        "accordion-content": "***",
        "accordion-indicator": "***",
      }}
    />
  );
}
```

## DOM structure

This shows the rendered DOM structure and key data attributes.

```html
<div data-slot="accordion">
  <div data-slot="accordion-item">
    <h3 class="flex">
      <button
        data-slot="accordion-trigger"
        class="group/accordion-trigger flex flex-1 items-start justify-between"
      >
        Panel title
        <svg
          data-slot="accordion-indicator"
          class="lucide lucide-chevron-down pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
        ></svg>
        <svg
          data-slot="accordion-indicator"
          class="lucide lucide-chevron-up pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
        ></svg>
      </button>
    </h3>
    <div
      data-slot="accordion-panel"
      class="h-(--accordion-panel-height) overflow-hidden"
    >
      <div data-slot="accordion-content">Panel content</div>
    </div>
  </div>
</div>
```

## API reference

### Accordion Props:

| Prop             | Type             | Default | Description                                                                                                                               |
| :--------------- | :--------------- | :------ | :---------------------------------------------------------------------------------------------------------------------------------------- |
| items            | `ItemsProp`      | -       | A collection of accordion items.                                                                                                          |
| classNames       | `ClassNamesProp` | -       | CSS classes applied to internal elements.                                                                                                 |
| disabled         | `boolean`        | `false` | Whether the accordion should ignore user interaction.                                                                                     |
| hiddenUntilFound | `boolean`        | `false` | Allows browser find-in-page to find and expand panel contents. Overrides `keepMounted` and uses `hidden="until-found"` for hidden panels. |
| keepMounted      | `boolean`        | `false` | Whether to keep panel elements in the DOM while closed. Ignored when `hiddenUntilFound` is used.                                          |
| multiple         | `boolean`        | `false` | Whether multiple items can be open at the same time.                                                                                      |
| id               | `string`         | -       | The id applied to the root element.                                                                                                       |

**Additional Types**

```typescript
type ItemsProp = {
  key: string;
  title?: string;
  content?: string;
}[];

type ClassNamesProp = {
  accordion?: string;
  "accordion-item"?: string;
  "accordion-trigger"?: string;
  "accordion-panel"?: string;
  "accordion-content"?: string;
  "accordion-indicator"?: string;
};
```

### Data Attributes

**Accordion Data Attributes:**

| Attribute     | Type | Description                                                            |
| :------------ | :--- | :--------------------------------------------------------------------- |
| data-slot     | -    | Identifies this element as the root slot of the `accordion` component. |
| data-disabled | -    | Present when the accordion is disabled.                                |

**AccordionItem Data Attributes:**

| Attribute     | Type     | Description                                                              |
| :------------ | :------- | :----------------------------------------------------------------------- |
| data-slot     | -        | Identifies this element as the `item` slot of the `accordion` component. |
| data-index    | `number` | Indicates the index of the accordion item.                               |
| data-open     | -        | Present when the accordion item is open.                                 |
| data-disabled | -        | Present when the accordion item is disabled.                             |

**AccordionTrigger Data Attributes:**

| Attribute       | Type | Description                                                                 |
| :-------------- | :--- | :-------------------------------------------------------------------------- |
| data-slot       | -    | Identifies this element as the `trigger` slot of the `accordion` component. |
| data-panel-open | -    | Present when the accordion panel is open.                                   |
| data-disabled   | -    | Present when the accordion item is disabled.                                |

**AccordionPanel Data Attributes:**

| Attribute           | Type     | Description                                                               |
| :------------------ | :------- | :------------------------------------------------------------------------ |
| data-slot           | -        | Identifies this element as the `panel` slot of the `accordion` component. |
| data-index          | `number` | Indicates the index of the accordion item.                                |
| data-open           | -        | Present when the accordion panel is open.                                 |
| data-disabled       | -        | Present when the accordion item is disabled.                              |
| data-starting-style | -        | Present when the panel is animating in.                                   |
| data-ending-style   | -        | Present when the panel is animating out.                                  |

**AccordionIndicator Data Attributes:**

| Attribute | Type | Description                                                                   |
| :-------- | :--- | :---------------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `indicator` slot of the `accordion` component. |
