import { Manifest, SandboxAgent } from "@openai/agents/sandbox";
import {
  MemorySession,
  Runner,
  tool,
  type ToolCallOutputContent,
} from "@openai/agents";
import { UnixLocalSandboxClient } from "@openai/agents/sandbox/local";
import { z } from "zod";

import { agentConfig, type BrowserViewportName } from "../agentConfig.ts";
import {
  EXCELLENCE_REVIEW_INSTRUCTIONS,
  excellenceReviewSchema,
  type ExcellenceReview,
} from "../productQuality.ts";

export type ReviewerArtifactTarget = "candidate" | "baseline";

export type ReviewerArtifactReference = {
  previewUrl: string;
  artifactDigest: string;
  canonicalSource: string;
  priorReview?: ExcellenceReview;
};

export type ReviewerMatrixEvidence = {
  ok: boolean;
  summary: unknown;
  screenshots: Array<{
    viewport: BrowserViewportName;
    imageDataUrl: string;
  }>;
  error?: string;
};

export type ReviewerEvidenceProvider = {
  assertLocked(target: ReviewerArtifactTarget): Promise<void>;
  captureMatrix(
    target: ReviewerArtifactTarget,
  ): Promise<ReviewerMatrixEvidence>;
  inspectVisualTarget(args: {
    target: ReviewerArtifactTarget;
    viewport: BrowserViewportName;
    sectionId: string | null;
    toolId: string | null;
    dataSlot: string | null;
  }): Promise<unknown>;
  scanResponsiveWidths(
    target: ReviewerArtifactTarget,
    widths: number[],
  ): Promise<unknown>;
  probeInteraction(args: {
    target: ReviewerArtifactTarget;
    viewport: BrowserViewportName;
    toolId: string | null;
    dataSlot: string | null;
    action: "focus" | "click" | "escape";
  }): Promise<unknown>;
};

export type ReviewerAgentRunInput = {
  verificationRunId: string;
  userRequest: string;
  designSystemReference: string;
  candidate: ReviewerArtifactReference;
  baseline?: ReviewerArtifactReference;
  evidenceProvider: ReviewerEvidenceProvider;
  runner: Runner;
  onModelEvent?: (event: unknown) => void;
  onLog?: (event: string, payload: unknown) => void;
};

export type ReviewerAgentRunResult = {
  review: ExcellenceReview;
  capturedTargets: ReviewerArtifactTarget[];
  toolCallCount: number;
  screenshotCount: number;
};

export class ReviewerEvidenceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ReviewerEvidenceError";
    this.code = code;
  }
}

