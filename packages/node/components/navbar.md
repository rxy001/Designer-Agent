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
      ]}
      primaryAction={{ label: "Get started", href: "#" }}
      secondaryAction={{ label: "Sign in", href: "#" }}
      classNames={{
        navbar: "***",
        "navbar-inner": "***",
        "navbar-logo": "***",
        "navbar-brand": "***",
        "navbar-nav-list": "***",
        "navbar-nav-item": "***",
        "navbar-active-nav-item": "***",
        "navbar-actions": "***",
        "navbar-primary-action": "***",
        "navbar-secondary-action": "***",
        "navbar-mobile-toggle": "***",
        "navbar-mobile-panel": "***",
      }}
    />
  );
}
```

## DOM structure

This shows the rendered DOM structure and key data attributes.

```html
<nav
  data-slot="navbar"
  data-open
  class="w-full min-w-0 overflow-hidden rounded-none sticky top-0 z-50"
>
  <div
    data-slot="navbar-inner"
    class="flex h-full min-h-14 w-full items-center px-5 py-3"
  >
    <a
      data-slot="navbar-brand"
      href="#"
      class="flex min-w-0 shrink-0 items-center gap-3 text-sm font-semibold tracking-normal"
    >
      <img data-slot="navbar-logo" class="h-8 w-8 shrink-0 object-contain" />
      <span class="truncate">Brand</span>
    </a>
    <div
      data-slot="navbar-nav-list"
      class="hidden min-w-0 flex-1 items-center gap-1 md:flex"
    >
      <a
        data-slot="navbar-nav-item"
        data-active
        href="#"
        class="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
      >
        Home
      </a>
      <a
        data-slot="navbar-nav-item"
        href="#"
        class="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
      >
        Docs
      </a>
    </div>
    <div
      data-slot="navbar-actions"
      class="hidden shrink-0 items-center gap-2 md:flex"
    >
      <a
        data-slot="navbar-secondary-action"
        href="#"
        class="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
      >
        Sign in
      </a>
      <a
        data-slot="navbar-primary-action"
        href="#"
        class="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
      >
        Get started
      </a>
    </div>
    <button
      data-slot="navbar-mobile-toggle"
      type="button"
      aria-label="Toggle navigation"
      aria-expanded="true"
      class="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 md:hidden"
    >
      <span aria-hidden="true">×</span>
    </button>
  </div>
  <div
    data-slot="navbar-mobile-panel"
    class="grid gap-2 border-t border-neutral-200 px-5 py-4 md:hidden"
  >
    <a
      data-slot="navbar-nav-item"
      data-active
      href="#"
      class="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
    >
      Home
    </a>
    <div class="mt-2 grid gap-2">
      <a
        data-slot="navbar-secondary-action"
        href="#"
        class="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
      >
        Sign in
      </a>
      <a
        data-slot="navbar-primary-action"
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
  navbar?: string;
  "navbar-inner"?: string;
  "navbar-logo"?: string;
  "navbar-brand"?: string;
  "navbar-nav-list"?: string;
  "navbar-nav-item"?: string;
  "navbar-active-nav-item"?: string;
  "navbar-actions"?: string;
  "navbar-primary-action"?: string;
  "navbar-secondary-action"?: string;
  "navbar-mobile-toggle"?: string;
  "navbar-mobile-panel"?: string;
};
```

### Data Attributes

**Navbar Data Attributes:**

| Attribute | Type | Description                                                         |
| :-------- | :--- | :------------------------------------------------------------------ |
| data-slot | -    | Identifies this element as the root slot of the `navbar` component. |
| data-open | -    | Present when the mobile menu is open.                               |

**NavbarInner Data Attributes:**

| Attribute | Type | Description                                                            |
| :-------- | :--- | :--------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `inner` slot of the `navbar` component. |

**NavbarBrand Data Attributes:**

| Attribute | Type | Description                                                            |
| :-------- | :--- | :--------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `brand` slot of the `navbar` component. |

**NavbarLogo Data Attributes:**

| Attribute | Type | Description                                                           |
| :-------- | :--- | :-------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `logo` slot of the `navbar` component. |

**NavbarNavList Data Attributes:**

| Attribute | Type | Description                                                               |
| :-------- | :--- | :------------------------------------------------------------------------ |
| data-slot | -    | Identifies this element as the `nav-list` slot of the `navbar` component. |

**NavbarNavItem Data Attributes:**

| Attribute   | Type | Description                                                               |
| :---------- | :--- | :------------------------------------------------------------------------ |
| data-slot   | -    | Identifies this element as the `nav-item` slot of the `navbar` component. |
| data-active | -    | Present when the navigation item is active.                               |

**NavbarActions Data Attributes:**

| Attribute | Type | Description                                                              |
| :-------- | :--- | :----------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `actions` slot of the `navbar` component. |

**NavbarSecondaryAction Data Attributes:**

| Attribute | Type | Description                                                                       |
| :-------- | :--- | :-------------------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `secondary-action` slot of the `navbar` component. |

**NavbarPrimaryAction Data Attributes:**

| Attribute | Type | Description                                                                     |
| :-------- | :--- | :------------------------------------------------------------------------------ |
| data-slot | -    | Identifies this element as the `primary-action` slot of the `navbar` component. |

**NavbarMobileToggle Data Attributes:**

| Attribute | Type | Description                                                                    |
| :-------- | :--- | :----------------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `mobile-toggle` slot of the `navbar` component. |

**NavbarMobilePanel Data Attributes:**

| Attribute | Type | Description                                                                   |
| :-------- | :--- | :---------------------------------------------------------------------------- |
| data-slot | -    | Identifies this element as the `mobile-panel` slot of the `navbar` component. |
