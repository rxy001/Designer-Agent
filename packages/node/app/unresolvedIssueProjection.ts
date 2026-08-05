import {
  isModelRepairWrapperCode,
  type ModelRepairIssueCode,
  normalizeModelRepairIssueCode,
} from "./modelRepairIssueCode.ts";

type RepairRecord = Record<string, unknown>;
export type RepairViewport = "desktop" | "tablet" | "mobile";

export type SectionIdentity = {
  sectionId?: string;
  sectionIndex?: number;
};

export type TrackDefinition =
  | { status: "resolved"; count: number; kind: "uniform"; size: number; gap: number }
  | { status: "resolved"; count: number; kind: "variable"; sizes: number[]; gap: number }
  | { status: "ambiguous"; raw?: string; gap?: number }
  | { status: "unavailable" };

export type SectionRepairTarget = {
  toolId?: string;
  toolIndexInSection?: number;
  toolIds?: string[];
  dataSlot?: string;
  occurrenceInTool?: number;
  gridArea?: RepairRecord;
  rect?: { top?: number; left?: number; width?: number; height?: number };
  relatedTargets?: RepairRecord[];
  evidence?: RepairRecord;
};

export type SectionIssueGroup = {
  code: ModelRepairIssueCode;
  targets: SectionRepairTarget[];
  occurrenceCount?: number;
};

export type SectionViewportEvidence = {
  status: "passed" | "failed" | "unavailable";
  layout?: RepairRecord;
  issues: SectionIssueGroup[];
};

export type SectionToolViewportLayoutSnapshot = {
  visible: boolean;
  gridArea?: {
    rowStart?: number;
    rowEnd?: number;
    columnStart?: number;
    columnEnd?: number;
  };
  rect?: { top?: number; left?: number; width?: number; height?: number };
};

export type SectionToolLayout = {
  toolId?: string;
  toolIndexInSection?: number;
  dataSlot?: string;
  viewports: Partial<
    Record<RepairViewport, SectionToolViewportLayoutSnapshot>
  >;
};

export type SectionRepairSection = SectionIdentity & {
  tools?: SectionToolLayout[];
};

export type RemainingSectionSummary = SectionIdentity & {
  failedViewports: RepairViewport[];
  issueCount: number;
  codes: ModelRepairIssueCode[];
};

export type RemainingScopeSummary = {
  scope: "document" | "unlocated";
  failedViewports: RepairViewport[];
  issueCount: number;
  codes: ModelRepairIssueCode[];
};

export type SectionRepairRequest = {
  scope: "section" | "document" | "unlocated";
  section?: SectionRepairSection;
  relatedSections?: SectionIdentity[];
  reason:
    | "single-section"
    | "cross-section-overlap"
    | "downstream-displacement"
    | "document-overflow-owner"
    | "unlocated-diagnosis";
  viewports: Record<RepairViewport, SectionViewportEvidence>;
  remainingSections: RemainingSectionSummary[];
  remainingScopes?: RemainingScopeSummary[];
};

export type RepairViewportInput = {
  available?: boolean;
  sections?: RepairRecord[];
};

type MutableIssue = {
  code: ModelRepairIssueCode;
  targets: SectionRepairTarget[];
  targetIndexes: Map<string, number>;
  occurrenceCount: number;
};

type MutableScope = {
  scope: SectionRepairRequest["scope"];
  section?: SectionIdentity;
  viewports: Map<RepairViewport, Map<ModelRepairIssueCode, MutableIssue>>;
  fallbackLayouts: Map<RepairViewport, RepairRecord>;
  relatedSections: Map<string, SectionIdentity>;
};

const repairViewports: RepairViewport[] = ["desktop", "tablet", "mobile"];

/**
 * Projects all collected failures into one atomic repair turn: one Section (or
 * document boundary) across all three viewports. Nothing is semantically
 * truncated; every other failing Section remains visible in remainingSections.
 */
