import assert from "node:assert/strict";
import test from "node:test";
import { zodTextFormat } from "openai/helpers/zod";

import {
  buildExcellenceReviewReport,
  buildStableExcellenceFindingId,
  buildQualitySnapshot,
  calculateExcellenceWeightedScore,
  compareExcellenceReviewCycle,
  compareExcellenceReviews,
  EXCELLENCE_VISUAL_WEIGHTS,
  EXCELLENCE_PASS_SCORE,
  EXCELLENCE_REVIEW_INSTRUCTIONS,
  excellenceReviewSchema,
  excellenceReviewerOutputSchema,
  getExcellenceReviewIssues,
  getExcellenceFindingAffectedViewports,
  getExcellenceReviewSemanticIssues,
  normalizeExcellenceReview,
  shouldPromoteExcellenceCandidate,
  shouldRollbackExcellenceCandidate,
  type ExcellenceReview,
} from "../app/productQuality.ts";

test("builds a canonical quality snapshot", () => {
  const snapshot = buildQualitySnapshot(
    '<Section><Text content="Visible copy" /></Section>',
  );
  assert.equal(snapshot.sectionCount, 1);
  assert.ok(snapshot.sizeBytes > 0);
});

test("keeps the model-facing schema and response parser contract identical", () => {
  const structurallyValidButSemanticallyInvalid = createReview();
  structurallyValidButSemanticallyInvalid.verdict = "pass";
  structurallyValidButSemanticallyInvalid.dimensions.spatialCraft.score = 4;
  const format = zodTextFormat(
    excellenceReviewerOutputSchema,
    "excellence_review",
  );

  assert.deepEqual(
    format.$parseRaw(JSON.stringify(structurallyValidButSemanticallyInvalid)),
    structurallyValidButSemanticallyInvalid,
  );
  assert.ok(
    getExcellenceReviewSemanticIssues(
      structurallyValidButSemanticallyInvalid,
    ).length > 0,
  );

  const summarySchema = (
    format.schema as {
      properties: { summary: { pattern?: string } };
    }
  ).properties.summary;
  assert.equal(summarySchema.pattern, "\\S");
  assert.throws(() =>
    format.$parseRaw(
      JSON.stringify({
        ...structurallyValidButSemanticallyInvalid,
        summary: " ",
      }),
    ),
  );
});

test("reserves review infrastructure failures for the orchestration layer", () => {
  const review = createReview();
  review.verdict = "fail";
  review.blockers = [
    {
      code: "weighted_visual_score_below_pass",
      dimension: "reviewInfrastructure",
      evidence: "The weighted visual score is below 7.5.",
    },
  ];

  assert.equal(excellenceReviewSchema.safeParse(review).success, true);
  assert.equal(excellenceReviewerOutputSchema.safeParse(review).success, false);
});

test("scopes excellence review to visual patterns rather than reference branding", () => {
  assert.match(
    EXCELLENCE_REVIEW_INSTRUCTIONS,
    /visual-pattern reference, not the target brand/i,
  );
  assert.match(
    EXCELLENCE_REVIEW_INSTRUCTIONS,
    /Never lower a score because reference-brand identifiers/i,
  );
  assert.match(
    EXCELLENCE_REVIEW_INSTRUCTIONS,
    /Importing the reference brand.*is brand contamination/i,
  );
  assert.match(EXCELLENCE_REVIEW_INSTRUCTIONS, /one finding per visible root cause/i);
  assert.match(EXCELLENCE_REVIEW_INSTRUCTIONS, /binary and visibly verifiable/i);
  assert.match(
    EXCELLENCE_REVIEW_INSTRUCTIONS,
    /one shared composition root cause requires coordinated changes across sections/i,
  );
  assert.match(EXCELLENCE_REVIEW_INSTRUCTIONS, /dominant language/i);
  assert.match(EXCELLENCE_REVIEW_INSTRUCTIONS, /visualImpact 15%/i);
  assert.match(EXCELLENCE_REVIEW_INSTRUCTIONS, /compositionHierarchy 20%/i);
  assert.match(EXCELLENCE_REVIEW_INSTRUCTIONS, /weighted visual score must be at least 7\.5/i);
  assert.match(EXCELLENCE_REVIEW_INSTRUCTIONS, /two non-tradeable guardrails/i);
  assert.match(
    EXCELLENCE_REVIEW_INSTRUCTIONS,
    /Every targeted observation must be covered by at least one finding target/i,
  );

});

