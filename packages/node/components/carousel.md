# Carousel

Displays a carousel of image-based slides with previous and next controls.

## Usage guidelines

- **Items**: Each item can render an image, title, and description.
- **Keyboard**: Left and right arrow keys move to the previous or next slide.
- **Accessibility**: Previous and next controls include descriptive accessible labels.
- **Styling**: Use the `classNames` prop to style the root and internal elements.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Carousel } from "@/components";

export default function App() {
  return (
    <Carousel
      items={[
        {
          imgSrc: "https://*.com",
          imgAlt: "Random Image 1",
          title: "Slide 1",
          description: "Description for Slide 1",
        },
      ]}
      classNames={{
        carousel: "***",
        "carousel-content": "***",
        "carousel-previous": "***",
        "carousel-next": "***",
        "carousel-item": "***",
        "carousel-item-img": "***",
        "carousel-item-title": "***",
        "carousel-item-description": "***",
      }}
    />
  );
}
```

## DOM structure

This shows the rendered DOM structure and key data attributes.

```html
<div
  data-slot="carousel"
  role="region"
  aria-roledescription="carousel"
  class="relative h-full"
>
  <div class="h-full overflow-hidden">
    <div data-slot="carousel-content" class="flex w-full h-full">
      <div
        data-slot="carousel-item"
        role="group"
        aria-roledescription="slide"
        class="min-w-0 shrink-0 grow-0 basis-full"
      >
        <img data-slot="carousel-item-img" />
        <div data-slot="carousel-item-title">Slide title</div>
        <div data-slot="carousel-item-description">Slide description</div>
      </div>
    </div>
  </div>
  <button
    data-slot="carousel-previous"
    aria-label="Previous slide"
    class="absolute touch-manipulation rounded-full inline-flex justify-center items-center top-1/2 left-3"
  >
    <svg class="lucide lucide-chevron-left"></svg>
  </button>
  <button
    data-slot="carousel-next"
    aria-label="Next slide"
    class="absolute touch-manipulation rounded-full inline-flex justify-center items-center top-1/2 right-3"
  >
    <svg class="lucide lucide-chevron-right"></svg>
  </button>
</div>
```

## API reference

### Carousel Props:

| Prop       | Type             | Default | Description                               |
| :--------- | :--------------- | :------ | :---------------------------------------- |
| items      | `CarouselItem[]` | -       | The items displayed in the carousel.      |
| classNames | `ClassNamesProp` | -       | CSS classes applied to internal elements. |
| id         | `string`         | -       | The id applied to the root element.       |

**Additional Types**

```typescript
type CarouselItem = {
  imgSrc?: string;
  imgAlt?: string;
  title?: string;
  description?: string;
};

type ClassNamesProp = {
  carousel?: string;
  "carousel-content"?: string;
  "carousel-previous"?: string;
  "carousel-next"?: string;
  "carousel-item"?: string;
  "carousel-item-img"?: string;
  "carousel-item-title"?: string;
  "carousel-item-description"?: string;
};
```

### Data Attributes

**Carousel Data Attributes:**

| Attribute | Type | Description                                                           |
| :-------- | :--- | :-------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the root slot of the `carousel` component. |

**CarouselContent Data Attributes:**

| Attribute | Type | Description                                                                |
| :-------- | :--- | :------------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `content` slot of the `carousel` component. |

**CarouselItem Data Attributes:**

| Attribute | Type | Description                                                             |
| :-------- | :--- | :---------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `item` slot of the `carousel` component. |

**CarouselItem Image Data Attributes:**

| Attribute | Type | Description                                                                 |
| :-------- | :--- | :-------------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `item-img` slot of the `carousel` component. |

**CarouselItem Title Data Attributes:**

| Attribute | Type | Description                                                                   |
| :-------- | :--- | :---------------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `item-title` slot of the `carousel` component. |

**CarouselItem Description Data Attributes:**

| Attribute | Type | Description                                                                         |
| :-------- | :--- | :---------------------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `item-description` slot of the `carousel` component. |

**CarouselPrevious Button Data Attributes:**

| Attribute     | Type | Description                                                                 |
| :------------ | :--- | :-------------------------------------------------------------------------- | --- |
| data-slot     | -    | Identifies this element as the `previous` slot of the `carousel` component. |     |
| data-disabled | -    | Present when previous scrolling is disabled.                                |

**CarouselNext Button Data Attributes:**

| Attribute     | Type | Description                                                             |
| :------------ | :--- | :---------------------------------------------------------------------- |
| data-slot     | -    | Identifies this element as the `next` slot of the `carousel` component. |
| data-disabled | -    | Present when next scrolling is disabled.                                |
