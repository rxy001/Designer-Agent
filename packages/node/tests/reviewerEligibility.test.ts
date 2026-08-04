import assert from "node:assert/strict";
import test from "node:test";

import { getReviewerEligibilityIssue } from "../app/reviewer/reviewerEligibility.ts";

test("starts Reviewer only after current static and three-viewport final verification", () => {
  const candidate = createEligibleCandidate();
  assert.equal(getReviewerEligibilityIssue(candidate), undefined);

  assert.match(
    getReviewerEligibilityIssue({ ...candidate, staticInspectionOk: false }) ??
      "",
    /static inspection/i,
  );
  assert.match(
    getReviewerEligibilityIssue({
      ...candidate,
      inspection: { ...candidate.inspection, mode: "repair" },
    }) ?? "",
    /final browser matrix/i,
  );
  assert.match(
    getReviewerEligibilityIssue({
      ...candidate,
      inspection: { ...candidate.inspection, artifactModifiedAt: 9 },
    }) ?? "",
    /changed after browser verification/i,
  );
});

test("rejects Reviewer when any required viewport is absent or failed", () => {
  const candidate = createEligibleCandidate();
  const { mobile: _mobile, ...withoutMobile } = candidate.inspection.viewports;
  assert.match(
    getReviewerEligibilityIssue({
      ...candidate,
      inspection: { ...candidate.inspection, viewports: withoutMobile },
    }) ?? "",
    /mobile/i,
  );

  assert.match(
    getReviewerEligibilityIssue({
      ...candidate,
      inspection: {
        ...candidate.inspection,
        viewports: {
          ...candidate.inspection.viewports,
          tablet: { runtime: { ok: true }, layout: { ok: false } },
        },
      },
    }) ?? "",
    /tablet/i,
  );
});

function createEligibleCandidate() {
  const passed = () => ({ runtime: { ok: true }, layout: { ok: true } });
  return {
    staticInspectionOk: true,
    artifactModifiedAt: 10,
    inspection: {
      ok: true,
      mode: "final" as const,
      artifactModifiedAt: 10,
      viewports: {
        desktop: passed(),
        tablet: passed(),
        mobile: passed(),
      },
    },
  };
}
