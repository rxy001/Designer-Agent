import {
  calculateBorderBoxHeightForTrackSize,
  calculateFixedGridGeometry,
  calculateGridAreaGeometry,
  calculateRequiredRowSpan,
} from "./gridMath.ts";
import type {
  GridArea,
  PageDocument,
  SectionNode,
  ToolNode,
} from "./editor/schema.ts";

export type GridRepairViewport = "desktop" | "tablet" | "mobile";

export type DeterministicGridInspection = {
  ok: boolean;
  blockingIssues: Array<Record<string, unknown>>;
};

export type LayoutQuality = {
  blockerCount: number;
  overflowFactCount: number;
  totalOverflowPx: number;
  maxOverflowPx: number;
  overlapCount: number;
  totalOverlapArea: number;
  signatures: Set<string>;
};

export type DeterministicGridCandidate = {
  id: string;
  kind:
    | "expand-tool-span-in-place"
    | "expand-section-height"
    | "reflow-section-bands"
    | "compact-section-trailing-rows"
    | "shift-grid-bounds-in-place"
    | "expand-grid-bounds-within-height"
    | "repair-bounds";
  viewport: GridRepairViewport;
  sectionId: string;
  page: PageDocument;
  changedToolIds: string[];
  estimatedCost: number;
  explanation: string;
};

export type DeterministicGridRepairOptions = {
  measurementSafetyPx?: number;
  maxSectionGrowthPx?: number;
  maxSectionGrowthRatio?: number;
  maxSectionShrinkPx?: number;
  maxSectionShrinkRatio?: number;
  maxTrailingRowShrinkPx?: number;
  maxTrailingRowShrinkRatio?: number;
  maxMovedTools?: number;
};

type SectionGeometryEvidence = {
  borderBoxHeight?: number;
  contentHeight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  borderTop?: number;
  borderBottom?: number;
  trackSize?: number;
};

type GridOverflowEvidence = {
  viewport: GridRepairViewport;
  sectionId: string;
  toolId?: string;
  overflowBottom: number;
  sectionGeometry?: SectionGeometryEvidence;
};

type SectionUnusedSpaceEvidence = {
  viewport: GridRepairViewport;
  sectionId: string;
  unusedBottom: number;
  allowedUnusedBottom: number;
  unusedTrailingRows: number;
  sectionGeometry?: SectionGeometryEvidence;
};

const defaultOptions: Required<DeterministicGridRepairOptions> = {
  measurementSafetyPx: 4,
  maxSectionGrowthPx: 480,
  maxSectionGrowthRatio: 0.35,
  maxSectionShrinkPx: 480,
  maxSectionShrinkRatio: 0.5,
  maxTrailingRowShrinkPx: 960,
  maxTrailingRowShrinkRatio: 0.3,
  maxMovedTools: 24,
};

/**
 * Produces deterministic, layout-only candidates. It never changes content,
 * typography, media dimensions, component hierarchy, or horizontal placement.
 */
export function generateDeterministicGridCandidates({
  page,
  inspection,
  viewports,
  options,
}: {
  page: PageDocument;
  inspection: DeterministicGridInspection;
  viewports: readonly GridRepairViewport[];
  options?: DeterministicGridRepairOptions;
}) {
  const policy = { ...defaultOptions, ...options };
  const evidence = collectGridOverflowEvidence(inspection, viewports);
  const unusedSpaceEvidence = collectSectionUnusedSpaceEvidence(
    inspection,
    viewports,
  );
  const grouped = groupEvidenceBySection(evidence);
  const candidates: DeterministicGridCandidate[] = [
    ...generateGridBoundsCandidates(page, viewports),
  ];

  for (const unused of unusedSpaceEvidence) {
    const section = page.sections.find((item) => item.id === unused.sectionId);
    if (!section) continue;
    const compactCandidate = buildTrailingRowsCompactionCandidate({
      page,
      section,
      viewport: unused.viewport,
      evidence: unused,
      policy,
    });
    if (compactCandidate) candidates.push(compactCandidate);
  }

  for (const [key, sectionEvidence] of grouped) {
    const [viewport, sectionId] = key.split("\u0000") as [
      GridRepairViewport,
      string,
    ];
    const section = page.sections.find((item) => item.id === sectionId);
    if (!section) continue;

    const inPlaceSpanCandidate = buildInPlaceSpanCandidate({
      page,
      section,
      viewport,
      evidence: sectionEvidence,
      policy,
    });
    if (inPlaceSpanCandidate) candidates.push(inPlaceSpanCandidate);

    const heightCandidate = buildHeightCandidate({
      page,
      section,
      viewport,
      evidence: sectionEvidence,
      policy,
    });
    if (heightCandidate) candidates.push(heightCandidate);

    const reflowCandidate = buildReflowCandidate({
      page,
      section,
      viewport,
      evidence: sectionEvidence,
      policy,
    });
    if (reflowCandidate) candidates.push(reflowCandidate);
  }

  return candidates.sort(compareCandidates);
}

