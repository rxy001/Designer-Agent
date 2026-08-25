import type { PageDocument } from "./schema.ts";
import { toContainerClassName } from "./responsiveClassNames.ts";

type NormalizationContext = "value" | "class-name" | "class-names";

/**
 * Compares PageDocuments after removing representational differences that do
 * not change editor or runtime semantics. In particular, persisted site data
 * may contain viewport variants (`max-sm:*`) while JSX parsing stores their
 * equivalent container-query variants (`@max-[640px]:*`).
 */
export function arePageDocumentsSemanticallyEqual(
  left: PageDocument,
  right: PageDocument,
) {
  return (
    JSON.stringify(normalizeSemanticValue(left)) ===
    JSON.stringify(normalizeSemanticValue(right))
  );
}

function normalizeSemanticValue(
  value: unknown,
  context: NormalizationContext = "value",
): unknown {
  if (typeof value === "string") {
    return context === "value" ? value : toContainerClassName(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeSemanticValue(item, context));
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .filter(([, nestedValue]) => nestedValue !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, nestedValue]) => [
        key,
        normalizeSemanticValue(nestedValue, getNestedContext(key, context)),
      ])
      .filter(([, nestedValue]) => nestedValue !== undefined);

    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  return value;
}

function getNestedContext(
  key: string,
  parentContext: NormalizationContext,
): NormalizationContext {
  if (key === "className") return "class-name";
  if (key === "classNames") return "class-names";
  if (parentContext === "class-names") return "class-name";
  return "value";
}