export function projectUnresolvedIssues({
  facts,
  viewports = {},
}: {
  facts: RepairRecord[];
  viewports?: Partial<Record<RepairViewport, RepairViewportInput>>;
}): SectionRepairRequest | undefined {
  const scopes: MutableScope[] = [];
  const scopeIndexes = new Map<string, number>();

  for (const fact of facts) {
    const factScope = readRecord(fact.scope);
    const factViewports = readViewportArray(fact.affectedViewports);
    const samples = readRecordArray(fact.samples);
    const effectiveSamples = samples.length > 0 ? samples : [{}];

    for (const sample of effectiveSamples) {
      const sampleTarget = readRecord(sample.target);
      const section = compactIdentity({
        sectionId: readString(sampleTarget?.sectionId) ?? readString(factScope?.sectionId),
        sectionIndex:
          readNumber(sampleTarget?.sectionIndex) ?? readNumber(factScope?.sectionIndex),
      });
      const sampleViewport = readViewport(sample.viewport);
      const selectedViewports = sampleViewport
        ? [sampleViewport]
        : factViewports.length > 0
          ? factViewports
          : ["desktop" as const];
      const codes = getSampleCodes(sample, fact);
      const scope = identityExists(section)
        ? "section"
        : codes.some((code) => code.startsWith("document-"))
          ? "document"
          : "unlocated";
      const scopeKey = scope === "section" ? identityKey(section) : scope;
      let mutable = scopes[scopeIndexes.get(scopeKey) ?? -1];
      if (!mutable) {
        mutable = {
          scope,
          section: scope === "section" ? section : undefined,
          viewports: new Map(),
          fallbackLayouts: new Map(),
          relatedSections: new Map(),
        };
        scopeIndexes.set(scopeKey, scopes.length);
        scopes.push(mutable);
      }

      for (const viewport of selectedViewports) {
        const layout = readRecord(fact.layout) ?? readRecord(sample.sectionLayout);
        if (layout) mutable.fallbackLayouts.set(viewport, layout);
        for (const code of codes) {
          addIssue(mutable, viewport, code, buildTarget(sample, factScope));
        }
      }
      collectRelatedSections(mutable, sample, section);
    }

    applyOccurrenceCounts(fact, scopes);
  }

  if (scopes.length === 0) return undefined;
  const sectionScopes = scopes
    .filter((scope) => scope.scope === "section")
    .sort(compareSectionRepairPriority);
  const selected =
    sectionScopes[0] ??
    scopes.find((scope) => scope.scope === "document") ??
    scopes[0]!;
  const relatedSections = [...selected.relatedSections.values()];
  return compact({
    scope: selected.scope,
    section: selected.section
      ? compact({
          ...selected.section,
          tools: nonEmpty(buildSectionTools(selected.section, viewports)),
        })
      : undefined,
    relatedSections: relatedSections.length > 0 ? relatedSections : undefined,
    reason: getRepairReason(selected),
    viewports: Object.fromEntries(
      repairViewports.map((viewport) => [
        viewport,
        buildViewportEvidence(selected, viewport, viewports[viewport]),
      ]),
    ),
    remainingSections: sectionScopes
      .filter((scope) => scope !== selected && scope.section)
      .map(summarizeRemainingSection),
    remainingScopes: nonEmpty(
      scopes
        .filter((scope) => scope !== selected && scope.scope !== "section")
        .map(summarizeRemainingScope),
    ),
  }) as SectionRepairRequest;
}

function compareSectionRepairPriority(left: MutableScope, right: MutableScope) {
  const scoreDifference =
    getSectionRepairPriority(right) - getSectionRepairPriority(left);
  if (scoreDifference !== 0) return scoreDifference;
  const leftIndex = left.section?.sectionIndex ?? Number.MAX_SAFE_INTEGER;
  const rightIndex = right.section?.sectionIndex ?? Number.MAX_SAFE_INTEGER;
  if (leftIndex !== rightIndex) return leftIndex - rightIndex;
  return (left.section?.sectionId ?? "").localeCompare(
    right.section?.sectionId ?? "",
  );
}

function getSectionRepairPriority(scope: MutableScope) {
  const failedViewports = repairViewports.filter(
    (viewport) => (scope.viewports.get(viewport)?.size ?? 0) > 0,
  );
  const issues = failedViewports.flatMap((viewport) => [
    ...(scope.viewports.get(viewport)?.values() ?? []),
  ]);
  const codes = [...new Set(issues.map((issue) => issue.code))];
  const maximumSeverity = Math.max(0, ...codes.map(getRepairCodeSeverity));
  const occurrenceCount = issues.reduce(
    (total, issue) => total + issue.occurrenceCount,
    0,
  );
  return (
    maximumSeverity +
    codes.length * 20 +
    failedViewports.length * 10 +
    Math.min(occurrenceCount, 20) +
    Math.min(scope.relatedSections.size, 3) * 60
  );
}

