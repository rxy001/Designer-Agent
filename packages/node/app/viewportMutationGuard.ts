import type { BrowserViewportName } from "./agentConfig.ts";
import {
  getActiveGridArea,
  getActiveSectionGrid,
} from "./deterministicGridRepair.ts";
import type { PageDocument, ToolNode } from "./editor/schema.ts";

const viewportOrder: readonly BrowserViewportName[] = [
  "desktop",
  "tablet",
  "mobile",
];

export type ViewportRepairContract = {
  path: string;
  baselineSource: string;
  affectedViewports: BrowserViewportName[];
  protectedViewports: BrowserViewportName[];
};

export type ViewportMutationIssue = Record<string, unknown> & {
  code: "out_of_scope_viewport_change";
  category: "responsive";
  severity: "major";
  viewport: BrowserViewportName;
  message: string;
  sectionId?: string;
  toolId?: string;
};

type BrowserInspectionLike = {
  viewports: Partial<
    Record<
      BrowserViewportName,
      {
        runtime?: { ok?: boolean };
        layout?: {
          ok?: boolean;
          sections?: Array<Record<string, unknown>>;
        };
      }
    >
  >;
};

/**
 * Reviewer issues can carry viewport scope at the issue, observation, or
 * affectedViewports level. Collect all explicit scopes; an unscoped issue is
 * intentionally not converted into a viewport contract.
 */
export function collectExplicitRepairViewports(
  value: unknown,
): BrowserViewportName[] {
  const affected = new Set<BrowserViewportName>();

  const visit = (candidate: unknown, key?: string) => {
    if (typeof candidate === "string") {
      if (
        (key === "viewport" || key === "affectedViewports") &&
        isViewport(candidate)
      ) {
        affected.add(candidate);
      }
      return;
    }
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item, key);
      return;
    }
    if (!isRecord(candidate)) return;
    for (const [childKey, child] of Object.entries(candidate)) {
      visit(child, childKey);
    }
  };

  visit(value);
  return viewportOrder.filter((viewport) => affected.has(viewport));
}

export function buildViewportRepairContract({
  path,
  baselineSource,
  issues,
}: {
  path: string;
  baselineSource: string;
  issues: unknown;
}): ViewportRepairContract | undefined {
  const affectedViewports = collectExplicitRepairViewports(issues);
  if (
    affectedViewports.length === 0 ||
    affectedViewports.length === viewportOrder.length
  ) {
    return undefined;
  }
  const affected = new Set(affectedViewports);
  return {
    path,
    baselineSource,
    affectedViewports,
    protectedViewports: viewportOrder.filter(
      (viewport) => !affected.has(viewport),
    ),
  };
}

/**
 * Compare effective Grid state, not raw responsive class tokens. This catches
 * a base-class edit that leaks into desktop while allowing a mobile override
 * whose computed desktop/tablet placement remains unchanged.
 */
