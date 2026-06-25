import ts from "typescript";
import type { PageDocument, SectionNode, ToolNode } from "./schema.ts";
import { pageDocumentSchema } from "./schema.ts";

const toolTypesByComponentName: Record<string, ToolNode["type"]> = {
  Accordion: "accordion",
  Button: "button",
  Card: "card",
  Carousel: "carousel",
  Contact: "contact",
  Divider: "divider",
  Image: "image",
  Navbar: "navbar",
  Social: "social",
  Tabs: "tabs",
  Text: "text",
};

const rootClassNameSlots: Partial<Record<ToolNode["type"], string>> = {
  accordion: "accordion",
  card: "card",
  carousel: "carousel",
  contact: "contact",
  navbar: "navbar",
  social: "social",
  tabs: "tabs",
};

type ParseOptions = {
  previousPage: PageDocument;
};

type ReadContext = {
  constants: Map<string, unknown>;
  locals?: Map<string, unknown>;
};

type MappedJsxNode = {
  node: ts.JsxElement | ts.JsxSelfClosingElement;
  context: ReadContext;
};

export function jsxToPageDocument(source: string, options: ParseOptions) {
  const sourceFile = ts.createSourceFile(
    "artifact.jsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JSX,
  );
  const root = findFirstJsxElement(sourceFile, "Root");

  if (!root) {
    throw new Error("Generated JSX does not contain a Root component.");
  }

  const context: ReadContext = {
    constants: collectConstants(sourceFile),
  };
  const rootProps = getJsxAttributes(root.openingElement, context);
  const sections = parseRootChildren(root, options.previousPage, context);
  const rootClassName = normalizeResponsiveClassName(
    getStringProp(rootProps, "className") ?? "",
  );
  const page = {
    ...options.previousPage,
    id: getStringProp(rootProps, "id") ?? options.previousPage.id,
    props: rootClassName ? { className: rootClassName } : undefined,
    sections,
  };

  return pageDocumentSchema.parse(page);
}

function parseRootChildren(
  root: ts.JsxElement,
  previousPage: PageDocument,
  context: ReadContext,
) {
  const sections: SectionNode[] = [];
  const looseTools: ToolNode[] = [];

  for (const child of root.children) {
    if (!ts.isJsxElement(child) && !ts.isJsxSelfClosingElement(child)) {
      continue;
    }

    const tagName = getJsxTagName(child);

    if (tagName === "Section" && ts.isJsxElement(child)) {
      sections.push(parseSection(child, previousPage, sections.length, context));
      continue;
    }

    const tool = parseTool(child, previousPage, context);

    if (tool) {
      looseTools.push(tool);
    }
  }

  if (sections.length === 0) {
    sections.push(createFallbackSection(previousPage));
  }

  if (looseTools.length > 0) {
    sections[0] = {
      ...sections[0],
      tools: [...looseTools, ...sections[0].tools],
    };
  }

  return sections;
}

function parseSection(
  node: ts.JsxElement,
  previousPage: PageDocument,
  index: number,
  context: ReadContext,
): SectionNode {
  const props = getJsxAttributes(node.openingElement, context);
  const id = getStringProp(props, "id") ?? `section_generated_${index + 1}`;
  const previousSection = previousPage.sections.find(
    (section) => section.id === id,
  );
  const className = normalizeResponsiveClassName(
    getStringProp(props, "className") ?? "",
  );
  const responsiveGrid = getSectionResponsiveGrid(
    props.responsive,
    previousSection?.grid.responsive,
  );

  return {
    id,
    type: "section",
    name: previousSection?.name ?? `Section ${index + 1}`,
    props: className ? { className } : undefined,
    grid: {
      columns:
        getNumberProp(props, "columns") ?? previousSection?.grid.columns ?? 22,
      rows: getNumberProp(props, "rows") ?? previousSection?.grid.rows ?? 13,
      columnGap:
        getNumberProp(props, "columnGap") ??
        previousSection?.grid.columnGap ??
        11,
      rowGap:
        getNumberProp(props, "rowGap") ?? previousSection?.grid.rowGap ?? 11,
      ...(responsiveGrid ? { responsive: responsiveGrid } : {}),
    },
    tools: expandSectionChildren(node.children, context)
      .map((child) => parseTool(child.node, previousPage, child.context))
      .filter((tool): tool is ToolNode => Boolean(tool)),
  };
}

