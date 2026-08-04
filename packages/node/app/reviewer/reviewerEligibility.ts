import { agentConfig, type BrowserViewportName } from "../agentConfig.ts";

type ReviewerEligibilityViewportReport = {
  runtime: { ok: boolean };
  layout: { ok: boolean };
};

export type ReviewerEligibilityCandidate = {
  staticInspectionOk: boolean;
  artifactModifiedAt: number;
  inspection: {
    ok: boolean;
    mode: "repair" | "final";
    artifactModifiedAt: number;
    viewports: Partial<
      Record<BrowserViewportName, ReviewerEligibilityViewportReport>
    >;
  };
};

export function getReviewerEligibilityIssue(
  candidate: ReviewerEligibilityCandidate,
) {
  if (!candidate.staticInspectionOk) {
    return "Independent Reviewer requires a passing canonical static inspection.";
  }
  if (!candidate.inspection.ok) {
    return "Independent Reviewer requires a passing browser matrix.";
  }
  if (candidate.inspection.mode !== "final") {
    return "Independent Reviewer requires a canonical final browser matrix.";
  }
  if (candidate.inspection.artifactModifiedAt !== candidate.artifactModifiedAt) {
    return "The canonical Artifact changed after browser verification.";
  }

  const missingOrFailed = agentConfig.browser.viewportNames.filter(
    (viewport) => {
      const report = candidate.inspection.viewports[viewport];
      return !report || !report.runtime.ok || !report.layout.ok;
    },
  );
  return missingOrFailed.length > 0
    ? `Independent Reviewer requires passing desktop, tablet, and mobile reports; missing or failed: ${missingOrFailed.join(", ")}.`
    : undefined;
}
