# Navbar

Displays a responsive navigation bar with brand, links, actions, and an optional mobile menu.

## Usage guidelines

- **Brand**: Use `brand` and optionally `logoSrc`/`logoAlt` for the leading brand area.
- **Navigation items**: Use `items` to render navigation links; set `active` on the current item.
- **Actions**: Use `primaryAction` and `secondaryAction` for call-to-action links.
- **Mobile menu**: Set `showMobileMenu={false}` to hide the mobile toggle and panel behavior.
- **Sticky positioning**: Set `sticky={true}` to make the navbar sticky at the top of the page.
- **Styling**: Use the `classNames` prop to style the root and internal elements.

## Demo

This example shows how to implement the component using Tailwind CSS.

```jsx
import { Navbar } from "@/components";

export default function App() {
  return (
    <Navbar
      brand="Brand"
      logoSrc="https://*.com/logo.png"
      logoAlt="Brand logo"
      sticky
      items={[
        { label: "Home", href: "#", active: true },
        { label: "Docs", href: "#" },
        { label: "Pricing", href: "#" },
      ]}
      primaryAction={{ label: "Get started", href: "#" }}
      secondaryAction={{ label: "Sign in", href: "#" }}
      classNames={{
        root: "***",
        inner: "***",
        logo: "***",
        brand: "***",
        nav: "***",
        navItem: "***",
        activeNavItem: "***",
        actions: "***",
        primaryAction: "***",
        secondaryAction: "***",
        mobileToggle: "***",
        mobilePanel: "***",
      }}
    />
  );
}
```

## DOM structure

This shows the rendered DOM structure and key data attributes.

```html
<nav data-slot="root">
  <div data-slot="inner">
    <a data-slot="brand" href="#">
      <img data-slot="logo" />
      <span>Brand</span>
    </a>
    <div data-slot="nav">
      <a data-slot="nav-item" data-active href="#">Home</a>
      <a data-slot="nav-item" href="#">Docs</a>
    </div>
    <div data-slot="actions">
      <a data-slot="secondary-action" href="#">Sign in</a>
      <a data-slot="primary-action" href="#">Get started</a>
    </div>
    <button data-slot="mobile-toggle" type="button">
      <span aria-hidden="true">☰</span>
    </button>
  </div>
  <div data-slot="mobile-panel">
    <a data-slot="nav-item" data-active href="#">Home</a>
    <a data-slot="nav-item" href="#">Docs</a>
    <div>
      <a data-slot="secondary-action" href="#">Sign in</a>
      <a data-slot="primary-action" href="#">Get started</a>
    </div>
  </div>
</nav>
```

## API reference

### Navbar Props:

| Prop            | Type             | Default  | Description                                           |
| :-------------- | :--------------- | :------- | :---------------------------------------------------- |
| brand           | `string`         | `"Brand"` | The brand text displayed in the navbar.              |
| logoSrc         | `string`         | -        | The source URL of the logo image.                    |
| logoAlt         | `string`         | -        | The alt text for the logo image.                     |
| items           | `NavbarItem[]`   | `[]`     | Navigation links displayed in the navbar.            |
| primaryAction   | `NavbarAction`   | -        | Primary action link.                                 |
| secondaryAction | `NavbarAction`   | -        | Secondary action link.                               |
| sticky          | `boolean`        | `false`  | Whether the navbar should stick to the top.          |
| showMobileMenu  | `boolean`        | `true`   | Whether to render mobile menu controls when needed.  |
| classNames      | `ClassNamesProp` | -        | CSS classes applied to internal elements.            |

**Additional Types**

```typescript
type NavbarItem = {
  label: string;
  href?: string;
  active?: boolean;
};

type NavbarAction = {
  label: string;
  href?: string;
};

type ClassNamesProp = {
  root?: string;
  inner?: string;
  logo?: string;
  brand?: string;
  nav?: string;
  navItem?: string;
  activeNavItem?: string;
  actions?: string;
  primaryAction?: string;
  secondaryAction?: string;
  mobileToggle?: string;
  mobilePanel?: string;
};
```

### Data Attributes

**Root Data Attributes:**

| Attribute | Type | Description                                    |
| :-------- | :--- | :--------------------------------------------- |
| data-slot | -    | Identifies the element as `root`.              |
| data-open | -    | Present when the mobile menu is open.          |

**Inner Data Attributes:**

| Attribute | Type | Description                       |
| :-------- | :--- | :-------------------------------- |
| data-slot | -    | Identifies the element as `inner`. |

**Brand Data Attributes:**

| Attribute | Type | Description                       |
| :-------- | :--- | :-------------------------------- |
| data-slot | -    | Identifies the element as `brand`. |

**Logo Data Attributes:**

| Attribute | Type | Description                      |
| :-------- | :--- | :------------------------------- |
| data-slot | -    | Identifies the element as `logo`. |

**Nav Data Attributes:**

| Attribute | Type | Description                     |
| :-------- | :--- | :------------------------------ |
| data-slot | -    | Identifies the element as `nav`. |

**Nav Item Data Attributes:**

| Attribute   | Type | Description                                 |
| :---------- | :--- | :------------------------------------------ |
| data-slot   | -    | Identifies the element as `nav-item`.       |
| data-active | -    | Present when the navigation item is active. |

**Actions Data Attributes:**

| Attribute | Type | Description                         |
| :-------- | :--- | :---------------------------------- |
| data-slot | -    | Identifies the element as `actions`. |

**Action Link Data Attributes:**

| Attribute | Type | Description                                             |
| :-------- | :--- | :------------------------------------------------------ |
| data-slot | -    | Identifies the element as `primary-action` or `secondary-action`. |

**Mobile Toggle Data Attributes:**

| Attribute | Type | Description                               |
| :-------- | :--- | :---------------------------------------- |
| data-slot | -    | Identifies the element as `mobile-toggle`. |

**Mobile Panel Data Attributes:**

| Attribute | Type | Description                              |
| :-------- | :--- | :--------------------------------------- |
| data-slot | -    | Identifies the element as `mobile-panel`. |
