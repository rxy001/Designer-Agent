import { createHash } from "node:crypto";
import { z } from "zod";

const nonBlankString = (maxLength: number) =>
  z.string().min(1).max(maxLength).regex(/\S/u);

export const compactGateNames = [
  "intentIntegrity",
  "experienceIntegrity",
] as const;

export const compactDimensionNames = [
  "hierarchyComposition",
  "visualLanguage",
  "spatialReadability",
  "responsiveComposition",
] as const;

export const compactReviewAreaNames = [
  ...compactGateNames,
  ...compactDimensionNames,
] as const;

export const COMPACT_REVIEW_SCHEMA_VERSION = "compact-v2";

const gateNameSchema = z.enum(compactGateNames);
const dimensionNameSchema = z.enum(compactDimensionNames);
const reviewAreaSchema = z.enum(compactReviewAreaNames);
const ratingSchema = z.enum(["strong", "good", "weak", "unacceptable"]);
const viewportSchema = z.enum(["desktop", "tablet", "mobile"]);

const targetSchema = z.object({
  sectionId: nonBlankString(200).nullable(),
  toolId: nonBlankString(200).nullable(),
  dataSlot: nonBlankString(200).nullable(),
  rationale: nonBlankString(500),
}).strict();

const observationSchema = z.object({
  viewport: viewportSchema,
  sectionId: nonBlankString(200).nullable(),
  toolId: nonBlankString(200).nullable(),
  dataSlot: nonBlankString(200).nullable(),
  observation: nonBlankString(500),
}).strict();

const findingSchema = z.object({
  code: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/u),
  // A stable semantic identity for one independently repairable root cause.
  // Unlike observations and viewports, this must survive ordinary review
  // wording and evidence changes so comparisons do not manufacture churn.
  rootCauseKey: nonBlankString(160),
  areas: z.array(reviewAreaSchema).min(1).max(compactReviewAreaNames.length),
  severity: z.enum(["blocker", "major"]),
  category: z.enum([
    "requirement",
    "layout",
    "responsive",
    "visual_quality",
    "accessibility",
    "content_integrity",
  ]),
  observations: z.array(observationSchema).min(1).max(8),
  targets: z.array(targetSchema).min(1).max(6),
  objective: nonBlankString(800),
  acceptanceCriteria: z.array(nonBlankString(500)).min(1).max(6),
  prohibitedTactics: z.array(nonBlankString(500)).max(5),
}).strict();

const gateAssessmentSchema = z.object({
  status: z.enum(["pass", "fail"]),
  evidence: z.array(nonBlankString(500)).min(1).max(4),
}).strict();

const dimensionAssessmentSchema = z.object({
  rating: ratingSchema,
  evidence: z.array(nonBlankString(500)).min(1).max(4),
}).strict();

const pairwiseComparisonSchema = z.object({
  preferred: z.enum(["candidate", "baseline", "equivalent"]),
  meaningfulImprovement: z.boolean(),
  rationale: nonBlankString(600),
}).strict();

export const compactReviewerOutputSchema = z.object({
  verdict: z.enum(["pass", "fail"]),
  gates: z.object({
    intentIntegrity: gateAssessmentSchema,
    experienceIntegrity: gateAssessmentSchema,
  }).strict(),
  dimensions: z.object({
    hierarchyComposition: dimensionAssessmentSchema,
    visualLanguage: dimensionAssessmentSchema,
    spatialReadability: dimensionAssessmentSchema,
    responsiveComposition: dimensionAssessmentSchema,
  }).strict(),
  findings: z.array(findingSchema).max(8),
  comparison: pairwiseComparisonSchema.nullable(),
  summary: nonBlankString(1000),
}).strict();

export type CompactReview = z.infer<typeof compactReviewerOutputSchema>;
export type CompactGate = z.infer<typeof gateNameSchema>;
export type CompactDimension = z.infer<typeof dimensionNameSchema>;
export type CompactReviewArea = z.infer<typeof reviewAreaSchema>;
export type CompactRating = z.infer<typeof ratingSchema>;

export type CompactReviewSemanticIssue = {
  path: Array<string | number>;
  message: string;
};

export type CompactPreservationContract = {
  gates: CompactGate[];
  dimensions: Partial<Record<CompactDimension, "good" | "strong">>;
};

export type CompactReviewExecution =
  | { status: "completed"; review: CompactReview }
  | {
      status: "unavailable";
      kind: "infrastructure" | "contract" | "evidence";
      code: string;
      evidence: string;
    };

