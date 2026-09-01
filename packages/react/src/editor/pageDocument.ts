import type { OverlayNode, PageDocument, SectionNode, ToolNode } from "./types";

export const overlayTypes: OverlayNode["type"][] = [
  "dialog",
  "alert-dialog",
  "toast",
  "drawer",
];

export const defaultOverlayClassNames = {
  dialog: {
    "dialog-popup": "rounded-2xl p-6",
    "dialog-title": "text-lg font-semibold text-neutral-950",
    "dialog-description": "mt-2 text-sm leading-6 text-neutral-600",
    "dialog-actions": "mt-6",
    "dialog-close":
      "rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-950",
    "dialog-action":
      "rounded-md bg-neutral-950 px-3 py-2 text-sm font-medium text-white",
  },
  "alert-dialog": {
    "alert-dialog-popup": "group rounded-2xl p-6",
    "alert-dialog-title": "text-lg font-semibold text-neutral-950",
    "alert-dialog-description":
      "mt-2 text-sm leading-6 text-neutral-600",
    "alert-dialog-actions": "mt-6",
    "alert-dialog-cancel":
      "rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-950",
    "alert-dialog-confirm":
      "rounded-md bg-neutral-950 px-3 py-2 text-sm font-medium text-white group-data-[tone=danger]:bg-red-600",
  },
  toast: {
    toast: "rounded-xl border border-neutral-200 p-4",
    title: "font-semibold text-neutral-950",
    description: "mt-1 text-sm text-neutral-600",
    action: "mt-3 text-sm font-medium text-blue-600",
    close: "mt-3 text-sm text-neutral-500",
  },
  drawer: {
    "drawer-content": "h-full p-6",
    "drawer-title": "text-lg font-semibold text-neutral-950",
    "drawer-description": "mt-2 text-sm leading-6 text-neutral-600",
    "drawer-actions": "mt-6",
    "drawer-close":
      "rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-950",
    "drawer-action":
      "rounded-md bg-neutral-950 px-3 py-2 text-sm font-medium text-white",
  },
} satisfies Record<OverlayNode["type"], Record<string, string>>;

