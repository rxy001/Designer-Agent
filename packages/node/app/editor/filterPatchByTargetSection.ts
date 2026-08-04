import type { PagePatch } from "./schema.ts";

type TargetSectionOptions = {
  targetSectionId: string;
  targetSectionToolIds: ReadonlySet<string>;
  existingToolIds: ReadonlySet<string>;
};

export function filterPatchByTargetSection(
  patch: PagePatch,
  options: TargetSectionOptions,
) {
  const movedOutsideTarget = new Set(
    patch.flatMap((operation) =>
      operation.op === "addTool" &&
      operation.sectionId !== options.targetSectionId &&
      options.targetSectionToolIds.has(operation.tool.id)
        ? [operation.tool.id]
        : [],
    ),
  );

  return patch.filter((operation) => {
    switch (operation.op) {
      case "updateTool":
        return options.targetSectionToolIds.has(operation.toolId);
      case "removeTool":
        return (
          options.targetSectionToolIds.has(operation.toolId) &&
          !movedOutsideTarget.has(operation.toolId)
        );
      case "addTool":
        return (
          operation.sectionId === options.targetSectionId &&
          !options.existingToolIds.has(operation.tool.id)
        );
      case "updateSection":
        return operation.sectionId === options.targetSectionId;
      default:
        return false;
    }
  });
}
