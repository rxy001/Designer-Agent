import assert from "node:assert/strict";
import test from "node:test";

import { applyDeliveryPatch } from "../app/editor/applyDeliveryPatch.ts";
import type {
  PageDocument,
  PagePatch,
  SectionNode,
  ToolNode,
} from "../app/editor/schema.ts";

const reactPatchModulePath = "../../react/src/editor/pagePatch.ts";
const { applyPagePatch } = (await import(reactPatchModulePath)) as {
  applyPagePatch: (page: PageDocument, patch: PagePatch) => PageDocument;
};

test("Node delivery and React editor apply the same valid Patch", () => {
  const page = createPage();
  const patch: PagePatch = [
    {
      op: "updateSection",
      sectionId: "hero",
      changes: {
        grid: {
          columns: 12,
          rows: 8,
          height: 720,
          columnGap: 12,
          rowGap: 12,
        },
      },
    },
    {
      op: "updateTool",
      toolId: "headline",
      changes: {
        props: { content: "Revised" },
        layout: {
          gridArea: {
            rowStart: 1,
            rowEnd: 3,
            columnStart: 1,
            columnEnd: 7,
          },
          zIndex: 1,
        },
      },
    },
    { op: "addTool", sectionId: "hero", tool: createTool("summary") },
    {
      op: "addSection",
      section: createSection("footer", []),
      afterSectionId: "hero",
    },
  ];

  const nodeResult = applyDeliveryPatch(page, patch);
  const reactResult = applyPagePatch(page, patch);

  assert.deepEqual(
    { ...reactResult, version: nodeResult.version },
    nodeResult,
  );
});

test("Node delivery and React editor both reject missing targets", () => {
  const page = createPage();
  const invalidPatches: PagePatch[] = [
    [{ op: "updateTool", toolId: "missing", changes: { name: "Missing" } }],
    [{ op: "removeTool", toolId: "missing" }],
    [{ op: "addTool", sectionId: "missing", tool: createTool("new") }],
    [{ op: "updateSection", sectionId: "missing", changes: { name: "Missing" } }],
    [{ op: "removeSection", sectionId: "missing" }],
    [
      {
        op: "addSection",
        section: createSection("footer", []),
        afterSectionId: "missing",
      },
    ],
  ];

  for (const patch of invalidPatches) {
    assert.throws(() => applyDeliveryPatch(page, patch));
    assert.throws(() => applyPagePatch(page, patch));
  }
});

function createPage(): PageDocument {
  return {
    id: "page",
    title: "Page",
    version: 1,
    viewport: "desktop",
    sections: [createSection("hero", [createTool("headline")])],
  };
}

function createSection(id: string, tools: ToolNode[]): SectionNode {
  return {
    id,
    type: "section",
    name: id,
    grid: {
      columns: 12,
      rows: 12,
      height: 720,
      columnGap: 12,
      rowGap: 12,
    },
    tools,
  };
}

function createTool(id: string): ToolNode {
  return {
    id,
    type: "text",
    name: id,
    layout: {
      gridArea: {
        rowStart: 1,
        rowEnd: 2,
        columnStart: 1,
        columnEnd: 7,
      },
      zIndex: 1,
    },
    props: { content: id },
  };
}
