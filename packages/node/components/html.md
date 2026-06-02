# HTML

It can display custom HTML snippets.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { HTML } from "@/components";

export default function App() {
  return <Html html="<div className='***'>custom</div>" />;
}
```

The HTML component uses `dangerouslySetInnerHTML` internally.

## API reference

### HTML Props

| Prop | Type     | Default | Description          |
| :--- | :------- | :------ | :------------------- |
| html | `string` | -       | Custom HTML snippets |
