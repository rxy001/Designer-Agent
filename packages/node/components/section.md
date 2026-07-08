# Section

A layout container that divides its own area into a configurable grid.

## Usage guidelines

- **Grid display**: Section renders the root element with `display: grid` by default.
- **Container size**: Every Section JSX element must include an explicit numeric `height={...}` prop for the desktop/base grid so Section can calculate fixed-size grid rows from the available area. Do not rely on the default height.
- **Children**: Use grid placement classes or styles on children to position them within the section grid.
- **Responsive grid**: Section is desktop-first. `columns`, `rows`, `height`, `columnGap`, and `rowGap` define the base/desktop grid; use `responsive.tablet` for widths from 640px through 1023px and `responsive.mobile` for widths below 640px. If a tablet or mobile override changes `rows`, stacks content, or needs different vertical space, include `height` in that same breakpoint override.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Section, Text } from "@/components";

export default function App() {
  return (
    <Section
      className="***"
      columns={22}
      rows={13}
      height={720}
      columnGap={11}
      rowGap={11}
      responsive={{
        tablet: { columns: 12, rows: 8, height: 640 },
        mobile: { columns: 4, rows: 10, height: 760, columnGap: 10, rowGap: 10 },
      }}
    >
      <Text content="Content" className="row-start-1 row-end-3 col-start-1 col-end-12 sm:max-lg:col-end-8 max-sm:col-end-5" />
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
  style="height: 720px; grid-template-columns: repeat(22, ...); grid-template-rows: repeat(13, ...); column-gap: 11px; row-gap: 11px"
>
  <div>Content</div>
</div>
```

## API reference

### Section Props:

| Prop       | Type                                                            | Default | Description                                                              |
| :--------- | :-------------------------------------------------------------- | :------ | :----------------------------------------------------------------------- |
| id         | `string`                                                        | -       | The id applied to the root element.                                      |
| className  | `string`                                                        | -       | CSS class applied to the root element.                                   |
| children   | `ReactNode`                                                     | -       | The content of the section.                                              |
| columns    | `number`                                                        | `22`    | The number of columns in the base/desktop section grid.                  |
| rows       | `number`                                                        | `13`    | The number of rows in the base/desktop section grid.                     |
| height     | `number`                                                        | `720`   | The height of the base/desktop section canvas in pixels.                 |
| columnGap  | `number`                                                        | `11`    | The horizontal gap between base/desktop grid cells in pixels.            |
| rowGap     | `number`                                                        | `11`    | The vertical gap between base/desktop grid cells in pixels.              |
| responsive | `{ tablet?: Partial<SectionGrid>; mobile?: Partial<SectionGrid> }` | -       | Optional tablet and mobile overrides for columns, rows, height, columnGap, and rowGap. |

### Data Attributes

**Section Data Attributes:**

| Attribute | Type | Description                                                          |
| :-------- | :--- | :------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the root slot of the `section` component. |
