# Badge

Displays a compact label that can optionally link to another location.

## Usage guidelines

- Use badges for short statuses, categories, or announcements.
- Provide `href` only when the badge should navigate; otherwise it renders as a `span`.
- Keep labels concise and do not use a badge as a form action.

## Demo

```jsx
import { Badge } from "@/components";

export default function App() {
  return <Badge label="New" href="/updates" className="***" />;
}
```

## DOM structure

With `href`, the root is an anchor. Without it, the root is a span.

```html
<a data-slot="badge" href="/updates" class="inline-flex items-center">New</a>
```

## API reference

### Badge Props:

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| label | `string` | - | Text displayed in the badge. |
| href | `string` | - | Optional destination that changes the root to an anchor. |
| className | `string` | - | CSS classes applied to the root. |
| id | `string` | - | The id applied to the root. |

### Data Attributes

| Slot | Description |
| :--- | :--- |
| `badge` | Identifies this element as the root slot of the `badge` component. |