export type CompactReviewComparison = {
  baselineArtifactDigest: string;
  candidateArtifactDigest: string;
  /** Model judgement retained for audit only; it never drives rollback. */
  reviewerPreference: "candidate" | "baseline" | "equivalent";
  /** Model claim retained for audit only; it never drives rollback. */
  reviewerMeaningfulImprovement: boolean;
  /** Deterministic orchestration decision. */
  preferredArtifact: "candidate" | "baseline";
  decision: "keep_candidate" | "rollback";
  reasonCodes: Array<
    | "candidate_passed"
    | "gate_regression"
    | "rating_regression"
    | "severity_regression"
    | "introduced_major_finding"
    | "meaningful_improvement"
    | "no_meaningful_improvement"
  >;
  gateRegressions: CompactGate[];
  ratingRegressions: CompactDimension[];
  severityRegressions: string[];
  resolvedFindingIds: string[];
  remainingFindingIds: string[];
  introducedFindingIds: string[];
  introducedMajorFindingIds: string[];
  meaningfulImprovement: boolean;
  materialRegression: boolean;
};

const ratingRank: Record<CompactRating, number> = {
  unacceptable: 1,
  weak: 2,
  good: 3,
  strong: 4,
};

export const COMPACT_REVIEW_INSTRUCTIONS = `You are an independent visual-quality gate. You did not build the artifact. Judge only the delivered canonical product shown in explicitly labeled full-page screenshots and the supplied request, visual-pattern reference, and canonical source. Write every narrative field in the dominant language of the original user request. Do not write code, CSS declarations, or arbitrary pixel prescriptions. Technical layout validity alone is never sufficient for pass.

First assess two non-tradeable gates. intentIntegrity asks whether the artifact delivers the requested product purpose, required content, sections, actions, and target identity without contamination from the reference brand. experienceIntegrity asks whether any critical readability, discoverability, information-architecture, responsive, or interaction defect makes the delivered experience unacceptable. Both gates must pass.

Then assess four quality dimensions. hierarchyComposition covers focal path, macro composition, content order, and CTA priority. visualLanguage covers color relationships, typography as a visual system, imagery, component treatment, and adaptation of transferable design-system patterns. spatialReadability covers spacing, alignment, density, whitespace, line length, line height, and scanning clarity. responsiveComposition covers deliberate recomposition across desktop, tablet, and mobile rather than mechanical shrinking.

Use only four anchored ratings. strong means clearly resolved, coherent, and highly finished. good means it meets the delivery standard and any remaining refinements do not justify another repair cycle. weak means a concrete visible deficiency materially reduces quality and requires repair. unacceptable means the dimension is structurally or visibly unsuccessful. Do not use numerical scores or weighted averages.

Emit findings only for actionable defects that justify another repair cycle. Produce one finding per independently repairable visible root cause, not one per dimension or target. Set rootCauseKey to a stable semantic key made from the defect and its primary target (for example product_gallery.asset_binding); do not include viewport, severity, or prose. Split unrelated assets, controls, or sections even if they share a dimension. Put every gate and dimension genuinely affected by that root cause in the finding's areas array. Every failed gate and every weak or unacceptable dimension must be covered by at least one finding whose areas include it. Findings may be blocker or major; optional polish belongs only in evidence or the summary. When verdict=pass, findings must be empty.

The supplied design-system document is a visual-pattern reference, not the target brand. The user request has priority. Evaluate transferable color roles, typography, spacing, density, radii, borders, layout rhythm, surface composition, component treatment, responsive behavior, and motion. Never require or reward the reference brand, logo, labels, marketing copy, information architecture, proprietary UI, or product-specific content.

Each observation must identify its screenshot viewport and, when possible, the exact Section, Tool, or data-slot ID. Every targeted observation must be covered by a target whose non-null identifiers match the observation. Use the smallest adequate target. Acceptance criteria must be binary and visibly verifiable. prohibitedTactics must name plausible ways the defect could be hidden without being solved.

If a locked baseline is supplied, score only the candidate, then set comparison to a direct pairwise judgment. Prefer candidate only when it creates a meaningful visible improvement without a gate regression, a good/strong dimension falling to weak/unacceptable, or a new blocker/major root cause. Set comparison to null when no baseline is supplied.`;

export function calculateCompactReviewVerdict(review: CompactReview) {
  const gatesPass = compactGateNames.every(
    (gate) => review.gates[gate].status === "pass",
  );
  const dimensionsPass = compactDimensionNames.every((dimension) =>
    ["good", "strong"].includes(review.dimensions[dimension].rating)
  );
  return gatesPass && dimensionsPass && review.findings.length === 0
    ? "pass" as const
    : "fail" as const;
}