function getSectionResponsiveGrid(
  value: unknown,
  previous: SectionNode["grid"]["responsive"] | undefined,
) {
  const responsive = isRecord(value) ? value : undefined;
  const tablet = getSectionGridOverride(responsive?.tablet, previous?.tablet);
  const desktop = getSectionGridOverride(responsive?.desktop, previous?.desktop);
  const next: NonNullable<SectionNode["grid"]["responsive"]> = {};

  if (tablet) {
    next.tablet = tablet;
  }

  if (desktop) {
    next.desktop = desktop;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function getSectionGridOverride(
  value: unknown,
  previous:
    | NonNullable<SectionNode["grid"]["responsive"]>["tablet"]
    | undefined,
) {
  const source = isRecord(value) ? value : undefined;
  const next = {
    columns: getNumberProp(source ?? {}, "columns") ?? previous?.columns,
    rows: getNumberProp(source ?? {}, "rows") ?? previous?.rows,
    columnGap: getNumberProp(source ?? {}, "columnGap") ?? previous?.columnGap,
    rowGap: getNumberProp(source ?? {}, "rowGap") ?? previous?.rowGap,
  };

  return Object.values(next).some((item) => item !== undefined)
    ? next
    : undefined;
}

function parseTool(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  previousPage: PageDocument,
  context: ReadContext,
): ToolNode | null {
  const tagName = getJsxTagName(node);
  const type = toolTypesByComponentName[tagName];

  if (!type) {
    return null;
  }

  const rawProps = getJsxAttributes(getJsxOpening(node), context);
  const id = createGeneratedToolId(type);
  const previousTool = findTool(previousPage, id);
  const props = normalizeResponsiveClassNames(stripInternalProps(rawProps));
  const layout = extractLayout(type, props, previousTool);

  return {
    id,
    type,
    name: previousTool?.name ?? toTitle(type),
    locked: previousTool?.locked,
    hidden: previousTool?.hidden,
    layout,
    props: normalizeToolProps(type, props),
  } as ToolNode;
}

function extractLayout(
  type: ToolNode["type"],
  props: Record<string, unknown>,
  previousTool?: ToolNode,
): ToolNode["layout"] {
  const rootSlot = rootClassNameSlots[type];
  const classSource =
    rootSlot && isRecord(props.classNames)
      ? props.classNames[rootSlot]
      : props.className;
  const className = typeof classSource === "string" ? classSource : "";
  const parsedLayout = parseLayoutClassName(className);
  const cleanClassName = removeLayoutClasses(className);

  if (rootSlot && isRecord(props.classNames)) {
    if (cleanClassName) {
      props.classNames[rootSlot] = cleanClassName;
    } else {
      delete props.classNames[rootSlot];
    }
  } else if ("className" in props) {
    if (cleanClassName) {
      props.className = cleanClassName;
    } else {
      delete props.className;
    }
  }

  const baseGridArea = {
    rowStart:
      parsedLayout.base.rowStart ??
      previousTool?.layout.gridArea.rowStart ??
      1,
    rowEnd:
      parsedLayout.base.rowEnd ?? previousTool?.layout.gridArea.rowEnd ?? 2,
    columnStart:
      parsedLayout.base.columnStart ??
      previousTool?.layout.gridArea.columnStart ??
      1,
    columnEnd:
      parsedLayout.base.columnEnd ??
      previousTool?.layout.gridArea.columnEnd ??
      2,
  };
  const baseZIndex =
    parsedLayout.base.zIndex ?? previousTool?.layout.zIndex ?? 1;
  const responsive = buildResponsiveLayout(
    parsedLayout,
    baseGridArea,
    baseZIndex,
    previousTool,
  );

  return {
    gridArea: baseGridArea,
    zIndex: baseZIndex,
    ...(responsive ? { responsive } : {}),
  };
}

type ParsedLayoutClasses = {
  base: Partial<GridAreaParts>;
  tablet: Partial<GridAreaParts>;
  desktop: Partial<GridAreaParts>;
};

type GridAreaParts = {
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
  zIndex: number;
};

function parseLayoutClassName(className: string): ParsedLayoutClasses {
  const parsed: ParsedLayoutClasses = {
    base: {},
    tablet: {},
    desktop: {},
  };

  for (const token of className.split(/\s+/)) {
    const layoutClass = parseLayoutClassToken(token);

    if (!layoutClass) continue;

    parsed[layoutClass.breakpoint][layoutClass.key] = layoutClass.value;
  }

  return parsed;
}

function parseLayoutClassToken(token: string):
  | {
      breakpoint: keyof ParsedLayoutClasses;
      key: keyof GridAreaParts;
      value: number;
    }
  | undefined {
  if (!token) return undefined;

  const parts = token.split(":");
  const utility = parts.at(-1)?.replace(/^!/, "").replace(/!$/, "");
  const variants = parts.slice(0, -1);
  const match = utility?.match(/^(row-start|row-end|col-start|col-end|z)-(\d+)$/);

  if (!match) return undefined;

  const breakpoint = getLayoutBreakpoint(variants);

  if (!breakpoint) return undefined;

  return {
    breakpoint,
    key: layoutClassKey(match[1]),
    value: Number(match[2]),
  };
}

function getLayoutBreakpoint(
  variants: string[],
): keyof ParsedLayoutClasses | undefined {
  if (variants.length === 0) return "base";
  if (variants.includes("md") || variants.includes("@md")) return "tablet";
  if (
    variants.includes("lg") ||
    variants.includes("xl") ||
    variants.includes("2xl") ||
    variants.includes("@lg") ||
    variants.includes("@xl") ||
    variants.includes("@2xl")
  ) {
    return "desktop";
  }

  return undefined;
}

function layoutClassKey(className: string): keyof GridAreaParts {
  switch (className) {
    case "row-start":
      return "rowStart";
    case "row-end":
      return "rowEnd";
    case "col-start":
      return "columnStart";
    case "col-end":
      return "columnEnd";
    case "z":
      return "zIndex";
    default:
      throw new Error(`Unsupported layout class: ${className}`);
  }
}

function buildResponsiveLayout(
  parsedLayout: ParsedLayoutClasses,
  baseGridArea: ToolNode["layout"]["gridArea"],
  baseZIndex: number,
  previousTool?: ToolNode,
) {
  const responsive: NonNullable<ToolNode["layout"]["responsive"]> = {};
  const tablet = buildBreakpointLayout(
    parsedLayout.tablet,
    previousTool?.layout.responsive?.tablet,
    baseGridArea,
    baseZIndex,
  );
  const desktopBaseGridArea = tablet?.gridArea ?? baseGridArea;
  const desktopBaseZIndex = tablet?.zIndex ?? baseZIndex;
  const desktop = buildBreakpointLayout(
    parsedLayout.desktop,
    previousTool?.layout.responsive?.desktop,
    desktopBaseGridArea,
    desktopBaseZIndex,
  );

  if (tablet) {
    responsive.tablet = tablet;
  }

  if (desktop) {
    responsive.desktop = desktop;
  }

  return Object.keys(responsive).length > 0 ? responsive : undefined;
}

function buildBreakpointLayout(
  parsed: Partial<GridAreaParts>,
  previous:
    | {
        gridArea?: ToolNode["layout"]["gridArea"];
        zIndex?: number;
      }
    | undefined,
  fallbackGridArea: ToolNode["layout"]["gridArea"],
  fallbackZIndex: number,
) {
  const hasGridArea =
    parsed.rowStart !== undefined ||
    parsed.rowEnd !== undefined ||
    parsed.columnStart !== undefined ||
    parsed.columnEnd !== undefined;
  const hasZIndex = parsed.zIndex !== undefined;

  if (!hasGridArea && !hasZIndex && !previous) return undefined;

  return {
    ...(hasGridArea || previous?.gridArea
      ? {
          gridArea: {
            rowStart:
              parsed.rowStart ?? previous?.gridArea?.rowStart ?? fallbackGridArea.rowStart,
            rowEnd:
              parsed.rowEnd ?? previous?.gridArea?.rowEnd ?? fallbackGridArea.rowEnd,
            columnStart:
              parsed.columnStart ??
              previous?.gridArea?.columnStart ??
              fallbackGridArea.columnStart,
            columnEnd:
              parsed.columnEnd ??
              previous?.gridArea?.columnEnd ??
              fallbackGridArea.columnEnd,
          },
        }
      : {}),
    ...(hasZIndex || previous?.zIndex !== undefined
      ? { zIndex: parsed.zIndex ?? previous?.zIndex ?? fallbackZIndex }
      : {}),
  };
}

function normalizeToolProps(
  type: ToolNode["type"],
  props: Record<string, unknown>,
) {
  if (type !== "custom") {
    return props;
  }

  return {
    componentName: "Text",
    data: props,
  };
}

function normalizeResponsiveClassNames(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...props };

  if (typeof next.className === "string") {
    next.className = normalizeResponsiveClassName(next.className);
  }

  if (isRecord(next.classNames)) {
    next.classNames = Object.fromEntries(
      Object.entries(next.classNames).map(([key, value]) => [
        key,
        typeof value === "string" ? normalizeResponsiveClassName(value) : value,
      ]),
    );
  }

  return next;
}

function normalizeResponsiveClassName(className: string) {
  return className
    .split(/\s+/)
    .map((token) =>
      token.replace(
        /(^|:)(sm|md|lg|xl|2xl):/g,
        (_match, prefix: string, breakpoint: string) =>
          `${prefix}@${breakpoint}:`,
      ),
    )
    .join(" ");
}

function getJsxAttributes(
  opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  context: ReadContext,
) {
  const props: Record<string, unknown> = {};

  for (const attribute of opening.attributes.properties) {
    if (ts.isJsxSpreadAttribute(attribute)) {
      continue;
    }

    props[attribute.name.getText()] = readJsxAttribute(attribute, context);
  }

  return props;
}

function readJsxAttribute(
  attribute: ts.JsxAttribute,
  context: ReadContext,
): unknown {
  if (!attribute.initializer) {
    return true;
  }

  if (ts.isStringLiteral(attribute.initializer)) {
    return attribute.initializer.text;
  }

  if (ts.isJsxExpression(attribute.initializer)) {
    return readExpression(attribute.initializer.expression, context);
  }

  return undefined;
}

function readExpression(
  expression: ts.Expression | undefined,
  context: ReadContext,
): unknown {
  if (!expression) {
    return undefined;
  }

  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return expression.text;
  }

  if (ts.isIdentifier(expression)) {
    if (context.locals?.has(expression.text)) {
      return context.locals.get(expression.text);
    }

    return context.constants.get(expression.text);
  }

  if (ts.isParenthesizedExpression(expression)) {
    return readExpression(expression.expression, context);
  }

  if (ts.isTemplateExpression(expression)) {
    return [
      expression.head.text,
      ...expression.templateSpans.flatMap((span) => [
        String(readExpression(span.expression, context) ?? ""),
        span.literal.text,
      ]),
    ].join("");
  }

  if (ts.isNumericLiteral(expression)) {
    return Number(expression.text);
  }

  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }

  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }

  if (expression.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }

  if (
    ts.isPrefixUnaryExpression(expression) &&
    ts.isNumericLiteral(expression.operand)
  ) {
    const value = Number(expression.operand.text);

    return expression.operator === ts.SyntaxKind.MinusToken ? -value : value;
  }

  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.map((element) =>
      ts.isSpreadElement(element) ? undefined : readExpression(element, context),
    );
  }

  if (ts.isObjectLiteralExpression(expression)) {
    const value: Record<string, unknown> = {};

    for (const property of expression.properties) {
      if (ts.isShorthandPropertyAssignment(property)) {
        value[property.name.text] = readExpression(property.name, context);
        continue;
      }

      if (!ts.isPropertyAssignment(property)) {
        continue;
      }

      const name = readPropertyName(property.name);

      if (name) {
        value[name] = readExpression(property.initializer, context);
      }
    }

    return value;
  }

  if (ts.isConditionalExpression(expression)) {
    return readExpression(
      isTruthy(readExpression(expression.condition, context))
        ? expression.whenTrue
        : expression.whenFalse,
      context,
    );
  }

  if (ts.isBinaryExpression(expression)) {
    const left = readExpression(expression.left, context);
    const right = readExpression(expression.right, context);

    if (expression.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
      return left === right;
    }

    if (expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      if (typeof left === "number" && typeof right === "number") {
        return left + right;
      }

      return `${left ?? ""}${right ?? ""}`;
    }
  }

  if (ts.isCallExpression(expression)) {
    const mapped = readMapExpression(expression, context);

    if (mapped) {
      return mapped.map((item) => readExpression(item.expression, item.context));
    }
  }

  return undefined;
}