test("ranks the strongest reviewed artifact by score, floor, then blockers", () => {
  const baseline = createReview();
  const higherTotal = createReview();
  higherTotal.dimensions.spatialCraft.score = 9;
  assert.ok(compareExcellenceReviews(higherTotal, baseline) > 0);

  const lowerTotal = createReview();
  lowerTotal.dimensions.spatialCraft.score = 7;
  assert.ok(compareExcellenceReviews(lowerTotal, baseline) < 0);

  const fewerBlockers = createReview();
  baseline.blockers = [
    {
      code: "BLOCKED",
      dimension: "spatialCraft",
      evidence: "A visible blocker remains.",
    },
  ];
  assert.ok(compareExcellenceReviews(fewerBlockers, baseline) > 0);

  const blockerFreeButLowerScore = createReview();
  blockerFreeButLowerScore.dimensions.spatialCraft.score = 5;
  const highScoreWithBlocker = createReview();
  highScoreWithBlocker.dimensions.spatialCraft.score = 10;
  highScoreWithBlocker.blockers = [
    {
      code: "visible_corruption",
      dimension: "spatialCraft",
      evidence: "A visible corruption remains.",
    },
  ];
  assert.ok(
    compareExcellenceReviews(blockerFreeButLowerScore, highScoreWithBlocker) > 0,
  );
});

test("uses weighted visual quality while keeping guardrails non-tradeable", () => {
  assert.equal(
    Object.values(EXCELLENCE_VISUAL_WEIGHTS).reduce(
      (total, weight) => total + weight,
      0,
    ),
    1,
  );
  const balancedPass = createReview();
  balancedPass.verdict = "pass";
  balancedPass.dimensions.spatialCraft.score = 6;
  assert.equal(calculateExcellenceWeightedScore(balancedPass), 7.7);
  assert.deepEqual(getExcellenceReviewSemanticIssues(balancedPass), []);

  const criticalFailure = structuredClone(balancedPass);
  criticalFailure.dimensions.compositionHierarchy.score = 6;
  assert.ok(getExcellenceReviewSemanticIssues(criticalFailure).length > 0);

  const weightedFailure = createReview();
  weightedFailure.verdict = "pass";
  for (const assessment of Object.values(weightedFailure.dimensions)) {
    assessment.score = 7;
  }
  assert.equal(calculateExcellenceWeightedScore(weightedFailure), 7);
  assert.ok(getExcellenceReviewSemanticIssues(weightedFailure).length > 0);

  const guardrailFailure = createReview();
  guardrailFailure.verdict = "pass";
  guardrailFailure.guardrails.briefIntegrity.status = "fail";
  assert.ok(getExcellenceReviewSemanticIssues(guardrailFailure).length > 0);
});

test("falls back to aggregate issues for failed visual and guardrail areas", () => {
  const review = createReview();
  review.dimensions.visualImpact.score = 5;
  review.guardrails.brandContentIntegrity.status = "fail";
  review.blockers = [
    {
      code: "MISSING_ACTION",
      dimension: "visualImpact",
      evidence: "The required action is missing.",
    },
    {
      code: "WRONG_TONE",
      dimension: "brandContentIntegrity",
      evidence: "The imagery uses the wrong tone.",
    },
  ];

  const issues = getExcellenceReviewIssues(review);

  assert.equal(issues.length, 2);
  assert.deepEqual(
    issues.map((issue) => issue.dimension),
    ["visualImpact", "brandContentIntegrity"],
  );
  assert.deepEqual(issues[0]?.blockerCodes, ["MISSING_ACTION"]);
  assert.equal(issues[0]?.score, 5);
  assert.equal(issues[0]?.requiresRepair, true);
  assert.match(String(issues[0]?.message), /The required action is missing/);
});

