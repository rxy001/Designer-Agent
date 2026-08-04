import assert from "node:assert/strict";
import test from "node:test";

import { diffPageDocuments } from "../app/editor/diffPageDocuments.ts";
import {
  analyzeModification,
  diffPropertyPaths,
} from "../app/editor/modificationPolicy.ts";
import type {
  PageDocument,
  SectionNode,
  ToolNode,
} from "../app/editor/schema.ts";

test("classifies one whitelisted Text content change as direct", () => {
  const previousPage = createPage();
  const nextPage = structuredClone(previousPage);
  nextPage.sections[0]!.tools[0]!.props.content = "Revised copy";
  const patch = diffPageDocuments(previousPage, nextPage);

  assert.deepEqual(
    analyzeModification({
      operation: "modify",
      previousPage,
      nextPage,
      patch,
      targetToolId: "headline",
    }),
    {
      kind: "direct",
      affectedSectionIds: ["hero"],
      affectedToolIds: ["headline"],
      changedPropPaths: ["content"],
      requiresIndependentReview: false,
    },
  );
});

test("does not classify style and content changes as direct", () => {
  const previousPage = createPage();
  const nextPage = structuredClone(previousPage);
  nextPage.sections[0]!.tools[0]!.props = {
    content: "Revised copy",
    className: "text-4xl",
  };
  const patch = diffPageDocuments(previousPage, nextPage);

  assert.equal(
    analyzeModification({
      operation: "modify",
      previousPage,
      nextPage,
      patch,
      targetToolId: "headline",
    }).kind,
    "local",
  );
});

test("classifies a Section grid change as local", () => {
  const previousPage = createPage();
  const nextPage = structuredClone(previousPage);
  nextPage.sections[0]!.grid.rows = 14;
  const patch = diffPageDocuments(previousPage, nextPage);

  assert.equal(
    analyzeModification({
      operation: "modify",
      previousPage,
      nextPage,
      patch,
    }).kind,
    "local",
  );
});

test("classifies an added Section as a composition modification", () => {
  const previousPage = createPage();
  const nextPage = structuredClone(previousPage);
  nextPage.sections.push(createSection("testimonials", []));
  const patch = diffPageDocuments(previousPage, nextPage);
  const analysis = analyzeModification({
    operation: "modify",
    previousPage,
    nextPage,
    patch,
  });

  assert.deepEqual(patch.map((operation) => operation.op), ["addSection"]);
  assert.equal(analysis.kind, "composition");
  assert.equal(analysis.requiresIndependentReview, true);
});

test("classifies updates spanning two Sections as composition", () => {
  const previousPage = createPage();
  previousPage.sections.push(
    createSection("details", [createTextTool("details-copy", "Details")]),
  );
  const nextPage = structuredClone(previousPage);
  nextPage.sections[0]!.tools[0]!.props.content = "New hero";
  nextPage.sections[1]!.tools[0]!.props.content = "New details";
  const patch = diffPageDocuments(previousPage, nextPage);

  assert.equal(
    analyzeModification({
      operation: "modify",
      previousPage,
      nextPage,
      patch,
    }).kind,
    "composition",
  );
});

test("reports nested changed property paths", () => {
  assert.deepEqual(
    diffPropertyPaths(
      { content: "Old", classNames: { text: "text-lg", root: "p-4" } },
      { content: "New", classNames: { text: "text-xl", root: "p-4" } },
    ),
    ["classNames.text", "content"],
  );
});

function createPage(): PageDocument {
  return {
    id: "page",
    title: "Page",
    version: 1,
    viewport: "desktop",
    sections: [createSection("hero", [createTextTool("headline", "Old copy")])],
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

function createTextTool(id: string, content: string): ToolNode {
  return {
    id,
    type: "text",
    name: id,
    layout: {
      gridArea: {
        rowStart: 1,
        rowEnd: 3,
        columnStart: 1,
        columnEnd: 7,
      },
      zIndex: 1,
    },
    props: { content },
  };
}
