import type { PageDocument } from "./schema.ts";

export function findDuplicatePageDocumentIds(page: PageDocument) {
  const sectionIds = new Set<string>();
  const toolIds = new Set<string>();
  const duplicateSectionIds = new Set<string>();
  const duplicateToolIds = new Set<string>();

  for (const section of page.sections) {
    if (sectionIds.has(section.id)) duplicateSectionIds.add(section.id);
    sectionIds.add(section.id);

    for (const tool of section.tools) {
      if (toolIds.has(tool.id)) duplicateToolIds.add(tool.id);
      toolIds.add(tool.id);
    }
  }

  return {
    duplicateSectionIds: [...duplicateSectionIds],
    duplicateToolIds: [...duplicateToolIds],
  };
}
