import assert from "node:assert/strict";
import test from "node:test";
import type { Runner } from "@openai/agents";

import {
  ReviewerEvidenceError,
  runReviewerAgent,
  type ReviewerEvidenceProvider,
} from "../app/reviewer/reviewerAgent.ts";
import type { CompactReview } from "../app/compactProductQuality.ts";
import {
  buildReviewScopeInstructions,
  getExcellenceReviewScopeIssues,
} from "../app/reviewer/reviewScope.ts";

test("runs Reviewer as a short-lived read-only agent with self-captured evidence", async () => {
  const fixture = await createReviewerFixture();
  const runner = createFakeRunner({ captureCandidate: true });
  const result = await runReviewerAgent({
    ...fixture.input,
    runner,
  });

  assert.deepEqual(result.capturedTargets, ["candidate"]);
  assert.equal(result.screenshotCount, 3);
  assert.equal(result.toolCallCount, 1);
  assert.ok(fixture.lockChecks() >= 2);
});

test("forwards cancellation to the Reviewer runner", async () => {
  const fixture = await createReviewerFixture();
  const controller = new AbortController();
  let reviewerSignal: AbortSignal | undefined;
  const runner = createFakeRunner({
    captureCandidate: true,
    inspectSignal(signal) {
      reviewerSignal = signal;
    },
  });

  await runReviewerAgent({
    ...fixture.input,
    runner,
    signal: controller.signal,
  });

  assert.equal(reviewerSignal, controller.signal);
});

test("passes Designer implementation-limit declarations to Reviewer as authoritative", async () => {
  const fixture = await createReviewerFixture();
  let reviewerInstructions = "";
  let reviewerPrompt = "";
  const runner = createFakeRunner({
    captureCandidate: true,
    inspectContext(instructions, prompt) {
      reviewerInstructions = instructions;
      reviewerPrompt = prompt;
    },
  });
  await runReviewerAgent({
    ...fixture.input,
    unimplementedRequirements: [{
      requirement: "Allow visitors to type a custom query.",
      reason: "The available components expose no text-input capability.",
      alternative: "Provide preset query actions.",
    }],
    runner,
  });

  assert.match(reviewerInstructions, /Treat these declarations as authoritative/);
  assert.match(reviewerInstructions, /Do not verify whether they are true/);
  assert.match(reviewerPrompt, /Allow visitors to type a custom query/);
  assert.match(reviewerPrompt, /do not fail brief integrity/i);
});

test("rejects a Reviewer verdict produced without independent capture", async () => {
  const fixture = await createReviewerFixture();
  await assert.rejects(
    () =>
      runReviewerAgent({
        ...fixture.input,
        runner: createFakeRunner({ captureCandidate: false }),
      }),
    (error: unknown) =>
      error instanceof ReviewerEvidenceError &&
      error.code === "excellence_review_evidence_missing",
  );
});

test("requires fresh baseline evidence before comparative review", async () => {
  const fixture = await createReviewerFixture();
  await assert.rejects(
    () =>
      runReviewerAgent({
        ...fixture.input,
        baseline: {
          previewUrl: "http://localhost/baseline",
          artifactDigest: "baseline-digest",
          canonicalSource: "<Baseline />",
          priorReview: passingReview(),
        },
        runner: createFakeRunner({ captureCandidate: true }),
      }),
    (error: unknown) =>
      error instanceof ReviewerEvidenceError &&
      error.code === "excellence_review_baseline_evidence_missing",
  );
});

test("describes Header and Footer as immutable context for page-Body review", () => {
  const instructions = buildReviewScopeInstructions({
    kind: "page-body",
    pageId: "about",
    immutableSectionIds: ["header_section", "footer_section"],
    immutableToolIds: ["site_navbar"],
  });
  assert.match(instructions, /immutable visual context/);
  assert.match(instructions, /Never recommend reproducing Header\/Footer content in the Body/);
  assert.match(instructions, /header_section/);
});

