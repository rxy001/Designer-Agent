export function inspectBudget(used: number, limit: number) {
  return {
    allowed: used < limit,
    used,
    remaining: Math.max(0, limit - used),
    limit,
  };
}

export function shouldChargeRepairRequest({
  cacheHit,
  infrastructureBlocked,
}: {
  cacheHit: boolean;
  infrastructureBlocked: boolean;
}) {
  return !cacheHit && !infrastructureBlocked;
}

const terminalDoneIssueCodes = new Set([
  "final_visual_budget_exhausted",
  "repair_budget_exhausted",
]);

export function isTerminalDoneIssueCode(code: string | undefined) {
  return (
    code !== undefined && terminalDoneIssueCodes.has(code.replaceAll("-", "_"))
  );
}

export function getFinalVerificationBlock({
  workflowState,
  currentDigest,
  verifiedDigest,
  verificationMode,
  verificationOk,
}: {
  workflowState: string;
  currentDigest: string;
  verifiedDigest?: string;
  verificationMode?: "repair" | "final";
  verificationOk?: boolean;
}) {
  if (workflowState !== "ready_for_review") {
    return "repair_verification_required" as const;
  }
  if (verifiedDigest !== currentDigest) {
    return "repair_verification_stale" as const;
  }
  if (verificationMode !== "repair" || verificationOk !== true) {
    return "repair_verification_required" as const;
  }
  return undefined;
}

export function shouldAttemptAcceptanceRecovery({
  recoveryAttempt,
  maxAcceptanceRecoveries,
  terminal,
  finalVisualRuns,
  maxFinalVisualRuns,
  reviewerCritiqueEnabled = true,
}: {
  recoveryAttempt: number;
  maxAcceptanceRecoveries: number;
  terminal: boolean;
  finalVisualRuns: number;
  maxFinalVisualRuns: number;
  reviewerCritiqueEnabled?: boolean;
}) {
  return (
    !terminal &&
    recoveryAttempt < maxAcceptanceRecoveries &&
    (!reviewerCritiqueEnabled ||
      inspectBudget(finalVisualRuns, maxFinalVisualRuns).allowed)
  );
}

export function describeFinalVisualBudget(used: number, limit: number) {
  const budget = inspectBudget(used, limit);
  return budget.allowed
    ? `${budget.remaining} independent visual-review attempt(s) remain.`
    : "No independent visual-review attempts remain.";
}

export function shouldTerminallyRejectFailedVisualReview({
  infrastructureFailure,
  finalVisualRuns,
  maxFinalVisualRuns,
}: {
  infrastructureFailure: boolean;
  finalVisualRuns: number;
  maxFinalVisualRuns: number;
}) {
  return (
    !infrastructureFailure &&
    !inspectBudget(finalVisualRuns, maxFinalVisualRuns).allowed
  );
}

export function shouldRefreshRepairBudgetAfterReview({
  executed,
  infrastructureFailure,
  issueCount,
}: {
  executed: boolean;
  infrastructureFailure: boolean;
  issueCount: number;
}) {
  return executed && !infrastructureFailure && issueCount > 0;
}

export function shouldRejectExcellenceReview({
  infrastructureFailure,
  issueCount,
}: {
  infrastructureFailure: boolean;
  issueCount: number;
}) {
  return !infrastructureFailure && issueCount > 0;
}

export function shouldBlockUnchangedArtifact({
  previousDigest,
  currentDigest,
  previousFailed,
  infrastructureFailure,
}: {
  previousDigest?: string;
  currentDigest: string;
  previousFailed: boolean;
  infrastructureFailure: boolean;
}) {
  return (
    previousFailed &&
    !infrastructureFailure &&
    previousDigest !== undefined &&
    previousDigest === currentDigest
  );
}
