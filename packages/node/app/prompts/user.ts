type EditorRevisionPromptOptions = {
  userPrompt: string;
  scope: "page" | "selection";
  selectedToolId?: string;
  currentJsx: string;
};

export function getUserPrompt(options: EditorRevisionPromptOptions) {
  if (options.scope === "selection" && options.selectedToolId) {
    return [
      "Current JSX source:",
      "```jsx",
      options.currentJsx,
      "```",
      "",
      `Only revise the selected tool (${options.selectedToolId}). Preserve existing editor metadata attributes on existing elements.`,
      "User request:",
      options.userPrompt,
    ].join("\n");
  }

  return options.userPrompt;
}