function buildTrailingRowsCompactionCandidate({
  page,
  section,
  viewport,
  evidence,
  policy,
}: {
  page: PageDocument;
  section: SectionNode;
  viewport: GridRepairViewport;
  evidence: SectionUnusedSpaceEvidence;
  policy: Required<DeterministicGridRepairOptions>;
}): DeterministicGridCandidate | undefined {
  if (
    (evidence.unusedBottom <= evidence.allowedUnusedBottom &&
      evidence.unusedTrailingRows < 2) ||
    hasIntentionalSectionHeight(section)
  ) {
    return undefined;
  }

  const grid = getActiveSectionGrid(section, viewport);
  const requiredRows = Math.max(
    1,
    ...section.tools.map(
      (tool) => getActiveGridArea(tool, viewport).rowEnd - 1,
    ),
  );
  if (requiredRows >= grid.rows) return undefined;

  const geometry = resolveSectionGeometry(grid, [
    {
      viewport,
      sectionId: section.id,
      overflowBottom: 0,
      sectionGeometry: evidence.sectionGeometry,
    },
  ]);
  if (geometry.trackSize <= 0) return undefined;
  const nextHeight = calculateBorderBoxHeightForTrackSize({
    rows: requiredRows,
    rowGap: grid.rowGap,
    trackSize: geometry.trackSize,
    verticalInsets: geometry.verticalInsets,
  });
  const shrink = grid.height - nextHeight;
  const hasStructurallyEmptyTrailingRows = evidence.unusedTrailingRows > 0;
  const maximumShrinkPx = hasStructurallyEmptyTrailingRows
    ? policy.maxTrailingRowShrinkPx
    : policy.maxSectionShrinkPx;
  const maximumShrinkRatio = hasStructurallyEmptyTrailingRows
    ? policy.maxTrailingRowShrinkRatio
    : policy.maxSectionShrinkRatio;
  if (
    shrink <= 0 ||
    shrink > maximumShrinkPx ||
    shrink / Math.max(1, grid.height) > maximumShrinkRatio
  ) {
    return undefined;
  }

  const nextPage = clonePage(page);
  setSectionGridForViewport(
    getRequiredSection(nextPage, section.id),
    viewport,
    { rows: requiredRows, height: nextHeight },
  );
  return {
    id: `${viewport}:${section.id}:compact-trailing-rows:${grid.rows}:${requiredRows}:${nextHeight}`,
    kind: "compact-section-trailing-rows",
    viewport,
    sectionId: section.id,
    page: nextPage,
    changedToolIds: [],
    estimatedCost: (grid.rows - requiredRows) * 2 + shrink * 0.05,
    explanation: `Removed ${grid.rows - requiredRows} unused trailing ${viewport} Grid row(s) from ${section.id} while preserving every Tool coordinate, span, and track size.`,
  };
}

function hasIntentionalSectionHeight(section: SectionNode) {
  const className = section.props?.className ?? "";
  return className.split(/\s+/).some((token) => {
    const utility = token.split(":").at(-1);
    return [
      "min-h-screen",
      "h-screen",
      "justify-end",
      "content-end",
      "items-end",
    ].includes(utility ?? "");
  });
}

/** Uses already-empty tracks before changing Section geometry or moving bands. */
function buildInPlaceSpanCandidate({
  page,
  section,
  viewport,
  evidence,
  policy,
}: {
  page: PageDocument;
  section: SectionNode;
  viewport: GridRepairViewport;
  evidence: GridOverflowEvidence[];
  policy: Required<DeterministicGridRepairOptions>;
}): DeterministicGridCandidate | undefined {
  const grid = getActiveSectionGrid(section, viewport);
  const geometry = resolveSectionGeometry(grid, evidence);
  if (geometry.trackSize <= 0) return undefined;
  const proposedAreas = new Map<string, GridArea>();

  for (const item of evidence) {
    if (!item.toolId) continue;
    const tool = section.tools.find((candidate) => candidate.id === item.toolId);
    if (!tool) continue;
    const area = getActiveGridArea(tool, viewport);
    const currentSpan = area.rowEnd - area.rowStart;
    const currentHeight = calculateGridAreaGeometry(
      currentSpan,
      geometry.trackSize,
      grid.rowGap,
    ).height;
    const requiredSpan = calculateRequiredRowSpan(
      currentHeight + item.overflowBottom + policy.measurementSafetyPx,
      geometry.trackSize,
      grid.rowGap,
    );
    if (requiredSpan <= currentSpan) continue;
    const nextArea = { ...area, rowEnd: area.rowStart + requiredSpan };
    if (nextArea.rowEnd > grid.rows + 1) return undefined;
    proposedAreas.set(tool.id, nextArea);
  }

  if (proposedAreas.size === 0) return undefined;

  for (const [toolId, proposedArea] of proposedAreas) {
    const tool = section.tools.find((candidate) => candidate.id === toolId)!;
    const originalArea = getActiveGridArea(tool, viewport);
    for (const other of section.tools) {
      if (other.id === toolId) continue;
      const otherOriginalArea = getActiveGridArea(other, viewport);
      const otherProposedArea = proposedAreas.get(other.id) ?? otherOriginalArea;
      if (
        gridAreaOverlapCells(proposedArea, otherProposedArea) >
        gridAreaOverlapCells(originalArea, otherOriginalArea)
      ) {
        return undefined;
      }
    }
  }

  const nextPage = clonePage(page);
  const nextSection = getRequiredSection(nextPage, section.id);
  let addedSpan = 0;
  for (const [toolId, nextArea] of proposedAreas) {
    const nextTool = nextSection.tools.find((tool) => tool.id === toolId)!;
    const originalArea = getActiveGridArea(nextTool, viewport);
    addedSpan += nextArea.rowEnd - originalArea.rowEnd;
    setToolGridAreaForViewport(nextTool, viewport, nextArea);
  }

  const changedToolIds = [...proposedAreas.keys()].sort();
  return {
    id: `${viewport}:${section.id}:expand-span:${changedToolIds.join(",")}:${addedSpan}`,
    kind: "expand-tool-span-in-place",
    viewport,
    sectionId: section.id,
    page: nextPage,
    changedToolIds,
    estimatedCost: addedSpan,
    explanation: `Expanded ${changedToolIds.length} overflowing Tool span(s) into existing empty ${viewport} tracks without changing Section geometry.`,
  };
}

