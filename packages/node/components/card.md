# Card

Displays a card with header, content, and footer.

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
      description="This is a description of the card content."
      content="Additional content can go here, such as text, links, or other components."
      buttonLabel="Learn More"
      slots={{
        img: {
          className: "***",
        },
        header: {
          className: "***",
        },
        description: {
          className: "***",
        },
        content: {
          className: "***",
        },
        footer: {
          className: "***",
        },
        action: {
          className: "***",
        },
      }}
    />
  );
}
```

## DOM strcture

This shows the DOM structure and default class names of every slot.

```html
<div data-slot="root">
  <img data-slot="img" />
  <div data-slot="header">
    <div data-slot="title">Card Title</div>
    <div data-slot="description">Card Description</div>
  </div>
  <div data-slot="content">Card Content</div>
  <div data-slot="footer">
    <button data-slot="action">Button Label</button>
  </div>
</div>
```

## API reference

### Card Props:

| Prop        | Type                  | Default | Description                                                       |
| :---------- | :-------------------- | :------ | :---------------------------------------------------------------- |
| imgSrc      | `string`              | -       | The source URL of the image to be displayed in the card.          |
| imgAlt      | `string`              | -       | The alt text for the image.                                       |
| title       | `string`              | -       | The title text to be displayed in the card header.                |
| description | `string`              | -       | The description text to be displayed in the card header.          |
| content     | `string`              | -       | Additional content to be displayed in the card body.              |
| buttonLabel | `string`              | -       | The text to be displayed on the action button in the card footer. |
| slots       | `SlotsProp`           | -       | The component&#x27;s named slots.                                 |
| className   | `string`              | -       | CSS class applied to the root element.                            |
| style       | `React.CSSProperties` | -       | Style applied to the root element.                                |

**Additional Type**

```typescript
type SlotsProp = {
  img?: ImgProps;
  header?: HeaderProps;
  title?: TitleProps;
  content?: ContentProps;
  description?: DescriptionProps;
  footer?: FooterProps;
  action?: ActionProps;
};
```

### Slots

**Img Props:**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Header Props:**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Title Props:**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Description Props:**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Content Props:**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Description Props:**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Footer Props:**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Action Props:**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |
