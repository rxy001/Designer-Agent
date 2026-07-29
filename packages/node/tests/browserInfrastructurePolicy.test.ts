import assert from "node:assert/strict";
import test from "node:test";

import {
  getExternalVerificationBlockerCode,
  getInfrastructureBlockedViewports,
  isBrowserInfrastructureIssueCode,
} from "../app/browserInfrastructurePolicy.ts";

const viewports = ["desktop", "tablet", "mobile"] as const;

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
