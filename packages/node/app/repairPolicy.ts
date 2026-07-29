import {
  isModelRepairWrapperCode,
  normalizeModelRepairIssueCode,
} from "./modelRepairIssueCode.ts";

type RepairRecord = Record<string, unknown>;

export function compactBrowserMatrixRepairFacts(facts: RepairRecord[]) {
  const grouped = new Map<string, RepairRecord>();

  for (const fact of facts) {
    const viewport = getString(fact, "viewport");
    const key = buildFactGroupKey(fact);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        ...fact,
        ...(viewport ? { affectedViewports: [viewport] } : {}),
        occurrenceCount: countUniqueRepairSamples(
          getRecordArray(fact, "samples"),
        ),
      });
      continue;
    }

    existing.occurrenceCount =
      (getNumber(existing, "occurrenceCount") ?? 0) +
      countUniqueRepairSamples(getRecordArray(fact, "samples"));
    existing.affectedViewports = mergeStrings(
      getStringArray(existing, "affectedViewports"),
      viewport ? [viewport] : [],
    );
    existing.sourceCodes = mergeStrings(
      getStringArray(existing, "sourceCodes"),
      getStringArray(fact, "sourceCodes"),
    );
    existing.samples = mergeRecords(
      getRecordArray(existing, "samples"),
      getRecordArray(fact, "samples"),
    );
  }

  return [...grouped.values()].map((fact) => {
    const { viewport: _viewport, ...result } = fact;
    const samples = getRecordArray(result, "samples");
    const uniqueSamples = mergeSemanticRepairSamples(samples);
    const issueStats = buildModelIssueStats(
      dedupeRecords(samples.map(normalizeRepairSampleEvidence)),
    );
    const sectionIds = uniqueStrings(samples, "sectionId");
    const toolIds = uniqueStrings(samples, "toolId");
    const sectionIndexes = uniqueNumbers(samples, "sectionIndex");
    const toolIndexes = uniqueNumbers(samples, "toolIndexInSection");
    const occurrenceCount =
      getNumber(result, "occurrenceCount") ?? samples.length;
    if (samples.length > 0) {
      result.uniqueFactCount = uniqueSamples.length;
      result.issueCounts = issueStats.issueCounts;
      result.issueTargetCounts = issueStats.issueTargetCounts;
      if (Object.keys(issueStats.issueSummaries).length > 0) {
        result.issueSummaries = issueStats.issueSummaries;
      }
      result.samples = mergeRecords(
        uniqueSamples.map((sample) =>
          compactRepairSample(sample, {
            factorSection: sectionIds.length === 1,
            factorTool: toolIds.length === 1,
          }),
        ),
        [],
      );
    }
    const scope = {
      ...(sectionIds.length === 1
        ? { sectionId: sectionIds[0] }
        : sectionIndexes.length === 1
          ? { sectionIndex: sectionIndexes[0] }
          : {}),
      ...(toolIds.length === 1
        ? { toolId: toolIds[0] }
        : toolIds.length > 1
          ? { toolIds }
          : toolIndexes.length === 1
            ? { toolIndexInSection: toolIndexes[0] }
            : {}),
    };
    if (Object.keys(scope).length > 0) result.scope = scope;
    const uniqueFactCount = getNumber(result, "uniqueFactCount") ?? 0;
    if (occurrenceCount <= uniqueFactCount) {
      delete result.occurrenceCount;
    }
    delete result.count;
    delete result.message;
    delete result.nextActions;
    delete result.indexing;
    delete result.target;
    delete result.factType;
    delete result.sectionIndex;
    delete result.toolIndexInSection;
    return result;
  });
}

export type RepairIssueSnapshot = {
  key: string;
  viewport: string;
  sectionId?: string;
  toolId?: string;
  dataSlot?: string;
  issue: string;
  consecutiveFailures: number;
  measurements?: RepairRecord;
  measurementScore?: number;
};

export type RepairIssueProgressItem = RepairIssueSnapshot & {
  status: "new" | "improved" | "persistent" | "regressed";
  previousMeasurements?: RepairRecord;
};

export type RepairIssueProgressReport = {
  items: RepairIssueProgressItem[];
  resolvedIssueKeys: string[];
  snapshots: RepairIssueSnapshot[];
};

