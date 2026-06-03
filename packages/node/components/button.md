# Button

A button component that can be used to trigger actions.

## Usage guidelines

- **Label**: Use the `label` prop for the button text.
- **Styling**: Use `className` to style the rendered button.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Button } from "@/components";

export default function App() {
  return <Button label="Button" className="***" />;
}
```

## DOM structure

```html
<button>Button</button>
```

## API reference

### Button Props:

| Prop      | Type     | Default | Description                            |
| :-------- | :------- | :------ | :------------------------------------- |
| label     | `string` | -       | The text displayed inside the button.  |
| className | `string` | -       | CSS class applied to the root element. |