function getRepairCodeSeverity(code: ModelRepairIssueCode) {
  if (code === "document-horizontal-overflow") return 1_200;
  if (code === "unintended-overlap") return 1_100;
  if (
    code.endsWith("-x") ||
    code.includes("horizontal")
  ) {
    return 1_000;
  }
  if (code === "grid-area-overflow") return 950;
  if (
    code.endsWith("-y") ||
    code.includes("vertical") ||
    code.includes("containment")
  ) {
    return 800;
  }
  if (code.includes("image")) return 700;
  if (code.includes("contrast")) return 500;
  if (code.includes("empty") || code.includes("unused-space")) return 300;
  return 600;
}

function addIssue(
  scope: MutableScope,
  viewport: RepairViewport,
  code: ModelRepairIssueCode,
  target: SectionRepairTarget,
) {
  let issues = scope.viewports.get(viewport);
  if (!issues) {
    issues = new Map();
    scope.viewports.set(viewport, issues);
  }
  let issue = issues.get(code);
  if (!issue) {
    issue = { code, targets: [], targetIndexes: new Map(), occurrenceCount: 0 };
    issues.set(code, issue);
  }
  issue.occurrenceCount += 1;
  const targetIdentity = compact({ ...target, evidence: undefined, relatedTargets: undefined });
  const key = JSON.stringify(targetIdentity);
  const existingIndex = issue.targetIndexes.get(key);
  if (existingIndex === undefined) {
    issue.targetIndexes.set(key, issue.targets.length);
    issue.targets.push(target);
    return;
  }
  const existing = issue.targets[existingIndex]!;
  issue.targets[existingIndex] = compact({
    ...existing,
    relatedTargets: mergeRecordArrays(existing.relatedTargets, target.relatedTargets),
    evidence: mergeRecords(existing.evidence, target.evidence),
  }) as SectionRepairTarget;
}

function buildViewportEvidence(
  scope: MutableScope,
  viewport: RepairViewport,
  viewportInput: RepairViewportInput | undefined,
): SectionViewportEvidence {
  const mutableIssues = [...(scope.viewports.get(viewport)?.values() ?? [])];
  const snapshot = scope.section
    ? viewportInput?.sections?.find((candidate) =>
        sameIdentity(readSectionIdentity(candidate), scope.section!),
      )
    : undefined;
  const rawLayout = readRecord(snapshot?.layout) ?? scope.fallbackLayouts.get(viewport);
  const unavailable =
    viewportInput?.available === false ||
    (scope.scope === "section"
      ? !rawLayout && mutableIssues.length === 0
      : !viewportInput && !rawLayout && mutableIssues.length === 0);
  return {
    status: unavailable ? "unavailable" : mutableIssues.length > 0 ? "failed" : "passed",
    ...(rawLayout ? { layout: compactSectionLayout(rawLayout) } : {}),
    issues: mutableIssues.map(({ targetIndexes: _targetIndexes, ...issue }) => compact({
      code: issue.code,
      targets: issue.targets,
      occurrenceCount:
        issue.occurrenceCount > issue.targets.length ? issue.occurrenceCount : undefined,
    }) as SectionIssueGroup),
  };
}

function buildSectionTools(
  section: SectionIdentity,
  viewports: Partial<Record<RepairViewport, RepairViewportInput>>,
): SectionToolLayout[] {
  const tools = new Map<string, SectionToolLayout>();

  for (const viewport of repairViewports) {
    const snapshot = viewports[viewport]?.sections?.find((candidate) =>
      sameIdentity(readSectionIdentity(candidate), section),
    );
    for (const tool of compactSectionTools(snapshot?.tools)) {
      const key = tool.toolId
        ? `id:${tool.toolId}`
        : `index:${tool.toolIndexInSection}`;
      const existing = tools.get(key);
      const { visible, gridArea, rect } = tool;
      const viewportLayout = compact({ visible, gridArea, rect });
      if (existing) {
        existing.viewports[viewport] = viewportLayout as SectionToolViewportLayoutSnapshot;
        continue;
      }
      tools.set(key, {
        toolId: tool.toolId,
        toolIndexInSection: tool.toolIndexInSection,
        dataSlot: tool.dataSlot,
        viewports: {
          [viewport]: viewportLayout as SectionToolViewportLayoutSnapshot,
        },
      });
    }
  }

  return [...tools.values()];
}

