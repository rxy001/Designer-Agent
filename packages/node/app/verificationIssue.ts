import { createHash } from "node:crypto";

export type VerificationIssueCategory =
  | "requirement"
  | "static"
  | "runtime"
  | "layout"
  | "responsive"
  | "visual_quality"
  | "accessibility"
  | "content_integrity"
  | "delivery"
  | "infrastructure"
  | "budget"
  | "unknown";

export type VerificationRepairStrategy =
  | "retry_infrastructure"
  | "local_patch"
  | "component_rewrite"
  | "section_rewrite"
  | "page_relayout"
  | "site_regeneration"
  | "stop";

export type StructuredVerificationIssue = Record<string, unknown> & {
  code: string;
  fingerprint: string;
  category: VerificationIssueCategory;
  severity: "blocker" | "major" | "minor";
  repair: {
    repairable: boolean;
    strategy: VerificationRepairStrategy;
    forced: boolean;
    consecutiveFailures: number;
  };
  scope?: {
    viewport?: string;
    sectionId?: string;
    toolId?: string;
    dataSlot?: string;
    dimension?: string;
  };
};

export type VerificationIssueHistoryEntry = {
  fingerprint: string;
  consecutiveFailures: number;
  lastArtifactDigest?: string;
  category?: VerificationIssueCategory;
  scope?: StructuredVerificationIssue["scope"];
};

export type RelatedVerificationIssueHistoryEntry = {
  viewport?: string;
  sectionId?: string;
  toolId?: string;
  dataSlot?: string;
  consecutiveFailures: number;
};

export function structureVerificationIssues({
  issues,
  history,
  relatedHistory = [],
  artifactDigest,
}: {
  issues: unknown[];
  history: Map<string, VerificationIssueHistoryEntry>;
  relatedHistory?: RelatedVerificationIssueHistoryEntry[];
  artifactDigest?: string;
}) {
  return issues.map((issue) => {
    const record = asRecord(issue) ?? { message: String(issue) };
    const code = getString(record, "code") ?? "unknown_verification_issue";
    const category = classifyVerificationIssue(code, record);
    const scope = readScope(record);
    const fingerprint = buildVerificationIssueFingerprint({
      code: getString(record, "findingId") ?? code,
      category,
      scope,
    });
    const previous = history.get(fingerprint);
    const sameArtifact =
      previous !== undefined && previous.lastArtifactDigest === artifactDigest;
    const fingerprintFailures = sameArtifact
      ? previous.consecutiveFailures
      : (previous?.consecutiveFailures ?? 0) + 1;
    const relatedFailures = getRelatedHistoryFailureCount(
      scope,
      relatedHistory,
    );
    const semanticFailures = getSemanticVerificationHistoryFailureCount({
      fingerprint,
      category,
      scope,
      history,
      artifactDigest,
    });
    const consecutiveFailures = Math.max(
      fingerprintFailures,
      relatedFailures,
      semanticFailures,
    );
    const severity = readSeverity(record, category);
    const inferredStrategy = chooseVerificationRepairStrategy({
        code,
        category,
        consecutiveFailures,
        scope,
      });
    const unconstrainedStrategy = maxRepairStrategy(
      inferredStrategy,
      readRepairStrategy(record.requiredRepairStrategy),
      getSeverityRepairStrategyFloor({ category, severity, scope }),
    );
    const maximumRepairStrategy = readRepairStrategy(
      record.maximumRepairStrategy,
    );
    const strategy = clampRepairStrategy(
      unconstrainedStrategy,
      maximumRepairStrategy,
    );
    const repairable = !["stop"].includes(strategy);
    const evidence = omitCanonicalScopeFields(record);
    const structured: StructuredVerificationIssue = {
      ...evidence,
      code,
      fingerprint,
      category,
      severity,
      repair: {
        repairable,
        strategy,
        forced:
          repairable &&
          !["local_patch", "retry_infrastructure"].includes(strategy),
        consecutiveFailures,
      },
      ...(Object.keys(scope).length > 0 ? { scope } : {}),
    };
    history.set(fingerprint, {
      fingerprint,
      consecutiveFailures,
      category,
      scope,
      ...(artifactDigest ? { lastArtifactDigest: artifactDigest } : {}),
    });
    return structured;
  });
}

