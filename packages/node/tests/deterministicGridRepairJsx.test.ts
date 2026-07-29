import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  generateGridBoundsCandidates,
  getActiveGridArea,
  getActiveSectionGrid,
  type DeterministicGridCandidate,
  type DeterministicGridInspection,
  type GridRepairViewport,
} from "../app/deterministicGridRepair.ts";
import { runDeterministicGridRepairCycle } from "../app/deterministicGridRepairRuntime.ts";
import { jsxToPageDocument } from "../app/editor/jsxToPageDocument.ts";
import { pageDocumentToJsx } from "../app/editor/pageDocumentToJsx.ts";
import type { PageDocument } from "../app/editor/schema.ts";

function fixturePage(): PageDocument {
  return {
    id: "page",
    title: "Repair fixture",
    version: 1,
    viewport: "desktop",
    sections: [
      {
        id: "products",
        type: "section",
        name: "Products",
        props: { className: "bg-white px-8" },
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
            props: { title: "Preserved card", description: "Material details" },
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
            props: { title: "Second card" },
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
            id: "copy",
            type: "text",
            name: "Copy",
            props: {
              content: "客服｜400-800-2024\n订单追踪",
              className: "whitespace-pre-wrap",
            },
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

function toolContainmentInspection(
  viewport: GridRepairViewport = "desktop",
  bottom = 80,
): DeterministicGridInspection {
  return {
    ok: false,
    blockingIssues: [
      {
        code: "layout_grid_area_containment",
        viewport,
        gridAreaContainment: [
          {
            type: "tool",
            sectionId: "products",
            toolId: "card-a",
            overflow: { bottom },
            sectionGrid: {
              borderBoxHeight:
                viewport === "desktop" ? 440 : viewport === "tablet" ? 560 : 680,
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

function sectionContainmentInspection(bottom = 40): DeterministicGridInspection {
  return {
    ok: false,
    blockingIssues: [
      {
        code: "layout_grid_area_containment",
        viewport: "desktop",
        gridAreaContainment: [
          {
            type: "section",
            sectionId: "products",
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

type JsxCycleResult = Awaited<
  ReturnType<typeof runDeterministicGridRepairCycle<DeterministicGridInspection>>
>;

async function runRealJsxCycle({
  page,
  baselineInspection,
  viewports,
  maxCandidates = 3,
  verify,
}: {
  page: PageDocument;
  baselineInspection: DeterministicGridInspection;
  viewports: readonly GridRepairViewport[];
  maxCandidates?: number;
  verify: (
    candidate: DeterministicGridCandidate,
    parsedCandidate: PageDocument,
  ) => Promise<DeterministicGridInspection> | DeterministicGridInspection;
}) {
  const directory = await mkdtemp(join(tmpdir(), "grid-repair-matrix-"));
  const artifactPath = join(directory, "artifact.jsx");
  const originalSource = pageDocumentToJsx(page);
  await writeFile(artifactPath, originalSource, "utf8");
  let restored = false;

  try {
    const parsedBaseline = jsxToPageDocument(
      await readFile(artifactPath, "utf8"),
      { previousPage: page },
    );
    const candidateSources = new Map<string, string>();
    const result: JsxCycleResult = await runDeterministicGridRepairCycle({
      page: parsedBaseline,
      baselineInspection,
      viewports,
      maxCandidates,
      verifyCandidate: async (candidate) => {
        const candidateSource = pageDocumentToJsx(candidate.page);
        candidateSources.set(candidate.id, candidateSource);
        await writeFile(artifactPath, candidateSource, "utf8");
        const parsedCandidate = jsxToPageDocument(
          await readFile(artifactPath, "utf8"),
          { previousPage: page },
        );
        return verify(candidate, parsedCandidate);
      },
      commitCandidate: async ({ candidate }) => {
        await writeFile(
          artifactPath,
          candidateSources.get(candidate.id) ?? pageDocumentToJsx(candidate.page),
          "utf8",
        );
      },
      restoreBaseline: async () => {
        restored = true;
        await writeFile(artifactPath, originalSource, "utf8");
      },
    });
    const committedSource = await readFile(artifactPath, "utf8");
    const committedPage = jsxToPageDocument(committedSource, {
      previousPage: page,
    });
    return { result, restored, originalSource, committedSource, committedPage };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function assertFixtureContentPreserved(page: PageDocument) {
  const section = page.sections[0]!;
  assert.equal(section.props?.className, "bg-white px-8");
  assert.equal(
    section.tools.find((tool) => tool.id === "card-a")?.props.title,
    "Preserved card",
  );
  assert.equal(
    section.tools.find((tool) => tool.id === "copy")?.props.content,
    "客服｜400-800-2024\n订单追踪",
  );
}

test("real JSX: minimally shifts static row bounds and preserves span", async () => {
  const page = fixturePage();
  page.sections[0]!.tools[2]!.layout.gridArea = {
    rowStart: 9,
    rowEnd: 12,
    columnStart: 1,
    columnEnd: 5,
  };
  const directory = await mkdtemp(join(tmpdir(), "grid-bounds-jsx-"));
  const artifactPath = join(directory, "artifact.jsx");

  try {
    await writeFile(artifactPath, pageDocumentToJsx(page), "utf8");
    const parsed = jsxToPageDocument(await readFile(artifactPath, "utf8"), {
      previousPage: page,
    });
    const candidate = generateGridBoundsCandidates(parsed, ["desktop"]).find(
      (item) => item.kind === "shift-grid-bounds-in-place",
    );
    assert.ok(candidate);
    await writeFile(artifactPath, pageDocumentToJsx(candidate.page), "utf8");
    const repaired = jsxToPageDocument(await readFile(artifactPath, "utf8"), {
      previousPage: page,
    });

    assert.equal(getActiveSectionGrid(repaired.sections[0]!, "desktop").rows, 8);
    assert.deepEqual(
      getActiveGridArea(repaired.sections[0]!.tools[2]!, "desktop"),
      {
        rowStart: 6,
        rowEnd: 9,
        columnStart: 1,
        columnEnd: 5,
      },
    );
    assert.equal(getActiveSectionGrid(repaired.sections[0]!, "tablet").rows, 10);
    assert.equal(getActiveSectionGrid(repaired.sections[0]!, "mobile").rows, 12);
    assertFixtureContentPreserved(repaired);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("real JSX: expands a Tool from element scroll metrics", async () => {
  const baseline: DeterministicGridInspection = {
    ok: false,
    blockingIssues: [
      {
        code: "layout_element_issue",
        viewport: "desktop",
        element: {
          sectionId: "products",
          toolId: "card-a",
          issues: ["text-overflow-y", "clipped-content-y"],
          metrics: { scrollHeight: 180, clientHeight: 120 },
          sectionGrid: { borderBoxHeight: 440, trackSize: 36 },
        },
      },
    ],
  };
  const cycle = await runRealJsxCycle({
    page: fixturePage(),
    baselineInspection: baseline,
    viewports: ["desktop"],
    verify: () => ({ ok: true, blockingIssues: [] }),
  });

  assert.equal(cycle.result.status, "repaired");
  assert.ok(cycle.committedPage.sections[0]!.grid.height > 440);
  assertFixtureContentPreserved(cycle.committedPage);
});

test("real JSX: expands a Section-level containment overflow", async () => {
  const cycle = await runRealJsxCycle({
    page: fixturePage(),
    baselineInspection: sectionContainmentInspection(),
    viewports: ["desktop"],
    verify: () => ({ ok: true, blockingIssues: [] }),
  });

  assert.equal(cycle.result.status, "repaired");
  assert.equal(cycle.result.candidate.kind, "expand-section-height");
  assert.deepEqual(cycle.result.candidate.changedToolIds, []);
  assert.ok(cycle.committedPage.sections[0]!.grid.height > 440);
  assertFixtureContentPreserved(cycle.committedPage);
});

test("real JSX: commits reflow when it verifies better than height expansion", async () => {
  const cycle = await runRealJsxCycle({
    page: fixturePage(),
    baselineInspection: toolContainmentInspection("desktop", 80),
    viewports: ["desktop"],
    verify: (candidate) =>
      candidate.kind === "reflow-section-bands"
        ? { ok: true, blockingIssues: [] }
        : toolContainmentInspection("desktop", 20),
  });

  assert.equal(cycle.result.status, "repaired");
  assert.equal(cycle.result.candidate.kind, "reflow-section-bands");
  const section = cycle.committedPage.sections[0]!;
  const card = section.tools.find((tool) => tool.id === "card-a")!;
  const copy = section.tools.find((tool) => tool.id === "copy")!;
  assert.ok(getActiveGridArea(card, "desktop").rowEnd > 5);
  assert.ok(getActiveGridArea(copy, "desktop").rowStart > 6);
  assertFixtureContentPreserved(cycle.committedPage);
});

test("real JSX: isolates a tablet repair from desktop and mobile", async () => {
  const cycle = await runRealJsxCycle({
    page: fixturePage(),
    baselineInspection: toolContainmentInspection("tablet", 40),
    viewports: ["tablet"],
    verify: () => ({ ok: true, blockingIssues: [] }),
  });

  assert.equal(cycle.result.status, "repaired");
  const section = cycle.committedPage.sections[0]!;
  const card = section.tools.find((tool) => tool.id === "card-a")!;
  assert.equal(getActiveSectionGrid(section, "desktop").height, 440);
  assert.deepEqual(getActiveGridArea(card, "desktop"), {
    rowStart: 1,
    rowEnd: 5,
    columnStart: 1,
    columnEnd: 3,
  });
  assert.ok(
    getActiveSectionGrid(section, "tablet").height > 560 ||
      getActiveGridArea(card, "tablet").rowEnd > 5,
  );
  assert.equal(getActiveSectionGrid(section, "mobile").height, 680);
  assert.deepEqual(getActiveGridArea(card, "mobile"), {
    rowStart: 1,
    rowEnd: 5,
    columnStart: 1,
    columnEnd: 3,
  });
  assertFixtureContentPreserved(cycle.committedPage);
});

test("real JSX: restores the exact source when every candidate regresses", async () => {
  const regression: DeterministicGridInspection = {
    ok: false,
    blockingIssues: [
      ...toolContainmentInspection("desktop", 20).blockingIssues,
      {
        code: "layout_unintended_overlap",
        viewport: "desktop",
        overlaps: [
          {
            area: 300,
            aSectionId: "products",
            aToolId: "card-a",
            bSectionId: "products",
            bToolId: "copy",
          },
        ],
      },
    ],
  };
  const cycle = await runRealJsxCycle({
    page: fixturePage(),
    baselineInspection: toolContainmentInspection("desktop", 80),
    viewports: ["desktop"],
    verify: () => regression,
  });

  assert.equal(cycle.result.status, "no_improvement");
  assert.equal(cycle.restored, true);
  assert.equal(cycle.committedSource, cycle.originalSource);
});

test("real JSX: leaves the file untouched when the issue is not applicable", async () => {
  const cycle = await runRealJsxCycle({
    page: fixturePage(),
    baselineInspection: {
      ok: false,
      blockingIssues: [
        {
          code: "layout_horizontal_overflow",
          viewport: "desktop",
          document: { overflowRight: 48 },
        },
      ],
    },
    viewports: ["desktop"],
    verify: () => {
      throw new Error("a non-applicable repair must not run verification");
    },
  });

  assert.equal(cycle.result.status, "not_applicable");
  assert.equal(cycle.restored, false);
  assert.equal(cycle.committedSource, cycle.originalSource);
});

test("real JSX: rejects unsafe Section growth without writing a candidate", async () => {
  const cycle = await runRealJsxCycle({
    page: fixturePage(),
    baselineInspection: sectionContainmentInspection(1_000),
    viewports: ["desktop"],
    verify: () => {
      throw new Error("an over-growth candidate must not run verification");
    },
  });

  assert.equal(cycle.result.status, "not_applicable");
  assert.equal(cycle.restored, false);
  assert.equal(cycle.committedSource, cycle.originalSource);
});

test("real JSX: restores the exact source when candidate verification throws", async () => {
  const page = fixturePage();
  const originalSource = pageDocumentToJsx(page);
  const directory = await mkdtemp(join(tmpdir(), "grid-repair-error-"));
  const artifactPath = join(directory, "artifact.jsx");
  await writeFile(artifactPath, originalSource, "utf8");
  let restored = false;

  try {
    const parsed = jsxToPageDocument(await readFile(artifactPath, "utf8"), {
      previousPage: page,
    });
    await assert.rejects(
      runDeterministicGridRepairCycle({
        page: parsed,
        baselineInspection: toolContainmentInspection("desktop", 80),
        viewports: ["desktop"],
        verifyCandidate: async (candidate) => {
          await writeFile(
            artifactPath,
            pageDocumentToJsx(candidate.page),
            "utf8",
          );
          throw new Error("browser verification unavailable");
        },
        commitCandidate: async () => {
          throw new Error("a failed candidate must not commit");
        },
        restoreBaseline: async () => {
          restored = true;
          await writeFile(artifactPath, originalSource, "utf8");
        },
      }),
      /browser verification unavailable/,
    );

    assert.equal(restored, true);
    assert.equal(await readFile(artifactPath, "utf8"), originalSource);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
