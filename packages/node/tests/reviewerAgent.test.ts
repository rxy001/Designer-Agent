import assert from "node:assert/strict";
import test from "node:test";
import type { Runner } from "@openai/agents";

import {
  ReviewerEvidenceError,
  runReviewerAgent,
  type ReviewerEvidenceProvider,
} from "../app/reviewer/reviewerAgent.ts";
import type { ExcellenceReview } from "../app/productQuality.ts";

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

function createFakeRunner({ captureCandidate }: { captureCandidate: boolean }) {
  return {
    async run(agent: {
      capabilities: unknown[];
      tools: Array<{
        name: string;
        invoke?: (context: unknown, input: string) => Promise<unknown>;
      }>;
    }) {
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

function passingReview(): ExcellenceReview {
  const assessment = () => ({
    score: 8,
    evidence: ["Concrete evidence one.", "Concrete evidence two."],
  });
  return {
    verdict: "pass",
    guardrails: {
      briefIntegrity: { status: "pass", evidence: assessment().evidence },
      brandContentIntegrity: { status: "pass", evidence: assessment().evidence },
    },
    dimensions: {
      visualImpact: assessment(),
      compositionHierarchy: assessment(),
      typographyQuality: assessment(),
      colorImageryQuality: assessment(),
      spatialCraft: assessment(),
      designSystemApplication: assessment(),
      responsiveComposition: assessment(),
    },
    blockers: [],
    findings: [],
    summary: "The candidate passes the independent review.",
  };
}
