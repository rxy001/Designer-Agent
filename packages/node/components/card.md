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
        card: "***",
        "card-img": "***",
        "card-header": "***",
        "card-title": "***",
        "card-description": "***",
        "card-content": "***",
        "card-footer": "***",
        "card-action": "***",
      }}
    />
  );
}
```

## DOM structure

```html
<div data-slot="card" class="flex flex-col justify-between *:grow-0 *:shrink-0">
  <img data-slot="card-img" draggable="false" />
  <div data-slot="card-header">
    <div data-slot="card-title">Card Title</div>
    <div data-slot="card-description">Card description</div>
  </div>
  <div data-slot="card-content">Card content</div>
  <div data-slot="card-footer">
    <button
      data-slot="card-action"
      class="focus-visible:outline-2 focus-visible:outline-offset-3 inline-flex justify-center items-center transition-[color,opacity,background-color,box-shadow] duration-200 ease-in-out"
    >
      Learn More
    </button>
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
  card?: string;
  "card-img"?: string;
  "card-header"?: string;
  "card-title"?: string;
  "card-description"?: string;
  "card-content"?: string;
  "card-footer"?: string;
  "card-action"?: string;
};
```

### Data Attributes

**Card Data Attributes:**

| Attribute | Type | Description                                                       |
| :-------- | :--- | :---------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the root slot of the `card` component. |

**CardImage Data Attributes:**

| Attribute | Type | Description                                                        |
| :-------- | :--- | :----------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `img` slot of the `card` component. |

**CardHeader Data Attributes:**

| Attribute | Type | Description                                                           |
| :-------- | :--- | :-------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `header` slot of the `card` component. |

**CardTitle Data Attributes:**

| Attribute | Type | Description                                                          |
| :-------- | :--- | :------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `title` slot of the `card` component. |

**CardDescription Data Attributes:**

| Attribute | Type | Description                                                                |
| :-------- | :--- | :------------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `description` slot of the `card` component. |

**CardContent Data Attributes:**

| Attribute | Type | Description                                                            |
| :-------- | :--- | :--------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `content` slot of the `card` component. |

**CardFooter Data Attributes:**

| Attribute | Type | Description                                                           |
| :-------- | :--- | :-------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `footer` slot of the `card` component. |

**CardAction Data Attributes:**

| Attribute | Type | Description                                                           |
| :-------- | :--- | :-------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `action` slot of the `card` component. |
