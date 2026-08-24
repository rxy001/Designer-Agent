import { z } from "zod";
import { createHash } from "node:crypto";

const nonBlankString = (maxLength: number) =>
  z.string().min(1).max(maxLength).regex(/\S/u);

export const excellenceDimensionSchema = z.object({
  score: z.number().int().min(1).max(10),
  evidence: z.array(nonBlankString(500)).min(2).max(6),
});

const excellenceGuardrailSchema = z.object({
  status: z.enum(["pass", "fail", "not_assessed"]),
  evidence: z.array(nonBlankString(500)).min(2).max(6),
});

export const excellenceVisualDimensionNames = [
  "visualImpact",
  "compositionHierarchy",
  "typographyQuality",
  "colorImageryQuality",
  "spatialCraft",
  "designSystemApplication",
  "responsiveComposition",
] as const;

export const excellenceGuardrailNames = [
  "briefIntegrity",
  "brandContentIntegrity",
] as const;

const excellenceDimensionNameSchema = z.enum(excellenceVisualDimensionNames);
const excellenceGuardrailNameSchema = z.enum(excellenceGuardrailNames);
const excellenceReviewAreaSchema = z.union([
  excellenceDimensionNameSchema,
  excellenceGuardrailNameSchema,
]);

const excellenceViewportNames = ["desktop", "tablet", "mobile"] as const;
const excellenceViewportSchema = z.enum(excellenceViewportNames);

const excellenceTargetSchema = z.object({
  sectionId: nonBlankString(200).nullable(),
  toolId: nonBlankString(200).nullable(),
  dataSlot: nonBlankString(200).nullable(),
  rationale: nonBlankString(500),
});

const excellenceObservationSchema = z.object({
  viewport: excellenceViewportSchema,
  sectionId: nonBlankString(200).nullable(),
  toolId: nonBlankString(200).nullable(),
  dataSlot: nonBlankString(200).nullable(),
  observation: nonBlankString(500),
});

const excellenceFindingSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/u),
  primaryDimension: excellenceReviewAreaSchema,
  affectedDimensions: z.array(excellenceReviewAreaSchema).min(1).max(10),
  category: z.enum([
    "requirement",
    "layout",
    "responsive",
    "visual_quality",
    "accessibility",
    "content_integrity",
  ]),
  severity: z.enum(["blocker", "major", "minor"]),
  blockerCodes: z.array(nonBlankString(100)).max(20),
  observations: z
    .array(excellenceObservationSchema)
    .min(1)
    .max(12)
    .describe(
      "Concrete viewport evidence. Each observation with target IDs must be covered by at least one finding target: every non-null ID on that target must equal the corresponding observation ID. An observation may be more specific than its covering target.",
    ),
  targets: z
    .array(excellenceTargetSchema)
    .min(1)
    .max(8)
    .describe(
      "Repair scopes for this finding. A broader target may cover more-specific observations; for example, a section target with null toolId covers observations for tools inside that section.",
    ),
  repairStrategy: z.enum([
    "local_patch",
    "component_rewrite",
    "section_rewrite",
    "page_relayout",
    "site_regeneration",
  ]),
  objective: nonBlankString(800),
  acceptanceCriteria: z.array(nonBlankString(500)).min(1).max(8),
  prohibitedTactics: z.array(nonBlankString(500)).max(8),
}).strict();

// Keep transforms and cross-field refinements out of these wire schemas: they
// cannot be represented faithfully in model-facing JSON Schema. Put such
// rules in getExcellenceReviewSemanticIssues instead.
const excellenceReviewBlockerSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/u),
  dimension: z.union([
    excellenceReviewAreaSchema,
    z.literal("reviewInfrastructure"),
  ]),
  evidence: nonBlankString(800),
});

const excellenceReviewerOutputBlockerSchema =
  excellenceReviewBlockerSchema.extend({
    // Reviewer models assess product quality. Infrastructure failures are
    // synthesized by the orchestration layer from caught runtime errors.
    dimension: excellenceReviewAreaSchema,
  });

export const excellenceReviewSchema = z.object({
  verdict: z.enum(["pass", "fail"]),
  guardrails: z.object({
    briefIntegrity: excellenceGuardrailSchema,
    brandContentIntegrity: excellenceGuardrailSchema,
  }),
  dimensions: z.object({
    visualImpact: excellenceDimensionSchema,
    compositionHierarchy: excellenceDimensionSchema,
    typographyQuality: excellenceDimensionSchema,
    colorImageryQuality: excellenceDimensionSchema,
    spatialCraft: excellenceDimensionSchema,
    designSystemApplication: excellenceDimensionSchema,
    responsiveComposition: excellenceDimensionSchema,
  }),
  blockers: z.array(excellenceReviewBlockerSchema).max(20),
  findings: z.array(excellenceFindingSchema).max(12),
  summary: nonBlankString(1200),
});

// Keep reviewInfrastructure out of every model-facing structured-output
// schema. Only unavailableExcellenceReview may create that internal state.
export const excellenceReviewerOutputSchema = excellenceReviewSchema.extend({
  blockers: z.array(excellenceReviewerOutputBlockerSchema).max(20),
});

export type ExcellenceReview = z.infer<typeof excellenceReviewSchema>;
export type ExcellenceDimension = z.infer<typeof excellenceDimensionNameSchema>;
export type ExcellenceGuardrail = z.infer<typeof excellenceGuardrailNameSchema>;
export type ExcellenceReviewArea = z.infer<typeof excellenceReviewAreaSchema>;

export const EXCELLENCE_PASS_SCORE = 7.5;
export const EXCELLENCE_MIN_VISUAL_SCORE = 6;
export const EXCELLENCE_CRITICAL_VISUAL_SCORE = 7;
export const EXCELLENCE_MEANINGFUL_IMPROVEMENT = 0.25;
export const EXCELLENCE_VISUAL_WEIGHTS = {
  visualImpact: 0.15,
  compositionHierarchy: 0.2,
  typographyQuality: 0.15,
  colorImageryQuality: 0.1,
  spatialCraft: 0.15,
  designSystemApplication: 0.1,
  responsiveComposition: 0.15,
} as const satisfies Record<ExcellenceDimension, number>;
const excellenceCriticalDimensions = new Set<ExcellenceDimension>([
  "compositionHierarchy",
  "responsiveComposition",
]);

