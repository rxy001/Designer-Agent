import assert from "node:assert/strict";
import test from "node:test";

import { filterPatchByTargetSection } from "../app/editor/filterPatchByTargetSection.ts";
import type { PagePatch, ToolNode } from "../app/editor/schema.ts";

test("keeps edits and new tools inside the selected Section", () => {
  const patch: PagePatch = [
    {
      op: "updateSection",
      sectionId: "hero",
      changes: { name: "Opening" },
    },
    {
      op: "updateTool",
      toolId: "headline",
      changes: { props: { content: "Revised" } },
    },
    { op: "removeTool", toolId: "summary" },
    { op: "addTool", sectionId: "hero", tool: createTool("cta") },
  ];

  assert.deepEqual(
    filterPatchByTargetSection(patch, {
      targetSectionId: "hero",
      targetSectionToolIds: new Set(["headline", "summary"]),
      existingToolIds: new Set(["headline", "summary", "footer-copy"]),
    }),
    patch,
  );
});

test("drops changes outside the selected Section", () => {
  const patch: PagePatch = [
    {
      op: "updateSection",
      sectionId: "footer",
      changes: { name: "Elsewhere" },
    },
    {
      op: "updateTool",
      toolId: "footer-copy",
      changes: { props: { content: "Elsewhere" } },
    },
    { op: "removeTool", toolId: "footer-copy" },
    { op: "addTool", sectionId: "footer", tool: createTool("new-footer") },
    {
      op: "addSection",
      section: createSection("testimonials"),
      afterSectionId: "hero",
    },
    { op: "removeSection", sectionId: "footer" },
  ];

  assert.deepEqual(
    filterPatchByTargetSection(patch, {
      targetSectionId: "hero",
      targetSectionToolIds: new Set(["headline"]),
      existingToolIds: new Set(["headline", "footer-copy"]),
    }),
    [],
  );
});

test("does not turn a move out of the selected Section into a deletion", () => {
  const patch: PagePatch = [
    { op: "removeTool", toolId: "headline" },
    { op: "addTool", sectionId: "footer", tool: createTool("headline") },
  ];

  assert.deepEqual(
    filterPatchByTargetSection(patch, {
      targetSectionId: "hero",
      targetSectionToolIds: new Set(["headline"]),
      existingToolIds: new Set(["headline"]),
    }),
    [],
  );
});

test("does not move an existing Tool into the selected Section", () => {
  const patch: PagePatch = [
    { op: "removeTool", toolId: "footer-copy" },
    { op: "addTool", sectionId: "hero", tool: createTool("footer-copy") },
  ];

  assert.deepEqual(
    filterPatchByTargetSection(patch, {
      targetSectionId: "hero",
      targetSectionToolIds: new Set(["headline"]),
      existingToolIds: new Set(["headline", "footer-copy"]),
    }),
    [],
  );
});

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

function createSection(id: string) {
  return {
    id,
    type: "section" as const,
    name: id,
    grid: {
      columns: 12,
      rows: 12,
      height: 720,
      columnGap: 12,
      rowGap: 12,
    },
    tools: [],
  };
}