export function createOverlay(
  type: OverlayNode["type"],
  index: number,
): OverlayNode {
  const label = type === "alert-dialog"
    ? "Alert dialog"
    : `${type[0]!.toUpperCase()}${type.slice(1)}`;
  const common = {
    id: `overlay_${type}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type,
    name: `${label} ${index}`,
  };

  switch (type) {
    case "alert-dialog":
      return {
        ...common,
        props: {
          title: "Are you sure?",
          description: "This action cannot be undone.",
          cancelLabel: "Cancel",
          confirmLabel: "Continue",
          tone: "default",
          classNames: defaultOverlayClassNames["alert-dialog"],
        },
      };
    case "toast":
      return {
        ...common,
        props: {
          title: "Notification",
          description: "Your changes were saved.",
          closeLabel: "Close",
          tone: "default",
          timeout: 5000,
          placement: "bottom-right",
          classNames: defaultOverlayClassNames.toast,
        },
      };
    case "drawer":
      return {
        ...common,
        props: {
          title: "Drawer",
          description: "Drawer content",
          closeLabel: "Close",
          side: "right",
          modal: true,
          dismissOnOutsidePress: true,
          classNames: defaultOverlayClassNames.drawer,
        },
      };
    case "dialog":
      return {
        ...common,
        props: {
          title: "Dialog",
          description: "Dialog content",
          closeLabel: "Close",
          modal: true,
          dismissOnOutsidePress: true,
          classNames: defaultOverlayClassNames.dialog,
        },
      };
  }
}

export const defaultToolClassNames = {
  accordion: {
    accordion:
      "h-full rounded-lg border border-neutral-200 bg-white p-4 text-neutral-950",
    "accordion-item": "border-b border-neutral-200 py-2",
    "accordion-trigger": "gap-3 text-left text-sm font-medium",
    "accordion-panel": "text-sm text-neutral-600",
    "accordion-content": "pt-2 leading-6",
    "accordion-indicator": "h-4 w-4",
  },
  avatar: {
    avatar: "h-16 w-16 bg-neutral-100 text-neutral-600",
    "avatar-fallback": "text-sm font-semibold uppercase",
  },
  badge: {
    badge:
      "h-full rounded-full bg-neutral-100 px-3 text-xs font-semibold text-neutral-700",
  },
  button: {
    button:
      "h-full w-full rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white",
  },
  card: {
    card: "h-full rounded-lg border border-neutral-200 bg-white p-4",
    "card-title": "text-lg font-semibold text-neutral-950",
    "card-description": "mt-2 text-sm leading-6 text-neutral-600",
    "card-footer": "mt-4",
    "card-action":
      "rounded-md bg-neutral-950 px-3 py-2 text-sm font-medium text-white",
  },
  carousel: {
    carousel: "overflow-hidden rounded-lg bg-neutral-100",
    "carousel-content": "h-full",
    "carousel-item": "relative h-full",
    "carousel-item-img": "h-full w-full object-cover",
    "carousel-item-title":
      "absolute bottom-14 left-5 rounded bg-white/90 px-3 py-1 text-sm font-semibold text-neutral-950",
    "carousel-item-description":
      "absolute bottom-5 left-5 rounded bg-white/90 px-3 py-1 text-xs text-neutral-600",
    "carousel-previous": "h-8 w-8 bg-white text-neutral-950 shadow",
    "carousel-next": "h-8 w-8 bg-white text-neutral-950 shadow",
  },
  contact: {
    contact:
      "h-full rounded-lg border border-neutral-200 bg-white p-4 text-neutral-950",
    "contact-field-group": "space-y-3",
    "contact-field": "space-y-1",
    "contact-field-label": "text-xs font-medium text-neutral-600",
    "contact-input":
      "h-9 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400",
    "contact-textarea":
      "min-h-20 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400",
    "contact-button":
      "mt-3 rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white",
  },
  input: {
    input: "space-y-1 text-neutral-950",
    "input-label": "block text-sm font-medium",
    "input-control":
      "h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50",
    "input-description": "text-xs leading-5 text-neutral-500",
    "input-error": "text-xs leading-5 text-red-600",
  },
  divider: {
    divider: "border-gray-400",
  },
  image: {
    image: "h-full w-full rounded-md object-cover",
  },
  icon: {
    icon: "h-6 w-6 text-neutral-950",
  },
  list: {
    list: "space-y-3 text-neutral-950",
    "list-item": "flex gap-3",
    "list-marker": "mt-1 h-4 w-4 text-neutral-950",
    "list-content": "min-w-0",
    "list-title": "font-medium",
    "list-description": "mt-1 text-sm leading-6 text-neutral-600",
  },
  navbar: {
    "navbar-nav-list": "hidden gap-5 @3xl:flex",
    "navbar-nav-item": "text-sm text-neutral-600",
    "navbar-active-nav-item": "text-neutral-950",
    "navbar-actions": "ml-auto hidden gap-2 @3xl:flex",
    "navbar-primary-action":
      "rounded-md bg-neutral-950 px-3 py-2 text-sm text-white",
    "navbar-mobile-toggle": "ml-auto @3xl:hidden",
  },
  newsletter: {
    newsletter: "h-full rounded-lg border border-neutral-200 bg-white p-6",
    "newsletter-title": "text-2xl font-semibold text-neutral-950",
    "newsletter-description": "mt-2 text-sm leading-6 text-neutral-600",
    "newsletter-form": "mt-4 flex gap-2",
    "newsletter-field": "flex min-w-0 flex-1 flex-col",
    "newsletter-label": "sr-only",
    "newsletter-input":
      "min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400",
    "newsletter-button":
      "rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white",
    "newsletter-privacy": "mt-2 text-xs leading-5 text-neutral-500",
  },
  social: {
    social: "flex h-full items-center gap-3 text-neutral-950",
    "social-item":
      "flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-950",
  },
  tabs: {
    tabs:
      "h-full rounded-lg border border-neutral-200 bg-white p-4 text-neutral-950",
    "tabs-list": "mb-3 flex gap-2",
    "tabs-tab":
      "rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 data-[selected]:bg-neutral-950 data-[selected]:text-white",
    "tabs-content": "text-sm leading-6 text-neutral-600",
  },
  text: {
    text: "text-lg font-medium text-neutral-950",
  },
} satisfies Record<string, Record<string, string>>;

export const addableToolTypes: Array<ToolNode["type"]> = [
  "accordion",
  "avatar",
  "badge",
  "button",
  "card",
  "carousel",
  "contact",
  "divider",
  "image",
  "icon",
  "input",
  "list",
  "navbar",
  "newsletter",
  "social",
  "tabs",
  "text",
];

export const createInitialPageDocument = (): PageDocument => ({
  id: `page_${Date.now()}`,
  title: "Untitled Page",
  version: 1,
  viewport: "desktop",
  props: {
    className: "text-neutral-950",
  },
  sections: [createSection(1)],
  overlays: [],
});

export function findOverlay(page: PageDocument, overlayId?: string) {
  if (!overlayId) return undefined;
  return (page.overlays ?? []).find((overlay) => overlay.id === overlayId);
}

export function findOverlayTriggers(page: PageDocument, overlayId: string) {
  const triggers: ToolNode[] = [];
  for (const section of page.sections) {
    for (const tool of section.tools) {
      const action = tool.props.action as
        | { type?: unknown; targetId?: unknown }
        | undefined;
      if (action?.type === "overlay" && action.targetId === overlayId) {
        triggers.push(tool);
      }
    }
  }
  return triggers;
}

export function findTool(page: PageDocument, toolId?: string) {
  if (!toolId) return undefined;

  for (const section of page.sections) {
    const tool = section.tools.find((item) => item.id === toolId);

    if (tool) {
      return tool;
    }
  }

  return undefined;
}

export function findSection(page: PageDocument, sectionId?: string) {
  if (!sectionId) return undefined;
  return page.sections.find((section) => section.id === sectionId);
}

export function getSortedTools(section: SectionNode) {
  return [...section.tools].sort((a, b) => {
    const rowDelta = a.layout.gridArea.rowStart - b.layout.gridArea.rowStart;

    if (rowDelta !== 0) return rowDelta;

    return (
      a.layout.gridArea.columnStart - b.layout.gridArea.columnStart ||
      a.layout.zIndex - b.layout.zIndex
    );
  });
}

export function createSection(index: number): SectionNode {
  return {
    id: `section_${Date.now()}_${index}`,
    type: "section",
    name: `Section ${index}`,
    grid: {
      columns: 12,
      rows: 10,
      height: 720,
      columnGap: 12,
      rowGap: 12,
    },
    tools: [],
  };
}

export function createTool(
  type: ToolNode["type"],
  section: SectionNode,
): ToolNode {
  const id = `tool_${type}_${Date.now()}`;
  const base = {
    id,
    name: `${type[0].toUpperCase()}${type.slice(1)}`,
    layout: {
      gridArea: {
        rowStart: Math.min(3, section.grid.rows),
        columnStart: 2,
        rowEnd: Math.min(5, section.grid.rows + 1),
        columnEnd: Math.min(6, section.grid.columns + 1),
      },
      zIndex: section.tools.length + 1,
    },
  };

  switch (type) {
    case "accordion":
      return {
        ...base,
        type,
        props: {
          classNames: defaultToolClassNames.accordion,
          items: [
            {
              key: "item-1",
              title: "What can I edit?",
              content: "Drag, resize, and ask AI to revise this block.",
            },
            {
              key: "item-2",
              title: "Is it responsive?",
              content: "Mobile preview stacks tools automatically.",
            },
          ],
        },
      };
    case "avatar":
      return {
        ...base,
        type,
        layout: {
          ...base.layout,
          gridArea: {
            rowStart: 3,
            columnStart: 2,
            rowEnd: 5,
            columnEnd: 4,
          },
        },
        props: {
          src: "",
          alt: "Profile avatar",
          fallback: "JD",
          classNames: defaultToolClassNames.avatar,
        },
      };
    case "badge":
      return {
        ...base,
        type,
        layout: {
          ...base.layout,
          gridArea: {
            rowStart: 3,
            columnStart: 2,
            rowEnd: 4,
            columnEnd: 5,
          },
        },
        props: {
          label: "New",
          className: defaultToolClassNames.badge.badge,
        },
      };
    case "image":
      return {
        ...base,
        type,
        props: {
          className: defaultToolClassNames.image.image,
          src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
          alt: "Workspace",
        },
      };
    case "icon":
      return {
        ...base,
        type,
        layout: {
          ...base.layout,
          gridArea: {
            rowStart: 3,
            columnStart: 2,
            rowEnd: 4,
            columnEnd: 3,
          },
        },
        props: {
          name: "ShieldCheck",
          className: defaultToolClassNames.icon.icon,
        },
      };
    case "input":
      return {
        ...base,
        type,
        layout: {
          ...base.layout,
          gridArea: {
            rowStart: 3,
            columnStart: 2,
            rowEnd: 5,
            columnEnd: 7,
          },
        },
        props: {
          label: "Email",
          name: "email",
          type: "email",
          placeholder: "you@example.com",
          classNames: defaultToolClassNames.input,
        },
      };
    case "list":
      return {
        ...base,
        type,
        layout: {
          ...base.layout,
          gridArea: {
            rowStart: 3,
            columnStart: 2,
            rowEnd: 8,
            columnEnd: 8,
          },
        },
        props: {
          marker: "check",
          items: [
            { key: "item-1", title: "First benefit", description: "Describe the value for your visitors." },
            { key: "item-2", title: "Second benefit", description: "Add another clear and useful detail." },
            { key: "item-3", title: "Third benefit", description: "Keep the list concise and scannable." },
          ],
          classNames: defaultToolClassNames.list,
        },
      };
    case "button":
      return {
        ...base,
        type,
        props: {
          className: defaultToolClassNames.button.button,
          label: "Button",
          href: "#",
        },
      };
    case "carousel":
      return {
        ...base,
        type,
        layout: {
          ...base.layout,
          gridArea: {
            rowStart: 3,
            columnStart: 2,
            rowEnd: 8,
            columnEnd: 8,
          },
        },
        props: {
          classNames: defaultToolClassNames.carousel,
          items: [
            {
              imgSrc:
                "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
              imgAlt: "Office lounge",
              title: "First slide",
              description: "A generated carousel item.",
            },
            {
              imgSrc:
                "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
              imgAlt: "Workspace",
              title: "Second slide",
              description: "Resize this carousel on the grid.",
            },
          ],
        },
      };
    case "card":
      return {
        ...base,
        type,
        props: {
          classNames: defaultToolClassNames.card,
          title: "Card title",
          description: "Card description",
          buttonLabel: "Action",
          buttonHref: "#",
        },
      };
    case "contact":
      return {
        ...base,
        type,
        layout: {
          ...base.layout,
          gridArea: {
            rowStart: 3,
            columnStart: 2,
            rowEnd: 9,
            columnEnd: 7,
          },
        },
        props: {
          classNames: defaultToolClassNames.contact,
          labels: {
            name: "Name",
            email: "Email",
            message: "Message",
          },
          placeholders: {
            name: "Jane Doe",
            email: "jane@example.com",
            message: "Tell us about your project",
          },
          buttonLabel: "Send",
        },
      };
    case "divider":
      return {
        ...base,
        type,
        layout: {
          ...base.layout,
          gridArea: {
            rowStart: 3,
            columnStart: 2,
            rowEnd: 4,
            columnEnd: 8,
          },
        },
        props: {
          orientation: "horizontal",
          className: defaultToolClassNames.divider.divider,
        },
      };
    case "navbar":
      return {
        ...base,
        type,
        siteBinding: { kind: "site-navigation" },
        layout: {
          ...base.layout,
          gridArea: {
            rowStart: 1,
            columnStart: 1,
            rowEnd: Math.min(3, section.grid.rows + 1),
            columnEnd: section.grid.columns + 1,
          },
        },
        props: {
          brand: "Brand",
          sticky: true,
          showMobileMenu: true,
          classNames: defaultToolClassNames.navbar,
        },
      };
    case "newsletter":
      return {
        ...base,
        type,
        layout: {
          ...base.layout,
          gridArea: {
            rowStart: 3,
            columnStart: 2,
            rowEnd: 8,
            columnEnd: 9,
          },
        },
        props: {
          title: "Stay in the loop",
          description: "Get product news and practical tips in your inbox.",
          emailLabel: "Email address",
          emailPlaceholder: "you@example.com",
          buttonLabel: "Subscribe",
          privacyText: "No spam. Unsubscribe at any time.",
          method: "post",
          classNames: defaultToolClassNames.newsletter,
        },
      };
    case "social":
      return {
        ...base,
        type,
        layout: {
          ...base.layout,
          gridArea: {
            rowStart: 3,
            columnStart: 2,
            rowEnd: 4,
            columnEnd: 6,
          },
        },
        props: {
          classNames: defaultToolClassNames.social,
          items: [
            { icon: "github", href: "#" },
            { icon: "linkedin", href: "#" },
            { icon: "x", href: "#" },
          ],
        },
      };
    case "tabs":
      return {
        ...base,
        type,
        props: {
          classNames: defaultToolClassNames.tabs,
          items: [
            { key: "overview", title: "Overview", content: "Overview content" },
            { key: "details", title: "Details", content: "Details content" },
          ],
          orientation: "horizontal",
        },
      };
    case "custom":
      return {
        ...base,
        type,
        props: { componentName: "CustomBlock", data: {} },
      };
    case "text":
    default:
      return {
        ...base,
        type: "text",
        props: {
          className: defaultToolClassNames.text.text,
          content: "New text tool",
        },
      };
  }
}