export function getCompactReviewSemanticIssues(review: CompactReview) {
  const issues: CompactReviewSemanticIssue[] = [];
  const expectedVerdict = calculateCompactReviewVerdict(review);
  if (review.verdict !== expectedVerdict) {
    issues.push({
      path: ["verdict"],
      message: `Verdict must be ${expectedVerdict} based on gates, ratings, and findings.`,
    });
  }

  for (const gate of compactGateNames) {
    if (
      review.gates[gate].status === "fail" &&
      !review.findings.some((finding) => finding.areas.includes(gate))
    ) {
      issues.push({
        path: ["gates", gate],
        message: `Failed gate ${gate} requires an actionable finding.`,
      });
    }
  }

  for (const dimension of compactDimensionNames) {
    if (
      ["weak", "unacceptable"].includes(review.dimensions[dimension].rating) &&
      !review.findings.some((finding) => finding.areas.includes(dimension))
    ) {
      issues.push({
        path: ["dimensions", dimension],
        message: `Weak dimension ${dimension} requires an actionable finding.`,
      });
    }
  }

  const seenCodes = new Set<string>();
  review.findings.forEach((finding, findingIndex) => {
    if (seenCodes.has(finding.code)) {
      issues.push({
        path: ["findings", findingIndex, "code"],
        message: `Finding code ${finding.code} is duplicated.`,
      });
    }
    seenCodes.add(finding.code);

    finding.observations.forEach((observation, observationIndex) => {
      if (!finding.targets.some((target) => targetCoversObservation(target, observation))) {
        issues.push({
          path: ["findings", findingIndex, "observations", observationIndex],
          message: `Observation is not covered by a matching repair target for finding ${finding.code}.`,
        });
      }
    });
  });
  return issues;
}

export function normalizeCompactReview(review: CompactReview) {
  return { review, normalizations: [] as never[] };
}

export function inferCompactRepairStrategy(
  finding: CompactReview["findings"][number],
) {
  // Content binding is deliberately a local repair even when a repeated bad
  // asset appears in several sections. Re-layout would conceal the defect and
  // invites avoidable visual regressions.
  if (finding.category === "content_integrity") return "local_patch" as const;
  const sectionIds = uniqueNonNull(finding.targets.map((target) => target.sectionId));
  const hasUnlocatedTarget = finding.targets.some(
    (target) => !target.sectionId && !target.toolId && !target.dataSlot,
  );
  if (hasUnlocatedTarget) return "page_relayout" as const;
  if (finding.severity === "blocker") {
    return sectionIds.length > 1 ? "page_relayout" as const : "section_rewrite" as const;
  }
  if (finding.targets.length === 1) {
    const target = finding.targets[0]!;
    if (target.toolId) return "component_rewrite" as const;
    if (target.sectionId) return "section_rewrite" as const;
    if (target.dataSlot) return "local_patch" as const;
  }
  return sectionIds.length <= 1 ? "section_rewrite" as const : "page_relayout" as const;
}

export function inferCompactMaximumRepairStrategy(
  finding: CompactReview["findings"][number],
) {
  if (finding.category === "content_integrity") {
    return finding.targets.some((target) => target.toolId)
      ? "component_rewrite" as const
      : "section_rewrite" as const;
  }
  if (
    finding.targets.some(
      (target) => !target.sectionId && !target.toolId && !target.dataSlot,
    )
  ) {
    return "page_relayout" as const;
  }
  const sectionIds = uniqueNonNull(finding.targets.map((target) => target.sectionId));
  if (sectionIds.length > 1) return "page_relayout" as const;
  if (sectionIds.length === 1) return "section_rewrite" as const;
  if (finding.targets.some((target) => target.toolId)) return "component_rewrite" as const;
  return "local_patch" as const;
}

export function buildCompactPreservationContract(
  review: CompactReview,
): CompactPreservationContract {
  return {
    gates: compactGateNames.filter((gate) => review.gates[gate].status === "pass"),
    dimensions: Object.fromEntries(
      compactDimensionNames.flatMap((dimension) => {
        const rating = review.dimensions[dimension].rating;
        return rating === "good" || rating === "strong"
          ? [[dimension, rating]]
          : [];
      }),
    ) as Partial<Record<CompactDimension, "good" | "strong">>,
  };
}

export function buildStableCompactFindingId(
  finding: CompactReview["findings"][number],
) {
  const identity = JSON.stringify({
    category: finding.category,
    rootCauseKey: finding.rootCauseKey,
  });
  return createHash("sha256").update(identity).digest("hex").slice(0, 20);
}

