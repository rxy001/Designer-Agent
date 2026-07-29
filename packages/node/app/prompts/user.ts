type EditorRevisionPromptOptions = {
  userPrompt: string;
  targetToolId?: string;
  currentJsx: string;
};

export function getUserPrompt(options: EditorRevisionPromptOptions) {
  return [
    "Current editor JSX source:",
    "```jsx",
    options.currentJsx,
    "```",
    "",
    options.targetToolId
      ? `Revise the selected tool (${options.targetToolId}) and, when the request or layout relationship requires it, sibling tools in its containing Section plus that Section's grid. Preserve editor ids and metadata. Existing tools inside the affected Section are authorized only as needed to fulfill the request; changes outside the affected Section will be removed before delivery.`
      : "Revise this current page to satisfy the request. Preserve existing editor ids and metadata on retained Sections and tools; do not replace unrelated content unless the user explicitly requests a redesign.",
    "User request:",
    options.userPrompt,
  ].join("\n");
}