test("turns reviewer findings into targeted repair contracts", () => {
  const review = createReview();
  review.dimensions.compositionHierarchy.score = 5;
  review.findings = [
    {
      code: "hero_cta_competition",
      primaryDimension: "compositionHierarchy",
      affectedDimensions: ["compositionHierarchy"],
      category: "visual_quality",
      severity: "major",
      blockerCodes: [],
      observations: [
        {
          viewport: "desktop",
          sectionId: "hero",
          toolId: null,
          dataSlot: null,
          observation: "The hero CTA and promotion card compete at the same weight.",
        },
        {
          viewport: "tablet",
          sectionId: "hero",
          toolId: null,
          dataSlot: null,
          observation: "The two actions retain equal visual weight after reflow.",
        },
      ],
      targets: [
        {
          sectionId: "hero",
          toolId: null,
          dataSlot: null,
          rationale: "The competition is created by the hero composition.",
        },
      ],
      repairStrategy: "section_rewrite",
      objective: "Recompose the hero around one dominant conversion path.",
      acceptanceCriteria: [
        "The primary CTA is visually dominant at desktop and tablet widths.",
      ],
      prohibitedTactics: ["Do not hide required content to reduce competition."],
    },
  ];

  const issues = getExcellenceReviewIssues(review);

  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.code, "excellence_finding_hero_cta_competition");
  assert.deepEqual(issues[0]?.scope, {
    sectionId: "hero",
    dimension: "compositionHierarchy",
  });
  assert.deepEqual(issues[0]?.dimensions, ["compositionHierarchy"]);
  assert.equal(issues[0]?.requiredRepairStrategy, "section_rewrite");
  assert.deepEqual(issues[0]?.affectedViewports, ["desktop", "tablet"]);
  assert.equal(typeof issues[0]?.findingId, "string");
  assert.deepEqual(issues[0]?.scores, { compositionHierarchy: 5 });
  assert.deepEqual(issues[0]?.mustPreserve, {
    dimensions: {
      visualImpact: 6,
      typographyQuality: 6,
      colorImageryQuality: 6,
      spatialCraft: 6,
      designSystemApplication: 6,
      responsiveComposition: 7,
    },
    guardrails: [
      "briefIntegrity",
      "brandContentIntegrity",
    ],
  });
  assert.equal(issues[0]?.maximumRepairStrategy, "section_rewrite");
  assert.deepEqual(issues[0]?.repairIntent, {
    objective: "Recompose the hero around one dominant conversion path.",
    acceptanceCriteria: [
      "The primary CTA is visually dominant at desktop and tablet widths.",
    ],
    prohibitedTactics: ["Do not hide required content to reduce competition."],
  });
});

test("derives a canonical affected viewport set from finding observations", () => {
  const finding = createCraftFinding();
  finding.observations = [
    {
      ...finding.observations[0]!,
      viewport: "mobile",
    },
    {
      ...finding.observations[0]!,
      viewport: "desktop",
    },
    {
      ...finding.observations[0]!,
      viewport: "mobile",
    },
  ];

  assert.deepEqual(getExcellenceFindingAffectedViewports(finding), [
    "desktop",
    "mobile",
  ]);
});

test("rejects the removed affectedViewports reviewer field", () => {
  const review = createReview();
  review.dimensions.spatialCraft.score = 5;
  review.findings = [
    {
      ...createCraftFinding(),
      affectedViewports: ["desktop"],
    } as ExcellenceReview["findings"][number],
  ];

  assert.equal(excellenceReviewSchema.safeParse(review).success, false);
});

test("rejects redundant legacy finding narrative fields", () => {
  const review = createReview();
  review.dimensions.spatialCraft.score = 5;
  review.findings = [
    {
      ...createCraftFinding(),
      observed: "A redundant summary of observations.",
      expected: "A redundant copy of the objective.",
    } as ExcellenceReview["findings"][number],
  ];

  assert.equal(excellenceReviewSchema.safeParse(review).success, false);
});

