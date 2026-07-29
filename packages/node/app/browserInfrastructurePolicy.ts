const infrastructureIssueCodes = new Set([
  "verification_infrastructure_unavailable",
  "browser_image_loading_timed_out",
  "browser_image_loading_retry_exhausted",
  "browser_mobile_emulation_failed",
  "browser_viewport_size_unknown",
  "browser_viewport_size_mismatch",
]);

export function isBrowserInfrastructureIssueCode(code: unknown) {
  return typeof code === "string" && infrastructureIssueCodes.has(code);
}

export type ExternalVerificationBlockerCode =
  | "browser_infrastructure_unavailable"
  | "image_readiness_exhausted"
  | "viewport_emulation_unavailable";

export function getExternalVerificationBlockerCode(
  issues: Array<Record<string, unknown>>,
): ExternalVerificationBlockerCode | undefined {
  if (
    issues.length === 0 ||
    issues.some((issue) => !isBrowserInfrastructureIssueCode(issue.code))
  ) {
    return undefined;
  }

  const codes = new Set(issues.map((issue) => issue.code));
  if (codes.has("browser_image_loading_retry_exhausted")) {
    return "image_readiness_exhausted";
  }
  if (codes.has("browser_image_loading_timed_out")) {
    return undefined;
  }
  if (
    codes.has("browser_mobile_emulation_failed") ||
    codes.has("browser_viewport_size_unknown") ||
    codes.has("browser_viewport_size_mismatch")
  ) {
    return "viewport_emulation_unavailable";
  }
  return "browser_infrastructure_unavailable";
}

export function getInfrastructureBlockedViewports<T extends string>({
  issues,
  availableViewports,
}: {
  issues: Array<Record<string, unknown>>;
  availableViewports: readonly T[];
}) {
  const known = new Set<string>(availableViewports);
  const blocked = new Set<T>();
  let blocksWholeMatrix = false;

  for (const issue of issues) {
    if (!isBrowserInfrastructureIssueCode(issue.code)) continue;
    const viewport = issue.viewport;
    if (typeof viewport === "string" && known.has(viewport)) {
      blocked.add(viewport as T);
    } else {
      blocksWholeMatrix = true;
    }
  }

  return blocksWholeMatrix
    ? [...availableViewports]
    : availableViewports.filter((viewport) => blocked.has(viewport));
}
