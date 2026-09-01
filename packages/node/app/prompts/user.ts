type EditorRevisionPromptOptions = {
  operation: "create" | "modify";
  userPrompt: string;
  targetToolId?: string;
  targetSectionId?: string;
  designSystem?: { id: number; title: string };
};

function buildEditScopeInstruction(options: EditorRevisionPromptOptions) {
  return options.operation === "create"
    ? "Create the requested artifact from this initial editor page. Existing empty-page metadata is scaffolding, not retained user content."
    : options.targetToolId
      ? `Revise the selected tool (${options.targetToolId}) and, only when the layout relationship requires it, existing sibling tools plus the grid in its containing Section. You may remove the selected Tool when explicitly requested. Preserve editor ids and metadata. Do not add tools, remove sibling tools, move any tool across Sections, or change another Section; those changes will be removed before delivery. Use Section scope for Tool additions or sibling removals and Whole page scope for cross-Section or page-structure changes.`
      : options.targetSectionId
        ? `Revise only the selected Section (${options.targetSectionId}). You may update that Section's grid and its existing tools, add new tools inside it, or remove tools from it as required by the request. Preserve retained editor ids and metadata. Changes to every other Section, cross-Section Tool moves, and page-level structure will be removed before delivery.`
        : "Revise this current page to satisfy the request. Preserve existing editor ids and metadata on retained Sections and tools; do not replace unrelated content unless the user explicitly requests a redesign.";
}

function buildRequiredWorkflowInstruction() {
  return "Follow the required authoring, verification, review, and delivery workflow in the system instructions.";
}

export function buildInitialDesignerPrompt(options: EditorRevisionPromptOptions) {
  const sourceInstruction =
    options.operation === "modify"
      ? [
          "The current canonical editor source is:",
          "/workspace/output/current-artifact.jsx",
          "Read it before editing. Do not rely on source copied into this prompt.",
        ].join("\n")
      : [
          "This is a create operation.",
          "Create the requested artifact under /workspace/output.",
          "Existing empty-page metadata is scaffolding, not retained user content.",
        ].join("\n");
  const designInstruction = options.designSystem
    ? [
        `The user selected the "${options.designSystem.title}" visual pattern reference.`,
        "Read /workspace/design-system/DESIGN.md before making visual decisions.",
        "The reference is subordinate to the user request and retained artifact identity.",
        "Transfer visual patterns only. Do not copy source-brand names, logos, product content, navigation labels, or proprietary information architecture unless the user explicitly requests them.",
      ].join("\n")
    : [
        "No design system was selected.",
        "Derive the visual direction from the user request and, for modifications, the retained identity of the existing artifact.",
        "Do not assume or imitate a named reference brand unless requested.",
      ].join("\n");

  return [
    "User request — highest authority:",
    options.userPrompt,
    sourceInstruction,
    designInstruction,
    buildEditScopeInstruction(options),
    buildRequiredWorkflowInstruction(),
  ].join("\n\n");
}

/** @deprecated Use buildInitialDesignerPrompt. */
export const getUserPrompt = buildInitialDesignerPrompt;
