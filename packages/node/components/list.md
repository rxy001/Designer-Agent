# List

Displays ordered or unordered structured content with optional links and check markers.

## Usage guidelines

- Use `ordered` when item sequence matters.
- Use `marker="check"` for benefits or completed features and `marker="none"` for custom layouts.
- Give every item a stable `key`; titles, descriptions, and links are optional.

## Demo

```jsx
import { List } from "@/components";

export default function App() {
  return (
    <List
      marker="check"
      items={[
        { key: "fast", title: "Fast setup", description: "Start in minutes." },
        { key: "secure", title: "Secure", href: "/security" },
      ]}
      classNames={{
        list: "***",
        "list-item": "***",
        "list-marker": "***",
        "list-content": "***",
        "list-title": "***",
        "list-description": "***",
      }}
    />
  );
}
```

## DOM structure

The root is `ol` when `ordered` is true and `ul` otherwise. The marker SVG renders only for `marker="check"`.

```html
<ul data-slot="list" class="list-none">
  <li data-slot="list-item">
    <svg data-slot="list-marker" class="shrink-0" aria-hidden="true"></svg>
    <div data-slot="list-content">
      <div data-slot="list-title">Fast setup</div>
      <div data-slot="list-description">Start in minutes.</div>
    </div>
  </li>
</ul>
```

## API reference

### List Props:

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| items | `ListItem[]` | - | Items displayed in the list. |
| ordered | `boolean` | `false` | Whether the root is an ordered list. |
| marker | `"default" \| "check" \| "none"` | `"default"` | Marker presentation. |
| classNames | `ClassNamesProp` | - | CSS classes applied to the root and internal elements. |
| id | `string` | - | The id applied to the root. |

**Additional Types**

```typescript
type ListItem = {
  key: string;
  title?: string;
  description?: string;
  href?: string;
};

type ClassNamesProp = {
  list?: string;
  "list-item"?: string;
  "list-marker"?: string;
  "list-content"?: string;
  "list-title"?: string;
  "list-description"?: string;
};
```

### Data Attributes

| Slot | Description |
| :--- | :--- |
| `list` | Identifies this element as the root slot of the `list` component. |
| `list-item` | Identifies this element as the `item` slot of the `list` component. |
| `list-marker` | Identifies this element as the `marker` slot of the `list` component. |
| `list-content` | Identifies this element as the `content` slot of the `list` component. |
| `list-title` | Identifies this element as the `title` slot of the `list` component. |
| `list-description` | Identifies this element as the `description` slot of the `list` component. |
