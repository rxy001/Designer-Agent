import type { SiteAgentWorkflowState } from "./siteAgentWorkflow.ts";

export type PendingRepairContext = {
  path: string;
  source: "review_candidate" | "verify_browser_matrix";
  message: string;
  verificationReport?: unknown;
};

export function requiresWorkflowContinuation(
  state: SiteAgentWorkflowState,
) {
  return state === "repair_required";
}

export function buildWorkflowContinuationPrompt({
  state,
  pendingRepair,
  artifactPath,
}: {
  state: SiteAgentWorkflowState;
  pendingRepair?: PendingRepairContext;
  artifactPath?: string;
}) {
  const path = artifactPath ?? pendingRepair?.path;
  if (state === "repair_required") {
    return [
      "The previous turn ended while artifact repair was still required.",
      "Continue the same task now. Do not summarize, stop, or ask the user for another round while verification remains rejected.",
      path ? `Artifact: ${path}` : undefined,
      pendingRepair?.message,
      "Read the latest artifact, fix every remaining issue, and rerun verify_browser_matrix for all required viewports. Call review_candidate only after repair verification passes, and call done only after review_candidate accepts the unchanged candidate.",
      pendingRepair?.verificationReport === undefined
        ? undefined
        : "The compact active repair context is supplied by the orchestrator. Additional detail is available in /workspace/context when needed.",
    ]
      .filter((part): part is string => Boolean(part))
      .join("\n\n");
  }

  if (state === "ready_for_review") {
    return [
      "The previous turn ended after repair verification passed but before canonical candidate review completed.",
      "Continue the same task now. Call review_candidate for the unchanged verified artifact; do not summarize or stop. Call done only if review_candidate returns readyForDone: true.",
      path ? `Artifact: ${path}` : undefined,
    ]
      .filter((part): part is string => Boolean(part))
      .join("\n\n");
  }

  if (state === "ready_for_done") {
    return [
      "The previous turn ended after the candidate was accepted but before delivery was committed.",
      "Continue the same task now. Call done once with the unchanged accepted artifact; do not edit, summarize, or stop before committing it.",
      path ? `Artifact: ${path}` : undefined,
    ]
      .filter((part): part is string => Boolean(part))
      .join("\n\n");
  }

  throw new Error(`Workflow state ${state} does not require continuation.`);
}
