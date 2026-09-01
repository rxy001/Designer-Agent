# Toast

Registers a transient notification template that a Button can trigger by Overlay id.

## Usage guidelines

- Place Toast directly under `Root`. The declaration itself renders no DOM.
- Triggering its stable `id` creates a new transient instance; repeated triggers do not change the page document.
- Use concise, non-blocking feedback. Use AlertDialog when confirmation is required.

## Demo

```jsx
<Toast
  id="saved-toast"
  title="Saved"
  description="Your changes are live."
  tone="success"
  timeout={5000}
  placement="bottom-right"
  closeLabel="Dismiss"
  classNames={{ toast: "rounded-lg p-4" }}
/>
```

## DOM structure

`Toast` returns `null` while registering its template. When triggered, the page-level provider renders:

```html
<div data-slot="toast-viewport" class="pointer-events-none fixed inset-0 z-50 overflow-hidden">
  <div data-slot="toast-positioner" data-placement="bottom-right" class="pointer-events-auto !fixed !top-auto !right-4 !bottom-4 !left-auto !transform-none">
    <div data-slot="toast" data-tone="success" class="w-80 bg-white text-black shadow-lg">
      <div data-slot="toast-content">
        <div data-slot="toast-title">Saved</div>
        <div data-slot="toast-description">Your changes are live.</div>
        <button data-slot="toast-action">View</button>
        <button data-slot="toast-close">Dismiss</button>
      </div>
    </div>
  </div>
</div>
```

Title and description render only when provided. The action renders only when both `actionLabel` and `action` are provided. Close always renders.

## API reference

### Toast Props:

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| id | `string` | required | Stable Overlay id. |
| title | `string` | - | Notification title. |
| description | `string` | - | Supporting message. |
| tone | `"default" \| "success" \| "warning" \| "danger"` | `"default"` | Semantic tone exposed as `data-tone`. |
| timeout | `number` | `5000` | Automatic dismissal timeout in milliseconds. |
| actionLabel | `string` | - | Optional action label. |
| action | `ButtonAction` | - | Serializable action run before closing the instance. |
| closeLabel | `string` | `"Dismiss"` | Close button label. |
| placement | `ToastPlacement` | `"bottom-right"` | Screen placement. |
| classNames | `ToastClassNames` | - | Classes for rendered Toast slots. |

```ts
type ToastPlacement =
  | "top-left" | "top-center" | "top-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

type ToastClassNames = {
  viewport?: string;
  positioner?: string;
  toast?: string;
  content?: string;
  title?: string;
  description?: string;
  action?: string;
  close?: string;
};
```

### Data Attributes

| Attribute | Element | Description |
| :--- | :--- | :--- |
| `data-slot="toast-viewport"` | Viewport | Identifies this element as the shared viewport slot of the `toast` component. |
| `data-slot="toast-positioner"` | Positioner | Identifies this element as the `positioner` slot of the `toast` component. |
| `data-placement` | Positioner | Reports the configured placement. |
| `data-slot="toast"` | Toast root | Identifies this element as the root slot of the `toast` component. |
| `data-tone` | Toast root | Reports the configured tone. |
| `data-slot="toast-content"` | Content | Identifies this element as the `content` slot of the `toast` component. |
| `data-slot="toast-title"` | Title | Identifies this element as the `title` slot of the `toast` component. |
| `data-slot="toast-description"` | Description | Identifies this element as the `description` slot of the `toast` component. |
| `data-slot="toast-action"` | Action | Identifies this element as the `action` slot of the `toast` component. |
| `data-slot="toast-close"` | Close | Identifies this element as the `close` slot of the `toast` component. |
