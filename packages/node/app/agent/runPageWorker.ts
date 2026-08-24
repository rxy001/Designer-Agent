import {
  applyPagePatch,
  composeSitePage,
  digestValue,
  type PageDocument,
  type SiteDocument,
} from "@designer-agent/site-contract";
import { monitorLog, run } from "../agent.ts";
import { diffPageDocuments } from "../editor/diffPageDocuments.ts";
import { pageDocumentToJsx } from "../editor/pageDocumentToJsx.ts";
import type { StagedPageDelivery } from "./stagePageDelivery.ts";
import type { UserVisibleAgentEvent } from "../userVisibleAgentEvents.ts";

const defaultBoundaryRepairAttempts = 2;

export type PageWorkerAgentRunner = typeof run;

export type RunPageWorkerDependencies = {
  agentRunner?: PageWorkerAgentRunner;
  boundaryRepairAttempts?: number;
};

export type RunPageWorkerInput = {
  batchId: string;
  taskId: string;
  site: SiteDocument;
  pageId: string;
  action: "create" | "modify";
  prompt: string;
  designSystemId: number;
  onProgress?: (text: string) => void;
  onUserEvent?: (event: UserVisibleAgentEvent) => void;
  targetSectionId?: string;
  targetToolId?: string;
  reviewerCritiqueEnabled?: boolean;
  signal?: AbortSignal;
};