export type ExcellencePreservationContract = {
  dimensions: Partial<Record<ExcellenceDimension, number>>;
  guardrails: ExcellenceGuardrail[];
};

export type ExcellenceReviewComparison = {
  baselineArtifactDigest: string;
  candidateArtifactDigest: string;
  scoreDelta: Record<ExcellenceDimension, number>;
  resolvedFindingIds: string[];
  remainingFindingIds: string[];
  introducedFindingIds: string[];
  introducedSevereFindingIds: string[];
  introducedBlockerCodes: string[];
  regressedGuardrails: ExcellenceGuardrail[];
  regressedDimensions: ExcellenceDimension[];
  baselineWeightedScore: number;
  candidateWeightedScore: number;
  weightedScoreDelta: number;
  pairwisePreference: "baseline" | "candidate" | "equivalent";
  materialRegression: boolean;
};

export type ExcellenceReviewReport = {
  verdict: ExcellenceReview["verdict"];
  gate: {
    minimumPassingScore: number;
    minimumWeightedScore: number;
    minimumDimensionScore: number;
    criticalDimensionMinimumScore: number;
    visualWeights: Record<ExcellenceDimension, number>;
    weightedScore: number | null;
    failedDimensions: ExcellenceDimension[];
    failedGuardrails: ExcellenceGuardrail[];
    blockerCodes: string[];
    failureReasons: Array<{
      code:
        | "score_below_threshold"
        | "weighted_score_below_threshold"
        | "guardrail_failed"
        | "blocker_present";
      dimensions?: ExcellenceDimension[];
      guardrails?: ExcellenceGuardrail[];
      blockerCodes?: string[];
    }>;
  };
  guardrails: ExcellenceReview["guardrails"];
  scores: Record<ExcellenceDimension, number>;
  scoreEvidence: Record<ExcellenceDimension, string[]>;
  summary: string;
  blockerCount: number;
  blockers: ExcellenceReview["blockers"];
  comparison?: ExcellenceReviewComparison;
  comparisonSummary?: {
    scoreTrend: "improved" | "regressed" | "mixed" | "unchanged";
    pairwisePreference: ExcellenceReviewComparison["pairwisePreference"];
    resolvedFindingCount: number;
    remainingFindingCount: number;
    introducedFindingCount: number;
    materialRegression: boolean;
  };
  rollbackToBaseline: boolean;
  issues: unknown[];
};

export type ExcellenceReviewNormalization = {
  findingIndex: number;
  findingCode: string;
  from: ExcellenceReview["findings"][number]["repairStrategy"];
  to: ExcellenceReview["findings"][number]["repairStrategy"];
  reason: "blocker_target_scope";
};

export function getExcellenceFindingAffectedViewports(
  finding: ExcellenceReview["findings"][number],
) {
  const observedViewports = new Set(
    finding.observations.map((observation) => observation.viewport),
  );
  return excellenceViewportNames.filter((viewport) =>
    observedViewports.has(viewport),
  );
}

export function normalizeExcellenceReview(
  review: ExcellenceReview,
): {
  review: ExcellenceReview;
  normalizations: ExcellenceReviewNormalization[];
} {
  const normalizations: ExcellenceReviewNormalization[] = [];
  const findings = review.findings.map((finding, findingIndex) => {
    if (finding.severity !== "blocker") return finding;

    const minimumStrategy = getMinimumBlockerRepairStrategy(finding.targets);
    if (
      repairStrategyPriority[finding.repairStrategy] >=
      repairStrategyPriority[minimumStrategy]
    ) {
      return finding;
    }

    normalizations.push({
      findingIndex,
      findingCode: finding.code,
      from: finding.repairStrategy,
      to: minimumStrategy,
      reason: "blocker_target_scope",
    });
    return { ...finding, repairStrategy: minimumStrategy };
  });

  return {
    review: normalizations.length > 0 ? { ...review, findings } : review,
    normalizations,
  };
}

export type ExcellenceReviewSemanticIssue = {
  path: Array<string | number>;
  message: string;
};

type ExcellenceReviewSemanticIssueCollector = {
  addIssue(issue: ExcellenceReviewSemanticIssue & { code: "custom" }): void;
};

function isExcellenceDimension(
  value: ExcellenceReviewArea,
): value is ExcellenceDimension {
  return (excellenceVisualDimensionNames as readonly string[]).includes(value);
}

function isExcellenceGuardrail(
  value: ExcellenceReviewArea,
): value is ExcellenceGuardrail {
  return (excellenceGuardrailNames as readonly string[]).includes(value);
}

function requiredVisualScore(dimension: ExcellenceDimension) {
  return excellenceCriticalDimensions.has(dimension)
    ? EXCELLENCE_CRITICAL_VISUAL_SCORE
    : EXCELLENCE_MIN_VISUAL_SCORE;
}

export function calculateExcellenceWeightedScore(review: ExcellenceReview) {
  const score = excellenceVisualDimensionNames.reduce(
    (total, dimension) =>
      total +
      review.dimensions[dimension].score *
        EXCELLENCE_VISUAL_WEIGHTS[dimension],
    0,
  );
  return Math.round(score * 100) / 100;
}

export function getExcellenceFailedGuardrails(review: ExcellenceReview) {
  return excellenceGuardrailNames.filter(
    (guardrail) => review.guardrails[guardrail].status !== "pass",
  );
}

export function getExcellenceFailedDimensions(review: ExcellenceReview) {
  return excellenceVisualDimensionNames.filter(
    (dimension) =>
      review.dimensions[dimension].score < requiredVisualScore(dimension),
  );
}

function passesExcellenceVisualGate(review: ExcellenceReview) {
  return (
    calculateExcellenceWeightedScore(review) >= EXCELLENCE_PASS_SCORE &&
    getExcellenceFailedDimensions(review).length === 0
  );
}

function getExcellenceRepairDimensions(review: ExcellenceReview) {
  const failed = new Set(getExcellenceFailedDimensions(review));
  if (calculateExcellenceWeightedScore(review) < EXCELLENCE_PASS_SCORE) {
    for (const finding of review.findings) {
      for (const area of finding.affectedDimensions) {
        if (isExcellenceDimension(area)) {
          failed.add(area);
        }
      }
    }
  }
  return failed;
}

