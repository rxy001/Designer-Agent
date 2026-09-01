# AlertDialog

Displays a blocking confirmation dialog with fixed cancel and confirm actions.

## Usage guidelines

- Place AlertDialog directly under `Root` and target its stable `id` from a Button overlay action.
- Use it for destructive or consequential confirmation, not general content.
- Pointer dismissal is intentionally unavailable. Dangerous dialogs focus Cancel by default.

## Demo

```jsx
<AlertDialog
  id="delete-alert"
  title="Delete project?"
  description="This action cannot be undone."
  cancelLabel="Keep project"
  confirmLabel="Delete"
  confirmAction={{ type: "link", href: "/projects" }}
  tone="danger"
  classNames={{ "alert-dialog-popup": "rounded-xl p-6" }}
/>
```

## DOM structure

```html
<div data-slot="alert-dialog-portal">
  <div
    data-slot="alert-dialog-backdrop"
    class="fixed inset-0 z-50 bg-black/40"
  />
  <div
    data-slot="alert-dialog-viewport"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
  >
    <div
      data-slot="alert-dialog-popup"
      data-tone="default"
      class="pointer-events-auto max-h-full w-full max-w-lg overflow-auto bg-white text-black shadow-xl"
    >
      <h2 data-slot="alert-dialog-title">Delete project?</h2>
      <p data-slot="alert-dialog-description">This action cannot be undone.</p>
      <div
        data-slot="alert-dialog-actions"
        class="flex items-center justify-end gap-2"
      >
        <button data-slot="alert-dialog-cancel">Keep project</button>
        <button data-slot="alert-dialog-confirm">Delete</button>
      </div>
    </div>
  </div>
</div>
```

Title and description are optional. Cancel and confirm always render.

## API reference

### AlertDialog Props:

| Prop          | Type                               | Default                                 | Description                                   |
| :------------ | :--------------------------------- | :-------------------------------------- | :-------------------------------------------- |
| id            | `string`                           | required                                | Stable Overlay id.                            |
| title         | `string`                           | -                                       | Confirmation heading.                         |
| description   | `string`                           | -                                       | Supporting explanation.                       |
| cancelLabel   | `string`                           | `"Cancel"`                              | Cancel button label.                          |
| confirmLabel  | `string`                           | `"Confirm"`                             | Confirm button label.                         |
| confirmAction | `ButtonAction`                     | -                                       | Serializable confirm action.                  |
| tone          | `"default" \| "danger"`            | `"default"`                             | Semantic styling tone exposed as `data-tone`. |
| initialFocus  | `"cancel" \| "confirm" \| "first"` | danger: `"cancel"`; otherwise `"first"` | Initial focus strategy.                       |
| open          | `boolean`                          | -                                       | Controlled open state.                        |
| defaultOpen   | `boolean`                          | -                                       | Initial uncontrolled open state.              |
| onOpenChange  | `(open: boolean) => void`          | -                                       | Called when open state changes.               |
| classNames    | `AlertDialogClassNames`            | -                                       | Classes for owned slots.                      |

```ts
type AlertDialogClassNames = {
  "alert-dialog-backdrop"?: string;
  "alert-dialog-viewport"?: string;
  "alert-dialog-popup"?: string;
  "alert-dialog-title"?: string;
  "alert-dialog-description"?: string;
  "alert-dialog-actions"?: string;
  "alert-dialog-cancel"?: string;
  "alert-dialog-confirm"?: string;
  "alert-dialog-portal"?: string;
};
```

### Data Attributes

| Attribute                              | Element     | Description                                                                        |
| :------------------------------------- | :---------- | :--------------------------------------------------------------------------------- |
| `data-slot="alert-dialog-backdrop"`    | Backdrop    | Identifies this element as the `backdrop` slot of the `alert-dialog` component.    |
| `data-slot="alert-dialog-viewport"`    | Viewport    | Identifies this element as the `viewport` slot of the `alert-dialog` component.    |
| `data-slot="alert-dialog-popup"`       | Popup       | Identifies this element as the root popup slot of the `alert-dialog` component.    |
| `data-tone`                            | Popup       | Reports `default` or `danger`.                                                     |
| `data-slot="alert-dialog-title"`       | Title       | Identifies this element as the `title` slot of the `alert-dialog` component.       |
| `data-slot="alert-dialog-description"` | Description | Identifies this element as the `description` slot of the `alert-dialog` component. |
| `data-slot="alert-dialog-actions"`     | Actions     | Identifies this element as the `actions` slot of the `alert-dialog` component.     |
| `data-slot="alert-dialog-cancel"`      | Cancel      | Identifies this element as the `cancel` slot of the `alert-dialog` component.      |
| `data-slot="alert-dialog-confirm"`     | Confirm     | Identifies this element as the `confirm` slot of the `alert-dialog` component.     |