export async function runPageWorker(
  input: RunPageWorkerInput,
  dependencies: RunPageWorkerDependencies = {},
): Promise<StagedPageDelivery> {
  const entry = input.site.pages.find((page) => page.id === input.pageId);
  if (!entry) throw new Error(`page_not_found:${input.pageId}`);
  const composed = composeSitePage(input.site, input.pageId);
  const headerIds = new Set(
    input.site.sharedShell.header.sections.map((section) => section.id),
  );
  const footerIds = new Set(
    input.site.sharedShell.footer.sections.map((section) => section.id),
  );
  const shellIds = new Set([...headerIds, ...footerIds]);
  const shellDigest = digestValue(
    composed.sections.filter((section) => shellIds.has(section.id)),
  );
  const shellToolIds = new Set(
    composed.sections
      .filter((section) => shellIds.has(section.id))
      .flatMap((section) => section.tools.map((tool) => tool.id)),
  );
  const shellSectionNames = new Set(
    composed.sections
      .filter((section) => shellIds.has(section.id))
      .map((section) => normalizeBoundaryName(section.name)),
  );
  const runner = dependencies.agentRunner ?? run;
  const attempts = Math.max(
    1,
    dependencies.boundaryRepairAttempts ?? defaultBoundaryRepairAttempts,
  );
  let boundaryFeedback: string[] = [];
  // Keep retrying from the latest accepted candidate. The boundary projection
  // may restore the immutable shell, but it must not discard valid Body edits
  // from the previous agent run.
  let candidateComposed = composed;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    input.signal?.throwIfAborted();
    const result = await runner({
      prompt: buildPageWorkerPrompt(
        input,
        shellIds,
        shellToolIds,
        boundaryFeedback,
      ),
      operation: input.action,
      designSystemId: input.designSystemId,
      page: candidateComposed,
      targetSectionId: input.targetSectionId,
      targetToolId: input.targetToolId,
      reviewScope: {
        kind: "page-body",
        pageId: input.pageId,
        immutableSectionIds: [...shellIds],
        immutableToolIds: [...shellToolIds],
      },
      reviewerCritiqueEnabled: input.reviewerCritiqueEnabled,
      onProgress: input.onProgress,
      onUserEvent: input.onUserEvent,
      persist: false,
      runtimeId: `site-${input.batchId}-${input.pageId}-boundary-${attempt + 1}`,
      signal: input.signal,
    });
    if (result.status !== "accepted")
      throw new Error(`page_worker_${result.status}`);

    const editedComposed = applyPagePatch(candidateComposed, result.patch);
    const projection = projectCandidateBody({
      action: input.action,
      originalBody: entry.body,
      editedComposed,
      shellIds,
      headerIds,
      footerIds,
      shellToolIds,
      shellSectionNames,
      shellDigest,
    });
    monitorLog("page_boundary.check", {
      batchId: input.batchId,
      taskId: input.taskId,
      pageId: input.pageId,
      action: input.action,
      attempt: attempt + 1,
      candidateComposedDigest: digestValue(candidateComposed),
      editedComposedDigest: digestValue(editedComposed),
      bodyDigest: digestValue(projection.body),
      bodySectionIds: projection.body.sections.map((section) => section.id),
      repairedSharedBoundary: projection.repairedSharedBoundary,
      retryReasons: projection.retryReasons,
    });

    if (projection.retryReasons.length > 0) {
      boundaryFeedback = projection.retryReasons;
      if (attempt + 1 < attempts) {
        // Restore the shared shell for the next attempt while carrying the
        // complete Body candidate forward as the new editing baseline.
        candidateComposed = {
          ...editedComposed,
          sections: [
            ...input.site.sharedShell.header.sections,
            ...projection.body.sections,
            ...input.site.sharedShell.footer.sections,
          ],
        };
        monitorLog("page_boundary.retry", {
          batchId: input.batchId,
          taskId: input.taskId,
          pageId: input.pageId,
          action: input.action,
          failedAttempt: attempt + 1,
          nextAttempt: attempt + 2,
          maxAttempts: attempts,
          reasons: projection.retryReasons,
          carriedBodyDigest: digestValue(projection.body),
          carriedBodySectionIds: projection.body.sections.map(
            (section) => section.id,
          ),
          sharedShellRestored: true,
        });
        input.onProgress?.("Correcting page boundaries");
        continue;
      }
      monitorLog("page_boundary.exhausted", {
        batchId: input.batchId,
        taskId: input.taskId,
        pageId: input.pageId,
        action: input.action,
        attempt: attempt + 1,
        maxAttempts: attempts,
        reasons: projection.retryReasons,
        bodyDigest: digestValue(projection.body),
        bodySectionIds: projection.body.sections.map((section) => section.id),
      });
      throw new Error(
        "Page generation could not keep the shared header and footer unchanged. Please retry.",
      );
    }

    monitorLog("page_boundary.accepted", {
      batchId: input.batchId,
      taskId: input.taskId,
      pageId: input.pageId,
      action: input.action,
      attempt: attempt + 1,
      bodyDigest: digestValue(projection.body),
      bodySectionIds: projection.body.sections.map((section) => section.id),
      repairedSharedBoundary: projection.repairedSharedBoundary,
    });

    if (projection.repairedSharedBoundary) {
      input.onProgress?.("Shared header and footer preserved");
    }
    const body = projection.body;
    const bodyPatch = diffPageDocuments(entry.body, body);
    const bodySource = pageDocumentToJsx(body);
    const composedSource = pageDocumentToJsx({
      ...editedComposed,
      sections: [
        ...input.site.sharedShell.header.sections,
        ...body.sections,
        ...input.site.sharedShell.footer.sections,
      ],
    });
    return {
      batchId: input.batchId,
      taskId: input.taskId,
      pageId: input.pageId,
      action: input.action,
      basePageVersion: input.action === "create" ? null : entry.body.version,
      body,
      bodyPatch,
      bodySource,
      bodySourceDigest: digestValue(bodySource),
      composedSource,
      composedSourceDigest: digestValue(composedSource),
      verificationDigest: digestValue({ patch: bodyPatch, composedSource }),
      qualityStatus: result.qualityStatus,
      unimplementedRequirements: result.unimplementedRequirements ?? [],
    };
  }

  throw new Error(
    "Page generation could not keep the shared header and footer unchanged. Please retry.",
  );
}

function buildPageWorkerPrompt(
  input: RunPageWorkerInput,
  shellIds: Set<string>,
  shellToolIds: Set<string>,
  boundaryFeedback: string[],
) {
  const allowedInternalRoutes = input.site.pages.map((page) => page.route);
  return [
    input.prompt,
    "You are editing one page in a multi-page site.",
    "Only modify the page Body. The shared Header and Footer are visible for context but are immutable.",
    `Existing internal routes (the complete allowlist): ${JSON.stringify(allowedInternalRoutes)}.`,
    "Never invent, guess, or synthesize an internal URL. Every href, url, link, route, or to value beginning with / must resolve to one of the existing internal routes listed above (query strings and fragments may be appended).",
    "If no existing route is a valid destination, omit the link property and keep the card, button, or text non-navigational. Do not create a plausible-looking placeholder route. External absolute URLs and fragment-only links are not internal routes.",
    `Immutable Header/Footer Section ids: ${JSON.stringify([...shellIds])}.`,
    `Immutable Header/Footer Tool ids: ${JSON.stringify([...shellToolIds])}.`,
    "Do not update, remove, rename, reorder, recreate, or reuse any immutable Section or Tool id.",
    "Do not add a Navbar or reproduce shared Header/Footer content in the Body.",
    "Before completing, verify that all immutable Sections and Tools are unchanged and that every intended change is inside the Body.",
    ...(boundaryFeedback.length > 0
      ? [
          "The previous candidate crossed the page Body boundary and was rejected. Correct these violations:",
          ...boundaryFeedback.map((reason) => `- ${reason}`),
          "Start again from the supplied page and produce a Body-only change.",
        ]
      : []),
  ].join("\n\n");
}

