import {
  compareLayoutQuality,
  generateDeterministicGridCandidates,
  isStrictlyBetterGridRepair,
  measureLayoutQuality,
  type DeterministicGridCandidate,
  type DeterministicGridInspection,
  type GridRepairViewport,
} from "./deterministicGridRepair.ts";
import type { PageDocument } from "./editor/schema.ts";

export type VerifiedGridCandidate<TInspection extends DeterministicGridInspection> = {
  candidate: DeterministicGridCandidate;
  inspection: TInspection;
};

/**
 * Transactionally evaluates deterministic candidates and commits only the best
 * verified improvement. The caller owns filesystem projection and browser I/O.
 */
export async function runDeterministicGridRepairCycle<
  TInspection extends DeterministicGridInspection,
>({
  page,
  baselineInspection,
  viewports,
  maxCandidates,
  verifyCandidate,
  commitCandidate,
  restoreBaseline,
}: {
  page: PageDocument;
  baselineInspection: TInspection;
  viewports: readonly GridRepairViewport[];
  maxCandidates?: number;
  verifyCandidate: (
    candidate: DeterministicGridCandidate,
  ) => Promise<TInspection>;
  commitCandidate: (
    verified: VerifiedGridCandidate<TInspection>,
  ) => Promise<void>;
  restoreBaseline: () => Promise<void>;
}) {
  const baselineQuality = measureLayoutQuality(baselineInspection);
  const generatedCandidates = generateDeterministicGridCandidates({
    page,
    inspection: baselineInspection,
    viewports,
  });
  const candidates =
    maxCandidates === undefined
      ? generatedCandidates
      : generatedCandidates.slice(0, Math.max(0, maxCandidates));
  const verified: Array<VerifiedGridCandidate<TInspection>> = [];

  try {
    for (const candidate of candidates) {
      const inspection = await verifyCandidate(candidate);
      const quality = measureLayoutQuality(inspection);
      if (
        inspection.ok ||
        isStrictlyBetterGridRepair(baselineQuality, quality)
      ) {
        verified.push({ candidate, inspection });
      }
    }

    verified.sort((left, right) => {
      const qualityDelta = compareLayoutQuality(
        measureLayoutQuality(left.inspection),
        measureLayoutQuality(right.inspection),
      );
      return (
        qualityDelta ||
        left.candidate.estimatedCost - right.candidate.estimatedCost ||
        left.candidate.id.localeCompare(right.candidate.id)
      );
    });

    const best = verified[0];
    if (!best) {
      if (candidates.length > 0) await restoreBaseline();
      return {
        status: candidates.length > 0 ? "no_improvement" : "not_applicable",
        attemptedCandidateIds: candidates.map((candidate) => candidate.id),
      } as const;
    }

    await commitCandidate(best);
    return {
      status: "repaired",
      candidate: best.candidate,
      inspection: best.inspection,
      attemptedCandidateIds: candidates.map((candidate) => candidate.id),
    } as const;
  } catch (error) {
    await restoreBaseline();
    throw error;
  }
}
