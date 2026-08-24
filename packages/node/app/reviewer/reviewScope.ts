import type { CompactReview, CompactReviewSemanticIssue } from "../compactProductQuality.ts";

export type ExcellenceReviewScope =
  | { kind: "site" }
  | {
      kind: "page-body";
      pageId: string;
      immutableSectionIds: string[];
      immutableToolIds: string[];
    }
  | {
      kind: "shared-shell";
      mutableRegions: Array<"header" | "footer">;
      immutableSectionIds: string[];
      immutableToolIds: string[];
    };

export function getExcellenceReviewScopeIssues(
  review: CompactReview,
  scope: ExcellenceReviewScope | undefined,
): CompactReviewSemanticIssue[] {
  if (!scope || scope.kind === "site") return [];

  const immutableSectionIds = new Set(scope.immutableSectionIds);
  const immutableToolIds = new Set(scope.immutableToolIds);
  const issues: CompactReviewSemanticIssue[] = [];

  review.findings.forEach((finding, findingIndex) => {
    finding.targets.forEach((target, targetIndex) => {
      if (target.sectionId && immutableSectionIds.has(target.sectionId)) {
        issues.push({
          path: ["findings", findingIndex, "targets", targetIndex, "sectionId"],
          message: `Finding ${finding.code} targets immutable Section ${target.sectionId}. Remove this out-of-scope finding; immutable-region defects are reviewed by their owning Reviewer.`,
        });
      }
      if (target.toolId && immutableToolIds.has(target.toolId)) {
        issues.push({
          path: ["findings", findingIndex, "targets", targetIndex, "toolId"],
          message: `Finding ${finding.code} targets immutable Tool ${target.toolId}. Remove this out-of-scope finding; immutable-region defects are reviewed by their owning Reviewer.`,
        });
      }
      if (scope.kind === "page-body" && target.sectionId === null && target.toolId === null) {
        issues.push({
          path: ["findings", findingIndex, "targets", targetIndex],
          message: `Finding ${finding.code} uses an unlocated document target during a page-Body review. Locate the repair in a mutable Body Section or Tool, or remove the finding when the defect belongs only to the immutable Header/Footer.`,
        });
      }
    });
  });

  if (
    scope.kind === "page-body" &&
    review.gates.intentIntegrity.status === "fail" &&
    review.findings.length === 0
  ) {
    issues.push({
      path: ["gates", "intentIntegrity", "status"],
      message: "A page-Body review may fail intentIntegrity only when an actionable finding is located in the mutable Body. Shared Header/Footer requirements are outside this review scope.",
    });
  }

  return issues;
}

export function buildReviewScopeInstructions(scope: ExcellenceReviewScope | undefined) {
  if (!scope || scope.kind === "site") {
    return "Review scope: the complete artifact is mutable and may be assessed against the complete supplied brief.";
  }
  if (scope.kind === "page-body") {
    return [
      `Review scope: mutable page Body for page ${scope.pageId}.`,
      "The shared Header and Footer are visible only as immutable visual context. Do not fail intentIntegrity or experienceIntegrity, or create a finding for a defect whose repair belongs only to Header, Footer, shared navigation, shared copyright, shared social links, or shared customer-service links.",
      "You may judge how the mutable Body integrates with the shared shell, but every repair finding must be located in a mutable Body Section or Tool. Never recommend reproducing Header/Footer content in the Body.",
      `Immutable Section ids: ${JSON.stringify(scope.immutableSectionIds)}.`,
      `Immutable Tool ids: ${JSON.stringify(scope.immutableToolIds)}.`,
    ].join("\n");
  }
  return [
    `Review scope: mutable shared regions ${scope.mutableRegions.join(", ")}.`,
    "Do not create repair findings for the other immutable shared region.",
    `Immutable Section ids: ${JSON.stringify(scope.immutableSectionIds)}.`,
    `Immutable Tool ids: ${JSON.stringify(scope.immutableToolIds)}.`,
  ].join("\n");
}