test("rejects immutable and unlocated findings from a page-Body Reviewer", () => {
  const review = passingReview();
  review.verdict = "fail";
  review.gates.intentIntegrity.status = "fail";
  review.findings = [finding("shared_shell_mismatch", "footer_section"), finding("unlocated_shell_mismatch", null)];
  const issues = getExcellenceReviewScopeIssues(review, {
    kind: "page-body",
    pageId: "about",
    immutableSectionIds: ["header_section", "footer_section"],
    immutableToolIds: ["site_navbar"],
  });
  assert.ok(issues.some((issue) => issue.message.includes("immutable Section footer_section")));
  assert.ok(issues.some((issue) => issue.message.includes("unlocated document target")));
});

function createFakeRunner({
  captureCandidate,
  inspectContext,
  inspectSignal,
}: {
  captureCandidate: boolean;
  inspectContext?: (instructions: string, prompt: string) => void;
  inspectSignal?: (signal: AbortSignal | undefined) => void;
}) {
  return {
    async run(agent: {
      capabilities: unknown[];
      instructions: string;
      tools: Array<{
        name: string;
        invoke?: (context: unknown, input: string) => Promise<unknown>;
      }>;
    }, prompt: string, options?: { signal?: AbortSignal }) {
      inspectContext?.(agent.instructions, prompt);
      inspectSignal?.(options?.signal);
      assert.deepEqual(agent.capabilities, []);
      assert.deepEqual(
        agent.tools.map((tool) => tool.name),
        [
          "capture_locked_matrix",
          "inspect_visual_target",
          "scan_responsive_widths",
          "probe_interaction",
        ],
      );
      if (captureCandidate) {
        const capture = agent.tools.find(
          (tool) => tool.name === "capture_locked_matrix",
        );
        assert.ok(capture?.invoke);
        await capture.invoke({}, JSON.stringify({ artifact: "candidate" }));
      }

      return {
        finalOutput: passingReview(),
        completed: Promise.resolve(),
        async *[Symbol.asyncIterator]() {},
      };
    },
  } as unknown as Runner;
}

async function createReviewerFixture() {
  let lockChecks = 0;
  const evidenceProvider: ReviewerEvidenceProvider = {
    async assertLocked() {
      lockChecks += 1;
    },
    async captureMatrix() {
      return {
        ok: true,
        summary: { desktop: "passed", tablet: "passed", mobile: "passed" },
        screenshots: (["desktop", "tablet", "mobile"] as const).map(
          (viewport) => ({
            viewport,
            imageDataUrl: "data:image/png;base64,AA==",
          }),
        ),
      };
    },
    async inspectVisualTarget() {
      return {};
    },
    async scanResponsiveWidths() {
      return [];
    },
    async probeInteraction() {
      return {};
    },
  };

  return {
    input: {
      verificationRunId: "verification-1",
      userRequest: "Build a storefront.",
      designSystemReference: "Use a coherent visual rhythm.",
      candidate: {
        previewUrl: "http://localhost/candidate",
        artifactDigest: "candidate-digest",
        canonicalSource: "<Root />",
      },
      evidenceProvider,
      onLog() {},
    },
    lockChecks: () => lockChecks,
  };
}

function passingReview(): CompactReview {
  const assessment = () => ({
    rating: "good" as const,
    evidence: ["Concrete evidence one.", "Concrete evidence two."],
  });
  return {
    verdict: "pass",
    gates: {
      intentIntegrity: { status: "pass", evidence: assessment().evidence },
      experienceIntegrity: { status: "pass", evidence: assessment().evidence },
    },
    dimensions: {
      hierarchyComposition: assessment(),
      visualLanguage: assessment(),
      spatialReadability: assessment(),
      responsiveComposition: assessment(),
    },
    findings: [],
    comparison: null,
    summary: "The candidate passes the independent review.",
  };
}

function finding(code: string, sectionId: string | null): CompactReview["findings"][number] {
  return {
    code,
    rootCauseKey: `${code}.root_cause`,
    areas: ["intentIntegrity"],
    category: "requirement",
    severity: "major",
    observations: [{
      viewport: "desktop",
      sectionId,
      toolId: null,
      dataSlot: null,
      observation: "The visible region does not satisfy the requirement.",
    }],
    targets: [{
      sectionId,
      toolId: null,
      dataSlot: null,
      rationale: "The visible defect is located here.",
    }],
    objective: "Satisfy the scoped requirement.",
    acceptanceCriteria: ["The requirement is visibly satisfied."],
    prohibitedTactics: [],
  };
}
