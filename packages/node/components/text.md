# Text

Displays text content. Renders a `<p>` element.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Text } from "@/components";

export default function App() {
  return <Text className="***">Text content</Text>;
}
```

## DOM structure

```html
<p>Text content</p>
```

## API reference

### Text Props:

| Prop      | Type                  | Default | Description                            |
| :-------- | :-------------------- | :------ | :------------------------------------- |
| className | `string`              | -       | CSS class applied to the root element. |
| style     | `React.CSSProperties` | -       | Style applied to the root element.     |
| children  | `ReactNode`           | -       | The text content to display.           |
