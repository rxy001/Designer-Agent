# Component Specification

This specification is the sole source of truth for components.

## Allowed Components

- [Accordion](./accordion.md)
- [Button](./button.md)
- [Card](./card.md)
- [Carousel](./carousel.md)
- [Contact](./contact.md)
- [HTML](./html.md)
- [Image](./image.md)
- [Section](./section.md)
- [Social](./social.md)
- [Tabs](./tabs.md)
- [Text](./text.md)

All components can be styled via `className` or `slots.*.className`.

## Animation

A guide to animating UI components.

UI components can be animated using CSS transitions, CSS animations. Each component provides a number of data attributes to target its states, as well as a few attributes specifically for animation.

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
