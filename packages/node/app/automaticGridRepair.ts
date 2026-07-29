import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import {
  type DeterministicGridInspection,
  type GridRepairViewport,
} from "./deterministicGridRepair.ts";
import { runDeterministicGridRepairCycle } from "./deterministicGridRepairRuntime.ts";
import { jsxToPageDocument } from "./editor/jsxToPageDocument.ts";
import { pageDocumentToJsx } from "./editor/pageDocumentToJsx.ts";
import type { PageDocument } from "./editor/schema.ts";

export type AutomaticGridRepairEvent =
  | {
      type: "candidate_verify";
      cycle: number;
      candidateId: string;
      kind: string;
      viewport: string;
      sectionId: string;
      estimatedCost: number;
    }
  | {
      type: "candidate_committed";
      cycle: number;
      candidateId: string;
      kind: string;
      viewport: string;
      sectionId: string;
      remainingBlockerCount: number;
    }
  | {
      type: "candidate_verified";
      cycle: number;
      candidateId: string;
      kind: string;
      viewport: string;
      sectionId: string;
      ok: boolean;
      blockingIssueCount: number;
    }
  | {
      type: "no_safe_candidate";
      cycle: number;
      status: "no_improvement" | "not_applicable";
      attemptedCandidateIds: string[];
    };

export type AppliedAutomaticGridRepair = {
  candidateId: string;
  kind: string;
  viewport: string;
  sectionId: string;
};

const standalonePageSeed: PageDocument = {
  id: "page",
  title: "Page",
  version: 1,
  viewport: "desktop",
  sections: [],
};

/**
 * Runs the filesystem transaction shared by the Agent and browser E2E entrypoint.
 * Every candidate is projected to the real artifact before verification; only the
 * best verified candidate is committed, and errors restore the exact baseline.
 */
export async function runAutomaticGridRepair<
  TInspection extends DeterministicGridInspection,