/**
 * Produces span-preserving repairs for statically invalid row bounds.
 * Candidates prefer the smallest safe translation, then explicit rows at the
 * existing height, and only finally preserve the existing track size.
 */
export function generateGridBoundsCandidates(
  page: PageDocument,
  viewports: readonly GridRepairViewport[] = ["desktop", "tablet", "mobile"],
): DeterministicGridCandidate[] {
  const allowedViewports = new Set(viewports);
  const candidates: DeterministicGridCandidate[] = [];

  for (const originalSection of page.sections) {
    for (const viewport of ["desktop", "tablet", "mobile"] as const) {
      if (!allowedViewports.has(viewport)) continue;
      const grid = getActiveSectionGrid(originalSection, viewport);
      const areas = originalSection.tools.map((tool) =>
        getActiveGridArea(tool, viewport),
      );
      const requiredRows = Math.max(
        grid.rows,
        ...areas.map((area) => Math.max(1, area.rowEnd - 1)),
      );
      if (requiredRows === grid.rows) continue;

      const maximumGridLine = grid.rows + 1;
      const bands = buildNonOverlappingBands(originalSection.tools, viewport);
      const firstOverflowingBandIndex = bands?.findIndex(
        (band) => band.end > maximumGridLine,
      );
      if (
        bands &&
        firstOverflowingBandIndex !== undefined &&
        firstOverflowingBandIndex >= 0
      ) {
        const affectedBands = bands.slice(firstOverflowingBandIndex);
        const overflowLines = Math.max(
          ...affectedBands.map((band) => band.end - maximumGridLine),
        );
        const previousBandEnd =
          firstOverflowingBandIndex === 0
            ? 1
            : bands[firstOverflowingBandIndex - 1]!.end;
        const nextFirstStart = affectedBands[0]!.start - overflowLines;

        if (
          overflowLines > 0 &&
          nextFirstStart >= 1 &&
          nextFirstStart >= previousBandEnd
        ) {
          const shiftedPage = clonePage(page);
          const shiftedSection = getRequiredSection(
            shiftedPage,
            originalSection.id,
          );
          const changedToolIds: string[] = [];
          for (const band of affectedBands) {
            for (const tool of band.tools) {
              const originalArea = getActiveGridArea(tool, viewport);
              const shiftedArea = {
                ...originalArea,
                rowStart: originalArea.rowStart - overflowLines,
                rowEnd: originalArea.rowEnd - overflowLines,
              };
              const shiftedTool = shiftedSection.tools.find(
                (candidate) => candidate.id === tool.id,
              )!;
              setToolGridAreaForViewport(shiftedTool, viewport, shiftedArea);
              changedToolIds.push(tool.id);
            }
          }
          changedToolIds.sort();
          candidates.push({
            id: `${viewport}:${originalSection.id}:shift-bounds:${overflowLines}:${changedToolIds.join(",")}`,
            kind: "shift-grid-bounds-in-place",
            viewport,
            sectionId: originalSection.id,
            page: shiftedPage,
            changedToolIds,
            estimatedCost: overflowLines * changedToolIds.length,
            explanation: `Shifted the overflowing ${viewport} band suffix upward by the minimum ${overflowLines} row(s) while preserving every Tool span.`,
          });
        }
      }

      const addedRows = requiredRows - grid.rows;
      const fixedHeightPage = clonePage(page);
      setSectionGridForViewport(
        getRequiredSection(fixedHeightPage, originalSection.id),
        viewport,
        { rows: requiredRows },
      );
      candidates.push({
        id: `${viewport}:${originalSection.id}:expand-bounds-fixed-height:${requiredRows}`,
        kind: "expand-grid-bounds-within-height",
        viewport,
        sectionId: originalSection.id,
        page: fixedHeightPage,
        changedToolIds: [],
        estimatedCost: addedRows * 5,
        explanation: `Expanded ${originalSection.id}'s ${viewport} Grid to ${requiredRows} explicit rows without changing Section height or Tool spans.`,
      });

      const geometry = calculateFixedGridGeometry({
        height: grid.height,
        rows: grid.rows,
        rowGap: grid.rowGap,
      });
      const preservedTrackHeight = calculateBorderBoxHeightForTrackSize({
        rows: requiredRows,
        rowGap: grid.rowGap,
        trackSize: geometry.trackSize,
      });
      const preservedTrackPage = clonePage(page);
      setSectionGridForViewport(
        getRequiredSection(preservedTrackPage, originalSection.id),
        viewport,
        {
        rows: requiredRows,
          height: preservedTrackHeight,
        },
      );
      candidates.push({
        id: `repair-bounds:${viewport}:${originalSection.id}:${requiredRows}`,
        kind: "repair-bounds",
        viewport,
        sectionId: originalSection.id,
        page: preservedTrackPage,
        changedToolIds: [],
        estimatedCost:
          addedRows * 5 + Math.max(0, preservedTrackHeight - grid.height) * 0.1,
        explanation: `Expanded ${originalSection.id}'s ${viewport} Grid to ${requiredRows} rows while preserving track size and every Tool span.`,
      });
    }
  }

  return candidates.sort(compareCandidates);
}

