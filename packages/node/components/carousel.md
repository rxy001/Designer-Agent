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
        {
          imgSrc: "https://*.com",
          imgAlt: "Random Image 2",
          title: "Slide 2",
          description: "Description for Slide 2",
        },
      ]}
      classNames={{
        root: "***",
        content: "***",
        previous: "***",
        next: "***",
        item: "***",
        "item-img": "***",
        "item-title": "***",
        "item-description": "***",
      }}
    />
  );
}
```

## DOM structure

This shows the rendered DOM structure and key data attributes.

```html
<div
  data-slot="root"
  data-orientation="horizontal"
  role="region"
  aria-roledescription="carousel"
  class="relative"
>
  <div class="h-full overflow-hidden">
    <div
      data-slot="content"
      data-orientation="horizontal"
      class="flex h-full data-[orientation=horizontal]:-ml-4 data-[orientation]=vertical]:-ml-4 data-[orientation]=vertical]:flex-col"
    >
      <div
        data-slot="item"
        data-orientation="horizontal"
        role="group"
        aria-roledescription="slide"
        class="min-w-0 shrink-0 grow-0 basis-full data-[orientation=horizontal]:pl-4 data-[orientation=vertical]:pt-4"
      >
        <img data-slot="item-img" />
        <div data-slot="item-title">Slide title</div>
        <div data-slot="item-description">Slide description</div>
      </div>
    </div>
  </div>
  <button
    data-slot="previous"
    data-orientation="horizontal"
    class="absolute touch-manipulation rounded-full data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:left-3 data-[orientation=vertical]:top-3 data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:rotate-90"
  >
    <svg></svg>
  </button>
  <button
    data-slot="next"
    data-orientation="horizontal"
    class="absolute touch-manipulation rounded-full data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:right-3 data-[orientation=vertical]:bottom-3 data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:rotate-90"
  >
    <svg></svg>
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
  root?: string;
  content?: string;
  previous?: string;
  next?: string;
  item?: string;
  "item-img"?: string;
  "item-title"?: string;
  "item-description"?: string;
};
```

### Data Attributes

**Root Data Attributes:**

| Attribute        | Type                         | Description                                |
| :--------------- | :--------------------------- | :----------------------------------------- |
| data-slot        | -                            | Identifies the element as `root`.          |
| data-orientation | `"horizontal" \| "vertical"` | Indicates the orientation of the carousel. |

**Content Data Attributes:**

| Attribute        | Type                         | Description                                |
| :--------------- | :--------------------------- | :----------------------------------------- |
| data-slot        | -                            | Identifies the element as `content`.       |
| data-orientation | `"horizontal" \| "vertical"` | Indicates the orientation of the carousel. |

**Item Data Attributes:**

| Attribute        | Type                         | Description                                |
| :--------------- | :--------------------------- | :----------------------------------------- |
| data-slot        | -                            | Identifies the element as `item`.          |
| data-orientation | `"horizontal" \| "vertical"` | Indicates the orientation of the carousel. |

**Item Image Data Attributes:**

| Attribute | Type | Description                           |
| :-------- | :--- | :------------------------------------ |
| data-slot | -    | Identifies the element as `item-img`. |

**Item Title Data Attributes:**

| Attribute | Type | Description                             |
| :-------- | :--- | :-------------------------------------- |
| data-slot | -    | Identifies the element as `item-title`. |

**Item Description Data Attributes:**

| Attribute | Type | Description                                   |
| :-------- | :--- | :-------------------------------------------- |
| data-slot | -    | Identifies the element as `item-description`. |

**Previous Button Data Attributes:**

| Attribute        | Type                         | Description                                  |
| :--------------- | :--------------------------- | :------------------------------------------- |
| data-slot        | -                            | Identifies the element as `previous`.        |
| data-orientation | `"horizontal" \| "vertical"` | Indicates the orientation of the carousel.   |
| data-disabled    | -                            | Present when previous scrolling is disabled. |

**Next Button Data Attributes:**

| Attribute        | Type                         | Description                                |
| :--------------- | :--------------------------- | :----------------------------------------- |
| data-slot        | -                            | Identifies the element as `next`.          |
| data-orientation | `"horizontal" \| "vertical"` | Indicates the orientation of the carousel. |
| data-disabled    | -                            | Present when next scrolling is disabled.   |
