# Section

A layout container that divides its own area into a configurable grid.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Section } from "@/components";

export default function App() {
  return (
    <Section
      className="***"
      columns={22}
      rows={13}
      columnGap={11}
      rowGap={11}
    />
  );
}
```

## DOM structure

This shows the DOM structure and default class names of every slot.

```html
<div className="grid" />
```

## API reference

### Section Props:

| Prop      | Type                  | Default | Description                                      |
| :-------- | :-------------------- | :------ | :----------------------------------------------- |
| className | `string`              | -       | CSS class applied to the root element.           |
| style     | `React.CSSProperties` | -       | Style applied to the root element.               |
| children  | `ReactNode`           | -       | The content of the section.                      |
| columns   | `number`              | `22`    | The number of columns in the section grid.       |
| rows      | `number`              | `13`    | The number of rows in the section grid.          |
| columnGap | `number`              | `11`    | The horizontal gap between grid cells in pixels. |
| rowGap    | `number`              | `11`    | The vertical gap between grid cells in pixels.   |
