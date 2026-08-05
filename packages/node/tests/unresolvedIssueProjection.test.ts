import assert from "node:assert/strict";
import test from "node:test";

import { buildLayoutRepairFacts } from "../app/layoutRepairFacts.ts";
import { compactBrowserMatrixRepairFacts } from "../app/repairPolicy.ts";
import { projectUnresolvedIssues } from "../app/unresolvedIssueProjection.ts";

const resolvedLayout = {
  width: 640,
  height: 480,
  borderBoxWidth: 640,
  borderBoxHeight: 480,
  contentWidth: 608,
  contentHeight: 448,
  paddingTop: 16,
  paddingRight: 16,
  paddingBottom: 16,
  paddingLeft: 16,
  rowGap: 8,
  columnGap: 12,
  rowTrackParsing: "resolved",
  columnTrackParsing: "resolved",
  rowTrackSizes: [100, 100],
  columnTrackSizes: [292, 292],
  uniformRowTrackSize: 100,
  uniformColumnTrackSize: 292,
  rows: 2,
  columns: 2,
  authored: {
    source: "active-inline-style",
    height: 480,
    width: 640,
    rows: 2,
    columns: 2,
    rowGap: 8,
    columnGap: 12,
  },
};

const sectionTools = [
  {
    toolId: "guide",
    toolIndexInSection: 1,
    dataSlot: "text",
    visible: true,
    gridArea: { rowStart: 1, rowEnd: 2, columnStart: 1, columnEnd: 2 },
    rect: { top: 16.04, left: 16.06, width: 292.02, height: 100.01 },
  },
  {
    toolId: "image",
    toolIndexInSection: 2,
    dataSlot: "image",
    visible: false,
    gridArea: { rowStart: 1, rowEnd: 3, columnStart: 2, columnEnd: 3 },
    rect: { top: 16, left: 320, width: 292, height: 208 },
  },
];

test("returns one Section across all three viewports and queues every other Section", () => {
  const result = projectUnresolvedIssues({
    facts: [
      {
        affectedViewports: ["tablet", "mobile"],
        scope: { sectionId: "content", sectionIndex: 1 },
        samples: [
          { viewport: "tablet", issues: ["text_overflow_y"], target: { toolId: "guide" } },
          { viewport: "mobile", issues: ["low-text-contrast"], target: { toolId: "guide" } },
        ],
      },
      {
        affectedViewports: ["mobile"],
        scope: { sectionId: "footer", sectionIndex: 2 },
        samples: [{ issues: ["clipped-content-y"], target: { toolId: "links" } }],
      },
    ],
    viewports: {
      desktop: { sections: [
        { sectionId: "content", sectionIndex: 1, layout: resolvedLayout, tools: sectionTools },
        { sectionId: "footer", sectionIndex: 2, layout: resolvedLayout, tools: [{ toolId: "unselected-footer-tool", visible: true }] },
      ] },
      tablet: { sections: [
        { sectionId: "content", sectionIndex: 1, layout: resolvedLayout, tools: sectionTools },
        { sectionId: "footer", sectionIndex: 2, layout: resolvedLayout, tools: [{ toolId: "unselected-footer-tool", visible: true }] },
      ] },
      mobile: { sections: [
        { sectionId: "content", sectionIndex: 1, layout: resolvedLayout, tools: sectionTools },
        { sectionId: "footer", sectionIndex: 2, layout: resolvedLayout, tools: [{ toolId: "unselected-footer-tool", visible: true }] },
      ] },
    },
  });

  assert.equal(result?.section?.sectionId, "content");
  assert.equal(result?.viewports.desktop.status, "passed");
  assert.equal(result?.viewports.tablet.status, "failed");
  assert.equal(result?.viewports.mobile.status, "failed");
  assert.deepEqual(result?.section?.tools, [
    {
      toolId: "guide",
      toolIndexInSection: 1,
      dataSlot: "text",
      viewports: {
        desktop: {
          visible: true,
          gridArea: { rowStart: 1, rowEnd: 2, columnStart: 1, columnEnd: 2 },
          rect: { top: 16.04, left: 16.06, width: 292.02, height: 100.01 },
        },
        tablet: {
          visible: true,
          gridArea: { rowStart: 1, rowEnd: 2, columnStart: 1, columnEnd: 2 },
          rect: { top: 16.04, left: 16.06, width: 292.02, height: 100.01 },
        },
        mobile: {
          visible: true,
          gridArea: { rowStart: 1, rowEnd: 2, columnStart: 1, columnEnd: 2 },
          rect: { top: 16.04, left: 16.06, width: 292.02, height: 100.01 },
        },
      },
    },
    {
      toolId: "image",
      toolIndexInSection: 2,
      dataSlot: "image",
      viewports: {
        desktop: {
          visible: false,
          gridArea: { rowStart: 1, rowEnd: 3, columnStart: 2, columnEnd: 3 },
          rect: { top: 16, left: 320, width: 292, height: 208 },
        },
        tablet: {
          visible: false,
          gridArea: { rowStart: 1, rowEnd: 3, columnStart: 2, columnEnd: 3 },
          rect: { top: 16, left: 320, width: 292, height: 208 },
        },
        mobile: {
          visible: false,
          gridArea: { rowStart: 1, rowEnd: 3, columnStart: 2, columnEnd: 3 },
          rect: { top: 16, left: 320, width: 292, height: 208 },
        },
      },
    },
  ]);
  assert.equal(JSON.stringify(result).includes("unselected-footer-tool"), false);
  assert.deepEqual(result?.viewports.tablet.issues.map((issue) => issue.code), ["content-scroll-overflow-y"]);
  assert.deepEqual(result?.remainingSections, [{
    sectionId: "footer",
    sectionIndex: 2,
    failedViewports: ["mobile"],
    issueCount: 1,
    codes: ["clipped-content-y"],
  }]);
});