function readPropertyName(name: ts.PropertyName) {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }

  return null;
}

function collectConstants(sourceFile: ts.SourceFile) {
  const constants = new Map<string, unknown>();
  const context: ReadContext = { constants };

  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) {
          constants.set(
            declaration.name.text,
            readExpression(declaration.initializer, context),
          );
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return constants;
}

function expandSectionChildren(
  children: ts.NodeArray<ts.JsxChild>,
  context: ReadContext,
): MappedJsxNode[] {
  const nodes: MappedJsxNode[] = [];

  for (const child of children) {
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
      nodes.push({ node: child, context });
      continue;
    }

    if (ts.isJsxExpression(child) && child.expression) {
      nodes.push(...readMappedJsxNodes(child.expression, context));
    }
  }

  return nodes;
}

function readMappedJsxNodes(
  expression: ts.Expression,
  context: ReadContext,
): MappedJsxNode[] {
  const expressionValue = ts.isParenthesizedExpression(expression)
    ? expression.expression
    : expression;

  if (!ts.isCallExpression(expressionValue)) {
    return [];
  }

  const mapped = readMapExpression(expressionValue, context);

  if (!mapped) {
    return [];
  }

  return mapped.flatMap((item) => {
    const body = unwrapExpression(item.expression);

    if (ts.isJsxElement(body) || ts.isJsxSelfClosingElement(body)) {
      return [{ node: body, context: item.context }];
    }

    return [];
  });
}

