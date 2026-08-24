import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCompactPreservationContract,
  calculateCompactReviewVerdict,
  compactReviewerOutputSchema,
  compareCompactReviewCycle,
  getCompactReviewIssues,
  getCompactReviewSemanticIssues,
  inferCompactRepairStrategy,
  inferCompactMaximumRepairStrategy,
  shouldRollbackCompactCandidate,
  type CompactReview,
} from "../app/compactProductQuality.ts";

test("passes only with passing gates, good-or-strong ratings, and no findings", () => {
  const review = passingReview();
  assert.equal(compactReviewerOutputSchema.safeParse(review).success, true);
  assert.equal(calculateCompactReviewVerdict(review), "pass");
  assert.deepEqual(getCompactReviewSemanticIssues(review), []);

  review.dimensions.spatialReadability.rating = "weak";
  review.verdict = "fail";
  assert.equal(calculateCompactReviewVerdict(review), "fail");
  assert.ok(
    getCompactReviewSemanticIssues(review).some((issue) =>
      issue.path.join(".") === "dimensions.spatialReadability"
    ),
  );
});

test("requires every failed gate and weak rating to have an actionable root-cause finding", () => {
  const review = passingReview();
  review.verdict = "fail";
  review.gates.intentIntegrity.status = "fail";
  review.findings = [finding("missing_required_action", "intentIntegrity")];
  assert.deepEqual(getCompactReviewSemanticIssues(review), []);

  review.dimensions.hierarchyComposition.rating = "unacceptable";
  assert.ok(
    getCompactReviewSemanticIssues(review).some((issue) =>
      issue.path.join(".") === "dimensions.hierarchyComposition"
    ),
  );
});

test("allows one root-cause finding to cover several failed review areas", () => {
  const review = passingReview();
  review.verdict = "fail";
  review.dimensions.hierarchyComposition.rating = "weak";
  review.dimensions.responsiveComposition.rating = "weak";
  const rootCause = finding("mobile_hero_density", "hierarchyComposition");
  rootCause.areas.push("responsiveComposition");
  review.findings = [rootCause];
  assert.deepEqual(getCompactReviewSemanticIssues(review), []);
  assert.deepEqual(getCompactReviewIssues(review)[0]?.dimensions, [
    "hierarchyComposition",
    "responsiveComposition",
  ]);
});

test("infers repair scope from targets instead of trusting the model", () => {
  const toolFinding = finding("weak_card_treatment", "visualLanguage");
  toolFinding.targets[0] = {
    sectionId: "products",
    toolId: "product_card",
    dataSlot: null,
    rationale: "The defect is isolated to the card.",
  };
  toolFinding.observations[0] = {
    viewport: "desktop",
    sectionId: "products",
    toolId: "product_card",
    dataSlot: null,
    observation: "The card treatment conflicts with the visual language.",
  };
  assert.equal(inferCompactRepairStrategy(toolFinding), "component_rewrite");

  const pageFinding = finding("broken_page_flow", "hierarchyComposition");
  pageFinding.targets.push({
    sectionId: "pricing",
    toolId: null,
    dataSlot: null,
    rationale: "The same composition defect crosses sections.",
  });
  assert.equal(inferCompactRepairStrategy(pageFinding), "page_relayout");

  const unlocated = finding("page_wide_failure", "hierarchyComposition");
  unlocated.targets = [{
    sectionId: null,
    toolId: null,
    dataSlot: null,
    rationale: "The composition failure is genuinely page-wide.",
  }];
  unlocated.observations[0] = {
    ...unlocated.observations[0]!,
    sectionId: null,
  };
  assert.equal(inferCompactRepairStrategy(unlocated), "page_relayout");
  assert.equal(inferCompactMaximumRepairStrategy(unlocated), "page_relayout");
});

test("converts findings into targeted repair contracts with categorical preservation", () => {
  const review = passingReview();
  review.verdict = "fail";
  review.dimensions.responsiveComposition.rating = "weak";
  review.findings = [finding("mobile_focal_order", "responsiveComposition")];
  const issues = getCompactReviewIssues(review);
  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.dimension, "responsiveComposition");
  assert.equal(issues[0]?.requiredRepairStrategy, "section_rewrite");
  assert.deepEqual(buildCompactPreservationContract(review), {
    gates: ["intentIntegrity", "experienceIntegrity"],
    dimensions: {
      hierarchyComposition: "good",
      visualLanguage: "good",
      spatialReadability: "good",
    },
  });
});

