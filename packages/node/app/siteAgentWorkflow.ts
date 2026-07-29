export type SiteAgentWorkflowState =
  | "authoring"
  | "repair_verification"
  | "ready_for_review"
  | "candidate_verification"
  | "visual_review"
  | "ready_for_done"
  | "delivery_commit"
  | "repair_required"
  | "accepted"
  | "fallback_delivered"
  | "blocked_external"
  | "terminal_rejected"
  | "clarification";

export type SiteAgentWorkflowEvent =
  | "start_repair_verification"
  | "repair_verification_passed"
  | "repair_verification_failed"
  | "repair_budget_exhausted"
  | "start_candidate_verification"
  | "start_visual_review"
  | "candidate_review_accepted"
  | "start_delivery_commit"
  | "delivery_failed_repairable"
  | "delivery_failed_terminal"
  | "delivery_accepted"
  | "fallback_delivery_committed"
  | "external_blocked"
  | "request_clarification";

const transitions: Record<
  SiteAgentWorkflowEvent,
  Partial<Record<SiteAgentWorkflowState, SiteAgentWorkflowState>>
> = {
  start_repair_verification: {
    authoring: "repair_verification",
    ready_for_review: "repair_verification",
    ready_for_done: "repair_verification",
    repair_required: "repair_verification",
  },
  repair_verification_passed: {
    repair_verification: "ready_for_review",
  },
  repair_verification_failed: {
    repair_verification: "repair_required",
  },
  repair_budget_exhausted: {
    repair_verification: "terminal_rejected",
  },
  start_candidate_verification: {
    ready_for_review: "candidate_verification",
  },
  start_visual_review: {
    candidate_verification: "visual_review",
  },
  candidate_review_accepted: {
    candidate_verification: "ready_for_done",
    visual_review: "ready_for_done",
  },
  start_delivery_commit: {
    ready_for_done: "delivery_commit",
  },
  delivery_failed_repairable: {
    candidate_verification: "repair_required",
    visual_review: "repair_required",
  },
  delivery_failed_terminal: {
    authoring: "terminal_rejected",
    repair_verification: "terminal_rejected",
    ready_for_review: "terminal_rejected",
    candidate_verification: "terminal_rejected",
    visual_review: "terminal_rejected",
    ready_for_done: "terminal_rejected",
    delivery_commit: "terminal_rejected",
    repair_required: "terminal_rejected",
  },
  delivery_accepted: {
    delivery_commit: "accepted",
  },
  fallback_delivery_committed: {
    delivery_commit: "fallback_delivered",
  },
  external_blocked: {
    repair_verification: "blocked_external",
  },
  request_clarification: {
    authoring: "clarification",
  },
};

export class InvalidSiteAgentWorkflowTransition extends Error {
  readonly state: SiteAgentWorkflowState;
  readonly event: SiteAgentWorkflowEvent;

  constructor(
    state: SiteAgentWorkflowState,
    event: SiteAgentWorkflowEvent,
  ) {
    super(`Invalid site-agent workflow transition: ${state} -> ${event}`);
    this.name = "InvalidSiteAgentWorkflowTransition";
    this.state = state;
    this.event = event;
  }
}

export function transitionSiteAgentWorkflow(
  state: SiteAgentWorkflowState,
  event: SiteAgentWorkflowEvent,
) {
  const next = transitions[event][state];
  if (!next) throw new InvalidSiteAgentWorkflowTransition(state, event);
  return next;
}
