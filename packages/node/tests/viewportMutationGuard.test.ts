import assert from "node:assert/strict";
import test from "node:test";

import type { BrowserViewportName } from "../app/agentConfig.ts";
import type { PageDocument } from "../app/editor/schema.ts";
import {
  buildViewportRepairContract,
  collectExplicitRepairViewports,
  inspectProtectedBrowserGeometryChanges,
  inspectProtectedPageLayoutChanges,
} from "../app/viewportMutationGuard.ts";

function pricingPage(): PageDocument {
  return {
    id: "pricing",
    title: "Pricing",
    version: 1,
    viewport: "desktop",
    sections: [
      {
        id: "pricing-plans-section",
        type: "section",
        name: "Pricing plans",
        grid: {
          columns: 12,
          rows: 12,
          height: 1316,
          columnGap: 12,
          rowGap: 12,
          responsive: {
            tablet: { rows: 12, height: 1316 },
            mobile: { columns: 4, rows: 18, height: 1660 },
          },
        },
        tools: [
          {
            id: "starter-plan-card",
            type: "card",
            name: "Starter",
            props: {},
            layout: {
              gridArea: {
                rowStart: 4,
                rowEnd: 10,
                columnStart: 1,
                columnEnd: 5,
              },
              zIndex: 1,
              responsive: {
                tablet: {
                  gridArea: {
                    rowStart: 4,
                    rowEnd: 9,
                    columnStart: 1,
                    columnEnd: 7,
                  },
                },
                mobile: {
                  gridArea: {
                    rowStart: 4,
                    rowEnd: 9,
                    columnStart: 1,
                    columnEnd: 5,
                  },
                },
              },
            },
          },
        ],
      },
    ],
  };
}

test("derives a protected viewport contract from Reviewer observations", () => {
  const issues = [
    {
      code: "excellence_finding_mobile_density",
      affectedViewports: ["mobile"],
      observations: [{ viewport: "mobile" }],
    },
  ];
  assert.deepEqual(collectExplicitRepairViewports(issues), ["mobile"]);
  assert.deepEqual(
    buildViewportRepairContract({
      path: "/workspace/output/pricing.jsx",
      baselineSource: "baseline",
      issues,
    }),
    {
      path: "/workspace/output/pricing.jsx",
      baselineSource: "baseline",
      affectedViewports: ["mobile"],
      protectedViewports: ["desktop", "tablet"],
    },
  );
});

test("blocks a mobile repair that accidentally changes the desktop base span", () => {
  const baseline = pricingPage();
  const candidate = structuredClone(baseline);
  candidate.sections[0]!.tools[0]!.layout.gridArea.rowEnd = 8;
  candidate.sections[0]!.tools[0]!.layout.responsive!.mobile!.gridArea!.rowEnd =
    8;

  const issues = inspectProtectedPageLayoutChanges({
    baseline,
    candidate,
    protectedViewports: ["desktop", "tablet"],
  });

  assert.equal(issues.length, 1);
  assert.equal(issues[0]!.viewport, "desktop");
  assert.equal(issues[0]!.sectionId, "pricing-plans-section");
  assert.equal(issues[0]!.toolId, "starter-plan-card");
  assert.deepEqual(
    (issues[0]!.before as { gridArea: { rowEnd: number } }).gridArea.rowEnd,
    10,
  );
  assert.deepEqual(
    (issues[0]!.after as { gridArea: { rowEnd: number } }).gridArea.rowEnd,
    8,
  );
});

test("allows a mobile-only override when protected effective layouts stay stable", () => {
  const baseline = pricingPage();
  const candidate = structuredClone(baseline);
  candidate.sections[0]!.tools[0]!.layout.responsive!.mobile!.gridArea!.rowEnd =
    8;
  candidate.sections[0]!.grid.responsive!.mobile!.rows = 16;
  candidate.sections[0]!.grid.responsive!.mobile!.height = 1500;

  assert.deepEqual(
    inspectProtectedPageLayoutChanges({
      baseline,
      candidate,
      protectedViewports: ["desktop", "tablet"],
    }),
    [],
  );
});

test("browser geometry guard catches protected padding and card height regressions", () => {
  const baseline = browserInspection({
    sectionHeight: 600,
    paddingLeft: 24,
    toolHeight: 420,
  });
  const candidate = browserInspection({
    sectionHeight: 600,
    paddingLeft: 16,
    toolHeight: 360,
  });

  const issues = inspectProtectedBrowserGeometryChanges({
    baseline,
    candidate,
    protectedViewports: ["desktop"],
  });

  assert.equal(issues.length, 2);
  assert.ok(issues.every((issue) => issue.viewport === "desktop"));
  assert.ok(issues.some((issue) => issue.sectionId && !issue.toolId));
  assert.ok(issues.some((issue) => issue.toolId === "starter-plan-card"));
});

function browserInspection({
  sectionHeight,
  paddingLeft,
  toolHeight,
}: {
  sectionHeight: number;
  paddingLeft: number;
  toolHeight: number;
}) {
  const viewport = "desktop" satisfies BrowserViewportName;
  return {
    viewports: {
      [viewport]: {
        runtime: { ok: true },
        layout: {
          ok: true,
          sections: [
            {
              sectionId: "pricing-plans-section",
              layout: {
                rows: 12,
                columns: 12,
                width: 1440,
                height: sectionHeight,
                paddingTop: 24,
                paddingRight: 24,
                paddingBottom: 24,
                paddingLeft,
                rowGap: 12,
                columnGap: 12,
              },
              tools: [
                {
                  toolId: "starter-plan-card",
                  visible: true,
                  gridArea: {
                    rowStart: 4,
                    rowEnd: 10,
                    columnStart: 1,
                    columnEnd: 5,
                  },
                  rect: {
                    top: 120,
                    left: 24,
                    width: 440,
                    height: toolHeight,
                  },
                },
              ],
            },
          ],
        },
      },
    },
  };
}
