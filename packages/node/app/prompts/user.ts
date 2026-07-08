type EditorRevisionPromptOptions = {
  userPrompt: string;
  targetToolId?: string;
  currentJsx: string;
};

export function getUserPrompt(options: EditorRevisionPromptOptions) {
  if (options.targetToolId) {
    return [
      "Current JSX source:",
      "```jsx",
      options.currentJsx,
      "```",
      "",
      `Only revise the selected tool (${options.targetToolId}). Preserve existing editor metadata attributes on existing elements.`,
      "User request:",
      options.userPrompt,
    ].join("\n");
  }

  return options.userPrompt;
}
