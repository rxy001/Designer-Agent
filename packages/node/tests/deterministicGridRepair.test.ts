import assert from "node:assert/strict";
import test from "node:test";

import {
  generateDeterministicGridCandidates,
  generateGridBoundsCandidates,
  getActiveGridArea,
  getActiveSectionGrid,
  isStrictlyBetterGridRepair,
  measureLayoutQuality,
} from "../app/deterministicGridRepair.ts";
import type { PageDocument } from "../app/editor/schema.ts";

function fixturePage(): PageDocument {
  return {
    id: "page",
    title: "Page",
    version: 1,
    viewport: "desktop",
    sections: [
      {
        id: "products",
        type: "section",
        name: "Products",
        grid: {
          columns: 4,
          rows: 8,
          height: 440,
          columnGap: 12,
          rowGap: 12,
          responsive: {
            tablet: { rows: 10, height: 560 },
            mobile: { rows: 12, height: 680 },
          },
        },
        tools: [
          {
            id: "card-a",
            type: "card",
            name: "Card A",
            props: {},
            layout: {
              gridArea: {
                rowStart: 1,
                rowEnd: 5,
                columnStart: 1,
                columnEnd: 3,
              },
              zIndex: 1,
            },
          },
          {
            id: "card-b",
            type: "card",
            name: "Card B",
            props: {},
            layout: {
              gridArea: {
                rowStart: 1,
                rowEnd: 5,
                columnStart: 3,
                columnEnd: 5,
              },
              zIndex: 1,
            },
          },
          {
            id: "title",
            type: "text",
            name: "Title",
            props: { content: "Next" },
            layout: {
              gridArea: {
                rowStart: 6,
                rowEnd: 7,
                columnStart: 1,
                columnEnd: 5,
              },
              zIndex: 1,
            },
          },
        ],
      },
    ],
  };
}

function overflowInspection(bottom = 80) {
  return {
    ok: false,
    blockingIssues: [
      {
        code: "layout_grid_area_containment",
        viewport: "desktop",
        gridAreaContainment: [
          {
            type: "tool",
            sectionId: "products",
            toolId: "card-a",
            overflow: { bottom },
            sectionGrid: {
              borderBoxHeight: 440,
              paddingTop: 32,
              paddingBottom: 32,
              trackSize: 36,
            },
          },
        ],
      },
    ],
  };
}

test("uses an existing empty track before changing Section geometry", () => {
  const candidates = generateDeterministicGridCandidates({
    page: fixturePage(),
    inspection: overflowInspection(20),
    viewports: ["desktop"],
  });
  assert.equal(candidates[0]?.kind, "expand-tool-span-in-place");
  assert.equal(candidates[0]?.page.sections[0]?.grid.height, 440);
  assert.equal(
    getActiveGridArea(candidates[0]!.page.sections[0]!.tools[0]!, "desktop")
      .rowEnd,
    6,
  );
});

test("ranks a coordinate-preserving height repair before an overlapping reflow", () => {
  const candidates = generateDeterministicGridCandidates({
    page: fixturePage(),
    inspection: overflowInspection(48),
    viewports: ["desktop"],
  });
  assert.equal(candidates[0]?.kind, "expand-section-height");
  assert.ok((candidates[0]?.page.sections[0]?.grid.height ?? 0) > 440);
  assert.equal(
    getActiveSectionGrid(candidates[0]!.page.sections[0]!, "tablet").height,
    560,
    "desktop repair protects the previously effective tablet height",
  );
});

test("reflows non-overlapping bands and preserves their gap", () => {
  const candidate = generateDeterministicGridCandidates({
    page: fixturePage(),
    inspection: overflowInspection(80),
    viewports: ["desktop"],
  }).find((item) => item.kind === "reflow-section-bands");
  assert.ok(candidate);
  const section = candidate.page.sections[0]!;
  const card = section.tools.find((tool) => tool.id === "card-a")!;
  const title = section.tools.find((tool) => tool.id === "title")!;
  assert.ok(getActiveGridArea(card, "desktop").rowEnd > 5);
  assert.ok(
    getActiveGridArea(title, "desktop").rowStart > 6,
    "the downstream band moves after the expanded card band",
  );
});

test("expands a Section for section-level bottom containment overflow", () => {
  const page = fixturePage();
  const candidate = generateDeterministicGridCandidates({
    page,
    inspection: {
      ok: false,
      blockingIssues: [
        {
          code: "layout_grid_area_containment",
          viewport: "desktop",
          gridAreaContainment: [
            {
              type: "section",
              issue: "section-grid-area-overflow",
              sectionId: "products",
              overflow: { bottom: 40 },
              sectionGrid: {
                borderBoxHeight: 440,
                paddingTop: 32,
                paddingBottom: 32,
                trackSize: 36,
              },
            },
          ],
        },
      ],
    },
    viewports: ["desktop"],
  }).find((item) => item.kind === "expand-section-height");

  assert.ok(candidate);
  assert.ok(candidate.page.sections[0]!.grid.height > 440);
  assert.deepEqual(
    candidate.changedToolIds,
    [],
    "section containment repair must not move individual Tools",
  );
  assert.equal(
    getActiveSectionGrid(candidate.page.sections[0]!, "tablet").height,
    560,
  );
});

