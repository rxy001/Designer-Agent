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
      ]}
      classNames={{
        social: "***",
        "social-item": "***",
      }}
    />
  );
}
```

## DOM structure

This shows the rendered DOM structure and key data attributes.

```html
<div data-slot="social">
  <a data-slot="social-item" href="https://github.com/*">
    <svg></svg>
  </a>
  <a data-slot="social-item" href="https://linkedin.com/in/*">
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
  social?: string;
  "social-item"?: string;
};
```

### Data Attributes

**Social Data Attributes:**

| Attribute | Type | Description                                                         |
| :-------- | :--- | :------------------------------------------------------------------ |
| data-slot | -    | Identifies this element as the root slot of the `social` component. |

**SocialItem Data Attributes:**

| Attribute | Type | Description                                                           |
| :-------- | :--- | :-------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `item` slot of the `social` component. |
