import assert from "node:assert/strict";
import test from "node:test";

import { resolveEditorRequestTarget } from "../app/editor/resolveEditorRequestTarget.ts";
import type { PageDocument } from "../app/editor/schema.ts";

test("treats an empty Page as Create regardless of stale selection", () => {
  assert.deepEqual(
    resolveEditorRequestTarget({
      page: createPage([]),
      selectedToolId: "stale-tool",
      selectedSectionId: "stale-section",
    }),
    { operation: "create" },
  );
});

test("uses Tool, Section, then Page selection precedence for modifications", () => {
  const page = createPage(["hero"]);

  assert.deepEqual(
    resolveEditorRequestTarget({
      page,
      selectedToolId: "headline",
      selectedSectionId: "hero",
    }),
    { operation: "modify", targetToolId: "headline" },
  );
  assert.deepEqual(
    resolveEditorRequestTarget({ page, selectedSectionId: "hero" }),
    { operation: "modify", targetSectionId: "hero" },
  );
  assert.deepEqual(resolveEditorRequestTarget({ page }), {
    operation: "modify",
  });
});

function createPage(sectionIds: string[]): PageDocument {
  return {
    id: "page",
    title: "Page",
    version: 1,
    viewport: "desktop",
    sections: sectionIds.map((id) => ({
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
      tools: [],
    })),
  };
}
