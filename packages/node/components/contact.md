# Contact

Display contact information in a structured format.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Contact } from "@/components";

export default function App() {
  return (
    <Contact
      labels={{
        name: "Name",
        email: "Email",
        phone: "Phone",
      }}
      placeholders={{
        name: "Enter your name",
        email: "Enter your email",
        phone: "Enter your phone number",
      }}
      buttonLabel="Submit"
      slots={{
        field: {
          className: "***",
        },
        "field-label": {
          className: "***",
        },
        "field-set": {
          className: "***",
        },
        "field-group": {
          className: "***",
        },
        input: {
          className: "***",
        },
        textarea: {
          className: "***",
        },
        button: {
          className: "***",
        },
      }}
    />
  );
}
```

## DOM structure

```html
<form data-slot="root">
  <fieldset data-slot="field-set">
    <div data-slot="field-group">
      <div data-slot="field">
        <label data-slot="field-label">Name</label>
        <input data-slot="input" type="text" />
      </div>
      <div data-slot="field">
        <label data-slot="field-label">Email</label>
        <input data-slot="input" type="email" />
      </div>
      <div data-slot="field">
        <label data-slot="field-label">Message</label>
        <textarea data-slot="textarea" />
      </div>
    </div>
  </fieldset>
  <div data-slot="field">
    <button data-slot="button" />
  </div>
</form>
```

## API reference

### Contact Props:

| Prop         | Type                  | Default | Description                            |
| :----------- | :-------------------- | :------ | :------------------------------------- |
| className    | `string`              | -       | CSS class applied to the root element. |
| style        | `React.CSSProperties` | -       | Style applied to the root element.     |
| slots        | `SlotsProp`           | -       | The component&#x27;s named slots.      |
| labels       | `LabelsProp`          | -       | A collection of Labels                 |
| placeholders | `PlaceholdersProp`    | -       | A collection of placeholders           |
| buttonLabel  | `stirng`              | -       | The text to be displayed on the button |

**Additional Types**

```ts
type LabelsProp = {
  name?: string;
  email?: string;
  message?: string;
};

type Placeholders = {
  name?: string;
  email?: string;
  message?: string;
};

type SlotsProp = {
  field?: FieldProps;
  "field-set"?: FieldSetProps;
  "field-group"?: FieldGroupProps;
  "field-label"?: FieldLabelProps;
  input?: InputProps;
  textarea?: TextareaProps;
  button?: ButtonProps;
};
```

### Slots

**Filed Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Field Set Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Field Group Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Field Label Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Input Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Textarea Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |

**Button Props**

| Prop      | Type                  | Default | Description                       |
| :-------- | :-------------------- | :------ | :-------------------------------- |
| className | `string`              | -       | CSS class applied to the element. |
| style     | `React.CSSProperties` | -       | Style applied to the element.     |
