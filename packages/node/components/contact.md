# Contact

Displays a contact form with name, email, message, and submit button fields.

## Usage guidelines

- **Labels**: Default labels are `Name`, `Email`, and `Message`; override them with the `labels` prop.
- **Placeholders**: Use `placeholders` to set input and textarea placeholder text.
- **Button label**: Use `buttonLabel` to override the submit button text.
- **Styling**: Use the `classNames` prop to style the form and internal elements.

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
        message: "Message",
      }}
      placeholders={{
        name: "Enter your name",
        email: "Enter your email",
        message: "Enter your message",
      }}
      buttonLabel="Submit"
      classNames={{
        root: "***",
        "field-group": "***",
        field: "***",
        "field-label": "***",
        input: "***",
        textarea: "***",
        button: "***",
      }}
    />
  );
}
```

## DOM structure

```html
<form data-slot="root">
  <div data-slot="field-group">
    <div role="group" data-slot="field">
      <label data-slot="field-label">Name</label>
      <input data-slot="input" />
    </div>
    <div role="group" data-slot="field">
      <label data-slot="field-label">Email</label>
      <input data-slot="input" />
    </div>
    <div role="group" data-slot="field">
      <label data-slot="field-label">Message</label>
      <textarea data-slot="textarea"></textarea>
    </div>
  </div>
  <div role="group" data-slot="field">
    <button data-slot="button" type="submit">Submit</button>
  </div>
</form>
```

## API reference

### Contact Props:

| Prop         | Type               | Default | Description                               |
| :----------- | :----------------- | :------ | :---------------------------------------- |
| labels       | `LabelsProp`       | -       | Labels displayed above each field.        |
| placeholders | `PlaceholdersProp` | -       | Placeholder text for each field.          |
| buttonLabel  | `string`           | -       | Text displayed inside the submit button.  |
| classNames   | `ClassNamesProp`   | -       | CSS classes applied to internal elements. |

**Additional Types**

```typescript
type LabelsProp = {
  name?: string;
  email?: string;
  message?: string;
};

type PlaceholdersProp = {
  name?: string;
  email?: string;
  message?: string;
};

type ClassNamesProp = {
  root?: string;
  field?: string;
  input?: string;
  textarea?: string;
  button?: string;
  "field-group"?: string;
  "field-label"?: string;
};
```

### Data Attributes

**Root Data Attributes:**

| Attribute | Type | Description                       |
| :-------- | :--- | :-------------------------------- |
| data-slot | -    | Identifies the element as `root`. |

**Field Group Data Attributes:**

| Attribute | Type | Description                              |
| :-------- | :--- | :--------------------------------------- |
| data-slot | -    | Identifies the element as `field-group`. |

**Field Data Attributes:**

| Attribute | Type | Description                        |
| :-------- | :--- | :--------------------------------- |
| data-slot | -    | Identifies the element as `field`. |

**Field Label Data Attributes:**

| Attribute | Type | Description                              |
| :-------- | :--- | :--------------------------------------- |
| data-slot | -    | Identifies the element as `field-label`. |

**Input Data Attributes:**

| Attribute | Type | Description                        |
| :-------- | :--- | :--------------------------------- |
| data-slot | -    | Identifies the element as `input`. |

**Textarea Data Attributes:**

| Attribute | Type | Description                           |
| :-------- | :--- | :------------------------------------ |
| data-slot | -    | Identifies the element as `textarea`. |

**Button Data Attributes:**

| Attribute | Type | Description                         |
| :-------- | :--- | :---------------------------------- |
| data-slot | -    | Identifies the element as `button`. |
