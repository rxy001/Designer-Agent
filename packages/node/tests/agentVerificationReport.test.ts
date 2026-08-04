import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVerificationReport,
  getCandidateRejectionError,
} from "../app/agent.ts";
import { structureVerificationIssues } from "../app/verificationIssue.ts";

test("names quality rejection separately from candidate verification failure", () => {
  assert.equal(
    getCandidateRejectionError({
      terminal: false,
      issues: [{ code: "excellence-finding-hero-hierarchy" }],
    }),
    "quality_gate_failed",
  );
  assert.equal(
    getCandidateRejectionError({
      terminal: false,
      issues: [{ code: "delivery_round_trip_mismatch" }],
    }),
    "candidate_verification_failed",
  );
  assert.equal(
    getCandidateRejectionError({
      terminal: true,
      issues: [{ code: "final_visual_budget_exhausted" }],
    }),
    "final_visual_budget_exhausted",
  );
});

test("deduplicates repairable issues from the model verification report", () => {
  const mustPreserve = {
    dimensions: { visualImpact: 6, typographyQuality: 6 },
    guardrails: ["brandContentIntegrity"],
  };
  const issues = structureVerificationIssues({
    issues: [
      {
        code: "excellence_finding_hero_hierarchy",
        findingId: "hero-hierarchy",
        category: "visual_quality",
        severity: "major",
        message: "The hero lacks a dominant heading.",
        dimensions: ["compositionHierarchy", "responsiveComposition"],
        scope: { sectionId: "hero", dimension: "compositionHierarchy" },
        affectedViewports: ["desktop", "mobile"],
        observations: [
          {
            viewport: "desktop",
            sectionId: "hero",
            toolId: "hero-carousel",
            observation: "The hero lacks a dominant heading.",
          },
          {
            viewport: "mobile",
            sectionId: "hero",
            toolId: "hero-carousel",
            observation: "The hero lacks a dominant heading.",
          },
        ],
        scores: { compositionHierarchy: 5 },
        mustPreserve,
        repairIntent: {
          objective: "Create one dominant hero message.",
          acceptanceCriteria: ["The heading leads the hero."],
          prohibitedTactics: ["Do not remove the primary CTA."],
        },
      },
      {
        code: "excellence_dimension_failed",
        category: "visual_quality",
        severity: "major",
        message: "Color imagery quality needs repair.",
        dimension: "colorImageryQuality",
        scores: { colorImageryQuality: 5 },
        mustPreserve,
      },
    ],
    history: new Map(),
    artifactDigest: "candidate-a",
  });

  const report = buildVerificationReport({
    missing: [],
    issues,
    staleChecks: [],
    staticInspectionOk: true,
    state: undefined,
    finalVisualBudget: {
      allowed: true,
      used: 1,
      remaining: 2,
      limit: 3,
    },
  });

  assert.equal("issues" in report, false);
  assert.deepEqual(report.mustPreserve, mustPreserve);
  assert.equal("finalVisualBudget" in report, false);
  assert.equal("requiredRepairStrategy" in report, false);
  const repairPlan = report.verificationRepairPlan as
    | Array<Record<string, unknown>>
    | undefined;
  assert.equal(repairPlan?.length, 2);

  const [heroRepair, dimensionRepair] = repairPlan ?? [];
  assert.equal("id" in (heroRepair ?? {}), false);
  assert.equal("findingId" in (heroRepair ?? {}), false);
  assert.equal("category" in (heroRepair ?? {}), false);
  assert.equal("severity" in (heroRepair ?? {}), false);
  assert.equal("forced" in (heroRepair ?? {}), false);
  assert.equal("scores" in (heroRepair ?? {}), false);
  assert.equal("maximumRepairStrategy" in (heroRepair ?? {}), false);
  assert.equal("mustPreserve" in (heroRepair ?? {}), false);
  assert.equal("observed" in (heroRepair ?? {}), false);
  assert.deepEqual(heroRepair?.targets, [
    { sectionId: "hero" },
    { sectionId: "hero", toolId: "hero-carousel" },
  ]);
  assert.equal("affectedViewports" in (heroRepair ?? {}), false);
  assert.deepEqual(heroRepair?.observations, [
    {
      target: 1,
      viewport: "desktop",
      observation: "The hero lacks a dominant heading.",
    },
    {
      target: 1,
      viewport: "mobile",
      observation: "The hero lacks a dominant heading.",
    },
  ]);
  assert.equal(
    dimensionRepair?.observed,
    "Color imagery quality needs repair.",
  );
  assert.equal("objective" in (dimensionRepair ?? {}), false);
  assert.deepEqual(dimensionRepair?.dimensions, ["colorImageryQuality"]);
  assert.deepEqual(dimensionRepair?.targets, [
    { scope: "document", unlocated: true },
  ]);
  assert.ok(
    (report.nextActions as string[]).some(
      (action) =>
        action.includes("self-verify every verificationRepairPlan item") &&
        action.includes("call review_candidate only after this self-check passes"),
    ),
  );
});

test("keeps a compact diagnostic for terminal issues without a repair plan", () => {
  const issues = structureVerificationIssues({
    issues: [
      {
        code: "final_visual_budget_exhausted",
        message: "No passing candidate or fallback is available.",
      },
    ],
    history: new Map(),
    artifactDigest: "candidate-a",
  });

  const report = buildVerificationReport({
    missing: [],
    issues,
    staleChecks: [],
    staticInspectionOk: true,
    state: undefined,
    finalVisualBudget: {
      allowed: false,
      used: 3,
      remaining: 0,
      limit: 3,
    },
  });

  assert.equal("verificationRepairPlan" in report, false);
  assert.deepEqual(report.issues, [
    {
      code: "final_visual_budget_exhausted",
      message: "No passing candidate or fallback is available.",
    },
  ]);
  assert.equal("finalVisualBudget" in report, false);
});