export function getExcellenceReviewSemanticIssues(review: ExcellenceReview) {
  const issues: ExcellenceReviewSemanticIssue[] = [];
  const context: ExcellenceReviewSemanticIssueCollector = {
    addIssue({ path, message }) {
      issues.push({ path, message });
    },
  };

  if (review.verdict === "pass") {
    if (review.findings.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["findings"],
        message: "A passing review cannot contain repair findings.",
      });
    }
    if (review.blockers.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["blockers"],
        message: "A passing review cannot contain blockers.",
      });
    }
    for (const guardrail of getExcellenceFailedGuardrails(review)) {
      context.addIssue({
        code: "custom",
        path: ["guardrails", guardrail, "status"],
        message: "A passing review requires every guardrail to pass.",
      });
    }
    for (const dimension of getExcellenceFailedDimensions(review)) {
      context.addIssue({
        code: "custom",
        path: ["dimensions", dimension, "score"],
        message: `A passing review requires ${dimension} to score at least ${requiredVisualScore(dimension)}.`,
      });
    }
    if (calculateExcellenceWeightedScore(review) < EXCELLENCE_PASS_SCORE) {
      context.addIssue({
        code: "custom",
        path: ["dimensions"],
        message: `A passing review requires a weighted visual score of at least ${EXCELLENCE_PASS_SCORE}.`,
      });
    }
  }

  const infrastructureFailure = review.blockers.some(
    (blocker) => blocker.dimension === "reviewInfrastructure",
  );
  if (review.verdict === "fail" && !infrastructureFailure) {
    const hasFailureReason =
      review.blockers.length > 0 ||
      getExcellenceFailedGuardrails(review).length > 0 ||
      !passesExcellenceVisualGate(review);
    if (!hasFailureReason) {
      context.addIssue({
        code: "custom",
        path: ["verdict"],
        message:
          "A failing review requires a blocker, a failed guardrail, or a failed weighted visual gate.",
      });
    }

    // Missing finding coverage is recoverable reviewer incompleteness, not an
    // infrastructure failure. getExcellenceReviewIssues materializes an
    // aggregate repair issue for every uncovered failed dimension or blocker.
  }

  if (!infrastructureFailure) {
    for (const guardrail of excellenceGuardrailNames) {
      if (review.guardrails[guardrail].status === "not_assessed") {
        context.addIssue({
          code: "custom",
          path: ["guardrails", guardrail, "status"],
          message: "not_assessed is reserved for Reviewer infrastructure failure.",
        });
      }
    }
  }

  for (const blocker of review.blockers) {
    if (blocker.dimension === "reviewInfrastructure") continue;
    const linkedFinding = review.findings.find((finding) =>
      finding.blockerCodes.includes(blocker.code),
    );
    if (linkedFinding && linkedFinding.severity !== "blocker") {
      context.addIssue({
        code: "custom",
        path: ["findings"],
        message: `Finding linked to blocker ${blocker.code} must have blocker severity.`,
      });
    }
  }

  addDuplicateCodeIssues(
    review.blockers.map((blocker) => blocker.code),
    "blockers",
    context,
  );
  addDuplicateCodeIssues(
    review.findings.map((finding) => finding.code),
    "findings",
    context,
  );

  const blockerCodes = new Set(review.blockers.map((blocker) => blocker.code));
  const blockerDimensions = new Set(
    review.blockers.flatMap((blocker) =>
      blocker.dimension === "reviewInfrastructure" ? [] : [blocker.dimension],
    ),
  );
  review.findings.forEach((finding, index) => {
    if (!finding.affectedDimensions.includes(finding.primaryDimension)) {
      context.addIssue({
        code: "custom",
        path: ["findings", index, "affectedDimensions"],
        message: "affectedDimensions must include primaryDimension.",
      });
    }
    addDuplicateValueIssue(
      finding.affectedDimensions,
      ["findings", index, "affectedDimensions"],
      "Affected dimensions must be unique.",
      context,
    );
    addDuplicateValueIssue(
      finding.blockerCodes,
      ["findings", index, "blockerCodes"],
      "Finding blocker codes must be unique.",
      context,
    );
    const targetKeys = finding.targets.map(buildExcellenceTargetKey);
    addDuplicateValueIssue(
      targetKeys,
      ["findings", index, "targets"],
      "Finding targets must be unique.",
      context,
    );
    for (const area of finding.affectedDimensions) {
      const areaNeedsRepair = isExcellenceDimension(area)
        ? getExcellenceRepairDimensions(review).has(area)
        : review.guardrails[area].status === "fail";
      if (!areaNeedsRepair && !blockerDimensions.has(area)) {
        context.addIssue({
          code: "custom",
          path: ["findings", index, "affectedDimensions"],
          message: `Finding area ${area} must fail its visual/guardrail gate or be blocked.`,
        });
      }
    }
    if (finding.severity === "blocker" && finding.blockerCodes.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["findings", index, "blockerCodes"],
        message: "A blocker finding requires at least one blocker code.",
      });
    }
    if (finding.severity !== "blocker" && finding.blockerCodes.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["findings", index, "blockerCodes"],
        message: "Only blocker findings may link blocker codes.",
      });
    }
    for (const blockerCode of finding.blockerCodes) {
      if (!blockerCodes.has(blockerCode)) {
        context.addIssue({
          code: "custom",
          path: ["findings", index, "blockerCodes"],
          message: `Finding references unknown blocker ${blockerCode}.`,
        });
      }
    }
    for (const [observationIndex, observation] of finding.observations.entries()) {
      const observationHasTarget =
        observation.sectionId || observation.toolId || observation.dataSlot;
      if (
        observationHasTarget &&
        !finding.targets.some((target) =>
          excellenceTargetCoversObservation(target, observation),
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["findings", index, "observations", observationIndex],
          message: "Observation target must be covered by one of the finding targets.",
        });
      }
    }
    if (finding.severity === "blocker" && finding.repairStrategy === "local_patch") {
      context.addIssue({
        code: "custom",
        path: ["findings", index, "repairStrategy"],
        message: "A blocker cannot be assigned local_patch.",
      });
    }
    if (finding.severity === "blocker") {
      const minimumStrategy = getMinimumBlockerRepairStrategy(finding.targets);
      if (
        repairStrategyPriority[finding.repairStrategy] <
        repairStrategyPriority[minimumStrategy]
      ) {
        context.addIssue({
          code: "custom",
          path: ["findings", index, "repairStrategy"],
          message: `A blocker spanning these targets requires at least ${minimumStrategy}.`,
        });
      }
    }
    for (const blockerCode of finding.blockerCodes) {
      const blocker = review.blockers.find((item) => item.code === blockerCode);
      if (
        blocker &&
        blocker.dimension !== "reviewInfrastructure" &&
        !finding.affectedDimensions.includes(blocker.dimension)
      ) {
        context.addIssue({
          code: "custom",
          path: ["findings", index, "affectedDimensions"],
          message: `Finding must include linked blocker dimension ${blocker.dimension}.`,
        });
      }
    }
  });

  return issues;
}