function readMapExpression(expression: ts.CallExpression, context: ReadContext) {
  if (!ts.isPropertyAccessExpression(expression.expression)) {
    return null;
  }

  if (expression.expression.name.text !== "map") {
    return null;
  }

  const source = readExpression(expression.expression.expression, context);
  const callback = expression.arguments[0];

  if (!Array.isArray(source) || !callback || !ts.isArrowFunction(callback)) {
    return null;
  }

  if (ts.isBlock(callback.body)) {
    return null;
  }

  const body: ts.Expression = callback.body;

  return source.map((item, index) => ({
    expression: body,
    context: {
      ...context,
      locals: bindCallbackLocals(callback, item, index, context.locals),
    },
  }));
}

function bindCallbackLocals(
  callback: ts.ArrowFunction,
  item: unknown,
  index: number,
  parentLocals?: Map<string, unknown>,
) {
  const locals = new Map(parentLocals);
  const [itemParam, indexParam] = callback.parameters;

  bindPattern(itemParam?.name, item, locals);
  bindPattern(indexParam?.name, index, locals);

  return locals;
}

function bindPattern(
  name: ts.BindingName | undefined,
  value: unknown,
  locals: Map<string, unknown>,
) {
  if (!name) {
    return;
  }

  if (ts.isIdentifier(name)) {
    locals.set(name.text, value);
    return;
  }

  if (ts.isArrayBindingPattern(name) && Array.isArray(value)) {
    name.elements.forEach((element, index) => {
      if (ts.isBindingElement(element)) {
        bindPattern(element.name, value[index], locals);
      }
    });
  }
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  return ts.isParenthesizedExpression(expression)
    ? unwrapExpression(expression.expression)
    : expression;
}

