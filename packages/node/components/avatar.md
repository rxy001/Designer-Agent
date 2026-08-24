# Avatar

Displays a circular profile image or a text fallback.

## Usage guidelines

- Provide meaningful `alt` text when the avatar identifies a person or organization.
- Use `fallback` for initials or a short substitute while the image loads, when it fails, or when `src` is not provided.
- Set the avatar size on the root through `classNames.avatar`.

## Demo

```jsx
import { Avatar } from "@/components";

export default function App() {
  return (
    <Avatar
      src="https://*.com/avatar.jpg"
      alt="Jane Doe"
      fallback="JD"
      classNames={{
        avatar: "***",
        "avatar-image": "***",
        "avatar-fallback": "***",
      }}
    />
  );
}
```

## DOM structure

Base UI renders the image after it loads successfully and renders the fallback while loading or after an error.

```html
<span data-slot="avatar" class="relative inline-flex shrink-0 overflow-hidden rounded-full">
  <img
    data-slot="avatar-image"
    class="h-full w-full object-cover"
    draggable="false"
    alt="Jane Doe"
  />
</span>
```

Fallback state:

```html
<span data-slot="avatar" class="relative inline-flex shrink-0 overflow-hidden rounded-full">
  <span data-slot="avatar-fallback" class="flex h-full w-full items-center justify-center" aria-label="Jane Doe">JD</span>
</span>
```

## API reference

### Avatar Props:

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| src | `string` | - | Image source URL. |
| alt | `string` | `""` | Alternative text for the image and label for the fallback. |
| fallback | `string` | - | Text rendered when `src` is absent. |
| classNames | `ClassNamesProp` | - | CSS classes applied to the root and internal elements. |
| id | `string` | - | The id applied to the root. |

**Additional Types**

```typescript
type ClassNamesProp = {
  avatar?: string;
  "avatar-image"?: string;
  "avatar-fallback"?: string;
};
```

### Data Attributes

| Slot | Description |
| :--- | :--- |
| `avatar` | Identifies this element as the root slot of the `avatar` component. |
| `avatar-image` | Identifies this element as the `image` slot of the `avatar` component. |
| `avatar-fallback` | Identifies this element as the `fallback` slot of the `avatar` component. |

Base UI may apply `data-starting-style` and `data-ending-style` to the image during mount and unmount transitions.