const repairStrategyPriority = {
  local_patch: 0,
  component_rewrite: 1,
  section_rewrite: 2,
  page_relayout: 3,
  site_regeneration: 4,
} as const;

function getMinimumBlockerRepairStrategy(
  targets: z.infer<typeof excellenceTargetSchema>[],
): keyof typeof repairStrategyPriority {
  const pageWide = targets.some(
    (target) => !target.sectionId && !target.toolId && !target.dataSlot,
  );
  const sectionIds = new Set(
    targets.flatMap((target) => (target.sectionId ? [target.sectionId] : [])),
  );
  if (pageWide || sectionIds.size > 1) return "page_relayout";

  const toolIds = new Set(
    targets.flatMap((target) => (target.toolId ? [target.toolId] : [])),
  );
  const hasSectionLevelTarget = targets.some(
    (target) => target.sectionId && !target.toolId,
  );
  if (hasSectionLevelTarget || toolIds.size > 1) return "section_rewrite";
  return toolIds.size === 1 ? "component_rewrite" : "section_rewrite";
}

function getMaximumFindingRepairStrategy(
  targets: z.infer<typeof excellenceTargetSchema>[],
): keyof typeof repairStrategyPriority {
  const sectionIds = new Set(
    targets.flatMap((target) => (target.sectionId ? [target.sectionId] : [])),
  );
  const hasUnlocatedTarget = targets.some(
    (target) => !target.sectionId && !target.toolId && !target.dataSlot,
  );
  if (hasUnlocatedTarget || sectionIds.size !== 1) return "page_relayout";

  const toolIds = new Set(
    targets.flatMap((target) => (target.toolId ? [target.toolId] : [])),
  );
  const onlyOneTool =
    toolIds.size === 1 &&
    targets.every((target) => target.toolId || target.dataSlot);
  return onlyOneTool ? "component_rewrite" : "section_rewrite";
}

function addDuplicateCodeIssues(
  values: string[],
  path: "blockers" | "findings",
  context: ExcellenceReviewSemanticIssueCollector,
) {
  addDuplicateValueIssue(
    values,
    [path],
    `${path === "findings" ? "Finding" : "Blocker"} codes must be unique.`,
    context,
  );
}

function addDuplicateValueIssue(
  values: string[],
  path: Array<string | number>,
  message: string,
  context: ExcellenceReviewSemanticIssueCollector,
) {
  if (new Set(values).size === values.length) return;
  context.addIssue({ code: "custom", path, message });
}

function buildExcellenceTargetKey(target: {
  sectionId: string | null;
  toolId: string | null;
  dataSlot: string | null;
}) {
  return [target.sectionId ?? "", target.toolId ?? "", target.dataSlot ?? ""].join(
    "\u0000",
  );
}

function excellenceTargetCoversObservation(
  target: {
    sectionId: string | null;
    toolId: string | null;
    dataSlot: string | null;
  },
  observation: {
    sectionId: string | null;
    toolId: string | null;
    dataSlot: string | null;
  },
) {
  return (["sectionId", "toolId", "dataSlot"] as const).every(
    (key) => target[key] === null || target[key] === observation[key],
  );
}

