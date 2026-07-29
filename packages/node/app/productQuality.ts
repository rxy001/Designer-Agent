import { z } from "zod";
import { createHash } from "node:crypto";

const nonBlankString = (maxLength: number) =>
  z.string().min(1).max(maxLength).regex(/\S/u);

export const excellenceDimensionSchema = z.object({
  score: z.number().int().min(1).max(10),
  evidence: z.array(nonBlankString(500)).min(2).max(6),
});

const excellenceDimensionNameSchema = z.enum([
  "briefFidelity",
  "designSystemFidelity",
  "visualHierarchy",
  "craftQuality",
  "responsiveQuality",
  "brandContentIntegrity",
  "semanticAccessibility",
]);

const excellenceViewportSchema = z.enum(["desktop", "tablet", "mobile"]);

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
  primaryDimension: excellenceDimensionNameSchema,
  affectedDimensions: z.array(excellenceDimensionNameSchema).min(1).max(7),
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
  observed: nonBlankString(800),
  expected: nonBlankString(800),
  affectedViewports: z.array(excellenceViewportSchema).min(1).max(3),
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
});

// This wire schema is used unchanged by zodTextFormat and its response parser.
// Keep transforms and cross-field refinements out of it: those cannot be
// represented faithfully in the model-facing JSON Schema. Put such rules in
// getExcellenceReviewSemanticIssues instead.
export const excellenceReviewSchema = z.object({
  verdict: z.enum(["pass", "fail"]),
  dimensions: z.object({
    briefFidelity: excellenceDimensionSchema,
    designSystemFidelity: excellenceDimensionSchema,
    visualHierarchy: excellenceDimensionSchema,
    craftQuality: excellenceDimensionSchema,
    responsiveQuality: excellenceDimensionSchema,
    brandContentIntegrity: excellenceDimensionSchema,
    semanticAccessibility: excellenceDimensionSchema,
  }),
  blockers: z
    .array(
      z.object({
        code: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/u),
        dimension: z.union([
          excellenceDimensionNameSchema,
          z.literal("reviewInfrastructure"),
        ]),
        evidence: nonBlankString(800),
      }),
    )
    .max(20),
  findings: z.array(excellenceFindingSchema).max(12),
  summary: nonBlankString(1200),
});

export type ExcellenceReview = z.infer<typeof excellenceReviewSchema>;
export type ExcellenceDimension = z.infer<typeof excellenceDimensionNameSchema>;

export const EXCELLENCE_PASS_SCORE = 7;

export type ExcellencePreservationContract = {
  dimensions: Partial<Record<ExcellenceDimension, number>>;
};

export type ExcellenceReviewComparison = {
  baselineArtifactDigest: string;
  candidateArtifactDigest: string;
  scoreDelta: Record<ExcellenceDimension, number>;
  resolvedFindingIds: string[];
  remainingFindingIds: string[];
  introducedFindingIds: string[];
  introducedBlockerCodes: string[];
  regressedDimensions: ExcellenceDimension[];
  materialRegression: boolean;
};

