# Newsletter

Displays an email subscription form with optional heading, description, and privacy text.

## Usage guidelines

- Set `action` to the endpoint that receives subscriptions and choose the matching HTTP `method`.
- Keep `emailLabel` meaningful even when styling it visually hidden; Base UI associates it with the email input automatically.
- Use `privacyText` for consent or unsubscribe expectations.

## Demo

```jsx
import { Newsletter } from "@/components";

export default function App() {
  return (
    <Newsletter
      id="product-news"
      title="Stay in the loop"
      description="Get product news in your inbox."
      emailLabel="Email address"
      emailPlaceholder="you@example.com"
      buttonLabel="Subscribe"
      privacyText="Unsubscribe at any time."
      action="/subscribe"
      method="post"
      classNames={{
        newsletter: "***",
        "newsletter-title": "***",
        "newsletter-description": "***",
        "newsletter-form": "***",
        "newsletter-field": "***",
        "newsletter-label": "***",
        "newsletter-input": "***",
        "newsletter-button": "***",
        "newsletter-privacy": "***",
      }}
    />
  );
}
```

## DOM structure

Title, description, and privacy text render only when their props are provided.

```html
<section id="product-news" data-slot="newsletter">
  <div data-slot="newsletter-title">Stay in the loop</div>
  <div data-slot="newsletter-description">Get product news in your inbox.</div>
  <form action="/subscribe" method="post" novalidate data-slot="newsletter-form">
    <div data-slot="newsletter-field" class="flex min-w-0 flex-1 flex-col">
      <label for="generated-control-id" data-slot="newsletter-label">Email address</label>
      <input
        id="generated-control-id"
        name="email"
        type="email"
        required
        autocomplete="email"
        data-slot="newsletter-input"
        class="focus-visible:outline-2 focus-visible:outline-offset-3"
      />
    </div>
    <button
      type="submit"
      data-slot="newsletter-button"
      class="focus-visible:outline-2 focus-visible:outline-offset-3 inline-flex justify-center items-center transition-[color,opacity,background-color,box-shadow] duration-200 ease-in-out"
    >Subscribe</button>
  </form>
  <div data-slot="newsletter-privacy">Unsubscribe at any time.</div>
</section>
```

## API reference

### Newsletter Props:

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| title | `string` | - | Heading displayed above the form. |
| description | `string` | - | Supporting text displayed above the form. |
| emailLabel | `string` | `"Email"` | Accessible label for the email input. |
| emailPlaceholder | `string` | - | Placeholder for the email input. |
| buttonLabel | `string` | `"Subscribe"` | Submit button text. |
| privacyText | `string` | - | Consent or privacy guidance below the form. |
| action | `string` | - | Native form submission URL. |
| method | `"get" \| "post"` | `"post"` | Native form submission method. |
| classNames | `ClassNamesProp` | - | CSS classes applied to the root and internal elements. |
| id | `string` | - | The id applied to the root. Base UI generates the email input id. |

**Additional Types**

```typescript
type ClassNamesProp = {
  newsletter?: string;
  "newsletter-title"?: string;
  "newsletter-description"?: string;
  "newsletter-form"?: string;
  "newsletter-field"?: string;
  "newsletter-label"?: string;
  "newsletter-input"?: string;
  "newsletter-button"?: string;
  "newsletter-privacy"?: string;
};
```

### Data Attributes

| Slot | Description |
| :--- | :--- |
| `newsletter` | Identifies this element as the root slot of the `newsletter` component. |
| `newsletter-title` | Identifies this element as the `title` slot of the `newsletter` component. |
| `newsletter-description` | Identifies this element as the `description` slot of the `newsletter` component. |
| `newsletter-form` | Identifies this element as the `form` slot of the `newsletter` component. |
| `newsletter-field` | Identifies this element as the `field` slot of the `newsletter` component. |
| `newsletter-label` | Identifies this element as the `label` slot of the `newsletter` component. |
| `newsletter-input` | Identifies this element as the `input` slot of the `newsletter` component. |
| `newsletter-button` | Identifies this element as the `button` slot of the `newsletter` component. |
| `newsletter-privacy` | Identifies this element as the `privacy` slot of the `newsletter` component. |

Base UI may apply `data-touched`, `data-dirty`, `data-valid`, `data-invalid`, `data-filled`, and `data-focused` to the field root and input according to field state. The label may receive `data-valid` or `data-invalid`.