test("uses stable finding identities and detects material review regressions", () => {
  const baseline = createReview();
  baseline.dimensions.spatialCraft.score = 5;
  baseline.findings = [createCraftFinding()];
  const renamed = structuredClone(baseline.findings[0]!);
  renamed.code = "renamed_surface_feedback";
  renamed.objective = "Resolve the same visible problem with different wording.";
  assert.equal(
    buildStableExcellenceFindingId(renamed),
    buildStableExcellenceFindingId(baseline.findings[0]!),
  );

  const candidate = createReview();
  candidate.dimensions.compositionHierarchy.score = 6;
  const regression = createCraftFinding();
  regression.code = "hero_hierarchy_regression";
  regression.primaryDimension = "compositionHierarchy";
  regression.affectedDimensions = ["compositionHierarchy"];
  regression.targets = [{
    sectionId: "hero",
    toolId: null,
    dataSlot: null,
    rationale: "The regression is visible in the hero.",
  }];
  regression.observations = [{
    viewport: "desktop",
    sectionId: "hero",
    toolId: null,
    dataSlot: null,
    observation: "The hero lost its primary visual path.",
  }];
  candidate.findings = [regression];
  const comparison = compareExcellenceReviewCycle({
    baselineArtifactDigest: "baseline",
    baseline,
    candidateArtifactDigest: "candidate",
    candidate,
  });

  assert.deepEqual(comparison.regressedDimensions, ["compositionHierarchy"]);
  assert.equal(comparison.resolvedFindingIds.length, 1);
  assert.equal(comparison.introducedFindingIds.length, 1);
  assert.equal(comparison.materialRegression, true);
  assert.equal(
    shouldPromoteExcellenceCandidate({ baseline, candidate, comparison }),
    false,
  );
});

test("does not promote a passing candidate that regresses a baseline score", () => {
  const baseline = createReview();
  baseline.verdict = "pass";
  const candidate = createReview();
  candidate.verdict = "pass";
  candidate.dimensions.spatialCraft.score = 7;

  const comparison = compareExcellenceReviewCycle({
    baselineArtifactDigest: "baseline",
    baseline,
    candidateArtifactDigest: "candidate",
    candidate,
  });

  assert.equal(comparison.pairwisePreference, "baseline");
  assert.equal(
    shouldPromoteExcellenceCandidate({ baseline, candidate, comparison }),
    false,
  );
  assert.equal(
    shouldRollbackExcellenceCandidate({ baseline, candidate, comparison }),
    true,
  );
});

test("allows a one-point visual tradeoff when weighted quality improves materially", () => {
  const baseline = createReview();
  baseline.verdict = "pass";
  const candidate = createReview();
  candidate.verdict = "pass";
  candidate.dimensions.compositionHierarchy.score = 10;
  candidate.dimensions.colorImageryQuality.score = 7;

  const comparison = compareExcellenceReviewCycle({
    baselineArtifactDigest: "baseline",
    baseline,
    candidateArtifactDigest: "candidate",
    candidate,
  });

  assert.equal(comparison.scoreDelta.colorImageryQuality, -1);
  assert.equal(comparison.weightedScoreDelta, 0.3);
  assert.equal(comparison.materialRegression, false);
  assert.equal(
    shouldPromoteExcellenceCandidate({ baseline, candidate, comparison }),
    true,
  );
});

test("builds an auditable excellence report without repeating comparison per issue", () => {
  const review = createReview();
  review.dimensions.compositionHierarchy.score = 6;
  review.dimensions.compositionHierarchy.evidence = [
    "The desktop hero title crosses a high-contrast garment edge.",
    "The tablet hero title overlaps the brightest part of the photograph.",
  ];
  review.blockers = [
    {
      code: "missing_required_action",
      dimension: "briefIntegrity",
      evidence: "The requested checkout action is absent.",
    },
  ];
  const comparison = compareExcellenceReviewCycle({
    baselineArtifactDigest: "baseline",
    baseline: createReview(),
    candidateArtifactDigest: "candidate",
    candidate: review,
  });
  const report = buildExcellenceReviewReport({
    review,
    comparison,
    rollbackToBaseline: false,
    issues: [
      {
        code: "hero_hierarchy",
        comparison,
        message: "The hero title competes with the photograph.",
      },
    ],
  });

  assert.equal(report.gate.minimumPassingScore, EXCELLENCE_PASS_SCORE);
  assert.equal(report.gate.minimumWeightedScore, EXCELLENCE_PASS_SCORE);
  assert.equal(report.gate.weightedScore, 7.6);
  assert.deepEqual(report.gate.failedDimensions, ["compositionHierarchy"]);
  assert.deepEqual(report.gate.failedGuardrails, []);
  assert.deepEqual(report.gate.blockerCodes, ["missing_required_action"]);
  assert.deepEqual(
    report.gate.failureReasons.map((reason) => reason.code),
    ["score_below_threshold", "blocker_present"],
  );
  assert.deepEqual(
    report.scoreEvidence.compositionHierarchy,
    review.dimensions.compositionHierarchy.evidence,
  );
  assert.equal(report.summary, review.summary);
  assert.equal(report.blockerCount, 1);
  assert.equal(report.comparisonSummary?.scoreTrend, "regressed");
  assert.equal(report.comparisonSummary?.pairwisePreference, "baseline");
  assert.equal(report.comparisonSummary?.materialRegression, true);
  assert.equal(
    "comparison" in (report.issues[0] as Record<string, unknown>),
    false,
  );
  assert.equal(
    (report.issues[0] as Record<string, unknown>).message,
    "The hero title competes with the photograph.",
  );
});

