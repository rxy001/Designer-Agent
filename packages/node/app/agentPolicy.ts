export function inspectBudget(used: number, limit: number) {
  return {
    allowed: used < limit,
    used,
    remaining: Math.max(0, limit - used),
    limit,
  };
}

/**
 * Repair cycles get one reserved verification after the configured repair
 * budget. This lets the final authorized edit prove itself, while a failure in
 * that reserved verification remains terminal.
 */
export function inspectRepairVerificationBudget(used: number, limit: number) {
  const totalLimit = limit + 1;
  return {
    allowed: used < totalLimit,
    used,
    remaining: Math.max(0, totalLimit - used),
    limit,
    totalLimit,
    usingFinalVerificationReserve: used === limit,
  };
}

export function shouldTerminallyRejectRepairVerification({
  usingFinalVerificationReserve,
  verificationOk,
}: {
  usingFinalVerificationReserve: boolean;
  verificationOk: boolean;
}) {
  return usingFinalVerificationReserve && !verificationOk;
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
  return shouldStartFreshRepairCycle({
    stage: "excellence",
    executed,
    infrastructureFailure,
    staticInspectionOk: true,
    issueCount,
  });
}

/** Decide whether a failed canonical/review gate starts a new repair cycle. */
export function shouldStartFreshRepairCycle({
  stage,
  executed,
  infrastructureFailure,
  staticInspectionOk,
  issueCount,
}: {
  stage: "canonical" | "excellence";
  executed: boolean;
  infrastructureFailure: boolean;
  staticInspectionOk: boolean;
  issueCount: number;
}) {
  // Static failures never execute browser verification and infrastructure
  // failures are external blockers, so neither may consume/reset a repair
  // cycle. `stage` documents the two real caller paths and keeps this policy
  // from being duplicated in orchestration code.
  return (
    (stage === "canonical" || stage === "excellence") &&
    executed &&
    staticInspectionOk &&
    !infrastructureFailure &&
    issueCount > 0
  );
}

/**
 * Repair requests are scoped to the current candidate/review cycle. A failed
 * gate starts a new cycle, so its next candidate receives its own final
 * verification reserve rather than inheriting the previous one.
 */
export function repairRequestsAfterReviewFailure({
  stage = "excellence",
  executed,
  infrastructureFailure,
  staticInspectionOk = true,
  issueCount,
}: {
  stage?: "canonical" | "excellence";
  executed: boolean;
  infrastructureFailure: boolean;
  staticInspectionOk?: boolean;
  issueCount: number;
}) {
  return shouldStartFreshRepairCycle({
    stage,
    executed,
    infrastructureFailure,
    staticInspectionOk,
    issueCount,
  })
    ? 0
    : undefined;
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
