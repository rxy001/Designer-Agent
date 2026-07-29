import assert from "node:assert/strict";
import test from "node:test";
import { zodTextFormat } from "openai/helpers/zod";

import {
  buildExcellenceReviewContext,
  buildExcellenceReviewReport,
  buildStableExcellenceFindingId,
  buildQualitySnapshot,
  compareExcellenceReviewCycle,
  compareExcellenceReviews,
  EXCELLENCE_PASS_SCORE,
  EXCELLENCE_REVIEW_INSTRUCTIONS,
  excellenceReviewSchema,
  getExcellenceReviewIssues,
  getExcellenceReviewSemanticIssues,
  normalizeExcellenceReview,
  shouldPromoteExcellenceCandidate,
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
  structurallyValidButSemanticallyInvalid.dimensions.craftQuality.score = 4;
  const format = zodTextFormat(excellenceReviewSchema, "excellence_review");

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
  assert.match(
    EXCELLENCE_REVIEW_INSTRUCTIONS,
    /accessibility-specific evidence/i,
  );
  assert.match(EXCELLENCE_REVIEW_INSTRUCTIONS, /dominant language/i);
  assert.match(
    EXCELLENCE_REVIEW_INSTRUCTIONS,
    /Every targeted observation must be covered by at least one finding target/i,
  );

  const context = buildExcellenceReviewContext({
    userRequest: "Create an independent fashion brand storefront.",
    designSystemReference: "Claude reference document.",
    source: "<Root />",
  });
  assert.match(context, /Original user request \(highest authority\)/);
  assert.match(context, /Visual pattern reference \(not the target brand\)/);
  assert.doesNotMatch(context, /Design system specification:/);
});

test("ranks the strongest reviewed artifact by score, floor, then blockers", () => {
  const baseline = createReview();
  const higherTotal = createReview();
  higherTotal.dimensions.craftQuality.score = 9;
  assert.ok(compareExcellenceReviews(higherTotal, baseline) > 0);

  const lowerTotal = createReview();
  lowerTotal.dimensions.craftQuality.score = 7;
  assert.ok(compareExcellenceReviews(lowerTotal, baseline) < 0);

  const fewerBlockers = createReview();
  baseline.blockers = [
    {
      code: "BLOCKED",
      dimension: "craftQuality",
      evidence: "A visible blocker remains.",
    },
  ];
  assert.ok(compareExcellenceReviews(fewerBlockers, baseline) > 0);

  const blockerFreeButLowerScore = createReview();
  blockerFreeButLowerScore.dimensions.craftQuality.score = 5;
  const highScoreWithBlocker = createReview();
  highScoreWithBlocker.dimensions.craftQuality.score = 10;
  highScoreWithBlocker.blockers = [
    {
      code: "visible_corruption",
      dimension: "craftQuality",
      evidence: "A visible corruption remains.",
    },
  ];
  assert.ok(
    compareExcellenceReviews(blockerFreeButLowerScore, highScoreWithBlocker) > 0,
  );
});

