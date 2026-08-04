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
