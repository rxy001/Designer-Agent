import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDesignSystemReferencePrompt,
  DESIGN_SYSTEM_REFERENCE_POLICY,
} from "../app/prompts/design-system.ts";
import {
  BROWSER_REPAIR_CODE_CATALOG,
  getSystemPrompt,
} from "../app/prompts/system.ts";

test("treats a named design system as a non-brand visual reference", () => {
  assert.match(DESIGN_SYSTEM_REFERENCE_POLICY, /not the target brand/i);
  assert.match(DESIGN_SYSTEM_REFERENCE_POLICY, /original user request/i);
  assert.match(DESIGN_SYSTEM_REFERENCE_POLICY, /logos, marks, wordmarks/i);
  assert.match(DESIGN_SYSTEM_REFERENCE_POLICY, /Never require or reward/i);

  const prompt = buildDesignSystemReferencePrompt(
    "The Claude wordmark and radial mark are mandatory.",
  );
  assert.ok(
    prompt.indexOf("visual-pattern reference") <
      prompt.indexOf("Claude wordmark"),
  );
  assert.match(prompt, /Reference contract reminder/);
  assert.match(prompt, /non-transferable examples/i);
});

test("documents the unresolved browser issue contract", () => {
  assert.match(BROWSER_REPAIR_CODE_CATALOG, /Unresolved browser issue/i);
  assert.match(BROWSER_REPAIR_CODE_CATALOG, /unintended-overlap/);
  assert.match(BROWSER_REPAIR_CODE_CATALOG, /image-readiness environment/i);

  const prompt = getSystemPrompt({ reviewerCritiqueEnabled: true });
  assert.match(prompt, /unresolvedIssues/);
  assert.match(prompt, /`section\.tools`.*aggregated by Tool identity/i);
  assert.match(prompt, /does not return repair-plan IDs/i);
  assert.doesNotMatch(prompt, /repairHintIds/);
});

test("requires one current three-viewport repair pass after artifact edits", () => {
  const prompt = getSystemPrompt({ reviewerCritiqueEnabled: false });

  assert.match(
    prompt,
    /After any artifact edit, rerun `verify_browser_matrix` for desktop, tablet, and mobile/i,
  );
  assert.match(
    prompt,
    /viewport subset is allowed only when the artifact is unchanged/i,
  );
  assert.doesNotMatch(prompt, /only the viewport\(s\) affected by the repair/i);
  assert.doesNotMatch(prompt, /Do not force a full repair matrix after every edit/i);
});

test("enforces review_candidate between repair verification and done", () => {
  for (const reviewerCritiqueEnabled of [false, true]) {
    const prompt = getSystemPrompt({ reviewerCritiqueEnabled });
    assert.match(
      prompt,
      /verify_browser_matrix → review_candidate → done/i,
    );
    assert.match(
      prompt,
      /A passing repair matrix never authorizes `done` directly/i,
    );
    assert.match(
      prompt,
      /Only `readyForDone: true` from `review_candidate` authorizes/i,
    );
  }
});

test("allows an explicit external blocker to end a run without done", () => {
  for (const reviewerCritiqueEnabled of [false, true]) {
    const prompt = getSystemPrompt({ reviewerCritiqueEnabled });

    assert.match(prompt, /Successful delivery has no prose-only completion path/i);
    assert.match(prompt, /only valid exits without successful delivery/i);
    assert.match(prompt, /status: "blocked_external"/i);
    assert.match(prompt, /explicit terminal workflow outcome/i);
    assert.match(prompt, /These outcomes are not deliveries/i);
    assert.match(prompt, /do not edit the artifact or call `review_candidate` or `done`/i);
    assert.match(prompt, /wait for a new run/i);
    assert.match(prompt, /When inspection reports an artifact defect/i);
    assert.doesNotMatch(prompt, /A delivery task has no prose-only completion path/i);
    assert.doesNotMatch(prompt, /If an inspection fails, revise the artifact/i);
  }
});

test("renders the configured visual-review budget into the system prompt", () => {
  const prompt = getSystemPrompt({
    maxFinalVisualRuns: 7,
    reviewerCritiqueEnabled: true,
  });
  assert.match(prompt, /run-wide visual-review limit is 7/i);
  assert.equal(prompt.includes("{{FINAL_VISUAL_LIMIT}}"), false);
  assert.match(prompt, /Reviewer repair is monotonic/i);
  assert.match(prompt, /maximumRepairStrategy/);
  assert.match(prompt, /mustPreserve\.dimensions/);
  assert.match(prompt, /review_candidate.*readyForDone/i);
  assert.match(prompt, /done.*performs no new review/i);
});

test("treats Reviewer infrastructure failure as a non-blocking warning", () => {
  const prompt = getSystemPrompt({ reviewerCritiqueEnabled: true });
  assert.match(prompt, /qualityStatus: "review_unavailable"/i);
  assert.match(prompt, /must not block an otherwise verified delivery/i);
  assert.match(prompt, /cannot reject a delivery that passed deterministic verification/i);
});

test("removes Reviewer / Critique requirements when the flow is disabled", () => {
  const prompt = getSystemPrompt({
    maxFinalVisualRuns: 7,
    reviewerCritiqueEnabled: false,
  });

  assert.match(prompt, /Canonical delivery gate/i);
  assert.doesNotMatch(prompt, /Reviewer/i);
  assert.doesNotMatch(prompt, /visual-review/i);
  assert.doesNotMatch(prompt, /independent visual/i);
  assert.doesNotMatch(prompt, /best_effort|review_unavailable/i);
  assert.doesNotMatch(prompt, /independent visual-review attempt/i);
});
