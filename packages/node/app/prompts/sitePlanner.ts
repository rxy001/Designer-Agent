export function buildSitePlannerPrompt(input: {
  request: string;
  designSystemId: number;
  currentSite: unknown;
  target: unknown;
}) {
  const designSystemInstruction =
    input.designSystemId === -1
      ? [
          "No design system was selected.",
          "Derive visual direction from the user request.",
        ].join("\n")
      : [
          `Selected design system id: ${input.designSystemId}.`,
          "This selection is a visual pattern reference.",
          "The user request remains higher authority.",
        ].join("\n");
  return [
    "Plan a coherent multi-page website delivery. Return only the structured plan.",
    "Maximum final page count is 5. Pages have no execution dependencies.",
    "Header and Footer are global shared entities. Navbar belongs only in Header.",
    "Each shared region has preserved source Sections and an independent mounted flag. mounted controls page composition only; generating or editing source content does not imply changing whether it is mounted.",
    "Use existing targets for modifications/removals and new targets only for creates.",
    "Every page target uses one object shape. Existing: kind=existing, pageId=<existing id>, suggestedTitle=null, suggestedRoute=null. New: kind=new, pageId=null, suggestedTitle and suggestedRoute populated.",
    "For an existing page modification, set title and route when the request changes them; otherwise set them to null to preserve current metadata.",
    "All output fields are required. Use null—not omission—for unchanged title, route, unavailable navigation actions, new navigation item ids, and unavailable shared-copy values.",
    "Always preserve or create a / home page and avoid duplicate routes.",
    "Return the complete navigation: brand target, stable item ids, items, primary action, and secondary action. Preserve the id of every retained navigation item; use a null id only for a new item.",
    "Every navigation target (brand, item, or action) must be exactly a page taskKey or an existing pageId. Navigation is page-level: never append #fragments or ?queries and never target a section id.",
    "The plan is read-only after proposal, so make every requirement concrete.",
    "The edit target is an authorization boundary. Never plan work outside it.",
    "For a page, section, or tool target: keep the shared shell and navigation unchanged and emit exactly one modify task for the owning page.",
    "For a shared-region, or a section/tool owned by a shared region: emit no page tasks and change only that shared region.",
    designSystemInstruction,
    "Authorized edit target:",
    JSON.stringify(input.target),
    "Current site summary:",
    JSON.stringify(input.currentSite),
    "User request:",
    input.request,
  ].join("\n\n");
}