export const EXCELLENCE_REVIEW_INSTRUCTIONS = `You are an independent visual-quality gate. You did not build the artifact. Judge only the delivered canonical product shown in the explicitly labeled full-page screenshots and the supplied request, visual-pattern reference, and source. Do not write code, CSS declarations, or arbitrary pixel prescriptions. Do not use a product-type-specific rubric. Write every narrative field in the dominant language of the original user request. Technical layout validity alone is never sufficient for pass.

First assess two non-tradeable guardrails as pass or fail: briefIntegrity covers required product purpose, content, sections, and actions; brandContentIntegrity covers target-brand/content consistency and reference-brand contamination. Use not_assessed only when Reviewer infrastructure prevents a real assessment. A failed guardrail or any blocker means verdict=fail and cannot be offset by visual scores.

Then score seven visual dimensions from 1-10 using the supplied weights: visualImpact 15% (first impression, distinctiveness, coherent art direction); compositionHierarchy 20% (macro composition, focal path, content order, and CTA priority); typographyQuality 15% (scale, weight, line height, line length, and type hierarchy); colorImageryQuality 10% (color relationships, image choice/crop, overlays, and media/text integration); spatialCraft 15% (spacing, alignment, density, rhythm, whitespace, and section transitions); designSystemApplication 10% (adaptation of transferable reference patterns); responsiveComposition 15% (deliberate recomposition across desktop, tablet, and mobile rather than mechanical shrinking).

Use this score calibration consistently: 9-10 is exceptional and has no meaningful visible deficiency; 8 is strong and coherent; 7 is acceptable but visibly refinable; 6 is serviceable only in a non-critical dimension when balanced by stronger work; 3-5 has major or severe visual weaknesses; 1-2 is unusable, corrupted, or unsupported by valid evidence. Every visual score must cite at least two concrete, dimension-specific observations and evidence must not be copied across dimensions. The weighted visual score must be at least 7.5, compositionHierarchy and responsiveComposition must each be at least 7, every other visual dimension must be at least 6, every guardrail must pass, and blockers must be empty for verdict=pass.

The supplied design-system document is a visual-pattern reference, not the target brand. The original user request has priority over the reference. For designSystemApplication, evaluate only transferable visual properties: color roles, typography, spacing, density, radii, borders, layout rhythm, surface composition, component treatment, responsive behavior, and motion. Adapt those patterns to the requested product category. Do not require or reward the reference company's or product's name, logo, mark, wordmark, navigation labels, marketing copy, information architecture, proprietary product UI, imagery policy, or product-specific content. Never lower a score because reference-brand identifiers or source-product content are absent, even when the reference document describes them with mandatory language.

For brandContentIntegrity, derive the target identity from the original user request and the artifact's consistent non-reference identity. Importing the reference brand or mixing it with the requested brand without an explicit user request is brand contamination and may be blocked. Absence of the reference brand is never a defect.

When verdict=fail, produce one finding per visible root cause, not one finding per dimension and not one finding per target. A single root-cause finding may name several affectedDimensions and targets. Every failed guardrail, every visual dimension below its individual floor, every concrete root cause responsible for a weighted-score failure, and every blocker must be covered by at least one finding. A dimension that meets its individual floor is not independently failed merely because the weighted score is below 7.5; include it in a finding only when that finding's visible root cause actually affects it. Do not duplicate a code, objective, observation, or repair contract merely because the same root cause affects multiple dimensions or locations. Link each blocker through blockerCodes and use unique, stable, semantic snake-case codes.

Each observation must identify the exact screenshot viewport and, when possible, the exact Section, Tool, or data-slot ID from the canonical source. Do not provide a separate affectedViewports field; the system derives the affected viewport set from observations. Keep all affected targets together in the finding's targets array. Every targeted observation must be covered by at least one finding target: every non-null sectionId, toolId, and dataSlot on that target must exactly equal the corresponding observation field. An observation may add more-specific IDs beneath a broader target; for example, target {sectionId: "products", toolId: null, dataSlot: null} covers observation {sectionId: "products", toolId: "product-grid", dataSlot: null}. A target for a different section or tool does not cover the observation. If the problem is genuinely page-wide, use one target with null IDs and explain why. State the smallest adequate repair strategy. local_patch is for one localized target, component_rewrite for one component, section_rewrite for one section, page_relayout only applies when one shared composition root cause requires coordinated changes across sections, and site_regeneration only applies to pervasive product-level failure. Split unrelated section defects into separate findings even when they affect the same viewport or dimension. A blocker cannot use local_patch.

Acceptance criteria must be binary and visibly verifiable from the named screenshots or canonical source. Avoid vague criteria such as “feels polished,” “better rhythm,” “clearer hierarchy,” “not crowded,” or “easy to scan” unless they are followed by a concrete observable condition. prohibitedTactics must name plausible ways the defect could be concealed without being solved. When verdict=pass, findings and blockers must both be empty.`;

export function buildExcellencePreservationContract(
  review: ExcellenceReview,
): ExcellencePreservationContract {
  return {
    dimensions: Object.fromEntries(
      excellenceVisualDimensionNames.flatMap((dimension) =>
        review.dimensions[dimension].score >= requiredVisualScore(dimension)
          ? [[dimension, requiredVisualScore(dimension)]]
          : [],
      ),
    ) as Partial<Record<ExcellenceDimension, number>>,
    guardrails: excellenceGuardrailNames.filter(
      (guardrail) => review.guardrails[guardrail].status === "pass",
    ),
  };
}

export function buildStableExcellenceFindingId(
  finding: ExcellenceReview["findings"][number],
) {
  const identity = JSON.stringify({
    category: finding.category,
    dimensions: [...new Set(finding.affectedDimensions)].sort(),
    viewports: getExcellenceFindingAffectedViewports(finding),
    targets: finding.targets
      .map(({ sectionId, toolId, dataSlot }) => ({ sectionId, toolId, dataSlot }))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
  });
  return createHash("sha256").update(identity).digest("hex").slice(0, 20);
}

export function compareExcellenceReviewCycle({
  baselineArtifactDigest,
  baseline,
  candidateArtifactDigest,
  candidate,
}: {
  baselineArtifactDigest: string;
  baseline: ExcellenceReview;
  candidateArtifactDigest: string;
  candidate: ExcellenceReview;
}): ExcellenceReviewComparison {
  const dimensions = Object.keys(baseline.dimensions) as ExcellenceDimension[];
  const scoreDelta = Object.fromEntries(
    dimensions.map((dimension) => [
      dimension,
      candidate.dimensions[dimension].score - baseline.dimensions[dimension].score,
    ]),
  ) as Record<ExcellenceDimension, number>;
  const baselineFindingIds = new Set(
    baseline.findings.map(buildStableExcellenceFindingId),
  );
  const candidateFindingIds = new Set(
    candidate.findings.map(buildStableExcellenceFindingId),
  );
  const baselineBlockers = new Set(
    baseline.blockers.map((blocker) => blocker.code),
  );
  const introducedBlockerCodes = candidate.blockers
    .map((blocker) => blocker.code)
    .filter((code) => !baselineBlockers.has(code));
  const introducedFindingIds = [...candidateFindingIds].filter(
    (id) => !baselineFindingIds.has(id),
  );
  const introducedSevereFindingIds = candidate.findings
    .filter(
      (finding) =>
        finding.severity !== "minor" &&
        !baselineFindingIds.has(buildStableExcellenceFindingId(finding)),
    )
    .map(buildStableExcellenceFindingId);
  const regressedGuardrails = excellenceGuardrailNames.filter(
    (guardrail) =>
      baseline.guardrails[guardrail].status === "pass" &&
      candidate.guardrails[guardrail].status !== "pass",
  );
  const regressedDimensions = dimensions.filter(
    (dimension) =>
      baseline.dimensions[dimension].score >= requiredVisualScore(dimension) &&
      candidate.dimensions[dimension].score < requiredVisualScore(dimension),
  );
  const materiallyLowerDimensions = dimensions.filter(
    (dimension) => scoreDelta[dimension] <= -2,
  );
  const baselineWeightedScore = calculateExcellenceWeightedScore(baseline);
  const candidateWeightedScore = calculateExcellenceWeightedScore(candidate);
  const weightedScoreDelta =
    Math.round((candidateWeightedScore - baselineWeightedScore) * 100) / 100;
  const ranking = compareExcellenceReviews(candidate, baseline);

  return {
    baselineArtifactDigest,
    candidateArtifactDigest,
    scoreDelta,
    resolvedFindingIds: [...baselineFindingIds].filter(
      (id) => !candidateFindingIds.has(id),
    ),
    remainingFindingIds: [...baselineFindingIds].filter((id) =>
      candidateFindingIds.has(id),
    ),
    introducedFindingIds,
    introducedSevereFindingIds,
    introducedBlockerCodes,
    regressedGuardrails,
    regressedDimensions,
    baselineWeightedScore,
    candidateWeightedScore,
    weightedScoreDelta,
    pairwisePreference:
      ranking > 0 ? "candidate" : ranking < 0 ? "baseline" : "equivalent",
    materialRegression:
      introducedBlockerCodes.length > 0 ||
      regressedGuardrails.length > 0 ||
      regressedDimensions.length > 0 ||
      materiallyLowerDimensions.length > 0 ||
      introducedSevereFindingIds.length > 0,
  };
}