test("keeps a multi-target multi-dimension root cause as one issue", () => {
  const review = createReview();
  review.dimensions.compositionHierarchy.score = 5;
  review.dimensions.responsiveComposition.score = 4;
  review.findings = [
    {
      code: "mobile_header_composition_breakdown",
      primaryDimension: "responsiveComposition",
      affectedDimensions: [
        "responsiveComposition",
        "compositionHierarchy",
      ],
      category: "responsive",
      severity: "major",
      blockerCodes: [],
      observations: [
        {
          viewport: "mobile",
          sectionId: "site-header",
          toolId: "site-navbar",
          dataSlot: null,
          observation: "Navigation labels and shopping actions compete in one compressed row.",
        },
        {
          viewport: "mobile",
          sectionId: "hero",
          toolId: "hero-carousel",
          dataSlot: null,
          observation: "The compressed header visually dominates the hero entry point.",
        },
      ],
      targets: [
        {
          sectionId: "site-header",
          toolId: "site-navbar",
          dataSlot: null,
          rationale: "The navigation is the source of the crowding.",
        },
        {
          sectionId: "hero",
          toolId: "hero-carousel",
          dataSlot: null,
          rationale: "The hero is the displaced primary content.",
        },
      ],
      repairStrategy: "page_relayout",
      objective: "Restore a readable mobile entry hierarchy.",
      acceptanceCriteria: [
        "The mobile screenshot shows distinct navigation, search, and cart actions without overlap, while the hero remains the largest first-screen region.",
      ],
      prohibitedTactics: ["Do not hide required shopping actions."],
    },
  ];

  assert.equal(excellenceReviewSchema.safeParse(review).success, true);
  assert.deepEqual(getExcellenceReviewSemanticIssues(review), []);
  const issues = getExcellenceReviewIssues(review);
  assert.equal(issues.length, 1);
  assert.deepEqual(issues[0]?.dimensions, [
    "responsiveComposition",
    "compositionHierarchy",
  ]);
  assert.equal((issues[0]?.targets as unknown[]).length, 2);
  assert.equal((issues[0]?.observations as unknown[]).length, 2);
  assert.deepEqual(issues[0]?.scope, {
    viewport: "mobile",
    dimension: "responsiveComposition",
  });
});

test("rejects duplicate findings and orphan blocker links", () => {
  const valid = createReview();
  valid.dimensions.spatialCraft.score = 5;
  valid.findings = [createCraftFinding()];
  assert.equal(excellenceReviewSchema.safeParse(valid).success, true);
  assert.deepEqual(getExcellenceReviewSemanticIssues(valid), []);

  const duplicate = structuredClone(valid);
  duplicate.findings.push(structuredClone(duplicate.findings[0]!));
  assert.ok(getExcellenceReviewSemanticIssues(duplicate).length > 0);

  const orphan = structuredClone(valid);
  orphan.findings[0]!.severity = "blocker";
  orphan.findings[0]!.blockerCodes = ["missing_blocker"];
  assert.ok(getExcellenceReviewSemanticIssues(orphan).length > 0);

  const underscopedStrategy = structuredClone(valid);
  underscopedStrategy.blockers = [
    {
      code: "cross_section_breakdown",
      dimension: "spatialCraft",
      evidence: "The visible defect spans products and footer.",
    },
  ];
  underscopedStrategy.findings[0]!.severity = "blocker";
  underscopedStrategy.findings[0]!.blockerCodes = ["cross_section_breakdown"];
  underscopedStrategy.findings[0]!.targets.push({
    sectionId: "site-footer",
    toolId: null,
    dataSlot: null,
    rationale: "The same defect is visible in the footer.",
  });
  underscopedStrategy.findings[0]!.repairStrategy = "component_rewrite";
  assert.ok(getExcellenceReviewSemanticIssues(underscopedStrategy).length > 0);
});

