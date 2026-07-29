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
      buttonLabel="Submit"
      classNames={{
        contact: "***",
        "contact-field-group": "***",
        "contact-field": "***",
        "contact-field-label": "***",
        "contact-input": "***",
        "contact-textarea": "***",
        "contact-button": "***",
      }}
    />
  );
}
```

## DOM structure

This shows the rendered DOM structure and key data attributes.

```html
<form data-slot="contact">
  <div data-slot="contact-field-group">
    <div role="group" data-slot="contact-field">
      <label data-slot="contact-field-label">Name</label>
      <input
        data-slot="contact-input"
        class="focus-visible:outline-2 focus-visible:outline-offset-3"
      />
    </div>
    <div role="group" data-slot="contact-field">
      <label data-slot="contact-field-label">Email</label>
      <input
        data-slot="contact-input"
        class="focus-visible:outline-2 focus-visible:outline-offset-3"
      />
    </div>
    <div role="group" data-slot="contact-field">
      <label data-slot="contact-field-label">Message</label>
      <textarea
        data-slot="contact-textarea"
        class="focus-visible:outline-2 focus-visible:outline-offset-3"
      ></textarea>
    </div>
  </div>
  <div role="group" data-slot="contact-field">
    <button
      data-slot="contact-button"
      type="submit"
      class="focus-visible:outline-2 focus-visible:outline-offset-3 inline-flex justify-center items-center transition-[color,opacity,background-color,box-shadow] duration-200 ease-in-out"
    >
      Submit
    </button>
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
| id           | `string`           | -       | The id applied to the root element.       |

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
  contact?: string;
  "contact-field"?: string;
  "contact-input"?: string;
  "contact-textarea"?: string;
  "contact-button"?: string;
  "contact-field-group"?: string;
  "contact-field-label"?: string;
};
```

### Data Attributes

**Contact Data Attributes:**

| Attribute | Type | Description                                                          |
| :-------- | :--- | :------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the root slot of the `contact` component. |

**ContactFieldGroup Data Attributes:**

| Attribute | Type | Description                                                                   |
| :-------- | :--- | :---------------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `field-group` slot of the `contact` component. |

**ContactField Data Attributes:**

| Attribute | Type | Description                                                             |
| :-------- | :--- | :---------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `field` slot of the `contact` component. |

**ContactFieldLabel Data Attributes:**

| Attribute | Type | Description                                                                   |
| :-------- | :--- | :---------------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `field-label` slot of the `contact` component. |

**ContactInput Data Attributes:**

| Attribute | Type | Description                                                             |
| :-------- | :--- | :---------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `input` slot of the `contact` component. |

**ContactTextarea Data Attributes:**

| Attribute | Type | Description                                                                |
| :-------- | :--- | :------------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `textarea` slot of the `contact` component. |

**ContactButton Data Attributes:**

| Attribute | Type | Description                                                              |
| :-------- | :--- | :----------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `button` slot of the `contact` component. |
