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
  COMPACT_REVIEW_INSTRUCTIONS,
  compactReviewerOutputSchema,
  type CompactReview,
} from "../compactProductQuality.ts";
import {
  buildReviewScopeInstructions,
  type ExcellenceReviewScope,
} from "./reviewScope.ts";
import {
  buildUnimplementedRequirementsInstructions,
  type UnimplementedRequirement,
} from "./unimplementedRequirement.ts";

export type ReviewerArtifactTarget = "candidate" | "baseline";

export type ReviewerArtifactReference = {
  previewUrl: string;
  artifactDigest: string;
  canonicalSource: string;
  priorReview?: CompactReview;
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
  designSystemReference?: string;
  candidate: ReviewerArtifactReference;
  baseline?: ReviewerArtifactReference;
  reviewScope?: ExcellenceReviewScope;
  unimplementedRequirements?: UnimplementedRequirement[];
  evidenceProvider: ReviewerEvidenceProvider;
  runner: Runner;
  signal?: AbortSignal;
  onModelEvent?: (event: unknown) => void;
  onLog?: (event: string, payload: unknown) => void;
};

export type ReviewerAgentRunResult = {
  review: CompactReview;
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
  input.signal?.throwIfAborted();
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
      input.signal?.throwIfAborted();
      consumeToolCall("capture_locked_matrix");
      requireTarget(artifact);
      if (state.capturedTargets.has(artifact)) {
        return `The ${artifact} matrix is already present in this review context; use the existing evidence.`;
      }

      await input.evidenceProvider.assertLocked(artifact);
      const evidence = await input.evidenceProvider.captureMatrix(artifact);
      input.signal?.throwIfAborted();
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
      input.signal?.throwIfAborted();
      consumeToolCall("inspect_visual_target");
      requireTarget(args.artifact);
      if (!args.sectionId && !args.toolId && !args.dataSlot) {
        return "Provide at least one Section, Tool, or data-slot identifier.";
      }
      await input.evidenceProvider.assertLocked(args.artifact);
      const inspection = await input.evidenceProvider.inspectVisualTarget({
        target: args.artifact,
        viewport: args.viewport,
        sectionId: args.sectionId,
        toolId: args.toolId,
        dataSlot: args.dataSlot,
      });
      input.signal?.throwIfAborted();
      return JSON.stringify(inspection);
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
      input.signal?.throwIfAborted();
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
      const inspection = await input.evidenceProvider.scanResponsiveWidths(
        artifact,
        uniqueWidths,
      );
      input.signal?.throwIfAborted();
      return JSON.stringify(inspection);
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
      input.signal?.throwIfAborted();
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
      const inspection = await input.evidenceProvider.probeInteraction({
        target: args.artifact,
        viewport: args.viewport,
        toolId: args.toolId,
        dataSlot: args.dataSlot,
        action: args.action,
      });
      input.signal?.throwIfAborted();
      return JSON.stringify(inspection);
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
    outputType: compactReviewerOutputSchema,
    modelSettings: { text: { verbosity: "low" } },
    instructions: `${COMPACT_REVIEW_INSTRUCTIONS}\n\n${buildReviewScopeInstructions(input.reviewScope)}\n\n${buildUnimplementedRequirementsInstructions(input.unimplementedRequirements)}\n\nYou are a short-lived, read-only Reviewer Agent. The orchestration layer has already passed static and deterministic three-viewport browser verification. You must independently call capture_locked_matrix for candidate before judging it. If a baseline is present, call capture_locked_matrix for baseline before comparing. The caller does not preload screenshots. Use target, responsive, and interaction inspection only to verify concrete hypotheses; do not explore without a visible reason. Never modify files, never propose code, and never claim evidence you did not inspect. Assess the candidate, not the baseline. A baseline is only a preservation and regression reference. Return the structured review as soon as the evidence is sufficient.`,
  });

  try {
    input.signal?.throwIfAborted();
    const result = await input.runner.run(agent, buildReviewerPrompt(input), {
      session,
      sandbox: { session: sandboxSession },
      maxTurns: agentConfig.review.maxAgentTurns,
      toolExecution: { maxFunctionToolConcurrency: 1 },
      signal: input.signal,
      stream: true,
    });
    for await (const event of result) {
      input.signal?.throwIfAborted();
      if (event.type === "raw_model_stream_event") {
        input.onModelEvent?.(event.data);
      }
    }
    await result.completed;
    input.signal?.throwIfAborted();

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

    const parsed = compactReviewerOutputSchema.safeParse(result.finalOutput);
    if (!parsed.success) {
      throw new ReviewerEvidenceError(
        "excellence_review_unreadable",
        `Reviewer returned no valid structured assessment: ${parsed.error.message}`,
      );
    }
    if (input.baseline && parsed.data.comparison === null) {
      throw new ReviewerEvidenceError(
        "compact_review_comparison_missing",
        "Reviewer returned no pairwise comparison for the locked baseline.",
      );
    }
    if (!input.baseline && parsed.data.comparison !== null) {
      throw new ReviewerEvidenceError(
        "compact_review_comparison_unexpected",
        "Reviewer returned a baseline comparison when no baseline was supplied.",
      );
    }

    // Keep the structured decision auditable without logging screenshots or
    // canonical JSX, both of which can be large and user-sensitive.
    input.onLog?.("excellence_reviewer.output", {
      schemaVersion: "compact-v2",
      candidateArtifactDigest: input.candidate.artifactDigest,
      baselineArtifactDigest: input.baseline?.artifactDigest,
      verdict: parsed.data.verdict,
      findingCodes: parsed.data.findings.map((finding) => finding.code),
      comparison: parsed.data.comparison,
    });

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
    "Authorized review scope (higher priority than requirements assigned to another owner):",
    buildReviewScopeInstructions(input.reviewScope),
    "",
    "Authoritative implementation-limit declarations:",
    buildUnimplementedRequirementsInstructions(input.unimplementedRequirements),
    "",
    ...(input.designSystemReference
      ? [
          "Visual pattern reference (not the target brand):",
          input.designSystemReference,
          "",
        ]
      : []),
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
          "Compare the candidate directly against the baseline. Preserve every passing gate and every good or strong protected dimension. Prefer the candidate only when it makes a meaningful visible improvement without a gate regression, a protected dimension falling to weak or unacceptable, or a new blocker or major root cause.",
        ]
      : []),
    "Use capture_locked_matrix now. Do not return a verdict before independently capturing all required locked artifacts.",
  ].join("\n");
}