export function buildVerificationRepairPlan(
  issues: StructuredVerificationIssue[],
) {
  return issues
    .filter((issue) => issue.repair.repairable)
    .map((issue) => {
      const intent = asRecord(issue.repairIntent);
      return compact({
        id: issue.fingerprint,
        issueCode: issue.code,
        findingId: getString(issue, "findingId"),
        category: issue.category,
        severity: issue.severity,
        dimensions: readStringArray(issue.dimensions),
        strategy: issue.repair.strategy,
        maximumRepairStrategy: getString(issue, "maximumRepairStrategy"),
        forced: issue.repair.forced,
        target: issue.scope,
        affectedViewports: readStringArray(issue.affectedViewports),
        targets: readRecordArray(issue.targets),
        observations: readRecordArray(issue.observations),
        scores: asRecord(issue.scores),
        mustPreserve: asRecord(issue.mustPreserve),
        observed: getString(intent, "observed") ?? getString(issue, "message"),
        expected: getString(intent, "expected"),
        objective:
          getString(intent, "objective") ??
          `Resolve ${issue.code} at the reported target without regressing other verified viewports.`,
        acceptanceCriteria: readStringArray(intent?.acceptanceCriteria),
        prohibitedTactics: readStringArray(intent?.prohibitedTactics),
      });
    });
}

function clampRepairStrategy(
  strategy: VerificationRepairStrategy,
  maximum: VerificationRepairStrategy | undefined,
) {
  if (!maximum) return strategy;
  const priority: Record<VerificationRepairStrategy, number> = {
    retry_infrastructure: 0,
    local_patch: 1,
    component_rewrite: 2,
    section_rewrite: 3,
    page_relayout: 4,
    site_regeneration: 5,
    stop: 6,
  };
  return priority[strategy] > priority[maximum] ? maximum : strategy;
}

export function getRequiredVerificationRepairStrategy(
  issues: StructuredVerificationIssue[],
) {
  const priority: Record<VerificationRepairStrategy, number> = {
    retry_infrastructure: 0,
    local_patch: 1,
    component_rewrite: 2,
    section_rewrite: 3,
    page_relayout: 4,
    site_regeneration: 5,
    stop: 6,
  };
  return issues.reduce<VerificationRepairStrategy | undefined>(
    (required, issue) =>
      required === undefined ||
      priority[issue.repair.strategy] > priority[required]
        ? issue.repair.strategy
        : required,
    undefined,
  );
}

export function buildVerificationIssueFingerprint({
  code,
  category,
  scope,
}: {
  code: string;
  category: VerificationIssueCategory;
  scope: StructuredVerificationIssue["scope"];
}) {
  const identity = [
    category,
    code,
    scope?.viewport ?? "all",
    scope?.sectionId ?? "",
    scope?.toolId ?? "",
    scope?.dataSlot ?? "",
    scope?.dimension ?? "",
  ].join("\u0000");
  return createHash("sha256").update(identity).digest("hex").slice(0, 20);
}

export function chooseVerificationRepairStrategy({
  code,
  category,
  consecutiveFailures,
  scope,
}: {
  code: string;
  category: VerificationIssueCategory;
  consecutiveFailures: number;
  scope?: StructuredVerificationIssue["scope"];
}): VerificationRepairStrategy {
  if (category === "infrastructure") return "retry_infrastructure";
  if (category === "budget" || code.endsWith("_budget_exhausted")) {
    return "stop";
  }
  if (category === "layout") {
    if (consecutiveFailures >= 3) {
      return scope?.sectionId ? "section_rewrite" : "page_relayout";
    }
    if (consecutiveFailures >= 2) {
      if (scope?.toolId) return "component_rewrite";
      if (scope?.sectionId) return "section_rewrite";
      return "page_relayout";
    }
    return "local_patch";
  }
  if (consecutiveFailures >= 4) return "site_regeneration";
  if (consecutiveFailures >= 3) {
    return scope?.sectionId ? "section_rewrite" : "page_relayout";
  }
  if (consecutiveFailures >= 2) {
    if (scope?.toolId) return "component_rewrite";
    if (scope?.sectionId) return "section_rewrite";
    return "page_relayout";
  }
  return "local_patch";
}

