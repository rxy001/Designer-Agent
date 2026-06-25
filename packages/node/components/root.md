# Root

The root container for a component tree.

## Usage guidelines

- **Styling**: Use `className` to style the rendered root element.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root className="***">
      <Section columns={4} rows={2}>
        <Text content="Content" className="row-start-1 row-end-2 col-start-1 col-end-4" />
      </Section>
    </Root>
  );
}
```

## DOM structure

This shows the rendered DOM structure and key data attributes.

```html
<div data-slot="root">
  <div>Content</div>
</div>
```

## API reference

### Root Props:

| Prop      | Type        | Default | Description                            |
| :-------- | :---------- | :------ | :------------------------------------- |
| id        | `string`    | -       | The id applied to the root element.    |
| children  | `ReactNode` | -       | The content rendered inside the root.  |
| className | `string`    | -       | CSS class applied to the root element. |

### Data Attributes

**Root Data Attributes:**

| Attribute | Type | Description                                                       |
| :-------- | :--- | :---------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the root slot of the `root` component. |
