import assert from "node:assert/strict";
import test from "node:test";

import { filterPatchByTargetTool } from "../app/editor/filterPatchByTargetTool.ts";
import type { PagePatch, ToolNode } from "../app/editor/schema.ts";

const options = {
  targetToolId: "headline",
  targetSectionId: "hero",
  targetSectionToolIds: new Set(["headline", "summary"]),
};

test("keeps only the selected Tool and containing Section updates", () => {
  const patch: PagePatch = [
    { op: "updateTool", toolId: "headline", changes: { name: "Title" } },
    { op: "updateTool", toolId: "summary", changes: { name: "Summary" } },
    { op: "updateSection", sectionId: "hero", changes: { name: "Hero" } },
  ];

  assert.deepEqual(filterPatchByTargetTool(patch, options), [patch[0], patch[2]]);
});

test("drops Tool additions and sibling removals", () => {
  const patch: PagePatch = [
    { op: "addTool", sectionId: "hero", tool: createTool("cta") },
    { op: "removeTool", toolId: "summary" },
  ];

  assert.deepEqual(filterPatchByTargetTool(patch, options), []);
});

test("does not turn a cross-Section move into a deletion", () => {
  const patch: PagePatch = [
    { op: "removeTool", toolId: "headline" },
    { op: "addTool", sectionId: "footer", tool: createTool("headline") },
    {
      op: "updateSection",
      sectionId: "footer",
      changes: { name: "Destination" },
    },
  ];

  assert.deepEqual(filterPatchByTargetTool(patch, options), []);
});

test("allows deleting the selected Tool", () => {
  const patch: PagePatch = [{ op: "removeTool", toolId: "headline" }];

  assert.deepEqual(filterPatchByTargetTool(patch, options), patch);
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