test("does not truncate codes or targets and only emits occurrenceCount for duplicate occurrences", () => {
  const targets = Array.from({ length: 7 }, (_, index) => ({
    issues: ["clipped-content-y"],
    target: { toolId: `card-${index}` },
    measurements: { scrollVsClient: { bottom: index + 1 } },
  }));
  const result = projectUnresolvedIssues({
    facts: [{ affectedViewports: ["mobile"], scope: { sectionId: "cards" }, samples: [...targets, targets[0]] }],
  });
  const issue = result?.viewports.mobile.issues[0];
  assert.equal(issue?.targets.length, 7);
  assert.equal(issue?.occurrenceCount, 8);
  assert.equal(JSON.stringify(result).includes("omitted"), false);
  assert.equal(JSON.stringify(result).includes("problem"), false);
});

test("aggregates Tool snapshots by identity and keeps missing viewports absent", () => {
  const result = projectUnresolvedIssues({
    facts: [{
      affectedViewports: ["mobile"],
      scope: { sectionId: "hero", sectionIndex: 1 },
      samples: [{ issues: ["clipped-content-y"], target: { toolId: "copy" } }],
    }],
    viewports: {
      desktop: {
        sections: [{
          sectionId: "hero",
          sectionIndex: 1,
          tools: [{
            toolId: "copy",
            toolIndexInSection: 1,
            dataSlot: "text",
            visible: true,
            gridArea: { rowStart: 1, rowEnd: 2, columnStart: 1, columnEnd: 3 },
          }],
        }],
      },
      tablet: { sections: [{ sectionId: "hero", sectionIndex: 1, tools: [] }] },
      mobile: {
        sections: [{
          sectionId: "hero",
          sectionIndex: 1,
          tools: [{
            toolId: "copy",
            toolIndexInSection: 1,
            dataSlot: "text",
            visible: true,
            gridArea: { rowStart: 2, rowEnd: 4, columnStart: 1, columnEnd: 2 },
          }],
        }],
      },
    },
  });

  assert.deepEqual(result?.section?.tools, [{
    toolId: "copy",
    toolIndexInSection: 1,
    dataSlot: "text",
    viewports: {
      desktop: {
        visible: true,
        gridArea: { rowStart: 1, rowEnd: 2, columnStart: 1, columnEnd: 3 },
      },
      mobile: {
        visible: true,
        gridArea: { rowStart: 2, rowEnd: 4, columnStart: 1, columnEnd: 2 },
      },
    },
  }]);
});

