import assert from "node:assert/strict";
import test from "node:test";

import { jsxToPageDocument } from "../app/editor/jsxToPageDocument.ts";
import { applyDeliveryPatch } from "../app/editor/applyDeliveryPatch.ts";
import { diffPageDocuments } from "../app/editor/diffPageDocuments.ts";
import { filterPatchByTargetTool } from "../app/editor/filterPatchByTargetTool.ts";
import { arePageDocumentsSemanticallyEqual } from "../app/editor/pageDocumentSemanticEquality.ts";
import { pageDocumentToJsx } from "../app/editor/pageDocumentToJsx.ts";
import {
  toContainerClassName,
  toViewportClassName,
} from "../app/editor/responsiveClassNames.ts";
import type { PageDocument } from "../app/editor/schema.ts";

test("serializes multiline string props as JSX expressions", () => {
  const page: PageDocument = {
    id: "page-1",
    title: "Test Page",
    version: 1,
    viewport: "desktop",
    sections: [
      {
        id: "section-1",
        type: "section",
        name: "Section 1",
        grid: {
          columns: 4,
          rows: 4,
          height: 400,
          columnGap: 16,
          rowGap: 16,
        },
        tools: [
          {
            id: "text-1",
            type: "text",
            name: "Text",
            layout: {
              gridArea: {
                rowStart: 1,
                rowEnd: 3,
                columnStart: 1,
                columnEnd: 3,
              },
              zIndex: 1,
            },
            props: {
              content: "客服｜400-800-2024\n订单追踪\n保养与护理说明",
              className: "whitespace-pre-wrap text-sm",
            },
          },
        ],
      },
    ],
  };

  const jsx = pageDocumentToJsx(page);

  assert.match(
    jsx,
    /content=\{"客服｜400-800-2024\\n订单追踪\\n保养与护理说明"\}/,
  );

  const parsed = jsxToPageDocument(jsx, { previousPage: page });
  assert.equal(
    parsed.sections[0]?.tools[0]?.props.content,
    "客服｜400-800-2024\n订单追踪\n保养与护理说明",
  );
});

test("uses configured viewport values for editor container queries", () => {
  const viewportClasses =
    "flex max-sm:hidden sm:max-lg:grid md:hover:block lg:flex xl:grid 2xl:block";
  const containerClasses = toContainerClassName(viewportClasses);

  assert.equal(
    containerClasses,
    "flex @max-[640px]:hidden @min-[640px]:@max-[1024px]:grid @min-[768px]:hover:block @min-[1024px]:flex @min-[1280px]:grid @min-[1536px]:block",
  );
  assert.equal(toViewportClassName(containerClasses), viewportClasses);
});

test("parses arbitrary numeric responsive grid utilities", () => {
  const page: PageDocument = {
    id: "page-grid",
    title: "Grid",
    version: 1,
    viewport: "desktop",
    sections: [
      {
        id: "section-grid",
        type: "section",
        name: "Grid",
        grid: {
          columns: 4,
          rows: 8,
          height: 480,
          columnGap: 12,
          rowGap: 12,
          responsive: { tablet: { rows: 14, height: 720 } },
        },
        tools: [
          {
            id: "card-grid",
            type: "card",
            name: "Card",
            props: { title: "Card" },
            layout: {
              gridArea: { rowStart: 1, rowEnd: 3, columnStart: 1, columnEnd: 5 },
              zIndex: 1,
              responsive: {
                tablet: {
                  gridArea: { rowStart: 9, rowEnd: 15, columnStart: 1, columnEnd: 5 },
                },
              },
            },
          },
        ],
      },
    ],
  };
  const jsx = pageDocumentToJsx(page).replace(
    "sm:max-lg:row-end-15",
    "sm:max-lg:row-end-[15]",
  );
  const parsed = jsxToPageDocument(jsx, { previousPage: page });
  assert.deepEqual(parsed.sections[0]?.tools[0]?.layout.responsive?.tablet?.gridArea, {
    rowStart: 9,
    rowEnd: 15,
    columnStart: 1,
    columnEnd: 5,
  });
});