function compactSectionTools(value: unknown) {
  return readRecordArray(value).flatMap((tool) => {
    const toolId = readString(tool.toolId);
    const toolIndexInSection = readNumber(tool.toolIndexInSection);
    if (!toolId && toolIndexInSection === undefined) return [];
    const rawGridArea = readRecord(tool.gridArea);
    const gridArea = rawGridArea
      ? compact({
          rowStart: readNumber(rawGridArea.rowStart),
          rowEnd: readNumber(rawGridArea.rowEnd),
          columnStart: readNumber(rawGridArea.columnStart),
          columnEnd: readNumber(rawGridArea.columnEnd),
        })
      : undefined;
    return [compact({
      toolId,
      toolIndexInSection,
      dataSlot: readString(tool.dataSlot),
      visible: readBoolean(tool.visible) ?? false,
      gridArea:
        gridArea && Object.keys(gridArea).length > 0 ? gridArea : undefined,
      rect: compactRect(readRecord(tool.rect)),
    }) as SectionToolViewportLayoutSnapshot & {
      toolId?: string;
      toolIndexInSection?: number;
      dataSlot?: string;
    }];
  });
}

function compactSectionLayout(raw: RepairRecord) {
  const authored = readRecord(raw.authored);
  const padding = compactInsets(raw, "padding");
  const border = compactInsets(raw, "border");
  const computed = compact({
    borderBox: compact({ width: readNumber(raw.borderBoxWidth) ?? readNumber(raw.width), height: readNumber(raw.borderBoxHeight) ?? readNumber(raw.height) }),
    contentBox: compact({ width: readNumber(raw.contentWidth), height: readNumber(raw.contentHeight) }),
    padding: Object.keys(padding).length > 0 ? padding : undefined,
    border: Object.keys(border).length > 0 ? border : undefined,
    rows: compactTrack(raw, "row"),
    columns: compactTrack(raw, "column"),
  });
  return compact({
    authored: authored
      ? compact({
          source: readString(authored.source),
          height: readNumber(authored.height),
          rows: compact({ count: readNumber(authored.rows), gap: readNumber(authored.rowGap) }),
          columns: compact({ count: readNumber(authored.columns), gap: readNumber(authored.columnGap) }),
        })
      : undefined,
    computed,
  });
}

function compactTrack(raw: RepairRecord, axis: "row" | "column"): TrackDefinition {
  const title = axis === "row" ? "Row" : "Column";
  const status = readString(raw[`${axis}TrackParsing`]);
  if (status === "unavailable") return { status: "unavailable" };
  const gap = readNumber(raw[`${axis}Gap`]) ?? 0;
  if (status !== "resolved") {
    return compact({ status: "ambiguous", raw: readString(raw[`gridTemplate${title}s`]), gap }) as TrackDefinition;
  }
  const sizes = readNumberArray(raw[`${axis}TrackSizes`]);
  const count = readNumber(raw[axis === "row" ? "rows" : "columns"]) ?? sizes.length;
  const uniform = readNumber(raw[`uniform${title}TrackSize`]);
  return uniform !== undefined
    ? { status: "resolved", count, kind: "uniform", size: uniform, gap }
    : { status: "resolved", count, kind: "variable", sizes, gap };
}

function buildTarget(sample: RepairRecord, factScope: RepairRecord | undefined): SectionRepairTarget {
  const target = readRecord(sample.target);
  const toolId = readString(target?.toolId) ?? readString(factScope?.toolId);
  const relatedTargets = compactRelatedTargets(sample.relatedTargets);
  return compact({
    toolId,
    toolIndexInSection: toolId ? undefined : readNumber(target?.toolIndexInSection) ?? readNumber(factScope?.toolIndexInSection),
    toolIds: toolId ? undefined : nonEmpty(readStringArray(target?.toolIds)) ?? nonEmpty(readStringArray(factScope?.toolIds)),
    dataSlot: readString(target?.dataSlot),
    occurrenceInTool: readNumber(target?.occurrenceInTool),
    gridArea: readRecord(target?.gridArea),
    rect: compactRect(readRecord(target?.rect)),
    relatedTargets: relatedTargets.length > 0 ? relatedTargets : undefined,
    evidence: buildEvidence(sample),
  }) as SectionRepairTarget;
}

