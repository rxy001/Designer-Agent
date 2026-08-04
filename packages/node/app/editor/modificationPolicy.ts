import type { PageDocument, PagePatch, ToolNode } from "./schema.ts";

export type DesignOperation = "create" | "modify";

export type ModificationKind = "direct" | "local" | "composition";

export type ModificationAnalysis = {
  kind: ModificationKind;
  affectedSectionIds: string[];
  affectedToolIds: string[];
  changedPropPaths: string[];
  requiresIndependentReview: boolean;
};

const atomicPropPaths: Partial<Record<ToolNode["type"], ReadonlySet<string>>> = {
  button: new Set(["label"]),
  image: new Set(["alt"]),
  text: new Set(["content"]),
};

export function analyzeModification({
  operation,
  previousPage,
  nextPage,
  patch,
  targetToolId,
}: {
  operation: DesignOperation;
  previousPage: PageDocument;
  nextPage: PageDocument;
  patch: PagePatch;
  targetToolId?: string;
}): ModificationAnalysis {
  if (operation === "create") {
    return compositionAnalysis(nextPage, patch);
  }

  const direct = analyzeDirectModification({
    previousPage,
    nextPage,
    patch,
    targetToolId,
  });
  if (direct) return direct;

  const affectedSectionIds = collectAffectedSectionIds(previousPage, patch);
  const affectedToolIds = collectAffectedToolIds(patch);
  const structural = patch.some((operation) =>
    [
      "replacePage",
      "addSection",
      "removeSection",
      "addTool",
      "removeTool",
    ].includes(operation.op),
  );

  if (!structural && affectedSectionIds.size === 1 && patch.length > 0) {
    return {
      kind: "local",
      affectedSectionIds: [...affectedSectionIds],
      affectedToolIds: [...affectedToolIds],
      changedPropPaths: collectChangedPropPaths(previousPage, nextPage, patch),
      requiresIndependentReview: false,
    };
  }

  return compositionAnalysis(nextPage, patch, previousPage);
}

export function diffPropertyPaths(
  previous: unknown,
  next: unknown,
  prefix = "",
): string[] {
  if (deepEqual(previous, next)) return [];

  if (!isPlainRecord(previous) || !isPlainRecord(next)) {
    return prefix ? [prefix] : [];
  }

  const paths = new Set<string>();
  for (const key of new Set([
    ...Object.keys(previous),
    ...Object.keys(next),
  ])) {
    const path = prefix ? `${prefix}.${key}` : key;
    const previousValue = previous[key];
    const nextValue = next[key];

    if (isPlainRecord(previousValue) && isPlainRecord(nextValue)) {
      for (const nestedPath of diffPropertyPaths(
        previousValue,
        nextValue,
        path,
      )) {
        paths.add(nestedPath);
      }
      continue;
    }

    if (!deepEqual(previousValue, nextValue)) {
      paths.add(path);
    }
  }

  return [...paths].sort();
}

function analyzeDirectModification({
  previousPage,
  nextPage,
  patch,
  targetToolId,
}: {
  previousPage: PageDocument;
  nextPage: PageDocument;
  patch: PagePatch;
  targetToolId?: string;
}): ModificationAnalysis | undefined {
  if (patch.length !== 1 || patch[0]?.op !== "updateTool") return undefined;

  const operation = patch[0];
  if (targetToolId && operation.toolId !== targetToolId) return undefined;

  const changeKeys = Object.keys(operation.changes).filter(
    (key) => operation.changes[key as keyof typeof operation.changes] !== undefined,
  );
  if (changeKeys.length !== 1 || changeKeys[0] !== "props") return undefined;

  const previousLocation = findTool(previousPage, operation.toolId);
  const nextLocation = findTool(nextPage, operation.toolId);
  if (!previousLocation || !nextLocation) return undefined;
  if (previousLocation.sectionId !== nextLocation.sectionId) return undefined;
  if (previousLocation.tool.type !== nextLocation.tool.type) return undefined;

  const changedPropPaths = diffPropertyPaths(
    previousLocation.tool.props,
    nextLocation.tool.props,
  );
  const allowedPaths = atomicPropPaths[previousLocation.tool.type];
  if (
    !allowedPaths ||
    changedPropPaths.length === 0 ||
    changedPropPaths.some((path) => !allowedPaths.has(path))
  ) {
    return undefined;
  }

  return {
    kind: "direct",
    affectedSectionIds: [previousLocation.sectionId],
    affectedToolIds: [operation.toolId],
    changedPropPaths,
    requiresIndependentReview: false,
  };
}

function compositionAnalysis(
  nextPage: PageDocument,
  patch: PagePatch,
  previousPage?: PageDocument,
): ModificationAnalysis {
  return {
    kind: "composition",
    affectedSectionIds: [
      ...collectAffectedSectionIds(previousPage ?? nextPage, patch),
    ],
    affectedToolIds: [...collectAffectedToolIds(patch)],
    changedPropPaths: previousPage
      ? collectChangedPropPaths(previousPage, nextPage, patch)
      : [],
    requiresIndependentReview: true,
  };
}

function collectAffectedSectionIds(
  previousPage: PageDocument,
  patch: PagePatch,
) {
  const sectionIds = new Set<string>();
  const sectionByToolId = new Map(
    previousPage.sections.flatMap((section) =>
      section.tools.map((tool) => [tool.id, section.id] as const),
    ),
  );

  for (const operation of patch) {
    switch (operation.op) {
      case "replacePage":
        for (const section of operation.page.sections) sectionIds.add(section.id);
        break;
      case "addSection":
        sectionIds.add(operation.section.id);
        break;
      case "removeSection":
      case "updateSection":
        sectionIds.add(operation.sectionId);
        break;
      case "addTool":
        sectionIds.add(operation.sectionId);
        break;
      case "removeTool":
      case "updateTool": {
        const sectionId = sectionByToolId.get(operation.toolId);
        if (sectionId) sectionIds.add(sectionId);
        break;
      }
    }
  }

  return sectionIds;
}

function collectAffectedToolIds(patch: PagePatch) {
  const toolIds = new Set<string>();
  for (const operation of patch) {
    switch (operation.op) {
      case "replacePage":
        for (const section of operation.page.sections) {
          for (const tool of section.tools) toolIds.add(tool.id);
        }
        break;
      case "addSection":
        for (const tool of operation.section.tools) toolIds.add(tool.id);
        break;
      case "addTool":
        toolIds.add(operation.tool.id);
        break;
      case "removeTool":
      case "updateTool":
        toolIds.add(operation.toolId);
        break;
    }
  }
  return toolIds;
}

function collectChangedPropPaths(
  previousPage: PageDocument,
  nextPage: PageDocument,
  patch: PagePatch,
) {
  const paths = new Set<string>();
  for (const operation of patch) {
    if (operation.op !== "updateTool" || !operation.changes.props) continue;
    const previousTool = findTool(previousPage, operation.toolId)?.tool;
    const nextTool = findTool(nextPage, operation.toolId)?.tool;
    if (!previousTool || !nextTool) continue;
    for (const path of diffPropertyPaths(previousTool.props, nextTool.props)) {
      paths.add(`${operation.toolId}.${path}`);
    }
  }
  return [...paths].sort();
}

function findTool(page: PageDocument, toolId: string) {
  for (const section of page.sections) {
    const tool = section.tools.find((candidate) => candidate.id === toolId);
    if (tool) return { sectionId: section.id, tool };
  }
  return undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepEqual(left: unknown, right: unknown) {
  return JSON.stringify(sortValue(left)) === JSON.stringify(sortValue(right));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isPlainRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortValue(nested)]),
  );
}
