import assert from "node:assert/strict";
import { copyFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { join } from "node:path";
import test from "node:test";

import express from "express";

import {
  closeBrowserVerificationRuntime,
  repairBrowserArtifact,
} from "../app/agent.ts";
import {
  getActiveGridArea,
  getActiveSectionGrid,
} from "../app/deterministicGridRepair.ts";
import { jsxToPageDocument } from "../app/editor/jsxToPageDocument.ts";
import type { PageDocument } from "../app/editor/schema.ts";
import { paths } from "../app/paths.ts";
import { unregisterPreviewArtifact } from "../app/previewRegistry.ts";
import {
  closePreviewRenderer,
  installPreviewRenderer,
  renderPreviewHtml,
} from "../app/previewRenderer.ts";

const fixtureDirectory = join(paths.appDir, "../fixtures/automatic-grid-repair");
const preserveArtifacts = process.env.AUTO_REPAIR_E2E_ARTIFACTS === "1";
const resultDirectory = join(
  paths.appDir,
  "../.vite-preview-cache",
  "auto-repair-e2e-results",
);

test(
  "real browser: verifies the complete automatic Grid repair capability matrix",
  { timeout: 120_000 },
  async (t) => {
    const suffix = `${process.pid}-${Date.now()}`;
    const verticalFileName = `automatic-grid-repair-vertical-${suffix}.jsx`;
    const horizontalFileName = `automatic-grid-repair-horizontal-${suffix}.jsx`;
    const multiToolFileName = `automatic-grid-repair-multi-${suffix}.jsx`;
    const reflowFileName = `automatic-grid-repair-reflow-${suffix}.jsx`;
    const tabletFileName = `automatic-grid-repair-tablet-${suffix}.jsx`;
    const sectionHeightFileName = `automatic-grid-repair-height-${suffix}.jsx`;
    const boundsFileName = `automatic-grid-repair-bounds-${suffix}.jsx`;
    const cardActionsFileName = `automatic-grid-repair-card-actions-${suffix}.jsx`;
    const trailingRowsFileName = `automatic-grid-repair-trailing-rows-${suffix}.jsx`;
    const intentionalSpaceFileName = `automatic-grid-repair-intentional-space-${suffix}.jsx`;
    const verticalHostPath = join(paths.workspaceDir, verticalFileName);
    const horizontalHostPath = join(paths.workspaceDir, horizontalFileName);
    const multiToolHostPath = join(paths.workspaceDir, multiToolFileName);
    const reflowHostPath = join(paths.workspaceDir, reflowFileName);
    const tabletHostPath = join(paths.workspaceDir, tabletFileName);
    const sectionHeightHostPath = join(paths.workspaceDir, sectionHeightFileName);
    const boundsHostPath = join(paths.workspaceDir, boundsFileName);
    const cardActionsHostPath = join(paths.workspaceDir, cardActionsFileName);
    const trailingRowsHostPath = join(paths.workspaceDir, trailingRowsFileName);
    const intentionalSpaceHostPath = join(
      paths.workspaceDir,
      intentionalSpaceFileName,
    );
    const verticalSandboxPath = `/workspace/output/${verticalFileName}`;
    const horizontalSandboxPath = `/workspace/output/${horizontalFileName}`;
    const multiToolSandboxPath = `/workspace/output/${multiToolFileName}`;
    const reflowSandboxPath = `/workspace/output/${reflowFileName}`;
    const tabletSandboxPath = `/workspace/output/${tabletFileName}`;
    const sectionHeightSandboxPath = `/workspace/output/${sectionHeightFileName}`;
    const boundsSandboxPath = `/workspace/output/${boundsFileName}`;
    const cardActionsSandboxPath = `/workspace/output/${cardActionsFileName}`;
    const trailingRowsSandboxPath = `/workspace/output/${trailingRowsFileName}`;
    const intentionalSpaceSandboxPath = `/workspace/output/${intentionalSpaceFileName}`;
    const app = express();
    let server: Server | undefined;

    app.get("/preview-artifacts/:id", async (request, response) => {
      try {
        response.type("html").send(await renderPreviewHtml(request.params.id));
      } catch (error) {
        response
          .status(500)
          .send(error instanceof Error ? error.message : String(error));
      }
    });

    await copyFile(
      join(fixtureDirectory, "in-place-span-overflow.jsx"),
      verticalHostPath,
    );
    await copyFile(
      join(fixtureDirectory, "horizontal-overflow.jsx"),
      horizontalHostPath,
    );
    await copyFile(
      join(fixtureDirectory, "complex-multi-tool-in-place.jsx"),
      multiToolHostPath,
    );
    await copyFile(
      join(fixtureDirectory, "complex-downstream-reflow.jsx"),
      reflowHostPath,
    );
    await copyFile(
      join(fixtureDirectory, "complex-tablet-isolation.jsx"),
      tabletHostPath,
    );
    await copyFile(
      join(fixtureDirectory, "section-height-overflow.jsx"),
      sectionHeightHostPath,
    );
    await copyFile(
      join(fixtureDirectory, "static-row-bounds.jsx"),
      boundsHostPath,
    );
    await copyFile(
      join(fixtureDirectory, "three-column-card-actions.jsx"),
      cardActionsHostPath,
    );
    await copyFile(
      join(fixtureDirectory, "section-trailing-empty-rows.jsx"),
      trailingRowsHostPath,
    );
    await copyFile(
      join(fixtureDirectory, "intentional-section-bottom-space.jsx"),
      intentionalSpaceHostPath,
    );

    try {
      await installPreviewRenderer(app);
      server = await listenOnEphemeralPort(app);
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const previewBaseUrl = `http://127.0.0.1:${address.port}`;

      const originalSource = await readFile(verticalHostPath, "utf8");
      const originalPage = parseStandalonePage(originalSource);
      const repaired = await repairBrowserArtifact({
        path: verticalSandboxPath,
        viewports: ["mobile"],
        captureScreenshots: preserveArtifacts,
        previewBaseUrl,
      });

      assert.equal(repaired.status, "repaired");
      assert.equal(repaired.beforeInspection.ok, false);
      assert.equal(repaired.afterInspection.ok, true);
      assert.equal(repaired.applied.length, 1);
      assert.equal(repaired.applied[0]?.viewport, "mobile");
      assert.equal(repaired.applied[0]?.kind, "expand-tool-span-in-place");
      assert.ok(
        repaired.beforeInspection.blockingIssues.some(
          (issue) => issue.code === "layout_grid_area_containment",
        ),
      );

      const repairedSource = await readFile(verticalHostPath, "utf8");
      const repairedPage = jsxToPageDocument(repairedSource, {
        previousPage: originalPage,
      });
      const originalSection = originalPage.sections[0]!;
      const repairedSection = repairedPage.sections[0]!;
      assert.equal(repairedSection.grid.height, originalSection.grid.height);
      assert.equal(
        repairedSection.grid.responsive!.mobile!.height,
        originalSection.grid.responsive!.mobile!.height,
      );
      const beforeRowEnd = originalSection.tools[0]!.layout.gridArea.rowEnd;
      const afterRowEnd =
        repairedSection.tools[0]!.layout.responsive!.mobile!.gridArea!.rowEnd;
      assert.equal(beforeRowEnd, 4);
      assert.equal(afterRowEnd, 5);
      assert.equal(
        repairedSection.tools[0]!.props.content,
        originalSection.tools[0]!.props.content,
      );
      const beforeHeight = originalSection.grid.responsive!.mobile!.height!;
      const afterHeight = repairedSection.grid.responsive!.mobile!.height!;
      t.diagnostic(
        `mobile: overflow detected -> ${repaired.applied[0]!.kind}; row-end ${beforeRowEnd} -> ${afterRowEnd}; Section height remains ${afterHeight}px; browser recheck passed`,
      );

      if (preserveArtifacts) {
        await preserveInspectionArtifacts({
          originalSource,
          repairedSource,
          repaired,
          beforeHeight,
          afterHeight,
          beforeRowEnd,
          afterRowEnd,
        });
        t.diagnostic(`inspection artifacts: ${resultDirectory}`);
      }

      const secondRun = await repairBrowserArtifact({
        path: verticalSandboxPath,
        viewports: ["mobile"],
        previewBaseUrl,
      });
      assert.equal(secondRun.status, "already_valid");
      assert.equal(secondRun.applied.length, 0);
      assert.equal(await readFile(verticalHostPath, "utf8"), repairedSource);

      const unsupportedSource = await readFile(horizontalHostPath, "utf8");
      const unsupported = await repairBrowserArtifact({
        path: horizontalSandboxPath,
        viewports: ["mobile"],
        previewBaseUrl,
      });
      assert.equal(unsupported.status, "no_improvement");
      assert.equal(unsupported.applied.length, 0);
      assert.equal(
        await readFile(horizontalHostPath, "utf8"),
        unsupportedSource,
      );
      t.diagnostic(
        "unsupported horizontal overflow: no_improvement; exact source rollback passed",
      );

      const multiToolOriginal = parseStandalonePage(
        await readFile(multiToolHostPath, "utf8"),
      );
      const multiToolRepair = await repairBrowserArtifact({
        path: multiToolSandboxPath,
        viewports: ["mobile"],
        previewBaseUrl,
      });
      assert.equal(multiToolRepair.status, "repaired");
      assert.equal(
        multiToolRepair.applied[0]?.kind,
        "expand-tool-span-in-place",
      );
      const multiToolRepaired = jsxToPageDocument(
        await readFile(multiToolHostPath, "utf8"),
        { previousPage: multiToolOriginal },
      );
      assert.deepEqual(multiToolRepair.applied[0]?.candidateId.includes(
        "multi-tool-left,multi-tool-right",
      ), true);
      for (const tool of multiToolRepaired.sections[0]!.tools) {
        assert.equal(getActiveGridArea(tool, "mobile").rowEnd, 5);
      }
      assert.equal(multiToolRepair.afterInspection.ok, true);
      t.diagnostic(
        "complex multi-tool: repaired two independent columns in-place; browser recheck passed",
      );

      const reflowOriginal = parseStandalonePage(
        await readFile(reflowHostPath, "utf8"),
      );
      const reflowRepair = await repairBrowserArtifact({
        path: reflowSandboxPath,
        viewports: ["mobile"],
        previewBaseUrl,
      });
      assert.equal(reflowRepair.status, "repaired");
      assert.equal(reflowRepair.applied[0]?.kind, "reflow-section-bands");
      const reflowRepaired = jsxToPageDocument(
        await readFile(reflowHostPath, "utf8"),
        { previousPage: reflowOriginal },
      );
      const originalPrimary = reflowOriginal.sections[0]!.tools[0]!;
      const originalDownstream = reflowOriginal.sections[0]!.tools[1]!;
      const repairedPrimary = reflowRepaired.sections[0]!.tools[0]!;
      const repairedDownstream = reflowRepaired.sections[0]!.tools[1]!;
      const originalGap =
        getActiveGridArea(originalDownstream, "mobile").rowStart -
        getActiveGridArea(originalPrimary, "mobile").rowEnd;
      const repairedGap =
        getActiveGridArea(repairedDownstream, "mobile").rowStart -
        getActiveGridArea(repairedPrimary, "mobile").rowEnd;
      assert.equal(repairedGap, originalGap);
      assert.ok(
        getActiveGridArea(repairedDownstream, "mobile").rowStart >
          getActiveGridArea(originalDownstream, "mobile").rowStart,
      );
      assert.ok(
        getActiveSectionGrid(reflowRepaired.sections[0]!, "mobile").rows >
          getActiveSectionGrid(reflowOriginal.sections[0]!, "mobile").rows,
      );
      assert.equal(reflowRepair.afterInspection.ok, true);
      t.diagnostic(
        "complex reflow: moved downstream band, preserved its gap, and passed browser recheck",
      );

      const tabletOriginal = parseStandalonePage(
        await readFile(tabletHostPath, "utf8"),
      );
      const tabletRepair = await repairBrowserArtifact({
        path: tabletSandboxPath,
        viewports: ["desktop", "tablet", "mobile"],
        previewBaseUrl,
      });
      assert.equal(tabletRepair.status, "repaired");
      assert.equal(tabletRepair.applied[0]?.viewport, "tablet");
      assert.equal(
        tabletRepair.beforeInspection.viewports.desktop?.layout.ok,
        true,
      );
      assert.equal(
        tabletRepair.beforeInspection.viewports.tablet?.layout.ok,
        false,
      );
      assert.equal(
        tabletRepair.beforeInspection.viewports.mobile?.layout.ok,
        true,
      );
      assert.equal(tabletRepair.afterInspection.ok, true);
      const tabletRepaired = jsxToPageDocument(
        await readFile(tabletHostPath, "utf8"),
        { previousPage: tabletOriginal },
      );
      const originalTabletTool = tabletOriginal.sections[0]!.tools[0]!;
      const repairedTabletTool = tabletRepaired.sections[0]!.tools[0]!;
      assert.deepEqual(
        getActiveGridArea(repairedTabletTool, "desktop"),
        getActiveGridArea(originalTabletTool, "desktop"),
      );
      assert.deepEqual(
        getActiveGridArea(repairedTabletTool, "mobile"),
        getActiveGridArea(originalTabletTool, "mobile"),
      );
      assert.ok(
        getActiveGridArea(repairedTabletTool, "tablet").rowEnd >
          getActiveGridArea(originalTabletTool, "tablet").rowEnd,
      );
      t.diagnostic(
        "complex responsive isolation: repaired tablet only; desktop and mobile remained valid",
      );

      const sectionHeightOriginal = parseStandalonePage(
        await readFile(sectionHeightHostPath, "utf8"),
      );
      const sectionHeightRepair = await repairBrowserArtifact({
        path: sectionHeightSandboxPath,
        viewports: ["mobile"],
        previewBaseUrl,
      });
      assert.equal(sectionHeightRepair.status, "repaired");
      assert.ok(sectionHeightRepair.applied.length > 1);
      assert.ok(
        sectionHeightRepair.applied.every(
          (repair) => repair.kind === "expand-section-height",
        ),
      );
      const sectionHeightRepaired = jsxToPageDocument(
        await readFile(sectionHeightHostPath, "utf8"),
        { previousPage: sectionHeightOriginal },
      );
      assert.ok(
        getActiveSectionGrid(sectionHeightRepaired.sections[0]!, "mobile")
          .height >
          getActiveSectionGrid(sectionHeightOriginal.sections[0]!, "mobile")
            .height,
      );
      assert.equal(
        getActiveSectionGrid(sectionHeightRepaired.sections[0]!, "mobile").rows,
        getActiveSectionGrid(sectionHeightOriginal.sections[0]!, "mobile").rows,
      );
      assert.deepEqual(
        getActiveGridArea(sectionHeightRepaired.sections[0]!.tools[0]!, "mobile"),
        getActiveGridArea(sectionHeightOriginal.sections[0]!.tools[0]!, "mobile"),
      );
      assert.equal(sectionHeightRepair.afterInspection.ok, true);
      t.diagnostic(
        "section containment: grew mobile tracks over multiple verified cycles without moving Tool coordinates",
      );

      const boundsOriginal = parseStandalonePage(
        await readFile(boundsHostPath, "utf8"),
      );
      const boundsRepair = await repairBrowserArtifact({
        path: boundsSandboxPath,
        viewports: ["mobile"],
        previewBaseUrl,
      });
      assert.equal(boundsRepair.status, "repaired");
      assert.equal(
        boundsRepair.applied[0]?.kind,
        "shift-grid-bounds-in-place",
      );
      const boundsRepaired = jsxToPageDocument(
        await readFile(boundsHostPath, "utf8"),
        { previousPage: boundsOriginal },
      );
      const originalBoundsGrid = getActiveSectionGrid(
        boundsOriginal.sections[0]!,
        "mobile",
      );
      const repairedBoundsGrid = getActiveSectionGrid(
        boundsRepaired.sections[0]!,
        "mobile",
      );
      assert.equal(originalBoundsGrid.rows, 4);
      assert.equal(repairedBoundsGrid.rows, originalBoundsGrid.rows);
      assert.equal(repairedBoundsGrid.height, originalBoundsGrid.height);
      const originalBoundsArea = getActiveGridArea(
        boundsOriginal.sections[0]!.tools[0]!,
        "mobile",
      );
      const repairedBoundsArea = getActiveGridArea(
        boundsRepaired.sections[0]!.tools[0]!,
        "mobile",
      );
      assert.deepEqual(originalBoundsArea, {
        rowStart: 4,
        rowEnd: 7,
        columnStart: 1,
        columnEnd: 5,
      });
      assert.deepEqual(repairedBoundsArea, {
        rowStart: 2,
        rowEnd: 5,
        columnStart: 1,
        columnEnd: 5,
      });
      assert.equal(
        repairedBoundsArea.rowEnd - repairedBoundsArea.rowStart,
        originalBoundsArea.rowEnd - originalBoundsArea.rowStart,
      );
      for (const viewport of ["desktop", "tablet"] as const) {
        const originalGrid = getActiveSectionGrid(
          boundsOriginal.sections[0]!,
          viewport,
        );
        const repairedGrid = getActiveSectionGrid(
          boundsRepaired.sections[0]!,
          viewport,
        );
        assert.equal(repairedGrid.rows, originalGrid.rows);
        assert.equal(repairedGrid.height, originalGrid.height);
        assert.equal(repairedGrid.columns, originalGrid.columns);
        assert.equal(repairedGrid.rowGap, originalGrid.rowGap);
        assert.equal(repairedGrid.columnGap, originalGrid.columnGap);
      }
      assert.equal(boundsRepair.afterInspection.ok, true);
      t.diagnostic(
        "static bounds: shifted mobile row 4/7 -> 2/5, preserved span and Section geometry, and left desktop/tablet unchanged",
      );

      const cardActionsOriginal = parseStandalonePage(
        await readFile(cardActionsHostPath, "utf8"),
      );
      const cardActionsRepair = await repairBrowserArtifact({
        path: cardActionsSandboxPath,
        viewports: ["desktop"],
        previewBaseUrl,
      });
      assert.equal(cardActionsRepair.status, "repaired");
      assert.equal(
        cardActionsRepair.applied[0]?.kind,
        "expand-tool-span-in-place",
      );
      for (const toolId of [
        "card-actions-starter",
        "card-actions-growth",
        "card-actions-scale",
      ]) {
        assert.match(
          cardActionsRepair.applied[0]?.candidateId ?? "",
          new RegExp(toolId),
        );
        assert.match(
          JSON.stringify(cardActionsRepair.beforeInspection.blockingIssues),
          new RegExp(toolId),
        );
      }
      const cardActionsRepaired = jsxToPageDocument(
        await readFile(cardActionsHostPath, "utf8"),
        { previousPage: cardActionsOriginal },
      );
      assert.equal(
        getActiveSectionGrid(cardActionsRepaired.sections[0]!, "desktop")
          .height,
        getActiveSectionGrid(cardActionsOriginal.sections[0]!, "desktop")
          .height,
      );
      assert.equal(
        getActiveSectionGrid(cardActionsRepaired.sections[0]!, "desktop").rows,
        getActiveSectionGrid(cardActionsOriginal.sections[0]!, "desktop").rows,
      );
      for (let index = 0; index < 3; index += 1) {
        const originalCard = cardActionsOriginal.sections[0]!.tools[index]!;
        const repairedCard = cardActionsRepaired.sections[0]!.tools[index]!;
        assert.equal(getActiveGridArea(originalCard, "desktop").rowEnd, 4);
        assert.equal(getActiveGridArea(repairedCard, "desktop").rowEnd, 5);
        assert.equal(
          repairedCard.props.buttonLabel,
          originalCard.props.buttonLabel,
        );
      }
      assert.equal(cardActionsRepair.afterInspection.ok, true);
      t.diagnostic(
        "three-column Cards: expanded all Card spans in place, preserved Section geometry and button labels, and revealed every action",
      );

      const trailingRowsOriginal = parseStandalonePage(
        await readFile(trailingRowsHostPath, "utf8"),
      );
      const trailingRowsRepair = await repairBrowserArtifact({
        path: trailingRowsSandboxPath,
        viewports: ["desktop"],
        previewBaseUrl,
      });
      assert.equal(trailingRowsRepair.status, "repaired");
      assert.equal(
        trailingRowsRepair.applied[0]?.kind,
        "compact-section-trailing-rows",
      );
      assert.match(
        JSON.stringify(trailingRowsRepair.beforeInspection.blockingIssues),
        /section-excessive-unused-space/,
      );
      const trailingRowsRepaired = jsxToPageDocument(
        await readFile(trailingRowsHostPath, "utf8"),
        { previousPage: trailingRowsOriginal },
      );
      const originalTrailingSection = trailingRowsOriginal.sections[0]!;
      const repairedTrailingSection = trailingRowsRepaired.sections[0]!;
      assert.equal(
        getActiveSectionGrid(originalTrailingSection, "desktop").rows,
        8,
      );
      assert.equal(
        getActiveSectionGrid(repairedTrailingSection, "desktop").rows,
        4,
      );
      assert.equal(
        getActiveSectionGrid(repairedTrailingSection, "desktop").height,
        336,
      );
      for (let index = 0; index < originalTrailingSection.tools.length; index += 1) {
        assert.deepEqual(
          getActiveGridArea(repairedTrailingSection.tools[index]!, "desktop"),
          getActiveGridArea(originalTrailingSection.tools[index]!, "desktop"),
        );
      }
      for (const viewport of ["tablet", "mobile"] as const) {
        const originalGrid = getActiveSectionGrid(
          originalTrailingSection,
          viewport,
        );
        const repairedGrid = getActiveSectionGrid(
          repairedTrailingSection,
          viewport,
        );
        assert.equal(repairedGrid.rows, originalGrid.rows);
        assert.equal(repairedGrid.height, originalGrid.height);
      }
      assert.equal(trailingRowsRepair.afterInspection.ok, true);
      t.diagnostic(
        "trailing rows: compacted desktop rows 8 -> 4 and height 640 -> 336 without changing any Tool coordinate or responsive sibling",
      );

      const intentionalSpaceSource = await readFile(
        intentionalSpaceHostPath,
        "utf8",
      );
      const intentionalSpaceRepair = await repairBrowserArtifact({
        path: intentionalSpaceSandboxPath,
        viewports: ["desktop"],
        previewBaseUrl,
      });
      assert.equal(intentionalSpaceRepair.status, "no_improvement");
      assert.equal(intentionalSpaceRepair.applied.length, 0);
      assert.match(
        JSON.stringify(intentionalSpaceRepair.beforeInspection.blockingIssues),
        /section-excessive-unused-space/,
      );
      assert.equal(
        await readFile(intentionalSpaceHostPath, "utf8"),
        intentionalSpaceSource,
      );
      t.diagnostic(
        "intentional space: preserved min-h-screen Section and exact JSX without generating a compaction",
      );
    } finally {
      await closeBrowserVerificationRuntime();
      await closeServer(server);
      await closePreviewRenderer();
      unregisterPreviewArtifact(verticalSandboxPath);
      unregisterPreviewArtifact(horizontalSandboxPath);
      unregisterPreviewArtifact(multiToolSandboxPath);
      unregisterPreviewArtifact(reflowSandboxPath);
      unregisterPreviewArtifact(tabletSandboxPath);
      unregisterPreviewArtifact(sectionHeightSandboxPath);
      unregisterPreviewArtifact(boundsSandboxPath);
      unregisterPreviewArtifact(cardActionsSandboxPath);
      unregisterPreviewArtifact(trailingRowsSandboxPath);
      unregisterPreviewArtifact(intentionalSpaceSandboxPath);
      await unlinkIfPresent(verticalHostPath);
      await unlinkIfPresent(horizontalHostPath);
      await unlinkIfPresent(multiToolHostPath);
      await unlinkIfPresent(reflowHostPath);
      await unlinkIfPresent(tabletHostPath);
      await unlinkIfPresent(sectionHeightHostPath);
      await unlinkIfPresent(boundsHostPath);
      await unlinkIfPresent(cardActionsHostPath);
      await unlinkIfPresent(trailingRowsHostPath);
      await unlinkIfPresent(intentionalSpaceHostPath);
    }
  },
);

function parseStandalonePage(source: string) {
  const previousPage: PageDocument = {
    id: "page",
    title: "Page",
    version: 1,
    viewport: "desktop",
    sections: [],
  };
  return jsxToPageDocument(source, { previousPage });
}

function listenOnEphemeralPort(app: express.Express) {
  return new Promise<Server>((resolve, reject) => {
    const server = createServer(app);
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function closeServer(server: Server | undefined) {
  if (!server) return Promise.resolve();
  return new Promise<void>((resolve) => server.close(() => resolve()));
}

async function unlinkIfPresent(path: string) {
  try {
    await unlink(path);
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }
}

async function preserveInspectionArtifacts({
  originalSource,
  repairedSource,
  repaired,
  beforeHeight,
  afterHeight,
  beforeRowEnd,
  afterRowEnd,
}: {
  originalSource: string;
  repairedSource: string;
  repaired: Awaited<ReturnType<typeof repairBrowserArtifact>>;
  beforeHeight: number;
  afterHeight: number;
  beforeRowEnd: number;
  afterRowEnd: number;
}) {
  assert.equal(repaired.status, "repaired");
  await mkdir(resultDirectory, { recursive: true });
  await Promise.all([
    writeFile(join(resultDirectory, "vertical.before.jsx"), originalSource),
    writeFile(join(resultDirectory, "vertical.after.jsx"), repairedSource),
    writeFile(
      join(resultDirectory, "report.json"),
      `${JSON.stringify(
        {
          status: repaired.status,
          applied: repaired.applied,
          before: {
            ok: repaired.beforeInspection.ok,
            height: beforeHeight,
            rowEnd: beforeRowEnd,
            blockingIssueCodes: repaired.beforeInspection.blockingIssues.map(
              (issue) => issue.code,
            ),
          },
          after: {
            ok: repaired.afterInspection.ok,
            height: afterHeight,
            rowEnd: afterRowEnd,
            blockingIssueCodes: repaired.afterInspection.blockingIssues.map(
              (issue) => issue.code,
            ),
          },
        },
        null,
        2,
      )}\n`,
    ),
    writeScreenshot(
      join(resultDirectory, "mobile.before.jpg"),
      repaired.beforeInspection.viewports.mobile?.screenshotDataUrl,
    ),
    writeScreenshot(
      join(resultDirectory, "mobile.after.jpg"),
      repaired.afterInspection.viewports.mobile?.screenshotDataUrl,
    ),
  ]);
}

async function writeScreenshot(path: string, dataUrl: string | undefined) {
  assert.ok(dataUrl, `Missing screenshot data for ${path}`);
  const match = /^data:image\/(?:jpeg|jpg);base64,(.+)$/.exec(dataUrl);
  assert.ok(match, `Unexpected screenshot format for ${path}`);
  await writeFile(path, Buffer.from(match[1]!, "base64"));
}
