type EditorRevisionPromptOptions = {
  operation: "create" | "modify";
  userPrompt: string;
  targetToolId?: string;
  targetSectionId?: string;
  currentJsx: string;
};

export function getUserPrompt(options: EditorRevisionPromptOptions) {
  return [
    "Current editor JSX source:",
    "```jsx",
    options.currentJsx,
    "```",
    "",
    options.operation === "create"
      ? "Create the requested artifact from this initial editor page. Existing empty-page metadata is scaffolding, not retained user content."
      : options.targetToolId
        ? `Revise the selected tool (${options.targetToolId}) and, only when the layout relationship requires it, existing sibling tools plus the grid in its containing Section. You may remove the selected Tool when explicitly requested. Preserve editor ids and metadata. Do not add tools, remove sibling tools, move any tool across Sections, or change another Section; those changes will be removed before delivery. Use Section scope for Tool additions or sibling removals and Whole page scope for cross-Section or page-structure changes.`
        : options.targetSectionId
          ? `Revise only the selected Section (${options.targetSectionId}). You may update that Section's grid and its existing tools, add new tools inside it, or remove tools from it as required by the request. Preserve retained editor ids and metadata. Changes to every other Section, cross-Section Tool moves, and page-level structure will be removed before delivery.`
          : "Revise this current page to satisfy the request. Preserve existing editor ids and metadata on retained Sections and tools; do not replace unrelated content unless the user explicitly requests a redesign.",
    "User request:",
    options.userPrompt,
  ].join("\n");
}