function classifyVerificationIssue(
  code: string,
  record: Record<string, unknown>,
): VerificationIssueCategory {
  if (code.endsWith("_budget_exhausted")) return "budget";
  if (
    code.includes("infrastructure") ||
    code.includes("image_loading") ||
    code.includes("viewport_size") ||
    code.includes("emulation_failed") ||
    code.includes("review_unavailable") ||
    code.includes("evidence_missing") ||
    code.includes("review_unreadable")
  ) {
    return "infrastructure";
  }
  if (code.startsWith("layout_") || code.startsWith("grid_")) return "layout";
  if (code.startsWith("browser_runtime")) return "runtime";
  if (code.startsWith("browser_viewport")) return "responsive";
  if (code.startsWith("delivery_") || code.startsWith("selection_")) {
    return "delivery";
  }
  if (code.startsWith("excellence_")) {
    const explicitCategory = getString(record, "category");
    if (isVerificationIssueCategory(explicitCategory)) return explicitCategory;
    const dimension = getString(record, "dimension")?.toLowerCase() ?? "";
    if (dimension.includes("accessibility")) return "accessibility";
    if (dimension.includes("responsive")) return "responsive";
    if (dimension.includes("brief")) return "requirement";
    return "visual_quality";
  }
  if (code.startsWith("quality_")) return "visual_quality";
  if (code.includes("static") || code.includes("artifact_")) return "static";
  return "unknown";
}

function getSeverityRepairStrategyFloor({
  category,
  severity,
  scope,
}: {
  category: VerificationIssueCategory;
  severity: StructuredVerificationIssue["severity"];
  scope: StructuredVerificationIssue["scope"];
}): VerificationRepairStrategy | undefined {
  if (severity !== "blocker") return undefined;
  if (["infrastructure", "budget", "runtime", "delivery"].includes(category)) {
    return undefined;
  }
  if (scope?.toolId) return "component_rewrite";
  if (scope?.sectionId) return "section_rewrite";
  return "page_relayout";
}

function maxRepairStrategy(
  ...strategies: Array<VerificationRepairStrategy | undefined>
) {
  const priority: Record<VerificationRepairStrategy, number> = {
    retry_infrastructure: 0,
    local_patch: 1,
    component_rewrite: 2,
    section_rewrite: 3,
    page_relayout: 4,
    site_regeneration: 5,
    stop: 6,
  };
  return strategies
    .filter((strategy): strategy is VerificationRepairStrategy => !!strategy)
    .reduce((strongest, strategy) =>
      priority[strategy] > priority[strongest] ? strategy : strongest,
    );
}

function getRelatedHistoryFailureCount(
  scope: StructuredVerificationIssue["scope"],
  history: RelatedVerificationIssueHistoryEntry[],
) {
  if (!scope || (!scope.sectionId && !scope.toolId && !scope.dataSlot)) return 0;
  return history.reduce((maximum, entry) => {
    if (scope.viewport && entry.viewport && scope.viewport !== entry.viewport) {
      return maximum;
    }
    if (scope.sectionId && entry.sectionId !== scope.sectionId) return maximum;
    if (scope.toolId && entry.toolId !== scope.toolId) return maximum;
    if (scope.dataSlot && entry.dataSlot !== scope.dataSlot) return maximum;
    return Math.max(maximum, entry.consecutiveFailures);
  }, 0);
}

function getSemanticVerificationHistoryFailureCount({
  fingerprint,
  category,
  scope,
  history,
  artifactDigest,
}: {
  fingerprint: string;
  category: VerificationIssueCategory;
  scope: StructuredVerificationIssue["scope"];
  history: Map<string, VerificationIssueHistoryEntry>;
  artifactDigest?: string;
}) {
  if (!scope || (!scope.sectionId && !scope.toolId && !scope.dimension)) return 0;
  let maximum = 0;
  for (const entry of history.values()) {
    if (entry.fingerprint === fingerprint || entry.category !== category) continue;
    if (!sameSemanticScope(scope, entry.scope)) continue;
    const failures =
      entry.lastArtifactDigest === artifactDigest
        ? entry.consecutiveFailures
        : entry.consecutiveFailures + 1;
    maximum = Math.max(maximum, failures);
  }
  return maximum;
}

