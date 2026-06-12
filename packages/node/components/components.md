# Component Specification

This specification is the sole source of truth for components.

## Components

| Component                 | Description                                                                                   |
| :------------------------ | :-------------------------------------------------------------------------------------------- |
| [Accordion](accordion.md) | A set of collapsible panels with headings.                                                    |
| [Button](./button.md)     | A button component that can be used to trigger actions.                                       |
| [Card](./card.md)         | Displays a card with optional image, header, content, and action.                             |
| [Carousel](./carousel.md) | Displays a carousel of image-based slides with previous and next controls.                    |
| [Contact](./contact.md)   | Displays a contact form with name, email, message, and submit button fields.                  |
| [Divider](./divider.md)   | Displays a visual separator.                                                                  |
| [Image](./image.md)       | Displays an image.                                                                            |
| [Navbar](./navbar.md)     | Displays a responsive navigation bar with brand, links, actions, and an optional mobile menu. |
| [Root](./root.md)         | The root container for a component tree.                                                      |
| [Section](./section.md)   | A layout container that divides its own area into a configurable grid.                        |
| [Social](./social.md)     | Displays a list of social links with built-in icons.                                          |
| [Tabs](./tabs.md)         | A set of tab triggers and panels for switching between related content.                       |
| [Text](./text.md)         | Displays text content.                                                                        |

## Data Slot Convention

`data-slot` identifies a rendered DOM element within a component.

- The root element uses the component name, for example `card`, `navbar`, or `accordion`.
- Internal elements use the `component-slot` format, for example `card-title`, `navbar-logo`, or `accordion-trigger`.
- Slot names are stable styling and targeting hooks for generated markup.

## Animation

A guide to animating UI components.

UI components can be animated using CSS transitions and CSS animations. Many interactive components provide data attributes to target their states, as well as a few attributes specifically for animation.

### CSS transitions

Use the following UI attributes for creating transitions when a component becomes visible or hidden:

- `[data-starting-style]` corresponds to the initial style to transition from.
- `[data-ending-style]` corresponds to the final style to transition to.

Transitions are recommended over CSS animations, because a transition can be smoothly cancelled midway.
For example, if the user closes a popup before it finishes opening, with CSS transitions it will smoothly animate to its closed state without any abrupt changes.

```css title="popover.css"
.Popup {
  box-sizing: border-box;
  padding: 1rem 1.5rem;
  background-color: canvas;
  transform-origin: var(--transform-origin);
  transition:
    transform 150ms,
    opacity 150ms;

  /* @highlight-start */
  &[data-starting-style],
  &[data-ending-style] {
    opacity: 0;
    transform: scale(0.9);
  }
  /* @highlight-end */
}
```

### CSS animations

Use the following UI attributes for creating CSS animations when a component becomes visible or hidden:

- `[data-open]` corresponds to the style applied when a component becomes visible.
- `[data-closed]` corresponds to the style applied before a component becomes hidden.

```css title="popover.css"
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes scaleOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}

.Popup[data-open] {
  animation: scaleIn 250ms ease-out;
}

.Popup[data-closed] {
  animation: scaleOut 250ms ease-in;
}
```