export function measureLayoutQuality(
  inspection: DeterministicGridInspection,
): LayoutQuality {
  const facts = flattenBlockingFacts(inspection.blockingIssues);
  const overflowValues = facts.flatMap((fact) => collectOverflowValues(fact));
  const overlapAreas = facts.flatMap((fact) => collectOverlapAreas(fact));
  return {
    blockerCount: facts.length,
    overflowFactCount: overflowValues.length,
    totalOverflowPx: sum(overflowValues),
    maxOverflowPx: Math.max(0, ...overflowValues),
    overlapCount: overlapAreas.length,
    totalOverlapArea: sum(overlapAreas),
    signatures: new Set(facts.map(buildFactSignature)),
  };
}

export function isStrictlyBetterGridRepair(
  baseline: LayoutQuality,
  candidate: LayoutQuality,
) {
  const introduced = [...candidate.signatures].filter(
    (signature) => !baseline.signatures.has(signature),
  );
  if (introduced.length > 0) return false;

  return compareQualityTuple(candidate, baseline) < 0;
}

export function compareLayoutQuality(
  left: LayoutQuality,
  right: LayoutQuality,
) {
  return compareQualityTuple(left, right);
}

function buildHeightCandidate({
  page,
  section,
  viewport,
  evidence,
  policy,
}: {
  page: PageDocument;
  section: SectionNode;
  viewport: GridRepairViewport;
  evidence: GridOverflowEvidence[];
  policy: Required<DeterministicGridRepairOptions>;
}): DeterministicGridCandidate | undefined {
  const grid = getActiveSectionGrid(section, viewport);
  const geometry = resolveSectionGeometry(grid, evidence);
  if (geometry.trackSize <= 0) return undefined;

  let requiredTrackSize = geometry.trackSize;
  for (const item of evidence) {
    if (!item.toolId) {
      requiredTrackSize = Math.max(
        requiredTrackSize,
        geometry.trackSize +
          Math.ceil(
            (item.overflowBottom + policy.measurementSafetyPx) / grid.rows,
          ),
      );
      continue;
    }
    const tool = section.tools.find((candidate) => candidate.id === item.toolId);
    if (!tool) continue;
    const area = getActiveGridArea(tool, viewport);
    const span = area.rowEnd - area.rowStart;
    const currentAreaHeight = calculateGridAreaGeometry(
      span,
      geometry.trackSize,
      grid.rowGap,
    ).height;
    const requiredAreaHeight =
      currentAreaHeight + item.overflowBottom + policy.measurementSafetyPx;
    requiredTrackSize = Math.max(
      requiredTrackSize,
      Math.ceil(
        (requiredAreaHeight - Math.max(0, span - 1) * grid.rowGap) / span,
      ),
    );
  }

  if (requiredTrackSize <= geometry.trackSize) return undefined;
  const newHeight = calculateBorderBoxHeightForTrackSize({
    rows: grid.rows,
    rowGap: grid.rowGap,
    trackSize: requiredTrackSize,
    verticalInsets: geometry.verticalInsets,
  });
  const growth = newHeight - grid.height;
  if (!withinGrowthPolicy(growth, grid.height, policy)) return undefined;

  const nextPage = clonePage(page);
  setSectionGridForViewport(getRequiredSection(nextPage, section.id), viewport, {
    height: newHeight,
  });
  return {
    id: `${viewport}:${section.id}:expand-height:${newHeight}`,
    kind: "expand-section-height",
    viewport,
    sectionId: section.id,
    page: nextPage,
    changedToolIds: [],
    estimatedCost: growth * 0.1,
    explanation: `Raised ${section.id}'s ${viewport} track from ${geometry.trackSize}px to ${requiredTrackSize}px without changing Tool coordinates.`,
  };
}

