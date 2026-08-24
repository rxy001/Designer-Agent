# Icon

Renders a supported Lucide interface icon by its canonical React name.

## Usage guidelines

- **Icon system**: The default icon system is Lucide. Use the canonical PascalCase name listed below; do not invent names or draw replacement SVGs.
- **Meaning**: Select icons for a clear interface purpose rather than decoration. Prefer the most literal familiar symbol.
- **Accessibility**: Omit `ariaLabel` when nearby visible text already explains the icon. Provide `ariaLabel` when the icon conveys meaning on its own.
- **Color**: Icons inherit `currentColor`, so use text-color utilities in `className`.
- **Buttons**: Use `Button.startIcon` or `Button.endIcon` instead of placing an `Icon` inside a `Button`.
- **Brands**: Lucide does not contain brand logos. Use `Social` for supported social-network icons.

### Available Lucide names

| Category | Names |
| :--- | :--- |
| Navigation | `ArrowDown`, `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ChevronDown`, `ChevronLeft`, `ChevronRight`, `ChevronUp`, `ExternalLink`, `Menu`, `MoreHorizontal`, `MoreVertical`, `PanelLeft` |
| Actions | `Archive`, `Check`, `Clipboard`, `Copy`, `Download`, `Edit3`, `Filter`, `Minus`, `Plus`, `RefreshCw`, `Save`, `Search`, `Send`, `Share2`, `SlidersHorizontal`, `Trash2`, `Upload`, `X` |
| Status and feedback | `Activity`, `BadgeCheck`, `Bell`, `CircleAlert`, `CircleCheck`, `CircleHelp`, `CircleX`, `Info`, `LoaderCircle`, `Sparkles`, `Star`, `TriangleAlert`, `Zap` |
| People and communication | `Bot`, `Inbox`, `Mail`, `MessageCircle`, `MessageSquare`, `Phone`, `User`, `UserCheck`, `Users` |
| Files and content | `BookOpen`, `Calendar`, `Camera`, `File`, `FileText`, `Folder`, `Image`, `Link`, `List`, `Package`, `Play`, `Tag` |
| Devices and connectivity | `Airplay`, `Cloud`, `Laptop`, `Monitor`, `Wifi`, `WifiOff` |
| Security | `Accessibility`, `Key`, `Lock`, `Shield`, `ShieldAlert`, `ShieldCheck` |
| Commerce | `CreditCard`, `ShoppingBag`, `ShoppingCart` |
| Data and development | `ChartBar`, `ChartLine`, `Code`, `Database`, `Settings`, `Wrench` |
| Places and general | `AlarmClock`, `Clock`, `Globe`, `Heart`, `Home`, `Lightbulb`, `Map`, `MapPin`, `Moon`, `Rocket`, `Sun` |
| Visibility and sessions | `Eye`, `EyeOff`, `LogIn`, `LogOut` |

## Demo

This example shows a standalone decorative icon using Tailwind CSS.

```jsx
import { Icon } from "@/components";

export default function App() {
  return (
    <Icon
      id="security-icon"
      name="ShieldCheck"
      className="row-start-1 row-end-2 col-start-1 col-end-2 size-6 text-emerald-600"
    />
  );
}
```

## DOM structure

Without `ariaLabel`, the icon is decorative:

```html
<svg
  id="security-icon"
  data-slot="icon"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  aria-hidden="true"
  focusable="false"
></svg>
```

With `ariaLabel`, it exposes an accessible image role:

```html
<svg
  data-slot="icon"
  role="img"
  aria-label="Verified security"
  focusable="false"
></svg>
```

## API reference

### Icon Props:

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| name | `IconName` | - | Canonical PascalCase Lucide name from the supported list. |
| size | `number \| string` | `24` | Width and height passed to the Lucide icon. |
| strokeWidth | `number` | `2` | Stroke width passed to the Lucide icon. |
| className | `string` | - | CSS classes applied to the SVG root. |
| ariaLabel | `string` | - | Accessible label for a meaningful standalone icon. Omit for decorative icons. |
| id | `string` | - | The id applied to the SVG root. |

`IconName` is the union of every name in the **Available Lucide names** table.

### Data Attributes

**Icon Data Attributes:**

| Attribute | Type | Description |
| :--- | :--- | :--- |
| data-slot | - | Identifies this element as the root slot of the `icon` component. |