export function buildExcellenceReviewReport({
  review,
  comparison,
  rollbackToBaseline,
  issues,
}: {
  review: ExcellenceReview;
  comparison?: ExcellenceReviewComparison;
  rollbackToBaseline: boolean;
  issues: unknown[];
}): ExcellenceReviewReport {
  const dimensions = [...excellenceVisualDimensionNames];
  const infrastructureFailure = review.blockers.some(
    (blocker) => blocker.dimension === "reviewInfrastructure",
  );
  const weightedScore = infrastructureFailure
    ? null
    : calculateExcellenceWeightedScore(review);
  const failedDimensions = infrastructureFailure
    ? []
    : getExcellenceFailedDimensions(review);
  const failedGuardrails = infrastructureFailure
    ? []
    : getExcellenceFailedGuardrails(review);
  const blockerCodes = review.blockers.map((blocker) => blocker.code);
  const scoreDeltas = comparison ? Object.values(comparison.scoreDelta) : [];
  const hasImprovedScore = scoreDeltas.some((delta) => delta > 0);
  const hasRegressedScore = scoreDeltas.some((delta) => delta < 0);

  return {
    verdict: review.verdict,
    gate: {
      minimumPassingScore: EXCELLENCE_PASS_SCORE,
      minimumWeightedScore: EXCELLENCE_PASS_SCORE,
      minimumDimensionScore: EXCELLENCE_MIN_VISUAL_SCORE,
      criticalDimensionMinimumScore: EXCELLENCE_CRITICAL_VISUAL_SCORE,
      visualWeights: EXCELLENCE_VISUAL_WEIGHTS,
      weightedScore,
      failedDimensions,
      failedGuardrails,
      blockerCodes,
      failureReasons: [
        ...(failedDimensions.length > 0
          ? [
              {
                code: "score_below_threshold" as const,
                dimensions: failedDimensions,
              },
            ]
          : []),
        ...(weightedScore !== null && weightedScore < EXCELLENCE_PASS_SCORE
          ? [
              {
                code: "weighted_score_below_threshold" as const,
              },
            ]
          : []),
        ...(failedGuardrails.length > 0
          ? [
              {
                code: "guardrail_failed" as const,
                guardrails: failedGuardrails,
              },
            ]
          : []),
        ...(blockerCodes.length > 0
          ? [
              {
                code: "blocker_present" as const,
                blockerCodes,
              },
            ]
          : []),
      ],
    },
    guardrails: review.guardrails,
    scores: Object.fromEntries(
      dimensions.map((dimension) => [
        dimension,
        review.dimensions[dimension].score,
      ]),
    ) as Record<ExcellenceDimension, number>,
    scoreEvidence: Object.fromEntries(
      dimensions.map((dimension) => [
        dimension,
        review.dimensions[dimension].evidence,
      ]),
    ) as Record<ExcellenceDimension, string[]>,
    summary: review.summary,
    blockerCount: review.blockers.length,
    blockers: review.blockers,
    ...(comparison
      ? {
          comparison,
          comparisonSummary: {
            scoreTrend:
              hasImprovedScore && hasRegressedScore
                ? ("mixed" as const)
                : hasImprovedScore
                  ? ("improved" as const)
                  : hasRegressedScore
                    ? ("regressed" as const)
                    : ("unchanged" as const),
            pairwisePreference: comparison.pairwisePreference,
            resolvedFindingCount: comparison.resolvedFindingIds.length,
            remainingFindingCount: comparison.remainingFindingIds.length,
            introducedFindingCount: comparison.introducedFindingIds.length,
            materialRegression: comparison.materialRegression,
          },
        }
      : {}),
    rollbackToBaseline,
    issues: issues.map(stripIssueComparison),
  };
}

function stripIssueComparison(issue: unknown) {
  if (typeof issue !== "object" || issue === null || Array.isArray(issue)) {
    return issue;
  }
  const { comparison: _comparison, ...reportIssue } = issue as Record<
    string,
    unknown
  >;
  return reportIssue;
}

export function shouldPromoteExcellenceCandidate({
  baseline,
  candidate,
  comparison,
}: {
  baseline: ExcellenceReview;
  candidate: ExcellenceReview;
  comparison: ExcellenceReviewComparison;
}) {
  if (comparison.materialRegression) return false;
  if (comparison.weightedScoreDelta < 0) return false;
  if (candidate.verdict === "pass" && baseline.verdict === "fail") return true;
  const meaningfulImprovement =
    comparison.resolvedFindingIds.length > 0 ||
    comparison.weightedScoreDelta >= EXCELLENCE_MEANINGFUL_IMPROVEMENT;
  return (
    meaningfulImprovement && comparison.pairwisePreference !== "baseline"
  );
}

export function shouldRollbackExcellenceCandidate(args: {
  baseline: ExcellenceReview;
  candidate: ExcellenceReview;
  comparison: ExcellenceReviewComparison;
}) {
  return !shouldPromoteExcellenceCandidate(args);
}