function buildReflowCandidate({
  page,
  section,
  viewport,
  evidence,
  policy,
}: {
  page: PageDocument;
  section: SectionNode;
  viewport: GridRepairViewport;
  evidence: GridOverflowEvidence[];
  policy: Required<DeterministicGridRepairOptions>;
}): DeterministicGridCandidate | undefined {
  const grid = getActiveSectionGrid(section, viewport);
  const geometry = resolveSectionGeometry(grid, evidence);
  if (geometry.trackSize <= 0) return undefined;
  const desiredSpans = new Map<string, number>();

  for (const item of evidence) {
    if (!item.toolId) continue;
    const tool = section.tools.find((candidate) => candidate.id === item.toolId);
    if (!tool) continue;
    const area = getActiveGridArea(tool, viewport);
    const span = area.rowEnd - area.rowStart;
    const currentHeight = calculateGridAreaGeometry(
      span,
      geometry.trackSize,
      grid.rowGap,
    ).height;
    desiredSpans.set(
      tool.id,
      calculateRequiredRowSpan(
        currentHeight + item.overflowBottom + policy.measurementSafetyPx,
        geometry.trackSize,
        grid.rowGap,
      ),
    );
  }
  if (desiredSpans.size === 0) return undefined;

  const bands = buildNonOverlappingBands(section.tools, viewport);
  if (!bands || section.tools.length > policy.maxMovedTools) return undefined;

  const nextPage = clonePage(page);
  const nextSection = getRequiredSection(nextPage, section.id);
  let previousOriginalEnd = 1;
  let previousNextEnd = 1;
  const changedToolIds: string[] = [];

  for (const band of bands) {
    const originalGap = Math.max(0, band.start - previousOriginalEnd);
    const nextStart = previousNextEnd + originalGap;
    let nextEnd = nextStart;

    for (const member of band.tools) {
      const original = getActiveGridArea(member, viewport);
      const originalSpan = original.rowEnd - original.rowStart;
      const nextSpan = Math.max(
        originalSpan,
        desiredSpans.get(member.id) ?? originalSpan,
      );
      const nextArea = {
        ...original,
        rowStart: nextStart,
        rowEnd: nextStart + nextSpan,
      };
      nextEnd = Math.max(nextEnd, nextArea.rowEnd);
      if (!sameGridArea(original, nextArea)) {
        const nextTool = nextSection.tools.find((tool) => tool.id === member.id);
        if (!nextTool) continue;
        setToolGridAreaForViewport(nextTool, viewport, nextArea);
        changedToolIds.push(member.id);
      }
    }

    previousOriginalEnd = band.end;
    previousNextEnd = nextEnd;
  }

  if (changedToolIds.length === 0) return undefined;
  const newRows = Math.max(grid.rows, previousNextEnd - 1);
  const newHeight = Math.max(
    grid.height,
    calculateBorderBoxHeightForTrackSize({
      rows: newRows,
      rowGap: grid.rowGap,
      trackSize: geometry.trackSize,
      verticalInsets: geometry.verticalInsets,
    }),
  );
  const growth = newHeight - grid.height;
  if (growth > 0 && !withinGrowthPolicy(growth, grid.height, policy)) {
    return undefined;
  }
  setSectionGridForViewport(nextSection, viewport, {
    rows: newRows,
    height: newHeight,
  });

  return {
    id: `${viewport}:${section.id}:reflow:${newRows}:${newHeight}`,
    kind: "reflow-section-bands",
    viewport,
    sectionId: section.id,
    page: nextPage,
    changedToolIds: [...new Set(changedToolIds)].sort(),
    estimatedCost:
      [...new Set(changedToolIds)].length * 100 +
      Math.max(0, newRows - grid.rows) * 5 +
      growth * 0.1,
    explanation: `Expanded overflowing Tools, preserved band gaps, and grew ${section.id} to ${newRows} rows at ${viewport}.`,
  };
}

function collectGridOverflowEvidence(
  inspection: DeterministicGridInspection,
  viewports: readonly GridRepairViewport[],
) {
  const allowed = new Set(viewports);
  const byTarget = new Map<string, GridOverflowEvidence>();

  for (const issue of inspection.blockingIssues) {
    const viewport = readViewport(issue.viewport);
    if (!viewport || !allowed.has(viewport)) continue;

    const element = readRecord(issue.element);
    if (element) {
      addElementOverflowEvidence(byTarget, viewport, element);
    }
    for (const record of readRecordArray(issue.gridAreaContainment)) {
      const type = readString(record.type);
      const sectionId = readString(record.sectionId);
      if (!sectionId || (type !== "section" && type !== "tool")) continue;
      const toolId = type === "tool" ? readString(record.toolId) : undefined;
      if (type === "tool" && !toolId) continue;
      const overflow = readRecord(record.overflow);
      addOverflowEvidence(byTarget, {
        viewport,
        sectionId,
        ...(toolId ? { toolId } : {}),
        overflowBottom: positiveNumber(overflow?.bottom),
        sectionGeometry: readSectionGeometry(record.sectionGrid),
      });
    }
  }

  return [...byTarget.values()].filter((item) => item.overflowBottom > 0);
}

