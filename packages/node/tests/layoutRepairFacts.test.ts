import assert from "node:assert/strict";
import test from "node:test";

import { buildLayoutRepairFacts } from "../app/layoutRepairFacts.ts";

test("keeps horizontal repair action ahead of contrast and vertical actions", () => {
  const hints = buildLayoutRepairFacts([
    {
      code: "layout_element_issue",
      element: {
        sectionIndex: 2,
        toolIndexInSection: 3,
        dataSlot: "text",
        issues: ["outside-viewport-x", "text-overflow-y", "low-text-contrast"],
        metrics: { scrollWidth: 520, clientWidth: 390, scrollHeight: 42, clientHeight: 40 },
        computed: { contrastRatio: 1, contrastThreshold: 4.5 },
        text: "Visible copy",
      },
    },
  ]);

  const actions = hints[0]?.nextActions as string[];
  assert.match(actions[1] ?? "", /Widen or reposition/);
  assert.ok(actions.some((action) => action.includes("contrast")));
});

test("attributes document horizontal overflow to the widest offending Section", () => {
  const hints = buildLayoutRepairFacts([
    {
      code: "layout_horizontal_overflow",
      viewport: { width: 390, height: 1000 },
      document: { scrollWidth: 468, clientWidth: 390 },
    },
    {
      code: "layout_element_issue",
      element: {
        sectionId: "cards",
        sectionIndex: 2,
        toolId: "wide-card",
        toolIndexInSection: 1,
        dataSlot: "card",
        issues: ["outside-viewport-x"],
        rect: { left: 24, right: 468, width: 444, height: 200 },
        metrics: { scrollWidth: 444, clientWidth: 444 },
      },
    },
  ]);

  assert.equal(hints.length, 1);
  assert.equal(hints[0]?.factType, "section");
  assert.deepEqual(
    (hints[0]?.samples as Array<Record<string, unknown>>).map(
      (sample) => sample.issues,
    ),
    [["outside-viewport-x"], ["document-horizontal-overflow"]],
  );
});

test("keeps document overflow global only when no Section owner can be located", () => {
  const hints = buildLayoutRepairFacts([
    {
      code: "layout_horizontal_overflow",
      viewport: { width: 390, height: 1000 },
      document: { scrollWidth: 430, clientWidth: 390 },
    },
  ]);

  assert.equal(hints[0]?.code, "document-horizontal-overflow");
  assert.deepEqual(hints[0]?.samples, [{ overflowRight: 40 }]);
});

test("does not classify independent contrast fixes as structural", () => {
  const hints = buildLayoutRepairFacts([
    ...[1, 2].map((toolIndexInSection) => ({
      code: "layout_element_issue",
      element: {
        sectionIndex: 1,
        toolIndexInSection,
        dataSlot: "text",
        issues: ["low-text-contrast"],
        computed: { contrastRatio: 2, contrastThreshold: 4.5 },
        text: `Copy ${toolIndexInSection}`,
      },
    })),
  ]);

  assert.equal(hints[0]?.severity, "targeted");
});

test("routes viewport emulation failures away from JSX repair", () => {
  const hints = buildLayoutRepairFacts([
    {
      code: "browser_mobile_emulation_failed",
      message: "Requested 390x1000, got 524x1344",
    },
  ]);

  assert.equal(hints[0]?.code, "browser-viewport-environment-repair");
  assert.match((hints[0]?.nextActions as string[])[0] ?? "", /Do not edit JSX/);
});

test("routes pending images to browser readiness retry instead of JSX repair", () => {
  const hints = buildLayoutRepairFacts([
    {
      code: "browser_image_loading_timed_out",
      image: {
        dataSlot: "card-img",
        sectionId: "gallery",
        toolId: "gallery-card",
        sectionIndex: 4,
        toolIndexInSection: 2,
        slotIndexInTool: 1,
        src: "https://images.example.test/slow.jpg",
        issues: ["pending-image"],
      },
    },
  ]);

  assert.equal(hints[0]?.code, "browser-image-loading-retry");
  assert.equal(hints[0]?.severity, "environment");
  assert.match((hints[0]?.nextActions as string[])[0] ?? "", /Do not edit JSX/);
  assert.deepEqual(hints[0]?.samples, [
    {
      code: "browser_image_loading_timed_out",
      dataSlot: "card-img",
      sectionId: "gallery",
      toolId: "gallery-card",
      sectionIndex: 4,
      toolIndexInSection: 2,
      slotIndexInTool: 1,
      src: "https://images.example.test/slow.jpg",
      issues: ["pending-image"],
    },
  ]);
});

