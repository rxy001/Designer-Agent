import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runAutomaticGridRepair } from "../app/automaticGridRepair.ts";
import { runDeterministicGridRepairCycle } from "../app/deterministicGridRepairRuntime.ts";
import { jsxToPageDocument } from "../app/editor/jsxToPageDocument.ts";
import { pageDocumentToJsx } from "../app/editor/pageDocumentToJsx.ts";
import type { PageDocument } from "../app/editor/schema.ts";

const page: PageDocument = {
  id: "page",
  title: "Page",
  version: 1,
  viewport: "desktop",
  sections: [
    {
      id: "section",
      type: "section",
      name: "Section",
      grid: { columns: 2, rows: 4, height: 240, columnGap: 10, rowGap: 10 },
      tools: [
        {
          id: "card",
          type: "card",
          name: "Card",
          props: {},
          layout: {
            gridArea: {
              rowStart: 1,
              rowEnd: 4,
              columnStart: 1,
              columnEnd: 3,
            },
            zIndex: 1,
          },
        },
      ],
    },
  ],
};

function inspection(bottom: number) {
  return {
    ok: bottom === 0,
    blockingIssues:
      bottom === 0
        ? []
        : [
            {
              code: "layout_grid_area_containment",
              viewport: "desktop",
              gridAreaContainment: [
                {
                  type: "tool",
                  sectionId: "section",
                  toolId: "card",
                  overflow: { bottom },
                  sectionGrid: {
                    borderBoxHeight: 240,
                    trackSize: 52,
                  },
                },
              ],
            },
          ],
  };
}

test("commits the best verified candidate rather than the last attempted one", async () => {
  const writes: string[] = [];
  const result = await runDeterministicGridRepairCycle({
    page,
    baselineInspection: inspection(30),
    viewports: ["desktop"],
    verifyCandidate: async (candidate) => {
      writes.push(`verify:${candidate.kind}`);
      return candidate.kind === "expand-section-height"
        ? inspection(0)
        : inspection(10);
    },
    commitCandidate: async ({ candidate }) => {
      writes.push(`commit:${candidate.kind}`);
    },
    restoreBaseline: async () => {
      writes.push("restore");
    },
  });
  assert.equal(result.status, "repaired");
  assert.equal(result.candidate.kind, "expand-section-height");
  assert.equal(writes.at(-1), "commit:expand-section-height");
});

test("restores the baseline when no candidate improves it", async () => {
  let restored = false;
  const result = await runDeterministicGridRepairCycle({
    page,
    baselineInspection: inspection(30),
    viewports: ["desktop"],
    verifyCandidate: async () => inspection(40),
    commitCandidate: async () => {
      throw new Error("must not commit");
    },
    restoreBaseline: async () => {
      restored = true;
    },
  });
  assert.equal(result.status, "no_improvement");
  assert.equal(restored, true);
});

test("evaluates every generated candidate by default", async () => {
  const sections = Array.from({ length: 5 }, (_, index) => ({
    ...structuredClone(page.sections[0]!),
    id: `section-${index + 1}`,
    tools: page.sections[0]!.tools.map((tool) => ({
      ...structuredClone(tool),
      id: `card-${index + 1}`,
    })),
  }));
  const multiSectionPage = { ...page, sections };
  const baseline = {
    ok: false,
    blockingIssues: sections.map((section, index) => ({
      code: "layout_grid_area_containment",
      viewport: "desktop",
      gridAreaContainment: [
        {
          type: "tool",
          sectionId: section.id,
          toolId: `card-${index + 1}`,
          overflow: { bottom: 30 },
          sectionGrid: { borderBoxHeight: 240, trackSize: 52 },
        },
      ],
    })),
  };
  const attemptedSections: string[] = [];

  const result = await runDeterministicGridRepairCycle({
    page: multiSectionPage,
    baselineInspection: baseline,
    viewports: ["desktop"],
    verifyCandidate: async (candidate) => {
      attemptedSections.push(candidate.sectionId);
      return candidate.sectionId === "section-5"
        ? { ok: true, blockingIssues: [] }
        : baseline;
    },
    commitCandidate: async () => {},
    restoreBaseline: async () => {},
  });

  assert.equal(result.status, "repaired");
  assert.equal(result.candidate.sectionId, "section-5");
  assert.ok(attemptedSections.includes("section-5"));
});

