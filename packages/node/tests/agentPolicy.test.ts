import assert from "node:assert/strict";
import test from "node:test";
import { agentConfig } from "../app/agentConfig.ts";

import {
  describeFinalVisualBudget,
  getFinalVerificationBlock,
  inspectBudget,
  isTerminalDoneIssueCode,
  shouldBlockUnchangedArtifact,
  shouldAttemptAcceptanceRecovery,
  shouldRejectExcellenceReview,
  shouldRefreshRepairBudgetAfterReview,
  shouldChargeRepairRequest,
  shouldTerminallyRejectFailedVisualReview,
} from "../app/agentPolicy.ts";

test("does not reject delivery when Excellence review infrastructure is unavailable", () => {
  assert.equal(
    shouldRejectExcellenceReview({
      infrastructureFailure: true,
      issueCount: 1,
    }),
    false,
  );
  assert.equal(
    shouldRejectExcellenceReview({
      infrastructureFailure: false,
      issueCount: 1,
    }),
    true,
  );
  assert.equal(
    shouldRejectExcellenceReview({
      infrastructureFailure: false,
      issueCount: 0,
    }),
    false,
  );
});

test("refreshes repair budget only after a newly executed failed review", () => {
  assert.equal(
    shouldRefreshRepairBudgetAfterReview({
      executed: true,
      infrastructureFailure: false,
      issueCount: 2,
    }),
    true,
  );
  assert.equal(
    shouldRefreshRepairBudgetAfterReview({
      executed: false,
      infrastructureFailure: false,
      issueCount: 2,
    }),
    false,
  );
  assert.equal(
    shouldRefreshRepairBudgetAfterReview({
      executed: true,
      infrastructureFailure: true,
      issueCount: 1,
    }),
    false,
  );
});

test("reports remaining budget without going negative", () => {
  assert.deepEqual(inspectBudget(2, 3), {
    allowed: true,
    used: 2,
    remaining: 1,
    limit: 3,
  });
  assert.deepEqual(inspectBudget(4, 3), {
    allowed: false,
    used: 4,
    remaining: 0,
    limit: 3,
  });
});

test("charges repair budget only for a new infrastructure-valid matrix", () => {
  assert.equal(
    shouldChargeRepairRequest({
      cacheHit: false,
      infrastructureBlocked: false,
    }),
    true,
  );
  assert.equal(
    shouldChargeRepairRequest({ cacheHit: true, infrastructureBlocked: false }),
    false,
  );
  assert.equal(
    shouldChargeRepairRequest({ cacheHit: false, infrastructureBlocked: true }),
    false,
  );
});

test("treats exhausted verification budgets as terminal rejections", () => {
  assert.equal(isTerminalDoneIssueCode("final_visual_budget_exhausted"), true);
  assert.equal(isTerminalDoneIssueCode("repair_budget_exhausted"), true);
  assert.equal(
    shouldAttemptAcceptanceRecovery({
      recoveryAttempt: 0,
      maxAcceptanceRecoveries: 1,
      terminal: true,
      finalVisualRuns: 0,
      maxFinalVisualRuns: 2,
    }),
    false,
  );
});

test("requires a current passing repair artifact before final verification", () => {
  assert.equal(
    getFinalVerificationBlock({
      workflowState: "authoring",
      currentDigest: "current",
    }),
    "repair_verification_required",
  );
  assert.equal(
    getFinalVerificationBlock({
      workflowState: "ready_for_review",
      currentDigest: "changed",
      verifiedDigest: "verified",
      verificationMode: "repair",
      verificationOk: true,
    }),
    "repair_verification_stale",
  );
  assert.equal(
    getFinalVerificationBlock({
      workflowState: "ready_for_review",
      currentDigest: "same",
      verifiedDigest: "same",
      verificationMode: "final",
      verificationOk: true,
    }),
    "repair_verification_required",
  );
  assert.equal(
    getFinalVerificationBlock({
      workflowState: "ready_for_review",
      currentDigest: "same",
      verifiedDigest: "same",
      verificationMode: "repair",
      verificationOk: true,
    }),
    undefined,
  );
});

test("allows bounded acceptance recovery for recoverable rejections", () => {
  assert.equal(
    shouldAttemptAcceptanceRecovery({
      recoveryAttempt: 0,
      maxAcceptanceRecoveries: 1,
      terminal: false,
      finalVisualRuns: 1,
      maxFinalVisualRuns: 2,
    }),
    true,
  );
  assert.equal(
    shouldAttemptAcceptanceRecovery({
      recoveryAttempt: 1,
      maxAcceptanceRecoveries: 1,
      terminal: false,
      finalVisualRuns: 1,
      maxFinalVisualRuns: 2,
    }),
    false,
  );
});

test("does not gate acceptance recovery on visual budget when review is disabled", () => {
  assert.equal(
    shouldAttemptAcceptanceRecovery({
      recoveryAttempt: 0,
      maxAcceptanceRecoveries: 1,
      terminal: false,
      finalVisualRuns: 2,
      maxFinalVisualRuns: 2,
      reviewerCritiqueEnabled: false,
    }),
    true,
  );
});

test("forbids the impossible recovery state when no visual review remains", () => {
  assert.equal(
    shouldAttemptAcceptanceRecovery({
      recoveryAttempt: 0,
      maxAcceptanceRecoveries: 1,
      terminal: false,
      finalVisualRuns: 2,
      maxFinalVisualRuns: 2,
    }),
    false,
  );
  assert.equal(
    describeFinalVisualBudget(2, 2),
    "No independent visual-review attempts remain.",
  );
  assert.equal(
    describeFinalVisualBudget(1, 3),
    "2 independent visual-review attempt(s) remain.",
  );
});

test("makes the last failed visual review terminal immediately", () => {
  assert.equal(
    shouldTerminallyRejectFailedVisualReview({
      infrastructureFailure: false,
      finalVisualRuns: 2,
      maxFinalVisualRuns: 2,
    }),
    true,
  );
  assert.equal(
    shouldTerminallyRejectFailedVisualReview({
      infrastructureFailure: false,
      finalVisualRuns: 1,
      maxFinalVisualRuns: 2,
    }),
    false,
  );
  assert.equal(
    shouldTerminallyRejectFailedVisualReview({
      infrastructureFailure: true,
      finalVisualRuns: 2,
      maxFinalVisualRuns: 2,
    }),
    false,
  );
});

test("requires an artifact change after a deterministic failed verification", () => {
  assert.equal(
    shouldBlockUnchangedArtifact({
      previousDigest: "same",
      currentDigest: "same",
      previousFailed: true,
      infrastructureFailure: false,
    }),
    true,
  );
  assert.equal(
    shouldBlockUnchangedArtifact({
      previousDigest: "same",
      currentDigest: "changed",
      previousFailed: true,
      infrastructureFailure: false,
    }),
    false,
  );
  assert.equal(
    shouldBlockUnchangedArtifact({
      previousDigest: "same",
      currentDigest: "same",
      previousFailed: true,
      infrastructureFailure: true,
    }),
    false,
  );
});
