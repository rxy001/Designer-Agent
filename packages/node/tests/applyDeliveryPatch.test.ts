import assert from "node:assert/strict";
import test from "node:test";

import { applyDeliveryPatch } from "../app/editor/applyDeliveryPatch.ts";
import type { PageDocument, SectionNode } from "../app/editor/schema.ts";

test("adds a Section after the requested existing Section", () => {
  const page = createPage([createSection("hero"), createSection("footer")]);
  const testimonials = createSection("testimonials");

  const nextPage = applyDeliveryPatch(page, [
    {
      op: "addSection",
      section: testimonials,
      afterSectionId: "hero",
    },
  ]);

  assert.deepEqual(
    nextPage.sections.map((section) => section.id),
    ["hero", "testimonials", "footer"],
  );
});

test("appends a Section when afterSectionId is omitted", () => {
  const page = createPage([createSection("hero")]);
  const nextPage = applyDeliveryPatch(page, [
    { op: "addSection", section: createSection("footer") },
  ]);

  assert.deepEqual(
    nextPage.sections.map((section) => section.id),
    ["hero", "footer"],
  );
});

test("removes an existing Section and rejects missing Section targets", () => {
  const page = createPage([createSection("hero"), createSection("footer")]);
  const nextPage = applyDeliveryPatch(page, [
    { op: "removeSection", sectionId: "footer" },
  ]);

  assert.deepEqual(nextPage.sections.map((section) => section.id), ["hero"]);
  assert.throws(
    () =>
      applyDeliveryPatch(nextPage, [
        { op: "removeSection", sectionId: "missing" },
      ]),
    /was not found/,
  );
});

function createPage(sections: SectionNode[]): PageDocument {
  return {
    id: "page",
    title: "Page",
    version: 1,
    viewport: "desktop",
    sections,
  };
}

function createSection(id: string): SectionNode {
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
    tools: [],
  };
}