function isTruthy(value: unknown) {
  return Boolean(value);
}

function findFirstJsxElement(
  sourceFile: ts.SourceFile,
  tagName: string,
): ts.JsxElement | null {
  let match: ts.JsxElement | null = null;

  function visit(node: ts.Node) {
    if (match) {
      return;
    }

    if (ts.isJsxElement(node) && getJsxTagName(node) === tagName) {
      match = node;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return match;
}

function getJsxOpening(node: ts.JsxElement | ts.JsxSelfClosingElement) {
  return ts.isJsxElement(node) ? node.openingElement : node;
}

function getJsxTagName(node: ts.JsxElement | ts.JsxSelfClosingElement) {
  const opening = getJsxOpening(node);

  return opening.tagName.getText();
}

function stripInternalProps(props: Record<string, unknown>) {
  const next = { ...props };

  delete next.children;
  delete next.key;

  return next;
}

function getStringProp(props: Record<string, unknown>, key: string) {
  return typeof props[key] === "string" ? props[key] : undefined;
}

function getNumberProp(props: Record<string, unknown>, key: string) {
  return typeof props[key] === "number" ? props[key] : undefined;
}

function removeLayoutClasses(className: string) {
  return className
    .split(/\s+/)
    .filter((part) => part && !parseLayoutClassToken(part))
    .join(" ");
}

function findTool(page: PageDocument, toolId: string) {
  for (const section of page.sections) {
    const tool = section.tools.find((item) => item.id === toolId);

    if (tool) {
      return tool;
    }
  }

  return undefined;
}

function createFallbackSection(page: PageDocument): SectionNode {
  return (
    page.sections[0] ?? {
      id: "section_generated_1",
      type: "section",
      name: "Section 1",
      grid: {
        columns: 22,
        rows: 13,
        columnGap: 11,
        rowGap: 11,
      },
      tools: [],
    }
  );
}

function createGeneratedToolId(type: ToolNode["type"]) {
  return `tool_${type}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function toTitle(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
