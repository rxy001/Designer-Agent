# Image

It is used to display images.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Image } from "@/components";

export default function App() {
  return <Image src="https://*.com" className="***" />;
}
```

## DOM structure

```html
<img />;
```

## API reference

### Image Props

| Prop      | Type                  | Default | Description                            |
| :-------- | :-------------------- | :------ | :------------------------------------- |
| className | `string`              | -       | CSS class applied to the root element. |
| style     | `React.CSSProperties` | -       | Style applied to the root element.     |
| src       | `string`              | -       | The source URL of the image            |
| alt       | `string`              | -       | The alt text for the image             |
