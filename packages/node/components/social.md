# Social

Displays a list of social links with built-in icons.

## Usage guidelines

- **Icons**: Each item must provide one of the supported icon names.
- **Links**: Use `href` on each item to set the social link URL.
- **Styling**: Use the `classNames` prop to style the root and social link elements.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Social } from "@/components";

export default function App() {
  return (
    <Social
      items={[
        { href: "https://github.com/*", icon: "github" },
        { href: "https://linkedin.com/in/*", icon: "linkedin" },
        { href: "https://instagram.com/*", icon: "instagram" },
      ]}
      classNames={{
        root: "***",
        item: "***",
      }}
    />
  );
}
```

## DOM structure

```html
<div data-slot="root">
  <a data-slot="item" href="https://github.com/*">
    <svg></svg>
  </a>
  <a data-slot="item" href="https://linkedin.com/in/*">
    <svg></svg>
  </a>
</div>
```

## API reference

### Social Props:

| Prop       | Type             | Default | Description                               |
| :--------- | :--------------- | :------ | :---------------------------------------- |
| items      | `SocialItem[]`   | -       | A list of social links to display.        |
| classNames | `ClassNamesProp` | -       | CSS classes applied to internal elements. |

**Additional Types**

```typescript
type IconType =
  | "facebook"
  | "twitter"
  | "linkedin"
  | "github"
  | "instagram"
  | "x";

type SocialItem = {
  href?: string;
  icon: IconType;
};

type ClassNamesProp = {
  root?: string;
  item?: string;
};
```

### Data Attributes

**Root Data Attributes:**

| Attribute | Type | Description                       |
| :-------- | :--- | :-------------------------------- |
| data-slot | -    | Identifies the element as `root`. |

**Social Item Data Attributes:**

| Attribute | Type | Description                              |
| :-------- | :--- | :--------------------------------------- |
| data-slot | -    | Identifies the element as `item`.        |
