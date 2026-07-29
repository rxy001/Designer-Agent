# Divider

Displays a visual separator.

## Usage guidelines

- **Orientation**: Use `orientation="horizontal"` for a full-width divider and `orientation="vertical"` for a full-height divider.
- **Styling**: Use the `className` prop to style the root element.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Divider } from "@/components";

export default function App() {
  return <Divider orientation="horizontal" className="***" />;
}
```

## DOM structure

This shows the rendered DOM structure and key data attributes.

```html
<hr
  data-slot="divider"
  data-orientation="horizontal"
  class="border-gray-400 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:border-t data-[orientation=vertical]:h-full data-[orientation=vertical]:border-l"
/>
```

## API reference

### Divider Props:

| Prop        | Type                         | Default        | Description                            |
| :---------- | :--------------------------- | :------------- | :------------------------------------- |
| className   | `string`                     | -              | CSS class applied to the root element. |
| orientation | `"horizontal" \| "vertical"` | `"horizontal"` | The orientation of the divider.        |
| id          | `string`                     | -              | The id applied to the root element.    |

### Data Attributes

**Divider Data Attributes:**

| Attribute        | Type                         | Description                                                          |
| :--------------- | :--------------------------- | :------------------------------------------------------------------- |
| data-slot        | -                            | Identifies this element as the root slot of the `divider` component. |
| data-orientation | `"horizontal" \| "vertical"` | Indicates the divider orientation.                                   |
