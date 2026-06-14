import type { PageDocument, SectionNode, ToolNode } from "./types";

export const defaultSectionId = "section_hero";

export const defaultToolClassNames = {
  accordion: {
    "accordion-item": "border-b border-neutral-200 py-2",
    "accordion-trigger": "gap-3 text-left text-sm font-medium",
    "accordion-panel": "text-sm text-neutral-600",
    "accordion-content": "pt-2 leading-6",
    "accordion-indicator": "h-4 w-4",
  },
  card: {
    "card-title": "text-lg font-semibold text-neutral-950",
    "card-description": "mt-2 text-sm leading-6 text-neutral-600",
    "card-footer": "mt-4",
    "card-action": "rounded-md bg-neutral-950 px-3 py-2 text-sm font-medium text-white",
  },
  carousel: {
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
    "contact-field-group": "space-y-3",
    "contact-field": "space-y-1",
    "contact-field-label": "text-xs font-medium text-neutral-600",
    "contact-input":
      "h-9 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400",
    "contact-textarea":
      "min-h-20 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400",
    "contact-button": "mt-3 rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white",
  },
  navbar: {
    "navbar-nav-list": "hidden gap-5 md:flex",
    "navbar-nav-item": "text-sm text-neutral-600",
    "navbar-active-nav-item": "text-neutral-950",
    "navbar-actions": "ml-auto hidden gap-2 md:flex",
    "navbar-primary-action": "rounded-md bg-neutral-950 px-3 py-2 text-sm text-white",
    "navbar-mobile-toggle": "ml-auto md:hidden",
  },
  social: {
    "social-item":
      "flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-950",
  },
  tabs: {
    "tabs-list": "mb-3 flex gap-2",
    "tabs-tab":
      "rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 data-[selected]:bg-neutral-950 data-[selected]:text-white",
    "tabs-content": "text-sm leading-6 text-neutral-600",
  },
} satisfies Record<string, Record<string, string>>;

export const addableToolTypes: Array<ToolNode["type"]> = [
  "accordion",
  "button",
  "card",
  "carousel",
  "contact",
  "divider",
  "image",
  "navbar",
  "social",
  "tabs",
  "text",
];

