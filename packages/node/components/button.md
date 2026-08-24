# Button

A button component that renders a Base UI button or a link when `href` is provided.

## Usage guidelines

- **Label**: Use the `label` prop for the button text.
- **Link**: Provide `href` to render an anchor. Use `target`, `rel`, and `download` for link behavior.
- **Security**: Links with `target="_blank"` default to `rel="noopener noreferrer"` when `rel` is omitted.
- **Disabled state**: Native buttons use Base UI disabled behavior. Disabled links omit `href` and expose `aria-disabled` and `data-disabled`.
- **Accessible name**: Use `ariaLabel` when the visible label is not sufficiently descriptive.
- **Icons**: Use `startIcon` or `endIcon` with a supported Lucide name from the `Icon` documentation. Icons are decorative when the button already has a label.
- **Icon-only buttons**: Omit `label` and provide `ariaLabel`. Use either `startIcon` or `endIcon`, not both.
- **Styling**: Use `className` to style the rendered button and `classNames` to style the start and end icon slots independently.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Button } from "@/components";

export default function App() {
  return (
    <Button
      label="Download guide"
      startIcon="Download"
      href="/guide.pdf"
      target="_blank"
      download="guide.pdf"
      ariaLabel="Download the product guide"
      className="***"
      classNames={{
        "start-icon": "***",
      }}
    />
  );
}
```

## DOM structure

```html
<a
  data-slot="button"
  href="/guide.pdf"
  target="_blank"
  rel="noopener noreferrer"
  download="guide.pdf"
  aria-label="Download the product guide"
  class="focus-visible:outline-2 focus-visible:outline-offset-3 inline-flex items-center justify-center gap-2 transition-[color,opacity,background-color,box-shadow] duration-200 ease-in-out"
>
  <svg
    data-slot="start-icon"
    aria-hidden="true"
    focusable="false"
    class="shrink-0"
  ></svg>
  Download guide
</a>
```

Without `href`, the component renders a Base UI button:

```html
<button
  data-slot="button"
  type="button"
  class="focus-visible:outline-2 focus-visible:outline-offset-3 inline-flex items-center justify-center gap-2 transition-[color,opacity,background-color,box-shadow] duration-200 ease-in-out"
>
  Button
</button>
```

When `endIcon` is provided, its icon renders after the label:

```html
<button data-slot="button" type="button">
  Continue
  <svg
    data-slot="end-icon"
    aria-hidden="true"
    focusable="false"
    class="shrink-0"
  ></svg>
</button>
```

## API reference

### Button Props:

| Prop       | Type                                         | Default    | Description                                                                  |
| :--------- | :------------------------------------------- | :--------- | :--------------------------------------------------------------------------- |
| label      | `string`                                     | -          | The text displayed inside the button or link.                                |
| className  | `string`                                     | -          | CSS classes applied to the root element.                                     |
| href       | `string`                                     | -          | URL that changes the root from a button to an anchor.                        |
| target     | `"_self" \| "_blank" \| "_parent" \| "_top"` | -          | Anchor browsing context.                                                     |
| rel        | `string`                                     | -          | Anchor relationship. Defaults to `"noopener noreferrer"` for `_blank` links. |
| download   | `boolean \| string`                          | -          | Downloads the linked resource, optionally using a filename.                  |
| type       | `"button" \| "submit" \| "reset"`            | `"button"` | Native button type when `href` is absent.                                    |
| disabled   | `boolean`                                    | `false`    | Disables the button or removes navigation from a link.                       |
| ariaLabel  | `string`                                     | -          | Accessible name exposed through `aria-label`.                                |
| startIcon  | `IconName`                                   | -          | Supported Lucide icon rendered before the label.                             |
| endIcon    | `IconName`                                   | -          | Supported Lucide icon rendered after the label.                              |
| classNames | `ClassNamesProp`                             | -          | CSS classes applied independently to the start and end icon slots.           |
| id         | `string`                                     | -          | The id applied to the root element.                                          |

**Additional Types**

```typescript
type ClassNamesProp = {
  "start-icon"?: string;
  "end-icon"?: string;
};
```

### Data Attributes

**Button Data Attributes:**

| Attribute | Type | Description                                                         |
| :-------- | :--- | :------------------------------------------------------------------ |
| data-slot | -    | Identifies this element as the root slot of the `button` component. |

**Button Start Icon Data Attributes:**

| Attribute | Type | Description                                                                 |
| :-------- | :--- | :-------------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `start-icon` slot of the `button` component. |

**Button End Icon Data Attributes:**

| Attribute | Type | Description                                                               |
| :-------- | :--- | :------------------------------------------------------------------------ |
| data-slot | -    | Identifies this element as the `end-icon` slot of the `button` component. |

When disabled, the root receives `data-disabled`. A disabled anchor also receives `aria-disabled="true"`; a disabled Base UI button receives the native `disabled` attribute.
