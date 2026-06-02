# Social

Displays a list of social links with built-in icons.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Social } from "@/components";

export default function App() {
  return (
    <Social
      className="***"
      items={[
        { href: "https://*.com", icon: "github" },
        { href: "https://*.com", icon: "linkedin" },
        { href: "https://*.com", icon: "instagram" },
      ]}
      slots={{
        item: {
          className: "***",
        },
      }}
    />
  );
}
```

## DOM structure

This shows the DOM structure and default class names of every slot.

```html
<div data-slot="root">
  <a data-slot="item" />
  <a data-slot="item" />
  <a data-slot="item" />
</div>
```

## API reference

### Social Props:

| Prop      | Type                  | Default | Description                            |
| :-------- | :-------------------- | :------ | :------------------------------------- |
| className | `string`              | -       | CSS class applied to the root element. |
| style     | `React.CSSProperties` | -       | Style applied to the root element.     |
| items     | `itemsProp`           | -       | A list of social links to display.     |
| slots     | `SlotsProp`           | -       | The component&#x27;s named slots.      |

**Additional Types**

```typescript
type itemsProp = {
  href?: string;
  icon?: "facebook" | "twitter" | "linkedin" | "github" | "instagram" | "x";
}[];

type SlotsProp = {
  item?: SocialItemProps;
};
```

### Slots

**Social Item Props:**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |
