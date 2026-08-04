import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVerificationRepairPlan,
  buildVerificationIssueFingerprint,
  getRequiredVerificationRepairStrategy,
  structureVerificationIssues,
  type VerificationIssueHistoryEntry,
} from "../app/verificationIssue.ts";

test("creates stable fingerprints without volatile messages or measurements", () => {
  const first = buildVerificationIssueFingerprint({
    code: "layout_element_issue",
    category: "layout",
    scope: { viewport: "mobile", sectionId: "products", toolId: "card-1" },
  });
  const second = buildVerificationIssueFingerprint({
    code: "layout_element_issue",
    category: "layout",
    scope: { viewport: "mobile", sectionId: "products", toolId: "card-1" },
  });
  assert.equal(first, second);
});

test("structures issues and forces repair escalation across changed artifacts", () => {
  const history = new Map<string, VerificationIssueHistoryEntry>();
  const raw = {
    code: "layout_element_issue",
    viewport: "mobile",
    element: {
      sectionId: "products",
      toolId: "card-1",
      dataSlot: "card",
    },
    message: "Card is clipped.",
  };

  const [first] = structureVerificationIssues({
    issues: [raw],
    history,
    artifactDigest: "artifact-a",
  });
  assert.equal(first?.category, "layout");
  assert.equal(first?.viewport, undefined);
  assert.equal(first?.sectionId, undefined);
  assert.equal(first?.toolId, undefined);
  assert.equal(first?.element, undefined);
  assert.deepEqual(first?.scope, {
    viewport: "mobile",
    sectionId: "products",
    toolId: "card-1",
    dataSlot: "card",
  });
  assert.equal(first?.repair.strategy, "local_patch");
  assert.equal(first?.repair.forced, false);

  const [sameArtifact] = structureVerificationIssues({
    issues: [{ ...raw, message: "Different wording." }],
    history,
    artifactDigest: "artifact-a",
  });
  assert.equal(sameArtifact?.repair.consecutiveFailures, 1);

  const [second] = structureVerificationIssues({
    issues: [raw],
    history,
    artifactDigest: "artifact-b",
  });
  assert.equal(second?.repair.consecutiveFailures, 2);
  assert.equal(second?.repair.strategy, "component_rewrite");
  assert.equal(second?.repair.forced, true);

  const [third] = structureVerificationIssues({
    issues: [raw],
    history,
    artifactDigest: "artifact-c",
  });
  assert.equal(third?.repair.strategy, "section_rewrite");

  const [fourth] = structureVerificationIssues({
    issues: [raw],
    history,
    artifactDigest: "artifact-d",
  });
  assert.equal(fourth?.repair.strategy, "section_rewrite");
  assert.equal(getRequiredVerificationRepairStrategy([first!, fourth!]), "section_rewrite");
});

test("classifies infrastructure and exhausted budgets as non-edit strategies", () => {
  const history = new Map<string, VerificationIssueHistoryEntry>();
  const issues = structureVerificationIssues({
    issues: [
      { code: "verification_infrastructure_unavailable" },
      { code: "final_visual_budget_exhausted" },
    ],
    history,
    artifactDigest: "artifact-a",
  });
  assert.equal(issues[0]?.repair.strategy, "retry_infrastructure");
  assert.equal(issues[1]?.repair.strategy, "stop");
  assert.equal(issues[1]?.repair.repairable, false);
});

test("preserves a mandated repair escalation until it is satisfied", () => {
  const [issue] = structureVerificationIssues({
    issues: [
      {
        code: "required_repair_strategy_not_satisfied",
        requiredRepairStrategy: "section_rewrite",
      },
    ],
    history: new Map(),
    artifactDigest: "artifact-a",
  });
  assert.equal(issue?.repair.strategy, "section_rewrite");
  assert.equal(issue?.repair.forced, true);
});

test("a blocker cannot be downgraded to a local patch", () => {
  const [issue] = structureVerificationIssues({
    issues: [
      {
        code: "excellence_finding_hero_hierarchy",
        category: "visual_quality",
        severity: "blocker",
        sectionId: "hero",
        requiredRepairStrategy: "local_patch",
      },
    ],
    history: new Map(),
    artifactDigest: "artifact-a",
  });

  assert.equal(issue?.repair.strategy, "section_rewrite");
  assert.equal(issue?.repair.forced, true);
});

test("inherits repeated browser failures for the same visual target", () => {
  const [issue] = structureVerificationIssues({
    issues: [
      {
        code: "excellence_finding_mobile_card_density",
        category: "responsive",
        severity: "major",
        viewport: "mobile",
        sectionId: "products",
        toolId: "card-1",
      },
    ],
    history: new Map(),
    relatedHistory: [
      {
        viewport: "mobile",
        sectionId: "products",
        toolId: "card-1",
        consecutiveFailures: 3,
      },
    ],
    artifactDigest: "artifact-a",
  });

  assert.equal(issue?.repair.consecutiveFailures, 3);
  assert.equal(issue?.repair.strategy, "section_rewrite");
});

test("escalates a repeated semantic target when reviewer wording changes", () => {
  const history = new Map<string, VerificationIssueHistoryEntry>();
  const first = structureVerificationIssues({
    issues: [
      {
        code: "excellence_finding_weak_hero_balance",
        category: "visual_quality",
        dimension: "compositionHierarchy",
        scope: { sectionId: "hero", dimension: "compositionHierarchy" },
      },
    ],
    history,
    artifactDigest: "artifact-a",
  });
  const second = structureVerificationIssues({
    issues: [
      {
        code: "excellence_finding_competing_hero_actions",
        category: "visual_quality",
        dimension: "compositionHierarchy",
        sectionId: "hero",
      },
    ],
    history,
    artifactDigest: "artifact-b",
  });

  assert.equal(first[0]?.repair.consecutiveFailures, 1);
  assert.equal(second[0]?.repair.consecutiveFailures, 2);
  assert.equal(second[0]?.repair.strategy, "section_rewrite");
});

test("builds an executable repair plan from structured intent", () => {
  const [issue] = structureVerificationIssues({
    issues: [
      {
        code: "excellence_finding_hero_hierarchy",
        category: "visual_quality",
        severity: "blocker",
        dimensions: ["compositionHierarchy", "responsiveComposition"],
        scope: { sectionId: "hero", dimension: "compositionHierarchy" },
        affectedViewports: ["desktop", "tablet"],
        targets: [
          { sectionId: "hero", toolId: "hero-carousel" },
          { sectionId: "site-header", toolId: "site-navbar" },
        ],
        observations: [
          {
            viewport: "desktop",
            sectionId: "hero",
            observation: "The promotional panel competes with the CTA.",
          },
        ],
        repairIntent: {
          observed: "The promotional panel competes with the primary CTA.",
          expected: "The primary CTA leads the entry path.",
          objective: "Recompose the hero around one dominant action.",
          acceptanceCriteria: ["The CTA is dominant in both viewports."],
          prohibitedTactics: ["Do not remove required promotional content."],
        },
      },
    ],
    history: new Map(),
    artifactDigest: "artifact-a",
  });
  const [plan] = buildVerificationRepairPlan([issue!]);

  assert.equal(plan?.strategy, "section_rewrite");
  assert.equal(plan?.objective, "Recompose the hero around one dominant action.");
  assert.deepEqual(plan?.acceptanceCriteria, [
    "The CTA is dominant in both viewports.",
  ]);
  assert.deepEqual(plan?.dimensions, [
    "compositionHierarchy",
    "responsiveComposition",
  ]);
  assert.equal(plan?.targets?.length, 2);
  assert.equal(plan?.observations?.length, 1);
  assert.deepEqual(plan?.target, {
    sectionId: "hero",
    dimension: "compositionHierarchy",
  });
});

test("keeps Reviewer repair escalation within the finding scope", () => {
  const history = new Map<string, VerificationIssueHistoryEntry>();
  const rawIssue = {
    code: "excellence_finding_card_density",
    findingId: "stable-card-density",
    category: "visual_quality",
    severity: "major",
    scope: { sectionId: "products", toolId: "card-1" },
    requiredRepairStrategy: "site_regeneration",
    maximumRepairStrategy: "component_rewrite",
    scores: { spatialCraft: 5 },
    mustPreserve: {
      dimensions: { visualImpact: 6 },
      guardrails: ["briefIntegrity"],
    },
  };
  const [first] = structureVerificationIssues({
    issues: [rawIssue],
    history,
    artifactDigest: "artifact-a",
  });
  const [second] = structureVerificationIssues({
    issues: [{ ...rawIssue, code: "excellence_finding_renamed_density" }],
    history,
    artifactDigest: "artifact-b",
  });
  const [plan] = buildVerificationRepairPlan([second!]);

  assert.equal(first?.fingerprint, second?.fingerprint);
  assert.equal(second?.repair.strategy, "component_rewrite");
  assert.equal(plan?.findingId, "stable-card-density");
  assert.equal(plan?.maximumRepairStrategy, "component_rewrite");
  assert.deepEqual(plan?.scores, { spatialCraft: 5 });
  assert.deepEqual(plan?.mustPreserve, {
    dimensions: { visualImpact: 6 },
    guardrails: ["briefIntegrity"],
  });
});
