# Button

A button component that can be used to trigger actions.

## Usage guidelines

- **Label**: Use the `label` prop for the button text.
- **Type**: Use `type` to set the native button type (default: "button").
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
<button
  type="button"
  class="focus-visible:outline-2 focus-visible:outline-offset-3 inline-flex justify-center items-center transition-[color,opacity,background-color,box-shadow] duration-200 ease-in-out"
>
  Button
</button>
```

## API reference

### Button Props:

| Prop      | Type                              | Default | Description                            |
| :-------- | :-------------------------------- | :------ | :------------------------------------- |
| label     | `string`                          | -       | The text displayed inside the button.  |
| className | `string`                          | -       | CSS class applied to the root element. |
| type      | `"button" \| "submit" \| "reset"` | -       | The native button type.                |
