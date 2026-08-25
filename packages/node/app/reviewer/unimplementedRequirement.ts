import { z } from "zod";

export const unimplementedRequirementSchema = z.object({
  // New declarations can waive only a capability slice. Legacy declarations
  // remain readable while callers migrate to the structured form.
  requirementId: z.string().min(1).max(160).optional(),
  requirement: z.string().min(1).max(500),
  capability: z.string().min(1).max(240).optional(),
  status: z.enum(["waived", "alternative_required"]).optional(),
  waivedBehavior: z.array(z.string().min(1).max(500)).max(8).optional(),
  stillRequired: z.array(z.string().min(1).max(500)).max(8).optional(),
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
    "Treat these declarations as authoritative. For structured declarations, waive only waivedBehavior; stillRequired remains fully reviewable. Do not verify whether they are true, do not fail brief integrity because an explicitly waived behavior is absent, and do not create a finding or blocker whose only basis is that waived behavior. Judge any declared alternative on its actual quality and continue reviewing every other requirement normally. A legacy declaration without behavior slices waives only its exact stated requirement.",
  ].join("\n");
}