test("round-trips the foundational content tools", () => {
  const toolTypes = [
    "input",
    "badge",
    "avatar",
    "list",
    "newsletter",
    "icon",
    "button",
    "card",
  ] as const;
  const propsByType = {
    input: {
      label: "Work email",
      type: "email",
      classNames: { input: "space-y-2", "input-control": "border" },
    },
    badge: { label: "New", href: "/updates", className: "rounded-full" },
    avatar: {
      src: "/avatar.jpg",
      alt: "Jane Doe",
      classNames: { avatar: "h-12 w-12" },
    },
    list: {
      marker: "check",
      items: [
        { key: "fast", title: "Fast setup", description: "Start quickly." },
      ],
      classNames: { list: "space-y-3" },
    },
    newsletter: {
      title: "Stay informed",
      method: "post",
      classNames: { newsletter: "rounded-lg", "newsletter-form": "flex" },
    },
    icon: {
      name: "ShieldCheck",
      size: 28,
      strokeWidth: 1.5,
      ariaLabel: "Verified security",
      className: "text-emerald-600",
    },
    button: {
      label: "Download",
      startIcon: "Download",
      endIcon: "ArrowRight",
      classNames: {
        "start-icon": "size-4",
        "end-icon": "size-3",
      },
      href: "/guide.pdf",
      target: "_blank",
      download: "guide.pdf",
      ariaLabel: "Download the guide",
    },
    card: {
      title: "Guide",
      buttonLabel: "Read guide",
      buttonHref: "/guide",
      classNames: { card: "rounded-lg", "card-action": "font-medium" },
    },
  };
  const page: PageDocument = {
    id: "page-content-tools",
    title: "Content tools",
    version: 1,
    viewport: "desktop",
    sections: [
      {
        id: "section-content-tools",
        type: "section",
        name: "Content tools",
        grid: {
          columns: 12,
          rows: 10,
          height: 720,
          columnGap: 12,
          rowGap: 12,
        },
        tools: toolTypes.map((type, index) => ({
          id: `tool-${type}`,
          type,
          name: type,
          layout: {
            gridArea: {
              rowStart: index + 1,
              rowEnd: index + 2,
              columnStart: 1,
              columnEnd: 5,
            },
            zIndex: index + 1,
          },
          props: propsByType[type],
        })),
      },
    ],
  };

  const jsx = pageDocumentToJsx(page);
  const parsed = jsxToPageDocument(jsx, { previousPage: page });

  assert.deepEqual(
    parsed.sections[0]?.tools.map((tool) => tool.type),
    toolTypes,
  );
  assert.equal(parsed.sections[0]?.tools[0]?.props.label, "Work email");
  assert.equal(parsed.sections[0]?.tools[1]?.props.href, "/updates");
  assert.equal(parsed.sections[0]?.tools[2]?.props.alt, "Jane Doe");
  assert.deepEqual(
    parsed.sections[0]?.tools[3]?.props.items,
    propsByType.list.items,
  );
  assert.equal(parsed.sections[0]?.tools[4]?.props.title, "Stay informed");
  assert.equal(parsed.sections[0]?.tools[5]?.props.name, "ShieldCheck");
  assert.equal(parsed.sections[0]?.tools[5]?.props.strokeWidth, 1.5);
  assert.equal(parsed.sections[0]?.tools[6]?.props.download, "guide.pdf");
  assert.equal(parsed.sections[0]?.tools[6]?.props.target, "_blank");
  assert.equal(parsed.sections[0]?.tools[6]?.props.startIcon, "Download");
  assert.equal(
    (parsed.sections[0]?.tools[6]?.props.classNames as Record<string, unknown>)[
      "end-icon"
    ],
    "size-3",
  );
  assert.equal(parsed.sections[0]?.tools[7]?.props.buttonHref, "/guide");
});

test("round-trips a scoped Newsletter edit with canonical shared-shell metadata", () => {
  const page: PageDocument = {
    id: "home",
    title: "Home",
    version: 1,
    viewport: "desktop",
    sections: [
      {
        id: "site-header",
        type: "section",
        name: "Header",
        props: { className: "px-6 max-sm:px-4" },
        grid: {
          columns: 12,
          rows: 1,
          height: 80,
          columnGap: 12,
          rowGap: 12,
        },
        tools: [
          {
            id: "site-navbar",
            type: "navbar",
            name: "Navbar",
            siteBinding: { kind: "site-navigation" },
            layout: {
              gridArea: {
                rowStart: 1,
                rowEnd: 2,
                columnStart: 1,
                columnEnd: 13,
              },
              zIndex: 1,
            },
            props: {
              brand: "Muse",
              classNames: {
                navbar: "w-full",
                "navbar-inner": "px-6 max-sm:px-4",
              },
            },
          },
        ],
      },
      {
        id: "newsletter-section",
        type: "section",
        name: "Newsletter",
        grid: {
          columns: 12,
          rows: 5,
          height: 330,
          columnGap: 12,
          rowGap: 12,
        },
        tools: [
          {
            id: "newsletter",
            type: "newsletter",
            name: "Newsletter",
            layout: {
              gridArea: {
                rowStart: 1,
                rowEnd: 6,
                columnStart: 1,
                columnEnd: 13,
              },
              zIndex: 1,
            },
            props: {
              title: "Original title",
              classNames: {
                newsletter: "self-center",
                "newsletter-title": "text-4xl max-sm:text-3xl",
              },
            },
          },
        ],
      },
    ],
  };
  const candidateSource = pageDocumentToJsx(page).replace(
    'title="Original title"',
    'title="Updated title"',
  );
  const candidatePage = jsxToPageDocument(candidateSource, {
    previousPage: page,
  });
  const patch = filterPatchByTargetTool(
    diffPageDocuments(page, candidatePage),
    {
      targetToolId: "newsletter",
      targetSectionId: "newsletter-section",
      targetSectionToolIds: new Set(["newsletter"]),
    },
  );

  assert.deepEqual(
    patch.map((operation) =>
      operation.op === "updateTool" ? operation.toolId : operation.op,
    ),
    ["newsletter"],
  );

  const deliveredPage = applyDeliveryPatch(page, patch);
  const roundTrippedPage = jsxToPageDocument(
    pageDocumentToJsx(deliveredPage),
    { previousPage: deliveredPage },
  );
  const navbar = roundTrippedPage.sections[0]?.tools[0];

  assert.deepEqual(navbar?.siteBinding, { kind: "site-navigation" });
  assert.equal(
    roundTrippedPage.sections[1]?.tools[0]?.props.title,
    "Updated title",
  );
  assert.equal(
    arePageDocumentsSemanticallyEqual(deliveredPage, roundTrippedPage),
    true,
  );
});