function buildEvidence(sample: RepairRecord) {
  const measurements = readRecord(sample.measurements);
  const scalarOverflow = compact({
    right: readNumber(measurements?.overflowRight),
  });
  const evidence = compact({
    overflow:
      readRecord(measurements?.scrollVsClient) ??
      readRecord(measurements?.paintVsGridArea) ??
      (Object.keys(scalarOverflow).length > 0 ? scalarOverflow : undefined),
    contrast: readRecord(measurements?.contrast),
    overlapArea: readNumber(measurements?.overlapArea) ?? readNumber(measurements?.area),
    unusedBottom: readNumber(measurements?.unusedBottom),
    allowedUnusedBottom: readNumber(measurements?.allowedUnusedBottom),
    excessUnusedBottom: readNumber(measurements?.excessUnusedBottom),
    unusedTrailingRows: readNumber(measurements?.unusedTrailingRows),
    minimumTrailingRows: readNumber(measurements?.minimumTrailingRows),
    sectionRows: readNumber(measurements?.sectionRows),
    maximumUsedRowEnd: readNumber(measurements?.maximumUsedRowEnd),
    unusedSpaceDetection: readString(measurements?.unusedSpaceDetection),
    context: nonEmptyRecord(readRecord(sample.context)),
  });
  return Object.keys(evidence).length > 0 ? evidence : undefined;
}

function compactRect(rect: RepairRecord | undefined) {
  if (!rect) return undefined;
  return compact({ top: readNumber(rect.top), left: readNumber(rect.left), width: readNumber(rect.width), height: readNumber(rect.height) });
}

function compactInsets(raw: RepairRecord, prefix: "padding" | "border") {
  return compact({
    top: nonZero(readNumber(raw[`${prefix}Top`])),
    right: nonZero(readNumber(raw[`${prefix}Right`])),
    bottom: nonZero(readNumber(raw[`${prefix}Bottom`])),
    left: nonZero(readNumber(raw[`${prefix}Left`])),
  });
}

function getSampleCodes(sample: RepairRecord, fact: RepairRecord) {
  const rawCodes = readStringArray(sample.issues);
  const factCode = readString(fact.code);
  if (rawCodes.length === 0 && factCode) rawCodes.push(factCode);
  return [...new Set(rawCodes.filter((code) => !isModelRepairWrapperCode(code)).map(normalizeModelRepairIssueCode))];
}

function getRepairReason(scope: MutableScope): SectionRepairRequest["reason"] {
  if (scope.scope === "document") return "document-overflow-owner";
  if (scope.scope === "unlocated") return "unlocated-diagnosis";
  if (scope.relatedSections.size > 0) {
    const codes = [...scope.viewports.values()].flatMap((issues) => [...issues.keys()]);
    return codes.includes("unintended-overlap")
      ? "cross-section-overlap"
      : "downstream-displacement";
  }
  return "single-section";
}

function summarizeRemainingScope(scope: MutableScope): RemainingScopeSummary {
  const failedViewports = repairViewports.filter(
    (viewport) => (scope.viewports.get(viewport)?.size ?? 0) > 0,
  );
  const issues = failedViewports.flatMap((viewport) => [
    ...(scope.viewports.get(viewport)?.values() ?? []),
  ]);
  return {
    scope: scope.scope as "document" | "unlocated",
    failedViewports,
    issueCount: issues.reduce((total, issue) => total + issue.occurrenceCount, 0),
    codes: [...new Set(issues.map((issue) => issue.code))],
  };
}

function summarizeRemainingSection(scope: MutableScope): RemainingSectionSummary {
  const failedViewports = repairViewports.filter((viewport) => (scope.viewports.get(viewport)?.size ?? 0) > 0);
  const issues = failedViewports.flatMap((viewport) => [...(scope.viewports.get(viewport)?.values() ?? [])]);
  return {
    ...scope.section!,
    failedViewports,
    issueCount: issues.reduce((total, issue) => total + issue.occurrenceCount, 0),
    codes: [...new Set(issues.map((issue) => issue.code))],
  };
}

function collectRelatedSections(scope: MutableScope, sample: RepairRecord, owner: SectionIdentity) {
  for (const target of compactRelatedTargets(sample.relatedTargets)) {
    const related = readSectionIdentity(target);
    if (!identityExists(related) || sameIdentity(related, owner)) continue;
    scope.relatedSections.set(identityKey(related), related);
  }
}