test("keeps occurrence counts isolated by viewport", () => {
  const result = projectUnresolvedIssues({
    facts: [
      {
        affectedViewports: ["tablet"],
        scope: { sectionId: "cards" },
        issueCounts: { "clipped-content-y": 2 },
        samples: [{ viewport: "tablet", issues: ["clipped-content-y"], target: { toolId: "card" } }],
      },
      {
        affectedViewports: ["mobile"],
        scope: { sectionId: "cards" },
        issueCounts: { "clipped-content-y": 10 },
        samples: [{ viewport: "mobile", issues: ["clipped-content-y"], target: { toolId: "card" } }],
      },
    ],
  });

  assert.equal(result?.viewports.tablet.issues[0]?.occurrenceCount, 2);
  assert.equal(result?.viewports.mobile.issues[0]?.occurrenceCount, 10);
});

test("selects the highest-priority Section instead of the first input scope", () => {
  const result = projectUnresolvedIssues({
    facts: [
      {
        affectedViewports: ["mobile"],
        scope: { sectionId: "low-priority", sectionIndex: 1 },
        samples: [
          {
            issues: ["low-text-contrast"],
            target: { toolId: "caption" },
          },
        ],
      },
      {
        affectedViewports: ["mobile"],
        scope: { sectionId: "overflow-owner", sectionIndex: 4 },
        samples: [
          {
            issues: ["document-horizontal-overflow"],
            target: { toolId: "wide-card" },
          },
        ],
      },
    ],
  });

  assert.equal(result?.section?.sectionId, "overflow-owner");
  assert.equal(result?.remainingSections[0]?.sectionId, "low-priority");
});

test("uses page order as a stable tie-breaker for equal-priority Sections", () => {
  const result = projectUnresolvedIssues({
    facts: [
      {
        affectedViewports: ["mobile"],
        scope: { sectionId: "later", sectionIndex: 5 },
        samples: [{ issues: ["clipped-content-y"], target: {} }],
      },
      {
        affectedViewports: ["mobile"],
        scope: { sectionId: "earlier", sectionIndex: 2 },
        samples: [{ issues: ["clipped-content-y"], target: {} }],
      },
    ],
  });

  assert.equal(result?.section?.sectionId, "earlier");
});

test("compacts duplicate layout fields and represents tracks as a discriminated union", () => {
  const result = projectUnresolvedIssues({
    facts: [{
      affectedViewports: ["desktop"],
      scope: { sectionId: "hero" },
      layout: resolvedLayout,
      samples: [{ issues: ["section-excessive-unused-space"], target: {} }],
    }],
  });
  const layout = result?.viewports.desktop.layout as Record<string, any>;
  assert.deepEqual(layout.computed.borderBox, { width: 640, height: 480 });
  assert.deepEqual(layout.computed.rows, { status: "resolved", count: 2, kind: "uniform", size: 100, gap: 8 });
  assert.equal(layout.computed.width, undefined);
  assert.equal(layout.authored.width, undefined);
  assert.equal(layout.computed.trackSize, undefined);
});

test("keeps cross-Section dependencies on the repair unit and targets without duplicating layout groups", () => {
  const result = projectUnresolvedIssues({
    facts: [{
      affectedViewports: ["desktop"],
      scope: { sectionId: "hero", sectionIndex: 1 },
      samples: [{
        issues: ["unintended-overlap"],
        target: { toolId: "title" },
        relatedTargets: [{ sectionId: "details", sectionIndex: 2, toolId: "card" }],
      }],
    }],
  });
  assert.equal(result?.reason, "cross-section-overlap");
  assert.deepEqual(result?.relatedSections, [{ sectionId: "details", sectionIndex: 2 }]);
  assert.deepEqual(result?.viewports.desktop.issues[0]?.targets[0]?.relatedTargets, [{
    sectionId: "details", sectionIndex: 2, toolId: "card",
  }]);
});

test("supports document-level ownership requests without inventing a Section", () => {
  const result = projectUnresolvedIssues({
    facts: [{ code: "document_horizontal_overflow", affectedViewports: ["tablet", "mobile"] }],
  });
  assert.equal(result?.scope, "document");
  assert.equal(result?.section, undefined);
  assert.equal(result?.reason, "document-overflow-owner");
  assert.equal(result?.viewports.tablet.issues[0]?.code, "document-horizontal-overflow");
});