test("automatic repair converges without a default three-cycle cutoff", async () => {
  const sections = Array.from({ length: 4 }, (_, index) => ({
    ...structuredClone(page.sections[0]!),
    id: `section-${index + 1}`,
    tools: page.sections[0]!.tools.map((tool) => ({
      ...structuredClone(tool),
      id: `card-${index + 1}`,
    })),
  }));
  const repairPage = { ...page, sections };
  const source = pageDocumentToJsx(repairPage);
  const tempDirectory = await mkdtemp(join(tmpdir(), "grid-repair-cycles-"));
  const artifactPath = join(tempDirectory, "artifact.jsx");
  const snapshotRoot = join(tempDirectory, "snapshots");
  await writeFile(artifactPath, source, "utf8");

  const inspectArtifact = async () => {
    const parsed = jsxToPageDocument(await readFile(artifactPath, "utf8"), {
      previousPage: repairPage,
    });
    const blockingIssues = parsed.sections
      .filter((section) => section.grid.height <= 240)
      .map((section) => ({
        code: "layout_grid_area_containment",
        viewport: "desktop",
        gridAreaContainment: [
          {
            type: "section",
            sectionId: section.id,
            overflow: { bottom: 30 },
            sectionGrid: { borderBoxHeight: 240, trackSize: 52 },
          },
        ],
      }));
    return { ok: blockingIssues.length === 0, blockingIssues };
  };

  try {
    const baseline = await inspectArtifact();
    const result = await runAutomaticGridRepair({
      hostPath: artifactPath,
      source,
      inspection: baseline,
      viewports: ["desktop"],
      previousPage: repairPage,
      verifyCandidate: async () => {
        await assert.rejects(
          readFile(
            join(
              snapshotRoot,
              "automatic-grid-repair",
              "workspace-output-products-1",
              "after.jsx",
            ),
            "utf8",
          ),
        );
        return inspectArtifact();
      },
      snapshotRoot,
      snapshotLabel: "/workspace/output/products.jsx",
    });

    assert.equal(result.inspection.ok, true);
    assert.equal(result.applied.length, 4);
    assert.equal("snapshots" in result, false);
    const snapshotRuns = await readdir(
      join(snapshotRoot, "automatic-grid-repair"),
    );
    assert.deepEqual(snapshotRuns, ["workspace-output-products-1"]);
    const snapshotDirectory = join(
      snapshotRoot,
      "automatic-grid-repair",
      snapshotRuns[0]!,
    );
    assert.equal(
      await readFile(join(snapshotDirectory, "before.jsx"), "utf8"),
      source,
    );
    assert.equal(
      await readFile(join(snapshotDirectory, "after.jsx"), "utf8"),
      result.source,
    );
    assert.notEqual(result.source, source);
    const candidateSnapshots = await readdir(
      join(snapshotDirectory, "candidates"),
    );
    assert.ok(candidateSnapshots.length >= 4);
    assert.notEqual(
      await readFile(
        join(snapshotDirectory, "candidates", candidateSnapshots[0]!),
        "utf8",
      ),
      source,
    );
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

test("repairs and verifies a real JSX artifact without losing content or responsive layout", async () => {
  const source = `import { Card, Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root>
      <Section
        id="section"
        columns={2}
        rows={4}
        height={240}
        columnGap={10}
        rowGap={10}
        responsive={{ mobile: { rows: 6, height: 360 } }}
      >
        <Card
          id="card"
          title="Preserved card"
          classNames={{ card: "row-start-1 row-end-4 col-start-1 col-end-3 z-1" }}
        />
        <Text
          id="copy"
          content={"客服｜400-800-2024\\n订单追踪"}
          className="row-start-4 row-end-5 col-start-1 col-end-3 z-1 whitespace-pre-wrap"
        />
      </Section>
    </Root>
  );
}
`;
  const previousPage: PageDocument = {
    ...page,
    sections: [
      {
        ...page.sections[0]!,
        grid: {
          ...page.sections[0]!.grid,
          responsive: { mobile: { rows: 6, height: 360 } },
        },
        tools: [
          page.sections[0]!.tools[0]!,
          {
            id: "copy",
            type: "text",
            name: "Copy",
            props: {},
            layout: {
              gridArea: {
                rowStart: 4,
                rowEnd: 5,
                columnStart: 1,
                columnEnd: 3,
              },
              zIndex: 1,
            },
          },
        ],
      },
    ],
  };
  const tempDirectory = await mkdtemp(join(tmpdir(), "grid-repair-jsx-"));
  const artifactPath = join(tempDirectory, "artifact.jsx");
  await writeFile(artifactPath, source, "utf8");

  try {
    const parsed = jsxToPageDocument(
      await readFile(artifactPath, "utf8"),
      { previousPage },
    );
    const baseline = {
      ok: false,
      blockingIssues: [
        {
          code: "layout_grid_area_containment",
          viewport: "desktop",
          gridAreaContainment: [
            {
              type: "section",
              sectionId: "section",
              overflow: { bottom: 32 },
              sectionGrid: { borderBoxHeight: 240, trackSize: 52 },
            },
          ],
        },
      ],
    };

    const result = await runDeterministicGridRepairCycle({
      page: parsed,
      baselineInspection: baseline,
      viewports: ["desktop"],
      verifyCandidate: async (candidate) => {
        await writeFile(
          artifactPath,
          pageDocumentToJsx(candidate.page),
          "utf8",
        );
        const reparsed = jsxToPageDocument(
          await readFile(artifactPath, "utf8"),
          { previousPage },
        );
        const section = reparsed.sections[0]!;
        const card = section.tools.find((tool) => tool.id === "card")!;
        const copy = section.tools.find((tool) => tool.id === "copy")!;

        assert.equal(card.props.title, "Preserved card");
        assert.equal(copy.props.content, "客服｜400-800-2024\n订单追踪");
        assert.equal(section.grid.responsive?.mobile?.height, 360);
        return { ok: true, blockingIssues: [] };
      },
      commitCandidate: async ({ candidate }) => {
        await writeFile(
          artifactPath,
          pageDocumentToJsx(candidate.page),
          "utf8",
        );
      },
      restoreBaseline: async () => {
        await writeFile(artifactPath, source, "utf8");
      },
    });

    assert.equal(result.status, "repaired");
    const committedSource = await readFile(artifactPath, "utf8");
    assert.notEqual(committedSource, source);
    const committed = jsxToPageDocument(committedSource, { previousPage });
    assert.ok(committed.sections[0]!.grid.height > 240);
    assert.equal(committed.sections[0]!.grid.responsive?.mobile?.height, 360);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});