test("uses pairwise preference and categorical regressions for baseline promotion", () => {
  const baseline = passingReview();
  baseline.verdict = "fail";
  baseline.dimensions.responsiveComposition.rating = "weak";
  baseline.findings = [finding("mobile_focal_order", "responsiveComposition")];

  const candidate = passingReview();
  candidate.comparison = {
    preferred: "candidate",
    meaningfulImprovement: true,
    rationale: "The mobile focal order is visibly resolved without regression.",
  };
  const comparison = compareCompactReviewCycle({
    baselineArtifactDigest: "baseline",
    baseline,
    candidateArtifactDigest: "candidate",
    candidate,
  });
  assert.equal(comparison.resolvedFindingIds.length, 1);
  assert.equal(comparison.materialRegression, false);
  assert.equal(shouldRollbackCompactCandidate({ baseline, candidate, comparison }), false);

  candidate.gates.intentIntegrity.status = "fail";
  candidate.verdict = "fail";
  candidate.findings = [finding("missing_required_action", "intentIntegrity")];
  const regressed = compareCompactReviewCycle({
    baselineArtifactDigest: "baseline",
    baseline: passingReview(),
    candidateArtifactDigest: "candidate",
    candidate,
  });
  assert.deepEqual(regressed.gateRegressions, ["intentIntegrity"]);
  assert.equal(regressed.materialRegression, true);
});

test("detects weak-to-unacceptable and major-to-blocker baseline regressions", () => {
  const baseline = passingReview();
  baseline.verdict = "fail";
  baseline.dimensions.spatialReadability.rating = "weak";
  baseline.findings = [finding("dense_content", "spatialReadability")];

  const candidate = structuredClone(baseline);
  candidate.dimensions.spatialReadability.rating = "unacceptable";
  candidate.findings[0]!.severity = "blocker";
  candidate.comparison = {
    preferred: "candidate",
    meaningfulImprovement: true,
    rationale: "An intentionally incorrect preference used to test deterministic protection.",
  };
  const comparison = compareCompactReviewCycle({
    baselineArtifactDigest: "baseline",
    baseline,
    candidateArtifactDigest: "candidate",
    candidate,
  });
  assert.deepEqual(comparison.ratingRegressions, ["spatialReadability"]);
  assert.equal(comparison.severityRegressions.length, 1);
  assert.equal(comparison.materialRegression, true);
  assert.equal(shouldRollbackCompactCandidate({ baseline, candidate, comparison }), true);
});

function passingReview(): CompactReview {
  const assessment = () => ({
    rating: "good" as const,
    evidence: ["Concrete viewport-specific evidence."],
  });
  return {
    verdict: "pass",
    gates: {
      intentIntegrity: { status: "pass", evidence: ["The requested product and actions are present."] },
      experienceIntegrity: { status: "pass", evidence: ["No critical experience defect is visible."] },
    },
    dimensions: {
      hierarchyComposition: assessment(),
      visualLanguage: assessment(),
      spatialReadability: assessment(),
      responsiveComposition: assessment(),
    },
    findings: [],
    comparison: null,
    summary: "The canonical candidate meets the compact visual-quality gate.",
  };
}

function finding(
  code: string,
  area: CompactReview["findings"][number]["areas"][number],
): CompactReview["findings"][number] {
  return {
    code,
    areas: [area],
    severity: "major",
    category: "visual_quality",
    observations: [{
      viewport: "mobile",
      sectionId: "hero",
      toolId: null,
      dataSlot: null,
      observation: "The visible root cause requires repair.",
    }],
    targets: [{
      sectionId: "hero",
      toolId: null,
      dataSlot: null,
      rationale: "The defect is contained in the hero section.",
    }],
    objective: "Resolve the visible root cause.",
    acceptanceCriteria: ["The named viewport visibly satisfies the requirement."],
    prohibitedTactics: ["Do not hide the affected content."],
  };
}