test("preserves a located document overflow owner through fact compaction and projection", () => {
  const facts = compactBrowserMatrixRepairFacts(
    buildLayoutRepairFacts([
      {
        code: "layout_horizontal_overflow",
        viewport: { width: 390, height: 1000 },
        document: { scrollWidth: 450, clientWidth: 390 },
      },
      {
        code: "layout_element_issue",
        element: {
          sectionId: "cards",
          sectionIndex: 2,
          toolId: "wide-card",
          dataSlot: "card",
          issues: ["outside-viewport-x"],
          rect: { left: 20, right: 450, width: 430, height: 200 },
          metrics: { scrollWidth: 430, clientWidth: 430 },
        },
      },
    ]).map((fact) => ({ ...fact, viewport: "mobile" })),
  );
  const result = projectUnresolvedIssues({ facts });

  assert.equal(result?.scope, "section");
  assert.equal(result?.section?.sectionId, "cards");
  assert.deepEqual(result?.viewports.mobile.issues.map((issue) => issue.code), [
    "outside-viewport-x",
    "document-horizontal-overflow",
  ]);
  assert.deepEqual(
    result?.viewports.mobile.issues[1]?.targets[0]?.evidence?.overflow,
    { right: 60 },
  );
});

test("projects the active structural unused-space threshold", () => {
  const facts = compactBrowserMatrixRepairFacts(
    buildLayoutRepairFacts([
      {
        code: "layout_element_issue",
        element: {
          sectionId: "editorial-section",
          sectionIndex: 5,
          dataSlot: "section",
          issues: ["section-excessive-unused-space"],
          metrics: {
            unusedBottom: 271,
            excessiveUnusedSpaceThreshold: 308,
            unusedTrailingRows: 2,
            minimumStructuralTrailingRows: 2,
            structuralUnusedSpaceThreshold: 240,
            sectionRows: 11,
            maximumUsedRowEnd: 10,
            unusedSpaceDetection: "empty-grid-rows",
          },
        },
      },
    ]).map((fact) => ({ ...fact, viewport: "mobile" })),
  );
  const result = projectUnresolvedIssues({ facts });

  assert.deepEqual(
    result?.viewports.mobile.issues[0]?.targets[0]?.evidence,
    {
      unusedBottom: 271,
      allowedUnusedBottom: 240,
      excessUnusedBottom: 31,
      unusedTrailingRows: 2,
      minimumTrailingRows: 2,
      sectionRows: 11,
      maximumUsedRowEnd: 10,
      unusedSpaceDetection: "empty-grid-rows",
    },
  );
});

test("keeps document and unlocated scopes separate without preempting an actionable Section", () => {
  const result = projectUnresolvedIssues({
    facts: [
      { code: "document-horizontal-overflow", affectedViewports: ["mobile"] },
      { code: "unlocated-layout-issue", affectedViewports: ["tablet"] },
      {
        affectedViewports: ["desktop"],
        scope: { sectionId: "hero", sectionIndex: 1 },
        samples: [{ issues: ["low-text-contrast"], target: { toolId: "title" } }],
      },
    ],
  });

  assert.equal(result?.scope, "section");
  assert.equal(result?.section?.sectionId, "hero");
  assert.deepEqual(result?.remainingScopes, [
    {
      scope: "document",
      failedViewports: ["mobile"],
      issueCount: 1,
      codes: ["document-horizontal-overflow"],
    },
    {
      scope: "unlocated",
      failedViewports: ["tablet"],
      issueCount: 1,
      codes: ["unlocated-layout-issue"],
    },
  ]);
});

test("unifies Section and Tool grid containment under one model-facing code", () => {
  const result = projectUnresolvedIssues({
    facts: [{
      affectedViewports: ["mobile"],
      scope: { sectionId: "content" },
      samples: [
        { issues: ["section-grid-area-overflow"], target: {} },
        { issues: ["tool-grid-area-overflow"], target: { toolId: "card" } },
      ],
    }],
  });
  assert.deepEqual(result?.viewports.mobile.issues.map((issue) => issue.code), ["grid-area-overflow"]);
  assert.equal(result?.viewports.mobile.issues[0]?.targets.length, 2);
});
