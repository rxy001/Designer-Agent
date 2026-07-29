import ts from "typescript";

export type ArtifactIdIssue = {
  code: string;
  message: string;
};

export function inspectArtifactIds(
  source: string,
  buildingComponents: ReadonlySet<string>,
): ArtifactIdIssue[] {
  const sourceFile = ts.createSourceFile(
    "artifact.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const issues: ArtifactIdIssue[] = [];
  const seenIds = new Map<string, string>();
  const componentCounts = new Map<string, number>();

  const visit = (node: ts.Node) => {
    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : undefined;

    if (opening) {
      const componentName = getJsxTagName(opening.tagName);
      const isSection = componentName === "Section";
      const isTool = buildingComponents.has(componentName);

      if (isSection || isTool) {
        const occurrence = (componentCounts.get(componentName) ?? 0) + 1;
        componentCounts.set(componentName, occurrence);
        const idAttribute = opening.attributes.properties.find(
          (attribute): attribute is ts.JsxAttribute =>
            ts.isJsxAttribute(attribute) && attribute.name.getText() === "id",
        );
        const id = idAttribute
          ? readStaticString(idAttribute.initializer)
          : undefined;
        const label = isSection
          ? `Section #${occurrence}`
          : `${componentName} #${occurrence}`;

        if (!idAttribute) {
          issues.push({
            code: isSection
              ? "section_missing_stable_id"
              : "tool_missing_stable_id",
            message: `${label} must include an explicit, stable, globally unique string id.`,
          });
        } else if (!id) {
          issues.push({
            code: "artifact_id_not_static",
            message: `${label} must use a non-empty string literal id; dynamic or generated ids are not stable enough for cross-viewport repair targeting.`,
          });
        } else {
          const previousLabel = seenIds.get(id);
          if (previousLabel) {
            issues.push({
              code: "duplicate_artifact_id",
              message: `${label} reuses id ${JSON.stringify(id)} from ${previousLabel}; every Section and Tool id must be globally unique.`,
            });
          } else {
            seenIds.set(id, label);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return issues;
}

function getJsxTagName(name: ts.JsxTagNameExpression) {
  return name.getText().split(".").pop() ?? "";
}

function readStaticString(initializer: ts.JsxAttributeValue | undefined) {
  if (!initializer) return undefined;
  if (ts.isStringLiteral(initializer)) {
    return initializer.text.trim() || undefined;
  }
  if (!ts.isJsxExpression(initializer) || !initializer.expression) {
    return undefined;
  }

  const expression = initializer.expression;
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return expression.text.trim() || undefined;
  }
  return undefined;
}