function projectCandidateBody({
  action,
  originalBody,
  editedComposed,
  shellIds,
  headerIds,
  footerIds,
  shellToolIds,
  shellSectionNames,
  shellDigest,
}: {
  action: RunPageWorkerInput["action"];
  originalBody: PageDocument;
  editedComposed: PageDocument;
  shellIds: Set<string>;
  headerIds: Set<string>;
  footerIds: Set<string>;
  shellToolIds: Set<string>;
  shellSectionNames: Set<string>;
  shellDigest: string;
}) {
  const editedShell = editedComposed.sections.filter((section) =>
    shellIds.has(section.id),
  );
  const repairedSharedBoundary =
    digestValue(editedShell) !== shellDigest ||
    editedShell.length !== shellIds.size;
  const candidateBodySections = editedComposed.sections.filter(
    (section) => !shellIds.has(section.id),
  );
  const retryReasons: string[] = [];
  const originalBodyIds = new Set(
    originalBody.sections.map((section) => section.id),
  );

  addAmbiguousBoundaryReplacement({
    region: "Header",
    expectedIds: headerIds,
    editedComposed,
    candidate: candidateBodySections[0],
    originalBodyIds,
    retryReasons,
  });
  addAmbiguousBoundaryReplacement({
    region: "Footer",
    expectedIds: footerIds,
    editedComposed,
    candidate: candidateBodySections.at(-1),
    originalBodyIds,
    retryReasons,
  });

  for (const section of candidateBodySections) {
    if (section.tools.some((tool) => tool.type === "navbar")) {
      retryReasons.push(
        `Section ${section.id} contains a Navbar outside the immutable Header.`,
      );
    }
    const reusedToolIds = section.tools
      .filter((tool) => shellToolIds.has(tool.id))
      .map((tool) => tool.id);
    if (reusedToolIds.length > 0) {
      retryReasons.push(
        `Body Section ${section.id} reuses immutable Tool ids: ${reusedToolIds.join(", ")}.`,
      );
    }
    if (
      shellSectionNames.has(normalizeBoundaryName(section.name)) &&
      !originalBody.sections.some((original) => original.id === section.id)
    ) {
      retryReasons.push(
        `Section ${section.id} appears to recreate an immutable shared region in the Body.`,
      );
    }
  }

  const body: PageDocument = {
    ...originalBody,
    title: editedComposed.title,
    sections: candidateBodySections,
  };
  const bodyPatch = diffPageDocuments(originalBody, body);
  if (bodyPatch.length === 0 && repairedSharedBoundary) {
    retryReasons.push(
      "After restoring the immutable Header and Footer, no valid Body change remained.",
    );
  }
  if (action === "create" && body.sections.length === 0) {
    retryReasons.push(
      "The created page Body is empty after restoring the immutable Header and Footer.",
    );
  }

  return {
    body,
    repairedSharedBoundary,
    retryReasons: [...new Set(retryReasons)],
  };
}

function normalizeBoundaryName(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function addAmbiguousBoundaryReplacement({
  region,
  expectedIds,
  editedComposed,
  candidate,
  originalBodyIds,
  retryReasons,
}: {
  region: "Header" | "Footer";
  expectedIds: Set<string>;
  editedComposed: PageDocument;
  candidate?: PageDocument["sections"][number];
  originalBodyIds: Set<string>;
  retryReasons: string[];
}) {
  const missingIds = [...expectedIds].filter(
    (sectionId) =>
      !editedComposed.sections.some((section) => section.id === sectionId),
  );
  if (
    missingIds.length === 0 ||
    !candidate ||
    originalBodyIds.has(candidate.id)
  )
    return;
  retryReasons.push(
    `Immutable ${region} Section ids are missing (${missingIds.join(", ")}), and new boundary Section ${candidate.id} is ambiguous.`,
  );
}