export async function runReviewerAgent(
  input: ReviewerAgentRunInput,
): Promise<ReviewerAgentRunResult> {
  const state = {
    toolCallCount: 0,
    screenshotCount: 0,
    responsiveWidthCount: 0,
    interactionProbeCount: 0,
    capturedTargets: new Set<ReviewerArtifactTarget>(),
    captureFailures: [] as string[],
  };
  const targetSchema = z.enum(["candidate", "baseline"]);
  const viewportSchema = z.enum(agentConfig.browser.viewportNames);

  const consumeToolCall = (name: string) => {
    state.toolCallCount += 1;
    if (state.toolCallCount > agentConfig.review.maxToolCalls) {
      throw new ReviewerEvidenceError(
        "excellence_review_tool_budget_exhausted",
        `Reviewer exceeded its ${agentConfig.review.maxToolCalls}-tool evidence budget while calling ${name}.`,
      );
    }
  };

  const requireTarget = (target: ReviewerArtifactTarget) => {
    if (target === "baseline" && !input.baseline) {
      throw new ReviewerEvidenceError(
        "excellence_review_baseline_missing",
        "No locked baseline exists for this review.",
      );
    }
  };

  const captureLockedMatrix = tool({
    name: "capture_locked_matrix",
    description:
      "Capture fresh full-page desktop, tablet, and mobile evidence for one locked artifact. You must call this for candidate before scoring, and for baseline when a baseline is present. Repeated calls do not recapture evidence.",
    parameters: z.object({ artifact: targetSchema }).strict(),
    async execute({ artifact }) {
      consumeToolCall("capture_locked_matrix");
      requireTarget(artifact);
      if (state.capturedTargets.has(artifact)) {
        return `The ${artifact} matrix is already present in this review context; use the existing evidence.`;
      }

      await input.evidenceProvider.assertLocked(artifact);
      const evidence = await input.evidenceProvider.captureMatrix(artifact);
      await input.evidenceProvider.assertLocked(artifact);
      if (!evidence.ok) {
        const message =
          evidence.error ?? `${artifact} evidence capture did not pass.`;
        state.captureFailures.push(message);
        return `Reviewer evidence capture failed: ${message}`;
      }

      if (
        state.screenshotCount + evidence.screenshots.length >
        agentConfig.review.maxScreenshots
      ) {
        throw new ReviewerEvidenceError(
          "excellence_review_screenshot_budget_exhausted",
          `Reviewer would exceed its ${agentConfig.review.maxScreenshots}-screenshot budget.`,
        );
      }

      state.capturedTargets.add(artifact);
      state.screenshotCount += evidence.screenshots.length;
      input.onLog?.("excellence_reviewer.matrix_captured", {
        artifact,
        screenshots: evidence.screenshots.map((item) => item.viewport),
      });

      return [
        {
          type: "text" as const,
          text: `${artifact} deterministic evidence summary:\n${JSON.stringify(evidence.summary)}`,
        },
        ...evidence.screenshots.flatMap(
          ({ viewport, imageDataUrl }): ToolCallOutputContent[] => [
            {
              type: "text",
              text: `${artifact} full-page screenshot viewport: ${viewport}`,
            },
            {
              type: "image",
              image: imageDataUrl,
              detail: "high",
            },
          ],
        ),
      ] satisfies ToolCallOutputContent[];
    },
  });

  const inspectVisualTarget = tool({
    name: "inspect_visual_target",
    description:
      "Inspect geometry, text, and computed visual styles for one Section, Tool, or data-slot in a locked viewport. Use this to verify a concrete visual hypothesis before emitting a finding.",
    parameters: z
      .object({
        artifact: targetSchema,
        viewport: viewportSchema,
        sectionId: z.string().nullable(),
        toolId: z.string().nullable(),
        dataSlot: z.string().nullable(),
      })
      .strict(),
    async execute(args) {
      consumeToolCall("inspect_visual_target");
      requireTarget(args.artifact);
      if (!args.sectionId && !args.toolId && !args.dataSlot) {
        return "Provide at least one Section, Tool, or data-slot identifier.";
      }
      await input.evidenceProvider.assertLocked(args.artifact);
      return JSON.stringify(
        await input.evidenceProvider.inspectVisualTarget({
          target: args.artifact,
          viewport: args.viewport,
          sectionId: args.sectionId,
          toolId: args.toolId,
          dataSlot: args.dataSlot,
        }),
      );
    },
  });

  const scanResponsiveWidths = tool({
    name: "scan_responsive_widths",
    description:
      "Scan up to four additional widths without screenshots when the fixed desktop, tablet, and mobile evidence suggests a breakpoint gap. Return only deterministic runtime and layout facts.",
    parameters: z
      .object({
        artifact: targetSchema,
        widths: z
          .array(z.number().int().min(320).max(1600))
          .min(1)
          .max(agentConfig.review.maxResponsiveWidths),
      })
      .strict(),
    async execute({ artifact, widths }) {
      consumeToolCall("scan_responsive_widths");
      requireTarget(artifact);
      const uniqueWidths = [...new Set(widths)];
      if (
        state.responsiveWidthCount + uniqueWidths.length >
        agentConfig.review.maxResponsiveWidths
      ) {
        throw new ReviewerEvidenceError(
          "excellence_review_responsive_budget_exhausted",
          `Reviewer exceeded its ${agentConfig.review.maxResponsiveWidths}-width responsive scan budget.`,
        );
      }
      state.responsiveWidthCount += uniqueWidths.length;
      await input.evidenceProvider.assertLocked(artifact);
      return JSON.stringify(
        await input.evidenceProvider.scanResponsiveWidths(
          artifact,
          uniqueWidths,
        ),
      );
    },
  });

  const probeInteraction = tool({
    name: "probe_interaction",
    description:
      "Probe focus, a non-link button click, or Escape on an isolated locked preview. Use only to verify a visible interaction-state hypothesis; every probe reloads the locked preview and cannot persist changes.",
    parameters: z
      .object({
        artifact: targetSchema,
        viewport: viewportSchema,
        toolId: z.string().nullable(),
        dataSlot: z.string().nullable(),
        action: z.enum(["focus", "click", "escape"]),
      })
      .strict(),
    async execute(args) {
      consumeToolCall("probe_interaction");
      requireTarget(args.artifact);
      state.interactionProbeCount += 1;
      if (
        state.interactionProbeCount > agentConfig.review.maxInteractionProbes
      ) {
        throw new ReviewerEvidenceError(
          "excellence_review_interaction_budget_exhausted",
          `Reviewer exceeded its ${agentConfig.review.maxInteractionProbes}-probe interaction budget.`,
        );
      }
      if (args.action !== "escape" && !args.toolId && !args.dataSlot) {
        return "Focus and click probes require a Tool or data-slot identifier.";
      }
      await input.evidenceProvider.assertLocked(args.artifact);
      return JSON.stringify(
        await input.evidenceProvider.probeInteraction({
          target: args.artifact,
          viewport: args.viewport,
          toolId: args.toolId,
          dataSlot: args.dataSlot,
          action: args.action,
        }),
      );
    },
  });

  const manifest = new Manifest({
    root: agentConfig.sandbox.root,
    entries: {},
  });
  const sandboxSession = await new UnixLocalSandboxClient().create({
    manifest,
  });
  const session = new MemorySession();
  const agent = new SandboxAgent({
    name: "Reviewer",
    model: agentConfig.model.reviewerModel,
    defaultManifest: manifest,
    capabilities: [],
    tools: [
      captureLockedMatrix,
      inspectVisualTarget,
      scanResponsiveWidths,
      probeInteraction,
    ],
    outputType: excellenceReviewSchema,
    modelSettings: { text: { verbosity: "low" } },
    instructions: `${EXCELLENCE_REVIEW_INSTRUCTIONS}\n\nYou are a short-lived, read-only Reviewer Agent. The orchestration layer has already passed static and deterministic three-viewport browser verification. You must independently call capture_locked_matrix for candidate before judging it. If a baseline is present, call capture_locked_matrix for baseline before comparing. The caller does not preload screenshots. Use target, responsive, and interaction inspection only to verify concrete hypotheses; do not explore without a visible reason. Never modify files, never propose code, and never claim evidence you did not inspect. Score the candidate, not the baseline. A baseline is only a preservation and regression reference. Return the structured review as soon as the evidence is sufficient.`,
  });

  try {
    const result = await input.runner.run(agent, buildReviewerPrompt(input), {
      session,
      sandbox: { session: sandboxSession },
      maxTurns: agentConfig.review.maxAgentTurns,
      toolExecution: { maxFunctionToolConcurrency: 1 },
      stream: true,
    });
    for await (const event of result) {
      if (event.type === "raw_model_stream_event") {
        input.onModelEvent?.(event.data);
      }
    }
    await result.completed;

    if (state.captureFailures.length > 0) {
      throw new ReviewerEvidenceError(
        "excellence_review_capture_failed",
        state.captureFailures.join(" "),
      );
    }
    if (!state.capturedTargets.has("candidate")) {
      throw new ReviewerEvidenceError(
        "excellence_review_evidence_missing",
        "Reviewer returned without independently capturing the candidate desktop, tablet, and mobile matrix.",
      );
    }
    if (input.baseline && !state.capturedTargets.has("baseline")) {
      throw new ReviewerEvidenceError(
        "excellence_review_baseline_evidence_missing",
        "Reviewer returned without independently capturing the locked baseline matrix.",
      );
    }

    const parsed = excellenceReviewSchema.safeParse(result.finalOutput);
    if (!parsed.success) {
      throw new ReviewerEvidenceError(
        "excellence_review_unreadable",
        `Reviewer returned no valid structured assessment: ${parsed.error.message}`,
      );
    }

    return {
      review: parsed.data,
      capturedTargets: [...state.capturedTargets],
      toolCallCount: state.toolCallCount,
      screenshotCount: state.screenshotCount,
    };
  } finally {
    await sandboxSession.close();
  }
}