export function inspectProtectedPageLayoutChanges({
  baseline,
  candidate,
  protectedViewports,
}: {
  baseline: PageDocument;
  candidate: PageDocument;
  protectedViewports: readonly BrowserViewportName[];
}): ViewportMutationIssue[] {
  const issues: ViewportMutationIssue[] = [];
  const baselineSections = new Map(
    baseline.sections.map((section) => [section.id, section]),
  );
  const candidateSections = new Map(
    candidate.sections.map((section) => [section.id, section]),
  );

  for (const viewport of protectedViewports) {
    if (!sameIds(baseline.sections, candidate.sections)) {
      issues.push(
        mutationIssue({
          viewport,
          message: `${viewport} Section order or membership changed outside the requested viewport scope.`,
          before: baseline.sections.map((section) => section.id),
          after: candidate.sections.map((section) => section.id),
        }),
      );
    }

    for (const [sectionId, baselineSection] of baselineSections) {
      const candidateSection = candidateSections.get(sectionId);
      if (!candidateSection) continue;
      const baselineGrid = comparableSectionGrid(
        getActiveSectionGrid(baselineSection, viewport),
      );
      const candidateGrid = comparableSectionGrid(
        getActiveSectionGrid(candidateSection, viewport),
      );
      if (!sameValue(baselineGrid, candidateGrid)) {
        issues.push(
          mutationIssue({
            viewport,
            sectionId,
            message: `${viewport} effective Grid for Section ${sectionId} changed outside the requested viewport scope.`,
            before: baselineGrid,
            after: candidateGrid,
          }),
        );
      }

      if (!sameIds(baselineSection.tools, candidateSection.tools)) {
        issues.push(
          mutationIssue({
            viewport,
            sectionId,
            message: `${viewport} Tool order or membership in Section ${sectionId} changed outside the requested viewport scope.`,
            before: baselineSection.tools.map((tool) => tool.id),
            after: candidateSection.tools.map((tool) => tool.id),
          }),
        );
      }

      const candidateTools = new Map(
        candidateSection.tools.map((tool) => [tool.id, tool]),
      );
      for (const baselineTool of baselineSection.tools) {
        const candidateTool = candidateTools.get(baselineTool.id);
        if (!candidateTool) continue;
        const baselineLayout = comparableToolLayout(baselineTool, viewport);
        const candidateLayout = comparableToolLayout(candidateTool, viewport);
        if (
          baselineTool.type !== candidateTool.type ||
          baselineTool.hidden !== candidateTool.hidden ||
          !sameValue(baselineLayout, candidateLayout)
        ) {
          issues.push(
            mutationIssue({
              viewport,
              sectionId,
              toolId: baselineTool.id,
              message: `${viewport} effective layout for Tool ${baselineTool.id} changed outside the requested viewport scope.`,
              before: {
                type: baselineTool.type,
                hidden: baselineTool.hidden,
                ...baselineLayout,
              },
              after: {
                type: candidateTool.type,
                hidden: candidateTool.hidden,
                ...candidateLayout,
              },
            }),
          );
        }
      }
    }
  }

  return issues;
}

/**
 * Browser geometry is the second line of defense for non-Grid changes such as
 * padding or sizing utilities. Only stable Section/Tool snapshots are used,
 * with a small tolerance for browser rounding.
 */
export function inspectProtectedBrowserGeometryChanges({
  baseline,
  candidate,
  protectedViewports,
  tolerance = 1,
}: {
  baseline: BrowserInspectionLike;
  candidate: BrowserInspectionLike;
  protectedViewports: readonly BrowserViewportName[];
  tolerance?: number;
}): ViewportMutationIssue[] {
  const issues: ViewportMutationIssue[] = [];

  for (const viewport of protectedViewports) {
    const baselineReport = baseline.viewports[viewport];
    const candidateReport = candidate.viewports[viewport];
    if (
      baselineReport?.runtime?.ok !== true ||
      candidateReport?.runtime?.ok !== true ||
      !Array.isArray(baselineReport.layout?.sections) ||
      !Array.isArray(candidateReport.layout?.sections)
    ) {
      continue;
    }
    const baselineSections = snapshotMap(
      baselineReport.layout.sections,
      "sectionId",
    );
    const candidateSections = snapshotMap(
      candidateReport.layout.sections,
      "sectionId",
    );

    for (const [sectionId, baselineSection] of baselineSections) {
      const candidateSection = candidateSections.get(sectionId);
      if (!candidateSection) continue;
      const sectionDelta = changedNumericFields(
        pickRecord(baselineSection.layout, sectionGeometryFields),
        pickRecord(candidateSection.layout, sectionGeometryFields),
        tolerance,
      );
      if (Object.keys(sectionDelta).length > 0) {
        issues.push(
          mutationIssue({
            viewport,
            sectionId,
            message: `${viewport} rendered geometry for Section ${sectionId} changed outside the requested viewport scope.`,
            changes: sectionDelta,
          }),
        );
      }

      const baselineTools = snapshotMap(baselineSection.tools, "toolId");
      const candidateTools = snapshotMap(candidateSection.tools, "toolId");
      for (const [toolId, baselineTool] of baselineTools) {
        const candidateTool = candidateTools.get(toolId);
        if (!candidateTool) continue;
        const rectDelta = changedNumericFields(
          asRecord(baselineTool.rect),
          asRecord(candidateTool.rect),
          tolerance,
        );
        const gridChanged = !sameValue(
          baselineTool.gridArea,
          candidateTool.gridArea,
        );
        const visibilityChanged =
          baselineTool.visible !== candidateTool.visible;
        if (
          Object.keys(rectDelta).length > 0 ||
          gridChanged ||
          visibilityChanged
        ) {
          issues.push(
            mutationIssue({
              viewport,
              sectionId,
              toolId,
              message: `${viewport} rendered geometry for Tool ${toolId} changed outside the requested viewport scope.`,
              changes: {
                ...(Object.keys(rectDelta).length > 0
                  ? { rect: rectDelta }
                  : {}),
                ...(gridChanged
                  ? {
                      gridArea: {
                        before: baselineTool.gridArea,
                        after: candidateTool.gridArea,
                      },
                    }
                  : {}),
                ...(visibilityChanged
                  ? {
                      visible: {
                        before: baselineTool.visible,
                        after: candidateTool.visible,
                      },
                    }
                  : {}),
              },
            }),
          );
        }
      }
    }
  }

  return issues;
}