function collectSectionUnusedSpaceEvidence(
  inspection: DeterministicGridInspection,
  viewports: readonly GridRepairViewport[],
) {
  const allowed = new Set(viewports);
  const evidence: SectionUnusedSpaceEvidence[] = [];

  for (const issue of inspection.blockingIssues) {
    const viewport = readViewport(issue.viewport);
    if (!viewport || !allowed.has(viewport)) continue;
    const element = readRecord(issue.element);
    if (!element) continue;
    const sectionId = readString(element.sectionId);
    if (!sectionId) continue;
    const issues = readStringArray(element.issues);
    if (!issues.includes("section-excessive-unused-space")) continue;
    const metrics = readRecord(element.metrics);
    const unusedBottom = positiveNumber(metrics?.unusedBottom);
    const allowedUnusedBottom = positiveNumber(
      metrics?.excessiveUnusedSpaceThreshold,
    );
    const unusedTrailingRows = positiveNumber(metrics?.unusedTrailingRows);
    if (
      unusedBottom <= allowedUnusedBottom &&
      unusedTrailingRows < 2
    ) {
      continue;
    }
    evidence.push({
      viewport,
      sectionId,
      unusedBottom,
      allowedUnusedBottom,
      unusedTrailingRows,
      sectionGeometry: readSectionGeometry(element.sectionGrid),
    });
  }

  return evidence;
}

function addElementOverflowEvidence(
  target: Map<string, GridOverflowEvidence>,
  viewport: GridRepairViewport,
  element: Record<string, unknown>,
) {
  const sectionId = readString(element.sectionId);
  const toolId = readString(element.toolId);
  if (!sectionId || !toolId) return;
  const issues = readStringArray(element.issues);
  if (
    !issues.some((issue) =>
      ["text-overflow-y", "clipped-content-y", "tool-grid-area-overflow"].includes(
        issue,
      ),
    )
  ) {
    return;
  }
  const metrics = readRecord(element.metrics);
  const overflowBottom = Math.max(
    0,
    (readNumber(metrics?.scrollHeight) ?? 0) -
      (readNumber(metrics?.clientHeight) ?? 0),
  );
  addOverflowEvidence(target, {
    viewport,
    sectionId,
    toolId,
    overflowBottom,
    sectionGeometry: readSectionGeometry(element.sectionGrid),
  });
}

function addOverflowEvidence(
  target: Map<string, GridOverflowEvidence>,
  evidence: GridOverflowEvidence,
) {
  const key = `${evidence.viewport}\u0000${evidence.sectionId}\u0000${evidence.toolId ?? "@section"}`;
  const previous = target.get(key);
  target.set(key, {
    ...evidence,
    overflowBottom: Math.max(
      evidence.overflowBottom,
      previous?.overflowBottom ?? 0,
    ),
    sectionGeometry: evidence.sectionGeometry ?? previous?.sectionGeometry,
  });
}

