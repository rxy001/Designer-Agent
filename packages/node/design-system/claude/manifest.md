A compact structured summary derived from this brand's components.html fixture. Use it as the component inventory for generated artifacts: match the listed selectors, component groups, class names, token references, focus behavior, and spacing cadence. Prefer these manifest entries over inventing new component shapes.

components.manifest schema v1 for claude
Fixture: 50 selectors, 25 classes, 56 declared tokens, 48 referenced tokens.
Available component groups:

- Buttons and calls to action: selectors .btn, .btn-primary, .btn-primary:active, .btn-primary:hover, .btn-secondary, .btn-secondary:hover, .btn:active, .btn:focus-visible; tokens --accent-hover, --ease-standard, --fg-2, --focus-ring, --font-body, --motion-fast, --radius-sm, --space-2, --surface-warm, --text-sm
- Form fields and controls: selectors .field, .field input, .field input::placeholder, .field input:focus-visible, .field label, .field-help; tokens --border-soft, --ease-standard, --fg, --font-body, --meta, --motion-fast, --radius-md, --space-2, --surface, --text-sm
- Cards and panels: selectors .card; tokens --border, --elev-raised, --radius-sm, --space-3, --space-6, --surface
- Badges, chips, and status labels: selectors .badge, .badge-dot, .badge-muted, .badge-success; tokens --success
- Links and inline actions: selectors a, a:hover; tokens --accent
- Keyboard hints: selectors kbd; tokens none
- Icon slots: selectors .icon; tokens none
- Typography scale and text utilities: selectors .body-muted, .body-sm, .eyebrow, .lead, h1, h2, h3; tokens --font-body, --font-display, --leading-tight, --meta, --muted, --text-2xl, --text-xs, --tracking-display
- Layout primitives: selectors .container, .row-between, .stack-3 > _ + _, .stack-4 > _ + _, .stack-6 > _ + _, section, section + section; tokens --border, --container-gutter-desktop, --container-gutter-phone, --container-gutter-tablet, --container-max, --space-4
