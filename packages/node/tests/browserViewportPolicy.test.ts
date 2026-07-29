import assert from "node:assert/strict";
import test from "node:test";

import {
  buildViewportSizeIssues,
  selectRepairViewportNames,
} from "../app/browserViewportPolicy.ts";

const allViewports = ["desktop", "tablet", "mobile"] as const;

test("preserves the original unverified scope after a preflight failure", () => {
  assert.deepEqual(
    selectRepairViewportNames({
      all: allViewports,
      requested: ["tablet"],
      affected: ["tablet"],
      pending: ["desktop", "tablet", "mobile"],
    }),
    ["desktop", "tablet", "mobile"],
  );
});

test("allows targeted repair after valid browser evidence exists", () => {
  assert.deepEqual(
    selectRepairViewportNames({
      all: allViewports,
      requested: ["tablet"],
      affected: ["tablet"],
    }),
    ["tablet"],
  );
});

test("forces all viewports after a Section artifact change", () => {
  assert.deepEqual(
    selectRepairViewportNames({
      all: allViewports,
      requested: ["tablet"],
      affected: ["tablet"],
      forceAll: true,
    }),
    ["desktop", "tablet", "mobile"],
  );
});

const mobile = {
  name: "mobile",
  width: 390,
  height: 1000,
  emulateViewport: "390x1000x2,mobile,touch",
};

test("rejects a clamped desktop layout viewport as failed mobile emulation", () => {
  const issues = buildViewportSizeIssues(
    {
      innerWidth: 524,
      innerHeight: 1344,
      clientWidth: 524,
      clientHeight: 1344,
      visualViewportWidth: 524,
      visualViewportHeight: 1344,
      devicePixelRatio: 1,
    },
    mobile,
  );

  assert.equal(issues[0]?.code, "browser_mobile_emulation_failed");
});

test("accepts mobile when client, visual viewport, and DPR match", () => {
  const issues = buildViewportSizeIssues(
    {
      innerWidth: 390,
      innerHeight: 1000,
      clientWidth: 390,
      clientHeight: 1000,
      visualViewportWidth: 390,
      visualViewportHeight: 1000,
      devicePixelRatio: 2,
    },
    mobile,
  );

  assert.deepEqual(issues, []);
});

test("treats expanded mobile inner viewport as page overflow, not emulation failure", () => {
  const issues = buildViewportSizeIssues(
    {
      innerWidth: 529,
      innerHeight: 1357,
      clientWidth: 390,
      clientHeight: 1000,
      visualViewportWidth: 390,
      visualViewportHeight: 1000,
      devicePixelRatio: 2,
    },
    mobile,
  );

  assert.deepEqual(issues, []);
});
