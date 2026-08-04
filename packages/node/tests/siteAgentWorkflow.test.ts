import assert from "node:assert/strict";
import test from "node:test";

import {
  InvalidSiteAgentWorkflowTransition,
  transitionSiteAgentWorkflow,
} from "../app/siteAgentWorkflow.ts";

test("drives a successful site generation through the canonical states", () => {
  let state = transitionSiteAgentWorkflow(
    "authoring",
    "start_repair_verification",
  );
  assert.equal(state, "repair_verification");
  state = transitionSiteAgentWorkflow(state, "repair_verification_passed");
  assert.equal(state, "ready_for_review");
  state = transitionSiteAgentWorkflow(state, "start_candidate_verification");
  assert.equal(state, "candidate_verification");
  state = transitionSiteAgentWorkflow(state, "start_visual_review");
  assert.equal(state, "visual_review");
  state = transitionSiteAgentWorkflow(state, "candidate_review_accepted");
  assert.equal(state, "ready_for_done");
  state = transitionSiteAgentWorkflow(state, "start_delivery_commit");
  assert.equal(state, "delivery_commit");
  state = transitionSiteAgentWorkflow(state, "delivery_accepted");
  assert.equal(state, "accepted");
});

test("accepts a direct content edit without repair or visual review states", () => {
  let state = transitionSiteAgentWorkflow(
    "authoring",
    "start_direct_verification",
  );
  assert.equal(state, "candidate_verification");
  state = transitionSiteAgentWorkflow(state, "candidate_review_accepted");
  assert.equal(state, "ready_for_done");
  state = transitionSiteAgentWorkflow(state, "start_delivery_commit");
  state = transitionSiteAgentWorkflow(state, "delivery_accepted");
  assert.equal(state, "accepted");
});

test("accepts a scoped local edit after one repair matrix without visual review", () => {
  let state = transitionSiteAgentWorkflow(
    "authoring",
    "start_repair_verification",
  );
  state = transitionSiteAgentWorkflow(state, "repair_verification_passed");
  state = transitionSiteAgentWorkflow(state, "start_candidate_verification");
  state = transitionSiteAgentWorkflow(state, "candidate_review_accepted");
  assert.equal(state, "ready_for_done");
  state = transitionSiteAgentWorkflow(state, "start_delivery_commit");
  state = transitionSiteAgentWorkflow(state, "delivery_accepted");
  assert.equal(state, "accepted");
});

test("does not let a direct edit bypass an existing repair requirement", () => {
  assert.throws(
    () =>
      transitionSiteAgentWorkflow(
        "repair_required",
        "start_direct_verification",
      ),
    InvalidSiteAgentWorkflowTransition,
  );
});

test("supports a repairable review rejection followed by another cycle", () => {
  let state = transitionSiteAgentWorkflow(
    "authoring",
    "start_repair_verification",
  );
  state = transitionSiteAgentWorkflow(state, "repair_verification_passed");
  state = transitionSiteAgentWorkflow(state, "start_candidate_verification");
  state = transitionSiteAgentWorkflow(state, "start_visual_review");
  state = transitionSiteAgentWorkflow(state, "delivery_failed_repairable");
  assert.equal(state, "repair_required");
  state = transitionSiteAgentWorkflow(state, "start_repair_verification");
  assert.equal(state, "repair_verification");
});

test("supports retry after an unexpected repair verification failure", () => {
  let state = transitionSiteAgentWorkflow(
    "authoring",
    "start_repair_verification",
  );
  state = transitionSiteAgentWorkflow(state, "repair_verification_failed");
  assert.equal(state, "repair_required");
  state = transitionSiteAgentWorkflow(state, "start_repair_verification");
  assert.equal(state, "repair_verification");
});

test("requires a passing repair verification before final verification", () => {
  assert.throws(
    () =>
      transitionSiteAgentWorkflow("authoring", "start_candidate_verification"),
    InvalidSiteAgentWorkflowTransition,
  );
  assert.throws(
    () =>
      transitionSiteAgentWorkflow(
        "repair_required",
        "start_candidate_verification",
      ),
    InvalidSiteAgentWorkflowTransition,
  );
});

test("repair budget exhaustion is terminal", () => {
  const state = transitionSiteAgentWorkflow(
    "repair_verification",
    "repair_budget_exhausted",
  );
  assert.equal(state, "terminal_rejected");
});

test("ends the current run normally when verification is externally blocked", () => {
  const state = transitionSiteAgentWorkflow(
    "repair_verification",
    "external_blocked",
  );
  assert.equal(state, "blocked_external");
  assert.throws(
    () => transitionSiteAgentWorkflow(state, "start_candidate_verification"),
    InvalidSiteAgentWorkflowTransition,
  );
});

test("last failed review transitions directly to terminal rejection", () => {
  let state = transitionSiteAgentWorkflow(
    "ready_for_review",
    "start_candidate_verification",
  );
  state = transitionSiteAgentWorkflow(state, "start_visual_review");
  state = transitionSiteAgentWorkflow(state, "delivery_failed_terminal");
  assert.equal(state, "terminal_rejected");
});

test("stages and commits the strongest reviewed artifact as a fallback", () => {
  let state = transitionSiteAgentWorkflow(
    "ready_for_review",
    "start_candidate_verification",
  );
  state = transitionSiteAgentWorkflow(state, "start_visual_review");
  state = transitionSiteAgentWorkflow(state, "candidate_review_accepted");
  state = transitionSiteAgentWorkflow(state, "start_delivery_commit");
  state = transitionSiteAgentWorkflow(state, "fallback_delivery_committed");
  assert.equal(state, "fallback_delivered");
});

test("rejects impossible transitions out of terminal states", () => {
  for (const state of [
    "accepted",
    "fallback_delivered",
    "blocked_external",
    "terminal_rejected",
    "clarification",
  ] as const) {
    assert.throws(
      () => transitionSiteAgentWorkflow(state, "start_repair_verification"),
      InvalidSiteAgentWorkflowTransition,
    );
    assert.throws(
      () =>
        transitionSiteAgentWorkflow(state, "start_candidate_verification"),
      InvalidSiteAgentWorkflowTransition,
    );
  }
});

test("rejects visual review before canonical final verification", () => {
  assert.throws(
    () => transitionSiteAgentWorkflow("authoring", "start_visual_review"),
    InvalidSiteAgentWorkflowTransition,
  );
});

test("invalidates a reviewed candidate when repair verification runs again", () => {
  assert.equal(
    transitionSiteAgentWorkflow("ready_for_done", "start_repair_verification"),
    "repair_verification",
  );
});