export function compareExcellenceReviews(
  candidate: ExcellenceReview,
  baseline: ExcellenceReview,
) {
  if (candidate.verdict !== baseline.verdict) {
    return candidate.verdict === "pass" ? 1 : -1;
  }
  const candidateFailedGuardrails =
    getExcellenceFailedGuardrails(candidate).length;
  const baselineFailedGuardrails =
    getExcellenceFailedGuardrails(baseline).length;
  if (candidateFailedGuardrails !== baselineFailedGuardrails) {
    return baselineFailedGuardrails - candidateFailedGuardrails;
  }
  if (candidate.blockers.length !== baseline.blockers.length) {
    return baseline.blockers.length - candidate.blockers.length;
  }

  const candidateFailedDimensions = getExcellenceFailedDimensions(candidate).length;
  const baselineFailedDimensions = getExcellenceFailedDimensions(baseline).length;
  if (candidateFailedDimensions !== baselineFailedDimensions) {
    return baselineFailedDimensions - candidateFailedDimensions;
  }

  const weightedDelta =
    calculateExcellenceWeightedScore(candidate) -
    calculateExcellenceWeightedScore(baseline);
  if (weightedDelta !== 0) return weightedDelta;

  if (candidate.findings.length !== baseline.findings.length) {
    return baseline.findings.length - candidate.findings.length;
  }
  return 0;
}

export type QualitySnapshot = {
  sizeBytes: number;
  lineCount: number;
  sectionCount: number;
  textValues: string[];
  repeatedPhrases: string[];
};

export function buildQualitySnapshot(source: string): QualitySnapshot {
  const textValues = extractJsxTextValues(source);

  return {
    sizeBytes: Buffer.byteLength(source, "utf8"),
    lineCount: source.split(/\r?\n/).length,
    sectionCount: countMatches(source, /<Section(?:\s|>)/g),
    textValues,
    repeatedPhrases: findRepeatedPhrases(textValues),
  };
}

export function inspectQualityRegression({
  baseline,
  candidate,
}: {
  baseline: QualitySnapshot | undefined;
  candidate: QualitySnapshot;
}) {
  const issues: Array<Record<string, unknown>> = [];

  for (const phrase of candidate.repeatedPhrases) {
    issues.push({
      code: "quality_repeated_text_regression",
      message: `The canonical delivery contains repeated adjacent text: ${phrase}`,
      value: phrase,
      presentInBaseline: baseline?.repeatedPhrases.includes(phrase) ?? false,
    });
  }

  if (!baseline) {
    return issues;
  }

  if (
    baseline.sectionCount >= 3 &&
    candidate.sectionCount < Math.ceil(baseline.sectionCount * 0.5)
  ) {
    issues.push({
      code: "quality_catastrophic_section_loss",
      message: `Section count collapsed from ${baseline.sectionCount} to ${candidate.sectionCount} after a previously passing repair check.`,
      priorCount: baseline.sectionCount,
      currentCount: candidate.sectionCount,
    });
  }

  if (
    baseline.textValues.length >= 8 &&
    candidate.textValues.length < baseline.textValues.length * 0.7
  ) {
    issues.push({
      code: "quality_content_loss_regression",
      message: `Visible content entries fell from ${baseline.textValues.length} to ${candidate.textValues.length} after repair.`,
      priorCount: baseline.textValues.length,
      currentCount: candidate.textValues.length,
    });
  }

  return issues;
}

export function getExcellenceReviewIssues(review: ExcellenceReview) {
  const blockersByDimension = Map.groupBy(
    review.blockers,
    (blocker) => blocker.dimension,
  );

  const infrastructureBlockers =
    blockersByDimension.get("reviewInfrastructure") ?? [];
  if (infrastructureBlockers.length > 0) {
    return [
      {
        ...buildExcellenceDimensionIssue(
          "reviewInfrastructure",
          undefined,
          infrastructureBlockers,
        ),
        code:
          infrastructureBlockers[0]?.code ??
          "excellence_review_infrastructure_unavailable",
      },
    ];
  }

  const issues: Array<Record<string, unknown>> = [];
  const mustPreserve = buildExcellencePreservationContract(review);
  const repairDimensions = getExcellenceRepairDimensions(review);
  for (const finding of review.findings) {
    const targets = finding.targets.map(compactFindingTarget);
    const commonTarget = getCommonFindingTarget(finding.targets);
    const affectedViewports = getExcellenceFindingAffectedViewports(finding);
    const scope = {
      ...(affectedViewports.length === 1
        ? { viewport: affectedViewports[0] }
        : {}),
      ...commonTarget,
      dimension: finding.primaryDimension,
    };
    const observations = finding.observations.map((observation) => ({
      viewport: observation.viewport,
      ...(observation.sectionId
        ? { sectionId: observation.sectionId }
        : {}),
      ...(observation.toolId ? { toolId: observation.toolId } : {}),
      ...(observation.dataSlot ? { dataSlot: observation.dataSlot } : {}),
      observation: observation.observation,
    }));
    issues.push({
      code: `excellence_finding_${normalizeIssueCode(finding.code)}`,
      findingId: buildStableExcellenceFindingId(finding),
      message: formatFindingObservations(finding.observations),
      dimension: finding.primaryDimension,
      dimensions: [...new Set(finding.affectedDimensions)],
      category: finding.category,
      severity: finding.severity,
      blockerCodes: finding.blockerCodes,
      requiresRepair: true,
      requiredRepairStrategy: finding.repairStrategy,
      maximumRepairStrategy: getMaximumFindingRepairStrategy(finding.targets),
      scores: Object.fromEntries(
        finding.affectedDimensions.flatMap((area) =>
          isExcellenceDimension(area)
            ? [[area, review.dimensions[area].score]]
            : [],
        ),
      ),
      guardrails: Object.fromEntries(
        finding.affectedDimensions.flatMap((area) =>
          isExcellenceGuardrail(area)
            ? [[area, review.guardrails[area].status]]
            : [],
        ),
      ),
      mustPreserve,
      affectedViewports,
      targets,
      observations,
      scope,
      repairIntent: {
        objective: finding.objective,
        acceptanceCriteria: finding.acceptanceCriteria,
        prohibitedTactics: finding.prohibitedTactics,
      },
    });
  }
  const reportedAreas = new Set<string>();

  for (const dimension of excellenceVisualDimensionNames) {
    const assessment = review.dimensions[dimension];
    const blockers = blockersByDimension.get(dimension) ?? [];
    if (!repairDimensions.has(dimension) && blockers.length === 0) {
      continue;
    }

    if (
      review.findings.some((finding) =>
        finding.affectedDimensions.includes(dimension),
      )
    ) {
      reportedAreas.add(dimension);
      continue;
    }

    issues.push({
      ...buildExcellenceDimensionIssue(
        dimension,
        assessment,
        blockers,
        repairDimensions.has(dimension),
      ),
      scores: { [dimension]: assessment.score },
      mustPreserve,
    });
    reportedAreas.add(dimension);
  }

  for (const guardrail of excellenceGuardrailNames) {
    const assessment = review.guardrails[guardrail];
    const blockers = blockersByDimension.get(guardrail) ?? [];
    if (assessment.status === "pass" && blockers.length === 0) continue;
    if (
      review.findings.some((finding) =>
        finding.affectedDimensions.includes(guardrail),
      )
    ) {
      reportedAreas.add(guardrail);
      continue;
    }
    issues.push({
      ...buildExcellenceGuardrailIssue(guardrail, assessment, blockers),
      mustPreserve,
    });
    reportedAreas.add(guardrail);
  }

  for (const [dimension, blockers] of blockersByDimension) {
    if (reportedAreas.has(dimension)) continue;
    issues.push({
      ...buildExcellenceDimensionIssue(dimension, undefined, blockers),
      mustPreserve,
    });
  }

  if (
    review.verdict === "fail" &&
    issues.length === 0 &&
    calculateExcellenceWeightedScore(review) < EXCELLENCE_PASS_SCORE
  ) {
    issues.push({
      code: "excellence_weighted_score_failed",
      message: review.summary,
      weightedScore: calculateExcellenceWeightedScore(review),
      minimumWeightedScore: EXCELLENCE_PASS_SCORE,
      requiresRepair: true,
    });
  } else if (review.verdict === "fail" && issues.length === 0) {
    issues.push({ code: "excellence_review_failed", message: review.summary });
  }

  return issues;
}

