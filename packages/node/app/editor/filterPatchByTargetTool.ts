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
  const targetMovedOutsideSection = patch.some(
    (operation) =>
      operation.op === "addTool" &&
      operation.tool.id === options.targetToolId &&
      operation.sectionId !== options.targetSectionId,
  );

  return patch.filter((operation) => {
    switch (operation.op) {
      case "updateTool":
        return options.targetSectionToolIds.has(operation.toolId);
      case "removeTool": {
        return (
          operation.toolId === options.targetToolId &&
          !targetMovedOutsideSection
        );
      }
      case "addTool":
        return false;
      case "updateSection":
        return operation.sectionId === options.targetSectionId;
      default:
        return false;
    }
  });
}