test("falls back to one aggregate issue per failed dimension without findings", () => {
  const review = createReview();
  review.dimensions.briefFidelity.score = 6;
  review.dimensions.brandContentIntegrity.score = 5;
  review.blockers = [
    {
      code: "MISSING_ACTION",
      dimension: "briefFidelity",
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
    ["briefFidelity", "brandContentIntegrity"],
  );
  assert.deepEqual(issues[0]?.blockerCodes, ["MISSING_ACTION"]);
  assert.equal(issues[0]?.score, 6);
  assert.equal(issues[0]?.requiresRepair, true);
  assert.match(String(issues[0]?.message), /The required action is missing/);
});

test("turns reviewer findings into targeted repair contracts", () => {
  const review = createReview();
  review.dimensions.visualHierarchy.score = 5;
  review.findings = [
    {
      code: "hero_cta_competition",
      primaryDimension: "visualHierarchy",
      affectedDimensions: ["visualHierarchy"],
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
      observed: "Two equally dominant actions split the entry path.",
      expected: "One unmistakable primary action leads the hero.",
      affectedViewports: ["desktop", "tablet"],
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
    dimension: "visualHierarchy",
  });
  assert.deepEqual(issues[0]?.dimensions, ["visualHierarchy"]);
  assert.equal(issues[0]?.requiredRepairStrategy, "section_rewrite");
  assert.deepEqual(issues[0]?.affectedViewports, ["desktop", "tablet"]);
  assert.equal(typeof issues[0]?.findingId, "string");
  assert.deepEqual(issues[0]?.scores, { visualHierarchy: 5 });
  assert.deepEqual(issues[0]?.mustPreserve, {
    dimensions: {
      briefFidelity: 8,
      designSystemFidelity: 8,
      craftQuality: 8,
      responsiveQuality: 8,
      brandContentIntegrity: 8,
      semanticAccessibility: 8,
    },
  });
  assert.equal(issues[0]?.maximumRepairStrategy, "section_rewrite");
  assert.deepEqual(issues[0]?.repairIntent, {
    observed: "Two equally dominant actions split the entry path.",
    expected: "One unmistakable primary action leads the hero.",
    objective: "Recompose the hero around one dominant conversion path.",
    acceptanceCriteria: [
      "The primary CTA is visually dominant at desktop and tablet widths.",
    ],
    prohibitedTactics: ["Do not hide required content to reduce competition."],
  });
});

test("uses stable finding identities and detects material review regressions", () => {
  const baseline = createReview();
  baseline.dimensions.craftQuality.score = 5;
  baseline.findings = [createCraftFinding()];
  const renamed = structuredClone(baseline.findings[0]!);
  renamed.code = "renamed_surface_feedback";
  renamed.observed = "The same visible surface problem with different wording.";
  assert.equal(
    buildStableExcellenceFindingId(renamed),
    buildStableExcellenceFindingId(baseline.findings[0]!),
  );

  const candidate = createReview();
  candidate.dimensions.visualHierarchy.score = 6;
  const regression = createCraftFinding();
  regression.code = "hero_hierarchy_regression";
  regression.primaryDimension = "visualHierarchy";
  regression.affectedDimensions = ["visualHierarchy"];
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

  assert.deepEqual(comparison.regressedDimensions, ["visualHierarchy"]);
  assert.equal(comparison.resolvedFindingIds.length, 1);
  assert.equal(comparison.introducedFindingIds.length, 1);
  assert.equal(comparison.materialRegression, true);
  assert.equal(
    shouldPromoteExcellenceCandidate({ baseline, candidate, comparison }),
    false,
  );
});

test("builds an auditable excellence report without repeating comparison per issue", () => {
  const review = createReview();
  review.dimensions.visualHierarchy.score = 6;
  review.dimensions.visualHierarchy.evidence = [
    "The desktop hero title crosses a high-contrast garment edge.",
    "The tablet hero title overlaps the brightest part of the photograph.",
  ];
  review.blockers = [
    {
      code: "missing_required_action",
      dimension: "briefFidelity",
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
  assert.deepEqual(report.gate.failedDimensions, ["visualHierarchy"]);
  assert.deepEqual(report.gate.blockerCodes, ["missing_required_action"]);
  assert.deepEqual(
    report.gate.failureReasons.map((reason) => reason.code),
    ["score_below_threshold", "blocker_present"],
  );
  assert.deepEqual(
    report.scoreEvidence.visualHierarchy,
    review.dimensions.visualHierarchy.evidence,
  );
  assert.equal(report.summary, review.summary);
  assert.equal(report.blockerCount, 1);
  assert.equal(report.comparisonSummary?.scoreTrend, "regressed");
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

test("includes the best reviewed baseline in comparative reviewer context", () => {
  const baseline = createReview();
  const context = buildExcellenceReviewContext({
    userRequest: "Build a storefront.",
    designSystemReference: "Reference.",
    source: "<Candidate />",
    baseline: {
      artifactDigest: "best-digest",
      source: "<Baseline />",
      review: baseline,
    },
  });

  assert.match(context, /Best reviewed baseline artifact digest/);
  assert.match(context, /best-digest/);
  assert.match(context, /Preservation contract from the baseline/);
  assert.match(context, /do not lower a previously passing dimension/i);
});

test("keeps a multi-target multi-dimension root cause as one issue", () => {
  const review = createReview();
  review.dimensions.visualHierarchy.score = 5;
  review.dimensions.responsiveQuality.score = 4;
  review.dimensions.semanticAccessibility.score = 6;
  review.findings = [
    {
      code: "mobile_header_composition_breakdown",
      primaryDimension: "responsiveQuality",
      affectedDimensions: [
        "responsiveQuality",
        "visualHierarchy",
        "semanticAccessibility",
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
      observed: "The mobile entry composition is crowded and loses its primary path.",
      expected: "The header and hero form one readable mobile entry hierarchy.",
      affectedViewports: ["mobile"],
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
    "responsiveQuality",
    "visualHierarchy",
    "semanticAccessibility",
  ]);
  assert.equal((issues[0]?.targets as unknown[]).length, 2);
  assert.equal((issues[0]?.observations as unknown[]).length, 2);
  assert.deepEqual(issues[0]?.scope, {
    viewport: "mobile",
    dimension: "responsiveQuality",
  });
});

test("rejects duplicate findings, orphan blocker links, and missing observations", () => {
  const valid = createReview();
  valid.dimensions.craftQuality.score = 5;
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

  const missingObservation = structuredClone(valid);
  missingObservation.findings[0]!.affectedViewports.push("mobile");
  assert.ok(getExcellenceReviewSemanticIssues(missingObservation).length > 0);

  const underscopedStrategy = structuredClone(valid);
  underscopedStrategy.blockers = [
    {
      code: "cross_section_breakdown",
      dimension: "craftQuality",
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
  review.dimensions.craftQuality.score = 4;
  review.blockers = [
    {
      code: "unfinished_product_section",
      dimension: "craftQuality",
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
  majorReview.dimensions.craftQuality.score = 5;
  majorReview.findings = [createCraftFinding()];

  const majorResult = normalizeExcellenceReview(majorReview);
  assert.equal(majorResult.review, majorReview);
  assert.deepEqual(majorResult.normalizations, []);

  const blockerReview = structuredClone(majorReview);
  blockerReview.blockers = [
    {
      code: "unfinished_surface",
      dimension: "craftQuality",
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
  review.dimensions.craftQuality.score = 5;
  review.findings = [createCraftFinding()];
  review.findings[0]!.observations[0]!.toolId = "product-grid";
  review.findings[0]!.observations[0]!.dataSlot = "featured-products";

  assert.equal(excellenceReviewSchema.safeParse(review).success, true);
  assert.deepEqual(getExcellenceReviewSemanticIssues(review), []);
});

test("rejects observations outside their finding target", () => {
  const review = createReview();
  review.dimensions.craftQuality.score = 5;
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
  const missingFinding = createReview();
  missingFinding.dimensions.craftQuality.score = 4;
  assert.ok(getExcellenceReviewSemanticIssues(missingFinding).length > 0);

  const localPatchBlocker = createReview();
  localPatchBlocker.dimensions.craftQuality.score = 4;
  localPatchBlocker.blockers = [
    {
      code: "unfinished_surface",
      dimension: "craftQuality",
      evidence: "The surface treatment is visibly unfinished.",
    },
  ];
  localPatchBlocker.findings = [
    {
      code: "weak_craft",
      primaryDimension: "craftQuality",
      affectedDimensions: ["craftQuality"],
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
      observed: "Borders and spacing are inconsistent.",
      expected: "The surface treatment is coherent.",
      affectedViewports: ["desktop"],
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

test("requires actionable findings for every failed excellence dimension", () => {
  const dimensions = [
    "briefFidelity",
    "designSystemFidelity",
    "visualHierarchy",
    "craftQuality",
    "responsiveQuality",
    "brandContentIntegrity",
    "semanticAccessibility",
  ] as const;

  for (const dimension of dimensions) {
    const review = createReview();
    review.dimensions[dimension].score = 4;

    const issues = getExcellenceReviewSemanticIssues(review);
    assert.ok(
      issues.some(
        (issue) =>
          issue.message ===
          `Failed dimension ${dimension} requires an actionable finding.`,
      ),
      dimension,
    );
  }
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
});

function createReview(): ExcellenceReview {
  const passingAssessment = () => ({
    score: 8,
    evidence: ["Evidence one.", "Evidence two."],
  });

  return {
    verdict: "fail",
    dimensions: {
      briefFidelity: passingAssessment(),
      designSystemFidelity: passingAssessment(),
      visualHierarchy: passingAssessment(),
      craftQuality: passingAssessment(),
      responsiveQuality: passingAssessment(),
      brandContentIntegrity: passingAssessment(),
      semanticAccessibility: passingAssessment(),
    },
    blockers: [],
    findings: [],
    summary: "Review summary.",
  };
}

function createCraftFinding(): ExcellenceReview["findings"][number] {
  return {
    code: "inconsistent_product_surfaces",
    primaryDimension: "craftQuality",
    affectedDimensions: ["craftQuality"],
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
    observed: "Product surfaces do not follow one coherent treatment.",
    expected: "Product surfaces use consistent border and spacing roles.",
    affectedViewports: ["desktop"],
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