const sectionGeometryFields = [
  "rows",
  "columns",
  "width",
  "height",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "rowGap",
  "columnGap",
] as const;

function comparableSectionGrid(
  grid: ReturnType<typeof getActiveSectionGrid>,
) {
  return {
    columns: grid.columns,
    rows: grid.rows,
    height: grid.height,
    columnGap: grid.columnGap,
    rowGap: grid.rowGap,
  };
}

function comparableToolLayout(
  tool: ToolNode,
  viewport: BrowserViewportName,
) {
  const responsive =
    viewport === "mobile"
      ? (tool.layout.responsive?.mobile ??
        tool.layout.responsive?.tablet)
      : viewport === "tablet"
        ? tool.layout.responsive?.tablet
        : undefined;
  return {
    gridArea: getActiveGridArea(tool, viewport),
    zIndex: responsive?.zIndex ?? tool.layout.zIndex,
  };
}

function mutationIssue({
  viewport,
  sectionId,
  toolId,
  message,
  ...evidence
}: {
  viewport: BrowserViewportName;
  sectionId?: string;
  toolId?: string;
  message: string;
  [key: string]: unknown;
}): ViewportMutationIssue {
  return {
    code: "out_of_scope_viewport_change",
    category: "responsive",
    severity: "major",
    viewport,
    message,
    ...(sectionId ? { sectionId } : {}),
    ...(toolId ? { toolId } : {}),
    ...evidence,
  };
}

function sameIds(
  left: ReadonlyArray<{ id: string }>,
  right: ReadonlyArray<{ id: string }>,
) {
  return sameValue(
    left.map((item) => item.id),
    right.map((item) => item.id),
  );
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function snapshotMap(value: unknown, key: string) {
  const records = Array.isArray(value)
    ? value.map(asRecord).filter((item) => item !== undefined)
    : [];
  return new Map(
    records.flatMap((record) => {
      const id = record[key];
      return typeof id === "string" ? [[id, record] as const] : [];
    }),
  );
}

function pickRecord(value: unknown, keys: readonly string[]) {
  const record = asRecord(value);
  return Object.fromEntries(
    keys.flatMap((key) =>
      typeof record?.[key] === "number" ? [[key, record[key]]] : [],
    ),
  );
}

function changedNumericFields(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
  tolerance: number,
) {
  const changes: Record<string, { before: number; after: number }> = {};
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  for (const key of keys) {
    const beforeValue = before?.[key];
    const afterValue = after?.[key];
    if (
      typeof beforeValue === "number" &&
      typeof afterValue === "number" &&
      Math.abs(beforeValue - afterValue) > tolerance
    ) {
      changes[key] = { before: beforeValue, after: afterValue };
    }
  }
  return changes;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isViewport(value: string): value is BrowserViewportName {
  return viewportOrder.some((viewport) => viewport === value);
}
