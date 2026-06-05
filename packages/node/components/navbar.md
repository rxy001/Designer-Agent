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
<nav data-slot="root" class="w-full min-w-0 overflow-hidden rounded-none">
  <div
    data-slot="inner"
    class="flex h-full min-h-14 w-full items-center px-5 py-3"
  >
    <a
      data-slot="brand"
      href="#"
      class="flex min-w-0 shrink-0 items-center gap-3 text-sm font-semibold tracking-normal"
    >
      <img data-slot="logo" class="h-8 w-8 shrink-0 object-contain" />
      <span class="truncate">Brand</span>
    </a>
    <div
      data-slot="nav"
      class="hidden min-w-0 flex-1 items-center gap-1 md:flex"
    >
      <a
        data-slot="nav-item"
        data-active
        href="#"
        class="rounded-md px-3 py-2 text-sm font-medium transition hover:bg-neutral-100 hover:text-neutral-950 bg-neutral-100 text-neutral-950"
      >
        Home
      </a>
      <a
        data-slot="nav-item"
        href="#"
        class="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
      >
        Docs
      </a>
    </div>
    <div data-slot="actions" class="hidden shrink-0 items-center gap-2 md:flex">
      <a
        data-slot="secondary-action"
        href="#"
        class="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
      >
        Sign in
      </a>
      <a
        data-slot="primary-action"
        href="#"
        class="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
      >
        Get started
      </a>
    </div>
    <button
      data-slot="mobile-toggle"
      type="button"
      class="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 md:hidden"
    >
      <span aria-hidden="true">☰</span>
    </button>
  </div>
  <div
    data-slot="mobile-panel"
    class="grid gap-2 border-t border-neutral-200 px-5 py-4 md:hidden"
  >
    <a
      data-slot="nav-item"
      data-active
      href="#"
      class="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 bg-neutral-100"
    >
      Home
    </a>
    <a
      data-slot="nav-item"
      href="#"
      class="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
    >
      Docs
    </a>
    <div class="mt-2 grid gap-2">
      <a
        data-slot="secondary-action"
        href="#"
        class="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
      >
        Sign in
      </a>
      <a
        data-slot="primary-action"
        href="#"
        class="rounded-md bg-neutral-950 px-4 py-2 text-center text-sm font-semibold text-white"
      >
        Get started
      </a>
    </div>
  </div>
</nav>
```

## API reference

### Navbar Props:

| Prop            | Type             | Default   | Description                                         |
| :-------------- | :--------------- | :-------- | :-------------------------------------------------- |
| brand           | `string`         | `"Brand"` | The brand text displayed in the navbar.             |
| logoSrc         | `string`         | -         | The source URL of the logo image.                   |
| logoAlt         | `string`         | -         | The alt text for the logo image.                    |
| items           | `NavbarItem[]`   | `[]`      | Navigation links displayed in the navbar.           |
| primaryAction   | `NavbarAction`   | -         | Primary action link.                                |
| secondaryAction | `NavbarAction`   | -         | Secondary action link.                              |
| sticky          | `boolean`        | `false`   | Whether the navbar should stick to the top.         |
| showMobileMenu  | `boolean`        | `true`    | Whether to render mobile menu controls when needed. |
| classNames      | `ClassNamesProp` | -         | CSS classes applied to internal elements.           |

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

| Attribute | Type | Description                           |
| :-------- | :--- | :------------------------------------ |
| data-slot | -    | Identifies the element as `root`.     |
| data-open | -    | Present when the mobile menu is open. |

**Inner Data Attributes:**

| Attribute | Type | Description                        |
| :-------- | :--- | :--------------------------------- |
| data-slot | -    | Identifies the element as `inner`. |

**Brand Data Attributes:**

| Attribute | Type | Description                        |
| :-------- | :--- | :--------------------------------- |
| data-slot | -    | Identifies the element as `brand`. |

**Logo Data Attributes:**

| Attribute | Type | Description                       |
| :-------- | :--- | :-------------------------------- |
| data-slot | -    | Identifies the element as `logo`. |

**Nav Data Attributes:**

| Attribute | Type | Description                      |
| :-------- | :--- | :------------------------------- |
| data-slot | -    | Identifies the element as `nav`. |

**Nav Item Data Attributes:**

| Attribute   | Type | Description                                 |
| :---------- | :--- | :------------------------------------------ |
| data-slot   | -    | Identifies the element as `nav-item`.       |
| data-active | -    | Present when the navigation item is active. |

**Actions Data Attributes:**

| Attribute | Type | Description                          |
| :-------- | :--- | :----------------------------------- |
| data-slot | -    | Identifies the element as `actions`. |

**Action Link Data Attributes:**

| Attribute | Type | Description                                                       |
| :-------- | :--- | :---------------------------------------------------------------- |
| data-slot | -    | Identifies the element as `primary-action` or `secondary-action`. |

**Mobile Toggle Data Attributes:**

| Attribute | Type | Description                                |
| :-------- | :--- | :----------------------------------------- |
| data-slot | -    | Identifies the element as `mobile-toggle`. |

**Mobile Panel Data Attributes:**

| Attribute | Type | Description                               |
| :-------- | :--- | :---------------------------------------- |
| data-slot | -    | Identifies the element as `mobile-panel`. |