export function buildRepairIssueProgress({
  previous,
  issues,
  verifiedViewports,
}: {
  previous: RepairIssueSnapshot[];
  issues: RepairRecord[];
  verifiedViewports: string[];
}): RepairIssueProgressReport {
  const previousByKey = new Map(previous.map((item) => [item.key, item]));
  const currentFacts = buildRepairIssueFacts(issues);
  const currentKeys = new Set(currentFacts.map((item) => item.key));
  const verified = new Set(verifiedViewports);
  const items = currentFacts.map((current): RepairIssueProgressItem => {
    const prior = previousByKey.get(current.key);
    const status = getRepairIssueStatus(prior, current);
    return {
      ...current,
      consecutiveFailures: (prior?.consecutiveFailures ?? 0) + 1,
      status,
      ...(prior?.measurements
        ? { previousMeasurements: prior.measurements }
        : {}),
    };
  });
  const resolvedIssueKeys = previous
    .filter(
      (item) => verified.has(item.viewport) && !currentKeys.has(item.key),
    )
    .map((item) => item.key)
    .sort();
  const snapshots = [
    ...previous.filter((item) => !verified.has(item.viewport)),
    ...items.map(({ status: _status, previousMeasurements: _previous, ...item }) =>
      item,
    ),
  ].sort((left, right) => left.key.localeCompare(right.key));

  return {
    items: items.sort((left, right) => left.key.localeCompare(right.key)),
    resolvedIssueKeys,
    snapshots,
  };
}

function buildRepairIssueFacts(issues: RepairRecord[]) {
  const facts = new Map<string, Omit<RepairIssueSnapshot, "consecutiveFailures">>();

  const addFact = ({
    viewport,
    sectionId,
    toolId,
    dataSlot,
    issue,
    measurements,
    relatedTargets,
  }: {
    viewport: string;
    sectionId?: string;
    toolId?: string;
    dataSlot?: string;
    issue: string;
    measurements?: RepairRecord;
    relatedTargets?: string[];
  }) => {
    const key = [
      viewport,
      sectionId ?? "",
      toolId ?? "",
      dataSlot ?? "",
      issue,
      ...(relatedTargets ?? []).sort(),
    ].join(":");
    facts.set(key, {
      key,
      viewport,
      sectionId,
      toolId,
      dataSlot,
      issue,
      ...(measurements && Object.keys(measurements).length > 0
        ? { measurements }
        : {}),
      measurementScore: getMeasurementScore(measurements, issue),
    });
  };

  for (const record of issues) {
    const viewport = getString(record, "viewport") ?? "all";
    const target = getRecord(record, "element") ?? getRecord(record, "image");
    const targetIssues = getStringArray(target, "issues");
    if (target && targetIssues.length > 0) {
      const measurements = collectIssueMeasurements(target);
      for (const issue of targetIssues) {
        addFact({
          viewport,
          sectionId: getIdentity(target, "sectionId", "sectionIndex"),
          toolId: getIdentity(target, "toolId", "toolIndexInSection"),
          dataSlot: getString(target, "dataSlot"),
          issue,
          measurements,
        });
      }
      continue;
    }

    const containment = getRecordArray(record, "gridAreaContainment");
    if (containment.length > 0) {
      for (const item of containment) {
        addFact({
          viewport,
          sectionId: getIdentity(item, "sectionId", "sectionIndex"),
          toolId: getIdentity(item, "toolId", "toolIndexInSection"),
          dataSlot: getString(item, "dataSlot"),
          issue:
            getString(item, "issue") ?? "layout-grid-area-containment",
          measurements: collectIssueMeasurements(item),
        });
      }
      continue;
    }

    const overlaps = getRecordArray(record, "overlaps");
    if (overlaps.length > 0) {
      for (const overlap of overlaps) {
        const relatedTargets = [
          buildOverlapTargetKey(overlap, "a"),
          buildOverlapTargetKey(overlap, "b"),
        ].filter((item): item is string => Boolean(item));
        addFact({
          viewport,
          sectionId: [
            getString(overlap, "aSectionId"),
            getString(overlap, "bSectionId"),
          ]
            .filter((item): item is string => Boolean(item))
            .sort()[0],
          issue: "unintended-overlap",
          measurements: compactRecord({ area: getNumber(overlap, "area") }),
          relatedTargets,
        });
      }
      continue;
    }

    addFact({
      viewport,
      sectionId: getString(record, "sectionId"),
      toolId: getString(record, "toolId"),
      dataSlot: getString(record, "dataSlot"),
      issue: getString(record, "code") ?? "unknown",
      measurements: collectIssueMeasurements(record),
    });
  }

  return [...facts.values()].map((item) => ({
    ...item,
    consecutiveFailures: 1,
  }));
}

