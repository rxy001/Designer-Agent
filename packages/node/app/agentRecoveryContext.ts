import type { BrowserViewportName } from "./agentConfig.ts";
import type { SiteAgentWorkflowState } from "./siteAgentWorkflow.ts";

export type DesignerRecoveryEnvelope = {
  version: 1;
  phase: "repair" | "review" | "commit";
  userRequest: string;
  designSystem:
    | {
        selected: true;
        id: number;
        title: string;
        documentPath: "/workspace/design-system/DESIGN.md";
      }
    | { selected: false };
  workflowState: SiteAgentWorkflowState;
  artifact: { path: string; digest: string };
  recovery: {
    source: "review_candidate" | "verify_browser_matrix";
    message: string;
    reportId?: string;
    reportPath?: string;
  };
  failedChecks: Array<{
    code: string;
    message: string;
    affectedViewports?: BrowserViewportName[];
  }>;
  mustPreserve: Array<{ code: string; description: string }>;
  currentRepairUnit?: {
    issueCodes: string[];
    strategy: string;
    acceptanceCriteria: string[];
    prohibitedTactics: string[];
  };
  remainingRepairUnitCount: number;
  todos: Array<{
    name: string;
    status: "pending" | "in_progress" | "completed";
  }>;
  nextAction: string;
};

export function buildDesignerRecoveryPrompt(
  envelope: DesignerRecoveryEnvelope,
) {
  const designSystemInstruction = envelope.designSystem.selected
    ? [
        `Selected visual reference: ${envelope.designSystem.title}.`,
        `Reference document: ${envelope.designSystem.documentPath}`,
        "The user request remains higher authority than the reference.",
      ].join("\n")
    : [
        "No design system was selected.",
        "Continue using the user request and retained artifact identity.",
      ].join("\n");

  return [
    "Continue this task in a fresh recovery session.",
    "Original user request — highest authority:",
    envelope.userRequest,
    designSystemInstruction,
    `Current artifact: ${envelope.artifact.path}`,
    `Expected artifact digest: ${envelope.artifact.digest}`,
    `Workflow state: ${envelope.workflowState}`,
    "Active recovery context:",
    JSON.stringify(
      {
        failedChecks: envelope.failedChecks,
        mustPreserve: envelope.mustPreserve,
        currentRepairUnit: envelope.currentRepairUnit,
        remainingRepairUnitCount: envelope.remainingRepairUnitCount,
        todos: envelope.todos,
        nextAction: envelope.nextAction,
      },
      null,
      2,
    ),
    envelope.recovery.reportPath
      ? `Additional verification detail is available at ${envelope.recovery.reportPath}. Read only if the active repair context is insufficient.`
      : undefined,
    "Read the current artifact before editing.",
    "Do not rely on any previous conversation or tool output.",
    "After editing, rerun the required verification workflow.",
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
}

export function assertRecoveryEnvelopeSize(
  envelope: DesignerRecoveryEnvelope,
  maxChars: number,
) {
  if (JSON.stringify(envelope).length > maxChars) {
    throw new Error("recovery_envelope_too_large");
  }
}

export function assertRecoveryArtifactDigest(
  envelope: DesignerRecoveryEnvelope,
  currentDigest: string,
) {
  if (envelope.artifact.digest !== currentDigest) {
    throw new Error("recovery_artifact_digest_mismatch");
  }
}
