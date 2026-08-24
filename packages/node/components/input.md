# Input

Displays a labeled input with optional supporting and validation messages.

## Usage guidelines

- Use `label` to give the control an accessible name; Base UI associates it with the control automatically.
- Use `description` for supporting guidance and `error` for validation feedback.
- Use `defaultValue` for initial editable content; the component intentionally remains uncontrolled.
- Style the root and internal elements with `classNames`.

## Demo

```jsx
import { Input } from "@/components";

export default function App() {
  return (
    <Input
      id="work-email"
      label="Work email"
      name="email"
      type="email"
      placeholder="you@example.com"
      description="We will only use this to contact you."
      required
      classNames={{
        input: "***",
        "input-label": "***",
        "input-control": "***",
        "input-description": "***",
        "input-error": "***",
      }}
    />
  );
}
```

## DOM structure

Optional label, description, and error elements render only when their corresponding props are provided. Base UI generates the internal ids and applies field state attributes. This example shows an externally invalid field.

```html
<div id="work-email" data-slot="input" data-invalid="">
  <label for="generated-control-id" data-slot="input-label" data-invalid="">Work email</label>
  <input
    id="generated-control-id"
    data-slot="input-control"
    data-invalid=""
    class="focus-visible:outline-2 focus-visible:outline-offset-3"
    name="email"
    type="email"
    required
    aria-describedby="generated-description-id generated-error-id"
    aria-invalid="true"
  />
  <p id="generated-description-id" data-slot="input-description" data-invalid="">Supporting text</p>
  <div id="generated-error-id" data-slot="input-error" data-invalid="">Error text</div>
</div>
```

## API reference

### Input Props:

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| label | `string` | - | Accessible label displayed above the control. |
| description | `string` | - | Supporting text associated with the control. |
| error | `string` | - | Validation message that marks the control invalid. |
| name | `string` | - | Form field name. |
| type | `InputType` | `"text"` | Native input type. |
| placeholder | `string` | - | Placeholder text. |
| defaultValue | `string` | - | Initial uncontrolled value. |
| autoComplete | `string` | - | Native autocomplete hint. |
| required | `boolean` | `false` | Whether a value is required. |
| disabled | `boolean` | `false` | Whether the control is disabled. |
| classNames | `ClassNamesProp` | - | CSS classes applied to the root and internal elements. |
| id | `string` | - | The id applied to the root. Base UI generates associated internal ids. |

**Additional Types**

```typescript
type InputType = "text" | "email" | "tel" | "url" | "search" | "password" | "number";

type ClassNamesProp = {
  input?: string;
  "input-label"?: string;
  "input-control"?: string;
  "input-description"?: string;
  "input-error"?: string;
};
```

### Data Attributes

| Slot | Description |
| :--- | :--- |
| `input` | Identifies this element as the root slot of the `input` component. |
| `input-label` | Identifies this element as the `label` slot of the `input` component. |
| `input-control` | Identifies this element as the `control` slot of the `input` component. |
| `input-description` | Identifies this element as the `description` slot of the `input` component. |
| `input-error` | Identifies this element as the `error` slot of the `input` component. |

Base UI may also apply `data-disabled`, `data-touched`, `data-dirty`, `data-valid`, `data-invalid`, `data-filled`, and `data-focused` according to field state.
