import assert from "node:assert/strict";
import test from "node:test";

import {
  assertRecoveryArtifactDigest,
  assertRecoveryEnvelopeSize,
  buildDesignerRecoveryPrompt,
  type DesignerRecoveryEnvelope,
} from "../app/agentRecoveryContext.ts";

function envelope(): DesignerRecoveryEnvelope {
  return {
    version: 1,
    phase: "repair",
    userRequest: "Keep the user's full request",
    designSystem: { selected: false },
    workflowState: "repair_required",
    artifact: { path: "/workspace/output/page.jsx", digest: "digest" },
    recovery: { source: "review_candidate", message: "Repair it" },
    failedChecks: [{ code: "overflow", message: "Fix overflow" }],
    mustPreserve: [{ code: "brand", description: "Keep brand identity" }],
    currentRepairUnit: {
      issueCodes: ["overflow"],
      strategy: "Reduce width",
      acceptanceCriteria: ["No overflow"],
      prohibitedTactics: ["Do not hide overflow"],
    },
    remainingRepairUnitCount: 0,
    todos: [{ name: "Repair", status: "in_progress" }],
    nextAction: "Repair and verify",
  };
}

test("builds a self-contained fresh-session recovery prompt", () => {
  const prompt = buildDesignerRecoveryPrompt(envelope());
  assert.match(prompt, /Original user request — highest authority/);
  assert.match(prompt, /Keep the user's full request/);
  assert.match(prompt, /No design system was selected/);
  assert.doesNotMatch(prompt, /\/workspace\/design-system/);
  assert.match(prompt, /Do not rely on any previous conversation/);
});

test("fails oversized recovery envelopes instead of truncating them", () => {
  const value = envelope();
  value.userRequest = "x".repeat(20_000);
  assert.throws(() => assertRecoveryEnvelopeSize(value, 16_000), /recovery_envelope_too_large/);
  assert.equal(value.userRequest.length, 20_000);
});

test("rejects recovery detail bound to another artifact digest", () => {
  assert.throws(
    () => assertRecoveryArtifactDigest(envelope(), "different"),
    /recovery_artifact_digest_mismatch/,
  );
});
