# Automatic Grid repair fixtures

| Capability                                                               | Candidate/result                | Fixture                                |
| ------------------------------------------------------------------------ | ------------------------------- | -------------------------------------- |
| Use empty rows before resizing a Section                                 | `expand-tool-span-in-place`     | `in-place-span-overflow.jsx`           |
| Repair several independent Tools together                                | `expand-tool-span-in-place`     | `complex-multi-tool-in-place.jsx`      |
| Reveal clipped actions across a three-column Card band                   | `expand-tool-span-in-place`     | `three-column-card-actions.jsx`        |
| Remove completely unused trailing Section rows without changing Tools    | `compact-section-trailing-rows` | `section-trailing-empty-rows.jsx`      |
| Preserve deliberate full-screen bottom space                             | `no_improvement`                | `intentional-section-bottom-space.jsx` |
| Grow Section tracks without moving Tool coordinates                      | `expand-section-height`         | `section-height-overflow.jsx`          |
| Reflow downstream bands and preserve their gaps                          | `reflow-section-bands`          | `complex-downstream-reflow.jsx`        |
| Shift out-of-bounds bands by the minimum distance without changing spans | `shift-grid-bounds-in-place`    | `static-row-bounds.jsx`                |
| Isolate a repair to one responsive viewport                              | viewport-scoped repair          | `complex-tablet-isolation.jsx`         |
| Select the best browser-verified candidate                               | candidate ranking               | `vertical-overflow.jsx`                |
| Reject unsupported horizontal mutations and restore exact JSX            | `no_improvement`                | `horizontal-overflow.jsx`              |
| Make a second repair run a no-op                                         | `already_valid`                 | run any repaired fixture twice         |

All successful candidates are layout-only: content, component hierarchy,
horizontal placement, typography, and media dimensions are outside the automatic
repair scope. Every candidate is projected to JSX and verified in the browser;
regressions and verification errors restore the previous source.

`real-artfact.jsx` is the full-page integration fixture for manually inspecting
repair decisions across desktop, tablet, and mobile.
