# Button

A button component that can be used to trigger actions. Renders a `<button>` element.

## Usage guidelines

- **Submit buttons**: Unlike the native button element, `type="submit"` must be specified on Button for it to act as a submit button.
- **Links**: The Button component enforces button semantics (`role="button"`, keyboard interaction, disabled state). It should not be used for links.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Button } from "@/components";

export default function App() {
  return <Button className="***">Button</Button>;
}
```

## DOM structure

This shows the DOM structure and default class names of every slot.

```html
<button>Button</button>;
```

## API reference

### Button Props:

| Prop      | Type                              | Default    | Description                                        |
| :-------- | :-------------------------------- | :--------- | :------------------------------------------------- |
| className | `string`                          | -          | CSS class applied to the root element.             |
| style     | `React.CSSProperties`             | -          | Style applied to the root element.                 |
| children  | `ReactNode`                       | -          | The content of the button.                         |
| disabled  | `boolean`                         | `false`    | Whether the button should ignore user interaction. |
| type      | `"button" \| "submit" \| "reset"` | `"button"` | The type of the button.                            |

**Button Data Attributes:**

| Attribute     | Type | Description                          |
| :------------ | :--- | :----------------------------------- |
| data-disabled | -    | Present when the button is disabled. |