function getRepairIssueStatus(
  previous: RepairIssueSnapshot | undefined,
  current: RepairIssueSnapshot,
): RepairIssueProgressItem["status"] {
  if (!previous) return "new";
  if (
    previous.measurementScore === undefined ||
    current.measurementScore === undefined
  ) {
    return "persistent";
  }
  if (current.measurementScore + 0.5 < previous.measurementScore) {
    return "improved";
  }
  if (current.measurementScore > previous.measurementScore + 0.5) {
    return "regressed";
  }
  return "persistent";
}

function collectIssueMeasurements(record: RepairRecord) {
  const measurements = {
    ...(getRecord(record, "measurements") ?? {}),
  };
  for (const key of ["overflow", "contrast"]) {
    const value = getRecord(record, key);
    if (value) measurements[key] = value;
  }
  for (const key of [
    "area",
    "overflowRight",
    "unusedBottom",
    "allowedUnusedBottom",
    "excessUnusedBottom",
  ]) {
    const value = getNumber(record, key);
    if (value !== undefined) measurements[key] = value;
  }
  return measurements;
}

function getMeasurementScore(
  measurements: RepairRecord | undefined,
  issue: string,
) {
  if (!measurements) return undefined;
  const contrast = getRecord(measurements, "contrast");
  const ratio = getNumber(contrast, "ratio");
  const threshold = getNumber(contrast, "threshold");
  if (issue.includes("contrast") && ratio !== undefined && threshold !== undefined) {
    return Math.max(0, threshold - ratio);
  }

  const values = collectPositiveNumbers(measurements);
  return values.length > 0 ? Math.max(...values) : undefined;
}

function collectPositiveNumbers(value: unknown): number[] {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 ? [value] : [];
  }
  if (Array.isArray(value)) return value.flatMap(collectPositiveNumbers);
  if (!value || typeof value !== "object") return [];
  return Object.values(value as RepairRecord).flatMap(collectPositiveNumbers);
}

function getIdentity(record: RepairRecord, idKey: string, indexKey: string) {
  const id = getString(record, idKey);
  if (id) return id;
  const index = getNumber(record, indexKey);
  return index === undefined ? undefined : `#${index}`;
}

function buildOverlapTargetKey(record: RepairRecord, prefix: "a" | "b") {
  const section =
    getString(record, `${prefix}SectionId`) ??
    getNumber(record, `${prefix}SectionIndex`);
  const tool =
    getString(record, `${prefix}ToolId`) ??
    getNumber(record, `${prefix}ToolIndexInSection`);
  const slot = getString(record, `${prefix}DataSlot`);
  return section === undefined && tool === undefined && slot === undefined
    ? undefined
    : `${section ?? ""}/${tool ?? ""}/${slot ?? ""}`;
}

function buildFactGroupKey(fact: RepairRecord) {
  const code = getString(fact, "code") ?? "unknown";
  const severity = getString(fact, "severity") ?? "";
  const viewport = getString(fact, "viewport") ?? "all";
  if (getString(fact, "factType") !== "section") {
    return [viewport, code, severity, getString(fact, "message") ?? ""].join("\u0000");
  }

  const samples = getRecordArray(fact, "samples");
  const sectionIds = uniqueStrings(samples, "sectionId");
  const toolIds = uniqueStrings(samples, "toolId");
  const sectionIndexes = uniqueNumbers(samples, "sectionIndex");
  const toolIndexes = uniqueNumbers(samples, "toolIndexInSection");
  return [
    viewport,
    code,
    severity,
    sectionIds.length > 0 ? sectionIds.join(",") : sectionIndexes.join(","),
    toolIds.length > 0 ? toolIds.join(",") : toolIndexes.join(","),
  ].join("\u0000");
}

