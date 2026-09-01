# Dialog

Displays modal or non-modal content that is registered by `id` and opened by a Button overlay action.

## Usage guidelines

- Place Dialog directly under `Root`, not inside a `Section`.
- Use a stable page-unique `id` and target it with `action={{ type: "overlay", targetId: id }}`.
- `title`, `description`, and the action area are fixed semantic slots; `children` renders between the description and actions.
- Set `dismissOnOutsidePress={false}` when outside press must not close the dialog.

## Demo

```jsx
<Dialog
  id="account-dialog"
  title="Account settings"
  description="Update your account preferences."
  closeLabel="Cancel"
  actionLabel="Save"
  action={{ type: "none" }}
  classNames={{ "dialog-popup": "rounded-xl p-6" }}
/>
```

## DOM structure

```html
<div data-slot="dialog-portal">
  <div data-slot="dialog-backdrop" class="fixed inset-0 z-50 bg-black/40"></div>
  <div
    data-slot="dialog-viewport"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
  >
    <div
      data-slot="dialog-popup"
      class="pointer-events-auto max-h-full w-full max-w-lg overflow-auto bg-white text-black shadow-xl"
    >
      <h2 data-slot="dialog-title">Account settings</h2>
      <p data-slot="dialog-description">Update your account preferences.</p>
      <!-- children -->
      <div
        data-slot="dialog-actions"
        class="flex items-center justify-end gap-2"
      >
        <button data-slot="dialog-close">Cancel</button>
        <button data-slot="dialog-action">Save</button>
      </div>
    </div>
  </div>
</div>
```

The title and description render only when their props are non-empty. The action button renders only when both `actionLabel` and `action` are provided.

## API reference

### Dialog Props:

| Prop                  | Type                      | Default   | Description                                      |
| :-------------------- | :------------------------ | :-------- | :----------------------------------------------- |
| id                    | `string`                  | required  | Stable Overlay id used by Button actions.        |
| title                 | `string`                  | -         | Dialog heading.                                  |
| description           | `string`                  | -         | Dialog description.                              |
| closeLabel            | `string`                  | `"Close"` | Close button label.                              |
| actionLabel           | `string`                  | -         | Optional primary action label.                   |
| action                | `ButtonAction`            | -         | Serializable primary action.                     |
| modal                 | `boolean \| "trap-focus"` | `true`    | Base UI dialog modality.                         |
| dismissOnOutsidePress | `boolean`                 | `true`    | Whether pointer press outside closes the dialog. |
| open                  | `boolean`                 | -         | Controlled open state.                           |
| defaultOpen           | `boolean`                 | -         | Initial uncontrolled open state.                 |
| onOpenChange          | `(open: boolean) => void` | -         | Called when open state changes.                  |
| children              | `ReactNode`               | -         | Content before the action area.                  |
| classNames            | `DialogClassNames`        | -         | Classes for owned slots.                         |

```ts
type DialogClassNames = {
  dialog?: string;
  "dialog-backdrop"?: string;
  "dialog-viewport"?: string;
  "dialog-popup"?: string;
  "dialog-title"?: string;
  "dialog-description"?: string;
  "dialog-actions"?: string;
  "dialog-close"?: string;
  "dialog-action"?: string;
};
```

### Data Attributes

| Attribute                        | Element     | Description                                                                  |
| :------------------------------- | :---------- | :--------------------------------------------------------------------------- |
| `data-slot="dialog"`             | Portal root | Identifies this element as the root slot of the `dialog` component.          |
| `data-slot="dialog-backdrop"`    | Backdrop    | Identifies this element as the `backdrop` slot of the `dialog` component.    |
| `data-slot="dialog-viewport"`    | Viewport    | Identifies this element as the `viewport` slot of the `dialog` component.    |
| `data-slot="dialog-popup"`       | Popup       | Identifies this element as the `popup` slot of the `dialog` component.       |
| `data-slot="dialog-title"`       | Title       | Identifies this element as the `title` slot of the `dialog` component.       |
| `data-slot="dialog-description"` | Description | Identifies this element as the `description` slot of the `dialog` component. |
| `data-slot="dialog-actions"`     | Actions     | Identifies this element as the `actions` slot of the `dialog` component.     |
| `data-slot="dialog-close"`       | Close       | Identifies this element as the `close` slot of the `dialog` component.       |
| `data-slot="dialog-action"`      | Action      | Identifies this element as the `action` slot of the `dialog` component.      |