function buildReviewerPrompt(input: ReviewerAgentRunInput) {
  return [
    `Verification run ID: ${input.verificationRunId}`,
    "Original user request (highest authority):",
    input.userRequest,
    "",
    "Visual pattern reference (not the target brand):",
    input.designSystemReference,
    "",
    "Locked candidate:",
    JSON.stringify({
      previewUrl: input.candidate.previewUrl,
      artifactDigest: input.candidate.artifactDigest,
    }),
    "",
    "Candidate canonical JSX source:",
    input.candidate.canonicalSource,
    "",
    ...(input.baseline
      ? [
          "Locked best baseline:",
          JSON.stringify({
            previewUrl: input.baseline.previewUrl,
            artifactDigest: input.baseline.artifactDigest,
          }),
          "",
          "Baseline canonical JSX source:",
          input.baseline.canonicalSource,
          "",
          "Baseline structured review:",
          JSON.stringify(input.baseline.priorReview),
          "",
          "Compare the candidate against the baseline. Preserve every passing guardrail and protected visual floor. A one-point tradeoff in a non-critical visual dimension is acceptable only when the weighted visual score does not fall, no blocker or severe finding is introduced, and the candidate makes a meaningful visible improvement.",
        ]
      : []),
    "Use capture_locked_matrix now. Do not return a verdict before independently capturing all required locked artifacts.",
  ].join("\n");
}
