import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRepairIssueProgress,
  compactBrowserMatrixRepairFacts,
} from "../app/repairPolicy.ts";

test("compacts browser facts without emitting model repair plans", () => {
  const [hint] = compactBrowserMatrixRepairFacts([
    {
      factType: "section",
      viewport: "mobile",
      severity: "targeted",
      message: "legacy prose",
      nextActions: ["legacy action"],
      samples: [
        {
          type: "element",
          sectionId: "content",
          toolId: "guide",
          dataSlot: "card",
          issues: ["text-overflow-y"],
          measurements: { scrollVsClient: { bottom: 12 } },
        },
      ],
    },
  ]);

  assert.deepEqual(hint, {
    severity: "targeted",
    affectedViewports: ["mobile"],
    samples: [
      {
        type: "element",
        target: { dataSlot: "card" },
        issues: ["content-scroll-overflow-y"],
        measurements: { scrollVsClient: { bottom: 12 } },
      },
    ],
    uniqueFactCount: 1,
    issueCounts: { "content-scroll-overflow-y": 1 },
    issueTargetCounts: { "content-scroll-overflow-y": 1 },
    issueSummaries: {
      "content-scroll-overflow-y": { maxOverflowBottom: 12 },
    },
    scope: { sectionId: "content", toolId: "guide" },
  });
  assert.equal("actions" in hint, false);
  assert.equal("message" in hint, false);
  assert.equal("nextActions" in hint, false);
});

test("projects clipped overflow once when the raw detector reports both codes", () => {
  const [hint] = compactBrowserMatrixRepairFacts([
    {
      factType: "section",
      viewport: "tablet",
      samples: [
        {
          type: "element",
          sectionId: "content",
          toolId: "guide",
          dataSlot: "card",
          issues: ["text-overflow-y", "clipped-content-y"],
          overflow: { bottom: 12 },
        },
      ],
    },
  ]);

  assert.deepEqual(
    (hint.samples as Array<Record<string, unknown>>)[0]?.issues,
    ["clipped-content-y"],
  );
});

test("retains every compact evidence target and the unique fact count", () => {
  const [hint] = compactBrowserMatrixRepairFacts(
    Array.from({ length: 6 }, (_, index) => ({
      factType: "section",
      viewport: "tablet",
      severity: "targeted",
      samples: [
        {
          type: "element",
          sectionId: "content",
          toolId: "guide",
          dataSlot: "text",
          slotIndexInTool: index,
          issues: [`issue-${index}`],
        },
      ],
    })),
  );

  assert.equal((hint.samples as unknown[]).length, 6);
  assert.equal(hint.uniqueFactCount, 6);
});

test("keeps the same Section fact isolated by viewport", () => {
  const hints = compactBrowserMatrixRepairFacts([
    {
      factType: "section",
      viewport: "tablet",
      severity: "structural",
      samples: [
        {
          type: "element",
          sectionId: "content",
          toolId: "guide",
          dataSlot: "card",
          issues: ["clipped-content-y"],
        },
      ],
    },
    {
      factType: "section",
      viewport: "mobile",
      severity: "structural",
      samples: [
        {
          type: "element",
          sectionId: "content",
          toolId: "guide",
          dataSlot: "card",
          issues: ["clipped-content-y"],
        },
      ],
    },
  ]);

  assert.equal(hints.length, 2);
  assert.deepEqual(
    hints.map((hint) => hint.affectedViewports),
    [["tablet"], ["mobile"]],
  );
  assert.ok(hints.every((hint) => hint.uniqueFactCount === 1));
  assert.ok(hints.every((hint) => hint.occurrenceCount === undefined));
});

test("preserves numeric Section and Tool index fallbacks when ids are absent", () => {
  const [hint] = compactBrowserMatrixRepairFacts([
    {
      factType: "section",
      viewport: "mobile",
      samples: [
        {
          type: "element",
          sectionIndex: 2,
          toolIndexInSection: 3,
          dataSlot: "content",
          issues: ["clipped-content-y"],
        },
      ],
    },
  ]);

  assert.deepEqual(hint.scope, {
    sectionIndex: 2,
    toolIndexInSection: 3,
  });
  assert.deepEqual(
    (hint.samples as Array<Record<string, unknown>>)[0]?.target,
    {
      dataSlot: "content",
      sectionIndex: 2,
      toolIndexInSection: 3,
    },
  );
});

test("tracks issue improvement while preserving internal history", () => {
  const first = buildRepairIssueProgress({
    previous: [],
    verifiedViewports: ["mobile"],
    issues: [
      {
        viewport: "mobile",
        element: {
          sectionId: "content",
          toolId: "guide",
          dataSlot: "card",
          issues: ["clipped-content-y"],
          measurements: { overflow: { bottom: 20 } },
        },
      },
    ],
  });
  const second = buildRepairIssueProgress({
    previous: first.snapshots,
    verifiedViewports: ["mobile"],
    issues: [
      {
        viewport: "mobile",
        element: {
          sectionId: "content",
          toolId: "guide",
          dataSlot: "card",
          issues: ["clipped-content-y"],
          measurements: { overflow: { bottom: 8 } },
        },
      },
    ],
  });

  assert.equal(second.items[0]?.status, "improved");
  assert.equal(second.items[0]?.consecutiveFailures, 2);
  assert.deepEqual(second.items[0]?.previousMeasurements, {
    overflow: { bottom: 20 },
  });
});

test("preserves history for viewports outside a targeted verification", () => {
  const previous = buildRepairIssueProgress({
    previous: [],
    verifiedViewports: ["desktop", "mobile"],
    issues: [
      { viewport: "desktop", code: "desktop-problem" },
      { viewport: "mobile", code: "mobile-problem" },
    ],
  });
  const mobileOnly = buildRepairIssueProgress({
    previous: previous.snapshots,
    verifiedViewports: ["mobile"],
    issues: [],
  });

  assert.equal(
    mobileOnly.snapshots.some((item) => item.viewport === "desktop"),
    true,
  );
  assert.equal(
    mobileOnly.resolvedIssueKeys.some((key) => key.startsWith("mobile:")),
    true,
  );
});