function compactRepairSample(
  sample: RepairRecord,
  options: { factorSection: boolean; factorTool: boolean },
) {
  const rawType = getString(sample, "type");
  const code = getString(sample, "code");
  const rawIssues = getStringArray(sample, "issues");
  const issues = rawIssues.map(toModelFacingIssueCode);
  const unknownIssueCodes = rawIssues.filter(
    (issue) => normalizeModelRepairIssueCode(issue) === "unknown-layout-issue",
  );
  const sectionId = getString(sample, "sectionId");
  const toolId = getString(sample, "toolId");
  const target = compactRecord({
    dataSlot: getString(sample, "dataSlot"),
    sectionId: options.factorSection ? undefined : sectionId,
    toolId: options.factorTool ? undefined : toolId,
    sectionIndex:
      options.factorSection || sectionId
        ? undefined
        : getNumber(sample, "sectionIndex"),
    toolIndexInSection:
      options.factorTool || toolId
        ? undefined
        : getNumber(sample, "toolIndexInSection"),
    occurrenceInTool: getNumber(sample, "slotIndexInTool"),
    gridArea: getRecord(sample, "gridArea"),
    rect: getRecord(sample, "rect"),
  });
  const measurements: RepairRecord = {
    ...(getRecord(sample, "measurements") ?? {}),
  };
  const contrast = getRecord(sample, "contrast");
  if (contrast?.threshold === 4.5) {
    const { threshold: _threshold, ...compactContrast } = contrast;
    measurements.contrast = compactContrast;
  } else if (contrast) {
    measurements.contrast = contrast;
  }

  for (const key of [
    "unusedBottom",
    "allowedUnusedBottom",
    "excessUnusedBottom",
    "overflowRight",
  ]) {
    const value = getNumber(sample, key);
    if (value !== undefined) measurements[key] = value;
  }
  const area = getNumber(sample, "area");
  if (area !== undefined) measurements.overlapArea = area;

  const relatedTargets = [getRecord(sample, "a"), getRecord(sample, "b")]
    .flatMap((record) => (record ? [compactRelatedTarget(record)] : []))
    .filter((record) => Object.keys(record).length > 0);
  const hasStructuredTarget = Object.keys(target).length > 0;
  const text = getString(sample, "text");
  const context = compactRecord({
    code,
    originalIssueCodes:
      unknownIssueCodes.length > 0 ? unknownIssueCodes : undefined,
    src: getString(sample, "src"),
    text:
      text && (!hasStructuredTarget || hasSuspiciousHiddenText(sample))
        ? text
        : undefined,
  });
  const type =
    rawType === "overlap"
      ? "overlap"
      : rawType === "image"
        ? "image"
        : code?.startsWith("browser_")
          ? "environment"
          : hasStructuredTarget
            ? "element"
            : getNumber(sample, "overflowRight") !== undefined
              ? "document"
              : "fact";
  const normalizedIssues =
    issues.length > 0
      ? issues
      : rawType === "overlap"
        ? ["unintended-overlap"]
        : code
          ? [code]
          : [];

  return compactRecord({
    viewport: getString(sample, "viewport"),
    type,
    target: hasStructuredTarget ? target : undefined,
    issues: normalizedIssues.length > 0 ? normalizedIssues : undefined,
    measurements:
      Object.keys(measurements).length > 0 ? measurements : undefined,
    relatedTargets: relatedTargets.length > 0 ? relatedTargets : undefined,
    context: Object.keys(context).length > 0 ? context : undefined,
  });
}

function compactRelatedTarget(record: RepairRecord) {
  const sectionId = getString(record, "sectionId");
  const toolId = getString(record, "toolId");
  return compactRecord({
    dataSlot: getString(record, "dataSlot"),
    sectionId,
    toolId,
    sectionIndex: sectionId ? undefined : getNumber(record, "sectionIndex"),
    toolIndexInSection: toolId
      ? undefined
      : getNumber(record, "toolIndexInSection"),
    occurrenceInTool: getNumber(record, "slotIndexInTool"),
  });
}