test("minimally shifts statically out-of-bounds placements without changing span", () => {
  const page = fixturePage();
  page.sections[0]!.tools[2]!.layout.gridArea = {
    rowStart: 8,
    rowEnd: 11,
    columnStart: 1,
    columnEnd: 5,
  };
  const candidate = generateGridBoundsCandidates(page).find(
    (item) => item.kind === "shift-grid-bounds-in-place",
  );
  assert.ok(candidate);
  const originalArea = getActiveGridArea(page.sections[0]!.tools[2]!, "desktop");
  const repairedArea = getActiveGridArea(
    candidate.page.sections[0]!.tools[2]!,
    "desktop",
  );
  assert.deepEqual(repairedArea, { ...originalArea, rowStart: 6, rowEnd: 9 });
  assert.equal(
    repairedArea.rowEnd - repairedArea.rowStart,
    originalArea.rowEnd - originalArea.rowStart,
  );
  assert.equal(candidate.page.sections[0]!.grid.rows, 8);
  assert.equal(candidate.page.sections[0]!.grid.height, 440);
});

test("keeps explicit-row expansion as a span-preserving bounds fallback", () => {
  const page = fixturePage();
  page.sections[0]!.tools[2]!.layout.gridArea = {
    rowStart: 8,
    rowEnd: 11,
    columnStart: 1,
    columnEnd: 5,
  };
  const candidate = generateGridBoundsCandidates(page, ["desktop"]).find(
    (item) => item.kind === "repair-bounds",
  );
  assert.equal(candidate?.page.sections[0]?.grid.rows, 10);
  assert.deepEqual(
    getActiveGridArea(candidate!.page.sections[0]!.tools[2]!, "desktop"),
    getActiveGridArea(page.sections[0]!.tools[2]!, "desktop"),
  );
});

test("compacts only completely unused trailing Section rows", () => {
  const page = fixturePage();
  page.sections[0]!.tools[2]!.layout.gridArea = {
    rowStart: 1,
    rowEnd: 5,
    columnStart: 1,
    columnEnd: 5,
  };
  const originalAreas = page.sections[0]!.tools.map((tool) =>
    getActiveGridArea(tool, "desktop"),
  );
  const candidates = generateDeterministicGridCandidates({
    page,
    inspection: {
      ok: false,
      blockingIssues: [
        {
          code: "layout_element_issue",
          viewport: "desktop",
          element: {
            sectionId: "products",
            issues: ["section-excessive-unused-space"],
            metrics: {
              unusedBottom: 196,
              excessiveUnusedSpaceThreshold: 160,
            },
            sectionGrid: {
              borderBoxHeight: 440,
              paddingTop: 32,
              paddingBottom: 32,
              trackSize: 36,
            },
          },
        },
      ],
    },
    viewports: ["desktop"],
  });
  const candidate = candidates.find(
    (item) => item.kind === "compact-section-trailing-rows",
  );
  assert.ok(candidate);
  const repairedSection = candidate.page.sections[0]!;
  assert.equal(getActiveSectionGrid(repairedSection, "desktop").rows, 4);
  assert.equal(getActiveSectionGrid(repairedSection, "desktop").height, 244);
  assert.deepEqual(
    repairedSection.tools.map((tool) => getActiveGridArea(tool, "desktop")),
    originalAreas,
  );
  assert.deepEqual(candidate.changedToolIds, []);
});

test("does not compact intentional full-screen Section space", () => {
  const page = fixturePage();
  page.sections[0]!.props = { className: "min-h-screen bg-black" };
  page.sections[0]!.tools[2]!.layout.gridArea = {
    rowStart: 1,
    rowEnd: 5,
    columnStart: 1,
    columnEnd: 5,
  };
  const candidates = generateDeterministicGridCandidates({
    page,
    inspection: {
      ok: false,
      blockingIssues: [
        {
          code: "layout_element_issue",
          viewport: "desktop",
          element: {
            sectionId: "products",
            issues: ["section-excessive-unused-space"],
            metrics: {
              unusedBottom: 300,
              excessiveUnusedSpaceThreshold: 160,
            },
            sectionGrid: { borderBoxHeight: 640, trackSize: 60 },
          },
        },
      ],
    },
    viewports: ["desktop"],
  });
  assert.equal(
    candidates.some(
      (candidate) => candidate.kind === "compact-section-trailing-rows",
    ),
    false,
  );
});

test("accepts only repairs with no new facts and a strict quality improvement", () => {
  const baseline = measureLayoutQuality(overflowInspection(80));
  const improved = measureLayoutQuality(overflowInspection(20));
  assert.equal(isStrictlyBetterGridRepair(baseline, improved), true);

  const regression = measureLayoutQuality({
    ok: false,
    blockingIssues: [
      ...overflowInspection(20).blockingIssues,
      {
        code: "layout_unintended_overlap",
        viewport: "tablet",
        overlaps: [{ area: 200, sectionId: "products", toolId: "title" }],
      },
    ],
  });
  assert.equal(isStrictlyBetterGridRepair(baseline, regression), false);
});

test("property: bounds repair always contains every generated placement", () => {
  let seed = 0x5eed;
  const random = () => {
    seed = (seed * 16_807) % 2_147_483_647;
    return seed / 2_147_483_647;
  };

  for (let iteration = 0; iteration < 50; iteration += 1) {
    const page = fixturePage();
    const section = page.sections[0]!;
    section.grid.rows = 4 + Math.floor(random() * 8);
    for (const tool of section.tools) {
      const rowStart = 1 + Math.floor(random() * 14);
      const span = 1 + Math.floor(random() * 5);
      tool.layout.gridArea = {
        ...tool.layout.gridArea,
        rowStart,
        rowEnd: rowStart + span,
      };
    }

    const repaired =
      generateGridBoundsCandidates(page, ["desktop"]).find(
        (candidate) => candidate.kind === "repair-bounds",
      )?.page ?? page;
    const repairedSection = repaired.sections[0]!;
    const maximumRowEnd = Math.max(
      ...repairedSection.tools.map(
        (tool) => getActiveGridArea(tool, "desktop").rowEnd,
      ),
    );
    assert.ok(maximumRowEnd <= repairedSection.grid.rows + 1);
  }
});