export function getCompactFindingAffectedViewports(
  finding: CompactReview["findings"][number],
) {
  const observed = new Set(finding.observations.map((item) => item.viewport));
  return (["desktop", "tablet", "mobile"] as const).filter((viewport) =>
    observed.has(viewport)
  );
}

export function compareCompactReviewCycle({
  baselineArtifactDigest,
  baseline,
  candidateArtifactDigest,
  candidate,
}: {
  baselineArtifactDigest: string;
  baseline: CompactReview;
  candidateArtifactDigest: string;
  candidate: CompactReview;
}): CompactReviewComparison {
  const baselineFindingIds = new Set(baseline.findings.map(buildStableCompactFindingId));
  const candidateFindingIds = new Set(candidate.findings.map(buildStableCompactFindingId));
  const gateRegressions = compactGateNames.filter(
    (gate) => baseline.gates[gate].status === "pass" && candidate.gates[gate].status !== "pass",
  );
  const ratingRegressions = compactDimensionNames.filter((dimension) =>
    ratingRank[candidate.dimensions[dimension].rating] <
    ratingRank[baseline.dimensions[dimension].rating]
  );
  const introducedFindingIds = [...candidateFindingIds].filter((id) => !baselineFindingIds.has(id));
  const introducedMajorFindingIds = candidate.findings
    .filter((finding) => !baselineFindingIds.has(buildStableCompactFindingId(finding)))
    .map(buildStableCompactFindingId);
  const baselineSeverityById = new Map(
    baseline.findings.map((finding) => [
      buildStableCompactFindingId(finding),
      finding.severity,
    ]),
  );
  const severityRegressions = candidate.findings.flatMap((finding) => {
    const id = buildStableCompactFindingId(finding);
    return baselineSeverityById.get(id) === "major" && finding.severity === "blocker"
      ? [id]
      : [];
  });
  const resolvedFindingIds = [...baselineFindingIds].filter((id) => !candidateFindingIds.has(id));
  const reviewerPreference = candidate.comparison?.preferred ?? "equivalent";
  const reviewerMeaningfulImprovement =
    candidate.comparison?.meaningfulImprovement ?? false;
  const materialRegression =
    gateRegressions.length > 0 ||
    ratingRegressions.some((dimension) => {
      const baselineRating = baseline.dimensions[dimension].rating;
      const candidateRating = candidate.dimensions[dimension].rating;
      return candidateRating === "unacceptable" ||
        (ratingRank[baselineRating] >= ratingRank.good &&
          ratingRank[candidateRating] < ratingRank.good);
    }) ||
    severityRegressions.length > 0 ||
    introducedMajorFindingIds.length > 0;
  // Pairwise model claims are audit evidence only. Promotion must be derived
  // from the reviews we actually received, so a model cannot veto a passing
  // candidate that fixes a failing baseline or manufacture an improvement.
  const deterministicRanking = compareCompactReviews(candidate, baseline);
  const meaningfulImprovement =
    (candidate.verdict === "pass" && baseline.verdict === "fail") ||
    resolvedFindingIds.length > 0 ||
    deterministicRanking > 0;
  const decision = materialRegression
    ? "rollback" as const
    : candidate.verdict === "pass" && baseline.verdict === "fail"
      ? "keep_candidate" as const
      : meaningfulImprovement
        ? "keep_candidate" as const
        : "rollback" as const;
  const reasonCodes = [
    ...(gateRegressions.length ? ["gate_regression" as const] : []),
    ...(ratingRegressions.length ? ["rating_regression" as const] : []),
    ...(severityRegressions.length ? ["severity_regression" as const] : []),
    ...(introducedMajorFindingIds.length ? ["introduced_major_finding" as const] : []),
    ...(decision === "keep_candidate"
      ? [candidate.verdict === "pass" && baseline.verdict === "fail"
          ? "candidate_passed" as const
          : "meaningful_improvement" as const]
      : materialRegression ? [] : ["no_meaningful_improvement" as const]),
  ];
  return {
    baselineArtifactDigest,
    candidateArtifactDigest,
    reviewerPreference,
    reviewerMeaningfulImprovement,
    preferredArtifact: decision === "rollback" ? "baseline" : "candidate",
    decision,
    reasonCodes,
    gateRegressions,
    ratingRegressions,
    severityRegressions,
    resolvedFindingIds,
    remainingFindingIds: [...baselineFindingIds].filter((id) => candidateFindingIds.has(id)),
    introducedFindingIds,
    introducedMajorFindingIds,
    meaningfulImprovement,
    materialRegression,
  };
}