function compactRecord(record: RepairRecord) {
  const result: RepairRecord = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function countUniqueRepairSamples(samples: RepairRecord[]) {
  return Math.max(mergeSemanticRepairSamples(samples).length, 1);
}

function mergeSemanticRepairSamples(samples: RepairRecord[]) {
  const result: RepairRecord[] = [];
  const mergeIndexes = new Map<string, number>();
  const exactKeys = new Set<string>();

  for (const sample of samples) {
    const normalized = normalizeRepairSampleEvidence(sample);
    const key = getMergeableContainerSampleKey(normalized);
    const existingIndex = key === undefined ? undefined : mergeIndexes.get(key);

    if (existingIndex === undefined) {
      const exactKey = JSON.stringify(normalized);
      if (key === undefined && exactKeys.has(exactKey)) continue;
      exactKeys.add(exactKey);
      if (key !== undefined) mergeIndexes.set(key, result.length);
      result.push(normalized);
      continue;
    }

    result[existingIndex] = mergeRepairSampleEvidence(
      result[existingIndex]!,
      normalized,
    );
  }

  return result;
}

function normalizeRepairSampleEvidence(sample: RepairRecord) {
  const result: RepairRecord = { ...sample };
  if (getString(result, "sectionId")) delete result.sectionIndex;
  if (getString(result, "toolId")) delete result.toolIndexInSection;
  const singularIssue = getString(result, "issue");
  const issues = canonicalizeRepairIssues(
    mergeStrings(
      getStringArray(result, "issues"),
      singularIssue ? [singularIssue] : [],
    ),
  );
  if (issues.length > 0) result.issues = issues;
  delete result.issue;

  const overflow = getRecord(result, "overflow");
  if (overflow && Object.keys(overflow).length > 0) {
    const measurements = { ...(getRecord(result, "measurements") ?? {}) };
    if (singularIssue?.includes("grid-area-overflow")) {
      measurements.paintVsGridArea = overflow;
      delete result.overflow;
    } else if (
      issues.some(
        (issue) =>
          issue === "text-overflow-x" ||
          issue === "text-overflow-y" ||
          issue === "clipped-content-x" ||
          issue === "clipped-content-y",
      )
    ) {
      measurements.scrollVsClient = overflow;
      delete result.overflow;
    }
    if (Object.keys(measurements).length > 0) {
      result.measurements = measurements;
    }
  }
  return result;
}

function canonicalizeRepairIssues(issues: string[]) {
  const result = new Set(issues);
  if (result.has("clipped-content-x")) result.delete("text-overflow-x");
  if (result.has("clipped-content-y")) result.delete("text-overflow-y");
  return [...result];
}

function buildModelIssueStats(samples: RepairRecord[]) {
  const issueCounts: Record<string, number> = {};
  const issueTargets = new Map<string, Set<string>>();
  const issueSummaries: Record<string, RepairRecord> = {};
  for (const sample of samples) {
    const rawCodes = getStringArray(sample, "issues");
    const singularCode = getString(sample, "issue");
    if (singularCode) rawCodes.push(singularCode);
    const codes = [
      ...new Set(
        rawCodes
          .filter((code) => !isModelRepairWrapperCode(code))
          .map(normalizeModelRepairIssueCode),
      ),
    ];
    const targetKey = JSON.stringify({
      sectionId: getString(sample, "sectionId"),
      sectionIndex: getNumber(sample, "sectionIndex"),
      toolId: getString(sample, "toolId"),
      toolIndexInSection: getNumber(sample, "toolIndexInSection"),
      dataSlot: getString(sample, "dataSlot"),
      slotIndexInTool: getNumber(sample, "slotIndexInTool"),
      gridArea: getRecord(sample, "gridArea"),
    });
    for (const code of codes) {
      issueCounts[code] = (issueCounts[code] ?? 0) + 1;
      const targets = issueTargets.get(code) ?? new Set<string>();
      targets.add(targetKey);
      issueTargets.set(code, targets);
      issueSummaries[code] = mergeMaximumNumbers(
        issueSummaries[code],
        collectOverflowSummary(sample),
      );
    }
  }
  return {
    issueCounts,
    issueTargetCounts: Object.fromEntries(
      [...issueTargets].map(([code, targets]) => [code, targets.size]),
    ),
    issueSummaries: Object.fromEntries(
      Object.entries(issueSummaries).filter(
        ([, summary]) => Object.keys(summary).length > 0,
      ),
    ),
  };
}

function collectOverflowSummary(value: unknown, inOverflow = false): RepairRecord {
  if (!value || typeof value !== "object") return {};
  if (Array.isArray(value)) {
    return value.reduce(
      (summary, item) =>
        mergeMaximumNumbers(summary, collectOverflowSummary(item, inOverflow)),
      {} as RepairRecord,
    );
  }
  const summary: RepairRecord = {};
  for (const [key, item] of Object.entries(value as RepairRecord)) {
    const scalarDirection = key.match(/^overflow(Top|Right|Bottom|Left)$/);
    if (scalarDirection && typeof item === "number" && Number.isFinite(item)) {
      summary[`maxOverflow${scalarDirection[1]}`] = item;
      continue;
    }
    const nextInOverflow =
      inOverflow || /overflow|scrollVsClient|paintVsGridArea/i.test(key);
    if (
      nextInOverflow &&
      ["top", "right", "bottom", "left"].includes(key) &&
      typeof item === "number" &&
      Number.isFinite(item)
    ) {
      summary[`maxOverflow${key[0]!.toUpperCase()}${key.slice(1)}`] = item;
      continue;
    }
    Object.assign(
      summary,
      mergeMaximumNumbers(
        summary,
        collectOverflowSummary(item, nextInOverflow),
      ),
    );
  }
  return summary;
}

function mergeMaximumNumbers(
  left: RepairRecord | undefined,
  right: RepairRecord | undefined,
) {
  const result: RepairRecord = { ...(left ?? {}) };
  for (const [key, value] of Object.entries(right ?? {})) {
    const current = result[key];
    result[key] =
      typeof current === "number" && typeof value === "number"
        ? Math.max(current, value)
        : current ?? value;
  }
  return result;
}

function getMergeableContainerSampleKey(sample: RepairRecord) {
  const dataSlot = getString(sample, "dataSlot");
  if (dataSlot !== "section" && sample.type !== "section") return undefined;
  return [
    "section",
    getString(sample, "viewport") ?? "all",
    getString(sample, "sectionId") ?? getNumber(sample, "sectionIndex") ?? "",
    getString(sample, "toolId") ??
      getNumber(sample, "toolIndexInSection") ??
      "",
  ].join(":");
}

function mergeRepairSampleEvidence(left: RepairRecord, right: RepairRecord) {
  const issues = mergeStrings(
    getStringArray(left, "issues"),
    getStringArray(right, "issues"),
  );
  const measurements = {
    ...(getRecord(left, "measurements") ?? {}),
    ...(getRecord(right, "measurements") ?? {}),
  };
  return {
    ...left,
    ...(issues.length > 0 ? { issues } : {}),
    ...(Object.keys(measurements).length > 0 ? { measurements } : {}),
  };
}

function toModelFacingIssueCode(issue: string) {
  return normalizeModelRepairIssueCode(issue);
}

function hasSuspiciousHiddenText(sample: RepairRecord) {
  const text = getString(sample, "text") ?? "";
  return /\p{Cf}/u.test(text);
}

function uniqueNumbers(records: RepairRecord[], key: string) {
  return [
    ...new Set(
      records.flatMap((record) => {
        const value = getNumber(record, key);
        return value === undefined ? [] : [value];
      }),
    ),
  ].sort((a, b) => a - b);
}

function uniqueStrings(records: RepairRecord[], key: string) {
  return [
    ...new Set(
      records.flatMap((record) => {
        const value = getString(record, key);
        return value === undefined ? [] : [value];
      }),
    ),
  ].sort();
}

function mergeStrings(left: string[], right: string[]) {
  return [...new Set([...left, ...right])];
}

function mergeRecords(left: RepairRecord[], right: RepairRecord[]) {
  const result: RepairRecord[] = [];
  const keys = new Set<string>();
  for (const record of [...left, ...right]) {
    const key = JSON.stringify(record);
    if (keys.has(key)) continue;
    keys.add(key);
    result.push(record);
  }
  return result;
}

function dedupeRecords(records: RepairRecord[]) {
  const result: RepairRecord[] = [];
  const keys = new Set<string>();
  for (const record of records) {
    const key = JSON.stringify(record);
    if (keys.has(key)) continue;
    keys.add(key);
    result.push(record);
  }
  return result;
}

function getRecord(record: RepairRecord | undefined, key: string) {
  const value = record?.[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RepairRecord)
    : undefined;
}

function getRecordArray(record: RepairRecord, key: string) {
  const value = record[key];
  return Array.isArray(value)
    ? value.filter(
        (item): item is RepairRecord =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function getString(record: RepairRecord | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function getNumber(record: RepairRecord | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function getStringArray(record: RepairRecord | undefined, key: string) {
  const value = record?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