function groupEvidenceBySection(evidence: GridOverflowEvidence[]) {
  const grouped = new Map<string, GridOverflowEvidence[]>();
  for (const item of evidence) {
    const key = `${item.viewport}\u0000${item.sectionId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return grouped;
}

function resolveSectionGeometry(
  grid: ReturnType<typeof getActiveSectionGrid>,
  evidence: GridOverflowEvidence[],
) {
  const measured = evidence.find((item) => item.sectionGeometry)?.sectionGeometry;
  const verticalInsets =
    positiveNumber(measured?.paddingTop) +
    positiveNumber(measured?.paddingBottom) +
    positiveNumber(measured?.borderTop) +
    positiveNumber(measured?.borderBottom);
  const calculated = calculateFixedGridGeometry({
    height: measured?.borderBoxHeight ?? grid.height,
    rows: grid.rows,
    rowGap: grid.rowGap,
    paddingTop: measured?.paddingTop,
    paddingBottom: measured?.paddingBottom,
    borderTop: measured?.borderTop,
    borderBottom: measured?.borderBottom,
  });
  return {
    trackSize: measured?.trackSize ?? calculated.trackSize,
    verticalInsets,
  };
}

function buildNonOverlappingBands(
  tools: ToolNode[],
  viewport: GridRepairViewport,
) {
  const byStart = new Map<number, ToolNode[]>();
  for (const tool of tools) {
    const start = getActiveGridArea(tool, viewport).rowStart;
    byStart.set(start, [...(byStart.get(start) ?? []), tool]);
  }
  const bands = [...byStart.entries()]
    .sort(([left], [right]) => left - right)
    .map(([start, members]) => ({
      start,
      end: Math.max(...members.map((tool) => getActiveGridArea(tool, viewport).rowEnd)),
      tools: members.sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
    }));
  for (let index = 1; index < bands.length; index += 1) {
    if (bands[index]!.start < bands[index - 1]!.end) return undefined;
  }
  return bands;
}

export function getActiveSectionGrid(
  section: SectionNode,
  viewport: GridRepairViewport,
) {
  if (viewport === "desktop") return { ...section.grid };
  if (viewport === "tablet") {
    return mergeDefined(section.grid, section.grid.responsive?.tablet);
  }
  return mergeDefined(
    section.grid,
    section.grid.responsive?.tablet,
    section.grid.responsive?.mobile,
  );
}

export function getActiveGridArea(
  tool: ToolNode,
  viewport: GridRepairViewport,
) {
  if (viewport === "desktop") return { ...tool.layout.gridArea };
  if (viewport === "tablet") {
    return mergeDefined(
      tool.layout.gridArea,
      tool.layout.responsive?.tablet?.gridArea,
    );
  }
  return mergeDefined(
    tool.layout.gridArea,
    tool.layout.responsive?.tablet?.gridArea,
    tool.layout.responsive?.mobile?.gridArea,
  );
}

function mergeDefined<T extends object>(
  base: T,
  ...overrides: Array<Partial<T> | undefined>
) {
  const result = { ...base };
  for (const override of overrides) {
    if (!override) continue;
    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined) {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  }
  return result;
}

function setSectionGridForViewport(
  section: SectionNode,
  viewport: GridRepairViewport,
  changes: Partial<Pick<SectionNode["grid"], "rows" | "height">>,
) {
  const tabletBefore = getActiveSectionGrid(section, "tablet");
  const mobileBefore = getActiveSectionGrid(section, "mobile");
  if (viewport === "desktop") {
    Object.assign(section.grid, changes);
    section.grid.responsive ??= {};
    section.grid.responsive.tablet = {
      ...section.grid.responsive.tablet,
      ...(changes.rows !== undefined ? { rows: tabletBefore.rows } : {}),
      ...(changes.height !== undefined ? { height: tabletBefore.height } : {}),
    };
    section.grid.responsive.mobile = {
      ...section.grid.responsive.mobile,
      ...(changes.rows !== undefined ? { rows: mobileBefore.rows } : {}),
      ...(changes.height !== undefined ? { height: mobileBefore.height } : {}),
    };
    return;
  }
  section.grid.responsive ??= {};
  if (viewport === "tablet") {
    section.grid.responsive.tablet = {
      ...section.grid.responsive.tablet,
      ...changes,
    };
    section.grid.responsive.mobile = {
      ...section.grid.responsive.mobile,
      ...(changes.rows !== undefined ? { rows: mobileBefore.rows } : {}),
      ...(changes.height !== undefined ? { height: mobileBefore.height } : {}),
    };
    return;
  }
  section.grid.responsive.mobile = {
    ...section.grid.responsive.mobile,
    ...changes,
  };
}

function setToolGridAreaForViewport(
  tool: ToolNode,
  viewport: GridRepairViewport,
  gridArea: GridArea,
) {
  const tabletBefore = getActiveGridArea(tool, "tablet");
  const mobileBefore = getActiveGridArea(tool, "mobile");
  if (viewport === "desktop") {
    tool.layout.gridArea = gridArea;
    tool.layout.responsive ??= {};
    tool.layout.responsive.tablet = {
      ...tool.layout.responsive.tablet,
      gridArea: tabletBefore,
    };
    tool.layout.responsive.mobile = {
      ...tool.layout.responsive.mobile,
      gridArea: mobileBefore,
    };
    return;
  }
  tool.layout.responsive ??= {};
  if (viewport === "tablet") {
    tool.layout.responsive.tablet = {
      ...tool.layout.responsive.tablet,
      gridArea,
    };
    tool.layout.responsive.mobile = {
      ...tool.layout.responsive.mobile,
      gridArea: mobileBefore,
    };
    return;
  }
  tool.layout.responsive.mobile = {
    ...tool.layout.responsive.mobile,
    gridArea,
  };
}

function flattenBlockingFacts(issues: Array<Record<string, unknown>>) {
  return issues.flatMap((issue) => {
    const viewport = readString(issue.viewport) ?? "all";
    const element = readRecord(issue.element);
    if (element) {
      const names = readStringArray(element.issues);
      return names.length > 0
        ? names.map((name) => ({ ...element, viewport, issue: name }))
        : [{ ...issue, viewport }];
    }
    const containment = readRecordArray(issue.gridAreaContainment);
    if (containment.length > 0) {
      return containment.map((record) => ({ ...record, viewport }));
    }
    const overlaps = readRecordArray(issue.overlaps);
    if (overlaps.length > 0) {
      return overlaps.map((record) => ({ ...record, viewport, issue: "overlap" }));
    }
    return [{ ...issue, viewport }];
  });
}

function collectOverflowValues(record: Record<string, unknown>) {
  const values: number[] = [];
  const overflow = readRecord(record.overflow);
  for (const key of ["top", "right", "bottom", "left"]) {
    const value = positiveNumber(overflow?.[key]);
    if (value > 0) values.push(value);
  }
  const metrics = readRecord(record.metrics);
  const scrollHeight = readNumber(metrics?.scrollHeight);
  const clientHeight = readNumber(metrics?.clientHeight);
  if (scrollHeight !== undefined && clientHeight !== undefined) {
    const value = scrollHeight - clientHeight;
    if (value > 0) values.push(value);
  }
  return values;
}

function collectOverlapAreas(record: Record<string, unknown>) {
  const issue = readString(record.issue);
  if (issue !== "overlap" && readNumber(record.area) === undefined) return [];
  const area = positiveNumber(record.area);
  return area > 0 ? [area] : [];
}

function buildFactSignature(record: Record<string, unknown>) {
  return [
    readString(record.viewport) ?? "all",
    readString(record.code) ?? "",
    readString(record.issue) ?? "",
    readString(record.sectionId) ?? "",
    readString(record.toolId) ?? "",
    readString(record.dataSlot) ?? "",
    readString(record.aSectionId) ?? "",
    readString(record.aToolId) ?? "",
    readString(record.aDataSlot) ?? "",
    readString(record.bSectionId) ?? "",
    readString(record.bToolId) ?? "",
    readString(record.bDataSlot) ?? "",
  ].join(":");
}

function compareQualityTuple(left: LayoutQuality, right: LayoutQuality) {
  const leftTuple = [
    left.blockerCount,
    left.overlapCount,
    left.totalOverlapArea,
    left.overflowFactCount,
    left.totalOverflowPx,
    left.maxOverflowPx,
  ];
  const rightTuple = [
    right.blockerCount,
    right.overlapCount,
    right.totalOverlapArea,
    right.overflowFactCount,
    right.totalOverflowPx,
    right.maxOverflowPx,
  ];
  for (let index = 0; index < leftTuple.length; index += 1) {
    if (leftTuple[index] !== rightTuple[index]) {
      return leftTuple[index]! - rightTuple[index]!;
    }
  }
  return 0;
}

function compareCandidates(
  left: DeterministicGridCandidate,
  right: DeterministicGridCandidate,
) {
  return (
    left.estimatedCost - right.estimatedCost ||
    left.kind.localeCompare(right.kind) ||
    left.viewport.localeCompare(right.viewport) ||
    left.sectionId.localeCompare(right.sectionId) ||
    left.id.localeCompare(right.id)
  );
}

function withinGrowthPolicy(
  growth: number,
  currentHeight: number,
  policy: Required<DeterministicGridRepairOptions>,
) {
  return (
    growth > 0 &&
    growth <= policy.maxSectionGrowthPx &&
    growth / Math.max(1, currentHeight) <= policy.maxSectionGrowthRatio
  );
}

function readSectionGeometry(value: unknown): SectionGeometryEvidence | undefined {
  const record = readRecord(value);
  if (!record) return undefined;
  return {
    borderBoxHeight: readNumber(record.borderBoxHeight),
    contentHeight: readNumber(record.contentHeight),
    paddingTop: readNumber(record.paddingTop),
    paddingBottom: readNumber(record.paddingBottom),
    borderTop: readNumber(record.borderTop),
    borderBottom: readNumber(record.borderBottom),
    trackSize: readNumber(record.trackSize),
  };
}

function getRequiredSection(page: PageDocument, sectionId: string) {
  const section = page.sections.find((item) => item.id === sectionId);
  if (!section) throw new Error(`Section ${sectionId} was not found.`);
  return section;
}

function clonePage(page: PageDocument): PageDocument {
  return structuredClone(page);
}

function sameGridArea(left: GridArea, right: GridArea) {
  return (
    left.rowStart === right.rowStart &&
    left.rowEnd === right.rowEnd &&
    left.columnStart === right.columnStart &&
    left.columnEnd === right.columnEnd
  );
}

function gridAreaOverlapCells(left: GridArea, right: GridArea) {
  const rows = Math.max(
    0,
    Math.min(left.rowEnd, right.rowEnd) -
      Math.max(left.rowStart, right.rowStart),
  );
  const columns = Math.max(
    0,
    Math.min(left.columnEnd, right.columnEnd) -
      Math.max(left.columnStart, right.columnStart),
  );
  return rows * columns;
}

function readViewport(value: unknown): GridRepairViewport | undefined {
  return value === "desktop" || value === "tablet" || value === "mobile"
    ? value
    : undefined;
}

function readRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const record = readRecord(item);
        return record ? [record] : [];
      })
    : [];
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function positiveNumber(value: unknown) {
  return Math.max(0, readNumber(value) ?? 0);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