test("normalizes an underscoped section blocker before semantic validation", () => {
  const review = createReview();
  review.dimensions.spatialCraft.score = 4;
  review.blockers = [
    {
      code: "unfinished_product_section",
      dimension: "spatialCraft",
      evidence: "The visible defect affects the full products section.",
    },
  ];
  review.findings = [createCraftFinding()];
  review.findings[0]!.severity = "blocker";
  review.findings[0]!.blockerCodes = ["unfinished_product_section"];
  review.findings[0]!.repairStrategy = "component_rewrite";

  const result = normalizeExcellenceReview(review);

  assert.equal(result.review.findings[0]!.repairStrategy, "section_rewrite");
  assert.deepEqual(result.normalizations, [
    {
      findingIndex: 0,
      findingCode: "inconsistent_product_surfaces",
      from: "component_rewrite",
      to: "section_rewrite",
      reason: "blocker_target_scope",
    },
  ]);
  assert.deepEqual(getExcellenceReviewSemanticIssues(result.review), []);
  assert.equal(review.findings[0]!.repairStrategy, "component_rewrite");
});

test("does not alter valid or non-blocker repair strategies", () => {
  const majorReview = createReview();
  majorReview.dimensions.spatialCraft.score = 5;
  majorReview.findings = [createCraftFinding()];

  const majorResult = normalizeExcellenceReview(majorReview);
  assert.equal(majorResult.review, majorReview);
  assert.deepEqual(majorResult.normalizations, []);

  const blockerReview = structuredClone(majorReview);
  blockerReview.blockers = [
    {
      code: "unfinished_surface",
      dimension: "spatialCraft",
      evidence: "The products section is visibly unfinished.",
    },
  ];
  blockerReview.findings[0]!.severity = "blocker";
  blockerReview.findings[0]!.blockerCodes = ["unfinished_surface"];

  const blockerResult = normalizeExcellenceReview(blockerReview);
  assert.equal(blockerResult.review, blockerReview);
  assert.deepEqual(blockerResult.normalizations, []);
});

test("allows observations to be more specific than their finding target", () => {
  const review = createReview();
  review.dimensions.spatialCraft.score = 5;
  review.findings = [createCraftFinding()];
  review.findings[0]!.observations[0]!.toolId = "product-grid";
  review.findings[0]!.observations[0]!.dataSlot = "featured-products";

  assert.equal(excellenceReviewSchema.safeParse(review).success, true);
  assert.deepEqual(getExcellenceReviewSemanticIssues(review), []);
});

test("rejects observations outside their finding target", () => {
  const review = createReview();
  review.dimensions.spatialCraft.score = 5;
  review.findings = [createCraftFinding()];
  review.findings[0]!.observations[0]!.sectionId = "site-footer";

  assert.equal(excellenceReviewSchema.safeParse(review).success, true);
  assert.ok(
    getExcellenceReviewSemanticIssues(review).some(
      (issue) =>
        issue.message ===
        "Observation target must be covered by one of the finding targets.",
    ),
  );
});