export type ExcellenceReviewReport = {
  verdict: ExcellenceReview["verdict"];
  gate: {
    minimumPassingScore: number;
    failedDimensions: ExcellenceDimension[];
    blockerCodes: string[];
    failureReasons: Array<{
      code: "score_below_threshold" | "blocker_present";
      dimensions?: ExcellenceDimension[];
      blockerCodes?: string[];
    }>;
  };
  scores: Record<ExcellenceDimension, number>;
  scoreEvidence: Record<ExcellenceDimension, string[]>;
  summary: string;
  blockerCount: number;
  blockers: ExcellenceReview["blockers"];
  comparison?: ExcellenceReviewComparison;
  comparisonSummary?: {
    scoreTrend: "improved" | "regressed" | "mixed" | "unchanged";
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
    for (const [dimension, assessment] of Object.entries(review.dimensions)) {
      if (assessment.score < EXCELLENCE_PASS_SCORE) {
        context.addIssue({
          code: "custom",
          path: ["dimensions", dimension, "score"],
          message: `A passing review cannot contain a score below ${EXCELLENCE_PASS_SCORE}.`,
        });
      }
    }
  }

  const infrastructureFailure = review.blockers.some(
    (blocker) => blocker.dimension === "reviewInfrastructure",
  );
  if (review.verdict === "fail" && !infrastructureFailure) {
    const hasFailureReason =
      review.blockers.length > 0 ||
      Object.values(review.dimensions).some(
        ({ score }) => score < EXCELLENCE_PASS_SCORE,
      );
    if (!hasFailureReason) {
      context.addIssue({
        code: "custom",
        path: ["verdict"],
        message: `A failing review requires a blocker or a score below ${EXCELLENCE_PASS_SCORE}.`,
      });
    }
    for (const [dimension, assessment] of Object.entries(review.dimensions)) {
      if (
        assessment.score < EXCELLENCE_PASS_SCORE &&
        !review.findings.some((finding) =>
          finding.affectedDimensions.includes(
            dimension as z.infer<typeof excellenceDimensionNameSchema>,
          ),
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["findings"],
          message: `Failed dimension ${dimension} requires an actionable finding.`,
        });
      }
    }
  }

  for (const blocker of review.blockers) {
    if (blocker.dimension === "reviewInfrastructure") continue;
    const linkedFinding = review.findings.find((finding) =>
      finding.blockerCodes.includes(blocker.code),
    );
    if (!linkedFinding) {
      context.addIssue({
        code: "custom",
        path: ["findings"],
        message: `Blocker ${blocker.code} requires a linked actionable finding.`,
      });
    } else if (linkedFinding.severity !== "blocker") {
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
      finding.affectedViewports,
      ["findings", index, "affectedViewports"],
      "Affected viewports must be unique.",
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
    for (const dimension of finding.affectedDimensions) {
      if (
        review.dimensions[dimension].score >= EXCELLENCE_PASS_SCORE &&
        !blockerDimensions.has(dimension)
      ) {
        context.addIssue({
          code: "custom",
          path: ["findings", index, "affectedDimensions"],
          message: `Finding dimension ${dimension} must be below 7 or blocked.`,
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
    for (const viewport of finding.affectedViewports) {
      if (!finding.observations.some((item) => item.viewport === viewport)) {
        context.addIssue({
          code: "custom",
          path: ["findings", index, "observations"],
          message: `Affected viewport ${viewport} requires a concrete observation.`,
        });
      }
    }
    for (const [observationIndex, observation] of finding.observations.entries()) {
      if (!finding.affectedViewports.includes(observation.viewport)) {
        context.addIssue({
          code: "custom",
          path: ["findings", index, "observations", observationIndex, "viewport"],
          message: "Observation viewport must be listed in affectedViewports.",
        });
      }
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

export const EXCELLENCE_REVIEW_INSTRUCTIONS = `You are an independent product-quality gate. You did not build the artifact. Judge only the delivered canonical product shown in the explicitly labeled full-page screenshots and the supplied request, visual-pattern reference, and source. Do not write code, CSS declarations, or arbitrary pixel prescriptions. Do not assess component interaction behavior. Do not use a product-type-specific rubric. Write every narrative field in the dominant language of the original user request. A score below 7 or any blocker means verdict=fail. Technical layout validity alone is never sufficient for pass.

Use this score calibration consistently: 9-10 is exceptional and has no meaningful visible deficiency; 7-8 passes with coherent execution and only minor refinement opportunities; 5-6 has one or more major visible weaknesses; 3-4 has severe product-quality failures; 1-2 is unusable, corrupted, or unsupported by valid evidence. Every dimension score must cite at least two concrete, dimension-specific observations and evidence must not be copied across dimensions. Block brand/content corruption, missing required content/actions, transferable visual-pattern divergence, weak or inverted hierarchy, visibly poor density/rhythm, responsive degradation, and visible semantic/accessibility failures.

The supplied design-system document is a visual-pattern reference, not the target brand. The original user request has priority over the reference. For designSystemFidelity, evaluate only transferable visual properties: color roles, typography, spacing, density, radii, borders, layout rhythm, surface composition, component treatment, responsive behavior, and motion. Adapt those patterns to the requested product category. Do not require or reward the reference company's or product's name, logo, mark, wordmark, navigation labels, marketing copy, information architecture, proprietary product UI, imagery policy, or product-specific content. Never lower a score because reference-brand identifiers or source-product content are absent, even when the reference document describes them with mandatory language.

For brandContentIntegrity, derive the target identity from the original user request and the artifact's consistent non-reference identity. Importing the reference brand or mixing it with the requested brand without an explicit user request is brand contamination and may be blocked. Absence of the reference brand is never a defect.

When verdict=fail, produce one finding per visible root cause, not one finding per dimension and not one finding per target. A single root-cause finding may name several affectedDimensions and targets. Every dimension scoring below 7 and every blocker must be covered by at least one finding. Do not duplicate a code, objective, observation, or repair contract merely because the same root cause affects multiple dimensions or locations. Link each blocker through blockerCodes and use unique, stable, semantic snake-case codes.

Each observation must identify the exact screenshot viewport and, when possible, the exact Section, Tool, or data-slot ID from the canonical source. Keep all affected targets together in the finding's targets array. Every targeted observation must be covered by at least one finding target: every non-null sectionId, toolId, and dataSlot on that target must exactly equal the corresponding observation field. An observation may add more-specific IDs beneath a broader target; for example, target {sectionId: "products", toolId: null, dataSlot: null} covers observation {sectionId: "products", toolId: "product-grid", dataSlot: null}. A target for a different section or tool does not cover the observation. If the problem is genuinely page-wide, use one target with null IDs and explain why. State the smallest adequate repair strategy. local_patch is for one localized target, component_rewrite for one component, section_rewrite for one section, page_relayout only applies when one shared composition root cause requires coordinated changes across sections, and site_regeneration only applies to pervasive product-level failure. Split unrelated section defects into separate findings even when they affect the same viewport or dimension. A blocker cannot use local_patch.

Acceptance criteria must be binary and visibly verifiable from the named screenshots or canonical source. Avoid vague criteria such as “feels polished,” “better rhythm,” “clearer hierarchy,” “not crowded,” or “easy to scan” unless they are followed by a concrete observable condition. A finding may affect semanticAccessibility only when its observations cite accessibility-specific evidence from the screenshots or canonical source, such as contrast, text legibility, heading semantics, accessible names, focus presentation, or target sizing. Do not infer semantic failures from visual preference alone; contrast claims must identify the affected text/background relationship, and source-semantic claims must identify the relevant element or attribute. prohibitedTactics must name plausible ways the defect could be concealed without being solved. When verdict=pass, findings and blockers must both be empty.`;

export function buildExcellenceReviewContext({
  userRequest,
  designSystemReference,
  source,
  baseline,
}: {
  userRequest: string;
  designSystemReference: string;
  source: string;
  baseline?: {
    artifactDigest: string;
    source: string;
    review: ExcellenceReview;
  };
}) {
  return [
    "Original user request (highest authority):",
    userRequest,
    "",
    "Visual pattern reference (not the target brand):",
    designSystemReference,
    "",
    ...(baseline
      ? [
          "Best reviewed baseline artifact digest:",
          baseline.artifactDigest,
          "",
          "Best reviewed baseline JSX source:",
          baseline.source,
          "",
          "Best reviewed baseline assessment:",
          JSON.stringify(baseline.review),
          "",
          "Preservation contract from the baseline:",
          JSON.stringify(buildExcellencePreservationContract(baseline.review)),
          "",
          "Review the candidate absolutely. Use the baseline only to identify resolved findings and visible regressions; do not lower a previously passing dimension without concrete candidate evidence.",
          "",
        ]
      : []),
    "Canonical JSX source:",
    source,
    "",
    "Each following screenshot is explicitly labeled with its viewport.",
  ].join("\n");
}

export function buildExcellencePreservationContract(
  review: ExcellenceReview,
): ExcellencePreservationContract {
  return {
    dimensions: Object.fromEntries(
      Object.entries(review.dimensions).flatMap(([dimension, assessment]) =>
        assessment.score >= EXCELLENCE_PASS_SCORE
          ? [[dimension, assessment.score]]
          : [],
      ),
    ) as Partial<Record<ExcellenceDimension, number>>,
  };
}

export function buildStableExcellenceFindingId(
  finding: ExcellenceReview["findings"][number],
) {
  const identity = JSON.stringify({
    category: finding.category,
    dimensions: [...new Set(finding.affectedDimensions)].sort(),
    viewports: [...new Set(finding.affectedViewports)].sort(),
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
  const baselineBlockers = new Set(baseline.blockers.map((blocker) => blocker.code));
  const introducedBlockerCodes = candidate.blockers
    .map((blocker) => blocker.code)
    .filter((code) => !baselineBlockers.has(code));
  const regressedDimensions = dimensions.filter(
    (dimension) =>
      baseline.dimensions[dimension].score >= EXCELLENCE_PASS_SCORE &&
      candidate.dimensions[dimension].score < EXCELLENCE_PASS_SCORE,
  );
  const materiallyLowerDimensions = dimensions.filter(
    (dimension) => scoreDelta[dimension] <= -2,
  );

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
    introducedFindingIds: [...candidateFindingIds].filter(
      (id) => !baselineFindingIds.has(id),
    ),
    introducedBlockerCodes,
    regressedDimensions,
    materialRegression:
      candidate.verdict === "fail" &&
      (introducedBlockerCodes.length > 0 ||
        regressedDimensions.length > 0 ||
        materiallyLowerDimensions.length > 0),
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
  const dimensions = Object.keys(review.dimensions) as ExcellenceDimension[];
  const failedDimensions = dimensions.filter(
    (dimension) => review.dimensions[dimension].score < EXCELLENCE_PASS_SCORE,
  );
  const blockerCodes = review.blockers.map((blocker) => blocker.code);
  const scoreDeltas = comparison ? Object.values(comparison.scoreDelta) : [];
  const hasImprovedScore = scoreDeltas.some((delta) => delta > 0);
  const hasRegressedScore = scoreDeltas.some((delta) => delta < 0);

  return {
    verdict: review.verdict,
    gate: {
      minimumPassingScore: EXCELLENCE_PASS_SCORE,
      failedDimensions,
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
  if (candidate.verdict === "pass") return true;
  if (comparison.materialRegression) return false;
  if (compareExcellenceReviews(candidate, baseline) > 0) return true;
  return (
    comparison.resolvedFindingIds.length > 0 &&
    comparison.introducedFindingIds.length === 0
  );
}

export function compareExcellenceReviews(
  candidate: ExcellenceReview,
  baseline: ExcellenceReview,
) {
  const candidateScores = Object.values(candidate.dimensions).map(
    ({ score }) => score,
  );
  const baselineScores = Object.values(baseline.dimensions).map(
    ({ score }) => score,
  );
  const candidateTotal = candidateScores.reduce((sum, score) => sum + score, 0);
  const baselineTotal = baselineScores.reduce((sum, score) => sum + score, 0);
  if (candidate.verdict !== baseline.verdict) {
    return candidate.verdict === "pass" ? 1 : -1;
  }
  if (candidate.blockers.length !== baseline.blockers.length) {
    return baseline.blockers.length - candidate.blockers.length;
  }

  const candidateFailedDimensions = candidateScores.filter(
    (score) => score < EXCELLENCE_PASS_SCORE,
  ).length;
  const baselineFailedDimensions = baselineScores.filter(
    (score) => score < EXCELLENCE_PASS_SCORE,
  ).length;
  if (candidateFailedDimensions !== baselineFailedDimensions) {
    return baselineFailedDimensions - candidateFailedDimensions;
  }

  const candidateMinimum = Math.min(...candidateScores);
  const baselineMinimum = Math.min(...baselineScores);
  if (candidateMinimum !== baselineMinimum) {
    return candidateMinimum - baselineMinimum;
  }

  return candidateTotal - baselineTotal;
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
  for (const finding of review.findings) {
    const targets = finding.targets.map(compactFindingTarget);
    const commonTarget = getCommonFindingTarget(finding.targets);
    const affectedViewports = [...new Set(finding.affectedViewports)];
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
        finding.affectedDimensions.map((dimension) => [
          dimension,
          review.dimensions[dimension].score,
        ]),
      ),
      mustPreserve,
      affectedViewports,
      targets,
      observations,
      scope,
      repairIntent: {
        observed: finding.observed,
        expected: finding.expected,
        objective: finding.objective,
        acceptanceCriteria: finding.acceptanceCriteria,
        prohibitedTactics: finding.prohibitedTactics,
      },
    });
  }
  const reportedDimensions = new Set<string>();

  for (const [dimension, assessment] of Object.entries(review.dimensions)) {
    const blockers =
      blockersByDimension.get(
        dimension as z.infer<typeof excellenceDimensionNameSchema>,
      ) ?? [];
    if (assessment.score >= EXCELLENCE_PASS_SCORE && blockers.length === 0) {
      continue;
    }

    if (
      review.findings.some((finding) =>
        finding.affectedDimensions.includes(
          dimension as z.infer<typeof excellenceDimensionNameSchema>,
        ),
      )
    ) {
      reportedDimensions.add(dimension);
      continue;
    }

    issues.push({
      ...buildExcellenceDimensionIssue(dimension, assessment, blockers),
      scores: { [dimension]: assessment.score },
      mustPreserve,
    });
    reportedDimensions.add(dimension);
  }

  for (const [dimension, blockers] of blockersByDimension) {
    if (reportedDimensions.has(dimension)) continue;
    issues.push({
      ...buildExcellenceDimensionIssue(dimension, undefined, blockers),
      mustPreserve,
    });
  }

  if (review.verdict === "fail" && issues.length === 0) {
    issues.push({
      code: "excellence_review_failed",
      message: review.summary,
    });
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
) {
  const blockerCodes = blockers.map((blocker) => blocker.code);
  const parts: string[] = [];

  if (assessment && assessment.score < EXCELLENCE_PASS_SCORE) {
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
      assessment && assessment.score < EXCELLENCE_PASS_SCORE
        ? "excellence_dimension_failed"
        : "excellence_dimension_blocked",
    message: parts.join(" "),
    dimension,
    requiresRepair: true,
    ...(assessment ? { score: assessment.score } : {}),
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
