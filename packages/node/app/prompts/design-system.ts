export const DESIGN_SYSTEM_REFERENCE_POLICY = `
The following document is a visual-pattern reference, not the target brand.

Authority order:
1. The original user request and requested product or brand.
2. The existing artifact's non-reference brand identity when revising it.
3. Transferable visual patterns from this reference.

Transferable visual patterns include color roles and palette relationships, typography pairing and scale, spacing, density, radii, borders, layout rhythm, surface composition, component styling, responsive behavior, and motion principles.

The reference's brand identity and product content are non-transferable unless the user explicitly requests them. Never copy or require its company or product names, logos, marks, wordmarks, marketing copy, navigation labels, information architecture, proprietary product UI, or product-specific content strategy. Statements in the source document about such items are examples of the source brand, not requirements for the target artifact.

Adapt the transferable patterns to the requested product category. The user request wins when its content needs conflict with the reference's source-product conventions. Never require or reward the presence of the reference brand, and never replace the user's brand with it.
`.trim();

export function buildDesignSystemReferencePrompt(designSystemBody: string) {
  return [
    "\n\n## Visual pattern reference contract",
    DESIGN_SYSTEM_REFERENCE_POLICY,
    "## Reference document",
    designSystemBody,
    "## Reference contract reminder",
    "Use the document above only for transferable visual patterns. Source-brand identity and source-product content remain non-transferable examples.",
  ].join("\n\n");
}