test("rejects impossible excellence review states", () => {
  const unexplainedFailure = createReview();
  assert.ok(getExcellenceReviewSemanticIssues(unexplainedFailure).length > 0);

  const localPatchBlocker = createReview();
  localPatchBlocker.dimensions.spatialCraft.score = 4;
  localPatchBlocker.blockers = [
    {
      code: "unfinished_surface",
      dimension: "spatialCraft",
      evidence: "The surface treatment is visibly unfinished.",
    },
  ];
  localPatchBlocker.findings = [
    {
      code: "weak_craft",
      primaryDimension: "spatialCraft",
      affectedDimensions: ["spatialCraft"],
      category: "visual_quality",
      severity: "blocker",
      blockerCodes: ["unfinished_surface"],
      observations: [
        {
          viewport: "desktop",
          sectionId: "products",
          toolId: null,
          dataSlot: null,
          observation: "Borders and spacing are visibly inconsistent.",
        },
      ],
      targets: [
        {
          sectionId: "products",
          toolId: null,
          dataSlot: null,
          rationale: "The defect is concentrated in the products section.",
        },
      ],
      repairStrategy: "local_patch",
      objective: "Make the product surfaces coherent.",
      acceptanceCriteria: ["Borders and spacing follow one visual rhythm."],
      prohibitedTactics: [],
    },
  ];
  assert.ok(getExcellenceReviewSemanticIssues(localPatchBlocker).length > 0);
});

test("falls back to aggregate repair issues for failed dimensions without findings", () => {
  const dimensions = [
    "visualImpact",
    "compositionHierarchy",
    "typographyQuality",
    "colorImageryQuality",
    "spatialCraft",
    "designSystemApplication",
    "responsiveComposition",
  ] as const;

  for (const dimension of dimensions) {
    const review = createReview();
    review.dimensions[dimension].score = 4;

    assert.deepEqual(getExcellenceReviewSemanticIssues(review), [], dimension);
    const issues = getExcellenceReviewIssues(review);
    assert.equal(issues.length, 1, dimension);
    assert.equal(issues[0]?.code, "excellence_dimension_failed", dimension);
    assert.equal(issues[0]?.dimension, dimension, dimension);
    assert.equal(issues[0]?.requiresRepair, true, dimension);
  }
});

test("does not turn every acceptable dimension into a failure when only the weighted score fails", () => {
  const review = createReview();
  for (const assessment of Object.values(review.dimensions)) {
    assessment.score = 7;
  }
  review.findings = [
    {
      ...createCraftFinding(),
      primaryDimension: "spatialCraft",
      affectedDimensions: ["spatialCraft"],
    },
  ];

  const issues = getExcellenceReviewIssues(review);
  const report = buildExcellenceReviewReport({
    review,
    rollbackToBaseline: false,
    issues,
  });

  assert.equal(calculateExcellenceWeightedScore(review), 7);
  assert.deepEqual(report.gate.failedDimensions, []);
  assert.deepEqual(
    report.gate.failureReasons.map((reason) => reason.code),
    ["weighted_score_below_threshold"],
  );
  assert.equal(issues.length, 1);
  assert.match(String(issues[0]?.code), /^excellence_finding_/);
});

test("uses one weighted-score fallback instead of seven dimension failures", () => {
  const review = createReview();
  for (const assessment of Object.values(review.dimensions)) {
    assessment.score = 7;
  }

  const issues = getExcellenceReviewIssues(review);

  assert.deepEqual(issues, [
    {
      code: "excellence_weighted_score_failed",
      message: "Review summary.",
      weightedScore: 7,
      minimumWeightedScore: EXCELLENCE_PASS_SCORE,
      requiresRepair: true,
    },
  ]);
});

test("falls back to an aggregate repair issue for an unlinked blocker", () => {
  const review = createReview();
  review.blockers = [
    {
      code: "missing_required_action",
      dimension: "briefIntegrity",
      evidence: "The requested checkout action is absent.",
    },
  ];

  assert.deepEqual(getExcellenceReviewSemanticIssues(review), []);
  const issues = getExcellenceReviewIssues(review);
  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.code, "excellence_dimension_blocked");
  assert.equal(issues[0]?.dimension, "briefIntegrity");
  assert.deepEqual(issues[0]?.blockerCodes, ["missing_required_action"]);
});

test("falls back to an aggregate repair issue for a failed guardrail", () => {
  const review = createReview();
  review.guardrails.briefIntegrity.status = "fail";
  review.guardrails.briefIntegrity.evidence = [
    "The requested checkout action is absent.",
    "The purchase path cannot be completed from the page.",
  ];

  assert.deepEqual(getExcellenceReviewSemanticIssues(review), []);
  const issues = getExcellenceReviewIssues(review);
  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.code, "excellence_guardrail_failed");
  assert.equal(issues[0]?.dimension, "briefIntegrity");
  assert.equal(issues[0]?.guardrailStatus, "fail");
});