export const createInitialPageDocument = (): PageDocument => ({
  id: "page_home",
  title: "AI Website Draft",
  version: 1,
  viewport: "desktop",
  sections: [
    {
      id: defaultSectionId,
      type: "section",
      name: "Hero",
      grid: {
        columns: 12,
        rows: 12,
        columnGap: 12,
        rowGap: 12,
      },
      layout: {
        height: 680,
      },
      responsive: {
        mobile: "auto-stack",
      },
      tools: [
        {
          id: "tool_navbar",
          type: "navbar",
          name: "Navigation",
          locked: true,
          layout: {
            gridArea: {
              rowStart: 1,
              columnStart: 1,
              rowEnd: 2,
              columnEnd: 13,
            },
            zIndex: 3,
          },
          props: {
            brand: "PageForge",
            classNames: {
              navbar: "h-full border-b border-neutral-200 bg-white/95 text-neutral-950",
              ...defaultToolClassNames.navbar,
            },
            items: [
              { label: "Templates", href: "#" },
              { label: "Pricing", href: "#" },
              { label: "Docs", href: "#" },
            ],
            primaryAction: { label: "Start", href: "#" },
          },
        },
        {
          id: "tool_heading",
          type: "text",
          name: "Hero Heading",
          layout: {
            gridArea: {
              rowStart: 4,
              columnStart: 2,
              rowEnd: 6,
              columnEnd: 8,
            },
            zIndex: 2,
          },
          props: {
            className:
              "text-5xl font-semibold leading-tight tracking-normal text-neutral-950",
            content: "Build polished websites with AI and a real editor.",
          },
        },
        {
          id: "tool_body",
          type: "text",
          name: "Hero Copy",
          layout: {
            gridArea: {
              rowStart: 6,
              columnStart: 2,
              rowEnd: 8,
              columnEnd: 7,
            },
            zIndex: 2,
          },
          props: {
            className: "text-base leading-7 text-neutral-600",
            content:
              "Generate a page, drag tools into place, resize with grid precision, and ask AI to refine either the selected tool or the whole page.",
          },
        },
        {
          id: "tool_cta",
          type: "button",
          name: "Primary CTA",
          layout: {
            gridArea: {
              rowStart: 8,
              columnStart: 2,
              rowEnd: 9,
              columnEnd: 5,
            },
            zIndex: 2,
          },
          props: {
            className:
              "h-full w-full rounded-md bg-neutral-950 px-5 text-sm font-semibold text-white",
            label: "Generate page",
            href: "#",
          },
        },
        {
          id: "tool_card",
          type: "card",
          name: "Preview Card",
          layout: {
            gridArea: {
              rowStart: 4,
              columnStart: 8,
              rowEnd: 11,
              columnEnd: 12,
            },
            zIndex: 1,
          },
          props: {
            classNames: {
              card: "h-full rounded-lg border border-neutral-200 bg-white p-5 shadow-sm",
              ...defaultToolClassNames.card,
            },
            title: "Grid-aware editing",
            description:
              "Every tool stores a real CSS grid-area, so responsive behavior stays predictable.",
            buttonLabel: "Inspect",
          },
        },
      ],
    },
  ],
});

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
  if (!sectionId) return page.sections[0];
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
      columnGap: 12,
      rowGap: 12,
    },
    layout: {
      height: 560,
    },
    responsive: {
      mobile: "auto-stack",
    },
    tools: [
      {
        id: `tool_section_${Date.now()}_text`,
        type: "text",
        name: "Section Heading",
        layout: {
          gridArea: {
            rowStart: 2,
            columnStart: 2,
            rowEnd: 4,
            columnEnd: 8,
          },
          zIndex: 1,
        },
        props: {
          className: "text-3xl font-semibold text-neutral-950",
          content: "New section",
        },
      },
    ],
  };
}

export function createTool(type: ToolNode["type"], section: SectionNode): ToolNode {
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
          classNames: {
            accordion:
              "h-full rounded-lg border border-neutral-200 bg-white p-4 text-neutral-950",
            ...defaultToolClassNames.accordion,
          },
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
    case "image":
      return {
        ...base,
        type,
        props: {
          className: "h-full w-full rounded-md object-cover",
          src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
          alt: "Workspace",
        },
      };
    case "button":
      return {
        ...base,
        type,
        props: {
          className:
            "h-full w-full rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white",
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
          classNames: {
            carousel: "h-full overflow-hidden rounded-lg bg-neutral-100",
            ...defaultToolClassNames.carousel,
          },
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
          orientation: "horizontal",
        },
      };
    case "card":
      return {
        ...base,
        type,
        props: {
          classNames: {
            card: "h-full rounded-lg border border-neutral-200 bg-white p-4",
            ...defaultToolClassNames.card,
          },
          title: "Card title",
          description: "Card description",
          buttonLabel: "Action",
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
          classNames: {
            contact:
              "h-full rounded-lg border border-neutral-200 bg-white p-4 text-neutral-950",
            ...defaultToolClassNames.contact,
          },
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
        props: { orientation: "horizontal" },
      };
    case "navbar":
      return {
        ...base,
        type,
        props: {
          brand: "Brand",
          classNames: defaultToolClassNames.navbar,
          items: [{ label: "Home", href: "#", active: true }],
          primaryAction: { label: "Start", href: "#" },
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
          classNames: {
            social: "flex h-full items-center gap-3 text-neutral-950",
            ...defaultToolClassNames.social,
          },
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
          classNames: {
            tabs: "h-full rounded-lg border border-neutral-200 bg-white p-4 text-neutral-950",
            ...defaultToolClassNames.tabs,
          },
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
          className: "text-lg font-medium text-neutral-950",
          content: "New text tool",
        },
      };
  }
}
