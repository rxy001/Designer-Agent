import type { PagePatch } from "./schema.ts";

type TargetToolOptions = {
  targetToolId: string;
  targetSectionId: string;
  targetSectionToolIds: ReadonlySet<string>;
};

export function filterPatchByTargetTool(
  patch: PagePatch,
  options: TargetToolOptions,
) {
  // A selected Tool may require grid/height changes in its source Section or
  // in an existing destination Section when the Tool is moved.
  const affectedSectionIds = new Set([options.targetSectionId]);

  for (const operation of patch) {
    if (
      operation.op === "addTool" &&
      operation.tool.id === options.targetToolId
    ) {
      affectedSectionIds.add(operation.sectionId);
    }
  }

  const additionsByToolId = new Map(
    patch
      .filter((operation) => operation.op === "addTool")
      .map((operation) => [operation.tool.id, operation.sectionId]),
  );

  return patch.filter((operation) => {
    switch (operation.op) {
      case "updateTool":
        return options.targetSectionToolIds.has(operation.toolId);
      case "removeTool": {
        if (!options.targetSectionToolIds.has(operation.toolId)) {
          return false;
        }

        const destinationSectionId = additionsByToolId.get(operation.toolId);
        return (
          destinationSectionId === undefined ||
          operation.toolId === options.targetToolId ||
          destinationSectionId === options.targetSectionId
        );
      }
      case "addTool":
        return (
          operation.tool.id === options.targetToolId ||
          operation.sectionId === options.targetSectionId
        );
      case "updateSection":
        return affectedSectionIds.has(operation.sectionId);
      default:
        return false;
    }
  });
}
