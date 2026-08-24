import { z } from "zod";

export const unimplementedRequirementSchema = z.object({
  requirement: z.string().min(1).max(500),
  reason: z.string().min(1).max(800),
  alternative: z.string().min(1).max(500).nullable(),
}).strict();

export type UnimplementedRequirement = z.infer<
  typeof unimplementedRequirementSchema
>;

export type SiteUnimplementedRequirement = UnimplementedRequirement & {
  owner:
    | { kind: "page-body"; pageId: string }
    | { kind: "shared-shell" };
};

export function buildUnimplementedRequirementsInstructions(
  requirements: readonly UnimplementedRequirement[] | undefined,
) {
  if (!requirements || requirements.length === 0) {
    return "No implementation limitations were declared for this candidate.";
  }

  return [
    "The Designer declared the following user requirements unimplementable with the available component set or documented component APIs:",
    JSON.stringify(requirements),
    "Treat these declarations as authoritative. Do not verify whether they are true, do not fail brief integrity because the declared functionality is absent, and do not create a finding or blocker whose only basis is a declared requirement. Judge any declared alternative on its actual quality and continue reviewing every other requirement normally.",
  ].join("\n");
}