function sameSemanticScope(
  current: StructuredVerificationIssue["scope"],
  previous: StructuredVerificationIssue["scope"],
) {
  if (!current || !previous) return false;
  if (current.sectionId && current.sectionId !== previous.sectionId) return false;
  if (current.toolId && current.toolId !== previous.toolId) return false;
  if (current.dataSlot && current.dataSlot !== previous.dataSlot) return false;
  if (current.dimension && current.dimension !== previous.dimension) return false;
  if (current.viewport && previous.viewport && current.viewport !== previous.viewport) {
    return false;
  }
  return true;
}

function isVerificationIssueCategory(
  value: string | undefined,
): value is VerificationIssueCategory {
  return [
    "requirement",
    "static",
    "runtime",
    "layout",
    "responsive",
    "visual_quality",
    "accessibility",
    "content_integrity",
    "delivery",
    "infrastructure",
    "budget",
    "unknown",
  ].includes(value ?? "");
}

function readSeverity(
  record: Record<string, unknown>,
  category: VerificationIssueCategory,
) {
  const severity = getString(record, "severity");
  if (severity === "blocker" || severity === "major" || severity === "minor") {
    return severity;
  }
  return ["budget", "infrastructure", "delivery", "runtime"].includes(
    category,
  )
    ? "blocker"
    : "major";
}

function readScope(record: Record<string, unknown>) {
  const nested = findFirstScopeRecord(record);
  return compact({
    viewport: getString(record, "viewport") ?? getString(nested, "viewport"),
    sectionId:
      getString(record, "sectionId") ?? getString(nested, "sectionId"),
    toolId: getString(record, "toolId") ?? getString(nested, "toolId"),
    dataSlot: getString(record, "dataSlot") ?? getString(nested, "dataSlot"),
    dimension:
      getString(record, "dimension") ?? getString(nested, "dimension"),
  });
}

function findFirstScopeRecord(record: Record<string, unknown>) {
  for (const key of ["scope", "target", "element", "image"]) {
    const nested = asRecord(record[key]);
    if (nested) return nested;
  }
  for (const value of Object.values(record)) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      const nested = asRecord(item);
      if (nested) return nested;
    }
  }
  return undefined;
}

function compact<T extends Record<string, unknown>>(record: T) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as { [K in keyof T]?: Exclude<T[K], undefined> };
}

function omitCanonicalScopeFields(record: Record<string, unknown>) {
  const {
    viewport: _viewport,
    sectionId: _sectionId,
    toolId: _toolId,
    dataSlot: _dataSlot,
    dimension: _dimension,
    scope: _scope,
    requiredRepairStrategy: _requiredRepairStrategy,
    ...evidence
  } = record;
  const result = { ...evidence };
  for (const key of ["element", "image", "target"]) {
    const nested = asRecord(result[key]);
    if (!nested) continue;
    const compactNested = omitScopeIdentityFields(nested);
    if (Object.keys(compactNested).length > 0) {
      result[key] = compactNested;
    } else {
      delete result[key];
    }
  }
  return result;
}

function omitScopeIdentityFields(record: Record<string, unknown>) {
  const {
    viewport: _viewport,
    sectionId: _sectionId,
    toolId: _toolId,
    dataSlot: _dataSlot,
    dimension: _dimension,
    ...evidence
  } = record;
  return evidence;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getString(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

function readRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => asRecord(item) !== undefined,
      )
    : undefined;
}

function readRepairStrategy(value: unknown): VerificationRepairStrategy | undefined {
  return [
    "retry_infrastructure",
    "local_patch",
    "component_rewrite",
    "section_rewrite",
    "page_relayout",
    "site_regeneration",
    "stop",
  ].includes(value as VerificationRepairStrategy)
    ? (value as VerificationRepairStrategy)
    : undefined;
}
