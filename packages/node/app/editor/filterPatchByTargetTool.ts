import type { PagePatch } from "./schema.ts";

type TargetToolOptions = {
  targetToolId: string;
};

export function filterPatchByTargetTool(
  patch: PagePatch,
  options: TargetToolOptions,
) {
  return patch.filter((operation) => {
    switch (operation.op) {
      case "updateTool":
      case "removeTool":
        return operation.toolId === options.targetToolId;
      case "addTool":
        return operation.tool.id === options.targetToolId;
      default:
        return false;
    }
  });
}
