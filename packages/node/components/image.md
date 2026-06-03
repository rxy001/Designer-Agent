# Image

Displays an image.

## Usage guidelines

- **Alt text**: Provide `alt` text for meaningful images.
- **Dragging**: The rendered image sets `draggable="false"`.
- **Styling**: Use `className` to style the image.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Image } from "@/components";

export default function App() {
  return <Image src="https://*.com" alt="Image description" className="***" />;
}
```

## DOM structure

```html
<img src="https://*.com" alt="Image description" draggable="false" />
```

## API reference

### Image Props:

| Prop      | Type     | Default | Description                            |
| :-------- | :------- | :------ | :------------------------------------- |
| src       | `string` | -       | The source URL of the image.           |
| alt       | `string` | -       | The alt text for the image.            |
| className | `string` | -       | CSS class applied to the root element. |
