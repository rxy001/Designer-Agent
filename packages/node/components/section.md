# Section

A layout container that divides its own area into a configurable grid.

## Usage guidelines

- **Grid display**: Section renders the root element with `display: grid` by default.
- **Container size**: Provide a measurable width and height when you want Section to calculate fixed-size grid cells from the available area.
- **Children**: Use grid placement classes or styles on children to position them within the section grid.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Section } from "@/components";

export default function App() {
  return (
    <Section className="***" columns={22} rows={13} columnGap={11} rowGap={11}>
      <div>Content</div>
    </Section>
  );
}
```

## DOM structure

This shows the rendered DOM structure and key data attributes.

```html
<div
  data-slot="section"
  class="grid"
  style="grid-template-columns: repeat(22, ...); grid-template-rows: repeat(13, ...); column-gap: 11px; row-gap: 11px"
>
  <div>Content</div>
</div>
```

## API reference

### Section Props:

| Prop      | Type        | Default | Description                                      |
| :-------- | :---------- | :------ | :----------------------------------------------- |
| className | `string`    | -       | CSS class applied to the root element.           |
| children  | `ReactNode` | -       | The content of the section.                      |
| columns   | `number`    | `22`    | The number of columns in the section grid.       |
| rows      | `number`    | `13`    | The number of rows in the section grid.          |
| columnGap | `number`    | `11`    | The horizontal gap between grid cells in pixels. |
| rowGap    | `number`    | `11`    | The vertical gap between grid cells in pixels.   |

### Data Attributes

**Section Data Attributes:**

| Attribute | Type | Description                                                          |
| :-------- | :--- | :------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the root slot of the `section` component. |