test("reports a blocker even when its dimension score passes", () => {
  const review = createReview();
  review.blockers = [
    {
      code: "CONTENT_CORRUPTION",
      dimension: "brandContentIntegrity",
      evidence: "The product name is corrupted.",
    },
  ];

  const issues = getExcellenceReviewIssues(review);

  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.code, "excellence_dimension_blocked");
  assert.equal(issues[0]?.dimension, "brandContentIntegrity");
  assert.deepEqual(issues[0]?.blockerCodes, ["CONTENT_CORRUPTION"]);
});

test("does not mislabel an allowed visual score as a score failure", () => {
  const review = createReview();
  review.dimensions.colorImageryQuality.score = 6;
  review.blockers = [
    {
      code: "image_rights_blocker",
      dimension: "colorImageryQuality",
      evidence: "The required campaign image cannot be used.",
    },
  ];

  const issues = getExcellenceReviewIssues(review);
  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.code, "excellence_dimension_blocked");
  assert.equal(issues[0]?.dimension, "colorImageryQuality");
});

test("does not expand an infrastructure failure into quality dimensions", () => {
  const review = createReview();
  review.verdict = "fail";
  for (const assessment of Object.values(review.dimensions)) {
    assessment.score = 1;
  }
  review.blockers = [
    {
      code: "excellence_review_unavailable",
      dimension: "reviewInfrastructure",
      evidence: "The reviewer is unavailable.",
    },
  ];

  const issues = getExcellenceReviewIssues(review);

  assert.equal(issues.length, 1);
  assert.equal(
    issues[0]?.code,
    "excellence_review_unavailable",
  );
  assert.equal(issues[0]?.dimension, "reviewInfrastructure");
  assert.deepEqual(issues[0]?.blockerCodes, ["excellence_review_unavailable"]);

  const report = buildExcellenceReviewReport({
    review,
    rollbackToBaseline: false,
    issues,
  });
  assert.equal(report.gate.weightedScore, null);
  assert.deepEqual(report.gate.failedDimensions, []);
  assert.deepEqual(report.gate.failedGuardrails, []);
});

function createReview(): ExcellenceReview {
  const passingAssessment = () => ({
    score: 8,
    evidence: ["Evidence one.", "Evidence two."],
  });

  return {
    verdict: "fail",
    guardrails: {
      briefIntegrity: {
        status: "pass",
        evidence: ["Required content is present.", "Required actions are present."],
      },
      brandContentIntegrity: {
        status: "pass",
        evidence: ["The target brand is consistent.", "No reference brand leaked."],
      },
    },
    dimensions: {
      visualImpact: passingAssessment(),
      compositionHierarchy: passingAssessment(),
      typographyQuality: passingAssessment(),
      colorImageryQuality: passingAssessment(),
      spatialCraft: passingAssessment(),
      designSystemApplication: passingAssessment(),
      responsiveComposition: passingAssessment(),
    },
    blockers: [],
    findings: [],
    summary: "Review summary.",
  };
}

function createCraftFinding(): ExcellenceReview["findings"][number] {
  return {
    code: "inconsistent_product_surfaces",
    primaryDimension: "spatialCraft",
    affectedDimensions: ["spatialCraft"],
    category: "visual_quality",
    severity: "major",
    blockerCodes: [],
    observations: [
      {
        viewport: "desktop",
        sectionId: "products",
        toolId: null,
        dataSlot: null,
        observation: "Card borders and internal spacing use visibly inconsistent treatments.",
      },
    ],
    targets: [
      {
        sectionId: "products",
        toolId: null,
        dataSlot: null,
        rationale: "The inconsistency is contained within the products section.",
      },
    ],
    repairStrategy: "section_rewrite",
    objective: "Unify the visible product surface treatment.",
    acceptanceCriteria: [
      "Every product card in the desktop screenshot uses the same border role and internal spacing hierarchy.",
    ],
    prohibitedTactics: ["Do not hide inconsistent cards."],
  };
}
