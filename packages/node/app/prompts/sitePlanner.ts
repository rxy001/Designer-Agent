export function buildSitePlannerPrompt(input: {
  request: string;
  designSystemId: number;
  currentSite: unknown;
  target: unknown;
}) {
  return [
    "Plan a coherent multi-page website delivery. Return only the structured plan.",
    "Maximum final page count is 5. Pages have no execution dependencies.",
    "Header and Footer are global shared entities. Navbar belongs only in Header.",
    "Use existing targets for modifications/removals and new targets only for creates.",
    "Every page target uses one object shape. Existing: kind=existing, pageId=<existing id>, suggestedTitle=null, suggestedRoute=null. New: kind=new, pageId=null, suggestedTitle and suggestedRoute populated.",
    "For an existing page modification, set title and route when the request changes them; otherwise set them to null to preserve current metadata.",
    "All output fields are required. Use null—not omission—for unchanged title, route, and unavailable shared-copy values.",
    "Always preserve or create a / home page and avoid duplicate routes.",
    "The plan is read-only after proposal, so make every requirement concrete.",
    "The edit target is an authorization boundary. Never plan work outside it.",
    "For a page, section, or tool target: keep the shared shell and navigation unchanged and emit exactly one modify task for the owning page.",
    "For a shared-region, or a section/tool owned by a shared region: emit no page tasks and change only that shared region.",
    `Design system id: ${input.designSystemId}`,
    "Authorized edit target:",
    JSON.stringify(input.target),
    "Current site summary:",
    JSON.stringify(input.currentSite),
    "User request:",
    input.request,
  ].join("\n\n");
}
