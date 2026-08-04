import type { PageDocument } from "./schema.ts";
import type { DesignOperation } from "./modificationPolicy.ts";

type ResolveEditorRequestTargetOptions = {
  page: PageDocument;
  selectedToolId?: unknown;
  selectedSectionId?: unknown;
};

export function resolveEditorRequestTarget({
  page,
  selectedToolId,
  selectedSectionId,
}: ResolveEditorRequestTargetOptions): {
  operation: DesignOperation;
  targetToolId?: string;
  targetSectionId?: string;
} {
  if (page.sections.length === 0) {
    return { operation: "create" };
  }

  if (typeof selectedToolId === "string" && selectedToolId.length > 0) {
    return { operation: "modify", targetToolId: selectedToolId };
  }

  if (typeof selectedSectionId === "string" && selectedSectionId.length > 0) {
    return { operation: "modify", targetSectionId: selectedSectionId };
  }

  return { operation: "modify" };
}
