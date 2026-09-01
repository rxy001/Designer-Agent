import {
  Manifest,
  SandboxAgent,
  StaticCompactionPolicy,
  compaction,
  filesystem,
  localDir,
  localBindMountStrategy,
  mount,
  shell,
  skills,
} from "@openai/agents/sandbox";
import {
  MCPServerStdio,
  tool,
  Runner,
  setDefaultOpenAIClient,
  MemorySession,
} from "@openai/agents";
import {
  localDirLazySkillSource,
  UnixLocalSandboxClient,
} from "@openai/agents/sandbox/local";
import {
  appendFile,
  copyFile,
  cp,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { KeyedMutationQueue } from "./runtime/keyedMutationQueue.ts";
import { dirname, join, sep } from "node:path";
import {
  agentConfig,
  type BrowserViewportConfig,
  type BrowserViewportName,
} from "./agentConfig.ts";
import { getSystemPrompt } from "./prompts/system.ts";
import {
  buildDesignSystemReferencePrompt,
} from "./prompts/design-system.ts";
import { buildInitialDesignerPrompt } from "./prompts/user.ts";
import {
  readDesignSystemReference,
  resolveDesignSystemReference,
  type DesignSystemReference,
} from "./designSystemReference.ts";
import {
  assertRecoveryArtifactDigest,
  assertRecoveryEnvelopeSize,
  buildDesignerRecoveryPrompt,
  type DesignerRecoveryEnvelope,
} from "./agentRecoveryContext.ts";
import {
  registerPreviewArtifact,
  registerPreviewSource,
  toWorkspaceRelativePath,
  unregisterPreviewArtifact,
  unregisterPreviewArtifactsForWorkspace,
} from "./previewRegistry.ts";
import type { PreviewArtifact } from "./previewRegistry.ts";
import { normalizeArtifactPath } from "./artifactPath.ts";
import { diffPageDocuments } from "./editor/diffPageDocuments.ts";
import { filterPatchByTargetTool } from "./editor/filterPatchByTargetTool.ts";
import { filterPatchByTargetSection } from "./editor/filterPatchByTargetSection.ts";
import { applyDeliveryPatch } from "./editor/applyDeliveryPatch.ts";
import {
  analyzeModification,
  type DesignOperation,
} from "./editor/modificationPolicy.ts";
import {
  filterNewDeliveryIssues,
  toComparableDeliveryIssues,
} from "./editor/deliveryVerification.ts";
import { jsxToPageDocument } from "./editor/jsxToPageDocument.ts";
import { arePageDocumentsSemanticallyEqual } from "./editor/pageDocumentSemanticEquality.ts";
import { pageDocumentToJsx } from "./editor/pageDocumentToJsx.ts";
import { pageDocumentSchema, pagePatchSchema } from "./editor/schema.ts";
import type { PageDocument, PagePatch } from "./editor/schema.ts";
import { findDuplicatePageDocumentIds } from "./editor/validatePageDocumentIds.ts";
import { z } from "zod";
import { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseUsage } from "openai/resources/responses/responses";
import { fetch, ProxyAgent, install } from "undici";
import { paths } from "./paths.ts";
import { buildLayoutRepairFacts } from "./layoutRepairFacts.ts";
import {
  buildRepairIssueProgress,
  compactBrowserMatrixRepairFacts,
} from "./repairPolicy.ts";
import type { RepairIssueSnapshot } from "./repairPolicy.ts";
import {
  buildViewportSizeIssues,
  selectRepairViewportNames,
  type BrowserActualViewport,
} from "./browserViewportPolicy.ts";
import {
  getExternalVerificationBlockerCode,
  getInfrastructureBlockedViewports,
  isBrowserInfrastructureIssueCode,
} from "./browserInfrastructurePolicy.ts";
import {
  isBlockingOverlapRecord,
  isExpectedCarouselInternalHorizontalIssue,
} from "./layoutInspectionPolicy.ts";
import { inspectArtifactIds } from "./artifactIdPolicy.ts";
import { inspectViewportRelativeFontSizing } from "./artifactStylePolicy.ts";
import {
  buildCompactPreservationContract as buildExcellencePreservationContract,
  buildCompactReviewReport as buildExcellenceReviewReport,
  COMPACT_REVIEW_SCHEMA_VERSION,
  compareCompactReviewCycle as compareExcellenceReviewCycle,
  compareCompactReviews as compareExcellenceReviews,
  compactReviewerOutputSchema as excellenceReviewerOutputSchema,
  getCompactReviewIssues as getExcellenceReviewIssues,
  getCompactReviewSemanticIssues as getExcellenceReviewSemanticIssues,
  normalizeCompactReview as normalizeExcellenceReview,
  shouldRollbackCompactCandidate as shouldRollbackExcellenceCandidate,
  type CompactReview as ExcellenceReview,
  type CompactReviewExecution,
} from "./compactProductQuality.ts";
import {
  buildQualitySnapshot,
  inspectQualityRegression,
} from "./productQuality.ts";
import type { QualitySnapshot } from "./productQuality.ts";
import {
  getExcellenceReviewScopeIssues,
  type ExcellenceReviewScope,
} from "./reviewer/reviewScope.ts";
import {
  describeFinalVisualBudget,
  getFinalVerificationBlock,
  inspectBudget,
  inspectRepairVerificationBudget,
  isTerminalDoneIssueCode,
  shouldChargeRepairRequest,
  shouldBlockUnchangedArtifact,
  shouldAttemptAcceptanceRecovery,
  shouldRejectExcellenceReview,
  repairRequestsAfterReviewFailure,
  shouldTerminallyRejectRepairVerification,
  shouldTerminallyRejectFailedVisualReview,
} from "./agentPolicy.ts";
import {
  isSiteAgentWorkflowTerminal,
  transitionSiteAgentWorkflow,
  type SiteAgentWorkflowEvent,
  type SiteAgentWorkflowState,
} from "./siteAgentWorkflow.ts";
import {
  buildWorkflowContinuationPrompt,
  requiresWorkflowContinuation,
  type PendingRepairContext,
} from "./workflowContinuation.ts";
import {
  buildVerificationRepairPlan,
  structureVerificationIssues,
  type StructuredVerificationIssue,
  type VerificationIssueHistoryEntry,
} from "./verificationIssue.ts";
import {
  safeStringify,
  summarizeToolCallForLog,
  summarizeValueForLog,
} from "./runnerLogSummaries.ts";
import {
  emitUserVisibleMessage,
  sanitizeUserVisibleText,
  sanitizeUserVisibleTodos,
  type UserVisibleAgentEvent,
} from "./userVisibleAgentEvents.ts";
import {
  getShellJsxMutationBlock,
  restoreJsxArtifacts,
  snapshotJsxArtifacts,
} from "./artifactMutationPolicy.ts";
import {
  runAutomaticGridRepair,
  type AutomaticGridRepairEvent,
} from "./automaticGridRepair.ts";
import { projectUnresolvedIssues } from "./unresolvedIssueProjection.ts";
import { normalizeReportIssueCode } from "./modelRepairIssueCode.ts";
import { getArtifactLogIdForPath } from "./artifactLog.ts";
import {
  persistWorkspaceChanges,
  snapshotWorkspaceFiles,
} from "./artifactWorkspace.ts";
import { getBrokenImageUrls, replaceBrokenImageUrls } from "./imageFallback.ts";
import {
  ReviewerEvidenceError,
  runReviewerAgent,
  type ReviewerArtifactReference,
  type ReviewerArtifactTarget,
  type ReviewerEvidenceProvider,
} from "./reviewer/reviewerAgent.ts";
import {
  unimplementedRequirementSchema,
  type UnimplementedRequirement,
} from "./reviewer/unimplementedRequirement.ts";
import { getReviewerEligibilityIssue } from "./reviewer/reviewerEligibility.ts";
import { getSiteLogContext } from "./logging/logContext.ts";
import { siteAuditLogger } from "./logging/siteAuditLogger.ts";
import { siteRuntimeResources } from "./site/siteScheduler.ts";
import { abortReason } from "./runtime/runWithTimeout.ts";
import {
  buildViewportRepairContract,
  inspectProtectedBrowserGeometryChanges,
  inspectProtectedPageLayoutChanges,
  type ViewportRepairContract,
} from "./viewportMutationGuard.ts";

install();

const key = agentConfig.model.apiKey;
const proxyUrl = agentConfig.model.proxyURL;
const runnerLogReady = mkdir(paths.logsDir, { recursive: true });
const imageLoadTimeoutMs = agentConfig.browser.imageLoadTimeoutMs;
const maxImageReadinessAttempts = agentConfig.browser.maxImageReadinessAttempts;
const agentLimits = agentConfig.limits;
const maxModelBrowserIssues = agentConfig.browser.maxModelBrowserIssues;
const maxModelRuntimeErrors = agentConfig.browser.maxModelRuntimeErrors;
const defaultReviewerCritiqueEnabled =
  agentConfig.review.reviewerCritiqueEnabled;

let runnerLogWriteQueue: Promise<void> = Promise.resolve();
const artifactLogContext = new AsyncLocalStorage<{ artifactId: string }>();
const browserRuntimeContext = new AsyncLocalStorage<{ id: string }>();
let temporaryDeliveryArtifactCounter = 0;
let browserRuntimeContextCounter = 0;
const deliveryCommitQueues = new Map<string, Promise<void>>();
const artifactMutationToolQueue = new KeyedMutationQueue();
const sharedChromeDevtoolsServers = new Map<string, MCPServerStdio>();
const sharedChromeDevtoolsServerStarts = new Map<
  string,
  Promise<ChromeDevtoolsServerResult>
>();
const sharedBrowserMatrixPageIds = new Map<string, number>();

const buildingComponents = agentConfig.components.buildingComponents;
const overlayComponents = agentConfig.components.overlayComponents;

const buildingComponentSet = new Set<string>(buildingComponents);
const overlayComponentSet = new Set<string>(overlayComponents);
type TokenUsageTotals = Pick<
  ResponseUsage,
  "input_tokens" | "output_tokens" | "total_tokens"
> & {
  cached_tokens: number;
  reasoning_tokens: number;
};

type InspectionRecord = {
  checkedAt: number;
  ok?: boolean;
  issues?: unknown[];
  warnings?: unknown[];
};

type BrowserViewportReport = {
  viewport: BrowserViewportName;
  width: number;
  height: number;
  actualViewport?: BrowserActualViewport;
  checkedAt: number;
  artifactModifiedAt: number;
  imageLoading?: ImageLoadingReport;
  runtime: {
    ok: boolean;
    errors: string[];
    rootChildren: number;
    sectionCount: number;
    imageCount: number;
    dataSlotCount: number;
  };
  layout: {
    ok: boolean;
    issues: Array<Record<string, unknown>>;
    repairFacts?: Array<Record<string, unknown>>;
    sections?: Array<Record<string, unknown>>;
  };
  screenshotDataUrl?: string;
  error?: string;
  infrastructureError?: boolean;
};

type ImageLoadingReport = {
  total: number;
  complete: number;
  loaded: number;
  broken: number;
  pending: number;
  timedOut: boolean;
  timeoutMs: number;
  elapsedMs: number;
};

export type BrowserMatrixInspection = {
  checkedAt: number;
  artifactModifiedAt: number;
  ok: boolean;
  mode: "repair" | "final";
  viewports: Partial<Record<BrowserViewportName, BrowserViewportReport>>;
  blockingIssues: Array<Record<string, unknown>>;
  repairFacts?: Array<Record<string, unknown>>;
};

type ChromeDevtoolsServerResult =
  | { ok: true; server: MCPServerStdio }
  | { ok: false; error: string };

type VerificationArtifactState = {
  sandboxPath?: string;
  hostPath?: string;
  previewUrl?: string;
  lastModifiedAt?: number;
  artifactDigest?: string;
  artifactSource?: string;
  lastVerificationFailed?: boolean;
  staticInspection?: InspectionRecord;
  browserMatrixInspection?: BrowserMatrixInspection;
  pendingBrowserViewports?: BrowserViewportName[];
  qualityBaseline?: QualitySnapshot;
};

type DoneRejection = {
  path: string;
  missing: string[];
  issues: StructuredVerificationIssue[];
  verificationReport: ReturnType<typeof buildVerificationReport>;
  message: string;
  terminal: boolean;
};

type DeliveryResult = {
  artifactPath: string;
  artifactModifiedAt: number;
  artifactDigest: string;
  previewUrl: string;
  patch: PagePatch;
  qualityStatus:
    | "passed"
    | "review_skipped"
    | "review_unavailable"
    | "best_effort";
  unimplementedRequirements: UnimplementedRequirement[];
};

type ExternalVerificationBlocker = {
  code:
    | "browser_infrastructure_unavailable"
    | "image_readiness_exhausted"
    | "viewport_emulation_unavailable";
  message: string;
  artifactPath: string;
  artifactDigest: string;
  affectedViewports: BrowserViewportName[];
  retryable: true;
  requiredAction: string;
};

type VisualValidationCacheEntry = {
  inspection: BrowserMatrixInspection;
  ignoredBaselineIssueCount: number;
  review?: ExcellenceReview;
};

type ReviewedArtifactCheckpoint = {
  path: string;
  hostPath: string;
  source: string;
  patch: PagePatch;
  review: ExcellenceReview;
  inspection: BrowserMatrixInspection;
  unimplementedRequirements: UnimplementedRequirement[];
};

type ReviewedDeliveryCheckpoint = {
  path: string;
  hostPath: string;
  expectedSourceDigest: string;
  canonicalSource: string;
  patch: PagePatch;
  qualityStatus: DeliveryResult["qualityStatus"];
  message: string;
  unimplementedRequirements: UnimplementedRequirement[];
};

type ReviewedDeliveryCommitBlock =
  | "candidate_review_required"
  | "candidate_path_mismatch"
  | "artifact_edit_lease_active";

type StaticInspectionCacheEntry = {
  inspection: Awaited<ReturnType<typeof inspectStaticArtifact>>;
};

type ArtifactEditReadLease = {
  artifactDigest: string;
};

type AgentRunState = {
  signal?: AbortSignal;
  workflowState: SiteAgentWorkflowState;
  operation: DesignOperation;
  previousPage: PageDocument;
  workspaceDir: string;
  contextDir: string;
  userRequest: string;
  designSystem?: DesignSystemReference;
  targetToolId?: string;
  targetSectionId?: string;
  reviewScope?: ExcellenceReviewScope;
  reviewerCritiqueEnabled: boolean;
  unimplementedRequirements: UnimplementedRequirement[];
  verificationState: Map<string, VerificationArtifactState>;
  staticInspectionCache: Map<string, StaticInspectionCacheEntry>;
  artifactEditReadLeases: Map<string, ArtifactEditReadLease>;
  repairEvidenceCache: Map<string, BrowserMatrixInspection>;
  imageReadinessAttempts: Map<string, number>;
  visualValidationCache: Map<string, VisualValidationCacheEntry>;
  originalQualityBaseline?: QualitySnapshot;
  todos: Array<{
    name: string;
    status: "pending" | "in_progress" | "completed";
  }>;
  emitUserEvent?: (event: UserVisibleAgentEvent) => void;
  repairIssueHistory: RepairIssueSnapshot[];
  verificationIssueHistory: Map<string, VerificationIssueHistoryEntry>;
  repairRequests: number;
  finalVisualRuns: number;
  designerTurnsUsed: number;
  designerPhase: number;
  lastRecoveryEnvelope?: DesignerRecoveryEnvelope;
  bestReviewedArtifact?: ReviewedArtifactCheckpoint;
  viewportRepairContract?: ViewportRepairContract & {
    baselineInspection: BrowserMatrixInspection;
  };
  reviewedDelivery?: ReviewedDeliveryCheckpoint;
  tokenUsage: TokenUsageAccumulator;
  finalPath: string;
  lastDoneRejection?: DoneRejection;
  pendingRepair?: PendingRepairContext;
  clarification?: string;
  externalBlocker?: ExternalVerificationBlocker;
  deliveryResult?: DeliveryResult;
};

export function throwIfAgentRunAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortReason(signal);
}

function assertAgentRunActive(runState: AgentRunState) {
  throwIfAgentRunAborted(runState.signal);
}

type AgentRunResponse =
  | { clarification: string }
  | { externalBlocker: ExternalVerificationBlocker }
  | {
      artifactPath: string;
      message: string;
      deliveryResult: DeliveryResult;
    };

function transitionRunWorkflow(
  runState: AgentRunState,
  event: SiteAgentWorkflowEvent,
) {
  const previous = runState.workflowState;
  const next = transitionSiteAgentWorkflow(previous, event);
  runState.workflowState = next;
  monitorLog("workflow.transition", { previous, event, next });
  return next;
}

function readAgentRunOutcome(runState: AgentRunState) {
  return {
    finalPath: runState.finalPath,
    lastDoneRejection: runState.lastDoneRejection,
    pendingRepair: runState.pendingRepair,
    workflowState: runState.workflowState,
    clarification: runState.clarification,
    externalBlocker: runState.externalBlocker,
    deliveryResult: runState.deliveryResult,
  };
}

function acceptReviewedDelivery(
  runState: AgentRunState,
  checkpoint: ReviewedDeliveryCheckpoint,
) {
  const closedEditLeaseCount = runState.artifactEditReadLeases.size;
  runState.artifactEditReadLeases.clear();
  runState.reviewedDelivery = checkpoint;
  if (closedEditLeaseCount > 0) {
    monitorLog("artifact_edit_leases.closed_by_canonical_gate", {
      path: checkpoint.path,
      closedEditLeaseCount,
    });
  }
}

export function getReviewedDeliveryCommitBlock({
  workflowState,
  checkpointPath,
  suppliedPath,
  activeEditLeaseCount,
}: {
  workflowState: SiteAgentWorkflowState;
  checkpointPath?: string;
  suppliedPath: string;
  activeEditLeaseCount: number;
}): ReviewedDeliveryCommitBlock | undefined {
  if (workflowState !== "ready_for_done" || !checkpointPath) {
    return "candidate_review_required";
  }
  if (checkpointPath !== suppliedPath) return "candidate_path_mismatch";
  if (activeEditLeaseCount > 0) return "artifact_edit_lease_active";
  return undefined;
}

export function createRunManifest({
  workspaceDir,
  componentsDir,
  contextDir,
  designSystem,
}: {
  workspaceDir: string;
  componentsDir: string;
  contextDir: string;
  designSystem?: DesignSystemReference;
}) {
  return new Manifest({
    root: agentConfig.sandbox.root,
    entries: {
      output: mount({
        source: workspaceDir,
        readOnly: false,
        mountStrategy: localBindMountStrategy(),
        description: "Writable isolated Artifact directory.",
      }),
      components: localDir({
        src: componentsDir,
        permissions: 0o555,
        description: "Shared read-only UI component reference files.",
      }),
      context: localDir({
        src: contextDir,
        permissions: 0o555,
        description: "Application-managed workflow recovery and verification context.",
      }),
      ...(designSystem
        ? {
            "design-system": localDir({
              src: designSystem.sourceDir,
              permissions: 0o555,
              description: `Optional visual pattern reference: ${designSystem.title}.`,
            }),
          }
        : {}),
    },
    extraPathGrants: [
      {
        path: componentsDir,
        readOnly: true,
        description: "Component documentation source for sandbox materialization.",
      },
      {
        path: contextDir,
        readOnly: true,
        description: "Recovery context source for sandbox materialization.",
      },
      ...(designSystem
        ? [
            {
              path: designSystem.sourceDir,
              readOnly: true,
              description: "Selected design-system reference source.",
            },
          ]
        : []),
      {
        path: paths.skillDir,
        readOnly: true,
        description: "Shared skill bundle.",
      },
    ],
  });
}

function createReadArtifactForEditTool(runState: AgentRunState) {
  return tool({
    name: "read_artifact_for_edit",
    description:
      "Read the current JSX/TSX artifact and acquire a one-attempt digest lease required by apply_patch. Call this immediately before every update or delete patch; any patch attempt or intervening artifact change invalidates the lease.",
    parameters: z.object({
      path: z.string(),
      startLine: z.number().int().positive().optional(),
      endLine: z.number().int().positive().optional(),
    }),
    async execute({ path, startLine, endLine }) {
      assertAgentRunActive(runState);
      return withArtifactMutationToolLock(async () => {
        assertAgentRunActive(runState);
        if (isSiteAgentWorkflowTerminal(runState.workflowState)) {
          return {
            ok: false,
            error: "artifact_edit_workflow_terminal",
            message:
              "This run already reached a terminal workflow state. Start a new run to revise the artifact.",
          };
        }
        let leaseKey: string;
        try {
          leaseKey = toArtifactEditLeaseKey(path, runState.workspaceDir);
        } catch (error) {
          return {
            ok: false,
            error: "artifact_read_path_invalid",
            message: error instanceof Error ? error.message : String(error),
          };
        }
        runState.artifactEditReadLeases.delete(leaseKey);
        if (!/\.[jt]sx$/u.test(leaseKey)) {
          return {
            ok: false,
            error: "artifact_read_not_jsx",
            message: "Edit leases are available only for JSX or TSX artifacts.",
          };
        }

        const hostPath = join(runState.workspaceDir, leaseKey);
        let snapshot: Awaited<ReturnType<typeof readStableArtifactSnapshot>>;
        try {
          snapshot = await readStableArtifactSnapshot(hostPath);
        } catch (error) {
          return {
            ok: false,
            error: "artifact_edit_source_unreadable",
            message: error instanceof Error ? error.message : String(error),
          };
        }
        if (!snapshot) {
          runState.artifactEditReadLeases.delete(leaseKey);
          return {
            ok: false,
            error: "artifact_changed_during_read",
            message:
              "The artifact changed while it was being read. Retry read_artifact_for_edit before patching.",
          };
        }

        const lines = snapshot.source.split(/\r?\n/u);
        const firstLine = startLine ?? 1;
        const lastLine = Math.min(endLine ?? lines.length, lines.length);
        if (firstLine > lastLine || firstLine > lines.length) {
          return {
            ok: false,
            error: "artifact_read_range_invalid",
            lineCount: lines.length,
            message:
              "The requested line range is outside the current artifact.",
          };
        }

        const artifactDigest = sourceDigest(snapshot.source);
        runState.artifactEditReadLeases.set(leaseKey, {
          artifactDigest,
        });
        return {
          ok: true,
          path: `/workspace/output/${leaseKey}`,
          artifactDigest,
          lineCount: lines.length,
          lineRange: { start: firstLine, end: lastLine },
          content: lines.slice(firstLine - 1, lastLine).join("\n"),
          nextAction:
            "Apply one explicit patch against this exact source. Read again before another patch attempt.",
        };
      });
    },
  });
}

async function readStableArtifactSnapshot(hostPath: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const before = await stat(hostPath);
    const source = await readFile(hostPath, "utf8");
    const after = await stat(hostPath);
    if (before.mtimeMs === after.mtimeMs && before.size === after.size) {
      return { source };
    }
  }
  return undefined;
}

function toArtifactEditLeaseKey(path: string, workspaceDir: string) {
  const normalizedPath = normalizeArtifactPath(path);
  return toWorkspaceRelativePath(normalizedPath, workspaceDir);
}

export function getArtifactEditReadLeaseError({
  currentDigest,
  leasedDigest,
}: {
  currentDigest: string;
  leasedDigest?: string;
}) {
  if (!leasedDigest) {
    return "artifact_edit_requires_fresh_read" as const;
  }
  if (leasedDigest !== currentDigest) {
    return "artifact_edit_read_stale" as const;
  }
  return undefined;
}

function createVerifyDirectEditTool(runState: AgentRunState) {
  return tool({
    name: "verify_direct_edit",
    description:
      "Fast canonical gate for one existing Text.content, Button.label, or Image.alt change. The server derives the real PagePatch and refuses layout, style, structural, sibling, or multi-field edits. On success call done with the unchanged path; otherwise use verify_browser_matrix.",
    parameters: z.object({ path: z.string() }),
    async execute({ path: suppliedPath }) {
      assertAgentRunActive(runState);
      const path = normalizeArtifactPath(suppliedPath);
      if (
        !["authoring", "ready_for_review", "ready_for_done"].includes(
          runState.workflowState,
        )
      ) {
        return {
          ok: false,
          error: "direct_verification_not_allowed",
          nextAction:
            "A broader verification or review already requires repair. Complete the verify_browser_matrix and review_candidate route instead of using the direct gate.",
        };
      }

      const sourceArtifact = await registerPreviewArtifact(
        path,
        runState.workspaceDir,
      );
      const [sourceStat, source, staticInspection] = await Promise.all([
        stat(sourceArtifact.hostPath),
        readFile(sourceArtifact.hostPath, "utf8"),
        inspectStaticArtifactCached(runState, path),
      ]);

      if (!staticInspection.ok) {
        return {
          ok: false,
          error: "static_inspection_failed",
          staticInspection: buildStaticInspectionToolResult(staticInspection),
          nextAction:
            "Fix the static JSX issues before retrying direct verification.",
        };
      }

      let delivery: Awaited<ReturnType<typeof projectDeliveryArtifact>>;
      try {
        delivery = await projectDeliveryArtifact({
          path,
          workspaceDir: runState.workspaceDir,
          operation: runState.operation,
          previousPage: runState.previousPage,
          targetToolId: runState.targetToolId,
          targetSectionId: runState.targetSectionId,
        });
      } catch (error) {
        return {
          ok: false,
          error: "delivery_projection_failed",
          issues:
            error instanceof DeliveryProjectionError
              ? error.issues
              : [
                  {
                    code: "delivery_projection_failed",
                    message:
                      error instanceof Error ? error.message : String(error),
                  },
                ],
          nextAction:
            "Repair the candidate so it produces a valid editor PagePatch.",
        };
      }

      if (delivery.modification.kind !== "direct") {
        return {
          ok: false,
          error: "direct_verification_not_applicable",
          modification: delivery.modification,
          nextAction:
            "This candidate is not an atomic content edit. Run verify_browser_matrix for desktop, tablet, and mobile, then call review_candidate.",
        };
      }

      const currentSource = await readFile(sourceArtifact.hostPath, "utf8");
      if (sourceDigest(currentSource) !== sourceDigest(source)) {
        return {
          ok: false,
          error: "direct_candidate_stale",
          nextAction:
            "The JSX changed during direct verification. Retry verify_direct_edit for the current source.",
        };
      }

      updateVerificationState(runState, path, {
        sandboxPath: path,
        hostPath: sourceArtifact.hostPath,
        previewUrl: previewUrlFor(sourceArtifact),
        lastModifiedAt: sourceStat.mtimeMs,
        artifactDigest: sourceDigest(source),
        artifactSource: source,
        lastVerificationFailed: false,
        staticInspection,
      });
      acceptReviewedDelivery(runState, {
        path,
        hostPath: sourceArtifact.hostPath,
        expectedSourceDigest: delivery.sourceDigest,
        canonicalSource: delivery.canonicalSource,
        patch: delivery.patch,
        qualityStatus: "review_skipped",
        message:
          "The atomic content modification passed canonical schema, scope, and round-trip verification.",
        unimplementedRequirements: [],
      });
      runState.lastDoneRejection = undefined;
      runState.pendingRepair = undefined;
      runState.deliveryResult = undefined;
      transitionRunWorkflow(runState, "start_direct_verification");
      transitionRunWorkflow(runState, "candidate_review_accepted");

      return {
        ok: true,
        readyForDone: true,
        modification: delivery.modification,
        artifactDigest: sourceDigest(delivery.canonicalSource),
        qualityStatus: "review_skipped" as const,
        message:
          "Direct edit verified without the full browser matrix. Call done with the unchanged path.",
      };
    },
  });
}

function createReviewCandidateTool(runState: AgentRunState) {
  return tool({
    name: "review_candidate",
    description: runState.reviewerCritiqueEnabled
      ? "Required after verify_browser_matrix for create/composition changes. Project the exact editor delivery, run canonical browser verification, invoke the independent Reviewer, then return readyForDone for the locked candidate. When a user requirement is impossible only because the documented component set or API cannot express it, include up to five unimplementedRequirements with the reason and best alternative; the Reviewer will accept those declarations without verifying them. Omit the field on later retries to retain the current declarations. Local modifications are locked directly by verify_browser_matrix."
      : "Required after verify_browser_matrix for create/composition changes. Project the exact editor delivery, run canonical browser verification, then return readyForDone only for the locked candidate. When a user requirement is impossible only because the documented component set or API cannot express it, include up to five unimplementedRequirements with the reason and best alternative. Omit the field on later retries to retain the current declarations. Local modifications are locked directly by verify_browser_matrix.",
    parameters: z.object({
      path: z.string(),
      unimplementedRequirements: z
        .array(unimplementedRequirementSchema)
        .max(5)
        .optional(),
    }),
    async execute({ path: suppliedPath, unimplementedRequirements }) {
      return reviewCandidate(
        runState,
        suppliedPath,
        unimplementedRequirements,
      );
    },
  });
}

async function reviewCandidate(
  runState: AgentRunState,
  suppliedPath: string,
  unimplementedRequirements?: UnimplementedRequirement[],
) {
      assertAgentRunActive(runState);
      if (unimplementedRequirements !== undefined) {
        runState.unimplementedRequirements = unimplementedRequirements;
      }
      const path = normalizeArtifactPath(suppliedPath);
      const sourceArtifact = await registerPreviewArtifact(
        path,
        runState.workspaceDir,
      );
      const sourceStat = await stat(sourceArtifact.hostPath);
      const source = await readFile(sourceArtifact.hostPath, "utf8");
      const artifactDigest = sourceDigest(source);
      const verifiedState = runState.verificationState.get(path);
      const finalVerificationBlock = getFinalVerificationBlock({
        workflowState: runState.workflowState,
        currentDigest: artifactDigest,
        verifiedDigest: verifiedState?.artifactDigest,
        verificationMode: verifiedState?.browserMatrixInspection?.mode,
        verificationOk: verifiedState?.browserMatrixInspection?.ok,
      });
      if (finalVerificationBlock) {
        monitorLog("final_verification.blocked", {
          path,
          code: finalVerificationBlock,
          workflowState: runState.workflowState,
          currentDigest: artifactDigest,
          verifiedDigest: verifiedState?.artifactDigest,
        });
        return {
          ok: false,
          error: finalVerificationBlock,
          nextAction:
            finalVerificationBlock === "repair_verification_stale"
              ? "The artifact changed after its passing repair verification. Run verify_browser_matrix for all viewports before review_candidate again."
              : "Run verify_browser_matrix and obtain a passing repair verification before review_candidate.",
        };
      }
      transitionRunWorkflow(runState, "start_candidate_verification");
      const sourceInspection = await inspectStaticArtifactCached(
        runState,
        path,
      );

      if (!sourceInspection.ok) {
        return rejectDone(runState, {
          path,
          issues: sourceInspection.issues ?? [],
          staticInspectionOk: false,
        });
      }

      const unchangedArtifactIssue = getArtifactChangeBlock(
        runState,
        path,
        artifactDigest,
      );
      updateVerificationState(runState, path, {
        sandboxPath: path,
        hostPath: sourceArtifact.hostPath,
        lastModifiedAt: sourceStat.mtimeMs,
        artifactDigest,
        artifactSource: source,
        staticInspection: sourceInspection,
      });
      if (unchangedArtifactIssue) {
        return rejectDone(runState, {
          path,
          issues: [unchangedArtifactIssue],
          staticInspectionOk: true,
        });
      }
      let delivery: Awaited<ReturnType<typeof projectDeliveryArtifact>>;

      try {
        delivery = await projectDeliveryArtifact({
          path,
          workspaceDir: runState.workspaceDir,
          operation: runState.operation,
          previousPage: runState.previousPage,
          targetToolId: runState.targetToolId,
          targetSectionId: runState.targetSectionId,
        });
      } catch (error) {
        const issues =
          error instanceof DeliveryProjectionError
            ? error.issues
            : [
                {
                  code: "delivery_projection_failed",
                  message:
                    error instanceof Error ? error.message : String(error),
                },
              ];

        return rejectDone(runState, {
          path,
          issues,
          staticInspectionOk: true,
        });
      }
      const independentReviewRequired =
        runState.reviewerCritiqueEnabled &&
        delivery.modification.requiresIndependentReview;

      const candidateArtifact = await createTemporaryDeliveryArtifact({
        sourceArtifact,
        workspaceDir: runState.workspaceDir,
        sourcePath: path,
        label: "candidate",
        source: delivery.canonicalSource,
      });
      let baselineArtifact: TemporaryDeliveryArtifact | undefined;
      let reviewerBaselineArtifact: TemporaryDeliveryArtifact | undefined;

      try {
        const staticInspection = await inspectStaticArtifactCached(
          runState,
          candidateArtifact.path,
        );
        const fileStat = await stat(candidateArtifact.artifact.hostPath);
        const candidatePreviewUrl = previewUrlFor(candidateArtifact.artifact);
        const staticIssues: Array<Record<string, unknown>> = [
          ...((staticInspection.issues ?? []) as Array<
            Record<string, unknown>
          >),
        ];
        const candidateQualitySnapshot = buildQualitySnapshot(
          delivery.canonicalSource,
        );
        const qualityBaseline =
          runState.originalQualityBaseline ??
          runState.verificationState.get(path)?.qualityBaseline;

        staticIssues.push(
          ...inspectQualityRegression({
            baseline: qualityBaseline,
            candidate: candidateQualitySnapshot,
          }),
        );

        updateVerificationState(runState, path, {
          sandboxPath: path,
          hostPath: sourceArtifact.hostPath,
          previewUrl: candidatePreviewUrl,
          lastModifiedAt: sourceStat.mtimeMs,
          staticInspection,
        });

        if (!staticInspection.ok || staticIssues.length > 0) {
          return rejectDone(runState, {
            path,
            issues: staticIssues,
            staticInspectionOk: staticInspection.ok,
          });
        }

        const baselineCheckpoint =
          runState.bestReviewedArtifact?.path === path
            ? runState.bestReviewedArtifact
            : undefined;
        const visualValidationKey = sourceDigest(
          JSON.stringify({
            schemaVersion: COMPACT_REVIEW_SCHEMA_VERSION,
            reviewerModel: agentConfig.model.reviewerModel,
            candidateDigest: sourceDigest(delivery.canonicalSource),
            baselineDigest: baselineCheckpoint
              ? sourceDigest(baselineCheckpoint.source)
              : null,
            baselineReviewDigest: baselineCheckpoint
              ? sourceDigest(JSON.stringify(baselineCheckpoint.review))
              : null,
            reviewScope: runState.reviewScope ?? { kind: "site" },
            unimplementedRequirements: runState.unimplementedRequirements,
          }),
        );
        const cachedValidation =
          runState.visualValidationCache.get(visualValidationKey);
        let candidateInspection: BrowserMatrixInspection;
        let deliveryInspection: BrowserMatrixInspection;
        let ignoredBaselineIssueCount =
          cachedValidation?.ignoredBaselineIssueCount ?? 0;

        if (cachedValidation) {
          candidateInspection = refreshCachedBrowserInspection(
            cachedValidation.inspection,
            fileStat.mtimeMs,
          );
          deliveryInspection = candidateInspection;
          monitorLog("final_browser_verification.reuse", {
            path,
            visualValidationKey,
            viewports: browserViewportNames,
          });
        } else {
          const finalVisualBudget = inspectBudget(
            runState.finalVisualRuns,
            agentLimits.maxFinalVisualRuns,
          );
          if (independentReviewRequired && !finalVisualBudget.allowed) {
            monitorLog("final_visual.budget_exhausted", finalVisualBudget);
            const budgetIssue = {
              code: "final_visual_budget_exhausted",
              message:
                "The independent visual-review budget is exhausted. The strongest reviewed artifact is returned as a best-effort fallback when available.",
              ...finalVisualBudget,
            };
            const fallback = await stageBestReviewedFallback(runState, {
              path,
              failedIssues: [budgetIssue],
              finalVisualBudget,
            });
            if (fallback) return fallback;
            await restoreBestReviewedArtifact(runState, path);
            return rejectDone(runState, {
              path,
              issues: [budgetIssue],
              staticInspectionOk: true,
            });
          }
          assertAgentRunActive(runState);
          candidateInspection = await runBrowserMatrixVerification({
            path: candidateArtifact.path,
            previewUrl: candidatePreviewUrl,
            artifactModifiedAt: fileStat.mtimeMs,
            mode: "final",
            viewports: browserViewports,
            captureScreenshots: false,
          });
          assertAgentRunActive(runState);
          deliveryInspection = candidateInspection;
        }

        if (
          !cachedValidation &&
          (runState.targetToolId || runState.targetSectionId) &&
          !candidateInspection.ok
        ) {
          baselineArtifact = await createTemporaryDeliveryArtifact({
            sourceArtifact,
            workspaceDir: runState.workspaceDir,
            sourcePath: path,
            label: "baseline",
            source: pageDocumentToJsx(runState.previousPage),
          });
          const baselineStat = await stat(baselineArtifact.artifact.hostPath);
          assertAgentRunActive(runState);
          const baselineInspection = await runBrowserMatrixVerification({
            path: baselineArtifact.path,
            previewUrl: previewUrlFor(baselineArtifact.artifact),
            artifactModifiedAt: baselineStat.mtimeMs,
            mode: "final",
            viewports: browserViewports,
            captureScreenshots: false,
          });
          const candidateLayoutIssues = candidateInspection.blockingIssues
            .filter(isLayoutVerificationIssue)
            .flatMap(toComparableDeliveryIssues);
          const baselineLayoutIssues = baselineInspection.blockingIssues
            .filter(isLayoutVerificationIssue)
            .flatMap(toComparableDeliveryIssues);
          const newLayoutIssues = filterNewDeliveryIssues(
            candidateLayoutIssues,
            baselineLayoutIssues,
          );
          const alwaysBlockingIssues =
            candidateInspection.blockingIssues.filter(
              (issue) => !isLayoutVerificationIssue(issue),
            );
          const blockingIssues = [...alwaysBlockingIssues, ...newLayoutIssues];
          ignoredBaselineIssueCount =
            candidateLayoutIssues.length - newLayoutIssues.length;
          deliveryInspection = {
            ...candidateInspection,
            ok: blockingIssues.length === 0,
            blockingIssues,
            ...(blockingIssues.length === 0 ? { repairFacts: undefined } : {}),
          };

          monitorLog("delivery_baseline.compare", {
            path,
            candidateIssueCount: candidateInspection.blockingIssues.length,
            baselineIssueCount: baselineInspection.blockingIssues.length,
            ignoredBaselineIssueCount,
            newIssueCount: blockingIssues.length,
          });
        }

        if (
          !cachedValidation &&
          !hasBrowserInfrastructureIssue(deliveryInspection)
        ) {
          runState.visualValidationCache.set(visualValidationKey, {
            inspection: deliveryInspection,
            ignoredBaselineIssueCount,
          });
        }

        updateRepairIssueHistory(runState, deliveryInspection);
        updateVerificationState(runState, path, {
          browserMatrixInspection: deliveryInspection,
        });

        if (!deliveryInspection.ok) {
          // A canonical final-matrix failure is a failed candidate gate, not
          // an Excellence-review failure. If this run actually executed the
          // final matrix (rather than reusing cached evidence), start a fresh
          // repair cycle so an edited candidate gets a new reserve. Never do
          // this for static or browser-infrastructure failures.
          const nextRepairRequests = repairRequestsAfterReviewFailure({
            stage: "canonical",
            executed: !cachedValidation,
            infrastructureFailure:
              hasBrowserInfrastructureIssue(deliveryInspection),
            staticInspectionOk: staticInspection.ok,
            issueCount: deliveryInspection.blockingIssues.length,
          });
          if (nextRepairRequests !== undefined) {
            const previousUsed = runState.repairRequests;
            runState.repairRequests = nextRepairRequests;
            monitorLog("repair.budget_refreshed", {
              reason: "canonical_delivery_verification_failed",
              previousUsed,
              limit: agentLimits.maxRepairRequests,
              finalVisualRuns: runState.finalVisualRuns,
            });
          }
          return rejectDone(runState, {
            path,
            issues: deliveryInspection.blockingIssues,
            staticInspectionOk: true,
          });
        }

        let excellenceInfrastructureFailure = false;
        if (independentReviewRequired) {
          transitionRunWorkflow(runState, "start_visual_review");
          let excellenceReview = cachedValidation?.review;
          let excellenceUnavailable:
            | Extract<CompactReviewExecution, { status: "unavailable" }>
            | undefined;
          let executedExcellenceReview = false;
          if (excellenceReview) {
            monitorLog("excellence_review.reuse", {
              path,
              visualValidationKey,
            });
          } else {
            const finalVisualBudget = inspectBudget(
              runState.finalVisualRuns,
              agentLimits.maxFinalVisualRuns,
            );
            if (!finalVisualBudget.allowed) {
              monitorLog("final_visual.budget_exhausted", finalVisualBudget);
              const budgetIssue = {
                code: "final_visual_budget_exhausted",
                message:
                  "The independent visual-review budget is exhausted. The strongest reviewed artifact is returned as a best-effort fallback when available.",
                ...finalVisualBudget,
              };
              const fallback = await stageBestReviewedFallback(runState, {
                path,
                failedIssues: [budgetIssue],
                finalVisualBudget,
              });
              if (fallback) return fallback;
              await restoreBestReviewedArtifact(runState, path);
              return rejectDone(runState, {
                path,
                issues: [budgetIssue],
                staticInspectionOk: true,
              });
            }
            runState.finalVisualRuns += 1;
            executedExcellenceReview = true;
            if (baselineCheckpoint) {
              reviewerBaselineArtifact = await createTemporaryDeliveryArtifact({
                sourceArtifact,
                workspaceDir: runState.workspaceDir,
                sourcePath: path,
                label: "baseline",
                source: baselineCheckpoint.source,
              });
            }
            const reviewExecution = await runIndependentExcellenceReview({
              runState,
              candidate: {
                path: candidateArtifact.path,
                hostPath: candidateArtifact.artifact.hostPath,
                previewUrl: candidatePreviewUrl,
                source: delivery.canonicalSource,
                artifactDigest: sourceDigest(delivery.canonicalSource),
                artifactModifiedAt: fileStat.mtimeMs,
                staticInspectionOk: staticInspection.ok,
                inspection: deliveryInspection,
                unimplementedRequirements: [
                  ...runState.unimplementedRequirements,
                ],
              },
              baseline:
                baselineCheckpoint && reviewerBaselineArtifact
                  ? {
                      path: reviewerBaselineArtifact.path,
                      hostPath: reviewerBaselineArtifact.artifact.hostPath,
                      previewUrl: previewUrlFor(
                        reviewerBaselineArtifact.artifact,
                      ),
                      source: baselineCheckpoint.source,
                      artifactDigest: sourceDigest(baselineCheckpoint.source),
                      artifactModifiedAt: (
                        await stat(reviewerBaselineArtifact.artifact.hostPath)
                      ).mtimeMs,
                      staticInspectionOk: true,
                      inspection: baselineCheckpoint.inspection,
                      review: baselineCheckpoint.review,
                    }
                  : undefined,
            });
            if (reviewExecution.status === "completed") {
              excellenceReview = reviewExecution.review;
            } else {
              excellenceUnavailable = reviewExecution;
              excellenceInfrastructureFailure =
                reviewExecution.kind === "infrastructure";
            }
            if (excellenceInfrastructureFailure) {
              runState.finalVisualRuns = Math.max(
                0,
                runState.finalVisualRuns - 1,
              );
            } else {
              const entry =
                runState.visualValidationCache.get(visualValidationKey);
              if (entry) {
                entry.review = excellenceReview;
              }
            }
          }
          let excellenceIssues: Array<Record<string, unknown>> =
            excellenceReview
              ? getExcellenceReviewIssues(excellenceReview)
              : excellenceUnavailable &&
                  excellenceUnavailable.kind !== "infrastructure"
                ? [
                    {
                      code: excellenceUnavailable.code,
                      category: "visual_quality",
                      severity: "major",
                      requiresRepair: true,
                      message: excellenceUnavailable.evidence,
                      reviewFailureKind: excellenceUnavailable.kind,
                    },
                  ]
                : [];
          const reviewComparison =
            baselineCheckpoint &&
            excellenceReview &&
            sourceDigest(baselineCheckpoint.source) !==
              sourceDigest(delivery.canonicalSource)
              ? compareExcellenceReviewCycle({
                  baselineArtifactDigest: sourceDigest(
                    baselineCheckpoint.source,
                  ),
                  baseline: baselineCheckpoint.review,
                  candidateArtifactDigest: sourceDigest(
                    delivery.canonicalSource,
                  ),
                  candidate: excellenceReview,
                })
              : undefined;
          const rollbackToBaseline = reviewComparison
            ? shouldRollbackExcellenceCandidate({
                baseline: baselineCheckpoint!.review,
                candidate: excellenceReview!,
                comparison: reviewComparison,
              })
            : false;

          if (reviewComparison && baselineCheckpoint) {
            const baselinePreservation = buildExcellencePreservationContract(
              baselineCheckpoint.review,
            );
            excellenceIssues = excellenceIssues.map((issue) => ({
              ...issue,
              comparison: reviewComparison,
              mustPreserve: baselinePreservation,
            }));
          }

          if (rollbackToBaseline && baselineCheckpoint) {
            await restoreBestReviewedArtifact(runState, path);
            excellenceIssues = [
              ...getExcellenceReviewIssues(baselineCheckpoint.review).map(
                (issue) => ({
                  ...issue,
                  artifactRole: "restored_baseline",
                  artifactDigest: sourceDigest(baselineCheckpoint.source),
                }),
              ),
              {
                code: "quality_review_regression",
                category: "visual_quality",
                severity: "major",
                requiresRepair: true,
                message:
                  "The candidate did not improve the best reviewed artifact and was rolled back. Continue from the restored baseline and preserve its passing dimensions.",
                comparison: reviewComparison,
                mustPreserve: buildExcellencePreservationContract(
                  baselineCheckpoint.review,
                ),
                artifactRole: "candidate",
                artifactDigest: sourceDigest(delivery.canonicalSource),
              },
            ];
            monitorLog("excellence_review.candidate_rolled_back", {
              path,
              comparison: reviewComparison,
            });
          }

          if (excellenceReview && !rollbackToBaseline) {
            rememberBestReviewedArtifact(
              runState,
              {
                path,
                hostPath: sourceArtifact.hostPath,
                source: delivery.canonicalSource,
                patch: delivery.patch,
                review: excellenceReview,
                inspection: deliveryInspection,
                unimplementedRequirements: [
                  ...runState.unimplementedRequirements,
                ],
              },
              Boolean(reviewComparison?.resolvedFindingIds.length),
            );
            excellenceIssues = excellenceIssues.map((issue) => ({
              ...issue,
              artifactRole: "candidate",
              artifactDigest: sourceDigest(delivery.canonicalSource),
            }));
          }

          monitorLog(
            "excellence_review.end",
            excellenceReview
              ? {
                  path,
                  ...buildExcellenceReviewReport({
                    // After rollback, the top-level report is deliberately
                    // about the artifact that is actually active on disk.
                    // Candidate results remain nested audit context only.
                    review:
                      rollbackToBaseline && baselineCheckpoint
                        ? baselineCheckpoint.review
                        : excellenceReview,
                    candidateReview:
                      rollbackToBaseline && baselineCheckpoint
                        ? excellenceReview
                        : undefined,
                    comparison: reviewComparison,
                    rollbackToBaseline,
                    issues: excellenceIssues,
                    activeArtifact: {
                      role:
                        rollbackToBaseline && baselineCheckpoint
                          ? "restored_baseline"
                          : "candidate",
                      digest:
                        rollbackToBaseline && baselineCheckpoint
                          ? sourceDigest(baselineCheckpoint.source)
                          : sourceDigest(delivery.canonicalSource),
                    },
                  }),
                }
              : {
                  path,
                  status: "unavailable",
                  kind: excellenceUnavailable?.kind,
                  code: excellenceUnavailable?.code,
                  evidence: excellenceUnavailable?.evidence,
                },
          );

          if (excellenceInfrastructureFailure) {
            monitorLog("excellence_review.infrastructure_bypassed", {
              path,
              kind: excellenceUnavailable?.kind,
              code: excellenceUnavailable?.code,
              evidence: excellenceUnavailable?.evidence,
            });
          }

          if (
            shouldRejectExcellenceReview({
              infrastructureFailure: excellenceInfrastructureFailure,
              issueCount: excellenceIssues.length,
            })
          ) {
            const remainingFinalVisualBudget = inspectBudget(
              runState.finalVisualRuns,
              agentLimits.maxFinalVisualRuns,
            );
            const terminalReviewFailure =
              shouldTerminallyRejectFailedVisualReview({
                infrastructureFailure: excellenceInfrastructureFailure,
                finalVisualRuns: runState.finalVisualRuns,
                maxFinalVisualRuns: agentLimits.maxFinalVisualRuns,
              });
            if (!terminalReviewFailure) {
              const previousUsed = runState.repairRequests;
              const nextRepairRequests = repairRequestsAfterReviewFailure({
                stage: "excellence",
                executed: executedExcellenceReview,
                infrastructureFailure: excellenceInfrastructureFailure,
                staticInspectionOk: true,
                issueCount: excellenceIssues.length,
              });
              if (nextRepairRequests !== undefined) {
                // Start a fresh repair cycle. In particular, do not carry the
                // previous cycle's consumed final-verification reserve into
                // the candidate produced after this review rejection.
                runState.repairRequests = nextRepairRequests;
                monitorLog("repair.budget_refreshed", {
                  reason: "excellence_review_failed",
                  previousUsed,
                  limit: agentLimits.maxRepairRequests,
                  finalVisualRuns: runState.finalVisualRuns,
                });
              }
            }
            if (terminalReviewFailure) {
              monitorLog("final_visual.last_attempt_failed", {
                ...remainingFinalVisualBudget,
                issueCount: excellenceIssues.length,
              });
              const fallback = await stageBestReviewedFallback(runState, {
                path,
                failedIssues: excellenceIssues,
                finalVisualBudget: remainingFinalVisualBudget,
              });
              if (fallback) return fallback;
            }
            return rejectDone(runState, {
              path,
              issues: terminalReviewFailure
                ? [
                    ...excellenceIssues,
                    {
                      code: "final_visual_budget_exhausted",
                      message:
                        "The last independent visual-review attempt failed, so delivery is terminally rejected.",
                      ...remainingFinalVisualBudget,
                    },
                  ]
                : excellenceIssues,
              staticInspectionOk: true,
            });
          }
        } else {
          monitorLog("excellence_review.skipped", {
            path,
            reason: runState.reviewerCritiqueEnabled
              ? `modification_${delivery.modification.kind}`
              : "reviewer_critique_disabled",
          });
        }

        const verifiedFileStat = await stat(
          candidateArtifact.artifact.hostPath,
        );
        if (verifiedFileStat.mtimeMs !== fileStat.mtimeMs) {
          return rejectDone(runState, {
            path,
            issues: [
              {
                code: "delivery_changed_during_final_verification",
                message:
                  "The canonical delivery artifact changed during review. Rerun repair verification and review_candidate.",
              },
            ],
            staticInspectionOk: true,
          });
        }

        const [currentSourceStat, currentSource] = await Promise.all([
          stat(sourceArtifact.hostPath),
          readFile(sourceArtifact.hostPath, "utf8"),
        ]);
        if (
          currentSourceStat.mtimeMs !== sourceStat.mtimeMs ||
          sourceDigest(currentSource) !== delivery.sourceDigest
        ) {
          return rejectDone(runState, {
            path,
            issues: [
              {
                code: "delivery_changed_during_final_verification",
                message:
                  "The source JSX changed while its temporary canonical delivery was being reviewed. Rerun repair verification and review_candidate again.",
              },
            ],
            staticInspectionOk: true,
          });
        }

        const qualityStatus = !independentReviewRequired
          ? "review_skipped"
          : excellenceInfrastructureFailure
            ? "review_unavailable"
            : "passed";
        const message = excellenceInfrastructureFailure
          ? "The candidate passed canonical browser verification. Independent Excellence review infrastructure was unavailable, so it is ready for done without a visual-review verdict."
          : ignoredBaselineIssueCount > 0
            ? `The candidate introduced no new browser blockers; ${ignoredBaselineIssueCount} pre-existing baseline issue(s) were excluded. It is ready for done.`
            : independentReviewRequired
              ? "The candidate passed canonical verification and is ready for done."
              : `The ${delivery.modification.kind} modification passed deterministic canonical verification and is ready for done without independent visual review.`;

        acceptReviewedDelivery(runState, {
          path,
          hostPath: sourceArtifact.hostPath,
          expectedSourceDigest: delivery.sourceDigest,
          canonicalSource: delivery.canonicalSource,
          patch: delivery.patch,
          qualityStatus,
          message,
          unimplementedRequirements: [...runState.unimplementedRequirements],
        });
        runState.viewportRepairContract = undefined;
        runState.lastDoneRejection = undefined;
        runState.pendingRepair = undefined;
        runState.deliveryResult = undefined;
        transitionRunWorkflow(runState, "candidate_review_accepted");

        return {
          ok: true,
          readyForDone: true,
          artifactDigest: sourceDigest(delivery.canonicalSource),
          qualityStatus,
          message,
        };
      } finally {
        await reviewerBaselineArtifact?.cleanup();
        await baselineArtifact?.cleanup();
        await candidateArtifact.cleanup();
      }
}

function createDoneTool(runState: AgentRunState) {
  return tool({
    name: "done",
    description:
      "Commit the exact candidate accepted by verify_direct_edit or review_candidate. The source digest must be unchanged; done performs no new review.",
    parameters: z.object({ path: z.string() }),
    async execute({ path: suppliedPath }) {
      return commitReviewedDelivery(runState, suppliedPath);
    },
  });
}

async function commitReviewedDelivery(
  runState: AgentRunState,
  suppliedPath: string,
) {
  assertAgentRunActive(runState);
  const path = normalizeArtifactPath(suppliedPath);
  const checkpoint = runState.reviewedDelivery;
  const commitBlock = getReviewedDeliveryCommitBlock({
    workflowState: runState.workflowState,
    checkpointPath: checkpoint?.path,
    suppliedPath: path,
    activeEditLeaseCount: runState.artifactEditReadLeases.size,
  });
  if (commitBlock || !checkpoint) {
    const reason = commitBlock ?? "candidate_review_required";
    monitorLog("delivery_commit.blocked", {
      path,
      reason,
      workflowState: runState.workflowState,
      checkpointPath: checkpoint?.path,
      activeEditLeaseCount: runState.artifactEditReadLeases.size,
    });
    return {
      ok: false as const,
      error: reason,
      nextAction:
        reason === "artifact_edit_lease_active"
          ? "An edit lease was acquired after the candidate was accepted. Rerun the verification route to lock the current artifact before delivery commit."
          : reason === "candidate_path_mismatch"
            ? `Call done with the accepted candidate path: ${checkpoint?.path}.`
            : "Rerun the verification route required by the current change shape before delivery commit.",
    };
  }
  const currentSource = await readFile(checkpoint.hostPath, "utf8");
  if (sourceDigest(currentSource) !== checkpoint.expectedSourceDigest) {
    invalidateReviewedDeliveryForRepair(runState, {
      path,
      message:
        "The artifact changed after its canonical gate. Rerun the verification route required by the current change shape before done.",
    });
    return {
      ok: false as const,
      error: "reviewed_candidate_stale",
      nextAction:
        "The artifact changed after its canonical gate. Rerun verification before delivery commit.",
    };
  }
  transitionRunWorkflow(runState, "start_delivery_commit");
  const deliveredFileStat = await withDeliveryCommitLock(
    checkpoint.hostPath,
    async () => {
      const source = await readFile(checkpoint.hostPath, "utf8");
      if (sourceDigest(source) !== checkpoint.expectedSourceDigest) return null;
      await writeFile(checkpoint.hostPath, checkpoint.canonicalSource, "utf8");
      return stat(checkpoint.hostPath);
    },
  );
  if (!deliveredFileStat) {
    invalidateReviewedDeliveryForRepair(runState, {
      path,
      message:
        "The artifact changed during delivery commit. Rerun the verification route required by the current change shape.",
    });
    return {
      ok: false as const,
      error: "reviewed_candidate_stale",
      nextAction: "The artifact changed during delivery commit. Rerun verification.",
    };
  }
  const artifact = await registerPreviewArtifact(path, runState.workspaceDir);
  const previewUrl = previewUrlFor(artifact);
  runState.finalPath = path;
  runState.lastDoneRejection = undefined;
  runState.pendingRepair = undefined;
  runState.deliveryResult = {
    artifactPath: path,
    artifactModifiedAt: deliveredFileStat.mtimeMs,
    artifactDigest: sourceDigest(checkpoint.canonicalSource),
    previewUrl,
    patch: checkpoint.patch,
    qualityStatus: checkpoint.qualityStatus,
    unimplementedRequirements: [...checkpoint.unimplementedRequirements],
  };
  runState.reviewedDelivery = undefined;
  transitionRunWorkflow(
    runState,
    checkpoint.qualityStatus === "best_effort"
      ? "fallback_delivery_committed"
      : "delivery_accepted",
  );
  return {
    ok: true as const,
    qualityStatus: checkpoint.qualityStatus,
    message: checkpoint.message,
    previewUrl,
  };
}

function invalidateReviewedDeliveryForRepair(
  runState: AgentRunState,
  { path, message }: { path: string; message: string },
) {
  runState.finalPath = "";
  runState.reviewedDelivery = undefined;
  runState.deliveryResult = undefined;
  runState.lastDoneRejection = undefined;
  runState.pendingRepair = {
    path,
    source: "review_candidate",
    message,
  };
  transitionRunWorkflow(runState, "delivery_failed_repairable");
}

type TemporaryDeliveryArtifact = {
  path: string;
  artifact: PreviewArtifact;
  cleanup: () => Promise<void>;
};

async function createTemporaryDeliveryArtifact({
  sourceArtifact,
  workspaceDir,
  sourcePath,
  label,
  source,
}: {
  sourceArtifact: PreviewArtifact;
  workspaceDir: string;
  sourcePath: string;
  label: "candidate" | "baseline";
  source: string;
}): Promise<TemporaryDeliveryArtifact> {
  temporaryDeliveryArtifactCounter += 1;
  const suffix = `${label}-${process.pid}-${Date.now()}-${temporaryDeliveryArtifactCounter}.jsx`;
  const path = `${sourcePath}.${suffix}`;
  const hostPath = `${sourceArtifact.hostPath}.${suffix}`;
  await writeFile(hostPath, source, "utf8");
  let artifact: PreviewArtifact;

  try {
    artifact = await registerPreviewArtifact(path, workspaceDir);
  } catch (error) {
    await unlink(hostPath).catch(() => undefined);
    throw error;
  }

  return {
    path,
    artifact,
    async cleanup() {
      await unregisterPreviewArtifact(path);
      await unlink(hostPath).catch(() => undefined);
    },
  };
}

function previewUrlFor(artifact: PreviewArtifact) {
  return new URL(
    `/preview-artifacts/${artifact.id}`,
    previewBaseUrl,
  ).toString();
}

function isLayoutVerificationIssue(issue: Record<string, unknown>) {
  return getStringProperty(issue, "code")?.startsWith("layout_") === true;
}

function rememberBestReviewedArtifact(
  runState: AgentRunState,
  candidate: ReviewedArtifactCheckpoint,
  force = false,
) {
  const previous = runState.bestReviewedArtifact;
  if (
    !force &&
    previous &&
    compareExcellenceReviews(candidate.review, previous.review) <= 0
  ) {
    return;
  }

  runState.bestReviewedArtifact = candidate;
  monitorLog("final_visual.best_artifact_updated", {
    path: candidate.path,
    ratings: compactReviewRatings(candidate.review),
    findingCount: candidate.review.findings.length,
  });
}

async function restoreBestReviewedArtifact(
  runState: AgentRunState,
  path: string,
) {
  const checkpoint = runState.bestReviewedArtifact;
  if (!checkpoint || checkpoint.path !== path) return false;
  runState.unimplementedRequirements = [
    ...checkpoint.unimplementedRequirements,
  ];

  const currentSource = await readFile(checkpoint.hostPath, "utf8");
  if (currentSource === checkpoint.source) return false;

  await writeFile(checkpoint.hostPath, checkpoint.source, "utf8");
  monitorLog("final_visual.best_artifact_restored", {
    path,
    ratings: compactReviewRatings(checkpoint.review),
    findingCount: checkpoint.review.findings.length,
  });
  return true;
}

async function stageBestReviewedFallback(
  runState: AgentRunState,
  {
    path,
    failedIssues,
    finalVisualBudget,
  }: {
    path: string;
    failedIssues: unknown[];
    finalVisualBudget: ReturnType<typeof inspectBudget>;
  },
) {
  const checkpoint = runState.bestReviewedArtifact;
  if (!checkpoint || checkpoint.path !== path) return undefined;

  const failedArtifactDigest = sourceDigest(
    await readFile(checkpoint.hostPath, "utf8"),
  );
  await writeFile(checkpoint.hostPath, checkpoint.source, "utf8");
  const structuredIssues = structureVerificationIssues({
    issues: compactVerificationIssues(failedIssues).map((issue) => {
      const record = asRecord(issue) ?? {};
      return {
        ...record,
        artifactRole:
          typeof record.artifactRole === "string"
            ? record.artifactRole
            : "candidate",
        artifactDigest:
          typeof record.artifactDigest === "string"
            ? record.artifactDigest
            : failedArtifactDigest,
      };
    }),
    history: runState.verificationIssueHistory,
    relatedHistory: runState.repairIssueHistory,
    artifactDigest: sourceDigest(checkpoint.source),
  });

  acceptReviewedDelivery(runState, {
    path,
    hostPath: checkpoint.hostPath,
    expectedSourceDigest: sourceDigest(checkpoint.source),
    canonicalSource: checkpoint.source,
    patch: checkpoint.patch,
    qualityStatus: "best_effort",
    message:
      "The strongest reviewed artifact is being delivered as a best-effort fallback; it did not pass the visual quality gate.",
    unimplementedRequirements: [...checkpoint.unimplementedRequirements],
  });
  runState.finalPath = "";
  runState.lastDoneRejection = undefined;
  runState.pendingRepair = undefined;
  runState.deliveryResult = undefined;
  transitionRunWorkflow(runState, "candidate_review_accepted");
  monitorLog("final_visual.best_artifact_staged", {
    path,
    artifactDigest: sourceDigest(checkpoint.source),
    finalVisualBudget,
    ratings: compactReviewRatings(checkpoint.review),
    findingCount: checkpoint.review.findings.length,
  });

  return {
    ok: true,
    readyForDone: true,
    fallback: true,
    qualityStatus: "best_effort",
    message:
      "The final visual-review attempt failed. The strongest previously reviewed artifact was restored and locked as a best-effort candidate. Call done once to commit it.",
    verificationReport: buildFallbackTerminalVerificationReport({
      restoredArtifactDigest: sourceDigest(checkpoint.source),
      outstandingIssues: structuredIssues,
      ratings: compactReviewRatings(checkpoint.review),
      findingCount: checkpoint.review.findings.length,
    }),
  };
}

export function buildFallbackTerminalVerificationReport({
  restoredArtifactDigest,
  outstandingIssues,
  ratings,
  findingCount,
}: {
  restoredArtifactDigest: string;
  outstandingIssues: StructuredVerificationIssue[];
  ratings: Record<string, unknown>;
  findingCount: number;
}) {
  const issueCodes = [...new Set(outstandingIssues.map((issue) => issue.code))];
  const artifacts = [
    ...new Map(
      outstandingIssues.flatMap((issue) => {
        const role =
          typeof issue.artifactRole === "string"
            ? issue.artifactRole
            : undefined;
        const digest =
          typeof issue.artifactDigest === "string"
            ? issue.artifactDigest
            : undefined;
        return role && digest
          ? [[`${role}:${digest}`, { role, digest }] as const]
          : [];
      }),
    ).values(),
  ];
  return {
    activeArtifact: {
      role: "restored_baseline",
      digest: restoredArtifactDigest,
    },
    repairAllowed: false,
    terminalAction: "commit_restored_baseline",
    reason: "final_visual_budget_exhausted",
    outstandingIssueSummary: {
      auditOnly: true,
      count: outstandingIssues.length,
      codes: issueCodes,
      artifacts,
    },
    fallbackReview: { ratings, findingCount },
  };
}

function compactReviewRatings(review: ExcellenceReview) {
  return Object.fromEntries(
    Object.entries(review.dimensions).map(([dimension, assessment]) => [
      dimension,
      assessment.rating,
    ]),
  );
}

function rejectDone(
  runState: AgentRunState,
  {
    path,
    issues,
    staticInspectionOk,
  }: {
    path: string;
    issues: unknown[];
    staticInspectionOk: boolean;
  },
) {
  const missing: string[] = [];
  const staleChecks: string[] = [];
  const artifactDigest = runState.verificationState.get(path)?.artifactDigest;
  const structuredIssues = structureVerificationIssues({
    issues: compactVerificationIssues(issues),
    history: runState.verificationIssueHistory,
    relatedHistory: runState.repairIssueHistory,
    artifactDigest,
  });
  const terminal = structuredIssues.some((issue) =>
    isTerminalDoneIssueCode(getIssueCode(issue)),
  );
  const rejectionError = getCandidateRejectionError({
    terminal,
    issues: structuredIssues,
  });
  const qualityGateFailed = rejectionError === "quality_gate_failed";
  if (qualityGateFailed) {
    const baseline =
      runState.bestReviewedArtifact?.path === path
        ? runState.bestReviewedArtifact
        : undefined;
    const contract = baseline
      ? buildViewportRepairContract({
          path,
          baselineSource: baseline.source,
          issues: structuredIssues,
        })
      : undefined;
    runState.viewportRepairContract = contract
      ? { ...contract, baselineInspection: baseline!.inspection }
      : undefined;
    monitorLog("viewport_repair.contract", {
      path,
      active: Boolean(contract),
      affectedViewports: contract?.affectedViewports,
      protectedViewports: contract?.protectedViewports,
    });
  }
  const requiresArtifactChange = structuredIssues.some(
    issueRequiresArtifactChange,
  );
  if (runState.verificationState.has(path)) {
    updateVerificationState(runState, path, {
      lastVerificationFailed: requiresArtifactChange,
    });
  }
  const verificationReport = buildVerificationReport({
    missing,
    issues: structuredIssues,
    staleChecks,
    staticInspectionOk,
    state: runState.verificationState.get(path),
    finalVisualBudget: runState.reviewerCritiqueEnabled
      ? inspectBudget(runState.finalVisualRuns, agentLimits.maxFinalVisualRuns)
      : undefined,
  });
  const rejection: DoneRejection = {
    path,
    missing,
    issues: structuredIssues,
    verificationReport,
    message: terminal
      ? "The independent visual-review budget is exhausted without a passing verdict or a committable fallback. The run is terminally rejected; do not edit or retry verification in this run."
      : qualityGateFailed
        ? "The deterministic candidate is valid, but the independent quality gate failed. Repair only the consolidated quality plan, rerun browser verification, then call review_candidate again."
        : "The projected editor delivery failed candidate verification. Fix the report actions, rerun repair verification, then call review_candidate again.",
    terminal,
  };

  runState.finalPath = "";
  runState.reviewedDelivery = undefined;
  runState.deliveryResult = undefined;
  runState.lastDoneRejection = rejection;
  if (!terminal) {
    runState.pendingRepair = {
      path,
      source: "review_candidate",
      message: rejection.message,
      verificationReport,
    };
  } else {
    runState.pendingRepair = undefined;
  }
  transitionRunWorkflow(
    runState,
    terminal ? "delivery_failed_terminal" : "delivery_failed_repairable",
  );

  return {
    ok: false,
    status: terminal
      ? ("terminal_rejected" as const)
      : ("repair_required" as const),
    error: rejectionError,
    failedStage: qualityGateFailed ? ("quality" as const) : undefined,
    terminal,
    verificationReport,
  };
}

export function getCandidateRejectionError({
  terminal,
  issues,
}: {
  terminal: boolean;
  issues: unknown[];
}) {
  if (terminal) return "final_visual_budget_exhausted" as const;
  const qualityGateFailed = issues.some((issue) => {
    const code = normalizeInternalIssueCode(getIssueCode(issue) ?? "");
    return code.startsWith("excellence_") || code.startsWith("quality_");
  });
  return qualityGateFailed
    ? ("quality_gate_failed" as const)
    : ("candidate_verification_failed" as const);
}

async function projectDeliveryArtifact({
  path,
  workspaceDir,
  operation,
  previousPage,
  targetToolId,
  targetSectionId,
}: {
  path: string;
  workspaceDir: string;
  operation: DesignOperation;
  previousPage: PageDocument;
  targetToolId?: string;
  targetSectionId?: string;
}) {
  const artifact = await registerPreviewArtifact(path, workspaceDir);
  const source = await readFile(artifact.hostPath, "utf8");
  const nextPage = jsxToPageDocument(source, { previousPage });
  const idConflicts = findDuplicatePageDocumentIds(nextPage);

  if (
    idConflicts.duplicateSectionIds.length > 0 ||
    idConflicts.duplicateToolIds.length > 0 ||
    idConflicts.duplicateOverlayIds.length > 0
  ) {
    throw new DeliveryProjectionError([
      {
        code: "delivery_duplicate_editor_ids",
        message: `Canonical delivery requires globally unique editor ids. Duplicate Sections: ${idConflicts.duplicateSectionIds.join(", ") || "none"}; duplicate Tools: ${idConflicts.duplicateToolIds.join(", ") || "none"}; duplicate Overlays: ${idConflicts.duplicateOverlayIds.join(", ") || "none"}.`,
      },
    ]);
  }
  let patch: PagePatch;

  if (operation === "create") {
    patch = pagePatchSchema.parse([{ op: "replacePage", page: nextPage }]);
  } else if (targetToolId !== undefined) {
    const targetSection = previousPage.sections.find((section) =>
      section.tools.some((tool) => tool.id === targetToolId),
    );

    if (!targetSection) {
      throw new DeliveryProjectionError([
        {
          code: "selection_target_not_found",
          message: `Selected tool ${targetToolId} was not found in the current PageDocument.`,
        },
      ]);
    }

    patch = pagePatchSchema.parse(
      filterPatchByTargetTool(diffPageDocuments(previousPage, nextPage), {
        targetToolId,
        targetSectionId: targetSection.id,
        targetSectionToolIds: new Set(
          targetSection.tools.map((tool) => tool.id),
        ),
      }) as PagePatch,
    );
  } else if (targetSectionId !== undefined) {
    const targetSection = previousPage.sections.find(
      (section) => section.id === targetSectionId,
    );
    if (!targetSection) {
      throw new DeliveryProjectionError([
        {
          code: "section_target_not_found",
          message: `Selected section ${targetSectionId} was not found in the current PageDocument.`,
        },
      ]);
    }

    patch = pagePatchSchema.parse(
      filterPatchByTargetSection(diffPageDocuments(previousPage, nextPage), {
        targetSectionId,
        targetSectionToolIds: new Set(
          targetSection.tools.map((tool) => tool.id),
        ),
        existingToolIds: new Set(
          previousPage.sections.flatMap((section) =>
            section.tools.map((tool) => tool.id),
          ),
        ),
      }) as PagePatch,
    );
  } else {
    patch = pagePatchSchema.parse(
      diffPageDocuments(previousPage, nextPage) as PagePatch,
    );
  }

  if (
    (targetToolId !== undefined || targetSectionId !== undefined) &&
    patch.length === 0
  ) {
    throw new DeliveryProjectionError([
      {
        code: targetToolId ? "selection_patch_empty" : "section_patch_empty",
        message: targetToolId
          ? `The generated artifact does not produce an applicable change for selected tool ${targetToolId}. Preserve its editor id and revise that tool directly.`
          : `The generated artifact does not produce an applicable change inside selected section ${targetSectionId}. Preserve its editor id and revise only that Section.`,
      },
    ]);
  }

  if (operation === "modify" && patch.length === 0) {
    throw new DeliveryProjectionError([
      {
        code: "delivery_patch_empty",
        message:
          "The generated artifact does not change the current PageDocument.",
      },
    ]);
  }

  let deliveredPage: PageDocument;

  try {
    deliveredPage = applyDeliveryPatch(previousPage, patch);
  } catch (error) {
    throw new DeliveryProjectionError([
      {
        code: "delivery_patch_application_failed",
        message: error instanceof Error ? error.message : String(error),
      },
    ]);
  }

  if (
    operation === "modify" &&
    targetToolId === undefined &&
    targetSectionId === undefined &&
    !arePageDocumentsSemanticallyEqual(deliveredPage, nextPage)
  ) {
    patch = pagePatchSchema.parse([{ op: "replacePage", page: nextPage }]);
    deliveredPage = nextPage;
  }

  const modification = analyzeModification({
    operation,
    previousPage,
    nextPage: deliveredPage,
    patch,
    targetToolId,
  });

  const canonicalSource = pageDocumentToJsx(deliveredPage);
  const roundTrippedPage = jsxToPageDocument(canonicalSource, {
    previousPage: deliveredPage,
  });

  if (!arePageDocumentsSemanticallyEqual(deliveredPage, roundTrippedPage)) {
    throw new DeliveryProjectionError([
      {
        code: "delivery_round_trip_mismatch",
        message:
          "The projected PageDocument changed during canonical JSX serialization. The delivery was blocked before returning a divergent patch.",
      },
    ]);
  }

  return {
    patch,
    canonicalSource,
    sourceDigest: sourceDigest(source),
    modification,
  };
}

function sourceDigest(source: string) {
  return createHash("sha256").update(source).digest("hex");
}

async function withDeliveryCommitLock<T>(
  path: string,
  action: () => Promise<T>,
) {
  const prior = deliveryCommitQueues.get(path) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = prior.then(() => current);
  deliveryCommitQueues.set(path, queued);

  await prior;
  try {
    return await action();
  } finally {
    release();
    if (deliveryCommitQueues.get(path) === queued) {
      deliveryCommitQueues.delete(path);
    }
  }
}

class DeliveryProjectionError extends Error {
  readonly issues: Array<Record<string, unknown>>;

  constructor(issues: Array<Record<string, unknown>>) {
    super(
      "The generated artifact could not be projected into editor delivery.",
    );
    this.name = "DeliveryProjectionError";
    this.issues = issues;
  }
}

type ExcellenceReviewArtifact = {
  path: string;
  hostPath: string;
  previewUrl: string;
  source: string;
  artifactDigest: string;
  artifactModifiedAt: number;
  staticInspectionOk: boolean;
  inspection: BrowserMatrixInspection;
  review?: ExcellenceReview;
  unimplementedRequirements?: UnimplementedRequirement[];
};

async function runIndependentExcellenceReview({
  runState,
  candidate,
  baseline,
}: {
  runState: AgentRunState;
  candidate: ExcellenceReviewArtifact;
  baseline?: ExcellenceReviewArtifact;
}): Promise<CompactReviewExecution> {
  return siteRuntimeResources.pageReviewer.use(() =>
    runIndependentExcellenceReviewWithPermit({ runState, candidate, baseline }),
  );
}

async function runIndependentExcellenceReviewWithPermit({
  runState,
  candidate,
  baseline,
}: {
  runState: AgentRunState;
  candidate: ExcellenceReviewArtifact;
  baseline?: ExcellenceReviewArtifact;
}): Promise<CompactReviewExecution> {
  const eligibilityIssue = getReviewerEligibilityIssue(candidate);
  if (eligibilityIssue) {
    return unavailableCompactReview(
      "evidence",
      "excellence_review_prerequisite_failed",
      eligibilityIssue,
    );
  }

  monitorLog("excellence_reviewer_agent.start", {
    verificationRunId: buildReviewerVerificationRunId(candidate),
    candidateDigest: candidate.artifactDigest,
    baselineDigest: baseline?.artifactDigest,
  });

  try {
    const { openAIClient, runner } = await getAgentRuntime();
    const designSystemReference = runState.designSystem
      ? buildDesignSystemReferencePrompt(
          await readDesignSystemReference(runState.designSystem),
        )
      : undefined;
    let result: Awaited<ReturnType<typeof runReviewerAgent>> | undefined;
    for (
      let executionAttempt = 0;
      executionAttempt < agentConfig.review.maxExecutionAttempts;
      executionAttempt += 1
    ) {
      try {
        assertAgentRunActive(runState);
        result = await runReviewerAgent({
          verificationRunId: buildReviewerVerificationRunId(candidate),
          userRequest: runState.userRequest,
          designSystemReference,
          candidate: toReviewerArtifactReference(candidate),
          baseline: baseline
            ? toReviewerArtifactReference(baseline)
            : undefined,
          reviewScope: runState.reviewScope,
          unimplementedRequirements: runState.unimplementedRequirements,
          evidenceProvider: createReviewerEvidenceProvider({
            candidate,
            baseline,
          }),
          runner,
          signal: runState.signal,
          onModelEvent: (event) => runState.tokenUsage.addFromEvent(event),
          onLog: monitorLog,
        });
        assertAgentRunActive(runState);
        break;
      } catch (error) {
        assertAgentRunActive(runState);
        monitorLog("excellence_reviewer_agent.attempt_failed", {
          executionAttempt: executionAttempt + 1,
          maxExecutionAttempts: agentConfig.review.maxExecutionAttempts,
          error,
        });
        if (executionAttempt + 1 >= agentConfig.review.maxExecutionAttempts) {
          throw error;
        }
      }
    }
    if (!result) {
      throw new ReviewerEvidenceError(
        "excellence_review_unavailable",
        "Reviewer Agent exhausted its execution attempts without a result.",
      );
    }

    monitorLog("excellence_reviewer_agent.end", {
      capturedTargets: result.capturedTargets,
      toolCallCount: result.toolCallCount,
      screenshotCount: result.screenshotCount,
    });

    let normalized = normalizeExcellenceReview(result.review);
    if (normalized.normalizations.length > 0) {
      monitorLog(
        "excellence_review.strategy_normalized",
        normalized.normalizations,
      );
    }

    let semanticIssues = [
      ...getExcellenceReviewSemanticIssues(normalized.review),
      ...getExcellenceReviewScopeIssues(
        normalized.review,
        runState.reviewScope,
      ),
    ];
    for (
      let correctionAttempt = 0;
      semanticIssues.length > 0 &&
      correctionAttempt < agentConfig.review.maxSemanticCorrectionAttempts;
      correctionAttempt += 1
    ) {
      monitorLog("excellence_review.semantic_correction", {
        correctionAttempt: correctionAttempt + 1,
        semanticIssues,
      });
      const correction = await openAIClient.responses.parse(
        {
          model: agentConfig.model.reviewerModel,
          store: agentConfig.model.storeResponses,
          instructions:
            "Correct only the structural, semantic, and authorized-scope inconsistencies listed by the caller. Preserve supported in-scope gates, anchored ratings, visible evidence, targets, comparison, and language. Remove findings that target immutable regions or whose only basis is an authoritative Designer-declared unimplemented requirement. Do not verify those declarations. Change a gate, rating, or verdict only when required after removing excluded findings. Do not add unsupported findings.",
          input: JSON.stringify({
            review: normalized.review,
            semanticIssues,
            unimplementedRequirements: runState.unimplementedRequirements,
          }),
          text: {
            format: zodTextFormat(
              excellenceReviewerOutputSchema,
              "excellence_review",
            ),
            verbosity: "low",
          },
        },
        { signal: runState.signal },
      );
      assertAgentRunActive(runState);
      runState.tokenUsage.addFromEvent(correction);
      if (!correction.output_parsed) break;
      normalized = normalizeExcellenceReview(correction.output_parsed);
      semanticIssues = [
        ...getExcellenceReviewSemanticIssues(normalized.review),
        ...getExcellenceReviewScopeIssues(
          normalized.review,
          runState.reviewScope,
        ),
      ];
    }

    if (semanticIssues.length > 0) {
      monitorLog("excellence_review.semantic_invalid", semanticIssues);
      return unavailableCompactReview(
        "contract",
        "excellence_review_invalid",
        `The independent reviewer returned an internally inconsistent assessment after bounded correction: ${JSON.stringify(semanticIssues)}`,
      );
    }

    return { status: "completed", review: normalized.review };
  } catch (error) {
    monitorLog("excellence_reviewer_agent.error", error);
    if (runState.signal?.aborted) {
      throw abortReason(runState.signal);
    }
    const code =
      error instanceof ReviewerEvidenceError
        ? error.code
        : "excellence_review_unavailable";
    return unavailableCompactReview(
      classifyCompactReviewUnavailableKind(error, code),
      code,
      `Independent Reviewer Agent was unavailable: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function buildReviewerVerificationRunId(candidate: ExcellenceReviewArtifact) {
  return sourceDigest(
    `${candidate.path}:${candidate.artifactDigest}:${candidate.inspection.checkedAt}:${JSON.stringify(candidate.unimplementedRequirements ?? [])}`,
  ).slice(0, 20);
}

function toReviewerArtifactReference(
  artifact: ExcellenceReviewArtifact,
): ReviewerArtifactReference {
  return {
    previewUrl: artifact.previewUrl,
    artifactDigest: artifact.artifactDigest,
    canonicalSource: artifact.source,
    ...(artifact.review ? { priorReview: artifact.review } : {}),
  };
}

function createReviewerEvidenceProvider({
  candidate,
  baseline,
}: {
  candidate: ExcellenceReviewArtifact;
  baseline?: ExcellenceReviewArtifact;
}): ReviewerEvidenceProvider {
  const artifacts: Partial<
    Record<ReviewerArtifactTarget, ExcellenceReviewArtifact>
  > = { candidate, baseline };
  const visualInventories: Partial<Record<ReviewerArtifactTarget, unknown>> =
    {};

  const getArtifact = (target: ReviewerArtifactTarget) => {
    const artifact = artifacts[target];
    if (!artifact) {
      throw new ReviewerEvidenceError(
        "excellence_review_baseline_missing",
        `No locked ${target} Artifact exists.`,
      );
    }
    return artifact;
  };

  const assertLocked = async (target: ReviewerArtifactTarget) => {
    const artifact = getArtifact(target);
    const current = await readFile(artifact.hostPath, "utf8");
    if (sourceDigest(current) !== artifact.artifactDigest) {
      throw new ReviewerEvidenceError(
        "excellence_review_artifact_stale",
        `The locked ${target} Artifact changed during independent review.`,
      );
    }
  };

  return {
    assertLocked,
    async captureMatrix(target) {
      const artifact = getArtifact(target);
      await assertLocked(target);
      const inspection = await runBrowserMatrixVerification({
        path: artifact.path,
        previewUrl: artifact.previewUrl,
        artifactModifiedAt: artifact.artifactModifiedAt,
        mode: "final",
        viewports: browserViewports,
        captureScreenshots: true,
      });
      await assertLocked(target);
      const screenshots = browserViewportNames.flatMap((viewport) => {
        const imageDataUrl = inspection.viewports[viewport]?.screenshotDataUrl;
        return imageDataUrl ? [{ viewport, imageDataUrl }] : [];
      });
      const ok =
        inspection.ok && screenshots.length === browserViewportNames.length;
      // This evaluate-only pass adds inspectable content evidence without
      // adding screenshots or exposing image URLs with sensitive queries.
      let visualInventory: unknown;
      try {
        visualInventory = await captureReviewerVisualInventory(artifact);
      } catch (error) {
        // Matrix screenshots already establish the review's primary evidence.
        // Inventory is supplemental and must not turn a healthy capture into
        // an infrastructure failure.
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        visualInventory = {
          unavailable: true,
          reason: "visual_inventory_capture_failed",
        };
        monitorLog("excellence_reviewer.visual_inventory_unavailable", {
          target,
          error: errorMessage,
        });
      }
      visualInventories[target] = visualInventory;
      return {
        ok,
        summary: buildReviewerMatrixSummary(
          inspection,
          visualInventory,
          target === "baseline" ? visualInventories.candidate : undefined,
        ),
        screenshots,
        ...(!ok
          ? {
              error: `Fresh ${target} evidence failed or was incomplete: ${safeStringify(
                inspection.blockingIssues,
              )}`,
            }
          : {}),
      };
    },
    async inspectVisualTarget({
      target,
      viewport,
      sectionId,
      toolId,
      dataSlot,
    }) {
      const artifact = getArtifact(target);
      return inspectReviewerBrowserState({
        artifact,
        viewport,
        script: buildReviewerTargetInspectionScript({
          sectionId,
          toolId,
          dataSlot,
        }),
      });
    },
    async scanResponsiveWidths(target, widths) {
      const artifact = getArtifact(target);
      await assertLocked(target);
      const reports = [];
      for (const width of widths) {
        const report = await runReviewerResponsiveWidthInspection({
          artifact,
          width,
        });
        reports.push(report);
      }
      await assertLocked(target);
      return reports;
    },
    async probeInteraction({ target, viewport, toolId, dataSlot, action }) {
      const artifact = getArtifact(target);
      return inspectReviewerBrowserState({
        artifact,
        viewport,
        script: buildReviewerInteractionProbeScript({
          toolId,
          dataSlot,
          action,
        }),
      });
    },
  };
}

async function captureReviewerVisualInventory(
  artifact: ExcellenceReviewArtifact,
) {
  const entries = await Promise.all(
    browserViewportNames.map(
      async (viewport) =>
        [
          viewport,
          await inspectReviewerBrowserState({
            artifact,
            viewport,
            script: buildReviewerVisualInventoryScript(),
          }),
        ] as const,
    ),
  );
  return Object.fromEntries(
    entries.map(([viewport, value]) => [
      viewport,
      sanitizeReviewerVisualInventory(value),
    ]),
  );
}

export function digestReviewerImageSource(src: string) {
  try {
    const url = new URL(src);
    if (url.protocol === "http:" || url.protocol === "https:") {
      // Signed/cache-busting queries and fragments are intentionally omitted.
      return sourceDigest(`${url.protocol}//${url.host}${url.pathname}`).slice(
        0,
        20,
      );
    }
  } catch {
    // data/blob/non-URL sources are hashed as opaque values; never returned.
  }
  return sourceDigest(src).slice(0, 20);
}

export function sanitizeReviewerVisualInventory(value: unknown) {
  const record = asRecord(value) ?? {};
  const images = (Array.isArray(record.images) ? record.images : []).flatMap(
    (item) => {
      const image = asRecord(item);
      if (!image) return [];
      const src = typeof image.src === "string" ? image.src : "";
      return src
        ? [
            {
              sectionId:
                typeof image.sectionId === "string" ? image.sectionId : null,
              toolId: typeof image.toolId === "string" ? image.toolId : null,
              dataSlot:
                typeof image.dataSlot === "string" ? image.dataSlot : null,
              srcDigest: digestReviewerImageSource(src),
              alt: typeof image.alt === "string" ? image.alt : null,
              nearbyText:
                typeof image.nearbyText === "string" ? image.nearbyText : null,
            },
          ]
        : [];
    },
  );
  const duplicateImageGroups = Object.entries(
    images.reduce<Record<string, Array<Record<string, unknown>>>>(
      (groups, image) => {
        (groups[image.srcDigest] ??= []).push(image);
        return groups;
      },
      {},
    ),
  ).flatMap(([srcDigest, targets]) =>
    targets.length > 1 ? [{ srcDigest, targets }] : [],
  );
  const controls = (Array.isArray(record.controls) ? record.controls : []).map(
    (item) => {
      const control = asRecord(item) ?? {};
      return {
        sectionId:
          typeof control.sectionId === "string" ? control.sectionId : null,
        toolId: typeof control.toolId === "string" ? control.toolId : null,
        dataSlot:
          typeof control.dataSlot === "string" ? control.dataSlot : null,
        role: typeof control.role === "string" ? control.role : null,
        label: typeof control.label === "string" ? control.label : null,
        disabled: control.disabled === true,
        visible: control.visible === true,
      };
    },
  );
  return { images, duplicateImageGroups, controls };
}

export function compactReviewerVisualInventoryForSummary(value: unknown) {
  const source = asRecord(value) ?? {};
  if (source.unavailable === true) {
    return {
      unavailable: true,
      reason:
        typeof source.reason === "string"
          ? source.reason
          : "visual_inventory_unavailable",
    };
  }

  const images = new Map<
    string,
    Record<string, unknown> & { visibleIn: string[] }
  >();
  const controls = new Map<
    string,
    Record<string, unknown> & { visibleIn: string[] }
  >();
  const duplicateGroups = new Map<
    string,
    Record<string, unknown> & { visibleIn: string[] }
  >();
  const target = (record: Record<string, unknown>) => ({
    sectionId: record.sectionId ?? null,
    toolId: record.toolId ?? null,
    dataSlot: record.dataSlot ?? null,
  });

  for (const [viewport, rawInventory] of Object.entries(source)) {
    const inventory = asRecord(rawInventory);
    if (!inventory) continue;
    for (const rawImage of Array.isArray(inventory.images)
      ? inventory.images
      : []) {
      const image = asRecord(rawImage);
      if (!image) continue;
      const entry = {
        target: target(image),
        srcDigest: image.srcDigest,
        alt: image.alt ?? null,
        nearbyText: image.nearbyText ?? null,
      };
      const key = JSON.stringify(entry);
      const existing = images.get(key);
      if (existing) existing.visibleIn.push(viewport);
      else images.set(key, { ...entry, visibleIn: [viewport] });
    }
    for (const rawControl of Array.isArray(inventory.controls)
      ? inventory.controls
      : []) {
      const control = asRecord(rawControl);
      if (!control) continue;
      const entry = {
        target: target(control),
        role: control.role ?? null,
        label: control.label ?? null,
        disabled: control.disabled === true,
      };
      const key = JSON.stringify(entry);
      const existing = controls.get(key);
      if (existing) existing.visibleIn.push(viewport);
      else controls.set(key, { ...entry, visibleIn: [viewport] });
    }
    for (const rawGroup of Array.isArray(inventory.duplicateImageGroups)
      ? inventory.duplicateImageGroups
      : []) {
      const group = asRecord(rawGroup);
      if (!group) continue;
      const targets = (Array.isArray(group.targets) ? group.targets : [])
        .flatMap((item) => {
          const record = asRecord(item);
          return record ? [target(record)] : [];
        })
        .sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right)),
        );
      const entry = { srcDigest: group.srcDigest, targets };
      const key = JSON.stringify(entry);
      const existing = duplicateGroups.get(key);
      if (existing) existing.visibleIn.push(viewport);
      else duplicateGroups.set(key, { ...entry, visibleIn: [viewport] });
    }
  }

  return {
    images: [...images.values()],
    duplicateImageGroups: [...duplicateGroups.values()],
    controls: [...controls.values()],
  };
}

function buildReviewerMatrixSummary(
  inspection: BrowserMatrixInspection,
  visualInventory?: unknown,
  candidateVisualInventory?: unknown,
) {
  return {
    checkedAt: inspection.checkedAt,
    ok: inspection.ok,
    viewports: Object.fromEntries(
      browserViewportNames.flatMap((viewport) => {
        const report = inspection.viewports[viewport];
        return report
          ? [
              [
                viewport,
                {
                  width: report.width,
                  height: report.height,
                  actualViewport: report.actualViewport,
                  runtime: report.runtime,
                  imageLoading: report.imageLoading,
                  layoutOk: report.layout.ok,
                  sectionCount: report.layout.sections?.length,
                },
              ],
            ]
          : [];
      }),
    ),
    blockingIssues: inspection.blockingIssues,
    ...(visualInventory && !candidateVisualInventory
      ? {
          visualInventory:
            compactReviewerVisualInventoryForSummary(visualInventory),
        }
      : {}),
    ...(candidateVisualInventory && visualInventory
      ? {
          candidateDelta: buildReviewerVisualInventoryDelta(
            candidateVisualInventory,
            visualInventory,
          ),
        }
      : {}),
  };
}

export function buildReviewerVisualInventoryDelta(
  candidate: unknown,
  baseline: unknown,
) {
  const inventoryEntries = (value: unknown, field: "images" | "controls") =>
    Object.entries(asRecord(value) ?? {}).flatMap(
      ([viewportName, viewport]) => {
        const inventory = asRecord(viewport);
        return Array.isArray(inventory?.[field])
          ? inventory[field].flatMap((item) => {
              const record = asRecord(item);
              return record ? [{ ...record, viewport: viewportName }] : [];
            })
          : [];
      },
    );
  const imageKey = (item: Record<string, unknown>) =>
    [item.viewport, item.sectionId, item.toolId, item.dataSlot]
      .map((value) => String(value ?? ""))
      .join("\u0000");
  const controlKey = (item: Record<string, unknown>) =>
    [
      item.viewport,
      item.sectionId,
      item.toolId,
      item.dataSlot,
      item.role,
      item.label,
    ]
      .map((value) => String(value ?? ""))
      .join("\u0000");
  const candidateImages = new Map(
    inventoryEntries(candidate, "images").map((item) => [imageKey(item), item]),
  );
  const baselineImages = new Map(
    inventoryEntries(baseline, "images").map((item) => [imageKey(item), item]),
  );
  const imageDigest = (item: { viewport: string } | undefined) =>
    asRecord(item)?.srcDigest;
  const changedImageTargets = [
    ...new Set([...candidateImages.keys(), ...baselineImages.keys()]),
  ]
    .filter(
      (key) =>
        imageDigest(candidateImages.get(key)) !==
        imageDigest(baselineImages.get(key)),
    )
    .map((key) => ({
      target: key,
      candidateSrcDigest: imageDigest(candidateImages.get(key)),
      baselineSrcDigest: imageDigest(baselineImages.get(key)),
    }));
  const duplicateKeys = (value: unknown) =>
    Object.values(asRecord(value) ?? {}).flatMap((viewport) => {
      const inventory = asRecord(viewport);
      return Array.isArray(inventory?.duplicateImageGroups)
        ? inventory.duplicateImageGroups.map((group) => JSON.stringify(group))
        : [];
    });
  const candidateDuplicates = new Set(duplicateKeys(candidate));
  const baselineDuplicates = new Set(duplicateKeys(baseline));
  const duplicateGroupsChanged = [
    ...new Set([...candidateDuplicates, ...baselineDuplicates]),
  ]
    .filter(
      (key) => !candidateDuplicates.has(key) || !baselineDuplicates.has(key),
    )
    .map((key) => JSON.parse(key));
  const candidateControls = new Map(
    inventoryEntries(candidate, "controls").map((item) => [
      controlKey(item),
      item,
    ]),
  );
  const baselineControls = new Map(
    inventoryEntries(baseline, "controls").map((item) => [
      controlKey(item),
      item,
    ]),
  );
  return {
    changedImageTargets,
    duplicateImageTargets: duplicateGroupsChanged.flatMap((group) =>
      Array.isArray(group.targets) ? group.targets : [],
    ),
    duplicateGroupsChanged,
    addedControls: [...candidateControls.keys()]
      .filter((key) => !baselineControls.has(key))
      .map((key) => candidateControls.get(key)),
    removedControls: [...baselineControls.keys()]
      .filter((key) => !candidateControls.has(key))
      .map((key) => baselineControls.get(key)),
  };
}

function buildReviewerVisualInventoryScript() {
  return `() => {
    const visible = (element) => { const style = getComputedStyle(element); const rect = element.getBoundingClientRect(); return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0; };
    const closestId = (element, selector) => element.closest(selector)?.getAttribute('id') || null;
    const nearby = (element) => (element.closest('[data-slot], [id]')?.textContent || element.parentElement?.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 180);
    return {
      images: Array.from(document.images).filter(visible).map((image) => ({ sectionId: closestId(image, 'section[id]'), toolId: closestId(image, '[id]'), dataSlot: image.closest('[data-slot]')?.getAttribute('data-slot') || null, src: image.currentSrc || image.src, alt: image.alt || null, nearbyText: nearby(image) })),
      controls: Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"]')).filter(visible).map((element) => ({ sectionId: closestId(element, 'section[id]'), toolId: closestId(element, '[id]'), dataSlot: element.closest('[data-slot]')?.getAttribute('data-slot') || null, role: element.getAttribute('role') || element.tagName.toLowerCase(), label: element.getAttribute('aria-label') || element.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 120) || null, disabled: element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true', visible: true })),
    };
  }`;
}

async function inspectReviewerBrowserState({
  artifact,
  viewport,
  script,
}: {
  artifact: ExcellenceReviewArtifact;
  viewport: BrowserViewportName;
  script: string;
}) {
  const viewportConfig = browserViewports.find(
    (item) => item.name === viewport,
  );
  if (!viewportConfig) {
    throw new ReviewerEvidenceError(
      "excellence_review_viewport_unknown",
      `Unknown Reviewer viewport ${viewport}.`,
    );
  }
  const serverResult = await getSharedChromeDevtoolsServer(viewport);
  if (!serverResult.ok) {
    throw new ReviewerEvidenceError(
      "excellence_review_browser_unavailable",
      serverResult.error,
    );
  }

  const matrixId = `reviewer-${sourceDigest(
    `${artifact.artifactDigest}:${viewport}`,
  ).slice(0, 12)}`;
  const logContext = getBrowserToolLogContext({
    matrixId,
    viewport: viewportConfig,
  });
  await getSharedBrowserMatrixPage(serverResult.server, viewport, logContext);
  await applyBrowserViewport(serverResult.server, viewportConfig, logContext);
  await callBrowserToolWithLog(
    serverResult.server,
    "navigate_page",
    {
      type: "url",
      url: artifact.previewUrl,
      timeout: agentConfig.browser.navigationTimeoutMs,
    },
    { ...logContext, scope: "excellence_reviewer" },
  );
  await waitForPreviewRender(serverResult.server, logContext);
  await waitForImagesToSettle(serverResult.server, logContext);
  const result = await callBrowserToolWithLog(
    serverResult.server,
    "evaluate_script",
    { function: script },
    { ...logContext, scope: "excellence_reviewer" },
  );
  return tryParseJson(extractMcpText(result)) ?? result;
}

async function runReviewerResponsiveWidthInspection({
  artifact,
  width,
}: {
  artifact: ExcellenceReviewArtifact;
  width: number;
}) {
  const viewport: BrowserViewportConfig = {
    name: "desktop",
    width,
    height: 1000,
  };
  const serverResult = await getSharedChromeDevtoolsServer("desktop");
  if (!serverResult.ok) {
    throw new ReviewerEvidenceError(
      "excellence_review_browser_unavailable",
      serverResult.error,
    );
  }
  const matrixId = `reviewer-width-${width}-${sourceDigest(
    artifact.artifactDigest,
  ).slice(0, 8)}`;
  const logContext = getBrowserToolLogContext({ matrixId, viewport });
  await getSharedBrowserMatrixPage(serverResult.server, "desktop", logContext);
  await applyBrowserViewport(serverResult.server, viewport, logContext);
  await callBrowserToolWithLog(
    serverResult.server,
    "navigate_page",
    {
      type: "url",
      url: artifact.previewUrl,
      timeout: agentConfig.browser.navigationTimeoutMs,
    },
    { ...logContext, scope: "excellence_reviewer_responsive" },
  );
  const report = await runBrowserViewportVerification({
    server: serverResult.server,
    artifactModifiedAt: artifact.artifactModifiedAt,
    viewport,
    captureScreenshots: false,
    viewportAlreadyApplied: true,
    matrixId,
  });
  return {
    width,
    actualViewport: report.actualViewport,
    runtime: report.runtime,
    imageLoading: report.imageLoading,
    layoutOk: report.layout.ok,
    layoutIssues: report.layout.issues,
  };
}

function buildReviewerTargetInspectionScript(target: {
  sectionId: string | null;
  toolId: string | null;
  dataSlot: string | null;
}) {
  return `() => {
    const target = ${JSON.stringify(target)};
    const doc = globalThis.document;
    const byId = (value) => value ? doc.getElementById(value) : null;
    const bySlot = (value) => value
      ? Array.from(doc.querySelectorAll('[data-slot]')).find(
          (element) => element.getAttribute('data-slot') === value,
        )
      : null;
    const element = byId(target.toolId) || byId(target.sectionId) || bySlot(target.dataSlot);
    if (!element) return { found: false, target };
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rect = element.getBoundingClientRect();
    const style = globalThis.getComputedStyle(element);
    return {
      found: true,
      target,
      tag: element.tagName.toLowerCase(),
      id: element.getAttribute('id'),
      dataSlot: element.getAttribute('data-slot'),
      text: (element.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 600),
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
      },
      style: {
        display: style.display,
        position: style.position,
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textAlign: style.textAlign,
        padding: style.padding,
        margin: style.margin,
        gap: style.gap,
        border: style.border,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        gridTemplateColumns: style.gridTemplateColumns,
        gridTemplateRows: style.gridTemplateRows,
      },
    };
  }`;
}

function buildReviewerInteractionProbeScript(input: {
  toolId: string | null;
  dataSlot: string | null;
  action: "focus" | "click" | "escape";
}) {
  return `async () => {
    const input = ${JSON.stringify(input)};
    const doc = globalThis.document;
    const byId = (value) => value ? doc.getElementById(value) : null;
    const bySlot = (value) => value
      ? Array.from(doc.querySelectorAll('[data-slot]')).find(
          (element) => element.getAttribute('data-slot') === value,
        )
      : null;
    const element = byId(input.toolId) || bySlot(input.dataSlot);
    const describe = (target) => target ? {
      tag: target.tagName?.toLowerCase?.(),
      id: target.getAttribute?.('id'),
      dataSlot: target.getAttribute?.('data-slot'),
      role: target.getAttribute?.('role'),
      ariaExpanded: target.getAttribute?.('aria-expanded'),
      ariaPressed: target.getAttribute?.('aria-pressed'),
      ariaHidden: target.getAttribute?.('aria-hidden'),
      text: (target.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 240),
    } : null;
    const before = {
      target: describe(element),
      activeElement: describe(doc.activeElement),
      dialogCount: doc.querySelectorAll('dialog,[role="dialog"]').length,
    };

    if (input.action === 'escape') {
      doc.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        bubbles: true,
      }));
    } else if (!element) {
      return { ok: false, reason: 'target_not_found', before };
    } else if (input.action === 'focus') {
      element.focus?.();
    } else {
      const tag = element.tagName?.toLowerCase?.();
      const role = element.getAttribute?.('role');
      if (tag === 'a' || element.closest?.('form')) {
        return { ok: false, reason: 'navigation_or_form_click_blocked', before };
      }
      if (tag !== 'button' && role !== 'button') {
        return { ok: false, reason: 'click_target_not_button', before };
      }
      element.click?.();
    }

    await new Promise((resolve) => setTimeout(resolve, 80));
    return {
      ok: true,
      action: input.action,
      before,
      after: {
        target: describe(element),
        activeElement: describe(doc.activeElement),
        dialogCount: doc.querySelectorAll('dialog,[role="dialog"]').length,
      },
    };
  }`;
}

function refreshCachedBrowserInspection(
  inspection: BrowserMatrixInspection,
  artifactModifiedAt: number,
): BrowserMatrixInspection {
  return {
    ...inspection,
    artifactModifiedAt,
    viewports: Object.fromEntries(
      Object.entries(inspection.viewports).map(([viewport, report]) => [
        viewport,
        report ? { ...report, artifactModifiedAt } : report,
      ]),
    ),
  };
}

function unavailableCompactReview(
  kind: Extract<CompactReviewExecution, { status: "unavailable" }>["kind"],
  code: string,
  evidence: string,
): CompactReviewExecution {
  return { status: "unavailable", kind, code, evidence };
}

function classifyCompactReviewUnavailableKind(
  error: unknown,
  code: string,
): Extract<CompactReviewExecution, { status: "unavailable" }>["kind"] {
  if (!(error instanceof ReviewerEvidenceError)) return "infrastructure";
  if (code.includes("browser_unavailable") || code.includes("capture_failed")) {
    return "infrastructure";
  }
  if (
    code.includes("unreadable") ||
    code.includes("budget_exhausted") ||
    code.includes("comparison_")
  ) {
    return "contract";
  }
  return "evidence";
}

function createRequestClarificationTool(runState: AgentRunState) {
  return tool({
    name: "request_clarification",
    description:
      "Return one blocking clarification question when a material user decision is required before creating or revising an artifact.",
    parameters: z.object({
      question: z.string().trim().min(1).max(1000),
    }),
    execute({ question }) {
      assertAgentRunActive(runState);
      if (runState.lastDoneRejection?.terminal) {
        return {
          ok: false,
          error: "terminal_delivery_rejection",
          message:
            "The final visual-review budget is exhausted. Stop this run immediately; do not edit the artifact, rerun verification, request clarification, or call done again.",
        };
      }
      if (runState.verificationState.size > 0 || runState.lastDoneRejection) {
        return {
          ok: false,
          error: "clarification_too_late",
          message:
            "Artifact work has already started. Make the safest reasonable product decision and continue the required verify_browser_matrix → review_candidate → done sequence. A verification or quality failure is not a user clarification.",
        };
      }

      runState.clarification = question;
      runState.finalPath = "";
      runState.lastDoneRejection = undefined;
      runState.pendingRepair = undefined;
      transitionRunWorkflow(runState, "request_clarification");
      return {
        ok: true,
        message:
          "Clarification recorded. Stop this run without creating an artifact or calling done.",
      };
    },
  });
}

type VerificationRepairPlan = ReturnType<typeof buildVerificationRepairPlan>;

const repairTargetIdentityKeys = ["sectionId", "toolId", "dataSlot"] as const;

function hasRepairTargetIdentity(target: Record<string, unknown>) {
  return repairTargetIdentityKeys.some(
    (key) => typeof target[key] === "string",
  );
}

function toModelRepairTarget(
  target: Record<string, unknown>,
  unlocated = false,
) {
  if (hasRepairTargetIdentity(target)) {
    return omitUndefinedProperties({
      sectionId:
        typeof target.sectionId === "string" ? target.sectionId : undefined,
      toolId: typeof target.toolId === "string" ? target.toolId : undefined,
      dataSlot:
        typeof target.dataSlot === "string" ? target.dataSlot : undefined,
    });
  }
  return omitUndefinedProperties({
    scope: "document",
    unlocated: unlocated ? true : undefined,
  });
}

function modelRepairTargetKey(target: Record<string, unknown>) {
  return JSON.stringify(target);
}

function normalizeModelRepairTargets({
  target,
  targets,
  observations,
}: {
  target?: Record<string, unknown>;
  targets?: Array<Record<string, unknown>>;
  observations: Array<Record<string, unknown>>;
}) {
  const normalizedTargets: Array<Record<string, unknown>> = [];
  const targetIndexes = new Map<string, number>();
  const addTarget = (candidate: Record<string, unknown>, unlocated = false) => {
    const normalized = toModelRepairTarget(candidate, unlocated);
    const key = modelRepairTargetKey(normalized);
    const existingIndex = targetIndexes.get(key);
    if (existingIndex !== undefined) return existingIndex;
    const index = normalizedTargets.length;
    normalizedTargets.push(normalized);
    targetIndexes.set(key, index);
    return index;
  };

  for (const explicitTarget of targets ?? []) {
    addTarget(explicitTarget);
  }
  if (target && hasRepairTargetIdentity(target)) {
    addTarget(target);
  }

  const normalizedObservations = observations.map((observation) => {
    const targetIndex = hasRepairTargetIdentity(observation)
      ? addTarget(observation)
      : (targetIndexes.get(modelRepairTargetKey({ scope: "document" })) ??
        addTarget({}, true));
    return omitUndefinedProperties({
      target: targetIndex,
      viewport:
        typeof observation.viewport === "string"
          ? observation.viewport
          : undefined,
      observation:
        typeof observation.observation === "string"
          ? observation.observation
          : undefined,
    });
  });

  if (normalizedTargets.length === 0) {
    addTarget({}, true);
  }

  return {
    targets: normalizedTargets,
    observations: normalizedObservations,
  };
}

function compactVerificationRepairPlanForReport(plan: VerificationRepairPlan) {
  const firstPreservationContract = plan[0]?.mustPreserve;
  const commonPreservationContract =
    firstPreservationContract !== undefined &&
    plan.every(
      (item) =>
        item.mustPreserve !== undefined &&
        JSON.stringify(item.mustPreserve) ===
          JSON.stringify(firstPreservationContract),
    )
      ? firstPreservationContract
      : undefined;

  return {
    mustPreserve: commonPreservationContract,
    plan: plan.map((item) => {
      const {
        id: _id,
        findingId: _findingId,
        category: _category,
        severity: _severity,
        forced: _forced,
        scores: _scores,
        mustPreserve,
        observed,
        observations,
        target,
        targets,
        affectedViewports,
        objective,
        ...repair
      } = item;
      const hasStructuredObservations =
        Array.isArray(observations) && observations.length > 0;
      const structuredObservations = hasStructuredObservations
        ? observations
        : [];
      const normalizedTargets = normalizeModelRepairTargets({
        target,
        targets,
        observations: structuredObservations,
      });
      const observedViewports = new Set(
        structuredObservations
          .map((observation) => observation.viewport)
          .filter(
            (viewport): viewport is string => typeof viewport === "string",
          ),
      );
      const uncoveredViewports = affectedViewports?.filter(
        (viewport) => !observedViewports.has(viewport),
      );
      const dimensions = [
        ...(item.dimensions ?? []),
        ...(typeof target?.dimension === "string" ? [target.dimension] : []),
      ].filter(
        (dimension, index, values) => values.indexOf(dimension) === index,
      );
      const generatedObjective = `Resolve ${item.issueCode} at the reported target without regressing other verified viewports.`;

      return omitUndefinedProperties({
        ...repair,
        dimensions: dimensions.length > 0 ? dimensions : undefined,
        maximumRepairStrategy:
          item.maximumRepairStrategy === item.strategy
            ? undefined
            : item.maximumRepairStrategy,
        objective: objective === generatedObjective ? undefined : objective,
        affectedViewports:
          uncoveredViewports && uncoveredViewports.length > 0
            ? uncoveredViewports
            : undefined,
        targets: normalizedTargets.targets,
        observations: hasStructuredObservations
          ? normalizedTargets.observations
          : undefined,
        observed: hasStructuredObservations ? undefined : observed,
        mustPreserve: commonPreservationContract ? undefined : mustPreserve,
      });
    }),
  };
}

function compactUnplannedVerificationIssue(issue: StructuredVerificationIssue) {
  return omitUndefinedProperties({
    code: issue.code,
    message: typeof issue.message === "string" ? issue.message : undefined,
    target: issue.scope,
    artifactRole:
      typeof issue.artifactRole === "string" ? issue.artifactRole : undefined,
    artifactDigest:
      typeof issue.artifactDigest === "string"
        ? issue.artifactDigest
        : undefined,
  });
}

export function buildVerificationReport({
  missing,
  issues,
  staleChecks,
  staticInspectionOk,
  state,
  finalVisualBudget,
}: {
  missing: string[];
  issues: StructuredVerificationIssue[];
  staleChecks: string[];
  staticInspectionOk: boolean;
  state: VerificationArtifactState | undefined;
  finalVisualBudget?: ReturnType<typeof inspectBudget>;
}) {
  const nextActions: string[] = [];
  const finalVisualBudgetExhausted = issues.some(
    (issue) => getIssueCode(issue) === "final_visual_budget_exhausted",
  );
  const repairBudgetExhausted = issues.some(
    (issue) => getIssueCode(issue) === "repair_budget_exhausted",
  );

  if (repairBudgetExhausted) {
    nextActions.push(
      "The repair-verification budget is exhausted without a passing current artifact. Stop this run immediately; do not edit, rerun verification, request clarification, or call done.",
    );
  }

  if (finalVisualBudgetExhausted && finalVisualBudget) {
    nextActions.push(
      `The final visual-review budget is exhausted (${finalVisualBudget.used}/${finalVisualBudget.limit} used), and review_candidate could not stage a committable fallback. Stop this run without editing, verification, clarification, review_candidate, or done.`,
    );
  }

  if (missing.includes("verify_browser_matrix")) {
    nextActions.push(
      "Call verify_browser_matrix in repair mode for the JSX artifact path before retrying delivery.",
    );
  }
  if (staleChecks.length > 0) {
    nextActions.push(
      `The artifact changed after ${staleChecks.join(
        ", ",
      )}; rerun verify_browser_matrix for the latest artifact.`,
    );
  }
  if (!staticInspectionOk) {
    nextActions.push(
      "Fix the static inspection issues in the JSX artifact before re-running browser inspection.",
    );
  }
  if (
    issues.some(
      (issue) =>
        getIssueCode(issue) === "verification_infrastructure_unavailable",
    )
  ) {
    nextActions.push(
      "Browser verification infrastructure is unavailable. Do not repair JSX/CSS for this blocker; restore Chrome DevTools MCP and rerun verify_browser_matrix.",
    );
  }
  if (
    issues.some((issue) =>
      normalizeInternalIssueCode(getIssueCode(issue) ?? "").startsWith(
        "quality_",
      ),
    )
  ) {
    nextActions.push(
      "Restore the product quality lost after the baseline, then rerun repair verification.",
    );
  }
  if (
    issues.some((issue) => {
      const code = normalizeInternalIssueCode(getIssueCode(issue) ?? "");
      return (
        (code.startsWith("excellence_") ||
          code === "quality_review_regression") &&
        !code.includes("review_unavailable") &&
        !code.includes("evidence_missing") &&
        !code.includes("review_unreadable") &&
        !code.includes("review_invalid")
      );
    })
  ) {
    nextActions.push(
      "After editing, self-verify every verificationRepairPlan item against the latest canonical source and fresh three-viewport repair evidence: confirm its observations are resolved, all acceptanceCriteria are met, prohibitedTactics were avoided, and mustPreserve remains intact. Continue repairing if any check fails; call review_candidate only after this self-check passes.",
    );
  }
  if (
    issues.some(
      (issue) =>
        getIssueCode(issue) === "artifact_unchanged_since_failed_verification",
    )
  ) {
    nextActions.push(
      "The artifact is unchanged since failed verification. Apply a successful edit to the reported Section/Tool before requesting any new repair or final evidence.",
    );
  }
  if (
    issues.some(
      (issue) =>
        (getIssueCode(issue) ?? "").includes("excellence_review_unavailable") ||
        (getIssueCode(issue) ?? "").includes("excellence_evidence_missing") ||
        (getIssueCode(issue) ?? "").includes("excellence_review_unreadable") ||
        (getIssueCode(issue) ?? "").includes("excellence_review_invalid"),
    )
  ) {
    nextActions.push(
      "Independent Excellence review is unavailable or internally invalid. Do not edit JSX/CSS for this blocker; retry the canonical review path.",
    );
  }
  if (
    issues.some((issue) =>
      [
        "selection_patch_empty",
        "selection_target_not_found",
        "section_patch_empty",
        "section_target_not_found",
        "delivery_patch_application_failed",
        "delivery_round_trip_mismatch",
        "delivery_duplicate_editor_ids",
        "delivery_projection_failed",
        "delivery_changed_during_final_verification",
      ].includes(getIssueCode(issue) ?? ""),
    )
  ) {
    nextActions.push(
      "Preserve editor ids, revise only the authorized scope, and ensure the generated JSX round-trips into an applicable PageDocument patch.",
    );
  }
  if (
    issues.some((issue) =>
      [
        "layout_horizontal_overflow",
        "layout_element_issue",
        "layout_image_issue",
        "layout_grid_area_containment",
        "layout_unintended_overlap",
      ].includes(getIssueCode(issue) ?? ""),
    )
  ) {
    nextActions.push(
      "Repair the listed canonical delivery issues, rerun repair verification, then call review_candidate again.",
    );
  }
  if (
    issues.some((issue) =>
      [
        "browser_runtime_failed",
        "browser_viewport_verification_failed",
      ].includes(getIssueCode(issue) ?? ""),
    )
  ) {
    nextActions.push(
      "Use the browser matrix report to distinguish page/runtime failures from evidence-capture failures before editing the artifact.",
    );
  }

  const browserMatrixRepairFacts =
    state?.browserMatrixInspection &&
    !staleChecks.includes("verify_browser_matrix")
      ? state.browserMatrixInspection.repairFacts
      : undefined;
  const artifactRepairFacts = (browserMatrixRepairFacts ?? []).filter(
    (fact) => {
      const sourceCodes = getStringArrayProperty(fact, "sourceCodes");
      return (
        sourceCodes.length === 0 ||
        sourceCodes.some((code) => !isOperationalBrowserIssueCode(code))
      );
    },
  );
  const unresolvedIssues = artifactRepairFacts.length
    ? projectUnresolvedIssues({
        facts: artifactRepairFacts,
        viewports: buildRepairProjectionViewports(
          state!.browserMatrixInspection!,
        ),
      })
    : undefined;
  const coveredBrowserIssueCodes = new Set(
    artifactRepairFacts.flatMap((fact) =>
      getStringArrayProperty(fact, "sourceCodes"),
    ),
  );
  const reportIssues = issues.filter(
    (issue) => !coveredBrowserIssueCodes.has(getIssueCode(issue) ?? ""),
  );
  const failedChecks = [
    ...(!staticInspectionOk ? ["staticInspection"] : []),
    ...(getInspectionStatus(
      state?.browserMatrixInspection,
      staleChecks.includes("verify_browser_matrix"),
    ) === "failed"
      ? ["browserMatrixInspection"]
      : []),
  ];
  const fullVerificationRepairPlan = buildVerificationRepairPlan(reportIssues);
  const plannedIssueIds = new Set(
    fullVerificationRepairPlan.map((item) => item.id),
  );
  const unplannedIssues = reportIssues
    .filter((issue) => !plannedIssueIds.has(issue.fingerprint))
    .map(compactUnplannedVerificationIssue);
  const { mustPreserve, plan: verificationRepairPlan } =
    compactVerificationRepairPlanForReport(fullVerificationRepairPlan);

  return omitUndefinedProperties({
    failedChecks: failedChecks.length > 0 ? failedChecks : undefined,
    missing: missing.length > 0 ? missing : undefined,
    staleChecks: staleChecks.length > 0 ? staleChecks : undefined,
    issues: unplannedIssues.length > 0 ? unplannedIssues : undefined,
    mustPreserve,
    verificationRepairPlan:
      verificationRepairPlan.length > 0 ? verificationRepairPlan : undefined,
    unresolvedIssues,
    nextActions: nextActions.length > 0 ? nextActions : undefined,
  });
}

function getIssueCode(issue: unknown) {
  if (typeof issue !== "object" || issue === null) {
    return undefined;
  }

  const code = (issue as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function normalizeInternalIssueCode(code: string) {
  return code.replaceAll("-", "_");
}

function compactVerificationIssues(issues: unknown[]) {
  return issues.map(compactVerificationIssue);
}

function compactVerificationIssue(issue: unknown) {
  const record = asRecord(issue);
  if (!record) {
    return issue;
  }

  const code = getStringProperty(record, "code");
  const reportCode = code ? normalizeReportIssueCode(code) : undefined;

  if (code?.startsWith("layout_") || code?.startsWith("browser_")) {
    return compactBrowserMatrixIssue(record);
  }

  return omitUndefinedProperties({
    code: reportCode,
    message: typeof record.message === "string" ? record.message : undefined,
    checks: Array.isArray(record.checks) ? record.checks : undefined,
    viewport: record.viewport,
    sectionId: record.sectionId,
    toolId: record.toolId,
    dataSlot: record.dataSlot,
    dimension: record.dimension,
    findingId: record.findingId,
    artifactRole: record.artifactRole,
    artifactDigest: record.artifactDigest,
    dimensions: Array.isArray(record.dimensions)
      ? record.dimensions
      : undefined,
    severity: record.severity,
    requiresRepair: record.requiresRepair,
    blockerCodes: Array.isArray(record.blockerCodes)
      ? record.blockerCodes
      : undefined,
    requiredRepairStrategy: record.requiredRepairStrategy,
    maximumRepairStrategy: record.maximumRepairStrategy,
    scores: asRecord(record.scores),
    mustPreserve: asRecord(record.mustPreserve),
    comparison: asRecord(record.comparison),
    affectedViewports: Array.isArray(record.affectedViewports)
      ? record.affectedViewports
      : undefined,
    targets: Array.isArray(record.targets) ? record.targets : undefined,
    observations: Array.isArray(record.observations)
      ? record.observations
      : undefined,
    repairIntent: asRecord(record.repairIntent),
    scope: asRecord(record.scope),
    width: record.width,
    allowed: record.allowed,
    used: record.used,
    remaining: record.remaining,
    limit: record.limit,
    priorSizeBytes: record.priorSizeBytes,
    currentSizeBytes: record.currentSizeBytes,
    priorLineCount: record.priorLineCount,
    currentLineCount: record.currentLineCount,
    nextActions: Array.isArray(record.nextActions)
      ? record.nextActions
      : undefined,
  });
}

function getInspectionStatus(
  inspection: { checkedAt: number; ok?: boolean } | undefined,
  isStale: boolean,
) {
  if (!inspection) {
    return "missing";
  }

  if (isStale) {
    return "stale";
  }

  return inspection.ok === false ? "failed" : "passed";
}

const previewBaseUrl = agentConfig.browser.previewBaseURL;
const browserViewports: readonly BrowserViewportConfig[] =
  agentConfig.browser.viewports;
const browserViewportNames = agentConfig.browser.viewportNames;

export type BrowserVerificationViewport = BrowserViewportName;

export async function verifyBrowserArtifact(input: {
  path: string;
  viewports?: BrowserVerificationViewport[];
  previewBaseUrl?: string;
  artifactId?: string;
}) {
  return withArtifactLog(
    input.artifactId ?? getArtifactLogIdForPath(input.path),
    () => verifyBrowserArtifactWithLog(input),
  );
}

async function verifyBrowserArtifactWithLog({
  path,
  viewports,
  previewBaseUrl: verificationPreviewBaseUrl = previewBaseUrl,
}: {
  path: string;
  viewports?: BrowserVerificationViewport[];
  previewBaseUrl?: string;
  artifactId?: string;
}) {
  const artifact = await registerPreviewArtifact(path, paths.workspaceDir);
  const [fileStat, source] = await Promise.all([
    stat(artifact.hostPath),
    readFile(artifact.hostPath, "utf8"),
  ]);
  const artifactDigest = sourceDigest(source);
  const staticInspection = await inspectStaticArtifact(path, source);
  const artifactPreviewUrl = new URL(
    `/preview-artifacts/${artifact.id}`,
    verificationPreviewBaseUrl,
  ).toString();

  if (!staticInspection.ok) {
    return omitUndefinedProperties({
      ok: false,
      artifactDigest,
      failedStage: "static" as const,
      checks: {
        static: "failed" as const,
        browser: "skipped" as const,
      },
      staticInspection: buildStaticInspectionToolResult(staticInspection),
      browserMatrixReport: {
        status: "skipped",
        reason: "static_inspection_failed",
      },
      nextAction:
        "Fix the static JSX artifact issues first, then rerun verify_browser_matrix.",
    });
  }

  const inspection = await runBrowserMatrixVerification({
    path,
    previewUrl: artifactPreviewUrl,
    artifactModifiedAt: fileStat.mtimeMs,
    mode: "repair",
    viewports: selectBrowserViewports("repair", viewports),
    captureScreenshots: false,
  });

  return omitUndefinedProperties({
    ok: inspection.ok,
    artifactDigest,
    failedStage: inspection.ok ? undefined : ("browser" as const),
    checks: {
      static: "passed" as const,
      browser: inspection.ok ? ("passed" as const) : ("failed" as const),
    },
    staticInspection: buildStaticInspectionToolResult(staticInspection),
    browserMatrixReport: buildCompactBrowserMatrixReport(inspection),
    nextAction: getBrowserMatrixNextAction(inspection),
  });
}

export type BrowserArtifactRepairStatus =
  | "already_valid"
  | "repaired"
  | "partially_repaired"
  | "no_improvement"
  | "static_inspection_failed";

/**
 * Public model-free repair entrypoint used by the CLI and real-browser E2E tests.
 * It executes the same deterministic browser repair transaction as the Agent tool.
 */
export async function repairBrowserArtifact(input: {
  path: string;
  viewports?: BrowserVerificationViewport[];
  captureScreenshots?: boolean;
  previewBaseUrl?: string;
  artifactId?: string;
}) {
  return withArtifactLog(
    input.artifactId ?? getArtifactLogIdForPath(input.path),
    () => repairBrowserArtifactWithLog(input),
  );
}

async function repairBrowserArtifactWithLog({
  path,
  viewports,
  captureScreenshots = false,
  previewBaseUrl: verificationPreviewBaseUrl = previewBaseUrl,
}: {
  path: string;
  viewports?: BrowserVerificationViewport[];
  captureScreenshots?: boolean;
  previewBaseUrl?: string;
  artifactId?: string;
}) {
  const artifact = await registerPreviewArtifact(path, paths.workspaceDir);
  const source = await readFile(artifact.hostPath, "utf8");
  const fileStat = await stat(artifact.hostPath);
  const staticInspection = await inspectStaticArtifact(path, source);
  const artifactPreviewUrl = new URL(
    `/preview-artifacts/${artifact.id}`,
    verificationPreviewBaseUrl,
  ).toString();

  if (!staticInspection.ok) {
    return {
      ok: false,
      status: "static_inspection_failed" as const,
      artifactDigest: sourceDigest(source),
      failedStage: "static" as const,
      checks: {
        static: "failed" as const,
        browser: "skipped" as const,
      },
      applied: [],
      staticInspection: buildStaticInspectionToolResult(staticInspection),
      browserMatrixReport: {
        status: "skipped",
        reason: "static_inspection_failed",
      },
    };
  }

  // This entrypoint may mutate a Section through deterministic repair, so its
  // baseline and every candidate must be evaluated against all three viewports.
  const selectedViewports = selectBrowserViewports(
    "repair",
    viewports,
    undefined,
    undefined,
    true,
  );
  const beforeInspection = await runBrowserMatrixVerification({
    path,
    previewUrl: artifactPreviewUrl,
    artifactModifiedAt: fileStat.mtimeMs,
    mode: "repair",
    viewports: selectedViewports,
    captureScreenshots,
  });

  if (beforeInspection.ok) {
    return {
      ok: true,
      status: "already_valid" as const,
      artifactDigest: sourceDigest(source),
      checks: {
        static: "passed" as const,
        browser: "passed" as const,
      },
      applied: [],
      beforeInspection,
      afterInspection: beforeInspection,
      staticInspection: buildStaticInspectionToolResult(staticInspection),
      browserMatrixReport: buildCompactBrowserMatrixReport(beforeInspection),
    };
  }

  const repairViewports = selectAutomaticRepairViewports(
    beforeInspection,
    selectedViewports,
  );
  if (repairViewports.length !== browserViewportNames.length) {
    return {
      ok: false,
      status: "no_improvement" as const,
      artifactDigest: sourceDigest(source),
      failedStage: "browser" as const,
      checks: {
        static: "passed" as const,
        browser: "failed" as const,
      },
      applied: [],
      decisions: [],
      beforeInspection,
      afterInspection: beforeInspection,
      staticInspection: buildStaticInspectionToolResult(staticInspection),
      browserMatrixReport: buildCompactBrowserMatrixReport(beforeInspection),
    };
  }
  const automaticBaseline = scopeBrowserMatrixInspection(
    beforeInspection,
    repairViewports.map((viewport) => viewport.name),
  );
  const decisions: AutomaticGridRepairEvent[] = [];
  const automatic = await runAutomaticGridRepair({
    hostPath: artifact.hostPath,
    source,
    inspection: automaticBaseline,
    viewports: repairViewports.map((viewport) => viewport.name),
    verifyCandidate: ({ artifactModifiedAt }) =>
      runBrowserMatrixVerification({
        path,
        previewUrl: artifactPreviewUrl,
        artifactModifiedAt,
        mode: "repair",
        viewports: repairViewports,
        captureScreenshots: false,
      }),
    onEvent: (event) => {
      decisions.push(event);
      const { type, ...details } = event;
      monitorLog(`grid_repair.${type}`, { path, ...details });
    },
  });

  let afterInspection =
    automatic.applied.length > 0 ? automatic.inspection : beforeInspection;
  if (automatic.applied.length > 0 && captureScreenshots) {
    afterInspection = await runBrowserMatrixVerification({
      path,
      previewUrl: artifactPreviewUrl,
      artifactModifiedAt: automatic.fileStat.mtimeMs,
      mode: "repair",
      viewports: selectedViewports,
      captureScreenshots: true,
    });
  }
  const status: BrowserArtifactRepairStatus =
    automatic.applied.length === 0
      ? "no_improvement"
      : afterInspection.ok
        ? "repaired"
        : "partially_repaired";
  const finalStaticInspection =
    automatic.applied.length > 0
      ? await inspectStaticArtifact(path, automatic.source)
      : staticInspection;

  return {
    ok: finalStaticInspection.ok && afterInspection.ok,
    status,
    artifactDigest: sourceDigest(
      automatic.applied.length > 0 ? automatic.source : source,
    ),
    failedStage: !finalStaticInspection.ok
      ? ("static" as const)
      : afterInspection.ok
        ? undefined
        : ("browser" as const),
    checks: {
      static: finalStaticInspection.ok
        ? ("passed" as const)
        : ("failed" as const),
      browser: afterInspection.ok ? ("passed" as const) : ("failed" as const),
    },
    applied: automatic.applied,
    decisions,
    beforeInspection,
    afterInspection,
    staticInspection: buildStaticInspectionToolResult(finalStaticInspection),
    browserMatrixReport: buildCompactBrowserMatrixReport(afterInspection),
  };
}

export async function closeBrowserVerificationRuntime() {
  await closeSharedChromeDevtoolsServer("browser verification CLI complete");
}

async function attemptAutomaticGridRepair({
  runState,
  path,
  hostPath,
  previewUrl,
  source,
  inspection,
  viewports,
}: {
  runState: AgentRunState;
  path: string;
  hostPath: string;
  previewUrl: string;
  source: string;
  inspection: BrowserMatrixInspection;
  viewports: readonly BrowserViewportConfig[];
}) {
  return runAutomaticGridRepair({
    hostPath,
    source,
    inspection,
    viewports: viewports.map((viewport) => viewport.name),
    previousPage: runState.previousPage,
    snapshotRoot: paths.tmpDir,
    snapshotLabel: path,
    verifyCandidate: ({ artifactModifiedAt }) =>
      runBrowserMatrixVerification({
        path,
        previewUrl,
        artifactModifiedAt,
        mode: "repair",
        viewports,
      }),
    onEvent: (event) => {
      const { type, ...details } = event;
      monitorLog(`grid_repair.${type}`, { path, ...details });
    },
  });
}

function createVerifyBrowserMatrixTool(runState: AgentRunState) {
  return tool({
    name: "verify_browser_matrix",
    description: runState.reviewerCritiqueEnabled
      ? "Run the authoritative static gate, then screenshot-free browser repair verification. Static failures skip browser work. Local modifications are first projected to their scoped canonical Artifact and lock delivery after one passing three-viewport matrix. Create/composition changes continue to review_candidate for canonical screenshots and Reviewer."
      : "Run the authoritative static gate, then screenshot-free browser repair verification. Static failures skip browser work. Local modifications are first projected to their scoped canonical Artifact and lock delivery after one passing three-viewport matrix. Create/composition changes continue to review_candidate for canonical verification.",
    parameters: z.object({
      path: z.string(),
      viewports: z.array(z.enum(browserViewportNames)).optional(),
    }),
    async execute({ path: suppliedPath, viewports }) {
      assertAgentRunActive(runState);
      let path: string;
      try {
        path = normalizeArtifactPath(suppliedPath);
      } catch (error) {
        return {
          ok: false,
          error: "artifact_path_invalid",
          suppliedPath,
          workflowStateChanged: false,
          message: error instanceof Error ? error.message : String(error),
          nextAction: "Retry with a JSX or TSX path under /workspace/output.",
        };
      }

      let artifact: Awaited<ReturnType<typeof registerPreviewArtifact>>;
      let fileStat: Awaited<ReturnType<typeof stat>>;
      try {
        artifact = await registerPreviewArtifact(path, runState.workspaceDir);
        fileStat = await stat(artifact.hostPath);
      } catch (error) {
        const errorCode =
          error && typeof error === "object" && "code" in error
            ? error.code
            : undefined;
        return {
          ok: false,
          error:
            errorCode === "ENOENT"
              ? "artifact_not_found"
              : "artifact_unreadable",
          suppliedPath,
          canonicalPath: path,
          workflowStateChanged: false,
          message: error instanceof Error ? error.message : String(error),
          nextAction:
            "Confirm that the artifact exists, then retry with its canonical /workspace/output path.",
        };
      }

      runState.reviewedDelivery = undefined;
      transitionRunWorkflow(runState, "start_repair_verification");
      const finishRepairVerification = <T extends Record<string, unknown>>(
        result: T,
      ) => {
        runState.pendingRepair = {
          path,
          source: "verify_browser_matrix",
          message:
            typeof result.nextAction === "string"
              ? result.nextAction
              : result.ok === true
                ? "Repair verification passed; continue to the required candidate review."
                : "Repair verification failed; inspect the latest result and continue repairing.",
          verificationReport: result.ok === true ? undefined : result,
        };
        transitionRunWorkflow(
          runState,
          result.ok === true
            ? "repair_verification_passed"
            : "repair_verification_failed",
        );
        return result;
      };
      const finishExternalBlock = ({
        code,
        artifactPath,
        artifactDigest,
        affectedViewports,
      }: Omit<
        ExternalVerificationBlocker,
        "message" | "retryable" | "requiredAction"
      >) => {
        const { message, requiredAction } = describeExternalVerificationBlocker(
          code,
          affectedViewports,
        );
        const externalBlocker: ExternalVerificationBlocker = {
          code,
          message,
          artifactPath,
          artifactDigest,
          affectedViewports,
          retryable: true,
          requiredAction,
        };
        runState.finalPath = "";
        runState.deliveryResult = undefined;
        runState.lastDoneRejection = undefined;
        runState.pendingRepair = undefined;
        runState.externalBlocker = externalBlocker;
        transitionRunWorkflow(runState, "external_blocked");
        return {
          ok: false,
          status: "blocked_external" as const,
          artifactDigest,
          blockedStage: "browser" as const,
          checks: {
            static: "passed" as const,
            browser: "blocked" as const,
          },
          externalBlocker,
          nextAction:
            "Stop this run without editing the artifact or calling review_candidate or done. Retry in a new run after the external dependency is restored.",
        };
      };
      try {
        const mode = "repair" as const;
        const previewUrl = new URL(
          `/preview-artifacts/${artifact.id}`,
          previewBaseUrl,
        ).toString();
        let artifactSource = await readFile(artifact.hostPath, "utf8");
        let artifactDigest = sourceDigest(artifactSource);
        const previousState = runState.verificationState.get(path);
        let scopedLocalDelivery:
          | Awaited<ReturnType<typeof projectDeliveryArtifact>>
          | undefined;

        let staticInspection = await inspectStaticArtifactCached(
          runState,
          path,
        );

        if (!staticInspection.ok) {
          updateVerificationState(runState, path, {
            sandboxPath: path,
            hostPath: artifact.hostPath,
            previewUrl,
            lastModifiedAt: fileStat.mtimeMs,
            artifactDigest,
            artifactSource,
            lastVerificationFailed: true,
            staticInspection,
          });

          const staticInspectionResult =
            buildStaticInspectionToolResult(staticInspection);

          return finishRepairVerification(
            omitUndefinedProperties({
              ok: false,
              artifactDigest,
              failedStage: "static" as const,
              checks: {
                static: "failed" as const,
                browser: "skipped" as const,
              },
              staticInspection: staticInspectionResult,
              browserMatrixReport: {
                status: "skipped",
                reason: "static_inspection_failed",
              },
              nextAction:
                "Fix the static JSX artifact issues first, then rerun verify_browser_matrix.",
            }),
          );
        }

        try {
          const projectedDelivery = await projectDeliveryArtifact({
            path,
            workspaceDir: runState.workspaceDir,
            operation: runState.operation,
            previousPage: runState.previousPage,
            targetToolId: runState.targetToolId,
            targetSectionId: runState.targetSectionId,
          });

          if (projectedDelivery.modification.kind === "local") {
            scopedLocalDelivery = projectedDelivery;

            if (artifactSource !== projectedDelivery.canonicalSource) {
              await writeFile(
                artifact.hostPath,
                projectedDelivery.canonicalSource,
                "utf8",
              );
              artifactSource = projectedDelivery.canonicalSource;
              artifactDigest = sourceDigest(artifactSource);
              fileStat = await stat(artifact.hostPath);
              staticInspection = await inspectStaticArtifactCached(
                runState,
                path,
              );
            }

            const qualityIssues = inspectQualityRegression({
              baseline: runState.originalQualityBaseline,
              candidate: buildQualitySnapshot(artifactSource),
            });
            if (!staticInspection.ok || qualityIssues.length > 0) {
              updateVerificationState(runState, path, {
                sandboxPath: path,
                hostPath: artifact.hostPath,
                previewUrl,
                lastModifiedAt: fileStat.mtimeMs,
                artifactDigest,
                artifactSource,
                lastVerificationFailed: true,
                staticInspection,
              });
              return finishRepairVerification({
                ok: false,
                error: "local_canonical_inspection_failed",
                artifactDigest,
                failedStage: !staticInspection.ok
                  ? ("static" as const)
                  : undefined,
                checks: {
                  static: staticInspection.ok
                    ? ("passed" as const)
                    : ("failed" as const),
                  browser: "skipped" as const,
                },
                issues: [
                  ...((staticInspection.issues ?? []) as Array<
                    Record<string, unknown>
                  >),
                  ...qualityIssues,
                ],
                staticInspection:
                  buildStaticInspectionToolResult(staticInspection),
                browserMatrixReport: {
                  status: "skipped",
                  reason: "local_canonical_inspection_failed",
                },
                nextAction:
                  "Repair the projected local Artifact before browser verification. Keep the edit inside the authorized Section.",
              });
            }
          }
        } catch (error) {
          const issues =
            error instanceof DeliveryProjectionError
              ? error.issues
              : [
                  {
                    code: "delivery_projection_failed",
                    message:
                      error instanceof Error ? error.message : String(error),
                  },
                ];
          return finishRepairVerification({
            ok: false,
            error: "delivery_projection_failed",
            artifactDigest,
            checks: {
              static: staticInspection.ok
                ? ("passed" as const)
                : ("failed" as const),
              browser: "skipped" as const,
            },
            issues,
            staticInspection: buildStaticInspectionToolResult(staticInspection),
            browserMatrixReport: {
              status: "skipped",
              reason: "delivery_projection_failed",
            },
            nextAction:
              "Repair the candidate so it produces a valid editor PagePatch before browser verification.",
          });
        }

        const viewportRepairContract =
          runState.viewportRepairContract?.path === path
            ? runState.viewportRepairContract
            : undefined;
        if (viewportRepairContract) {
          const baselinePage = jsxToPageDocument(
            viewportRepairContract.baselineSource,
            { previousPage: runState.previousPage },
          );
          const candidatePage = jsxToPageDocument(artifactSource, {
            previousPage: runState.previousPage,
          });
          const viewportMutationIssues = inspectProtectedPageLayoutChanges({
            baseline: baselinePage,
            candidate: candidatePage,
            protectedViewports: viewportRepairContract.protectedViewports,
          });
          if (viewportMutationIssues.length > 0) {
            monitorLog("viewport_repair.layout_blocked", {
              path,
              affectedViewports: viewportRepairContract.affectedViewports,
              protectedViewports: viewportRepairContract.protectedViewports,
              issueCount: viewportMutationIssues.length,
            });
            updateVerificationState(runState, path, {
              sandboxPath: path,
              hostPath: artifact.hostPath,
              previewUrl,
              lastModifiedAt: fileStat.mtimeMs,
              artifactDigest,
              artifactSource,
              lastVerificationFailed: true,
              staticInspection,
            });
            return finishRepairVerification({
              ok: false,
              error: "out_of_scope_viewport_change",
              artifactDigest,
              failedStage: "viewport_scope" as const,
              checks: {
                static: "passed" as const,
                browser: "skipped" as const,
              },
              issues: viewportMutationIssues,
              staticInspection:
                buildStaticInspectionToolResult(staticInspection),
              browserMatrixReport: {
                status: "skipped",
                reason: "out_of_scope_viewport_change",
              },
              viewportRepairScope: {
                affectedViewports: viewportRepairContract.affectedViewports,
                protectedViewports: viewportRepairContract.protectedViewports,
              },
              nextAction:
                "Revert the reported effective layout changes in protected viewports. Express the repair only through overrides for the affected viewport, then rerun the full browser matrix.",
            });
          }
        }

        const unchangedArtifactIssue = getArtifactChangeBlock(
          runState,
          path,
          artifactDigest,
        );
        if (unchangedArtifactIssue) {
          return finishRepairVerification({
            ok: false,
            error: unchangedArtifactIssue.code,
            artifactDigest,
            blockedStage: "browser" as const,
            checks: {
              static: "passed" as const,
              browser: "blocked" as const,
            },
            nextAction: unchangedArtifactIssue.message,
            staticInspection: buildStaticInspectionToolResult(staticInspection),
            browserMatrixReport: {
              status: "blocked",
              reason: unchangedArtifactIssue.code,
              artifactDigest,
            },
          });
        }
        if (previousState?.artifactDigest !== artifactDigest) {
          runState.lastDoneRejection = undefined;
        }

        const previousInspection = previousState?.browserMatrixInspection;
        const artifactChangedSinceBrowserInspection =
          !previousInspection ||
          previousState?.artifactDigest !== artifactDigest;
        const selectedViewports = selectBrowserViewports(
          mode,
          viewports,
          previousInspection,
          previousState?.pendingBrowserViewports,
          artifactChangedSinceBrowserInspection,
        );
        let cacheKey = [
          artifactDigest,
          ...selectedViewports.map((viewport) => viewport.name).sort(),
        ].join(":");
        let automaticImageFallbackUrls: string[] = [];
        const imageReadinessKeys = selectedViewports.map(
          (viewport) => `${artifactDigest}:${viewport.name}`,
        );
        const exhaustedImageReadinessKey = imageReadinessKeys.find(
          (key) =>
            (runState.imageReadinessAttempts.get(key) ?? 0) >=
            maxImageReadinessAttempts,
        );
        if (exhaustedImageReadinessKey) {
          const viewport = exhaustedImageReadinessKey.slice(
            exhaustedImageReadinessKey.lastIndexOf(":") + 1,
          );
          return finishExternalBlock({
            code: "image_readiness_exhausted",
            artifactPath: path,
            artifactDigest,
            affectedViewports: isBrowserViewportName(viewport)
              ? [viewport]
              : [],
          });
        }
        monitorLog("browser_matrix.scope", {
          path,
          mode,
          requestedViewports: viewports,
          selectedViewports: selectedViewports.map((viewport) => viewport.name),
          narrowedFromFullMatrix:
            mode === "repair" &&
            selectedViewports.length < browserViewports.length &&
            (!viewports?.length ||
              viewports.length === browserViewports.length),
        });
        let browserMatrixInspection =
          runState.repairEvidenceCache.get(cacheKey);
        const cacheHit = browserMatrixInspection !== undefined;
        let usingFinalVerificationReserve = false;

        if (!cacheHit) {
          const repairBudget = inspectRepairVerificationBudget(
            runState.repairRequests,
            agentLimits.maxRepairRequests,
          );
          if (!repairBudget.allowed) {
            monitorLog("repair.budget_exhausted", {
              ...repairBudget,
            });
            updateVerificationState(runState, path, {
              sandboxPath: path,
              hostPath: artifact.hostPath,
              previewUrl,
              lastModifiedAt: fileStat.mtimeMs,
              artifactDigest,
              artifactSource,
              lastVerificationFailed: true,
              staticInspection,
            });
            const budgetIssue = {
              code: "repair_budget_exhausted",
              message:
                "The repair-verification budget is exhausted before the current artifact obtained a passing repair verification.",
              ...repairBudget,
            };
            const structuredIssues = structureVerificationIssues({
              issues: [budgetIssue],
              history: runState.verificationIssueHistory,
              relatedHistory: runState.repairIssueHistory,
              artifactDigest,
            });
            const verificationReport = buildVerificationReport({
              missing: [],
              issues: structuredIssues,
              staleChecks: [],
              staticInspectionOk: staticInspection.ok,
              state: runState.verificationState.get(path),
            });
            runState.finalPath = "";
            runState.deliveryResult = undefined;
            runState.lastDoneRejection = {
              path,
              missing: [],
              issues: structuredIssues,
              verificationReport,
              message:
                "The repair-verification budget is exhausted without a passing artifact. The run is terminally rejected; do not call done or continue editing in this run.",
              terminal: true,
            };
            runState.pendingRepair = undefined;
            transitionRunWorkflow(runState, "repair_budget_exhausted");
            return {
              ok: false,
              error: "repair_budget_exhausted",
              terminal: true,
              artifactDigest,
              blockedStage: "browser" as const,
              checks: {
                static: "passed" as const,
                browser: "blocked" as const,
              },
              staticInspection:
                buildStaticInspectionToolResult(staticInspection),
              browserMatrixReport: {
                status: "blocked",
                reason: "repair_budget_exhausted",
                used: repairBudget.used,
                limit: repairBudget.limit,
              },
              verificationReport,
              nextAction:
                "Stop this run immediately. The current artifact has no passing repair verification, so delivery and further done calls are forbidden.",
            };
          }
          usingFinalVerificationReserve =
            repairBudget.usingFinalVerificationReserve;
        }

        if (browserMatrixInspection) {
          browserMatrixInspection = refreshCachedBrowserInspection(
            browserMatrixInspection,
            fileStat.mtimeMs,
          );
          monitorLog("browser_matrix.repair_reuse", {
            path,
            artifactDigest,
            viewports: selectedViewports.map((viewport) => viewport.name),
          });
        } else {
          assertAgentRunActive(runState);
          browserMatrixInspection = await runBrowserMatrixVerification({
            path,
            previewUrl,
            artifactModifiedAt: fileStat.mtimeMs,
            mode,
            viewports: selectedViewports,
          });
          const brokenImageUrls = getBrokenImageUrls(browserMatrixInspection);
          const fallback = replaceBrokenImageUrls(
            artifactSource,
            brokenImageUrls,
            agentConfig.images.placeholderSrc,
          );
          if (fallback.replacedUrls.length > 0) {
            await writeFile(artifact.hostPath, fallback.source, "utf8");
            artifactSource = fallback.source;

            if (scopedLocalDelivery) {
              const projectedDelivery = await projectDeliveryArtifact({
                path,
                workspaceDir: runState.workspaceDir,
                operation: runState.operation,
                previousPage: runState.previousPage,
                targetToolId: runState.targetToolId,
                targetSectionId: runState.targetSectionId,
              });
              scopedLocalDelivery =
                projectedDelivery.modification.kind === "local"
                  ? projectedDelivery
                  : undefined;
              if (artifactSource !== projectedDelivery.canonicalSource) {
                await writeFile(
                  artifact.hostPath,
                  projectedDelivery.canonicalSource,
                  "utf8",
                );
                artifactSource = projectedDelivery.canonicalSource;
              }
            }

            automaticImageFallbackUrls = fallback.replacedUrls.filter(
              (url) => !artifactSource.includes(url),
            );
            artifactDigest = sourceDigest(artifactSource);
            fileStat = await stat(artifact.hostPath);
            staticInspection = await inspectStaticArtifactCached(
              runState,
              path,
            );
            cacheKey = [
              artifactDigest,
              ...selectedViewports.map((viewport) => viewport.name).sort(),
            ].join(":");

            if (automaticImageFallbackUrls.length > 0) {
              monitorLog("image.fallback_applied", {
                path,
                replacedUrls: automaticImageFallbackUrls,
              });
              assertAgentRunActive(runState);
              browserMatrixInspection = await runBrowserMatrixVerification({
                path,
                previewUrl,
                artifactModifiedAt: fileStat.mtimeMs,
                mode,
                viewports: selectedViewports,
              });
            } else {
              browserMatrixInspection = refreshCachedBrowserInspection(
                browserMatrixInspection,
                fileStat.mtimeMs,
              );
            }
          }
          const exhaustedImageViewports = updateImageReadinessAttempts(
            runState,
            artifactDigest,
            browserMatrixInspection,
          );
          if (exhaustedImageViewports.length > 0) {
            browserMatrixInspection = markImageReadinessRetryExhausted(
              browserMatrixInspection,
              exhaustedImageViewports,
            );
          }
          if (
            shouldChargeRepairRequest({
              cacheHit,
              infrastructureBlocked: hasBrowserInfrastructureIssue(
                browserMatrixInspection,
              ),
            })
          ) {
            runState.repairRequests += 1;
            monitorLog("repair.budget_charged", {
              used: runState.repairRequests,
              limit: agentLimits.maxRepairRequests,
              totalLimit: agentLimits.maxRepairRequests + 1,
              finalVerificationReserve: usingFinalVerificationReserve,
              artifactDigest,
              viewports: selectedViewports.map((viewport) => viewport.name),
            });
          }
          if (!hasBrowserInfrastructureIssue(browserMatrixInspection)) {
            runState.repairEvidenceCache.set(cacheKey, browserMatrixInspection);
          }
        }

        const externalBlockerCode = getExternalVerificationBlockerCode(
          browserMatrixInspection.blockingIssues,
        );
        if (externalBlockerCode) {
          const affectedViewports = getInfrastructureBlockedViewportNames(
            browserMatrixInspection,
          );
          updateVerificationState(runState, path, {
            sandboxPath: path,
            hostPath: artifact.hostPath,
            previewUrl,
            lastModifiedAt: fileStat.mtimeMs,
            artifactDigest,
            artifactSource,
            lastVerificationFailed: false,
            staticInspection,
            browserMatrixInspection,
            pendingBrowserViewports: affectedViewports,
          });
          return finishExternalBlock({
            code: externalBlockerCode,
            artifactPath: path,
            artifactDigest,
            affectedViewports,
          });
        }

        let automaticGridRepairs: Awaited<
          ReturnType<typeof attemptAutomaticGridRepair>
        >["applied"] = [];
        let automaticGridRepairAttempted = false;
        const automaticRepairViewports = selectAutomaticRepairViewports(
          browserMatrixInspection,
          selectedViewports,
        );
        const automaticBaseline = scopeBrowserMatrixInspection(
          browserMatrixInspection,
          automaticRepairViewports.map((viewport) => viewport.name),
        );
        if (
          !scopedLocalDelivery &&
          !automaticBaseline.ok &&
          automaticRepairViewports.length === browserViewportNames.length
        ) {
          automaticGridRepairAttempted = true;
          const automatic = await attemptAutomaticGridRepair({
            runState,
            path,
            hostPath: artifact.hostPath,
            previewUrl,
            source: artifactSource,
            inspection: automaticBaseline,
            viewports: automaticRepairViewports,
          });
          automaticGridRepairs = automatic.applied;
          artifactSource = automatic.source;
          artifactDigest = sourceDigest(artifactSource);
          fileStat = automatic.fileStat;
          if (automatic.applied.length > 0) {
            browserMatrixInspection = automatic.inspection;
            staticInspection = await inspectStaticArtifactCached(
              runState,
              path,
            );
            if (!hasBrowserInfrastructureIssue(browserMatrixInspection)) {
              runState.repairEvidenceCache.set(
                [
                  artifactDigest,
                  ...selectedViewports.map((viewport) => viewport.name).sort(),
                ].join(":"),
                browserMatrixInspection,
              );
            }
          } else {
            browserMatrixInspection = refreshCachedBrowserInspection(
              browserMatrixInspection,
              fileStat.mtimeMs,
            );
          }
        }

        if (viewportRepairContract) {
          const viewportMutationIssues = inspectProtectedBrowserGeometryChanges(
            {
              baseline: viewportRepairContract.baselineInspection,
              candidate: browserMatrixInspection,
              protectedViewports: viewportRepairContract.protectedViewports,
            },
          );
          if (viewportMutationIssues.length > 0) {
            browserMatrixInspection = {
              ...browserMatrixInspection,
              ok: false,
              blockingIssues: [
                ...browserMatrixInspection.blockingIssues,
                ...viewportMutationIssues,
              ],
            };
            monitorLog("viewport_repair.geometry_blocked", {
              path,
              affectedViewports: viewportRepairContract.affectedViewports,
              protectedViewports: viewportRepairContract.protectedViewports,
              issueCount: viewportMutationIssues.length,
            });
          }
        }

        updateRepairIssueHistory(runState, browserMatrixInspection);
        const existingState = runState.verificationState.get(path);
        const qualityBaseline =
          existingState?.qualityBaseline ??
          (mode === "repair" && browserMatrixInspection.ok
            ? buildQualitySnapshot(artifactSource)
            : undefined);

        updateVerificationState(runState, path, {
          sandboxPath: path,
          hostPath: artifact.hostPath,
          previewUrl,
          lastModifiedAt: fileStat.mtimeMs,
          artifactDigest,
          artifactSource,
          lastVerificationFailed: hasArtifactBlockingIssue(
            browserMatrixInspection,
          ),
          staticInspection,
          browserMatrixInspection,
          qualityBaseline,
          pendingBrowserViewports: hasArtifactBlockingIssue(
            browserMatrixInspection,
          )
            ? []
            : getInfrastructureBlockedViewportNames(browserMatrixInspection),
        });

        const staticInspectionResult =
          buildStaticInspectionToolResult(staticInspection);
        const browserMatrixReport = buildCompactBrowserMatrixReport(
          browserMatrixInspection,
          {
            history: runState.verificationIssueHistory,
            artifactDigest,
          },
        );
        if (
          shouldTerminallyRejectRepairVerification({
            usingFinalVerificationReserve,
            verificationOk: browserMatrixInspection.ok,
          })
        ) {
          const repairBudget = inspectRepairVerificationBudget(
            runState.repairRequests,
            agentLimits.maxRepairRequests,
          );
          const budgetIssue = {
            code: "repair_budget_exhausted",
            message:
              "The reserved final repair verification failed; no further edits or verification calls are allowed in this run.",
            ...repairBudget,
          };
          const structuredIssues = structureVerificationIssues({
            issues: [budgetIssue],
            history: runState.verificationIssueHistory,
            relatedHistory: runState.repairIssueHistory,
            artifactDigest,
          });
          const verificationReport = buildVerificationReport({
            missing: [],
            issues: structuredIssues,
            staleChecks: [],
            staticInspectionOk: staticInspection.ok,
            state: runState.verificationState.get(path),
          });
          runState.finalPath = "";
          runState.deliveryResult = undefined;
          runState.lastDoneRejection = {
            path,
            missing: [],
            issues: structuredIssues,
            verificationReport,
            message:
              "The reserved final repair verification failed. The run is terminally rejected; do not call done or continue editing in this run.",
            terminal: true,
          };
          runState.pendingRepair = undefined;
          transitionRunWorkflow(runState, "repair_budget_exhausted");
          monitorLog("repair.final_verification_failed", {
            used: repairBudget.used,
            limit: repairBudget.limit,
            totalLimit: repairBudget.totalLimit,
            artifactDigest,
          });
          return {
            ok: false,
            error: "repair_budget_exhausted",
            terminal: true,
            artifactDigest,
            failedStage: "browser" as const,
            checks: {
              static: "passed" as const,
              browser: "failed" as const,
            },
            staticInspection: staticInspectionResult,
            browserMatrixReport,
            verificationReport,
            nextAction:
              "The reserved final verification failed. Stop this run immediately; delivery and further edits or verification calls are forbidden.",
          };
        }
        const localAccepted =
          scopedLocalDelivery !== undefined &&
          staticInspection.ok &&
          browserMatrixInspection.ok;
        const baseNextAction = localAccepted
          ? "The projected local Artifact passed its single canonical browser matrix. Call done with the unchanged path."
          : getBrowserMatrixNextAction(
              browserMatrixInspection,
              runState.reviewerCritiqueEnabled
                ? inspectBudget(
                    runState.finalVisualRuns,
                    agentLimits.maxFinalVisualRuns,
                  )
                : undefined,
            );
        const nextAction =
          !browserMatrixInspection.ok &&
          runState.repairRequests === agentLimits.maxRepairRequests
            ? `${baseNextAction} One reserved final verification remains for the next edited artifact; if it fails, the run becomes terminal.`
            : baseNextAction;
        const result = finishRepairVerification(
          omitUndefinedProperties({
            ok: staticInspection.ok && browserMatrixInspection.ok,
            artifactDigest,
            failedStage: !staticInspection.ok
              ? ("static" as const)
              : browserMatrixInspection.ok
                ? undefined
                : ("browser" as const),
            checks: {
              static: staticInspection.ok
                ? ("passed" as const)
                : ("failed" as const),
              browser: browserMatrixInspection.ok
                ? ("passed" as const)
                : ("failed" as const),
            },
            readyForDone: localAccepted ? true : undefined,
            modification: scopedLocalDelivery?.modification,
            nextAction,
            automaticGridRepair: automaticGridRepairAttempted
              ? {
                  status:
                    automaticGridRepairs.length === 0
                      ? "no_improvement"
                      : browserMatrixInspection.ok
                        ? "repaired"
                        : "partially_repaired",
                  applied: automaticGridRepairs,
                }
              : undefined,
            automaticImageFallback:
              automaticImageFallbackUrls.length > 0
                ? {
                    replacedUrls: automaticImageFallbackUrls,
                    placeholder: "configured",
                  }
                : undefined,
            staticInspection: staticInspectionResult,
            browserMatrixReport,
          }),
        );

        if (localAccepted && scopedLocalDelivery) {
          acceptReviewedDelivery(runState, {
            path,
            hostPath: artifact.hostPath,
            expectedSourceDigest: artifactDigest,
            canonicalSource: artifactSource,
            patch: scopedLocalDelivery.patch,
            qualityStatus: "review_skipped",
            message:
              "The scoped local modification passed one canonical three-viewport browser verification without independent visual review.",
            unimplementedRequirements: [],
          });
          runState.lastDoneRejection = undefined;
          runState.pendingRepair = undefined;
          runState.deliveryResult = undefined;
          transitionRunWorkflow(runState, "start_candidate_verification");
          transitionRunWorkflow(runState, "candidate_review_accepted");
        }

        return result;
      } catch (error) {
        if (runState.workflowState === "repair_verification") {
          transitionRunWorkflow(runState, "repair_verification_failed");
        }
        throw error;
      }
    },
  });
}

export function getBrowserMatrixNextAction(
  inspection: BrowserMatrixInspection,
  finalVisualBudget?: ReturnType<typeof inspectBudget>,
) {
  if (inspection.ok) {
    if (finalVisualBudget && !finalVisualBudget.allowed) {
      return "Repair verification passed. Call review_candidate, not done; review_candidate will stage the strongest reviewed artifact as best effort when the review budget is exhausted, or return an explicit terminal outcome if no fallback exists.";
    }
    const budgetMessage = finalVisualBudget
      ? ` ${describeFinalVisualBudget(finalVisualBudget.used, finalVisualBudget.limit)}`
      : "";
    return inspection.mode === "final"
      ? `Canonical browser matrix passed inside review_candidate; follow that tool's result and call done only if it returns readyForDone: true.${budgetMessage}`
      : `Repair-mode browser matrix passed. Call review_candidate next; do not call done until review_candidate returns readyForDone: true.${budgetMessage}`;
  }

  if (
    inspection.blockingIssues.some(
      (issue) => issue.code === "browser_image_loading_retry_exhausted",
    )
  ) {
    return "Image readiness failed on the initial check and its single retry. Stop calling verify_browser_matrix for this unchanged artifact and viewport; do not edit JSX/CSS, and report the external readiness blocker.";
  }

  const infrastructureViewports =
    getInfrastructureBlockedViewportNames(inspection);
  const repairableViewports = getArtifactBlockingViewportNames(inspection);
  if (
    infrastructureViewports.length > 0 &&
    !hasArtifactBlockingIssue(inspection)
  ) {
    return `Retry verify_browser_matrix for ${infrastructureViewports.join(", ")} after browser readiness recovers; do not change JSX/CSS for these blockers.`;
  }

  if (infrastructureViewports.length > 0) {
    const repairInstruction =
      repairableViewports.length > 0
        ? `Fix JSX/CSS issues in ${repairableViewports.join(", ")}`
        : "Fix the reported JSX/CSS issues";
    return `${repairInstruction}; retry browser readiness for ${infrastructureViewports.join(", ")} without changing JSX/CSS for those readiness failures; rerun verify_browser_matrix.`;
  }
  return repairableViewports.length > 0
    ? `Fix JSX/CSS issues in ${repairableViewports.join(", ")}; rerun verify_browser_matrix.`
    : "Fix the reported JSX/CSS issues; rerun verify_browser_matrix.";
}

function describeExternalVerificationBlocker(
  code: ExternalVerificationBlocker["code"],
  affectedViewports: BrowserViewportName[],
) {
  const viewportLabel =
    affectedViewports.length > 0 ? ` for ${affectedViewports.join(", ")}` : "";
  if (code === "image_readiness_exhausted") {
    return {
      message: `Image readiness remained unavailable${viewportLabel} after the bounded retry. The artifact was preserved but was not delivered.`,
      requiredAction:
        "Restore image or network readiness, then start a new run to retry browser verification.",
    };
  }
  if (code === "viewport_emulation_unavailable") {
    return {
      message: `The requested browser viewport/device evidence is unavailable${viewportLabel}. The artifact was preserved but was not delivered.`,
      requiredAction:
        "Restore browser viewport emulation, then start a new run to retry browser verification.",
    };
  }
  return {
    message: `Browser verification infrastructure is unavailable${viewportLabel}. The artifact was preserved but was not delivered.`,
    requiredAction:
      "Restore the browser verification runtime, then start a new run to retry verification.",
  };
}

function getArtifactChangeBlock(
  runState: AgentRunState,
  path: string,
  artifactDigest: string,
) {
  const state = runState.verificationState.get(path);
  const previousInspection = state?.browserMatrixInspection;
  const priorFailure =
    state?.lastVerificationFailed === true ||
    (previousInspection !== undefined &&
      hasArtifactBlockingIssue(previousInspection));
  if (
    !shouldBlockUnchangedArtifact({
      previousDigest: state?.artifactDigest,
      currentDigest: artifactDigest,
      previousFailed: priorFailure,
      infrastructureFailure:
        previousInspection !== undefined &&
        hasOnlyBrowserInfrastructureIssues(previousInspection),
    })
  ) {
    return undefined;
  }

  return {
    code: "artifact_unchanged_since_failed_verification",
    artifactDigest,
    message:
      "The JSX artifact is byte-for-byte unchanged since the previous failed verification. Apply a successful edit to the reported Section/Tool before rerunning verify_browser_matrix; review_candidate and done remain unavailable until that repair pass succeeds.",
  };
}

function issueRequiresArtifactChange(issue: unknown) {
  const code = normalizeInternalIssueCode(getIssueCode(issue) ?? "");
  return !(
    code === "verification_infrastructure_unavailable" ||
    code === "browser_image_loading_timed_out" ||
    code.endsWith("_budget_exhausted") ||
    code.includes("excellence_review_unavailable") ||
    code.includes("excellence_evidence_missing") ||
    code.includes("excellence_review_unreadable") ||
    code.includes("excellence_review_invalid")
  );
}

function updateRepairIssueHistory(
  runState: AgentRunState,
  inspection: BrowserMatrixInspection,
) {
  const verifiedViewports = Object.keys(inspection.viewports).filter(
    (viewport) =>
      !getInfrastructureBlockedViewportNames(inspection).includes(
        viewport as BrowserViewportName,
      ),
  );
  if (verifiedViewports.length === 0) return;

  const issueProgress = buildRepairIssueProgress({
    previous: runState.repairIssueHistory,
    issues: inspection.blockingIssues.filter((issue) => {
      const viewport = getStringProperty(issue, "viewport");
      return !viewport || verifiedViewports.includes(viewport);
    }),
    verifiedViewports,
  });
  runState.repairIssueHistory = issueProgress.snapshots;
}

function hasBrowserInfrastructureIssue(inspection: BrowserMatrixInspection) {
  return inspection.blockingIssues.some(isBrowserInfrastructureIssue);
}

function hasOnlyBrowserInfrastructureIssues(
  inspection: BrowserMatrixInspection,
) {
  return (
    inspection.blockingIssues.length > 0 &&
    inspection.blockingIssues.every(isBrowserInfrastructureIssue)
  );
}

function hasArtifactBlockingIssue(inspection: BrowserMatrixInspection) {
  return inspection.blockingIssues.some(
    (issue) => !isBrowserInfrastructureIssue(issue),
  );
}

function isBrowserInfrastructureIssue(issue: Record<string, unknown>) {
  return isBrowserInfrastructureIssueCode(getStringProperty(issue, "code"));
}

function getInfrastructureBlockedViewportNames(
  inspection: BrowserMatrixInspection,
) {
  return getInfrastructureBlockedViewports({
    issues: inspection.blockingIssues,
    availableViewports: Object.keys(
      inspection.viewports,
    ) as BrowserViewportName[],
  });
}

function selectAutomaticRepairViewports(
  inspection: BrowserMatrixInspection,
  selectedViewports: readonly BrowserViewportConfig[],
) {
  const blocked = new Set(getInfrastructureBlockedViewportNames(inspection));
  return selectedViewports.filter(
    (viewport) =>
      !blocked.has(viewport.name) && inspection.viewports[viewport.name],
  );
}

function scopeBrowserMatrixInspection(
  inspection: BrowserMatrixInspection,
  viewports: BrowserViewportName[],
) {
  const selected = new Set(viewports);
  const reports = Object.entries(inspection.viewports).flatMap(
    ([viewport, report]) =>
      selected.has(viewport as BrowserViewportName) && report ? [report] : [],
  );
  return buildBrowserMatrixInspectionFromReports({
    reports,
    mode: inspection.mode,
    artifactModifiedAt: inspection.artifactModifiedAt,
  });
}

function updateImageReadinessAttempts(
  runState: AgentRunState,
  artifactDigest: string,
  inspection: BrowserMatrixInspection,
) {
  const exhaustedViewports: BrowserViewportName[] = [];

  for (const [viewport, report] of Object.entries(inspection.viewports)) {
    const key = `${artifactDigest}:${viewport}`;
    const pending =
      report.imageLoading?.timedOut === true &&
      (report.imageLoading.pending ?? 0) > 0;

    if (!pending) {
      runState.imageReadinessAttempts.delete(key);
      continue;
    }

    const attempts = (runState.imageReadinessAttempts.get(key) ?? 0) + 1;
    runState.imageReadinessAttempts.set(key, attempts);
    if (attempts >= maxImageReadinessAttempts) {
      exhaustedViewports.push(viewport as BrowserViewportName);
    }
  }

  return exhaustedViewports;
}

function markImageReadinessRetryExhausted(
  inspection: BrowserMatrixInspection,
  exhaustedViewports: BrowserViewportName[],
): BrowserMatrixInspection {
  const exhausted = new Set(exhaustedViewports);

  return {
    ...inspection,
    blockingIssues: inspection.blockingIssues.map((issue) =>
      issue.code === "browser_image_loading_timed_out" &&
      exhausted.has(issue.viewport as BrowserViewportName)
        ? {
            ...issue,
            code: "browser_image_loading_retry_exhausted",
            attempts: maxImageReadinessAttempts,
          }
        : issue,
    ),
    repairFacts: inspection.repairFacts?.map((fact) => {
      const affectedViewports = Array.isArray(fact.affectedViewports)
        ? fact.affectedViewports
        : [];
      const applies = affectedViewports.some((viewport) =>
        exhausted.has(viewport as BrowserViewportName),
      );
      if (fact.code !== "browser-image-loading-retry" || !applies) {
        return fact;
      }

      return {
        ...fact,
        code: "browser-image-loading-blocked",
        attempts: maxImageReadinessAttempts,
      };
    }),
  };
}

async function runBrowserMatrixVerification({
  path,
  previewUrl,
  artifactModifiedAt,
  mode,
  viewports,
  captureScreenshots = mode === "final",
}: {
  path: string;
  previewUrl: string;
  artifactModifiedAt: number;
  mode: "repair" | "final";
  viewports: readonly BrowserViewportConfig[];
  captureScreenshots?: boolean;
}): Promise<BrowserMatrixInspection> {
  return siteRuntimeResources.browser.use(() =>
    runBrowserMatrixVerificationWithPermit({
      path,
      previewUrl,
      artifactModifiedAt,
      mode,
      viewports,
      captureScreenshots,
    }),
  );
}

async function runBrowserMatrixVerificationWithPermit({
  path,
  previewUrl,
  artifactModifiedAt,
  mode,
  viewports,
  captureScreenshots = mode === "final",
}: {
  path: string;
  previewUrl: string;
  artifactModifiedAt: number;
  mode: "repair" | "final";
  viewports: readonly BrowserViewportConfig[];
  captureScreenshots?: boolean;
}): Promise<BrowserMatrixInspection> {
  const matrixId = sourceDigest(`${path}:${artifactModifiedAt}:${mode}`).slice(
    0,
    12,
  );
  // monitorLog("browser_matrix.start", {
  //   matrixId,
  //   path,
  //   previewUrl,
  //   artifactModifiedAt,
  //   mode,
  //   viewports,
  //   captureScreenshots,
  // });

  const reports = await Promise.all(
    viewports.map(async (viewport): Promise<BrowserViewportReport> => {
      const pageLogContext = getBrowserToolLogContext({
        matrixId,
        viewport,
      });
      const serverResult = await getSharedChromeDevtoolsServer(viewport.name);

      if (!serverResult.ok) {
        return failedBrowserViewportReport({
          viewport,
          checkedAt: Date.now(),
          artifactModifiedAt,
          error: serverResult.error,
          infrastructureError: true,
        });
      }

      try {
        await getSharedBrowserMatrixPage(
          serverResult.server,
          viewport.name,
          pageLogContext,
        );
        await applyBrowserViewport(
          serverResult.server,
          viewport,
          pageLogContext,
        );
        await callBrowserToolWithLog(
          serverResult.server,
          "navigate_page",
          {
            type: "url",
            url: previewUrl,
            timeout: agentConfig.browser.navigationTimeoutMs,
          },
          { ...pageLogContext, scope: "browser_matrix" },
        );
        return runBrowserViewportVerification({
          server: serverResult.server,
          artifactModifiedAt,
          viewport,
          captureScreenshots,
          viewportAlreadyApplied: true,
          matrixId,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return failedBrowserViewportReport({
          viewport,
          checkedAt: Date.now(),
          artifactModifiedAt,
          error: errorMessage,
          infrastructureError: isBrowserInfrastructureError(errorMessage),
        });
      }
    }),
  );

  const inspection = buildBrowserMatrixInspectionFromReports({
    reports,
    mode,
    artifactModifiedAt,
  });

  // monitorLog("browser_matrix.end", {
  //   matrixId,
  //   ok: inspection.ok,
  //   blockingIssueCount: blockingIssues.length,
  // });

  return inspection;
}

function buildBrowserMatrixInspectionFromReports({
  reports,
  mode,
  artifactModifiedAt,
}: {
  reports: BrowserViewportReport[];
  mode: "repair" | "final";
  artifactModifiedAt: number;
}): BrowserMatrixInspection {
  const viewports = Object.fromEntries(
    reports.map((report) => [report.viewport, report]),
  ) as Partial<Record<BrowserViewportName, BrowserViewportReport>>;
  const blockingIssues = buildBrowserMatrixIssues(reports);
  const repairFacts = buildBrowserMatrixRepairFacts(reports);
  return {
    checkedAt: Date.now(),
    artifactModifiedAt,
    ok: blockingIssues.length === 0,
    mode,
    viewports,
    blockingIssues,
    ...(repairFacts.length > 0 ? { repairFacts } : {}),
  };
}

function selectBrowserViewports(
  mode: "repair" | "final",
  requestedViewports: BrowserViewportName[] | undefined,
  previousInspection?: BrowserMatrixInspection,
  pendingViewports?: BrowserViewportName[],
  forceAllViewports = false,
) {
  if (mode === "final") {
    return browserViewports;
  }

  const selectedNames = new Set(
    selectRepairViewportNames({
      all: browserViewportNames,
      requested: requestedViewports,
      affected: previousInspection
        ? getAffectedBrowserViewportNames(previousInspection)
        : undefined,
      pending: pendingViewports,
      forceAll: forceAllViewports,
    }),
  );
  return browserViewports.filter((viewport) =>
    selectedNames.has(viewport.name),
  );
}

function getAffectedBrowserViewportNames(
  inspection: BrowserMatrixInspection,
): BrowserViewportName[] {
  return getAffectedViewportNamesFromIssues(inspection.blockingIssues);
}

function getArtifactBlockingViewportNames(
  inspection: BrowserMatrixInspection,
): BrowserViewportName[] {
  return getAffectedViewportNamesFromIssues(
    inspection.blockingIssues.filter(
      (issue) => !isBrowserInfrastructureIssue(issue),
    ),
  );
}

function getAffectedViewportNamesFromIssues(
  issues: Array<Record<string, unknown>>,
): BrowserViewportName[] {
  const affected = new Set<BrowserViewportName>();

  for (const issue of issues) {
    const viewport = getStringProperty(issue, "viewport");
    if (isBrowserViewportName(viewport)) {
      affected.add(viewport);
    }

    for (const affectedViewport of getStringArrayProperty(
      issue,
      "affectedViewports",
    )) {
      if (isBrowserViewportName(affectedViewport)) {
        affected.add(affectedViewport);
      }
    }
  }

  return browserViewportNames.filter((viewport) => affected.has(viewport));
}

function isBrowserViewportName(
  value: string | undefined,
): value is BrowserViewportName {
  return browserViewportNames.some((viewport) => viewport === value);
}

export function buildStaticInspectionToolResult(
  staticInspection: InspectionRecord,
) {
  const issues = staticInspection.issues ?? [];
  const warnings = staticInspection.warnings ?? [];

  return omitUndefinedProperties({
    status: staticInspection.ok
      ? warnings.length > 0
        ? "passed_with_warnings"
        : "passed"
      : "failed",
    issues: issues.length > 0 ? issues : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  });
}

function buildCompactBrowserMatrixReport(
  inspection: BrowserMatrixInspection,
  issueContext?: {
    history: Map<string, VerificationIssueHistoryEntry>;
    artifactDigest: string;
  },
) {
  const repairFacts = inspection.repairFacts ?? [];
  const artifactRepairFacts = repairFacts.filter((fact) => {
    const sourceCodes = getStringArrayProperty(fact, "sourceCodes");
    return (
      sourceCodes.length === 0 ||
      sourceCodes.some((code) => !isOperationalBrowserIssueCode(code))
    );
  });
  const operationalIssues = inspection.blockingIssues.filter(
    isOperationalBrowserIssue,
  );
  const coveredSourceCodes = new Set(
    artifactRepairFacts.flatMap((fact) =>
      getStringArrayProperty(fact, "sourceCodes"),
    ),
  );
  const unrepresentedArtifactIssues = inspection.blockingIssues.filter(
    (issue) =>
      !isOperationalBrowserIssue(issue) &&
      !coveredSourceCodes.has(getStringProperty(issue, "code") ?? ""),
  );
  const fallbackRepairFacts = buildFallbackUnresolvedFacts(
    unrepresentedArtifactIssues,
  );
  const unresolvedIssues = projectUnresolvedIssues({
    facts: [...artifactRepairFacts, ...fallbackRepairFacts],
    viewports: buildRepairProjectionViewports(inspection),
  });

  const compactIssues = operationalIssues.length
    ? groupCompactBrowserMatrixIssues(operationalIssues).slice(
        0,
        maxModelBrowserIssues,
      )
    : [];
  const issues = issueContext
    ? structureVerificationIssues({
        issues: compactIssues,
        history: issueContext.history,
        artifactDigest: issueContext.artifactDigest,
      })
    : compactIssues;

  return omitUndefinedProperties({
    status: inspection.ok ? "passed" : "failed",
    viewports: summarizeBrowserMatrixViewports(inspection),
    issues: issues.length > 0 ? issues : undefined,
    unresolvedIssues,
  });
}

function buildRepairProjectionViewports(inspection: BrowserMatrixInspection) {
  return Object.fromEntries(
    browserViewportNames.flatMap((viewport) => {
      const report = inspection.viewports[viewport];
      return report
        ? [
            [
              viewport,
              {
                available: report.runtime.ok && !report.infrastructureError,
                sections: report.layout.sections,
              },
            ],
          ]
        : [];
    }),
  );
}

function buildFallbackUnresolvedFacts(issues: Array<Record<string, unknown>>) {
  return issues.map((issue) => {
    const compact = compactBrowserMatrixIssue(issue);
    const viewport = getStringProperty(compact, "viewport");
    const target = omitUndefinedProperties({
      sectionId: getStringProperty(compact, "sectionId"),
      sectionIndex: getNumberProperty(compact, "sectionIndex"),
      toolId: getStringProperty(compact, "toolId"),
      toolIndexInSection: getNumberProperty(compact, "toolIndexInSection"),
      dataSlot: getStringProperty(compact, "dataSlot"),
    });
    return omitUndefinedProperties({
      code: getStringProperty(compact, "code") ?? "unknown",
      affectedViewports: viewport ? [viewport] : undefined,
      scope:
        getStringProperty(target, "sectionId") ||
        getNumberProperty(target, "sectionIndex") !== undefined
          ? omitUndefinedProperties({
              sectionId: getStringProperty(target, "sectionId"),
              sectionIndex: getNumberProperty(target, "sectionIndex"),
            })
          : undefined,
      samples: [
        omitUndefinedProperties({
          viewport,
          target,
          issues: [getStringProperty(compact, "code") ?? "unknown"],
          context: compact,
        }),
      ],
    });
  });
}

function isOperationalBrowserIssue(issue: Record<string, unknown>) {
  const code = getStringProperty(issue, "code") ?? "";
  return isOperationalBrowserIssueCode(code);
}

function isOperationalBrowserIssueCode(code: string) {
  return (
    code === "verification_infrastructure_unavailable" ||
    code === "browser_image_loading_timed_out" ||
    code === "browser_image_loading_retry_exhausted" ||
    code === "browser_runtime_failed" ||
    code === "browser_mobile_emulation_failed" ||
    code === "browser_viewport_size_unknown" ||
    code === "browser_viewport_size_mismatch"
  );
}

function summarizeBrowserMatrixViewports(inspection: BrowserMatrixInspection) {
  return Object.fromEntries(
    Object.entries(inspection.viewports).map(([viewport, report]) => [
      viewport,
      report.runtime.ok && report.layout.ok ? "passed" : "failed",
    ]),
  );
}

function groupCompactBrowserMatrixIssues(
  issues: Array<Record<string, unknown>>,
) {
  const grouped = new Map<string, Record<string, unknown>>();

  for (const issue of issues) {
    const compactIssue = compactBrowserMatrixIssue(issue);
    const viewport = getStringProperty(compactIssue, "viewport");
    const { viewport: _viewport, ...issueWithoutViewport } = compactIssue;
    const groupKey = getBrowserMatrixIssueGroupKey(issueWithoutViewport);
    const existing = grouped.get(groupKey);
    const sample = buildBrowserMatrixIssueSample(compactIssue);

    if (!existing) {
      grouped.set(
        groupKey,
        omitUndefinedProperties({
          ...issueWithoutViewport,
          affectedViewports: viewport ? [viewport] : undefined,
          count: 1,
          samples: sample ? [sample] : undefined,
        }),
      );
      continue;
    }

    existing.count = sumNumericProperties(existing.count, 1);
    existing.affectedViewports = mergeStringArrays(
      getStringArrayProperty(existing, "affectedViewports"),
      viewport ? [viewport] : [],
    );

    if (sample) {
      existing.samples = mergeRecordArrays(
        getRecordArrayProperty(existing, "samples"),
        [sample],
      ).slice(0, 5);
    }
  }

  return [...grouped.values()];
}

function sumNumericProperties(left: unknown, right: unknown) {
  const sum =
    (typeof left === "number" ? left : 0) +
    (typeof right === "number" ? right : 0);
  return sum > 0 ? sum : undefined;
}

function mergeStringArrays(left: string[], right: string[]) {
  return [...new Set([...left, ...right])].slice(0, 6);
}

function getRecordArrayProperty(value: Record<string, unknown>, key: string) {
  const next = value[key];
  return Array.isArray(next)
    ? next.flatMap((item) => {
        const record = asRecord(item);
        return record ? [record] : [];
      })
    : [];
}

function mergeRecordArrays(
  left: Array<Record<string, unknown>>,
  right: Array<Record<string, unknown>>,
) {
  const records: Array<Record<string, unknown>> = [];
  const keys = new Set<string>();
  for (const record of [...left, ...right]) {
    const key = JSON.stringify(record);
    if (keys.has(key)) continue;
    keys.add(key);
    records.push(record);
  }
  return records;
}

function getBrowserMatrixIssueGroupKey(issue: Record<string, unknown>) {
  return JSON.stringify({
    code: issue.code,
    message: issue.message,
    dataSlot: issue.dataSlot,
    sectionId: issue.sectionId,
    toolId: issue.toolId,
    overlapTargets: getOverlapTargetKey(issue),
    gridOverflowTargets: getGridOverflowTargetKey(issue),
  });
}

function buildBrowserMatrixIssueSample(issue: Record<string, unknown>) {
  const sample = omitUndefinedProperties({
    viewport: issue.viewport,
    dataSlot: issue.dataSlot,
    sectionId: issue.sectionId,
    toolId: issue.toolId,
    overlapSamples: issue.overlapSamples,
    gridOverflowSamples: issue.gridOverflowSamples,
  });

  return Object.keys(sample).length > 0 ? sample : undefined;
}

function getOverlapTargetKey(issue: Record<string, unknown>) {
  const samples = Array.isArray(issue.overlapSamples)
    ? issue.overlapSamples
    : [];

  return samples.map((sample) => {
    const record = asRecord(sample);
    return {
      a: asRecord(record?.a),
      b: asRecord(record?.b),
    };
  });
}

function getGridOverflowTargetKey(issue: Record<string, unknown>) {
  const samples = Array.isArray(issue.gridOverflowSamples)
    ? issue.gridOverflowSamples
    : [];

  return samples.map((sample) => {
    const record = asRecord(sample);
    return {
      type: record?.type,
      container: asRecord(record?.container),
      tools: Array.isArray(record?.tools) ? record.tools : undefined,
    };
  });
}

function compactBrowserMatrixIssue(issue: Record<string, unknown>) {
  const overlapSamples = compactOverlapSamples(issue);
  const gridOverflowSamples = compactGridOverflowSamples(issue);
  const target = asRecord(issue.element) ?? asRecord(issue.image) ?? issue;
  const sectionId = getStringProperty(target, "sectionId");
  const sectionIndex = getNumberProperty(target, "sectionIndex");
  const toolId = getStringProperty(target, "toolId");
  const toolIndexInSection = getNumberProperty(target, "toolIndexInSection");

  return omitUndefinedProperties({
    code:
      typeof issue.code === "string"
        ? normalizeReportIssueCode(issue.code)
        : issue.code,
    viewport: issue.viewport,
    affectedViewports: issue.affectedViewports,
    message: typeof issue.message === "string" ? issue.message : undefined,
    requested: asRecord(issue.requested),
    actual: asRecord(issue.actual),
    dataSlot: getStringProperty(target, "dataSlot"),
    sectionId,
    sectionIndex: sectionId ? undefined : sectionIndex,
    toolId,
    toolIndexInSection: toolId ? undefined : toolIndexInSection,
    scope: issue.scope,
    a: compactModelTarget(asRecord(issue.a)),
    b: compactModelTarget(asRecord(issue.b)),
    regressionSeverity: issue.regressionSeverity,
    overlapSamples,
    gridOverflowSamples,
    samples: Array.isArray(issue.samples) ? issue.samples : undefined,
    severity: issue.severity,
    count: issue.uniqueFactCount === undefined ? issue.count : undefined,
    uniqueFactCount: issue.uniqueFactCount,
    occurrenceCount: issue.occurrenceCount,
  });
}

function compactOverlapSamples(issue: Record<string, unknown>) {
  if (!Array.isArray(issue.overlaps)) {
    return undefined;
  }

  return issue.overlaps.flatMap((value) => {
    const overlap = asRecord(value);
    if (!overlap) {
      return [];
    }

    return [
      {
        a: compactLayoutElementRef(overlap, "a"),
        b: compactLayoutElementRef(overlap, "b"),
        area: getNumberProperty(overlap, "area"),
      },
    ];
  });
}

function compactGridOverflowSamples(issue: Record<string, unknown>) {
  if (!Array.isArray(issue.gridAreaContainment)) {
    return undefined;
  }

  return issue.gridAreaContainment.flatMap((value) => {
    const overflow = asRecord(value);
    if (!overflow) {
      return [];
    }
    const containerRect = getRecordProperty(overflow, "containerRect");
    const overflowBy = getRecordProperty(overflow, "overflow");
    const type = getStringProperty(overflow, "type");
    const tools = compactGridOverflowTools(overflow, containerRect);

    return [
      omitUndefinedProperties({
        type,
        container: {
          dataSlot: getStringProperty(overflow, "dataSlot") ?? type,
          sectionId: getStringProperty(overflow, "sectionId"),
          toolId: getStringProperty(overflow, "toolId"),
        },
        tools: tools.length > 0 ? tools : undefined,
        overflow: overflowBy,
      }),
    ];
  });
}

function compactGridOverflowTools(
  overflow: Record<string, unknown>,
  containerRect: Record<string, unknown> | undefined,
) {
  const children = Array.isArray(overflow.children) ? overflow.children : [];

  return children.flatMap((value) => {
    const child = asRecord(value);
    const rect = getRecordProperty(child, "rect");

    if (!child || !rect || !doesRectOverflowContainer(rect, containerRect)) {
      return [];
    }

    return [
      omitUndefinedProperties({
        dataSlot: getStringProperty(child, "dataSlot"),
        toolId: getStringProperty(child, "toolId"),
      }),
    ];
  });
}

function compactLayoutElementRef(
  overlap: Record<string, unknown>,
  prefix: "a" | "b",
) {
  return omitUndefinedProperties({
    dataSlot: getStringProperty(overlap, `${prefix}DataSlot`),
    sectionId: getStringProperty(overlap, `${prefix}SectionId`),
    sectionIndex: getStringProperty(overlap, `${prefix}SectionId`)
      ? undefined
      : getNumberProperty(overlap, `${prefix}SectionIndex`),
    toolId: getStringProperty(overlap, `${prefix}ToolId`),
    toolIndexInSection: getStringProperty(overlap, `${prefix}ToolId`)
      ? undefined
      : getNumberProperty(overlap, `${prefix}ToolIndexInSection`),
    occurrenceInTool: getNumberProperty(overlap, `${prefix}SlotIndexInTool`),
  });
}

function compactModelTarget(target: Record<string, unknown> | undefined) {
  if (!target) return undefined;
  return omitUndefinedProperties({
    dataSlot: getStringProperty(target, "dataSlot"),
    sectionId: getStringProperty(target, "sectionId"),
    sectionIndex: getStringProperty(target, "sectionId")
      ? undefined
      : getNumberProperty(target, "sectionIndex"),
    toolId: getStringProperty(target, "toolId"),
    toolIndexInSection: getStringProperty(target, "toolId")
      ? undefined
      : getNumberProperty(target, "toolIndexInSection"),
    occurrenceInTool:
      getNumberProperty(target, "occurrenceInTool") ??
      getNumberProperty(target, "slotIndexInTool"),
  });
}

function doesRectOverflowContainer(
  rect: Record<string, unknown>,
  containerRect: Record<string, unknown> | undefined,
) {
  if (!containerRect) {
    return true;
  }

  const rectTop = getNumberProperty(rect, "top") ?? 0;
  const rectRight = getNumberProperty(rect, "right") ?? 0;
  const rectBottom = getNumberProperty(rect, "bottom") ?? 0;
  const rectLeft = getNumberProperty(rect, "left") ?? 0;
  const containerTop = getNumberProperty(containerRect, "top") ?? 0;
  const containerRight = getNumberProperty(containerRect, "right") ?? 0;
  const containerBottom = getNumberProperty(containerRect, "bottom") ?? 0;
  const containerLeft = getNumberProperty(containerRect, "left") ?? 0;

  return (
    rectTop < containerTop - 1 ||
    rectRight > containerRight + 1 ||
    rectBottom > containerBottom + 1 ||
    rectLeft < containerLeft - 1
  );
}

function omitUndefinedProperties(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, property]) => property !== undefined),
  );
}

function getBrowserToolLogContext({
  matrixId,
  viewport,
}: {
  matrixId: string;
  viewport: (typeof browserViewports)[number];
}) {
  return {
    matrixId,
    viewport: viewport.name,
  };
}

async function runBrowserViewportVerification({
  server,
  artifactModifiedAt,
  viewport,
  captureScreenshots,
  viewportAlreadyApplied = false,
  matrixId,
}: {
  server: MCPServerStdio;
  artifactModifiedAt: number;
  viewport: (typeof browserViewports)[number];
  captureScreenshots: boolean;
  viewportAlreadyApplied?: boolean;
  matrixId: string;
}): Promise<BrowserViewportReport> {
  const checkedAt = Date.now();
  const logContext = getBrowserToolLogContext({
    matrixId,
    viewport,
  });
  // monitorLog("browser_viewport.start", logContext);

  try {
    if (!viewportAlreadyApplied) {
      await applyBrowserViewport(server, viewport, logContext);
    }
    const renderRuntime = await waitForPreviewRender(server, logContext);
    const consoleResult = await callChromeToolSafely(
      server,
      "list_console_messages",
      {},
      logContext,
    );
    const runtime = buildBrowserRuntimeReport(renderRuntime, consoleResult);
    const imageLoading = await waitForImagesToSettle(server, logContext);
    const layoutResult = await callBrowserToolWithLog(
      server,
      "evaluate_script",
      {
        function: layoutInspectionScript.toString(),
      },
      logContext,
    );
    const layoutReport = parseLayoutReport(
      layoutResult as Array<{ [key: string]: unknown }>,
    );
    const actualViewport = readActualViewportFromLayoutReport(layoutReport);
    const viewportIssues = buildViewportSizeIssues(actualViewport, viewport);
    const layoutIssues = viewportIssues.length
      ? viewportIssues
      : collectLayoutHardFailures(
          layoutResult as Array<{ [key: string]: unknown }>,
        );
    const layoutSummary = buildLayoutInspectionSummary(layoutIssues);
    const layout = {
      ok: layoutIssues.length === 0,
      issues: layoutIssues,
      sections: layoutReport?.sections,
      ...(layoutSummary.repairFacts
        ? { repairFacts: layoutSummary.repairFacts }
        : {}),
    };
    const screenshotDataUrl =
      captureScreenshots && runtime.ok
        ? extractMcpImageDataUrl(
            await callBrowserToolWithLog(
              server,
              "take_screenshot",
              { fullPage: true, format: "jpeg", quality: 68 },
              logContext,
            ),
          )
        : undefined;
    if (screenshotDataUrl) {
      monitorLog("screenshot.capture", {
        ...logContext,
        bytes: Buffer.byteLength(screenshotDataUrl, "utf8"),
      });
      await persistEvaluationScreenshot(screenshotDataUrl, viewport.name);
    }
    const report: BrowserViewportReport = {
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      actualViewport,
      checkedAt: Date.now(),
      artifactModifiedAt,
      imageLoading,
      runtime,
      layout,
      screenshotDataUrl,
    };

    // monitorLog("browser_viewport.end", {
    //   ...logContext,
    //   ok: report.runtime.ok && report.layout.ok,
    // });
    return report;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const infrastructureError = isBrowserInfrastructureError(errorMessage);
    // monitorLog("browser_viewport.end", {
    //   ...logContext,
    //   ok: false,
    //   error,
    //   infrastructureError,
    // });
    return failedBrowserViewportReport({
      viewport,
      checkedAt,
      artifactModifiedAt,
      error: errorMessage,
      infrastructureError,
    });
  }
}

async function persistEvaluationScreenshot(
  screenshotDataUrl: string,
  viewport: BrowserViewportName,
) {
  const evidenceDir = agentConfig.logging.evaluationEvidenceDir;
  if (!evidenceDir) {
    return;
  }

  const match = screenshotDataUrl.match(
    /^data:image\/(jpeg|png);base64,(.+)$/s,
  );
  if (!match) {
    monitorLog("eval.evidence.error", {
      viewport,
      error: "Unsupported screenshot data URL.",
    });
    return;
  }

  const extension = match[1] === "jpeg" ? "jpg" : "png";
  const outputPath = join(evidenceDir, `${viewport}.${extension}`);

  try {
    await mkdir(evidenceDir, { recursive: true });
    await writeFile(outputPath, Buffer.from(match[2] ?? "", "base64"));
    monitorLog("eval.evidence.saved", { viewport, outputPath });
  } catch (error) {
    monitorLog("eval.evidence.error", { viewport, outputPath, error });
  }
}

async function applyBrowserViewport(
  server: MCPServerStdio,
  viewport: (typeof browserViewports)[number],
  logContext: ReturnType<typeof getBrowserToolLogContext>,
) {
  if (viewport.emulateViewport) {
    await callBrowserToolWithLog(
      server,
      "emulate",
      {
        viewport: viewport.emulateViewport,
      },
      logContext,
    );
    return;
  }

  // Device emulation is page-local but can survive navigation. Clear it
  // explicitly before using a desktop window resize so a prior mobile check
  // cannot leak touch/mobile viewport semantics into this report.
  await callBrowserToolWithLog(server, "emulate", {}, logContext);

  await callBrowserToolWithLog(
    server,
    "resize_page",
    {
      width: viewport.width,
      height: viewport.height,
    },
    logContext,
  );
}

async function waitForPreviewRender(
  server: MCPServerStdio,
  logContext: ReturnType<typeof getBrowserToolLogContext>,
) {
  for (
    let attempt = 0;
    attempt < agentConfig.browser.renderReadyMaxAttempts;
    attempt++
  ) {
    const result = await callBrowserToolWithLog(
      server,
      "evaluate_script",
      {
        function: browserRuntimeInspectionScript.toString(),
      },
      { ...logContext, waitAttempt: attempt },
    );
    const runtime = parseBrowserRuntimeReport(result);

    if (runtime && runtime.rootChildren > 0) {
      // monitorLog("browser_viewport.render_ready", {
      //   ...logContext,
      //   attempt,
      //   runtime,
      // });
      return runtime;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, agentConfig.browser.renderReadyPollIntervalMs),
    );
  }

  return null;
}

async function waitForImagesToSettle(
  server: MCPServerStdio,
  logContext: ReturnType<typeof getBrowserToolLogContext>,
) {
  const result = await callBrowserToolWithLog(
    server,
    "evaluate_script",
    {
      function: buildImageLoadingInspectionScript(imageLoadTimeoutMs),
    },
    logContext,
  );
  const imageLoading = parseImageLoadingReport(result);

  // if (
  //   imageLoading &&
  //   (imageLoading.broken > 0 ||
  //     imageLoading.pending > 0 ||
  //     imageLoading.timedOut)
  // ) {
  //   monitorLog("browser_viewport.images_ready", {
  //     ...logContext,
  //     broken: imageLoading.broken,
  //     pending: imageLoading.pending,
  //     timedOut: imageLoading.timedOut,
  //   });
  // }

  return imageLoading;
}

async function getSharedBrowserMatrixPage(
  server: MCPServerStdio,
  workerName: BrowserViewportName,
  logContext: ReturnType<typeof getBrowserToolLogContext>,
) {
  const runtimeKey = getBrowserRuntimeWorkerKey(workerName);
  const existingPageId = sharedBrowserMatrixPageIds.get(runtimeKey);
  if (existingPageId !== undefined) {
    try {
      await callBrowserToolWithLog(
        server,
        "select_page",
        { pageId: existingPageId },
        { ...logContext, scope: "browser_matrix" },
      );
      return existingPageId;
    } catch {
      sharedBrowserMatrixPageIds.delete(runtimeKey);
    }
  }

  try {
    const listedPages = await callBrowserToolWithLog(
      server,
      "list_pages",
      {},
      { ...logContext, scope: "browser_matrix" },
    );
    const listedPageId = getLastPageId(listedPages);
    if (listedPageId !== undefined) {
      await callBrowserToolWithLog(
        server,
        "select_page",
        { pageId: listedPageId },
        { ...logContext, scope: "browser_matrix" },
      );
      sharedBrowserMatrixPageIds.set(runtimeKey, listedPageId);
      return listedPageId;
    }
  } catch (error) {
    monitorLog("browser_matrix.page_discovery_failed", {
      workerName,
      error,
    });
  }

  const newPageResult = await callBrowserToolWithLog(
    server,
    "new_page",
    {
      url: "about:blank",
      timeout: agentConfig.browser.pageCreationTimeoutMs,
    },
    { ...logContext, scope: "browser_matrix" },
  );
  const pageId = getLastPageId(newPageResult);
  if (pageId === undefined) {
    throw new Error("Chrome DevTools created no selectable browser page.");
  }
  sharedBrowserMatrixPageIds.set(runtimeKey, pageId);
  return pageId;
}

async function callChromeToolSafely(
  server: MCPServerStdio,
  name: string,
  args: Record<string, unknown>,
  logContext: Record<string, unknown>,
) {
  try {
    return await callBrowserToolWithLog(server, name, args, logContext);
  } catch {
    return [];
  }
}

async function callBrowserToolWithLog(
  server: MCPServerStdio,
  toolName: string,
  args: Record<string, unknown>,
  logContext: Record<string, unknown>,
) {
  const startedAt = Date.now();
  try {
    const result = await server.callTool(toolName, args);
    return result;
  } catch (error) {
    monitorLog("browser_tool.error", {
      ...logContext,
      tool: toolName,
      durationMs: Date.now() - startedAt,
      error,
    });
    throw error;
  }
}

function getLastPageId(value: unknown) {
  return getPageIdsFromText(extractMcpText(value)).at(-1);
}

function getPageIdsFromText(text: string) {
  return Array.from(text.matchAll(/(?:^|\s)(\d+):\s/g), (match) =>
    Number(match[1]),
  ).filter((pageId) => Number.isFinite(pageId));
}

function failedBrowserViewportReport({
  viewport,
  checkedAt,
  artifactModifiedAt,
  error,
  infrastructureError = false,
}: {
  viewport: (typeof browserViewports)[number];
  checkedAt: number;
  artifactModifiedAt: number;
  error: string;
  infrastructureError?: boolean;
}): BrowserViewportReport {
  return {
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    checkedAt,
    artifactModifiedAt,
    runtime: {
      ok: false,
      errors: [error],
      rootChildren: 0,
      sectionCount: 0,
      imageCount: 0,
      dataSlotCount: 0,
    },
    layout: {
      ok: infrastructureError,
      issues: infrastructureError
        ? []
        : [
            {
              code: "browser_viewport_verification_failed",
              message: error,
            },
          ],
    },
    error,
    infrastructureError,
  };
}

function buildBrowserRuntimeReport(
  runtimeResult: unknown,
  consoleResult: unknown,
) {
  const runtime = parseBrowserRuntimeReport(runtimeResult) ?? {
    rootChildren: 0,
    sectionCount: 0,
    imageCount: 0,
    dataSlotCount: 0,
  };
  const consoleErrors = extractConsoleErrors(consoleResult);
  const errors = [
    ...("errors" in runtime && Array.isArray(runtime.errors)
      ? runtime.errors.map(String)
      : []),
    ...consoleErrors,
  ];

  return {
    ok: runtime.rootChildren > 0 && errors.length === 0,
    errors: errors.slice(0, maxModelRuntimeErrors),
    rootChildren: runtime.rootChildren,
    sectionCount: runtime.sectionCount,
    imageCount: runtime.imageCount,
    dataSlotCount: runtime.dataSlotCount,
  };
}

function readActualViewportFromLayoutReport(
  report: LayoutReport | null,
): BrowserActualViewport | undefined {
  const record = asRecord(report?.viewport);
  if (!record) {
    return undefined;
  }
  const innerWidth = getNumberProperty(record, "innerWidth");
  const innerHeight = getNumberProperty(record, "innerHeight");
  const clientWidth = getNumberProperty(record, "clientWidth");
  const clientHeight = getNumberProperty(record, "clientHeight");
  const devicePixelRatio = getNumberProperty(record, "devicePixelRatio");

  if (
    innerWidth === undefined ||
    innerHeight === undefined ||
    clientWidth === undefined ||
    clientHeight === undefined ||
    devicePixelRatio === undefined
  ) {
    return undefined;
  }

  return {
    innerWidth,
    innerHeight,
    clientWidth,
    clientHeight,
    visualViewportWidth: getNumberProperty(record, "visualViewportWidth"),
    visualViewportHeight: getNumberProperty(record, "visualViewportHeight"),
    devicePixelRatio,
  };
}

function parseBrowserRuntimeReport(value: unknown): {
  rootChildren: number;
  sectionCount: number;
  imageCount: number;
  dataSlotCount: number;
  errors?: unknown[];
} | null {
  if (isRuntimeReport(value)) {
    return value;
  }

  const parsed = unwrapRuntimeReport(tryParseJson(extractMcpText(value)));
  return parsed;
}

function unwrapRuntimeReport(
  value: unknown,
): ReturnType<typeof parseBrowserRuntimeReport> {
  if (isRuntimeReport(value)) {
    return value;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of ["result", "value", "data"]) {
    const nested = unwrapRuntimeReport(record[key]);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function isRuntimeReport(value: unknown): value is {
  rootChildren: number;
  sectionCount: number;
  imageCount: number;
  dataSlotCount: number;
  errors?: unknown[];
} {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { rootChildren?: unknown }).rootChildren === "number" &&
    typeof (value as { sectionCount?: unknown }).sectionCount === "number" &&
    typeof (value as { imageCount?: unknown }).imageCount === "number" &&
    typeof (value as { dataSlotCount?: unknown }).dataSlotCount === "number"
  );
}

function parseImageLoadingReport(
  value: unknown,
): ImageLoadingReport | undefined {
  const parsed = unwrapImageLoadingReport(tryParseJson(extractMcpText(value)));
  return parsed ?? undefined;
}

function unwrapImageLoadingReport(value: unknown): ImageLoadingReport | null {
  if (isImageLoadingReport(value)) {
    return value;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of ["result", "value", "data"]) {
    const nested = unwrapImageLoadingReport(record[key]);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function isImageLoadingReport(value: unknown): value is ImageLoadingReport {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { total?: unknown }).total === "number" &&
    typeof (value as { complete?: unknown }).complete === "number" &&
    typeof (value as { loaded?: unknown }).loaded === "number" &&
    typeof (value as { broken?: unknown }).broken === "number" &&
    typeof (value as { pending?: unknown }).pending === "number" &&
    typeof (value as { timedOut?: unknown }).timedOut === "boolean" &&
    typeof (value as { timeoutMs?: unknown }).timeoutMs === "number" &&
    typeof (value as { elapsedMs?: unknown }).elapsedMs === "number"
  );
}

function extractConsoleErrors(value: unknown) {
  return extractMcpText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) =>
      /\b(error|exception|referenceerror|typeerror)\b/i.test(line),
    )
    .filter((line) => !isIgnorableConsoleRuntimeMessage(line))
    .slice(0, maxModelRuntimeErrors);
}

function isIgnorableConsoleRuntimeMessage(line: string) {
  return [
    /\[vite\]\s+failed to connect to websocket/i,
    /WebSocket connection to 'ws:\/\/localhost:\d+\/\?token=.*ERR_CONNECTION_REFUSED/i,
    /Failed to send error to Vite server/i,
    /Uncaught \(in promise\) \(0 args\)/i,
    /\bFailed to load resource: the server responded with a status of 404 \(Not Found\) \(\d+ args\)$/i,
  ].some((pattern) => pattern.test(line));
}

function extractMcpText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractMcpText(item))
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") {
      return record.text;
    }
    if (typeof record.result === "string") {
      return record.result;
    }
    if (typeof record.value === "string") {
      return record.value;
    }
  }

  return "";
}

function extractMcpImageDataUrl(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const image = extractMcpImageDataUrl(item);
      if (image) return image;
    }
    return undefined;
  }

  const record = asRecord(value);
  if (!record) return undefined;

  if (
    record.type === "image" &&
    typeof record.data === "string" &&
    typeof record.mimeType === "string"
  ) {
    return `data:${record.mimeType};base64,${record.data}`;
  }

  for (const key of ["content", "result", "value", "data"]) {
    const image = extractMcpImageDataUrl(record[key]);
    if (image) return image;
  }

  return undefined;
}

function buildBrowserMatrixIssues(reports: BrowserViewportReport[]) {
  return reports.flatMap((report) => {
    const issues: Array<Record<string, unknown>> = [];

    if (report.infrastructureError) {
      issues.push({
        code: "verification_infrastructure_unavailable",
        viewport: report.viewport,
        width: report.width,
        message:
          report.error ??
          "Chrome DevTools MCP is unavailable, so browser evidence could not be collected.",
        runtime: report.runtime,
        nextActions: [
          "do not edit the JSX/CSS for this issue",
          "rerun verify_browser_matrix after Chrome DevTools MCP is available",
          "check the MCP command, Node runtime, package cache, and Chrome connection",
        ],
      });
      return issues;
    }

    if (!report.runtime.ok) {
      issues.push({
        code: "browser_runtime_failed",
        viewport: report.viewport,
        width: report.width,
        message:
          report.runtime.errors[0] ??
          "The preview did not render meaningful DOM for this viewport.",
        runtime: report.runtime,
      });
    }

    if (!report.layout.ok) {
      issues.push(
        ...report.layout.issues.map((issue) => ({
          ...issue,
          viewport: report.viewport,
          width: report.width,
        })),
      );
    }

    return issues;
  });
}

function buildBrowserMatrixRepairFacts(reports: BrowserViewportReport[]) {
  const facts = reports.flatMap((report) =>
    (report.layout.repairFacts ?? []).map((fact) => ({
      ...fact,
      viewport: report.viewport,
      samples: Array.isArray(fact.samples)
        ? fact.samples.map((sample) => ({
            ...(asRecord(sample) ?? {}),
            viewport: report.viewport,
          }))
        : undefined,
    })),
  );

  return compactBrowserMatrixRepairFacts(facts);
}

function createUpdateTodosTool(runState: AgentRunState) {
  return tool({
    name: "update_todos",
    description:
      "Track your task list for this run. Call it early for multi-step work. Each call sends the COMPLETE current state and replaces the previous list.",
    parameters: z.object({
      todos: z
        .array(
          z.object({
            name: z.string().trim().min(1).describe("Task description"),
            status: z
              .enum(["pending", "in_progress", "completed"])
              .describe("Current task status"),
          }),
        )
        .describe("The full list of todos"),
    }),
    execute({ todos }) {
      assertAgentRunActive(runState);
      const duplicateNames = findDuplicateNames(todos);
      if (duplicateNames.length > 0) {
        return {
          ok: false,
          error: "duplicate_todo_names",
          duplicateNames,
        };
      }

      runState.todos = sanitizeUserVisibleTodos(todos);
      runState.emitUserEvent?.({
        type: "todos",
        todos: runState.todos.map((todo) => ({ ...todo })),
      });

      return { ok: true };
    },
  });
}

function findDuplicateNames(todos: Array<{ name: string; status: string }>) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const todo of todos) {
    const normalized = todo.name.toLocaleLowerCase();

    if (seen.has(normalized)) {
      duplicates.add(todo.name);
    } else {
      seen.add(normalized);
    }
  }

  return [...duplicates];
}

function updateVerificationState(
  runState: AgentRunState,
  path: string,
  nextState: VerificationArtifactState,
) {
  runState.verificationState.set(path, {
    ...runState.verificationState.get(path),
    ...nextState,
  });
}

async function inspectStaticArtifactCached(
  runState: AgentRunState,
  path: string,
) {
  let source: string;
  try {
    const artifact = await registerPreviewArtifact(path, runState.workspaceDir);
    source = await readFile(artifact.hostPath, "utf8");
  } catch {
    return inspectStaticArtifact(path, undefined, runState.workspaceDir);
  }
  const digest = sourceDigest(source);
  const policyKey = [
    path === "/workspace/output" || path.startsWith("/workspace/output/")
      ? "output"
      : "outside",
    /\.(jsx|tsx)$/.test(path) ? "jsx" : "other",
  ].join(":");
  const cacheKey = `${policyKey}:${digest}`;
  const cached = runState.staticInspectionCache.get(cacheKey);

  if (cached) {
    return cached.inspection;
  }

  const inspection = await inspectStaticArtifact(
    path,
    source,
    runState.workspaceDir,
  );
  runState.staticInspectionCache.set(cacheKey, { inspection });
  return inspection;
}

async function inspectStaticArtifact(
  path: string,
  sourceOverride?: string,
  workspaceDir = paths.workspaceDir,
) {
  const checkedAt = Date.now();
  const issues: Array<{ code: string; message: string }> = [];

  if (path !== "/workspace/output" && !path.startsWith("/workspace/output/")) {
    issues.push({
      code: "outside_output_directory",
      message: "Final JSX artifacts must be saved under /workspace/output.",
    });
  }

  if (!/\.(jsx|tsx)$/.test(path)) {
    issues.push({
      code: "invalid_artifact_extension",
      message: "The final artifact must be a .jsx or .tsx file.",
    });
  }

  let source = sourceOverride ?? "";
  if (sourceOverride === undefined) {
    try {
      const artifact = await registerPreviewArtifact(path, workspaceDir);
      source = await readFile(artifact.hostPath, "utf8");
    } catch (error) {
      return {
        ok: false,
        checkedAt,
        issues: [
          ...issues,
          {
            code: "file_not_readable",
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  }

  if (!/\bexport\s+default\s+function\s+App\s*\(/.test(source)) {
    issues.push({
      code: "missing_default_app_export",
      message: "The artifact must export default function App().",
    });
  }

  if (/\bdangerouslySetInnerHTML\b/.test(source)) {
    issues.push({
      code: "dangerously_set_inner_html",
      message: "dangerouslySetInnerHTML is not allowed.",
    });
  }

  if (
    /<(?:div|span|section|p|img|button|a|ul|ol|li|main|header|footer|nav|form|input|textarea)(?:\s|>|\/)/.test(
      source,
    )
  ) {
    issues.push({
      code: "raw_html_element",
      message:
        "Raw HTML elements are not allowed; use the documented UI library components.",
    });
  }

  if (!/<Root(?:\s|>)/.test(source)) {
    issues.push({
      code: "missing_root",
      message: "The artifact must use Root as the page root.",
    });
  }

  if (!/<Section(?:\s|>)/.test(source)) {
    issues.push({
      code: "missing_section",
      message: "The artifact must use Section to partition page content.",
    });
  }

  for (const match of source.matchAll(/<Section\b([^>]*)>/g)) {
    if (!/\bheight\s*=/.test(match[1] ?? "")) {
      issues.push({
        code: "section_missing_explicit_height",
        message: "Every Section must include an explicit height prop.",
      });
      break;
    }
  }

  const importedComponentNames = new Set<string>();
  for (const match of source.matchAll(
    /import\s*\{([^}]+)\}\s*from\s*["']@\/components["']/g,
  )) {
    for (const part of match[1].split(",")) {
      const importedName = part
        .trim()
        .split(/\s+as\s+/)[0]
        ?.trim();

      if (importedName) {
        importedComponentNames.add(importedName);
      }
    }
  }

  for (const name of ["Root", "Section"]) {
    if (!importedComponentNames.has(name)) {
      issues.push({
        code: "missing_component_import",
        message: `Import ${name} from @/components.`,
      });
    }
  }

  for (const componentName of buildingComponents) {
    if (
      new RegExp(`<${componentName}(?:\\s|>|/)`).test(source) &&
      !importedComponentNames.has(componentName)
    ) {
      issues.push({
        code: "missing_component_import",
        message: `Import ${componentName} from @/components.`,
      });
    }
  }

  for (const componentName of overlayComponents) {
    if (
      new RegExp(`<${componentName}(?:\\s|>|/)`).test(source) &&
      !importedComponentNames.has(componentName)
    ) {
      issues.push({
        code: "missing_component_import",
        message: `Import ${componentName} from @/components.`,
      });
    }
  }

  issues.push(...inspectImageSizing(source));

  issues.push(...inspectComponentStructure(source));
  issues.push(
    ...inspectArtifactIds(source, buildingComponentSet, overlayComponentSet),
  );
  issues.push(...inspectViewportRelativeFontSizing(source));
  const warnings = inspectGridPlacementWarnings(source);
  issues.push(...inspectAntiSlopPatterns(source));

  return {
    ok: issues.length === 0,
    checkedAt,
    issues,
    warnings,
  };
}

function inspectImageSizing(source: string) {
  const issues: Array<{ code: string; message: string }> = [];
  const imageTags = Array.from(source.matchAll(/<Image\b([^>]*)>/g));

  imageTags.forEach((match, index) => {
    const openingTag = match[0];
    if (hasExplicitImageSize(openingTag)) {
      return;
    }

    issues.push({
      code: "image_missing_explicit_size",
      message: `Image #${index + 1} should include explicit width, height, or aspect-ratio sizing.`,
    });
  });

  return issues;
}

function hasExplicitImageSize(openingTag: string) {
  return /\b(?:w-|h-|aspect-|width\s*=|height\s*=)/.test(openingTag);
}

function inspectComponentStructure(source: string) {
  const issues: Array<{ code: string; message: string }> = [];
  const stack: string[] = [];
  const emitted = new Set<string>();
  const tagPattern = /<\/?([A-Z][A-Za-z0-9.]*)\b[^>]*\/?>/g;

  for (const match of source.matchAll(tagPattern)) {
    const raw = match[0];
    const componentName = (match[1] ?? "").split(".").pop() ?? "";
    const isClosing = raw.startsWith("</");
    const isSelfClosing = raw.endsWith("/>");

    if (isClosing) {
      const index = stack.lastIndexOf(componentName);
      if (index >= 0) {
        stack.length = index;
      }
      continue;
    }

    const parent = stack[stack.length - 1];
    if (
      componentName === "Section" &&
      stack.includes("Section") &&
      !emitted.has("nested_section")
    ) {
      issues.push({
        code: "nested_section",
        message: "Do not nest Section inside another Section.",
      });
      emitted.add("nested_section");
    }

    if (buildingComponentSet.has(componentName)) {
      if (
        parent !== "Section" &&
        !emitted.has("building_component_not_direct_section_child")
      ) {
        issues.push({
          code: "building_component_not_direct_section_child",
          message:
            "Building Components must be direct children of Section; do not wrap them in Root, custom components, or other Building Components.",
        });
        emitted.add("building_component_not_direct_section_child");
      }

      if (
        stack.some((name) => buildingComponentSet.has(name)) &&
        !emitted.has("nested_building_component")
      ) {
        issues.push({
          code: "nested_building_component",
          message:
            "Building Components must never be nested inside other Building Components.",
        });
        emitted.add("nested_building_component");
      }
    }

    if (
      overlayComponentSet.has(componentName) &&
      parent !== "Root" &&
      !emitted.has("overlay_not_direct_root_child")
    ) {
      issues.push({
        code: "overlay_not_direct_root_child",
        message: "Overlay components must be direct children of Root.",
      });
      emitted.add("overlay_not_direct_root_child");
    }

    if (!isSelfClosing) {
      stack.push(componentName);
    }
  }

  return issues;
}

function inspectGridPlacementWarnings(source: string) {
  const warnings: Array<{ code: string; message: string }> = [];
  const tagPattern = /<([A-Z][A-Za-z0-9.]*)\b([^>]*)>/g;
  const emitted = new Set<string>();

  for (const match of source.matchAll(tagPattern)) {
    const componentName = (match[1] ?? "").split(".").pop() ?? "";
    if (!buildingComponentSet.has(componentName)) {
      continue;
    }

    const openingTag = match[0];
    if (hasDynamicClassExpression(openingTag)) {
      continue;
    }

    const placement = extractGridPlacement(openingTag);
    const missing = [
      ["rowStart", "row-start-*"],
      ["rowEnd", "row-end-*"],
      ["columnStart", "col-start-*"],
      ["columnEnd", "col-end-*"],
    ].filter(([key]) => placement[key as keyof typeof placement] === undefined);

    if (
      missing.length > 0 &&
      !emitted.has("building_component_missing_grid_placement")
    ) {
      warnings.push({
        code: "building_component_missing_grid_placement",
        message: `Static inspection could not find complete row/column placement classes on ${componentName}. Runtime browser layout verification is authoritative.`,
      });
      emitted.add("building_component_missing_grid_placement");
    }

    if (
      placement.rowStart !== undefined &&
      placement.rowEnd !== undefined &&
      placement.rowEnd <= placement.rowStart &&
      !emitted.has("invalid_row_grid_placement")
    ) {
      warnings.push({
        code: "invalid_row_grid_placement",
        message: `${componentName} appears to have row-end less than or equal to row-start. Runtime browser layout verification is authoritative.`,
      });
      emitted.add("invalid_row_grid_placement");
    }

    if (
      placement.columnStart !== undefined &&
      placement.columnEnd !== undefined &&
      placement.columnEnd <= placement.columnStart &&
      !emitted.has("invalid_column_grid_placement")
    ) {
      warnings.push({
        code: "invalid_column_grid_placement",
        message: `${componentName} appears to have col-end less than or equal to col-start. Runtime browser layout verification is authoritative.`,
      });
      emitted.add("invalid_column_grid_placement");
    }
  }

  return warnings;
}

function hasDynamicClassExpression(source: string) {
  return (
    /\bclassName\s*=\s*\{/.test(source) || /\bclassNames\s*=\s*\{/.test(source)
  );
}

function extractGridPlacement(source: string) {
  const tokenText = Array.from(
    source.matchAll(
      /(?:^|[\s"'`{])(?:(?:[a-z0-9-]+):)*(?:row|col)-(?:start|end)-(?:\d+|\[\d+\])/g,
    ),
    (match) => match[0],
  ).join(" ");

  return {
    rowStart: extractPlacementNumber(tokenText, "row-start"),
    rowEnd: extractPlacementNumber(tokenText, "row-end"),
    columnStart: extractPlacementNumber(tokenText, "col-start"),
    columnEnd: extractPlacementNumber(tokenText, "col-end"),
  };
}

function extractPlacementNumber(source: string, token: string) {
  const match = new RegExp(
    "(?:^|[\\s\\\"'`{])(?:(?:[a-z0-9-]+):)*" +
      token +
      "-(?:\\[(\\d+)\\]|(\\d+))",
  ).exec(source);
  return match?.[1] || match?.[2] ? Number(match[1] ?? match[2]) : undefined;
}

function inspectAntiSlopPatterns(source: string) {
  const issues: Array<{ code: string; message: string }> = [];
  const emojiIconPattern =
    /(?:<(?:Text|Button|Card)\b[^>]*>|["'`]\s*)(?:[^"'`<]{0,40})[✨🚀🎯⚡🔥💡📈🎨🛡🌟💪🎉👋🙌✅⭐🏆]/u;

  if (emojiIconPattern.test(source)) {
    issues.push({
      code: "emoji_feature_icon",
      message:
        "Do not use emoji as feature or UI icons; use component styling or an approved icon asset instead.",
    });
  }

  if (
    /\b(?:lorem ipsum|dolor sit amet|placeholder text|sample content|feature (?:one|two|three|1|2|3))\b/i.test(
      source,
    )
  ) {
    issues.push({
      code: "placeholder_content",
      message:
        "Replace placeholder or lorem-style content with specific product copy before finishing.",
    });
  }

  if (
    /(?:#6366f1|#4f46e5|#4338ca|#3730a3|#8b5cf6|#7c3aed|#a855f7)/i.test(source)
  ) {
    issues.push({
      code: "ai_default_indigo",
      message:
        "Avoid default AI-looking indigo/violet accent hex values; use the active design system tokens or a more intentional palette.",
    });
  }

  return issues;
}

function collectLayoutHardFailures(result: Array<{ [key: string]: unknown }>) {
  const report = parseLayoutReport(result);
  if (!report) {
    return [
      {
        code: "layout_report_unreadable",
        message:
          "inspect_layout did not return a parseable layout report; rerun layout inspection before finishing.",
      },
    ];
  }

  const issues: Array<Record<string, unknown>> = [];
  const hasDocumentHorizontalOverflow = Boolean(
    report.document?.hasHorizontalOverflow,
  );

  if (hasDocumentHorizontalOverflow) {
    issues.push({
      code: "layout_horizontal_overflow",
      message: "The rendered document has horizontal overflow.",
      document: report.document,
      viewport: report.viewport,
    });
  }

  for (const element of report.elements ?? []) {
    const elementIssues = Array.isArray(element?.issues) ? element.issues : [];
    const blocking = elementIssues.filter((issue) =>
      isBlockingElementLayoutIssue(element, String(issue)),
    );

    if (blocking.length > 0) {
      issues.push({
        code: "layout_element_issue",
        message: `A rendered element has blocking layout issues: ${blocking.join(", ")}.`,
        element,
      });
    }
  }

  for (const image of report.images ?? []) {
    const imageIssues = Array.isArray(image?.issues) ? image.issues : [];
    const blocking = imageIssues.filter((issue) =>
      isBlockingImageLayoutIssue(image, String(issue)),
    );

    if (blocking.includes("pending-image")) {
      issues.push({
        code: "browser_image_loading_timed_out",
        message:
          "A relevant image was still loading when browser readiness timed out.",
        image: {
          ...image,
          issues: ["pending-image"],
        },
      });
    }

    const artifactBlocking = blocking.filter(
      (issue) => issue !== "pending-image",
    );
    if (artifactBlocking.length > 0) {
      issues.push({
        code: "layout_image_issue",
        message: `An image has blocking layout issues: ${artifactBlocking.join(", ")}.`,
        image: {
          ...image,
          issues: artifactBlocking,
        },
      });
    }
  }

  const blockingGridAreaContainment = (report.gridAreaContainment ?? []).filter(
    isBlockingGridAreaContainment,
  );

  if (blockingGridAreaContainment.length > 0) {
    issues.push({
      code: "layout_grid_area_containment",
      message:
        "Section or tool content exceeds its assigned GridArea containment.",
      gridAreaContainment: blockingGridAreaContainment,
    });
  }

  const blockingOverlaps = (report.overlaps ?? []).filter(isBlockingOverlap);

  if (blockingOverlaps.length > 0) {
    issues.push({
      code: "layout_unintended_overlap",
      message:
        "Visible sibling elements overlap. If this was intentional, adjust the artifact so the overlap is explicit and non-destructive.",
      overlaps: blockingOverlaps,
    });
  }

  return issues;
}

function buildLayoutInspectionSummary(
  layoutIssues: Array<Record<string, unknown>>,
) {
  const repairFacts = buildLayoutRepairFacts(layoutIssues);
  const summary: {
    verification: {
      ok: boolean;
      issues: Array<Record<string, unknown>>;
    };
    repairFacts?: Array<Record<string, unknown>>;
  } = {
    verification: {
      ok: layoutIssues.length === 0,
      issues: layoutIssues,
    },
  };

  if (repairFacts.length > 0) {
    summary.repairFacts = repairFacts;
  }

  return summary;
}

function isBlockingElementLayoutIssue(
  element: { issues?: unknown[]; [key: string]: unknown },
  issue: string,
) {
  const computed = getRecordProperty(element, "computed");

  if (computed?.hiddenByCarouselViewport === true) {
    return false;
  }

  if (issue === "zero-size") {
    return !isHiddenComputedStyle(computed);
  }

  if (issue === "empty-action") {
    return !isHiddenComputedStyle(computed);
  }

  if (
    issue === "low-text-contrast" ||
    issue === "empty-visible-tool" ||
    issue === "section-excessive-unused-space"
  ) {
    return !isHiddenComputedStyle(computed);
  }

  if (isExpectedCarouselInternalHorizontalIssue(element, issue)) {
    return false;
  }

  if (issue === "text-overflow-y") {
    return isStrictTextOverflowY(element);
  }

  return [
    "outside-viewport-x",
    "text-overflow-x",
    "clipped-content-x",
    "clipped-content-y",
  ].includes(issue);
}

function isBlockingImageLayoutIssue(
  image: { issues?: unknown[]; [key: string]: unknown },
  issue: string,
) {
  if (isHiddenComputedStyle(getRecordProperty(image, "computed"))) {
    return false;
  }

  if (
    issue === "missing-alt" ||
    issue === "broken-image" ||
    issue === "pending-image"
  ) {
    return true;
  }

  if (issue === "distorted-aspect-ratio") {
    return !isObjectFitImage(image);
  }

  return false;
}

function isBlockingGridAreaContainment(value: unknown) {
  const record = asRecord(value);
  if (!record) {
    return true;
  }

  const dataSlot = getStringProperty(record, "dataSlot");
  const selector = getStringProperty(record, "selector");

  return !isCarouselSlot(dataSlot) && !isCarouselSelector(selector);
}

function isBlockingOverlap(value: unknown) {
  const record = asRecord(value);
  if (!record) {
    return true;
  }

  return isBlockingOverlapRecord(record);
}

function isObjectFitImage(image: { [key: string]: unknown }) {
  const computed = getRecordProperty(image, "computed");
  const objectFit = getStringProperty(computed, "objectFit");

  return objectFit === "cover" || objectFit === "contain";
}

function isStrictTextOverflowY(element: { [key: string]: unknown }) {
  const computed = getRecordProperty(element, "computed");
  const metrics = getRecordProperty(element, "metrics");

  const scrollHeight = getNumberProperty(metrics, "scrollHeight");
  const clientHeight = getNumberProperty(metrics, "clientHeight");
  if (scrollHeight === undefined || clientHeight === undefined) {
    return false;
  }

  const lineHeight = parseNumericCssValue(
    getStringProperty(computed, "lineHeight"),
  );
  const threshold = Math.max(6, (lineHeight ?? 0) * 0.25);

  return scrollHeight - clientHeight > threshold;
}

function isHiddenComputedStyle(record: Record<string, unknown> | undefined) {
  return (
    getStringProperty(record, "display") === "none" ||
    getStringProperty(record, "visibility") === "hidden" ||
    getStringProperty(record, "opacity") === "0" ||
    record?.hiddenByAncestor === true ||
    record?.hiddenByCarouselViewport === true
  );
}

function isCarouselSlot(value: string | undefined) {
  return value === "carousel" || value?.startsWith("carousel-") === true;
}

function isCarouselSelector(value: string | undefined) {
  return value?.includes('data-slot="carousel') === true;
}

function getRecordProperty(
  value: Record<string, unknown> | undefined,
  key: string,
) {
  return asRecord(value?.[key]);
}

function getStringProperty(
  value: Record<string, unknown> | undefined,
  key: string,
) {
  const next = value?.[key];
  return typeof next === "string" ? next : undefined;
}

function getNumberProperty(
  value: Record<string, unknown> | undefined,
  key: string,
) {
  const next = value?.[key];
  return typeof next === "number" ? next : undefined;
}

function getStringArrayProperty(
  value: Record<string, unknown> | undefined,
  key: string,
) {
  const next = value?.[key];
  return Array.isArray(next)
    ? next.filter((item): item is string => typeof item === "string")
    : [];
}

function parseNumericCssValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

type LayoutReport = {
  viewport?: unknown;
  document?: {
    hasHorizontalOverflow?: boolean;
    [key: string]: unknown;
  };
  elements?: Array<{ issues?: unknown[]; [key: string]: unknown }>;
  images?: Array<{ issues?: unknown[]; [key: string]: unknown }>;
  overlaps?: unknown[];
  gridAreaContainment?: unknown[];
  sections?: Array<Record<string, unknown>>;
};

function parseLayoutReport(
  result: Array<{ [key: string]: unknown }>,
): LayoutReport | null {
  for (const item of result) {
    if (typeof item.text !== "string") {
      continue;
    }

    const text = item.text.trim();
    const parsed = unwrapLayoutReport(tryParseJson(text));
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function unwrapLayoutReport(value: unknown): LayoutReport | null {
  if (isLayoutReport(value)) {
    return value;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of ["result", "value", "data"]) {
    const nested = unwrapLayoutReport(record[key]);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function isLayoutReport(value: unknown): value is LayoutReport {
  return (
    typeof value === "object" &&
    value !== null &&
    "document" in value &&
    "elements" in value &&
    "images" in value
  );
}

function browserRuntimeInspectionScript() {
  const win = globalThis as any;
  const doc = win.document;
  const root = doc.getElementById("root");

  return {
    rootChildren: root?.children.length ?? 0,
    sectionCount: doc.querySelectorAll('[data-slot="section"]').length,
    imageCount: doc.images.length,
    dataSlotCount: doc.querySelectorAll("[data-slot]").length,
    errors: Array.from(
      doc.querySelectorAll("vite-error-overlay, [plugin], pre"),
    )
      .map((node: any) => (node.innerText || node.textContent || "").trim())
      .filter(Boolean)
      .slice(0, 5),
  };
}

function buildImageLoadingInspectionScript(timeoutMs: number) {
  return `async function imageLoadingInspectionScript() {
    const timeoutMs = ${JSON.stringify(timeoutMs)};
    const startedAt = Date.now();

    function isHiddenCarouselImage(img) {
      const item = img.closest('[data-slot="carousel-item"]');
      const root = item?.closest('[data-slot="carousel"]');
      if (!item || !root) return false;

      const rect = img.getBoundingClientRect();
      let parent = item.parentElement;
      while (parent && parent !== root) {
        const style = getComputedStyle(parent);
        const clipsX = ["hidden", "clip", "auto"].includes(style.overflowX);
        const clipsY = ["hidden", "clip", "auto"].includes(style.overflowY);
        if (clipsX || clipsY) {
          const clipRect = parent.getBoundingClientRect();
          const visibleWidth = clipsX
            ? Math.max(0, Math.min(rect.right, clipRect.right) - Math.max(rect.left, clipRect.left))
            : rect.width;
          const visibleHeight = clipsY
            ? Math.max(0, Math.min(rect.bottom, clipRect.bottom) - Math.max(rect.top, clipRect.top))
            : rect.height;
          if (visibleWidth <= 1 || visibleHeight <= 1) return true;
        }
        parent = parent.parentElement;
      }
      return false;
    }

    function relevantImages() {
      return Array.from(document.images).filter((img) => !isHiddenCarouselImage(img));
    }

    function summarize(timedOut) {
      const images = relevantImages();
      const complete = images.filter((img) => img.complete).length;
      const broken = images.filter(
        (img) => img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0),
      ).length;

      return {
        total: images.length,
        complete,
        loaded: images.filter(
          (img) => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0,
        ).length,
        broken,
        pending: images.length - complete,
        timedOut,
        timeoutMs,
        elapsedMs: Date.now() - startedAt,
      };
    }

    while (Date.now() - startedAt < timeoutMs) {
      const images = relevantImages();

      if (images.every((img) => img.complete)) {
        return summarize(false);
      }

      const pending = images
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              const done = () => {
                img.removeEventListener("load", done);
                img.removeEventListener("error", done);
                resolve(undefined);
              };
              img.addEventListener("load", done, { once: true });
              img.addEventListener("error", done, { once: true });
            }),
        );
      const remainingMs = Math.max(0, timeoutMs - (Date.now() - startedAt));
      const timeout = new Promise((resolve) => {
        setTimeout(() => resolve("timeout"), Math.min(remainingMs, 1_000));
      });

      await Promise.race([
        Promise.allSettled(pending).then(() => "settled"),
        timeout,
      ]);
    }

    return summarize(true);
  }`;
}

function layoutInspectionScript() {
  const win = globalThis as any;
  const doc = win.document;
  const scrolling = doc.scrollingElement || doc.documentElement;
  const viewportWidth =
    doc.documentElement.clientWidth ||
    win.visualViewport?.width ||
    win.innerWidth;
  const viewportHeight =
    doc.documentElement.clientHeight ||
    win.visualViewport?.height ||
    win.innerHeight;
  const report: {
    viewport: {
      width: number;
      height: number;
      innerWidth: number;
      innerHeight: number;
      clientWidth: number;
      clientHeight: number;
      visualViewportWidth?: number;
      visualViewportHeight?: number;
      devicePixelRatio: number;
    };
    document: {
      scrollWidth: number;
      scrollHeight: number;
      clientWidth: number;
      clientHeight: number;
      rawHasHorizontalOverflow: boolean;
      hasHorizontalOverflow: boolean;
      hasVerticalOverflow: boolean;
    };
    elements: unknown[];
    sections: unknown[];
    overlaps: unknown[];
    images: unknown[];
    gridAreaContainment: unknown[];
  } = {
    viewport: {
      width: viewportWidth,
      height: viewportHeight,
      innerWidth: win.innerWidth,
      innerHeight: win.innerHeight,
      clientWidth: doc.documentElement.clientWidth,
      clientHeight: doc.documentElement.clientHeight,
      visualViewportWidth: win.visualViewport?.width,
      visualViewportHeight: win.visualViewport?.height,
      devicePixelRatio: win.devicePixelRatio,
    },
    document: {
      scrollWidth: scrolling.scrollWidth,
      scrollHeight: scrolling.scrollHeight,
      clientWidth: scrolling.clientWidth,
      clientHeight: scrolling.clientHeight,
      rawHasHorizontalOverflow:
        scrolling.scrollWidth > scrolling.clientWidth + 1,
      hasHorizontalOverflow: false,
      hasVerticalOverflow: scrolling.scrollHeight > scrolling.clientHeight + 1,
    },
    elements: [],
    sections: [],
    overlaps: [],
    images: [],
    gridAreaContainment: [],
  };

  const nodes = Array.from(
    doc.querySelectorAll(
      "[data-slot], img, button, a, input, textarea, [role]",
    ),
  ) as any[];

  function rectToObject(rect: any) {
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    };
  }

  function sectionGridMetricsFor(el: any) {
    const section =
      el?.getAttribute?.("data-slot") === "section"
        ? el
        : el?.closest?.('[data-slot="section"]');
    if (!section) return undefined;
    const rect = section.getBoundingClientRect();
    const style = win.getComputedStyle(section);
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const paddingRight = Number.parseFloat(style.paddingRight) || 0;
    const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
    const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
    const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
    const borderRight = Number.parseFloat(style.borderRightWidth) || 0;
    const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0;
    const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
    const rowTracks = resolvedPixelTracks(style.gridTemplateRows);
    const columnTracks = resolvedPixelTracks(style.gridTemplateColumns);
    const rowTrackSizes = rowTracks.sizes;
    const columnTrackSizes = columnTracks.sizes;
    const uniformRowTrackSize = uniformTrackSize(rowTrackSizes);
    const uniformColumnTrackSize = uniformTrackSize(columnTrackSizes);
    return {
      rows: rowTracks.status === "resolved" ? rowTrackSizes.length : undefined,
      columns:
        columnTracks.status === "resolved"
          ? columnTrackSizes.length
          : undefined,
      width: rect.width,
      height: rect.height,
      borderBoxWidth: rect.width,
      borderBoxHeight: rect.height,
      contentWidth: Math.max(
        0,
        section.clientWidth - paddingLeft - paddingRight,
      ),
      contentHeight: Math.max(
        0,
        section.clientHeight - paddingTop - paddingBottom,
      ),
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      borderTop,
      borderRight,
      borderBottom,
      borderLeft,
      rowGap: Number.parseFloat(style.rowGap) || 0,
      columnGap: Number.parseFloat(style.columnGap) || 0,
      gridTemplateRows: style.gridTemplateRows,
      gridTemplateColumns: style.gridTemplateColumns,
      rowTrackParsing: rowTracks.status,
      columnTrackParsing: columnTracks.status,
      rowTrackSizes,
      columnTrackSizes,
      uniformRowTrackSize,
      uniformColumnTrackSize,
      // Kept for the deterministic repairer while every row is uniform.
      trackSize: uniformRowTrackSize,
      authored: authoredSectionGridFor(section),
    };
  }

  function resolvedPixelTracks(template: string) {
    if (!template || template === "none") {
      return { sizes: [], status: "unavailable" };
    }
    const simpleRepeat = template.match(
      /^repeat\(\s*(\d+)\s*,\s*(-?\d+(?:\.\d+)?)px\s*\)$/,
    );
    if (simpleRepeat) {
      const count = Number.parseInt(simpleRepeat[1] || "0", 10);
      const size = Number.parseFloat(simpleRepeat[2] || "0");
      return {
        sizes: Array.from({ length: count }, () => size),
        status: "resolved",
      };
    }
    const withoutLineNames = template.replace(/\[[^\]]*\]/g, " ").trim();
    const tokens = withoutLineNames.split(/\s+/).filter(Boolean);
    if (
      tokens.length === 0 ||
      tokens.some((token) => !/^-?\d+(?:\.\d+)?px$/.test(token))
    ) {
      return { sizes: [], status: "ambiguous" };
    }
    return {
      sizes: tokens.map((token) => Number.parseFloat(token)),
      status: "resolved",
    };
  }

  function authoredSectionGridFor(section: any) {
    const style = section.style;
    return {
      source: "active-inline-style",
      rows: authoredTrackCount(style.gridTemplateRows),
      columns: authoredTrackCount(style.gridTemplateColumns),
      height: finiteCssPixels(style.height),
      width: finiteCssPixels(style.width),
      rowGap: finiteCssPixels(style.rowGap),
      columnGap: finiteCssPixels(style.columnGap),
      gridTemplateRows: style.gridTemplateRows || undefined,
      gridTemplateColumns: style.gridTemplateColumns || undefined,
    };
  }

  function authoredTrackCount(template: string) {
    const repeat = template?.match(/^repeat\(\s*(\d+)\s*,/);
    if (repeat) return Number.parseInt(repeat[1] || "0", 10);
    const parsed = resolvedPixelTracks(template);
    return parsed.status === "resolved" ? parsed.sizes.length : undefined;
  }

  function finiteCssPixels(value: string) {
    if (!value || !/^-?\d+(?:\.\d+)?px$/.test(value.trim())) return undefined;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function uniformTrackSize(trackSizes: number[]) {
    if (trackSizes.length === 0) return undefined;
    const first = trackSizes[0]!;
    return trackSizes.every((size) => Math.abs(size - first) <= 0.5)
      ? first
      : undefined;
  }

  function gridAreaFor(el: any) {
    const style = win.getComputedStyle(el);
    return {
      rowStart: gridLineNumber(style.gridRowStart),
      rowEnd: gridLineNumber(style.gridRowEnd),
      columnStart: gridLineNumber(style.gridColumnStart),
      columnEnd: gridLineNumber(style.gridColumnEnd),
    };
  }

  function gridLineNumber(value: string) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function selectorFor(el: any) {
    return el.getAttribute("data-slot")
      ? `[data-slot="${el.getAttribute("data-slot")}"]`
      : el.tagName.toLowerCase();
  }

  function elementPathFor(el: any) {
    const parts: string[] = [];
    let current: any = el;

    while (current && current !== doc.body && current !== doc.documentElement) {
      const slot = current.getAttribute("data-slot");
      const tag = current.tagName.toLowerCase();
      const sameTagSiblings = current.parentElement
        ? Array.from(current.parentElement.children).filter(
            (child: any) => child.tagName === current.tagName,
          )
        : [];
      const nth =
        sameTagSiblings.length > 1
          ? `:nth-of-type(${sameTagSiblings.indexOf(current) + 1})`
          : "";

      parts.push(slot ? `${tag}[data-slot="${slot}"]${nth}` : `${tag}${nth}`);
      current = current.parentElement;
    }

    return parts.reverse().slice(-6).join(" > ");
  }

  function slotIndexFor(el: any) {
    const slot = el.getAttribute("data-slot");
    if (!slot) {
      return undefined;
    }

    return (
      Array.from(doc.querySelectorAll(`[data-slot="${slot}"]`)).indexOf(el) + 1
    );
  }

  function indexInParentFor(el: any) {
    const parent = el.parentElement;
    if (!parent) {
      return undefined;
    }

    const slot = el.getAttribute("data-slot");
    const siblings = Array.from(parent.children).filter((child: any) =>
      slot
        ? child.getAttribute("data-slot") === slot
        : child.tagName === el.tagName,
    );

    return siblings.indexOf(el) + 1;
  }

  function sectionIndexFor(el: any) {
    const section =
      el.getAttribute("data-slot") === "section"
        ? el
        : el.closest('[data-slot="section"]');

    return section ? slotIndexFor(section) : undefined;
  }

  function sectionIdFor(el: any) {
    const section =
      el.getAttribute("data-slot") === "section"
        ? el
        : el.closest('[data-slot="section"]');
    return section?.getAttribute("id") || undefined;
  }

  function sectionToolFor(el: any) {
    const section =
      el.getAttribute("data-slot") === "section"
        ? el
        : el.closest('[data-slot="section"]');

    if (!section || el === section) {
      return undefined;
    }

    let current = el;
    while (current?.parentElement && current.parentElement !== section) {
      current = current.parentElement;
    }

    return current?.parentElement === section ? current : undefined;
  }

  function visibleSectionTools(section: any) {
    return (Array.from(section.children) as any[]).filter(isVisibleElement);
  }

  function toolIndexInSectionFor(el: any) {
    const tool = sectionToolFor(el);
    const section = tool?.parentElement;

    if (!tool || !section) {
      return undefined;
    }

    return visibleSectionTools(section).indexOf(tool) + 1;
  }

  function toolIdFor(el: any) {
    return sectionToolFor(el)?.getAttribute("id") || undefined;
  }

  function slotIndexInToolFor(el: any) {
    const tool = sectionToolFor(el);
    const slot = el.getAttribute("data-slot");

    if (!tool || !slot) {
      return undefined;
    }

    const matchingSlots = Array.from(
      tool.querySelectorAll(`[data-slot="${slot}"]`),
    );
    const index = matchingSlots.indexOf(el);
    return index >= 0 ? index + 1 : undefined;
  }

  function isCarouselDataSlot(value: string | null | undefined) {
    return value === "carousel" || value?.startsWith("carousel-") === true;
  }

  function isCarouselOverlapBackgroundSlot(value: string | null | undefined) {
    return [
      "carousel",
      "carousel-content",
      "carousel-item",
      "carousel-item-img",
    ].includes(value ?? "");
  }

  function isNavbarDataSlot(value: string | null | undefined) {
    return value === "navbar" || value?.startsWith("navbar-") === true;
  }

  function isCarouselInternalContextRecord(record: {
    dataSlot?: string;
    ancestorSlots?: string[];
  }) {
    if (record.dataSlot === "carousel") {
      return false;
    }

    return (
      isCarouselDataSlot(record.dataSlot) ||
      (record.ancestorSlots ?? []).some(isCarouselDataSlot)
    );
  }

  function getAncestorDataSlots(el: any) {
    const slots: string[] = [];
    let parent = el.parentElement;

    while (parent && parent !== doc.body && parent !== doc.documentElement) {
      const slot = parent.getAttribute("data-slot");

      if (slot) {
        slots.push(slot);
      }

      parent = parent.parentElement;
    }

    return slots.slice(0, 8);
  }

  function closestDataSlotElement(
    el: any,
    predicate: (value: string | null | undefined) => boolean,
  ) {
    let current: any = el;

    while (current && current !== doc.body && current !== doc.documentElement) {
      if (predicate(current.getAttribute("data-slot"))) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  function containsDataSlot(
    el: any,
    predicate: (value: string | null | undefined) => boolean,
  ) {
    const descendants = Array.from(el.querySelectorAll("[data-slot]")) as any[];

    return descendants.some((descendant) =>
      predicate(descendant.getAttribute("data-slot")),
    );
  }

  function isInStickyNavLayer(el: any) {
    let current: any = el;

    while (current && current !== doc.body && current !== doc.documentElement) {
      const style = win.getComputedStyle(current);

      if (style.position === "sticky" || style.position === "fixed") {
        const slot = current.getAttribute("data-slot");

        return (
          isNavbarDataSlot(slot) ||
          closestDataSlotElement(current, isNavbarDataSlot) !== null ||
          containsDataSlot(current, isNavbarDataSlot)
        );
      }

      current = current.parentElement;
    }

    return false;
  }

  function isVisibleElement(el: any) {
    const rect = el.getBoundingClientRect();
    const style = win.getComputedStyle(el);

    return (
      rect.width > 1 &&
      rect.height > 1 &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity) !== 0
    );
  }

  function isHiddenByAncestor(el: any) {
    let parent = el.parentElement;

    while (parent && parent !== doc.body && parent !== doc.documentElement) {
      const parentStyle = win.getComputedStyle(parent);

      if (
        parentStyle.display === "none" ||
        parentStyle.visibility === "hidden" ||
        Number(parentStyle.opacity) === 0
      ) {
        return true;
      }

      parent = parent.parentElement;
    }

    return false;
  }

  function isHiddenByCarouselViewport(el: any) {
    const carouselItem = closestDataSlotElement(
      el,
      (value) => value === "carousel-item",
    );
    const carouselRoot = carouselItem
      ? closestDataSlotElement(carouselItem, (value) => value === "carousel")
      : null;

    if (!carouselItem || !carouselRoot) {
      return false;
    }

    const rect = el.getBoundingClientRect();
    let parent = carouselItem.parentElement;

    while (parent && parent !== carouselRoot) {
      const style = win.getComputedStyle(parent);
      const clipsX = ["hidden", "clip", "auto"].includes(style.overflowX);
      const clipsY = ["hidden", "clip", "auto"].includes(style.overflowY);

      if (clipsX || clipsY) {
        const clipRect = parent.getBoundingClientRect();
        const visibleWidth = clipsX
          ? Math.max(
              0,
              Math.min(rect.right, clipRect.right) -
                Math.max(rect.left, clipRect.left),
            )
          : rect.width;
        const visibleHeight = clipsY
          ? Math.max(
              0,
              Math.min(rect.bottom, clipRect.bottom) -
                Math.max(rect.top, clipRect.top),
            )
          : rect.height;

        if (visibleWidth <= 1 || visibleHeight <= 1) {
          return true;
        }
      }

      parent = parent.parentElement;
    }

    return false;
  }

  function hasDirectVisibleText(el: any) {
    return Array.from(el.childNodes).some(
      (node: any) =>
        node.nodeType === win.Node.TEXT_NODE &&
        (node.textContent || "").trim().length > 0,
    );
  }

  function parseColor(value: string) {
    const rgbMatch = value.match(/rgba?\(([^)]+)\)/i);
    if (rgbMatch) {
      const parts = rgbMatch[1]
        .replace(/\//g, " ")
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
      if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) {
        return null;
      }

      return {
        red: parts[0],
        green: parts[1],
        blue: parts[2],
        alpha: parts[3] ?? 1,
      };
    }

    const oklabMatch = value.match(/oklab\(([^)]+)\)/i);
    const oklchMatch = value.match(/oklch\(([^)]+)\)/i);
    if (!oklabMatch && !oklchMatch) {
      return null;
    }

    const parts = (oklabMatch?.[1] ?? oklchMatch?.[1] ?? "")
      .replace(/\//g, " ")
      .split(/[\s,]+/)
      .filter(Boolean);
    if (parts.length < 3) {
      return null;
    }

    const parsePercentage = (part: string, percentageScale = 1) =>
      part.endsWith("%")
        ? (Number.parseFloat(part) / 100) * percentageScale
        : Number(part);
    const lightness = parsePercentage(parts[0]);
    const alpha = parts[3] === undefined ? 1 : parsePercentage(parts[3]);
    let a: number;
    let b: number;

    if (oklchMatch) {
      const chroma = parsePercentage(parts[1], 0.4);
      const huePart = parts[2].toLowerCase();
      let hueDegrees: number;
      if (huePart === "none") {
        hueDegrees = 0;
      } else if (huePart.endsWith("grad")) {
        hueDegrees = Number.parseFloat(huePart) * 0.9;
      } else if (huePart.endsWith("rad")) {
        hueDegrees = Number.parseFloat(huePart) * (180 / Math.PI);
      } else if (huePart.endsWith("turn")) {
        hueDegrees = Number.parseFloat(huePart) * 360;
      } else {
        hueDegrees = Number.parseFloat(huePart);
      }
      const hueRadians = hueDegrees * (Math.PI / 180);
      a = chroma * Math.cos(hueRadians);
      b = chroma * Math.sin(hueRadians);
    } else {
      a = parsePercentage(parts[1], 0.4);
      b = parsePercentage(parts[2], 0.4);
    }

    if (![lightness, a, b, alpha].every(Number.isFinite)) {
      return null;
    }

    const l = Math.pow(lightness + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(lightness - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(lightness - 0.0894841775 * a - 1.291485548 * b, 3);
    const linearToSrgb = (channel: number) => {
      const converted =
        channel <= 0.0031308
          ? 12.92 * channel
          : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
      return Math.min(255, Math.max(0, converted * 255));
    };

    return {
      red: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      green: linearToSrgb(
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      ),
      blue: linearToSrgb(
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
      ),
      alpha: Math.min(1, Math.max(0, alpha)),
    };
  }

  function compositeColor(foreground: any, background: any) {
    const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
    if (alpha <= 0) {
      return { red: 255, green: 255, blue: 255, alpha: 1 };
    }

    return {
      red:
        (foreground.red * foreground.alpha +
          background.red * background.alpha * (1 - foreground.alpha)) /
        alpha,
      green:
        (foreground.green * foreground.alpha +
          background.green * background.alpha * (1 - foreground.alpha)) /
        alpha,
      blue:
        (foreground.blue * foreground.alpha +
          background.blue * background.alpha * (1 - foreground.alpha)) /
        alpha,
      alpha,
    };
  }

  function effectiveBackgroundColorFor(el: any) {
    const layers: any[] = [];
    let current = el;

    while (current && current !== doc.documentElement) {
      const color = parseColor(win.getComputedStyle(current).backgroundColor);
      if (color && color.alpha > 0) {
        layers.push(color);
        if (color.alpha >= 0.999) {
          break;
        }
      }
      current = current.parentElement;
    }

    let result = { red: 255, green: 255, blue: 255, alpha: 1 };
    for (const layer of layers.reverse()) {
      result = compositeColor(layer, result);
    }
    return result;
  }

  function relativeLuminance(color: any) {
    const channels = [color.red, color.green, color.blue].map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function contrastRatio(foreground: any, background: any) {
    const foregroundLuminance = relativeLuminance(foreground);
    const backgroundLuminance = relativeLuminance(background);
    return (
      (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
    );
  }

  function colorToCss(color: any) {
    return `rgb(${Math.round(color.red)}, ${Math.round(color.green)}, ${Math.round(color.blue)})`;
  }

  function isImageBacked(el: any, rect: any) {
    const x = Math.min(
      viewportWidth - 1,
      Math.max(0, rect.left + rect.width / 2),
    );
    const y = Math.min(
      viewportHeight - 1,
      Math.max(0, rect.top + rect.height / 2),
    );
    const tool = sectionToolFor(el);
    const toolImageAtPoint = tool
      ? (Array.from(tool.querySelectorAll("img")) as any[]).some((image) => {
          const imageRect = image.getBoundingClientRect();
          return (
            x >= imageRect.left &&
            x <= imageRect.right &&
            y >= imageRect.top &&
            y <= imageRect.bottom
          );
        })
      : false;
    if (toolImageAtPoint) {
      return true;
    }

    const stack = doc.elementsFromPoint(x, y);
    const ownIndex = stack.indexOf(el);
    const underneath = ownIndex >= 0 ? stack.slice(ownIndex + 1) : stack;

    return underneath.some(
      (candidate: any) =>
        candidate.tagName === "IMG" ||
        win.getComputedStyle(candidate).backgroundImage !== "none",
    );
  }

  function textContrastFor(el: any, rect: any, style: any) {
    if (!hasDirectVisibleText(el) || isImageBacked(el, rect)) {
      return null;
    }

    const foreground = parseColor(style.color);
    if (!foreground) {
      return null;
    }
    const background = effectiveBackgroundColorFor(el);
    const compositedForeground = compositeColor(foreground, background);
    const ratio = contrastRatio(compositedForeground, background);
    const threshold = 2;

    return {
      color: colorToCss(compositedForeground),
      effectiveBackgroundColor: colorToCss(background),
      contrastRatio: Math.round(ratio * 100) / 100,
      contrastThreshold: threshold,
      lowContrast: ratio < threshold,
    };
  }

  function mergeBounds(rects: any[]) {
    if (rects.length === 0) {
      return null;
    }

    const bounds = rects.reduce(
      (next, rect) => ({
        top: Math.min(next.top, rect.top),
        right: Math.max(next.right, rect.right),
        bottom: Math.max(next.bottom, rect.bottom),
        left: Math.min(next.left, rect.left),
      }),
      {
        top: Infinity,
        right: -Infinity,
        bottom: -Infinity,
        left: Infinity,
      },
    );

    return {
      x: bounds.left,
      y: bounds.top,
      width: bounds.right - bounds.left,
      height: bounds.bottom - bounds.top,
      ...bounds,
    };
  }

  // Grid containment is a layout-box check. Text glyphs can legitimately
  // paint outside a tight line box (notably serif fonts with `leading-none`),
  // so Range paint bounds must not turn typographic overhang into a blocking
  // grid-area overflow.
  function getElementLayoutBounds(el: any) {
    if (!isVisibleElement(el)) {
      return null;
    }

    if (el.getAttribute("data-slot") === "carousel") {
      return mergeBounds([el.getBoundingClientRect()]);
    }

    const rects: any[] = [el.getBoundingClientRect()];
    const descendants = Array.from(
      el.querySelectorAll(
        "[data-slot], img, button, a, input, textarea, [role]",
      ),
    ) as any[];

    for (const descendant of descendants) {
      if (isVisibleElement(descendant)) {
        rects.push(descendant.getBoundingClientRect());
      }
    }

    return mergeBounds(rects);
  }

  function getVisibleLayoutBounds(elements: any[]) {
    return mergeBounds(
      elements.flatMap((el) => {
        const bounds = getElementLayoutBounds(el);
        return bounds ? [bounds] : [];
      }),
    );
  }

  function findBoundsOverflow(containerRect: any, bounds: any) {
    const tolerance = 1;

    return {
      top: Math.max(0, containerRect.top - bounds.top - tolerance),
      right: Math.max(0, bounds.right - containerRect.right - tolerance),
      bottom: Math.max(0, bounds.bottom - containerRect.bottom - tolerance),
      left: Math.max(0, containerRect.left - bounds.left - tolerance),
    };
  }

  function hasBoundsOverflow(overflow: Record<string, number>) {
    return Object.values(overflow).some((value) => value > 0);
  }

  function recordHasVisibleHorizontalViewportOverflow(record: {
    rect: { width: number; height: number; left: number; right: number };
    issues: string[];
  }) {
    return (
      record.rect.width > 1 &&
      record.rect.height > 1 &&
      !record.issues.includes("invisible") &&
      !record.issues.includes("zero-size") &&
      (record.rect.left < -1 || record.rect.right > viewportWidth + 1)
    );
  }

  function isProbablyBlockingOverlap(record: {
    a?: string;
    b?: string;
    aDataSlot?: string;
    bDataSlot?: string;
    aAncestorSlots?: string[];
    bAncestorSlots?: string[];
    aCarouselRootIndex?: number;
    bCarouselRootIndex?: number;
    aStickyNavLayer?: boolean;
    bStickyNavLayer?: boolean;
  }) {
    if (record.aStickyNavLayer || record.bStickyNavLayer) {
      return false;
    }

    if (
      record.aCarouselRootIndex !== undefined &&
      record.bCarouselRootIndex !== undefined &&
      record.aCarouselRootIndex === record.bCarouselRootIndex
    ) {
      return false;
    }

    if (
      isCarouselOverlapBackgroundSlot(record.aDataSlot) ||
      isCarouselOverlapBackgroundSlot(record.bDataSlot)
    ) {
      return false;
    }

    return true;
  }

  function compareByIssuePriority(
    a: { issues: string[] },
    b: { issues: string[] },
  ) {
    return Number(b.issues.length > 0) - Number(a.issues.length > 0);
  }

  function compareByOverflowPriority(a: any, b: any) {
    const aOverflow = a.overflow || {};
    const bOverflow = b.overflow || {};
    const aAmount = Object.values(aOverflow).reduce(
      (total: number, value: any) =>
        total + (typeof value === "number" ? value : 0),
      0,
    );
    const bAmount = Object.values(bOverflow).reduce(
      (total: number, value: any) =>
        total + (typeof value === "number" ? value : 0),
      0,
    );

    return bAmount - aAmount;
  }

  const gridAreaContainment: unknown[] = [];

  const records = nodes.map((el, index) => {
    const rect = el.getBoundingClientRect();
    const style = win.getComputedStyle(el);
    const hiddenByAncestor = isHiddenByAncestor(el);
    const hiddenByCarouselViewport = isHiddenByCarouselViewport(el);
    const carouselRoot = closestDataSlotElement(
      el,
      (value) => value === "carousel",
    );
    const text = (el.innerText || el.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    const issues: string[] = [];
    const textContrast = hiddenByCarouselViewport
      ? null
      : textContrastFor(el, rect, style);

    // `display: contents` intentionally has no principal layout box. Its
    // children remain measurable, so treating the wrapper as zero-size is a
    // false positive.
    if (
      style.display !== "contents" &&
      (rect.width === 0 || rect.height === 0)
    ) {
      issues.push("zero-size");
    }
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0
    ) {
      issues.push("invisible");
    }
    if (rect.left < -1 || rect.right > viewportWidth + 1) {
      issues.push("outside-viewport-x");
    }
    if (
      ["fixed", "sticky", "absolute"].includes(style.position) &&
      (rect.top < -1 || rect.bottom > viewportHeight + 1)
    ) {
      issues.push("outside-viewport-y");
    }
    if (el.scrollWidth > el.clientWidth + 1) {
      issues.push("text-overflow-x");
    }
    if (el.scrollHeight > el.clientHeight + 1) {
      issues.push("text-overflow-y");
    }
    if (
      ["hidden", "clip", "auto"].includes(style.overflowX) &&
      el.scrollWidth > el.clientWidth + 1
    ) {
      issues.push("clipped-content-x");
    }
    if (
      ["hidden", "clip", "auto"].includes(style.overflowY) &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      issues.push("clipped-content-y");
    }
    if (
      ["BUTTON", "A"].includes(el.tagName) &&
      !text &&
      !el.getAttribute("aria-label")
    ) {
      issues.push("empty-action");
    }
    if (
      el.getAttribute("data-slot") === "text" &&
      el.parentElement?.getAttribute("data-slot") === "section" &&
      !text &&
      isVisibleElement(el)
    ) {
      issues.push("empty-visible-tool");
    }
    if (textContrast?.lowContrast) {
      issues.push("low-text-contrast");
    }

    return {
      index,
      selector: selectorFor(el),
      path: elementPathFor(el),
      dataSlot: el.getAttribute("data-slot") || undefined,
      slotIndex: slotIndexFor(el),
      indexInParent: indexInParentFor(el),
      sectionIndex: sectionIndexFor(el),
      sectionId: sectionIdFor(el),
      toolIndexInSection: toolIndexInSectionFor(el),
      toolId: toolIdFor(el),
      slotIndexInTool: slotIndexInToolFor(el),
      ancestorSlots: getAncestorDataSlots(el),
      carouselRootIndex: carouselRoot ? nodes.indexOf(carouselRoot) : undefined,
      stickyNavLayer: isInStickyNavLayer(el),
      role: el.getAttribute("role"),
      text: text.slice(0, 80),
      rect: rectToObject(rect),
      computed: {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        position: style.position,
        zIndex: style.zIndex,
        lineHeight: style.lineHeight,
        color: textContrast?.color,
        effectiveBackgroundColor: textContrast?.effectiveBackgroundColor,
        contrastRatio: textContrast?.contrastRatio,
        contrastThreshold: textContrast?.contrastThreshold,
        hiddenByAncestor,
        hiddenByCarouselViewport,
      },
      metrics: {
        scrollWidth: el.scrollWidth,
        scrollHeight: el.scrollHeight,
        clientWidth: el.clientWidth,
        clientHeight: el.clientHeight,
      },
      gridArea: gridAreaFor(el),
      sectionGrid: sectionGridMetricsFor(el),
      issues,
    };
  });

  const recordsByElement = new Map(
    records.map((record) => [nodes[record.index], record]),
  );

  function sectionToolLayoutSnapshots(section: any) {
    const sectionRect = section.getBoundingClientRect();
    return (Array.from(section.children) as any[]).flatMap((tool, index) => {
      const toolId = tool.getAttribute?.("id") || undefined;
      const dataSlot = tool.getAttribute?.("data-slot") || undefined;
      if (!toolId && !dataSlot) return [];
      const rect = tool.getBoundingClientRect();
      const relativeRect = {
        top: roundLayoutValue(rect.top - sectionRect.top),
        left: roundLayoutValue(rect.left - sectionRect.left),
        width: roundLayoutValue(rect.width),
        height: roundLayoutValue(rect.height),
      };
      return [
        {
          toolId,
          toolIndexInSection: index + 1,
          dataSlot,
          visible: isVisibleElement(tool),
          gridArea: gridAreaFor(tool),
          rect: relativeRect,
        },
      ];
    });
  }

  function roundLayoutValue(value: number) {
    return Math.round(value * 10) / 10;
  }

  report.sections = (
    Array.from(doc.querySelectorAll('[data-slot="section"]')) as any[]
  ).map((section) => ({
    sectionId: sectionIdFor(section),
    sectionIndex: sectionIndexFor(section),
    layout: sectionGridMetricsFor(section),
    tools: sectionToolLayoutSnapshots(section),
  }));

  report.document.hasHorizontalOverflow =
    report.document.rawHasHorizontalOverflow &&
    records.some(
      (record) =>
        recordHasVisibleHorizontalViewportOverflow(record) &&
        !isCarouselInternalContextRecord(record),
    );

  for (const section of Array.from(
    doc.querySelectorAll('[data-slot="section"]'),
  ) as any[]) {
    const sectionRect = section.getBoundingClientRect();
    const toolElements = (Array.from(section.children) as any[]).filter(
      isVisibleElement,
    );
    const contentBounds = getVisibleLayoutBounds(toolElements);

    if (!contentBounds) {
      continue;
    }

    const overflow = findBoundsOverflow(sectionRect, contentBounds);
    const sectionStyle = win.getComputedStyle(section);
    const paddingBottom = Number.parseFloat(sectionStyle.paddingBottom) || 0;
    const sectionGrid = sectionGridMetricsFor(section);
    const unusedBottom = Math.max(
      0,
      sectionRect.bottom - contentBounds.bottom - paddingBottom,
    );
    const excessiveUnusedSpaceThreshold = Math.max(
      160,
      sectionRect.height * 0.2,
    );
    const resolvedRowEnds = toolElements
      .map((tool) => gridAreaFor(tool).rowEnd)
      .filter((rowEnd): rowEnd is number => rowEnd !== undefined);
    const maximumUsedRowEnd =
      resolvedRowEnds.length > 0 ? Math.max(...resolvedRowEnds) : undefined;
    const unusedTrailingRows =
      sectionGrid?.rows !== undefined && maximumUsedRowEnd !== undefined
        ? Math.max(0, sectionGrid.rows - (maximumUsedRowEnd - 1))
        : 0;
    const minimumStructuralTrailingRows = 2;
    const structuralUnusedSpaceThreshold = 240;
    const hasStructuralTrailingSpace =
      unusedTrailingRows >= minimumStructuralTrailingRows &&
      unusedBottom >= structuralUnusedSpaceThreshold;
    const hasPixelTrailingSpace = unusedBottom > excessiveUnusedSpaceThreshold;
    const hasIntentionalBottomSpace = String(section.className || "")
      .split(/\s+/)
      .some((token) => {
        const classParts = token.split(":");
        const utility = classParts.at(-1);
        const isUnconditionalUtility = classParts.length === 1;
        if (utility === "min-h-screen") {
          if (isUnconditionalUtility) return true;
          const minHeight = Number.parseFloat(sectionStyle.minHeight) || 0;
          return Math.abs(minHeight - win.innerHeight) <= 2;
        }
        if (utility === "h-screen") {
          if (isUnconditionalUtility) return true;
          return Math.abs(sectionRect.height - win.innerHeight) <= 2;
        }
        if (utility === "justify-end") {
          if (isUnconditionalUtility) return true;
          return ["end", "flex-end"].includes(sectionStyle.justifyContent);
        }
        if (utility === "content-end") {
          if (isUnconditionalUtility) return true;
          return ["end", "flex-end"].includes(sectionStyle.alignContent);
        }
        if (utility === "items-end") {
          if (isUnconditionalUtility) return true;
          return ["end", "flex-end"].includes(sectionStyle.alignItems);
        }
        return false;
      });

    if (
      toolElements.length >= 2 &&
      !hasIntentionalBottomSpace &&
      (hasStructuralTrailingSpace || hasPixelTrailingSpace)
    ) {
      const record = recordsByElement.get(section);
      record?.issues.push("section-excessive-unused-space");
      if (record) {
        const metrics = record.metrics as Record<string, unknown>;
        metrics.unusedBottom = Math.round(unusedBottom * 10) / 10;
        metrics.excessiveUnusedSpaceThreshold =
          Math.round(excessiveUnusedSpaceThreshold * 10) / 10;
        metrics.unusedTrailingRows = unusedTrailingRows;
        metrics.minimumStructuralTrailingRows = minimumStructuralTrailingRows;
        metrics.structuralUnusedSpaceThreshold = structuralUnusedSpaceThreshold;
        metrics.sectionRows = sectionGrid?.rows;
        metrics.maximumUsedRowEnd = maximumUsedRowEnd;
        metrics.unusedSpaceDetection = hasStructuralTrailingSpace
          ? "empty-grid-rows"
          : "paint-bounds";
      }
    }

    if (hasBoundsOverflow(overflow)) {
      gridAreaContainment.push({
        type: "section",
        issue: "section-grid-area-overflow",
        selector: selectorFor(section),
        path: elementPathFor(section),
        dataSlot: section.getAttribute("data-slot") || undefined,
        slotIndex: slotIndexFor(section),
        sectionIndex: sectionIndexFor(section),
        sectionId: sectionIdFor(section),
        toolIndexInSection: undefined,
        text: (section.innerText || section.textContent || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 120),
        containerRect: rectToObject(sectionRect),
        contentBounds,
        overflow,
        sectionGrid: sectionGridMetricsFor(section),
        children: toolElements.map((child) => ({
          selector: selectorFor(child),
          dataSlot: child.getAttribute("data-slot") || undefined,
          slotIndex: slotIndexFor(child),
          toolIndexInSection: toolElements.indexOf(child) + 1,
          toolId: toolIdFor(child),
          gridArea: gridAreaFor(child),
          rect: rectToObject(child.getBoundingClientRect()),
        })),
      });
    }
  }

  for (const tool of Array.from(
    doc.querySelectorAll('[data-slot="section"] > [data-slot]'),
  ) as any[]) {
    const toolRect = tool.getBoundingClientRect();
    const contentBounds = getElementLayoutBounds(tool);

    if (!contentBounds) {
      continue;
    }

    const overflow = findBoundsOverflow(toolRect, contentBounds);

    if (hasBoundsOverflow(overflow)) {
      gridAreaContainment.push({
        type: "tool",
        issue: "tool-grid-area-overflow",
        selector: selectorFor(tool),
        path: elementPathFor(tool),
        dataSlot: tool.getAttribute("data-slot") || undefined,
        slotIndex: slotIndexFor(tool),
        indexInParent: indexInParentFor(tool),
        sectionIndex: sectionIndexFor(tool),
        sectionId: sectionIdFor(tool),
        toolIndexInSection: toolIndexInSectionFor(tool),
        toolId: toolIdFor(tool),
        text: (tool.innerText || tool.textContent || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 120),
        containerRect: rectToObject(toolRect),
        contentBounds,
        overflow,
        gridArea: gridAreaFor(tool),
        sectionGrid: sectionGridMetricsFor(tool),
      });
    }
  }

  report.images = Array.from(doc.images).map((img: any) => {
    const rect = img.getBoundingClientRect();
    const style = win.getComputedStyle(img);
    const hiddenByCarouselViewport = isHiddenByCarouselViewport(img);
    const carouselRoot = closestDataSlotElement(img, isCarouselDataSlot);
    const issues: string[] = [];

    if (!img.alt) {
      issues.push("missing-alt");
    }
    if (!img.complete) {
      issues.push("pending-image");
    } else if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      issues.push("broken-image");
    }

    const naturalRatio =
      img.naturalWidth && img.naturalHeight
        ? img.naturalWidth / img.naturalHeight
        : null;
    const renderedRatio =
      rect.width && rect.height ? rect.width / rect.height : null;

    if (
      naturalRatio &&
      renderedRatio &&
      Math.abs(naturalRatio - renderedRatio) > 0.25
    ) {
      issues.push("distorted-aspect-ratio");
    }

    return {
      selector: img.getAttribute("data-slot")
        ? `[data-slot="${img.getAttribute("data-slot")}"]`
        : "img",
      dataSlot: img.getAttribute("data-slot") || undefined,
      sectionIndex: sectionIndexFor(img),
      sectionId: sectionIdFor(img),
      toolIndexInSection: toolIndexInSectionFor(img),
      toolId: toolIdFor(img),
      slotIndexInTool: slotIndexInToolFor(img),
      ancestorSlots: getAncestorDataSlots(img),
      carouselRootIndex: carouselRoot ? nodes.indexOf(carouselRoot) : undefined,
      src: img.currentSrc || img.src,
      alt: img.getAttribute("alt"),
      complete: img.complete,
      rendered: {
        width: rect.width,
        height: rect.height,
      },
      natural: {
        width: img.naturalWidth,
        height: img.naturalHeight,
      },
      computed: {
        objectFit: style.objectFit,
        hiddenByCarouselViewport,
      },
      issues,
    };
  });

  const visibleRecords = records.filter(
    (record) =>
      record.rect.width > 1 &&
      record.rect.height > 1 &&
      !record.issues.includes("invisible"),
  );
  const overlaps = [];

  for (let i = 0; i < visibleRecords.length; i++) {
    for (let j = i + 1; j < visibleRecords.length; j++) {
      const a = visibleRecords[i];
      const b = visibleRecords[j];

      if (
        nodes[a.index].contains(nodes[b.index]) ||
        nodes[b.index].contains(nodes[a.index])
      ) {
        continue;
      }

      const left = Math.max(a.rect.left, b.rect.left);
      const right = Math.min(a.rect.right, b.rect.right);
      const top = Math.max(a.rect.top, b.rect.top);
      const bottom = Math.min(a.rect.bottom, b.rect.bottom);
      const area = Math.max(0, right - left) * Math.max(0, bottom - top);

      if (area > 64) {
        overlaps.push({
          a: a.selector,
          b: b.selector,
          aPath: a.path,
          bPath: b.path,
          aDataSlot: a.dataSlot,
          bDataSlot: b.dataSlot,
          aSlotIndex: a.slotIndex,
          bSlotIndex: b.slotIndex,
          aSectionIndex: a.sectionIndex,
          bSectionIndex: b.sectionIndex,
          aSectionId: a.sectionId,
          bSectionId: b.sectionId,
          aIndexInParent: a.indexInParent,
          bIndexInParent: b.indexInParent,
          aToolIndexInSection: a.toolIndexInSection,
          bToolIndexInSection: b.toolIndexInSection,
          aToolId: a.toolId,
          bToolId: b.toolId,
          aSlotIndexInTool: a.slotIndexInTool,
          bSlotIndexInTool: b.slotIndexInTool,
          aText: a.text,
          bText: b.text,
          aRect: a.rect,
          bRect: b.rect,
          aAncestorSlots: a.ancestorSlots,
          bAncestorSlots: b.ancestorSlots,
          aCarouselRootIndex: a.carouselRootIndex,
          bCarouselRootIndex: b.carouselRootIndex,
          aStickyNavLayer: a.stickyNavLayer,
          bStickyNavLayer: b.stickyNavLayer,
          area,
        });
      }
    }
  }

  report.elements = records
    .filter((record) => record.dataSlot || record.issues.length > 0)
    .sort(compareByIssuePriority);
  report.overlaps = overlaps.sort((a, b) => {
    const blockingDelta =
      Number(isProbablyBlockingOverlap(b)) -
      Number(isProbablyBlockingOverlap(a));
    return blockingDelta || b.area - a.area;
  });
  report.gridAreaContainment = gridAreaContainment.sort(
    compareByOverflowPriority,
  );

  return report;
}

let agentRuntimePromise: ReturnType<typeof createAgentRuntime> | undefined;

function getAgentRuntime() {
  if (!agentRuntimePromise) {
    agentRuntimePromise = createAgentRuntime();
  }
  return agentRuntimePromise;
}

async function createAgentRuntime() {
  if (!key) {
    throw new Error("OPEN_AI_KEY is required to run the Agent model.");
  }

  const proxyAgent = new ProxyAgent(proxyUrl);
  const openAIClient = new OpenAI({
    apiKey: key,
    timeout: agentConfig.model.requestTimeoutMs,
    baseURL: agentConfig.model.baseURL,
    // @ts-ignore
    fetch,
    fetchOptions: {
      dispatcher: proxyAgent,
    },
  });
  setDefaultOpenAIClient(openAIClient);

  const runner = new Runner();
  attachRunnerMonitor(runner);
  return { openAIClient, runner };
}

export async function captureSiteReviewScreenshots(input: {
  batchId: string;
  pages: Array<{ pageId: string; route: string; source: string }>;
  signal?: AbortSignal;
}) {
  const screenshots: Array<{
    pageId: string;
    viewport: "desktop" | "mobile";
    path: string;
  }> = [];
  const desktop = agentConfig.browser.viewports.find(
    (viewport) => viewport.name === "desktop",
  )!;
  const mobile = agentConfig.browser.viewports.find(
    (viewport) => viewport.name === "mobile",
  )!;

  for (const page of input.pages.slice(0, 5)) {
    input.signal?.throwIfAborted();
    const artifact = await registerPreviewSource(
      page.source,
      `site-review:${input.batchId}:${page.pageId}`,
    );
    const previewUrl = new URL(
      `/preview-artifacts/${artifact.id}`,
      agentConfig.browser.previewBaseURL,
    ).href;
    const viewports = page.route === "/" ? [desktop, mobile] : [desktop];
    for (const viewport of viewports) {
      input.signal?.throwIfAborted();
      const inspection = await runBrowserMatrixVerification({
        path: artifact.filePath,
        previewUrl,
        artifactModifiedAt: Date.now(),
        mode: "final",
        viewports: [viewport],
        captureScreenshots: true,
      });
      const report = inspection.viewports[viewport.name];
      if (!inspection.ok || !report?.screenshotDataUrl) {
        if (report?.infrastructureError || !report) {
          throw new Error(
            `site_reviewer_infrastructure_unavailable:${report?.error ?? "screenshot_capture_failed"}`,
          );
        }
        throw new Error(
          `site_composed_verification_failed:${page.pageId}:${JSON.stringify(inspection.blockingIssues)}`,
        );
      }
      screenshots.push({
        pageId: page.pageId,
        viewport: viewport.name as "desktop" | "mobile",
        path: report.screenshotDataUrl,
      });
      siteAuditLogger.record(
        "site.reviewer.evidence_captured",
        {
          pageId: page.pageId,
          viewport: viewport.name,
          screenshotDigest: sourceDigest(report.screenshotDataUrl),
          screenshotBytes: Buffer.byteLength(report.screenshotDataUrl, "utf8"),
        },
        { context: { pageId: page.pageId } },
      );
    }
  }
  return screenshots;
}

type ArtifactPatchOperation = {
  type: "update_file" | "delete_file";
  path: string;
};

export function getArtifactPatchOperation(
  input: unknown,
): ArtifactPatchOperation | undefined {
  let parsed = input;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return undefined;
    }
  }
  const inputRecord = asRecord(parsed);
  const operation = asRecord(inputRecord?.operation) ?? inputRecord;
  const type = getStringProperty(operation, "type");
  const path = getStringProperty(operation, "path");
  return (type === "update_file" || type === "delete_file") && path
    ? { type, path }
    : undefined;
}

export function normalizeArtifactPatchResult(result: unknown) {
  if (typeof result !== "string") return result;
  const message = result.trim();
  if (message.length === 0) {
    return JSON.stringify({ ok: true, status: "applied" });
  }
  if (
    /invalid context|patch failed|does not exist|already exists/iu.test(message)
  ) {
    return JSON.stringify({
      ok: false,
      status: "not_applied",
      error: "patch_context_mismatch",
      message,
      nextAction:
        "Read the latest artifact with read_artifact_for_edit, then build a new patch from that exact digest.",
    });
  }
  return result;
}

async function prepareArtifactPatch(runState: AgentRunState, input: unknown) {
  if (isSiteAgentWorkflowTerminal(runState.workflowState)) {
    return {
      block: JSON.stringify({
        ok: false,
        error: "artifact_edit_workflow_terminal",
        workflowState: runState.workflowState,
        message:
          "This run already reached a terminal workflow state. Start a new run to revise the artifact.",
      }),
    };
  }
  const operation = getArtifactPatchOperation(input);
  if (!operation || !/\.[jt]sx$/u.test(operation.path)) {
    return {};
  }

  let leaseKey: string;
  try {
    leaseKey = toArtifactEditLeaseKey(operation.path, runState.workspaceDir);
  } catch (error) {
    return {
      block: JSON.stringify({
        ok: false,
        error: "artifact_edit_path_invalid",
        message: error instanceof Error ? error.message : String(error),
      }),
    };
  }

  let currentSource: string;
  try {
    currentSource = await readFile(
      join(runState.workspaceDir, leaseKey),
      "utf8",
    );
  } catch (error) {
    return {
      block: JSON.stringify({
        ok: false,
        error: "artifact_edit_source_unreadable",
        message: error instanceof Error ? error.message : String(error),
      }),
      leaseKey,
    };
  }
  const leaseError = getArtifactEditReadLeaseError({
    currentDigest: sourceDigest(currentSource),
    leasedDigest: runState.artifactEditReadLeases.get(leaseKey)?.artifactDigest,
  });
  if (leaseError) {
    return {
      block: JSON.stringify({
        ok: false,
        error: leaseError,
        path: `/workspace/output/${leaseKey}`,
        artifactDigest: sourceDigest(currentSource),
        nextAction:
          "Call read_artifact_for_edit for the current artifact, then submit one patch against that exact digest.",
      }),
      leaseKey,
    };
  }
  return { leaseKey };
}

function createSandboxCapabilities(runState: AgentRunState) {
  const workspaceDir = runState.workspaceDir;
  return [
    filesystem({
      configureTools(tools) {
        return tools.map((sandboxTool) => {
          if (
            sandboxTool.name !== "apply_patch" ||
            !("invoke" in sandboxTool)
          ) {
            return sandboxTool;
          }
          const invoke = sandboxTool.invoke.bind(sandboxTool);
          return {
            ...sandboxTool,
            invoke: async (...args: Parameters<typeof invoke>) =>
              withArtifactMutationToolLock(async () => {
                assertAgentRunActive(runState);
                const prepared = await prepareArtifactPatch(runState, args[1]);
                if (prepared.block) {
                  if (prepared.leaseKey) {
                    runState.artifactEditReadLeases.delete(prepared.leaseKey);
                  }
                  return prepared.block;
                }
                try {
                  return normalizeArtifactPatchResult(await invoke(...args));
                } finally {
                  if (prepared.leaseKey) {
                    runState.artifactEditReadLeases.delete(prepared.leaseKey);
                  }
                }
              }),
          };
        });
      },
    }),
    shell({
      configureTools(tools) {
        return tools.map((sandboxTool) => {
          if (
            (sandboxTool.name !== "exec_command" &&
              sandboxTool.name !== "write_stdin") ||
            !("invoke" in sandboxTool)
          ) {
            return sandboxTool;
          }
          const invoke = sandboxTool.invoke.bind(sandboxTool);
          return {
            ...sandboxTool,
            invoke: async (...args: Parameters<typeof invoke>) =>
              withArtifactMutationToolLock(async () => {
                assertAgentRunActive(runState);
                const input = args[1];
                if (
                  sandboxTool.name === "exec_command" &&
                  typeof input === "string"
                ) {
                  const blocked = getShellJsxMutationBlock(input);
                  if (blocked) return blocked;
                }

                const before = await snapshotJsxArtifacts(workspaceDir);
                let result: Awaited<ReturnType<typeof invoke>>;
                try {
                  result = await invoke(...args);
                } catch (error) {
                  await restoreJsxArtifacts(workspaceDir, before);
                  throw error;
                }
                const restored = await restoreJsxArtifacts(
                  workspaceDir,
                  before,
                );
                return restored.length > 0
                  ? `Shell JSX mutation was reverted for: ${restored.join(", ")}. Use apply_patch instead.`
                  : result;
              }),
          };
        });
      },
    }),
    compaction({
      policy: new StaticCompactionPolicy(
        agentConfig.context.compactionThresholdTokens,
      ),
    }),
    skills({
      lazyFrom: localDirLazySkillSource({
        src: paths.skillDir,
      }),
    }),
  ];
}

async function withArtifactMutationToolLock<T>(action: () => Promise<T>) {
  return artifactMutationToolQueue.run(
    browserRuntimeContext.getStore()?.id ?? "shared",
    action,
  );
}

function createAgent(runState: AgentRunState, manifest: Manifest) {
  return new SandboxAgent({
    name: agentConfig.identity.name,
    model: agentConfig.model.designerModel,
    defaultManifest: manifest,
    capabilities: createSandboxCapabilities(runState),
    tools: [
      createUpdateTodosTool(runState),
      createRequestClarificationTool(runState),
      createReadArtifactForEditTool(runState),
      createVerifyDirectEditTool(runState),
      createVerifyBrowserMatrixTool(runState),
      createReviewCandidateTool(runState),
      createDoneTool(runState),
    ],
    instructions: getSystemPrompt({
      maxFinalVisualRuns: agentLimits.maxFinalVisualRuns,
      reviewerCritiqueEnabled: runState.reviewerCritiqueEnabled,
    }),
  });
}

interface Option {
  prompt: string;
  designSystemId: number;
  page: unknown;
  operation?: DesignOperation;
  targetToolId?: string;
  targetSectionId?: string;
  reviewScope?: ExcellenceReviewScope;
  reviewerCritiqueEnabled?: boolean;
  onProgress?: (text: string) => void;
  onUserEvent?: (event: UserVisibleAgentEvent) => void;
  /** V2 site workers stage verified output and commit it through SiteVersionStore. */
  persist?: boolean;
  runtimeId?: string;
  signal?: AbortSignal;
}

export async function run({
  prompt,
  page,
  operation = "modify",
  targetToolId,
  targetSectionId,
  reviewScope,
  reviewerCritiqueEnabled = defaultReviewerCritiqueEnabled,
  designSystemId,
  onProgress,
  onUserEvent,
  persist = true,
  runtimeId,
  signal,
}: Option) {
  const previousPage = pageDocumentSchema.parse(page);
  const browserRuntimeId =
    runtimeId ?? `agent-${++browserRuntimeContextCounter}`;
  return withBrowserRuntimeScope(browserRuntimeId, () =>
    withArtifactLog(runtimeId ?? previousPage.id, () =>
      runPageOperation({
        prompt,
        operation,
        targetToolId,
        targetSectionId,
        reviewScope,
        reviewerCritiqueEnabled,
        designSystemId,
        onProgress,
        onUserEvent,
        persist,
        runtimeId,
        signal,
        previousPage,
      }),
    ),
  );
}

async function runPageOperation({
  prompt,
  operation,
  targetToolId,
  targetSectionId,
  reviewScope,
  reviewerCritiqueEnabled = defaultReviewerCritiqueEnabled,
  designSystemId,
  onProgress,
  onUserEvent,
  persist = true,
  runtimeId,
  signal,
  previousPage,
}: Omit<Option, "page" | "operation"> & {
  operation: DesignOperation;
  previousPage: PageDocument;
}) {
  const currentJsx = pageDocumentToJsx(previousPage);
  const designSystem = await resolveDesignSystemReference(designSystemId);
  const runWorkspaceRoot = join(paths.tmpDir, "agent-runs");
  await mkdir(runWorkspaceRoot, { recursive: true });
  const runDirectory = await mkdtemp(
    join(
      runWorkspaceRoot,
      `artifact-${sourceDigest(runtimeId ?? previousPage.id).slice(0, 12)}-`,
    ),
  );
  const workspaceDir = join(runDirectory, "output");
  const contextDir = join(runDirectory, "context");
  const isolatedComponentsDir = join(runDirectory, "components");
  let workspaceBaseline:
    | Awaited<ReturnType<typeof snapshotWorkspaceFiles>>
    | undefined;
  try {
    await Promise.all([
      mkdir(workspaceDir, { recursive: true }),
      mkdir(join(contextDir, "verification"), { recursive: true }),
      cp(paths.componentsDir, isolatedComponentsDir, { recursive: true }),
      writeFile(
        join(runDirectory, ".agent-run.json"),
        JSON.stringify({
          version: 2,
          runtimeId: runtimeId ?? previousPage.id,
          designSystemId: designSystem?.id ?? -1,
          createdAt: Date.now(),
        }),
        "utf8",
      ),
    ]);

    if (operation === "modify") {
      await writeFile(
        join(workspaceDir, "current-artifact.jsx"),
        currentJsx,
        "utf8",
      );
    }
    workspaceBaseline = await snapshotWorkspaceFiles(workspaceDir);

    const runState: AgentRunState = {
      signal,
      workflowState: "authoring",
      operation,
      previousPage,
      workspaceDir,
      contextDir,
      userRequest: prompt,
      designSystem,
      targetToolId,
      targetSectionId,
      reviewScope,
      reviewerCritiqueEnabled,
      unimplementedRequirements: [],
      verificationState: new Map(),
      staticInspectionCache: new Map(),
      artifactEditReadLeases: new Map(),
      repairEvidenceCache: new Map(),
      imageReadinessAttempts: new Map(),
      visualValidationCache: new Map(),
      originalQualityBaseline:
        targetToolId || targetSectionId
          ? buildQualitySnapshot(currentJsx)
          : undefined,
      todos: [],
      emitUserEvent: onUserEvent,
      repairIssueHistory: [],
      verificationIssueHistory: new Map(),
      repairRequests: 0,
      finalVisualRuns: 0,
      designerTurnsUsed: 0,
      designerPhase: 0,
      tokenUsage: new TokenUsageAccumulator(),
      finalPath: "",
    };
    const response = await runAgent(
      buildInitialDesignerPrompt({
        operation,
        userPrompt: prompt,
        targetToolId,
        targetSectionId,
        designSystem: designSystem
          ? { id: designSystem.id, title: designSystem.title }
          : undefined,
      }),
      runState,
      { onProgress, onUserEvent, signal },
    );

    if ("clarification" in response) {
      return {
        status: "clarification" as const,
        baseVersion: previousPage.version,
        message: sanitizeUserVisibleText(response.clarification),
        patch: pagePatchSchema.parse([]),
      };
    }

    if ("externalBlocker" in response) {
      return {
        status: "blocked_external" as const,
        baseVersion: previousPage.version,
        message: sanitizeUserVisibleText(
          `${response.externalBlocker.message} ${response.externalBlocker.requiredAction}`,
        ),
        patch: pagePatchSchema.parse([]),
        blocker: response.externalBlocker,
      };
    }

    if (!response.deliveryResult) {
      throw new Error(
        "The design agent did not return a verified editor delivery.",
      );
    }

    if (persist) {
      response.deliveryResult = await persistAcceptedArtifact(
        response.deliveryResult,
        workspaceDir,
      );
    }

    return {
      status: "accepted" as const,
      baseVersion: previousPage.version,
      message: response.message,
      previewUrl: response.deliveryResult.previewUrl,
      patch: response.deliveryResult.patch,
      qualityStatus: response.deliveryResult.qualityStatus,
      ...(response.deliveryResult.unimplementedRequirements.length > 0
        ? {
            unimplementedRequirements:
              response.deliveryResult.unimplementedRequirements,
          }
        : {}),
    };
  } finally {
    if (!workspaceBaseline) {
      await rm(runDirectory, { recursive: true, force: true });
    } else if (persist) {
      let workspacePersisted = false;
      try {
        const persistedFiles = await persistWorkspaceChanges({
          sourceDir: workspaceDir,
          destinationDir: paths.workspaceDir,
          baseline: workspaceBaseline,
        });
        workspacePersisted = true;
        await unregisterPreviewArtifactsForWorkspace(workspaceDir);

        for (const relativePath of persistedFiles) {
          if (!/\.[jt]sx$/u.test(relativePath)) {
            continue;
          }
          const sandboxPath = `/workspace/output/${relativePath
            .split(sep)
            .join("/")}`;
          await registerPreviewArtifact(sandboxPath, paths.workspaceDir);
        }
      } finally {
        if (workspacePersisted) {
          await rm(runDirectory, { recursive: true, force: true });
        }
      }
    } else {
      await unregisterPreviewArtifactsForWorkspace(workspaceDir);
      await rm(runDirectory, { recursive: true, force: true });
    }
  }
}

async function persistAcceptedArtifact(
  deliveryResult: DeliveryResult,
  isolatedWorkspaceDir: string,
) {
  const isolatedArtifact = await registerPreviewArtifact(
    deliveryResult.artifactPath,
    isolatedWorkspaceDir,
  );
  const relativePath = toWorkspaceRelativePath(
    deliveryResult.artifactPath,
    isolatedWorkspaceDir,
  );
  const persistentHostPath = join(paths.workspaceDir, relativePath);
  await mkdir(dirname(persistentHostPath), { recursive: true });
  await copyFile(isolatedArtifact.hostPath, persistentHostPath);
  await unregisterPreviewArtifact(deliveryResult.artifactPath);
  const persistentArtifact = await registerPreviewArtifact(
    deliveryResult.artifactPath,
    paths.workspaceDir,
  );
  const persistentStat = await stat(persistentArtifact.hostPath);

  return {
    ...deliveryResult,
    artifactModifiedAt: persistentStat.mtimeMs,
    previewUrl: previewUrlFor(persistentArtifact),
  };
}

function recoveryRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function recoveryStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function projectVerificationForRecovery(report: unknown) {
  const record = recoveryRecord(report);
  const repairPlan = Array.isArray(record.verificationRepairPlan)
    ? record.verificationRepairPlan.map(recoveryRecord)
    : [];
  const current = repairPlan[0];
  const issues = Array.isArray(record.issues) ? record.issues : [];
  const unresolved = Array.isArray(record.unresolvedIssues)
    ? record.unresolvedIssues
    : [];
  const failedChecks = [...issues, ...unresolved].map((value) => {
    const issue = recoveryRecord(value);
    return {
      code: typeof issue.code === "string" ? issue.code : "verification_failed",
      message:
        typeof issue.message === "string"
          ? issue.message
          : typeof issue.observation === "string"
            ? issue.observation
            : "The verification check remains unresolved.",
      affectedViewports: recoveryStrings(
        issue.affectedViewports ?? issue.viewports,
      ).filter((name): name is BrowserViewportName =>
        agentConfig.browser.viewportNames.includes(name as BrowserViewportName),
      ),
    };
  });
  const preservation = Array.isArray(record.mustPreserve)
    ? record.mustPreserve
    : record.mustPreserve
      ? [record.mustPreserve]
      : [];
  const mustPreserve = preservation.map((value, index) => {
    const item = recoveryRecord(value);
    return {
      code: typeof item.code === "string" ? item.code : `preserve_${index + 1}`,
      description:
        typeof item.description === "string"
          ? item.description
          : safeStringify(item),
    };
  });
  const currentRepairUnit = current
    ? {
        issueCodes: recoveryStrings(current.issueCodes),
        strategy:
          typeof current.strategy === "string"
            ? current.strategy
            : "Apply the focused repair described by this unit.",
        acceptanceCriteria: recoveryStrings(current.acceptanceCriteria),
        prohibitedTactics: recoveryStrings(current.prohibitedTactics),
      }
    : undefined;
  return {
    failedChecks,
    mustPreserve,
    currentRepairUnit,
    remainingRepairUnitCount: Math.max(0, repairPlan.length - 1),
    nextAction: recoveryStrings(record.nextActions).join(" ") ||
      "Read the current artifact, repair the active failures, and rerun the required verification workflow.",
  };
}

async function persistRecoveryEnvelope(
  runState: AgentRunState,
  envelope: DesignerRecoveryEnvelope,
  report?: unknown,
) {
  let nextEnvelope = envelope;
  if (report !== undefined) {
    const reportId = sourceDigest(
      JSON.stringify({ artifactDigest: envelope.artifact.digest, report }),
    ).slice(0, 20);
    const reportRelativePath = `verification/${reportId}.json`;
    await writeFile(
      join(runState.contextDir, reportRelativePath),
      JSON.stringify(
        { version: 1, reportId, artifactDigest: envelope.artifact.digest, report },
        null,
        2,
      ),
      "utf8",
    );
    nextEnvelope = {
      ...envelope,
      recovery: {
        ...envelope.recovery,
        reportId,
        reportPath: `/workspace/context/${reportRelativePath}`,
      },
    };
  }
  assertRecoveryEnvelopeSize(
    nextEnvelope,
    agentConfig.context.maxRecoveryEnvelopeChars,
  );
  await writeFile(
    join(runState.contextDir, "recovery.json"),
    JSON.stringify(nextEnvelope, null, 2),
    "utf8",
  );
  runState.lastRecoveryEnvelope = nextEnvelope;
  return nextEnvelope;
}

async function createRecoveryEnvelope({
  runState,
  path,
  source,
  message,
  report,
}: {
  runState: AgentRunState;
  path: string;
  source: "review_candidate" | "verify_browser_matrix";
  message: string;
  report?: unknown;
}) {
  const artifact = await registerPreviewArtifact(path, runState.workspaceDir);
  const artifactDigest = sourceDigest(await readFile(artifact.hostPath, "utf8"));
  const projected = projectVerificationForRecovery(report);
  const envelope: DesignerRecoveryEnvelope = {
    version: 1,
    phase:
      runState.workflowState === "ready_for_done"
        ? "commit"
        : runState.workflowState === "ready_for_review"
          ? "review"
          : "repair",
    userRequest: runState.userRequest,
    designSystem: runState.designSystem
      ? {
          selected: true,
          id: runState.designSystem.id,
          title: runState.designSystem.title,
          documentPath: "/workspace/design-system/DESIGN.md",
        }
      : { selected: false },
    workflowState: runState.workflowState,
    artifact: { path, digest: artifactDigest },
    recovery: { source, message },
    ...projected,
    todos: runState.todos.map(({ name, status }) => ({ name, status })),
  };
  return persistRecoveryEnvelope(runState, envelope, report);
}

async function refreshSandboxRecoveryContext(
  sandboxSession: Awaited<
    ReturnType<InstanceType<typeof UnixLocalSandboxClient>["create"]>
  >,
  runState: AgentRunState,
) {
  await setSandboxReferencePermissions(
    sandboxSession,
    ["/workspace/context"],
    true,
  );
  await sandboxSession.materializeEntry({
    path: "context",
    entry: localDir({ src: runState.contextDir, permissions: 0o555 }),
  });
  await setSandboxReferencePermissions(
    sandboxSession,
    ["/workspace/context"],
    false,
  );
}

async function setSandboxReferencePermissions(
  sandboxSession: Awaited<
    ReturnType<InstanceType<typeof UnixLocalSandboxClient>["create"]>
  >,
  sandboxPaths: string[],
  writable: boolean,
) {
  await Promise.all(
    sandboxPaths.map(async (path) => {
      if (!(await sandboxSession.pathExists(path))) return;
      await sandboxSession.execCommand({
        cmd: `chmod -R ${writable ? "u+w" : "a-w"} ${path}`,
        workdir: "/workspace",
      });
    }),
  );
}

async function runAgent(
  prompt: string,
  runState: AgentRunState,
  options: {
    onProgress?: (text: string) => void;
    onUserEvent?: (event: UserVisibleAgentEvent) => void;
    signal?: AbortSignal;
  } = {},
): Promise<AgentRunResponse> {
  throwIfAgentRunAborted(options.signal);
  monitorLog("run.start", {
    promptChars: prompt.length,
    promptDigest: sourceDigest(prompt).slice(0, 16),
  });
  runState.finalPath = "";
  runState.lastDoneRejection = undefined;
  runState.pendingRepair = undefined;
  runState.clarification = undefined;
  runState.externalBlocker = undefined;
  runState.deliveryResult = undefined;
  const tokenUsage = runState.tokenUsage;
  throwIfAgentRunAborted(options.signal);
  const { runner } = await getAgentRuntime();
  const manifest = createRunManifest({
    workspaceDir: runState.workspaceDir,
    componentsDir: join(dirname(runState.workspaceDir), "components"),
    contextDir: runState.contextDir,
    designSystem: runState.designSystem,
  });
  throwIfAgentRunAborted(options.signal);
  const sandboxSession = await new UnixLocalSandboxClient().create({
    manifest,
  });
  const sandboxReferencePaths = [
    "/workspace/components",
    "/workspace/context",
    ...(runState.designSystem ? ["/workspace/design-system"] : []),
  ];
  await setSandboxReferencePermissions(
    sandboxSession,
    sandboxReferencePaths,
    false,
  );
  const agent = createAgent(runState, manifest);
  let nextPrompt = prompt;
  let acceptanceRecoveries = 0;
  let executionContinuations = 0;
  try {
    monitorLog("run.execution.start", {
      totalDesignerMaxTurns: agentLimits.totalDesignerMaxTurns,
      initialPhaseMaxTurns: agentLimits.initialPhaseMaxTurns,
      recoveryPhaseMaxTurns: agentLimits.recoveryPhaseMaxTurns,
      maxRepairRequests: agentLimits.maxRepairRequests,
      maxFinalVisualRuns: agentLimits.maxFinalVisualRuns,
      maxAcceptanceRecoveries: agentLimits.maxAcceptanceRecoveries,
    });
    while (true) {
      throwIfAgentRunAborted(options.signal);
      const remainingTurns =
        agentLimits.totalDesignerMaxTurns - runState.designerTurnsUsed;
      if (remainingTurns <= 0) {
        throw new Error("designer_total_turn_budget_exhausted");
      }
      const configuredPhaseLimit =
        runState.designerPhase === 0
          ? agentLimits.initialPhaseMaxTurns
          : agentLimits.recoveryPhaseMaxTurns;
      const phaseMaxTurns = Math.min(configuredPhaseLimit, remainingTurns);
      runState.designerPhase += 1;
      runState.artifactEditReadLeases.clear();
      if (runState.lastRecoveryEnvelope) {
        const recoveryArtifact = await registerPreviewArtifact(
          runState.lastRecoveryEnvelope.artifact.path,
          runState.workspaceDir,
        );
        assertRecoveryArtifactDigest(
          runState.lastRecoveryEnvelope,
          sourceDigest(await readFile(recoveryArtifact.hostPath, "utf8")),
        );
      }
      const session = new MemorySession();
      const recoveryAttempt = acceptanceRecoveries;
      monitorLog("designer.phase.start", {
        phase: runState.designerPhase,
        sessionKind: runState.designerPhase === 1 ? "initial" : "recovery",
        promptChars: nextPrompt.length,
        designSystemSelected: Boolean(runState.designSystem),
        designSystemId: runState.designSystem?.id,
        phaseMaxTurns,
        totalTurnsUsed: runState.designerTurnsUsed,
      });
      const result = await runner.run(agent, nextPrompt, {
        session,
        sandbox: {
          session: sandboxSession,
        },
        maxTurns: phaseMaxTurns,
        signal: options.signal,
        stream: true,
      });

      let modelOutputBuffer = "";
      const flushModelOutput = (reason: string) => {
        if (!modelOutputBuffer) {
          return;
        }
        monitorLog("model.output", {
          reason,
          recoveryAttempt,
          text: modelOutputBuffer,
        });
        emitUserVisibleMessage(modelOutputBuffer, options.onUserEvent);
        modelOutputBuffer = "";
      };

      let deliveryCompletedDuringStream = false;
      for await (const event of result) {
        throwIfAgentRunAborted(options.signal);
        if (event.type === "raw_model_stream_event") {
          tokenUsage.addFromEvent(event.data);
        }

        if (
          event.type === "raw_model_stream_event" &&
          event.data.type === "output_text_delta"
        ) {
          modelOutputBuffer += event.data.delta;
        } else if (event.type === "run_item_stream_event") {
          if (event.name === "message_output_created") {
            flushModelOutput(event.name);
          } else if (
            !["message_output_created", "tool_called", "tool_output"].includes(
              event.name,
            )
          ) {
            flushModelOutput(event.name);
          }
        }

        // `done` has committed and locked the canonical Artifact. Returning
        // at this terminal checkpoint prevents harmless model epilogue from
        // turning a successful page delivery into an outer worker timeout.
        const terminalDelivery = readAgentRunOutcome(runState).deliveryResult;
        if (
          terminalDelivery &&
          (runState.workflowState === "accepted" ||
            runState.workflowState === "fallback_delivered")
        ) {
          deliveryCompletedDuringStream = true;
          monitorLog("run.delivery_terminal", {
            recoveryAttempt,
            workflowState: runState.workflowState,
            qualityStatus: terminalDelivery.qualityStatus,
          });
          break;
        }
      }

      flushModelOutput(
        deliveryCompletedDuringStream
          ? "delivery_completed"
          : "stream_completed",
      );
      if (!deliveryCompletedDuringStream) {
        throwIfAgentRunAborted(options.signal);
        await result.completed;
        throwIfAgentRunAborted(options.signal);
      }
      runState.designerTurnsUsed += result.currentTurn;
      let outcome = readAgentRunOutcome(runState);
      const finalOutput = deliveryCompletedDuringStream
        ? ""
        : result.finalOutput;

      monitorLog("run.execution.end", {
        lastResponseId: result.lastResponseId,
        finalOutput,
        recoveryAttempt,
        accepted: Boolean(outcome.finalPath),
        rejected: Boolean(outcome.lastDoneRejection),
        clarification: Boolean(outcome.clarification),
        workflowState: outcome.workflowState,
        qualityStatus: outcome.deliveryResult?.qualityStatus,
      });
      monitorLog("designer.phase.end", {
        phase: runState.designerPhase,
        turnsUsed: result.currentTurn,
        workflowState: outcome.workflowState,
        recoveryEnvelopeChars: runState.lastRecoveryEnvelope
          ? JSON.stringify(runState.lastRecoveryEnvelope).length
          : undefined,
      });

      if (outcome.clarification) {
        monitorLog("run.end", {
          lastResponseId: result.lastResponseId,
          clarification: outcome.clarification,
        });
        return { clarification: outcome.clarification };
      }

      if (outcome.externalBlocker) {
        monitorLog("run.end", {
          lastResponseId: result.lastResponseId,
          status: "blocked_external",
          blocker: outcome.externalBlocker,
        });
        return { externalBlocker: outcome.externalBlocker };
      }

      if (outcome.workflowState === "ready_for_review") {
        const path =
          outcome.pendingRepair?.path ??
          [...runState.verificationState.keys()].at(-1);
        if (!path) throw new Error("verified_candidate_path_missing");
        await reviewCandidate(runState, path);
        outcome = readAgentRunOutcome(runState);
        monitorLog("run.workflow_direct_review", {
          path,
          phase: runState.designerPhase,
          workflowState: outcome.workflowState,
        });
      }

      if (outcome.workflowState === "ready_for_done") {
        const checkpoint = runState.reviewedDelivery;
        if (!checkpoint) {
          throw new Error("reviewed_delivery_checkpoint_missing");
        }
        const committed = await commitReviewedDelivery(runState, checkpoint.path);
        if (!committed.ok) {
          throw new Error(committed.error);
        }
        monitorLog("run.workflow_direct_commit", {
          path: checkpoint.path,
          phase: runState.designerPhase,
        });
        outcome = readAgentRunOutcome(runState);
      }

      const completedOutcome = outcome;
      if (completedOutcome.finalPath) {
        throwIfAgentRunAborted(options.signal);
        const p = completedOutcome.finalPath;
        const deliveryResult = completedOutcome.deliveryResult;
        runState.finalPath = "";

        if (!deliveryResult || deliveryResult.artifactPath !== p) {
          throw new Error(
            "The accepted artifact is missing its verified delivery projection.",
          );
        }

        const acceptedArtifact = await registerPreviewArtifact(
          p,
          runState.workspaceDir,
        );
        const [acceptedFileStat, acceptedSource] = await Promise.all([
          stat(acceptedArtifact.hostPath),
          readFile(acceptedArtifact.hostPath, "utf8"),
        ]);
        if (
          acceptedFileStat.mtimeMs !== deliveryResult.artifactModifiedAt ||
          sourceDigest(acceptedSource) !== deliveryResult.artifactDigest
        ) {
          throw new Error(
            "The canonical delivery artifact changed after done accepted it; the unverified result was not returned.",
          );
        }

        monitorLog("run.end", {
          lastResponseId: result.lastResponseId,
          finalOutput,
          recoveryAttempt,
        });
        monitorLog("token.usage", {
          artifactPath: p,
          lastResponseId: result.lastResponseId,
          usage: tokenUsage.toReport(),
        });

        const message =
          typeof finalOutput === "string"
            ? sanitizeUserVisibleText(finalOutput)
            : "";
        return {
          artifactPath: p,
          message,
          deliveryResult,
        };
      }

      if (
        outcome.lastDoneRejection &&
        shouldAttemptAcceptanceRecovery({
          recoveryAttempt: acceptanceRecoveries,
          maxAcceptanceRecoveries: agentLimits.maxAcceptanceRecoveries,
          terminal: outcome.lastDoneRejection.terminal,
          finalVisualRuns: runState.finalVisualRuns,
          maxFinalVisualRuns: agentLimits.maxFinalVisualRuns,
          reviewerCritiqueEnabled: runState.reviewerCritiqueEnabled,
        })
      ) {
        throwIfAgentRunAborted(options.signal);
        acceptanceRecoveries += 1;
        const envelope = await createRecoveryEnvelope({
          runState,
          path: outcome.lastDoneRejection.path,
          source: "review_candidate",
          message: outcome.lastDoneRejection.message,
          report: outcome.lastDoneRejection.verificationReport,
        });
        await refreshSandboxRecoveryContext(sandboxSession, runState);
        nextPrompt = buildDesignerRecoveryPrompt(envelope);
        monitorLog("run.acceptance_recovery.start", {
          recoveryAttempt: acceptanceRecoveries,
          path: outcome.lastDoneRejection.path,
          report: outcome.lastDoneRejection.verificationReport,
        });
        continue;
      }

      if (
        requiresWorkflowContinuation(outcome.workflowState) &&
        executionContinuations < agentLimits.maxExecutionContinuations
      ) {
        throwIfAgentRunAborted(options.signal);
        executionContinuations += 1;
        const continuationPath =
          runState.reviewedDelivery?.path ?? outcome.pendingRepair?.path;
        if (!continuationPath) {
          throw new Error("workflow_continuation_artifact_missing");
        }
        const envelope = await createRecoveryEnvelope({
          runState,
          path: continuationPath,
          source: outcome.pendingRepair?.source ?? "review_candidate",
          message:
            outcome.pendingRepair?.message ??
            buildWorkflowContinuationPrompt({
              state: outcome.workflowState,
              pendingRepair: outcome.pendingRepair,
              artifactPath: continuationPath,
            }),
          report: outcome.pendingRepair?.verificationReport,
        });
        await refreshSandboxRecoveryContext(sandboxSession, runState);
        nextPrompt = buildDesignerRecoveryPrompt(envelope);
        monitorLog("run.workflow_recovery.start", {
          recoveryAttempt: executionContinuations,
          workflowState: outcome.workflowState,
          path: runState.reviewedDelivery?.path ?? outcome.pendingRepair?.path,
          repairSource: outcome.pendingRepair?.source,
        });
        continue;
      }

      throw new Error(
        outcome.lastDoneRejection?.message ??
          "The design agent ended its run without producing a canonically valid delivery candidate.",
      );
    }

  } catch (error) {
    monitorLog("run.error", error);
    throw error;
  } finally {
    const outcome = readAgentRunOutcome(runState);
    monitorLog("token.usage.final", {
      artifactPath:
        outcome.deliveryResult?.artifactPath ||
        outcome.lastDoneRejection?.path ||
        undefined,
      status: outcome.deliveryResult
        ? outcome.deliveryResult.qualityStatus === "best_effort"
          ? "fallback_delivered"
          : "accepted"
        : outcome.clarification
          ? "clarification"
          : outcome.externalBlocker
            ? "blocked_external"
            : outcome.lastDoneRejection
              ? "rejected"
              : "error",
      usage: tokenUsage.toReport(),
    });
    await closeSharedChromeDevtoolsServer("run_finished");
    await setSandboxReferencePermissions(
      sandboxSession,
      sandboxReferencePaths,
      true,
    ).catch(() => undefined);
    await sandboxSession.close();
  }
}

class TokenUsageAccumulator {
  #responses = new Map<
    string,
    { id?: string; model?: string; usage: ResponseUsage }
  >();

  addFromEvent(event: unknown) {
    for (const response of extractResponsesWithUsage(event)) {
      const fallbackKey = `${this.#responses.size}:${safeStringify(response.usage)}`;
      this.#responses.set(response.id ?? fallbackKey, response);
    }
  }

  toReport(): TokenUsageTotals | null {
    if (this.#responses.size === 0) {
      return null;
    }

    const responses = Array.from(this.#responses.values());
    const totals = responses.reduce<TokenUsageTotals>(
      (total, response) => {
        total.input_tokens += response.usage.input_tokens;
        total.output_tokens += response.usage.output_tokens;
        total.total_tokens += response.usage.total_tokens;
        total.cached_tokens +=
          response.usage.input_tokens_details?.cached_tokens ?? 0;
        total.reasoning_tokens +=
          response.usage.output_tokens_details?.reasoning_tokens ?? 0;
        return total;
      },
      {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        cached_tokens: 0,
        reasoning_tokens: 0,
      },
    );

    return totals;
  }
}

function extractResponsesWithUsage(
  value: unknown,
): Array<{ id?: string; model?: string; usage: ResponseUsage }> {
  const found: Array<{ id?: string; model?: string; usage: ResponseUsage }> =
    [];
  collectResponsesWithUsage(value, found, new WeakSet<object>());
  return found;
}

function collectResponsesWithUsage(
  value: unknown,
  found: Array<{ id?: string; model?: string; usage: ResponseUsage }>,
  seen: WeakSet<object>,
) {
  if (typeof value !== "object" || value === null) {
    return;
  }

  if (seen.has(value)) {
    return;
  }

  seen.add(value);

  const record = value as Record<string, unknown>;
  if (isResponseUsage(record.usage)) {
    found.push({
      id: typeof record.id === "string" ? record.id : undefined,
      model: typeof record.model === "string" ? record.model : undefined,
      usage: record.usage,
    });
  }

  for (const nestedValue of Object.values(record)) {
    collectResponsesWithUsage(nestedValue, found, seen);
  }
}

function isResponseUsage(value: unknown): value is ResponseUsage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Partial<ResponseUsage>;
  return (
    typeof record.input_tokens === "number" &&
    typeof record.output_tokens === "number" &&
    typeof record.total_tokens === "number"
  );
}

export function monitorLog(event: string, payload: unknown) {
  if (getSiteLogContext()?.siteId) {
    siteAuditLogger.record(event, payload);
  }
  const time = formatLocalLogTime();
  const serializedPayload = safeStringify(payload);
  const artifactId = artifactLogContext.getStore()?.artifactId;
  const logFile = artifactId
    ? agentConfig.logging.artifactLogFile(artifactId)
    : agentConfig.logging.systemLogFile;

  runnerLogWriteQueue = runnerLogWriteQueue
    .then(() => runnerLogReady)
    .then(() =>
      appendFile(
        logFile,
        `[agent-monitor] ${time} ${event}\n${serializedPayload}\n`,
        "utf8",
      ),
    )
    .catch((error) => {
      console.error("[agent-monitor] failed to write runner log");
      console.error(error);
    });
}

function withArtifactLog<T>(artifactId: string, action: () => Promise<T>) {
  return artifactLogContext.run({ artifactId }, action);
}

function formatLocalLogTime(date = new Date()) {
  const timezoneOffsetMinutes = -date.getTimezoneOffset();
  const sign = timezoneOffsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(timezoneOffsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const offsetMinutes = String(absoluteOffset % 60).padStart(2, "0");
  const localTime = new Date(date.getTime() + timezoneOffsetMinutes * 60_000)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");

  return `${localTime}${sign}${offsetHours}:${offsetMinutes}`;
}

async function createChromeDevtoolsServer(
  workerName: string,
): Promise<ChromeDevtoolsServerResult> {
  if (!agentConfig.browser.devtools.enabled) {
    return {
      ok: false,
      error: "Chrome DevTools MCP is disabled in agentConfig.ts.",
    };
  }

  await runnerLogReady;
  const command = agentConfig.browser.devtools.command;
  const args = agentConfig.browser.devtools.args
    ? [...agentConfig.browser.devtools.args]
    : [
        ...agentConfig.browser.devtools.defaultArgs,
        "--logFile",
        join(paths.logsDir, `chrome-devtools-mcp-${workerName}.log`),
      ];
  const server = new MCPServerStdio({
    name: `chrome-devtools-browser-matrix-${workerName}`,
    command,
    args,
    cacheToolsList: agentConfig.browser.devtools.cacheToolsList,
    clientSessionTimeoutSeconds:
      agentConfig.browser.devtools.clientSessionTimeoutSeconds,
    timeout: agentConfig.browser.devtools.toolTimeoutMs,
  });

  try {
    // monitorLog("chrome-devtools.connect.start", {
    //   command,
    //   args,
    //   clientSessionTimeoutSeconds: 60,
    //   toolTimeoutMs: 60_000,
    // });
    await server.connect();
    // monitorLog("chrome-devtools.connect.end", { ok: true });
    return { ok: true, server };
  } catch (error) {
    // monitorLog("chrome-devtools.connect.error", error);
    await server.close().catch(() => {});
    return {
      ok: false,
      error: `Chrome DevTools MCP is not available: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

async function getSharedChromeDevtoolsServer(
  workerName: BrowserViewportName,
): Promise<ChromeDevtoolsServerResult> {
  const runtimeKey = getBrowserRuntimeWorkerKey(workerName);
  const existingServer = sharedChromeDevtoolsServers.get(runtimeKey);
  if (existingServer) {
    return { ok: true, server: existingServer };
  }

  const pendingStart = sharedChromeDevtoolsServerStarts.get(runtimeKey);
  if (pendingStart) {
    return pendingStart;
  }

  const start = createChromeDevtoolsServer(workerName).then(
    (result) => {
      sharedChromeDevtoolsServerStarts.delete(runtimeKey);
      if (result.ok) {
        sharedChromeDevtoolsServers.set(runtimeKey, result.server);
      }
      return result;
    },
    (error: unknown) => {
      sharedChromeDevtoolsServerStarts.delete(runtimeKey);
      throw error;
    },
  );
  sharedChromeDevtoolsServerStarts.set(runtimeKey, start);

  return start;
}

async function closeSharedChromeDevtoolsServer(reason: string) {
  const runtimeId = browserRuntimeContext.getStore()?.id;
  const belongsToRuntime = (key: string) =>
    runtimeId === undefined || key.startsWith(`${runtimeId}:`);
  const pendingStarts = [...sharedChromeDevtoolsServerStarts.entries()]
    .filter(([key]) => belongsToRuntime(key))
    .map(([, start]) => start);
  await Promise.allSettled(pendingStarts);

  const servers = [...sharedChromeDevtoolsServers.entries()].filter(([key]) =>
    belongsToRuntime(key),
  );
  for (const [key] of servers) {
    sharedChromeDevtoolsServers.delete(key);
  }
  for (const key of [...sharedChromeDevtoolsServerStarts.keys()]) {
    if (belongsToRuntime(key)) sharedChromeDevtoolsServerStarts.delete(key);
  }
  for (const key of [...sharedBrowserMatrixPageIds.keys()]) {
    if (belongsToRuntime(key)) sharedBrowserMatrixPageIds.delete(key);
  }

  if (servers.length === 0) {
    return;
  }

  await Promise.all(
    servers.map(async ([workerName, server]) => {
      await server.close().catch((error) => {
        monitorLog("chrome-devtools.close.error", {
          reason,
          workerName,
          error,
        });
      });
    }),
  );
}

export function withBrowserRuntimeScope<T>(id: string, action: () => T) {
  return browserRuntimeContext.run({ id }, action);
}

export function getBrowserRuntimeWorkerKey(workerName: BrowserViewportName) {
  return `${browserRuntimeContext.getStore()?.id ?? "shared"}:${workerName}`;
}

export function isBrowserInfrastructureError(message: string) {
  return [
    /Chrome DevTools MCP is not available/i,
    /MCP error .*Request timed out/i,
    /Request timed out/i,
    /Target closed/i,
    /browser has disconnected/i,
    /No page selected/i,
    /created no selectable browser page/i,
  ].some((pattern) => pattern.test(message));
}

function attachRunnerMonitor(runner: Runner) {
  runner.on("agent_start", (_context, agent, turnInput) => {
    monitorLog("agent.start", {
      agent: agent.name,
      inputItems: Array.isArray(turnInput) ? turnInput.length : undefined,
    });
  });

  runner.on("agent_tool_start", (_context, agent, tool, details) => {
    monitorLog("tool.start", {
      agent: agent.name,
      tool: tool.name,
      toolCall: summarizeToolCallForLog(details.toolCall),
    });
  });

  runner.on("agent_tool_end", (_context, _agent, tool, result, details) => {
    const toolCall = summarizeToolCallForLog(details.toolCall);
    monitorLog("tool.end", {
      tool: tool.name,
      callId: asRecord(toolCall)?.callId,
      result: summarizeValueForLog(result),
    });
  });

  runner.on("agent_end", (_context, agent, output) => {
    monitorLog("agent.end", {
      agent: agent.name,
      outputLength: typeof output === "string" ? output.length : undefined,
    });
  });
}
