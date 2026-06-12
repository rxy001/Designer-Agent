# Carousel

Displays a carousel of image-based slides with previous and next controls.

## Usage guidelines

- **Items**: Each item can render an image, title, and description.
- **Orientation**: Use `orientation="horizontal"` or `orientation="vertical"` to control the carousel axis.
- **Keyboard**: Left and right arrow keys move to the previous or next slide.
- **Styling**: Use the `classNames` prop to style the root and internal elements.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Carousel } from "@/components";

export default function App() {
  return (
    <Carousel
      orientation="horizontal"
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
  data-orientation="horizontal"
  role="region"
  aria-roledescription="carousel"
  class="relative"
>
  <div class="h-full overflow-hidden">
    <div
      data-slot="carousel-content"
      data-orientation="horizontal"
      class="flex h-full data-[orientation=horizontal]:-ml-4 data-[orientation=vertical]:-ml-4 data-[orientation=vertical]:flex-col"
    >
      <div
        data-slot="carousel-item"
        data-orientation="horizontal"
        role="group"
        aria-roledescription="slide"
        class="min-w-0 shrink-0 grow-0 basis-full data-[orientation=horizontal]:pl-4 data-[orientation=vertical]:pt-4"
      >
        <img data-slot="carousel-item-img" />
        <div data-slot="carousel-item-title">Slide title</div>
        <div data-slot="carousel-item-description">Slide description</div>
      </div>
    </div>
  </div>
  <button
    data-slot="carousel-previous"
    data-orientation="horizontal"
    class="absolute touch-manipulation rounded-full inline-flex justify-center items-center data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:left-3 data-[orientation=vertical]:top-3 data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:rotate-90"
  >
    <svg class="lucide lucide-chevron-left"></svg>
  </button>
  <button
    data-slot="carousel-next"
    data-orientation="horizontal"
    class="absolute touch-manipulation rounded-full inline-flex justify-center items-center data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:right-3 data-[orientation=vertical]:bottom-3 data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:rotate-90"
  >
    <svg class="lucide lucide-chevron-right"></svg>
  </button>
</div>
```

## API reference

### Carousel Props:

| Prop        | Type                         | Default        | Description                               |
| :---------- | :--------------------------- | :------------- | :---------------------------------------- |
| items       | `CarouselItem[]`             | -              | The items displayed in the carousel.      |
| classNames  | `ClassNamesProp`             | -              | CSS classes applied to internal elements. |
| orientation | `"horizontal" \| "vertical"` | `"horizontal"` | The carousel axis.                        |

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

| Attribute        | Type                         | Description                                                           |
| :--------------- | :--------------------------- | :-------------------------------------------------------------------- |
| data-slot        | -                            | Identifies this element as the root slot of the `carousel` component. |
| data-orientation | `"horizontal" \| "vertical"` | Indicates the orientation of the carousel.                            |

**CarouselContent Data Attributes:**

| Attribute        | Type                         | Description                                                                |
| :--------------- | :--------------------------- | :------------------------------------------------------------------------- |
| data-slot        | -                            | Identifies this element as the `content` slot of the `carousel` component. |
| data-orientation | `"horizontal" \| "vertical"` | Indicates the orientation of the carousel.                                 |

**CarouselItem Data Attributes:**

| Attribute        | Type                         | Description                                                             |
| :--------------- | :--------------------------- | :---------------------------------------------------------------------- |
| data-slot        | -                            | Identifies this element as the `item` slot of the `carousel` component. |
| data-orientation | `"horizontal" \| "vertical"` | Indicates the orientation of the carousel.                              |

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

| Attribute        | Type                         | Description                                                                 |
| :--------------- | :--------------------------- | :-------------------------------------------------------------------------- |
| data-slot        | -                            | Identifies this element as the `previous` slot of the `carousel` component. |
| data-orientation | `"horizontal" \| "vertical"` | Indicates the orientation of the carousel.                                  |
| data-disabled    | -                            | Present when previous scrolling is disabled.                                |

**CarouselNext Button Data Attributes:**

| Attribute        | Type                         | Description                                                             |
| :--------------- | :--------------------------- | :---------------------------------------------------------------------- |
| data-slot        | -                            | Identifies this element as the `next` slot of the `carousel` component. |
| data-orientation | `"horizontal" \| "vertical"` | Indicates the orientation of the carousel.                              |
| data-disabled    | -                            | Present when next scrolling is disabled.                                |
