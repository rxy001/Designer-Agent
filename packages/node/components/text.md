# Text

Displays text content.

## Usage guidelines

- **Content**: Use the `content` prop for the paragraph text.
- **Styling**: Use `className` to style the rendered paragraph.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Text } from "@/components";

export default function App() {
  return <Text content="Text content" className="***" />;
}
```

## DOM structure

This shows the rendered DOM structure and key data attributes.

```html
<p data-slot="text">Text content</p>
```

## API reference

### Text Props:

| Prop      | Type     | Default | Description                            |
| :-------- | :------- | :------ | :------------------------------------- |
| content   | `string` | -       | The text content to display.           |
| className | `string` | -       | CSS class applied to the root element. |

### Data Attributes

**Text Data Attributes:**

| Attribute | Type | Description                                                       |
| :-------- | :--- | :---------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the root slot of the `text` component. |