function compactFindingTarget(
  target: ExcellenceReview["findings"][number]["targets"][number],
) {
  return {
    ...(target.sectionId ? { sectionId: target.sectionId } : {}),
    ...(target.toolId ? { toolId: target.toolId } : {}),
    ...(target.dataSlot ? { dataSlot: target.dataSlot } : {}),
    rationale: target.rationale,
  };
}

function getCommonFindingTarget(
  targets: ExcellenceReview["findings"][number]["targets"],
) {
  const common: Record<string, string> = {};
  for (const key of ["sectionId", "toolId", "dataSlot"] as const) {
    const values = [...new Set(targets.map((target) => target[key]))];
    if (values.length === 1 && values[0]) common[key] = values[0];
  }
  return common;
}

function formatFindingObservations(
  observations: ExcellenceReview["findings"][number]["observations"],
) {
  return observations
    .map((item) => {
      const target = [item.sectionId, item.toolId, item.dataSlot]
        .filter((value): value is string => !!value)
        .join("/");
      return `[${item.viewport}${target ? ` ${target}` : ""}] ${item.observation}`;
    })
    .join(" ");
}

function normalizeIssueCode(code: string) {
  return code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "") || "unspecified";
}

function buildExcellenceDimensionIssue(
  dimension: string,
  assessment:
    | ExcellenceReview["dimensions"][keyof ExcellenceReview["dimensions"]]
    | undefined,
  blockers: ExcellenceReview["blockers"],
  scoreFailure = false,
) {
  const blockerCodes = blockers.map((blocker) => blocker.code);
  const parts: string[] = [];

  if (assessment && scoreFailure) {
    parts.push(
      `${dimension} scored ${assessment.score}/10. ${assessment.evidence.join(" ")}`,
    );
  }
  if (blockers.length > 0) {
    parts.push(
      `Blockers: ${[...new Set(blockers.map((blocker) => blocker.evidence))].join(" ")}`,
    );
  }

  return {
    code:
      assessment && scoreFailure
        ? "excellence_dimension_failed"
        : "excellence_dimension_blocked",
    message: parts.join(" "),
    dimension,
    requiresRepair: true,
    ...(assessment ? { score: assessment.score } : {}),
    ...(blockerCodes.length > 0 ? { blockerCodes } : {}),
  };
}

function buildExcellenceGuardrailIssue(
  guardrail: ExcellenceGuardrail,
  assessment: ExcellenceReview["guardrails"][ExcellenceGuardrail],
  blockers: ExcellenceReview["blockers"],
) {
  const blockerCodes = blockers.map((blocker) => blocker.code);
  const parts = [
    ...(assessment.status !== "pass"
      ? [
          `${guardrail} ${assessment.status}. ${assessment.evidence.join(" ")}`,
        ]
      : []),
    ...(blockers.length > 0
      ? [
          `Blockers: ${[
            ...new Set(blockers.map((blocker) => blocker.evidence)),
          ].join(" ")}`,
        ]
      : []),
  ];
  return {
    code:
      assessment.status !== "pass"
        ? "excellence_guardrail_failed"
        : "excellence_dimension_blocked",
    message: parts.join(" "),
    dimension: guardrail,
    guardrailStatus: assessment.status,
    requiresRepair: true,
    ...(blockerCodes.length > 0 ? { blockerCodes } : {}),
  };
}

function extractJsxTextValues(source: string) {
  const values: string[] = [];

  for (const match of source.matchAll(/>([^<>{}]+)</g)) {
    const value = compactText(match[1] ?? "");
    if (value) values.push(value);
  }

  for (const match of source.matchAll(
    /\b(?:title|description|label|children|alt|placeholder)\s*=\s*["']([^"']+)["']/g,
  )) {
    const value = compactText(match[1] ?? "");
    if (value) values.push(value);
  }

  return [...new Set(values)];
}

function findRepeatedPhrases(values: string[]) {
  const repeats = new Set<string>();

  for (const value of values) {
    const words = value.match(/[\p{L}\p{N}]+/gu) ?? [];
    for (let index = 1; index < words.length; index += 1) {
      const previous = words[index - 1] ?? "";
      const current = words[index] ?? "";
      if (
        previous.length >= 3 &&
        previous.localeCompare(current, undefined, { sensitivity: "base" }) === 0
      ) {
        repeats.add(`${previous} ${current}`);
      }
    }
  }

  return [...repeats];
}

function compactText(value: string) {
  return value.replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
}

function countMatches(source: string, pattern: RegExp) {
  return Array.from(source.matchAll(pattern)).length;
}