function compactRelatedTargets(value: unknown) {
  return readRecordArray(value).map((target) => compact({
    sectionId: readString(target.sectionId),
    sectionIndex: readNumber(target.sectionIndex),
    toolId: readString(target.toolId),
    toolIndexInSection: readNumber(target.toolIndexInSection),
    dataSlot: readString(target.dataSlot),
    rect: compactRect(readRecord(target.rect)),
  }));
}

function applyOccurrenceCounts(fact: RepairRecord, scopes: MutableScope[]) {
  const counts = Object.entries(readNumberRecord(fact.issueCounts)).reduce<
    Map<ModelRepairIssueCode, number>
  >((result, [rawCode, count]) => {
    const code = normalizeModelRepairIssueCode(rawCode);
    result.set(code, (result.get(code) ?? 0) + count);
    return result;
  }, new Map());
  const factViewports = new Set([
    ...readViewportArray(fact.affectedViewports),
    ...readRecordArray(fact.samples).flatMap((sample) => {
      const viewport = readViewport(sample.viewport);
      return viewport ? [viewport] : [];
    }),
  ]);
  if (counts.size === 0 || factViewports.size === 0) return;
  const affected = scopes.filter((scope) => {
    const factScope = readRecord(fact.scope);
    const identity = compactIdentity({ sectionId: readString(factScope?.sectionId), sectionIndex: readNumber(factScope?.sectionIndex) });
    return identityExists(identity) ? sameIdentity(scope.section ?? {}, identity) : scope.scope !== "section";
  });
  if (affected.length !== 1) return;
  const scope = affected[0]!;
  for (const viewport of factViewports) {
    const issues = scope.viewports.get(viewport);
    if (!issues) continue;
    for (const [code, count] of counts) {
      const issue = issues.get(code);
      if (issue) issue.occurrenceCount = Math.max(issue.occurrenceCount, count);
    }
  }
}

function readSectionIdentity(value: RepairRecord): SectionIdentity {
  return compactIdentity({ sectionId: readString(value.sectionId), sectionIndex: readNumber(value.sectionIndex) });
}
function compactIdentity(value: SectionIdentity) { return compact(value) as SectionIdentity; }
function identityExists(value: SectionIdentity) { return Boolean(value.sectionId) || value.sectionIndex !== undefined; }
function identityKey(value: SectionIdentity) { return value.sectionId ? `id:${value.sectionId}` : `index:${value.sectionIndex}`; }
function sameIdentity(a: SectionIdentity, b: SectionIdentity) {
  return a.sectionId && b.sectionId ? a.sectionId === b.sectionId : a.sectionIndex !== undefined && b.sectionIndex !== undefined && a.sectionIndex === b.sectionIndex;
}
function readViewport(value: unknown): RepairViewport | undefined { return repairViewports.find((viewport) => viewport === value); }
function readViewportArray(value: unknown) { return readStringArray(value).flatMap((item) => { const viewport = readViewport(item); return viewport ? [viewport] : []; }); }
function mergeRecordArrays(left?: RepairRecord[], right?: RepairRecord[]) { const values = [...(left ?? []), ...(right ?? [])]; return values.length > 0 ? [...new Map(values.map((value) => [JSON.stringify(value), value])).values()] : undefined; }
function mergeRecords(left?: RepairRecord, right?: RepairRecord): RepairRecord | undefined { if (!left) return right; if (!right) return left; return { ...left, ...right }; }
function nonZero(value: number | undefined) { return value === 0 ? undefined : value; }
function nonEmpty<T>(value: T[]) { return value.length > 0 ? value : undefined; }
function nonEmptyRecord(value: RepairRecord | undefined) { return value && Object.keys(value).length > 0 ? value : undefined; }
function compact(record: RepairRecord) { return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)); }
function readRecord(value: unknown): RepairRecord | undefined { return value && typeof value === "object" && !Array.isArray(value) ? value as RepairRecord : undefined; }
function readRecordArray(value: unknown) { return Array.isArray(value) ? value.flatMap((item) => { const record = readRecord(item); return record ? [record] : []; }) : []; }
function readString(value: unknown) { return typeof value === "string" ? value : undefined; }
function readStringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function readNumber(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }
function readBoolean(value: unknown) { return typeof value === "boolean" ? value : undefined; }
function readNumberArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number" && Number.isFinite(item)) : []; }
function readNumberRecord(value: unknown) { const record = readRecord(value); return record ? Object.fromEntries(Object.entries(record).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]))) : {}; }
