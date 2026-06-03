# Card

Displays a card with optional image, header, content, and action.

## Usage guidelines

- **Optional sections**: Image, header, content, and footer render only when their corresponding props are provided.
- **Action**: Use `buttonLabel` to render the footer action button.
- **Styling**: Use the `classNames` prop to style the root and internal elements.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Card } from "@/components";

export default function App() {
  return (
    <Card
      imgSrc="https://*.com"
      imgAlt="Random image"
      title="Card Title"
      description="This is a description of the card."
      content="Additional content can go here."
      buttonLabel="Learn More"
      classNames={{
        root: "***",
        img: "***",
        header: "***",
        title: "***",
        description: "***",
        content: "***",
        footer: "***",
        action: "***",
      }}
    />
  );
}
```

## DOM structure

```html
<div data-slot="root">
  <img data-slot="img" />
  <div data-slot="header">
    <div data-slot="title">Card Title</div>
    <div data-slot="description">Card description</div>
  </div>
  <div data-slot="content">Card content</div>
  <div data-slot="footer">
    <button data-slot="action">Learn More</button>
  </div>
</div>
```

## API reference

### Card Props:

| Prop        | Type             | Default | Description                               |
| :---------- | :--------------- | :------ | :---------------------------------------- |
| imgSrc      | `string`         | -       | The source URL of the image.              |
| imgAlt      | `string`         | -       | The alt text for the image.               |
| title       | `string`         | -       | The title displayed in the card header.   |
| description | `string`         | -       | The description displayed in the header.  |
| content     | `string`         | -       | The content displayed in the card body.   |
| buttonLabel | `string`         | -       | The label displayed on the action button. |
| classNames  | `ClassNamesProp` | -       | CSS classes applied to internal elements. |

**Additional Types**

```typescript
type ClassNamesProp = {
  root?: string;
  img?: string;
  header?: string;
  title?: string;
  description?: string;
  content?: string;
  footer?: string;
  action?: string;
};
```

### Data Attributes

**Root Data Attributes:**

| Attribute | Type | Description                       |
| :-------- | :--- | :-------------------------------- |
| data-slot | -    | Identifies the element as `root`. |

**Image Data Attributes:**

| Attribute | Type | Description                      |
| :-------- | :--- | :------------------------------- |
| data-slot | -    | Identifies the element as `img`. |

**Header Data Attributes:**

| Attribute | Type | Description                         |
| :-------- | :--- | :---------------------------------- |
| data-slot | -    | Identifies the element as `header`. |

**Title Data Attributes:**

| Attribute | Type | Description                        |
| :-------- | :--- | :--------------------------------- |
| data-slot | -    | Identifies the element as `title`. |

**Description Data Attributes:**

| Attribute | Type | Description                              |
| :-------- | :--- | :--------------------------------------- |
| data-slot | -    | Identifies the element as `description`. |

**Content Data Attributes:**

| Attribute | Type | Description                          |
| :-------- | :--- | :----------------------------------- |
| data-slot | -    | Identifies the element as `content`. |

**Footer Data Attributes:**

| Attribute | Type | Description                         |
| :-------- | :--- | :---------------------------------- |
| data-slot | -    | Identifies the element as `footer`. |

**Action Data Attributes:**

| Attribute | Type | Description                         |
| :-------- | :--- | :---------------------------------- |
| data-slot | -    | Identifies the element as `action`. |