>({
  hostPath,
  source,
  inspection,
  viewports,
  previousPage,
  verifyCandidate,
  onEvent,
  maxCycles,
  maxCandidates,
  snapshotRoot,
  snapshotLabel,
}: {
  hostPath: string;
  source: string;
  inspection: TInspection;
  viewports: readonly GridRepairViewport[];
  previousPage?: PageDocument;
  verifyCandidate: (input: {
    artifactModifiedAt: number;
  }) => Promise<TInspection>;
  onEvent?: (event: AutomaticGridRepairEvent) => void;
  maxCycles?: number;
  maxCandidates?: number;
  snapshotRoot?: string;
  snapshotLabel?: string;
}) {
  const snapshots = snapshotRoot
    ? await createRepairSnapshots({
        root: snapshotRoot,
        label: snapshotLabel ?? basename(hostPath),
        beforeSource: source,
      })
    : undefined;
  let currentSource = source;
  let currentInspection = inspection;
  let currentStat = await stat(hostPath);
  const applied: AppliedAutomaticGridRepair[] = [];

  for (
    let cycle = 0;
    !currentInspection.ok && (maxCycles === undefined || cycle < maxCycles);
    cycle += 1
  ) {
    let page: PageDocument;
    try {
      page = jsxToPageDocument(
        currentSource,
        { previousPage: previousPage ?? standalonePageSeed },
      );
    } catch {
      break;
    }

    const baselineSource = currentSource;
    let committedSource: string | undefined;
    let committedStat: typeof currentStat | undefined;
    const candidateSources = new Map<string, string>();

    const result = await runDeterministicGridRepairCycle({
      page,
      baselineInspection: currentInspection,
      viewports,
      maxCandidates,
      verifyCandidate: async (candidate) => {
        const candidateSource = pageDocumentToJsx(candidate.page);
        candidateSources.set(candidate.id, candidateSource);
        await writeFile(hostPath, candidateSource, "utf8");
        if (snapshots) {
          await writeCandidateRepairSnapshot({
            directory: snapshots.candidatesDirectory,
            cycle,
            candidateId: candidate.id,
            source: candidateSource,
          });
        }
        const candidateStat = await stat(hostPath);
        onEvent?.({
          type: "candidate_verify",
          cycle,
          candidateId: candidate.id,
          kind: candidate.kind,
          viewport: candidate.viewport,
          sectionId: candidate.sectionId,
          estimatedCost: candidate.estimatedCost,
        });
        const candidateInspection = await verifyCandidate({
          artifactModifiedAt: candidateStat.mtimeMs,
        });
        onEvent?.({
          type: "candidate_verified",
          cycle,
          candidateId: candidate.id,
          kind: candidate.kind,
          viewport: candidate.viewport,
          sectionId: candidate.sectionId,
          ok: candidateInspection.ok,
          blockingIssueCount: candidateInspection.blockingIssues.length,
        });
        return candidateInspection;
      },
      commitCandidate: async ({ candidate }) => {
        committedSource =
          candidateSources.get(candidate.id) ?? pageDocumentToJsx(candidate.page);
        await writeFile(hostPath, committedSource, "utf8");
        committedStat = await stat(hostPath);
      },
      restoreBaseline: async () => {
        await writeFile(hostPath, baselineSource, "utf8");
        currentStat = await stat(hostPath);
      },
    });

    if (result.status !== "repaired") {
      onEvent?.({
        type: "no_safe_candidate",
        cycle,
        status: result.status,
        attemptedCandidateIds: result.attemptedCandidateIds,
      });
      break;
    }
    if (!committedSource || !committedStat) {
      await writeFile(hostPath, baselineSource, "utf8");
      throw new Error("Automatic Grid repair committed without an artifact source.");
    }

    currentSource = committedSource;
    currentStat = committedStat;
    currentInspection = result.inspection;
    const appliedRepair: AppliedAutomaticGridRepair = {
      candidateId: result.candidate.id,
      kind: result.candidate.kind,
      viewport: result.candidate.viewport,
      sectionId: result.candidate.sectionId,
    };
    applied.push(appliedRepair);
    onEvent?.({
      type: "candidate_committed",
      cycle,
      ...appliedRepair,
      remainingBlockerCount: currentInspection.blockingIssues.length,
    });
  }

  // Re-read to make the returned source authoritative even on rollback paths.
  currentSource = await readFile(hostPath, "utf8");
  if (snapshots) {
    await writeFile(snapshots.after, currentSource, "utf8");
  }

  return {
    source: currentSource,
    fileStat: currentStat,
    inspection: currentInspection,
    applied,
  };
}

async function createRepairSnapshots({
  root,
  label,
  beforeSource,
}: {
  root: string;
  label: string;
  beforeSource: string;
}) {
  const safeLabel = label
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "artifact";
  const directory = await allocateRepairSnapshotDirectory(root, safeLabel);
  const before = join(directory, "before.jsx");
  const after = join(directory, "after.jsx");
  const candidatesDirectory = join(directory, "candidates");
  await writeFile(before, beforeSource, "utf8");
  await mkdir(candidatesDirectory);
  return { directory, before, after, candidatesDirectory };
}

async function writeCandidateRepairSnapshot({
  directory,
  cycle,
  candidateId,
  source,
}: {
  directory: string;
  cycle: number;
  candidateId: string;
  source: string;
}) {
  const safeCandidateId = candidateId.replace(/[^a-zA-Z0-9_-]+/g, "-");
  await writeFile(
    join(directory, `${String(cycle + 1).padStart(2, "0")}-${safeCandidateId}.jsx`),
    source,
    "utf8",
  );
}

async function allocateRepairSnapshotDirectory(root: string, label: string) {
  const parent = join(root, "automatic-grid-repair");
  await mkdir(parent, { recursive: true });
  const entries = await readdir(parent, { withFileTypes: true });
  const prefix = `${label}-`;
  let ordinal = Math.max(
    0,
    ...entries.flatMap((entry) => {
      if (!entry.isDirectory() || !entry.name.startsWith(prefix)) return [];
      const suffix = entry.name.slice(prefix.length);
      return /^\d+$/.test(suffix) ? [Number(suffix)] : [];
    }),
  ) + 1;

  while (true) {
    const directory = join(parent, `${label}-${ordinal}`);
    try {
      await mkdir(directory);
      return directory;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        ordinal += 1;
        continue;
      }
      throw error;
    }
  }
}
