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
  return <Divider orientation="horizontal" />;
}
```

## DOM structure

This shows the rendered DOM structure and key data attributes.

```html
<hr
  class="border-gray-400 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:border-t data-[orientation=vertical]:h-full data-[orientation=vertical]:border-l"
  data-orientation="horizontal"
/>
```

## API reference

### Divider Props:

| Prop        | Type                         | Default        | Description                            |
| :---------- | :--------------------------- | :------------- | :------------------------------------- |
| className   | `string`                     | -              | CSS class applied to the root element. |
| orientation | `"horizontal" \| "vertical"` | `"horizontal"` | The orientation of the divider.        |

### Data Attributes

**Root Data Attributes:**

| Attribute        | Type                         | Description                        |
| :--------------- | :--------------------------- | :--------------------------------- |
| data-orientation | `"horizontal" \| "vertical"` | Indicates the divider orientation. |
