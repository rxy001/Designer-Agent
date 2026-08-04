import assert from "node:assert/strict";
import test from "node:test";

import {
  getExternalVerificationBlockerCode,
  getInfrastructureBlockedViewports,
  isBrowserInfrastructureIssueCode,
} from "../app/browserInfrastructurePolicy.ts";
import {
  buildStaticInspectionToolResult,
  getBrowserMatrixNextAction,
  type BrowserMatrixInspection,
} from "../app/agent.ts";

const viewports = ["desktop", "tablet", "mobile"] as const;

test("reports a clean internal static gate pass explicitly", () => {
  assert.deepEqual(
    buildStaticInspectionToolResult({
      checkedAt: 1,
      ok: true,
      issues: [],
      warnings: [],
    }),
    { status: "passed" },
  );
});

test("blocks only the viewport whose browser evidence is unavailable", () => {
  assert.deepEqual(
    getInfrastructureBlockedViewports({
      availableViewports: viewports,
      issues: [
        { code: "layout_element_issue", viewport: "desktop" },
        { code: "browser_mobile_emulation_failed", viewport: "mobile" },
      ],
    }),
    ["mobile"],
  );
});

test("blocks the whole matrix for an unscoped infrastructure failure", () => {
  assert.deepEqual(
    getInfrastructureBlockedViewports({
      availableViewports: viewports,
      issues: [{ code: "verification_infrastructure_unavailable" }],
    }),
    viewports,
  );
});

test("does not classify page runtime failures as infrastructure", () => {
  assert.equal(isBrowserInfrastructureIssueCode("browser_runtime_failed"), false);
});

test("turns persistent infrastructure-only failures into external blockers", () => {
  assert.equal(
    getExternalVerificationBlockerCode([
      { code: "verification_infrastructure_unavailable" },
    ]),
    "browser_infrastructure_unavailable",
  );
  assert.equal(
    getExternalVerificationBlockerCode([
      { code: "browser_mobile_emulation_failed", viewport: "mobile" },
    ]),
    "viewport_emulation_unavailable",
  );
  assert.equal(
    getExternalVerificationBlockerCode([
      { code: "browser_image_loading_retry_exhausted", viewport: "mobile" },
    ]),
    "image_readiness_exhausted",
  );
});

test("keeps transient or mixed failures in the repair workflow", () => {
  assert.equal(
    getExternalVerificationBlockerCode([
      { code: "browser_image_loading_timed_out", viewport: "mobile" },
    ]),
    undefined,
  );
  assert.equal(
    getExternalVerificationBlockerCode([
      { code: "verification_infrastructure_unavailable" },
      { code: "layout_element_issue", viewport: "desktop" },
    ]),
    undefined,
  );
});

function browserInspection(
  blockingIssues: Array<Record<string, unknown>>,
): BrowserMatrixInspection {
  return {
    checkedAt: 1,
    artifactModifiedAt: 1,
    ok: false,
    mode: "repair",
    viewports: {
      desktop: {},
      tablet: {},
      mobile: {},
    },
    blockingIssues,
  } as unknown as BrowserMatrixInspection;
}

test("keeps layout repair viewports when the same viewports have readiness failures", () => {
  const inspection = browserInspection([
    { code: "browser_image_loading_timed_out", viewport: "desktop" },
    { code: "browser_image_loading_timed_out", viewport: "tablet" },
    { code: "layout_element_issue", viewport: "desktop" },
    { code: "layout_grid_area_containment", viewport: "tablet" },
    { code: "layout_horizontal_overflow", viewport: "mobile" },
  ]);

  assert.equal(
    getBrowserMatrixNextAction(inspection),
    "Fix JSX/CSS issues in desktop, tablet, mobile; retry browser readiness for desktop, tablet without changing JSX/CSS for those readiness failures; rerun verify_browser_matrix.",
  );
});

test("separates disjoint layout repairs from readiness retries", () => {
  const inspection = browserInspection([
    { code: "browser_image_loading_timed_out", viewport: "desktop" },
    { code: "browser_mobile_emulation_failed", viewport: "tablet" },
    { code: "layout_horizontal_overflow", viewport: "mobile" },
  ]);

  assert.equal(
    getBrowserMatrixNextAction(inspection),
    "Fix JSX/CSS issues in mobile; retry browser readiness for desktop, tablet without changing JSX/CSS for those readiness failures; rerun verify_browser_matrix.",
  );
});

test("keeps infrastructure-only nextAction concise", () => {
  const inspection = browserInspection([
    { code: "browser_image_loading_timed_out", viewport: "desktop" },
    { code: "browser_mobile_emulation_failed", viewport: "tablet" },
  ]);

  assert.equal(
    getBrowserMatrixNextAction(inspection),
    "Retry verify_browser_matrix for desktop, tablet after browser readiness recovers; do not change JSX/CSS for these blockers.",
  );
});

test("keeps an unscoped artifact repair actionable in a mixed failure", () => {
  const inspection = browserInspection([
    { code: "verification_infrastructure_unavailable", viewport: "desktop" },
    { code: "layout_element_issue" },
  ]);

  assert.equal(
    getBrowserMatrixNextAction(inspection),
    "Fix the reported JSX/CSS issues; retry browser readiness for desktop without changing JSX/CSS for those readiness failures; rerun verify_browser_matrix.",
  );
});