export function compareCompactReviews(candidate: CompactReview, baseline: CompactReview) {
  if (candidate.verdict !== baseline.verdict) return candidate.verdict === "pass" ? 1 : -1;
  const candidateGateFailures = compactGateNames.filter((gate) => candidate.gates[gate].status !== "pass").length;
  const baselineGateFailures = compactGateNames.filter((gate) => baseline.gates[gate].status !== "pass").length;
  if (candidateGateFailures !== baselineGateFailures) return baselineGateFailures - candidateGateFailures;
  const candidateRatingTotal = compactDimensionNames.reduce(
    (total, dimension) => total + ratingRank[candidate.dimensions[dimension].rating],
    0,
  );
  const baselineRatingTotal = compactDimensionNames.reduce(
    (total, dimension) => total + ratingRank[baseline.dimensions[dimension].rating],
    0,
  );
  if (candidateRatingTotal !== baselineRatingTotal) return candidateRatingTotal - baselineRatingTotal;
  return baseline.findings.length - candidate.findings.length;
}

export function shouldRollbackCompactCandidate({ comparison }: {
  baseline: CompactReview;
  candidate: CompactReview;
  comparison: CompactReviewComparison;
}) {
  return comparison.decision === "rollback";
}

export function getCompactReviewIssues(review: CompactReview) {
  const mustPreserve = buildCompactPreservationContract(review);
  return review.findings.map((finding) => {
    const affectedViewports = getCompactFindingAffectedViewports(finding);
    const requiredRepairStrategy = inferCompactRepairStrategy(finding);
    const maximumRepairStrategy = inferCompactMaximumRepairStrategy(finding);
    return {
      code: `compact_finding_${finding.code}`,
      findingId: buildStableCompactFindingId(finding),
      message: formatObservations(finding.observations),
      dimension: finding.areas[0],
      dimensions: finding.areas,
      category: finding.category,
      severity: finding.severity,
      requiresRepair: true,
      requiredRepairStrategy,
      maximumRepairStrategy,
      mustPreserve,
      affectedViewports,
      targets: finding.targets,
      observations: finding.observations,
      scope: {
        ...(affectedViewports.length === 1 ? { viewport: affectedViewports[0] } : {}),
        dimension: finding.areas[0],
      },
      repairIntent: {
        objective: finding.objective,
        acceptanceCriteria: finding.acceptanceCriteria,
        prohibitedTactics: finding.prohibitedTactics,
      },
    };
  });
}

export function buildCompactReviewReport({
  review,
  candidateReview,
  comparison,
  rollbackToBaseline,
  issues,
  activeArtifact,
}: {
  review: CompactReview;
  candidateReview?: CompactReview;
  comparison?: CompactReviewComparison;
  rollbackToBaseline: boolean;
  issues: unknown[];
  activeArtifact?: { role: "candidate" | "restored_baseline"; digest: string };
}) {
  return {
    ...(activeArtifact ? { artifactContext: {
      activeArtifact: activeArtifact.role,
      activeArtifactDigest: activeArtifact.digest,
      ...(comparison ? {
        reviewedCandidateDigest: comparison.candidateArtifactDigest,
        baselineDigest: comparison.baselineArtifactDigest,
      } : {}),
    } } : {}),
    verdict: review.verdict,
    gates: review.gates,
    ratings: Object.fromEntries(
      compactDimensionNames.map((dimension) => [dimension, review.dimensions[dimension].rating]),
    ),
    ratingEvidence: Object.fromEntries(
      compactDimensionNames.map((dimension) => [dimension, review.dimensions[dimension].evidence]),
    ),
    summary: review.summary,
    findingCount: review.findings.length,
    ...(candidateReview ? { candidateAssessment: {
      verdict: candidateReview.verdict,
      findingCount: candidateReview.findings.length,
      summary: candidateReview.summary,
    } } : {}),
    comparison,
    rollbackToBaseline,
    issues,
  };
}

function targetCoversObservation(
  target: CompactReview["findings"][number]["targets"][number],
  observation: CompactReview["findings"][number]["observations"][number],
) {
  return (["sectionId", "toolId", "dataSlot"] as const).every(
    (key) => target[key] === null || target[key] === observation[key],
  );
}

function uniqueNonNull(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => value !== null))];
}

function formatObservations(
  observations: CompactReview["findings"][number]["observations"],
) {
  return observations.map((item) => {
    const target = [item.sectionId, item.toolId, item.dataSlot].filter(Boolean).join("/");
    return `[${item.viewport}${target ? ` ${target}` : ""}] ${item.observation}`;
  }).join(" ");
}
