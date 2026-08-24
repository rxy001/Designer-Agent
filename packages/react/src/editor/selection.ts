import type { SiteEditTarget } from "@designer-agent/site-contract";

type TargetSelection =
  | { kind: "site" }
  | { kind: "header"; sectionId?: string; toolId?: string }
  | { kind: "page"; pageId: string }
  | { kind: "page-body"; pageId: string; sectionId?: string; toolId?: string }
  | { kind: "footer"; sectionId?: string; toolId?: string };

export function editorSelectionToSiteEditTarget(selection: TargetSelection): SiteEditTarget {
  if (selection.kind === "site") return { kind: "site" };
  if (selection.kind === "page") return { kind: "page", pageId: selection.pageId };

  const owner = selection.kind === "page-body"
    ? { kind: "page-body" as const, pageId: selection.pageId }
    : { kind: "shared-region" as const, region: selection.kind };
  if (selection.toolId && selection.sectionId) {
    return { kind: "tool", owner, sectionId: selection.sectionId, toolId: selection.toolId };
  }
  if (selection.sectionId) return { kind: "section", owner, sectionId: selection.sectionId };
  return owner.kind === "page-body"
    ? { kind: "page", pageId: owner.pageId }
    : { kind: "shared-region", region: owner.region };
}

type SelectionPage = {
  sections: Array<{
    id: string;
    tools: Array<{ id: string }>;
  }>;
};

export function getPageSelection() {
  return {
    selectedSectionId: "",
    selectedToolId: undefined,
  };
}

export function getSectionSelection(sectionId: string) {
  return {
    selectedSectionId: sectionId,
    selectedToolId: undefined,
  };
}

export function getToolSelection(page: SelectionPage, toolId?: string) {
  if (!toolId) return { selectedToolId: undefined };

  const containingSection = page.sections.find((section) =>
    section.tools.some((tool) => tool.id === toolId),
  );

  return {
    selectedToolId: toolId,
    ...(containingSection
      ? { selectedSectionId: containingSection.id }
      : {}),
  };
}

export function reconcileEditorSelection(
  page: SelectionPage,
  selectedSectionId: string,
  selectedToolId?: string,
) {
  if (selectedToolId) {
    const containingSection = page.sections.find((section) =>
      section.tools.some((tool) => tool.id === selectedToolId),
    );
    if (containingSection) {
      return {
        selectedSectionId: containingSection.id,
        selectedToolId,
      };
    }
  }

  if (!selectedSectionId) return getPageSelection();

  const selectedSection =
    page.sections.find((section) => section.id === selectedSectionId) ??
    page.sections[0];

  return {
    selectedSectionId: selectedSection?.id ?? "",
    selectedToolId: undefined,
  };
}
