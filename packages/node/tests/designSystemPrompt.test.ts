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

test("requires equal Grid spans for homogeneous peer rows", () => {
  for (const reviewerCritiqueEnabled of [false, true]) {
    const prompt = getSystemPrompt({ reviewerCritiqueEnabled });

    assert.match(prompt, /explicit Grid arithmetic/i);
    assert.match(prompt, /C % N === 0/i);
    assert.match(prompt, /span = C \/ N/i);
    assert.match(prompt, /columnEnd - columnStart === span/i);
    assert.match(prompt, /5 \/ 5 \/ 5 \/ 7/i);
    assert.match(prompt, /20 or 24 available columns/i);
    assert.match(prompt, /least common multiple/i);
    assert.match(prompt, /rows of 3 and 4 peers, use 12 or 24 columns, not 22/i);
    assert.match(prompt, /independently at every breakpoint/i);
    assert.match(prompt, /featured or intentionally asymmetric item/i);
  }
});

test("documents the default Lucide icon contract", () => {
  const prompt = getSystemPrompt({ reviewerCritiqueEnabled: false });

  assert.match(prompt, /default interface icon system is Lucide/i);
  assert.match(prompt, /canonical PascalCase Lucide name/i);
  assert.match(prompt, /Do not guess names/i);
  assert.match(prompt, /Button\.startIcon.*Button\.endIcon/i);
  assert.match(prompt, /Lucide does not provide brand logos/i);
});

test("routes atomic content edits separately from non-direct browser repair", () => {
  const prompt = getSystemPrompt({ reviewerCritiqueEnabled: false });
  const reviewPrompt = getSystemPrompt({ reviewerCritiqueEnabled: true });

  assert.match(prompt, /Reading or printing source is not verification/i);
  assert.match(
    prompt,
    /server-reported static pass for the current artifact digest/i,
  );
  assert.match(prompt, /only authoritative non-direct verification path/i);
  assert.match(prompt, /read_artifact_for_edit/i);
  assert.match(prompt, /digest lease is valid for exactly one patch attempt/i);
  assert.match(prompt, /file changed only when the patch result reports/i);
  assert.match(reviewPrompt, /error: "quality_gate_failed"/i);
  assert.match(
    reviewPrompt,
    /Good and strong dimensions are preservation context, not separate repair items/i,
  );
  assert.doesNotMatch(prompt, /inspect the JSX file yourself/i);
  assert.match(
    prompt,
    /After any non-direct artifact edit, rerun `verify_browser_matrix` for desktop, tablet, and mobile/i,
  );
  assert.match(prompt, /Text\.content, Button\.label, or Image\.alt/i);
  assert.match(prompt, /`verify_direct_edit → done`/i);
  assert.match(
    prompt,
    /viewport subset is allowed only when the artifact is unchanged/i,
  );
  assert.doesNotMatch(prompt, /only the viewport\(s\) affected by the repair/i);
  assert.doesNotMatch(prompt, /Do not force a full repair matrix after every edit/i);
});

test("enforces the direct and non-direct canonical delivery routes", () => {
  for (const reviewerCritiqueEnabled of [false, true]) {
    const prompt = getSystemPrompt({ reviewerCritiqueEnabled });
    assert.match(prompt, /verify_direct_edit → done/i);
    assert.match(
      prompt,
      /scoped canonical projection → verify_browser_matrix → done/i,
    );
    assert.match(
      prompt,
      /create\/composition work uses `verify_browser_matrix → review_candidate → done`/i,
    );
    assert.match(
      prompt,
      /unless `verify_browser_matrix` explicitly returns `readyForDone: true` for a scoped Local modification/i,
    );
    assert.match(
      prompt,
      /Only `readyForDone: true` from a canonical gate authorizes/i,
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
  assert.match(prompt, /strong, good, weak, or unacceptable ratings/i);
  assert.match(prompt, /Intent integrity and experience integrity are non-tradeable gates/i);
  assert.match(prompt, /meaningful visible improvement/i);
  assert.match(prompt, /standalone verdict is pass/i);
  assert.match(prompt, /produce a new artifact digest/i);
  assert.match(prompt, /maximumRepairStrategy/);
  assert.match(prompt, /passing gates and good\/strong dimensions/i);
  assert.match(prompt, /Designer Agent must self-verify/i);
  assert.match(prompt, /reported observations no longer hold/i);
  assert.match(prompt, /every `acceptanceCriteria` entry is satisfied/i);
  assert.match(prompt, /no `prohibitedTactics` entry was used/i);
  assert.match(prompt, /self-check does not assign replacement ratings/i);
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
