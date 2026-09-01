import type { PageDocument } from "./schema.ts";

export function findDuplicatePageDocumentIds(page: PageDocument) {
  const sectionIds = new Set<string>();
  const toolIds = new Set<string>();
  const overlayIds = new Set<string>();
  const duplicateSectionIds = new Set<string>();
  const duplicateToolIds = new Set<string>();
  const duplicateOverlayIds = new Set<string>();
  const allIds = new Set<string>();

  for (const section of page.sections) {
    if (sectionIds.has(section.id)) duplicateSectionIds.add(section.id);
    sectionIds.add(section.id);
    if (allIds.has(section.id)) duplicateSectionIds.add(section.id);
    allIds.add(section.id);

    for (const tool of section.tools) {
      if (toolIds.has(tool.id)) duplicateToolIds.add(tool.id);
      toolIds.add(tool.id);
      if (allIds.has(tool.id)) duplicateToolIds.add(tool.id);
      allIds.add(tool.id);
    }
  }

  for (const overlay of page.overlays ?? []) {
    if (overlayIds.has(overlay.id) || allIds.has(overlay.id)) {
      duplicateOverlayIds.add(overlay.id);
    }
    overlayIds.add(overlay.id);
    allIds.add(overlay.id);
  }

  return {
    duplicateSectionIds: [...duplicateSectionIds],
    duplicateToolIds: [...duplicateToolIds],
    duplicateOverlayIds: [...duplicateOverlayIds],
  };
}