test("rejects resizing as a repair for hidden formatting-character filler", () => {
  const hints = buildLayoutRepairFacts([
    {
      code: "layout_element_issue",
      element: {
        sectionIndex: 2,
        toolIndexInSection: 0,
        dataSlot: "text",
        issues: ["zero-size", "text-overflow-y", "clipped-content-y"],
        metrics: { scrollHeight: 2, clientHeight: 0 },
        text: "Required copy\u200e\u200e\u200e",
      },
    },
  ]);

  assert.match(
    ((hints[0]?.nextActions as string[])[1] ?? ""),
    /Remove the artificial hidden/,
  );
});

test("does not recommend vertical repair for right-only grid overflow", () => {
  const hints = buildLayoutRepairFacts([
    {
      code: "layout_element_issue",
      element: {
        sectionIndex: 2,
        dataSlot: "section",
        issues: ["text-overflow-x", "section-grid-area-overflow"],
        metrics: { scrollWidth: 534, clientWidth: 390 },
      },
    },
    {
      code: "layout_grid_area_containment",
      gridAreaContainment: [
        {
          type: "section",
          issue: "section-grid-area-overflow",
          dataSlot: "section",
          sectionIndex: 2,
          overflow: { right: 143 },
        },
      ],
    },
  ]);

  const actions = hints[0]?.nextActions as string[];
  assert.ok(actions.some((action) => /Widen or reposition/.test(action)));
  assert.ok(actions.every((action) => !/row span|Section height/.test(action)));
});

test("keeps grid-area containment out of element scroll evidence", () => {
  const hints = buildLayoutRepairFacts([
    {
      code: "layout_element_issue",
      element: {
        sectionIndex: 2,
        toolIndexInSection: 1,
        dataSlot: "card",
        issues: [
          "text-overflow-y",
          "clipped-content-y",
          "tool-grid-area-overflow",
        ],
        metrics: { scrollHeight: 166, clientHeight: 120 },
      },
    },
    {
      code: "layout_grid_area_containment",
      gridAreaContainment: [
        {
          type: "tool",
          issue: "tool-grid-area-overflow",
          dataSlot: "card",
          sectionIndex: 2,
          toolIndexInSection: 1,
          overflow: { bottom: 16 },
        },
      ],
    },
  ]);

  assert.deepEqual(
    (hints[0]?.samples as Array<Record<string, unknown>>).map(
      (sample) => sample.issues ?? sample.issue,
    ),
    [
      ["text-overflow-y", "clipped-content-y"],
      "tool-grid-area-overflow",
    ],
  );
});

test("reports the allowed and excess unused Section space", () => {
  const hints = buildLayoutRepairFacts([
    {
      code: "layout_element_issue",
      element: {
        sectionIndex: 7,
        dataSlot: "section",
        issues: ["section-excessive-unused-space"],
        metrics: {
          unusedBottom: 164,
          excessiveUnusedSpaceThreshold: 160,
        },
      },
    },
  ]);

  assert.deepEqual(hints[0]?.samples, [
    {
      type: "element",
      dataSlot: "section",
      sectionIndex: 7,
      issues: ["section-excessive-unused-space"],
      unusedBottom: 164,
      allowedUnusedBottom: 160,
      excessUnusedBottom: 4,
    },
  ]);
});

test("retains all Section samples until model compaction computes counts", () => {
  const hints = buildLayoutRepairFacts(
    Array.from({ length: 10 }, (_, index) => ({
      code: "layout_element_issue",
      element: {
        sectionIndex: 3,
        sectionId: "cards",
        toolIndexInSection: index,
        toolId: `card-${index}`,
        dataSlot: "card",
        issues: ["clipped-content-y"],
        metrics: { scrollHeight: 120 + index, clientHeight: 100 },
      },
    })),
  );

  assert.equal((hints[0]?.samples as unknown[]).length, 10);
  assert.equal(hints[0]?.count, 10);
});
