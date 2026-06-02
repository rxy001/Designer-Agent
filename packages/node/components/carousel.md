# Carousel

A set of carousel areas.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Carousel } from "@/components";

export default function Carousel() {
  return (
    <Carousel
      items={[
        {
          imgSrc: "https://*.com",
          imgAlt: "Random Image 1",
          title: "Slide 1",
          description: "Description for Slide 1",
        },
        {
          imgSrc: "https://*.com",
          imgAlt: "Random Image 2",
          title: "Slide 2",
          description: "Description for Slide 2",
        },
      ]}
      slots={{
        content: {
          className: "***",
        },
        previous: {
          className: "***",
        },
        next: {
          className: "***",
        },
        item: {
          className: "***",
        },
        "item-img": {
          className: "***",
        },
        "item-title": {
          className: "***",
        },
        "item-description": {
          className: "***",
        },
      }}
    />
  );
}
```

## DOM structure

```html
<div data-slot="root">
  <div data-slot="content">
    <div data-slot="item">
      <img data-slot="item-img" />
      <div data-slot="item-title">Item Title</div>
      <div data-slot="item-description">Item Description</div>
    </div>
    <!-- More carousel items -->
  </div>
  <button data-slot="previous" />
  <button data-slot="next" />
</div>
```

## API reference

### Carousel Props:

| Prop        | Type                         | Default        | Description                                |
| :---------- | :--------------------------- | :------------- | :----------------------------------------- |
| className   | `string`                     | -              | CSS class applied to the root element.     |
| style       | `React.CSSProperties`        | -              | Style applied to the root element.         |
| slots       | `SlotsProp`                  | -              | The component&#x27;s named slots.          |
| orientation | `"horizontal" \| "vertical"` | `"horizontal"` | The orientation of the carousel.           |
| items       | `ItemsProp`                  | -              | The items to be displayed in the carousel. |

**Additional Types**

```ts
type ItemsProp = {
  imgSrc?: string;
  imgAlt?: string;
  title?: string;
  description?: string;
}[];

type SlotsProp = {
  content?: ContentProps;
  previous?: PreviousProps;
  next?: NextProps;
  item?: ItemProps;
  "item-img"?: ItemImgProps;
  "item-title"?: ItemTitleProps;
  "item-description"?: ItemDescriptionProps;
};
```

### Slots

**Content Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Content Data Attributes**

| Attribute        | Type | Description                                |
| :--------------- | :--- | :----------------------------------------- |
| data-orientation | -    | Indicates the orientation of the carousel. |

**Previous Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Previous Data Attributes**

| Attribute        | Type | Description                                |
| :--------------- | :--- | :----------------------------------------- |
| data-orientation | -    | Indicates the orientation of the carousel. |

**Next Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Next Data Attributes**

| Attribute        | Type | Description                                |
| :--------------- | :--- | :----------------------------------------- |
| data-orientation | -    | Indicates the orientation of the carousel. |

**Item Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Item Data Attributes**

| Attribute        | Type | Description                                |
| :--------------- | :--- | :----------------------------------------- |
| data-orientation | -    | Indicates the orientation of the carousel. |

**Item Img Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Item Title Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Item Description Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element. }   |
