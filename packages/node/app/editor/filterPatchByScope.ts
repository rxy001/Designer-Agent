import type { PagePatch } from "./schema.ts";

type ScopeOptions = {
  scope: "page" | "selection";
  selectedToolId?: string;
};

export function filterPatchByScope(patch: PagePatch, options: ScopeOptions) {
  if (options.scope !== "selection") {
    return patch;
  }

  if (!options.selectedToolId) {
    return [];
  }

  return patch.filter((operation) => {
    switch (operation.op) {
      case "updateTool":
      case "removeTool":
        return operation.toolId === options.selectedToolId;
      case "addTool":
        return operation.tool.id === options.selectedToolId;
      default:
        return false;
    }
  });
}
