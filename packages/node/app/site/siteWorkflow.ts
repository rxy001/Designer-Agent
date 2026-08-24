export type SiteWorkflowState =
  | "planning"
  | "awaiting_plan_approval"
  | "acquiring_lock"
  | "generating_shell"
  | "generating_pages"
  | "page_repair_required"
  | "shell_repair_required"
  | "site_projection"
  | "site_review"
  | "site_repair_required"
  | "awaiting_reduced_plan_approval"
  | "ready_for_prepare"
  | "waiting_client_ready"
  | "committing"
  | "accepted"
  | "cancelled"
  | "blocked_external"
  | "terminal_rejected";

export type SiteWorkflowEvent =
  | "plan_proposed"
  | "plan_approved"
  | "lock_acquired"
  | "shell_generated"
  | "pages_generated"
  | "page_repair_requested"
  | "shell_repair_requested"
  | "projection_ready"
  | "review_started"
  | "site_repair_requested"
  | "reduced_plan_requested"
  | "reduced_plan_approved"
  | "prepare_ready"
  | "prepare_sent"
  | "client_ready"
  | "commit_accepted"
  | "cancel"
  | "external_blocked"
  | "reject";

const transitions: Record<SiteWorkflowEvent, Partial<Record<SiteWorkflowState, SiteWorkflowState>>> = {
  plan_proposed: { planning: "awaiting_plan_approval" },
  plan_approved: { awaiting_plan_approval: "acquiring_lock" },
  // Shell and page workers start in parallel after the lock is acquired.
  lock_acquired: { acquiring_lock: "generating_pages" },
  shell_generated: { generating_shell: "generating_pages", shell_repair_required: "generating_pages" },
  pages_generated: { generating_pages: "site_projection", page_repair_required: "site_projection" },
  page_repair_requested: { generating_pages: "page_repair_required", site_review: "page_repair_required" },
  shell_repair_requested: { generating_pages: "shell_repair_required", site_review: "shell_repair_required" },
  projection_ready: { site_projection: "site_review" },
  review_started: { site_projection: "site_review" },
  site_repair_requested: { site_review: "site_repair_required" },
  reduced_plan_requested: { generating_pages: "awaiting_reduced_plan_approval", site_review: "awaiting_reduced_plan_approval", site_repair_required: "awaiting_reduced_plan_approval" },
  reduced_plan_approved: { awaiting_reduced_plan_approval: "generating_pages" },
  prepare_ready: { site_review: "ready_for_prepare" },
  prepare_sent: { ready_for_prepare: "waiting_client_ready" },
  client_ready: { waiting_client_ready: "committing" },
  commit_accepted: { committing: "accepted" },
  cancel: allNonTerminal("cancelled"),
  external_blocked: allNonTerminal("blocked_external"),
  reject: allNonTerminal("terminal_rejected"),
};

function allNonTerminal(next: SiteWorkflowState) {
  return Object.fromEntries(
    [
      "planning", "awaiting_plan_approval", "acquiring_lock", "generating_shell",
      "generating_pages", "page_repair_required", "shell_repair_required",
      "site_projection", "site_review", "site_repair_required",
      "awaiting_reduced_plan_approval", "ready_for_prepare",
      "waiting_client_ready", "committing",
    ].map((state) => [state, next]),
  ) as Partial<Record<SiteWorkflowState, SiteWorkflowState>>;
}

export function transitionSiteWorkflow(state: SiteWorkflowState, event: SiteWorkflowEvent) {
  const next = transitions[event][state];
  if (!next) throw new Error(`Invalid site workflow transition: ${state} -> ${event}`);
  return next;
}

export function isTerminalSiteWorkflowState(state: SiteWorkflowState) {
  return ["accepted", "cancelled", "blocked_external", "terminal_rejected"].includes(state);
}
