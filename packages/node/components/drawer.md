# Drawer

Displays page-level content that slides from one edge and is opened by Overlay id.

## Usage guidelines

- Place Drawer directly under `Root`, not in a Section.
- Use `side` to align the popup with its swipe direction.
- `children` render after the description and before the action area.

## Demo

```jsx
<Drawer
  id="details-drawer"
  title="Details"
  description="Review the selected item."
  side="right"
  closeLabel="Close"
  classNames={{ "drawer-popup": "w-96 p-6" }}
/>
```

## DOM structure

```html
<div data-slot="drawer">
  <div data-slot="drawer-backdrop" class="fixed inset-0 z-50 bg-black/40"></div>
  <div data-slot="drawer-viewport" class="fixed inset-0 z-50 pointer-events-none">
    <div data-slot="drawer-popup" data-side="right" class="pointer-events-auto absolute inset-y-0 right-0 h-full w-96 max-w-full bg-white text-black shadow-xl">
      <div data-slot="drawer-content">
        <h2 data-slot="drawer-title">Details</h2>
        <p data-slot="drawer-description">Review the selected item.</p>
        <!-- children -->
        <div data-slot="drawer-actions" class="flex items-center justify-end gap-2">
          <button data-slot="drawer-close">Close</button>
          <button data-slot="drawer-action">Continue</button>
        </div>
      </div>
    </div>
  </div>
</div>
```

Title and description are optional. The action renders only when both `actionLabel` and `action` are provided. Popup edge classes vary with `side`.

## API reference

### Drawer Props:

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| id | `string` | required | Stable Overlay id. |
| title | `string` | - | Drawer heading. |
| description | `string` | - | Supporting description. |
| closeLabel | `string` | `"Close"` | Close button label. |
| actionLabel | `string` | - | Optional primary action label. |
| action | `ButtonAction` | - | Serializable primary action. |
| side | `"top" \| "right" \| "bottom" \| "left"` | `"right"` | Popup edge and swipe direction. |
| modal | `boolean \| "trap-focus"` | `true` | Base UI drawer modality. |
| dismissOnOutsidePress | `boolean` | `true` | Whether pointer press outside closes the drawer. |
| open | `boolean` | - | Controlled open state. |
| defaultOpen | `boolean` | - | Initial uncontrolled open state. |
| onOpenChange | `(open: boolean) => void` | - | Called when open state changes. |
| children | `ReactNode` | - | Content before the action area. |
| classNames | `DrawerClassNames` | - | Classes for owned slots. |

```ts
type DrawerClassNames = {
  drawer?: string;
  "drawer-backdrop"?: string;
  "drawer-viewport"?: string;
  "drawer-popup"?: string;
  "drawer-title"?: string;
  "drawer-description"?: string;
  "drawer-content"?: string;
  "drawer-actions"?: string;
  "drawer-close"?: string;
  "drawer-action"?: string;
};
```

### Data Attributes

| Attribute | Element | Description |
| :--- | :--- | :--- |
| `data-slot="drawer"` | Portal root | Identifies this element as the root slot of the `drawer` component. |
| `data-slot="drawer-backdrop"` | Backdrop | Identifies this element as the `backdrop` slot of the `drawer` component. |
| `data-slot="drawer-viewport"` | Viewport | Identifies this element as the `viewport` slot of the `drawer` component. |
| `data-slot="drawer-popup"` | Popup | Identifies this element as the `popup` slot of the `drawer` component. |
| `data-side` | Popup | Reports the configured side. |
| `data-slot="drawer-content"` | Content | Identifies this element as the `content` slot of the `drawer` component. |
| `data-slot="drawer-title"` | Title | Identifies this element as the `title` slot of the `drawer` component. |
| `data-slot="drawer-description"` | Description | Identifies this element as the `description` slot of the `drawer` component. |
| `data-slot="drawer-actions"` | Actions | Identifies this element as the `actions` slot of the `drawer` component. |
| `data-slot="drawer-close"` | Close | Identifies this element as the `close` slot of the `drawer` component. |
| `data-slot="drawer-action"` | Action | Identifies this element as the `action` slot of the `drawer` component. |
