import type { PageDocument, SectionNode, ToolNode } from "./schema.ts";

const componentNamesByToolType: Record<ToolNode["type"], string> = {
  accordion: "Accordion",
  button: "Button",
  card: "Card",
  carousel: "Carousel",
  contact: "Contact",
  custom: "Text",
  divider: "Divider",
  image: "Image",
  navbar: "Navbar",
  social: "Social",
  tabs: "Tabs",
  text: "Text",
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

export function pageDocumentToJsx(page: PageDocument) {
  const imports = Array.from(
    new Set([
      "Root",
      "Section",
      ...page.sections.flatMap((section) =>
        section.tools.map((tool) => componentNamesByToolType[tool.type]),
      ),
    ]),
  ).sort();

  const body = page.sections.map(serializeSection).join("\n\n");

  return [
    `import { ${imports.join(", ")} } from "@/components";`,
    "",
    "export default function App() {",
    "  return (",
    `    <Root ${serializeAttributes({
      className: page.props?.className,
    })}>`,
    indent(body, 6),
    "    </Root>",
    "  );",
    "}",
    "",
  ].join("\n");
}

function serializeSection(section: SectionNode) {
  const attrs = {
    id: section.id,
    columns: section.grid.columns,
    rows: section.grid.rows,
    columnGap: section.grid.columnGap,
    rowGap: section.grid.rowGap,
    responsive: section.grid.responsive,
    className: section.props?.className,
  };
  const children = section.tools.map(serializeTool).join("\n");

  return [
    `<Section ${serializeAttributes(attrs)}>`,
    indent(children, 2),
    "</Section>",
  ].join("\n");
}

function serializeTool(tool: ToolNode) {
  const componentName = componentNamesByToolType[tool.type];
  const props = sanitizeProps(tool);
  const attrs = withLayoutClasses(tool, props);

  return `<${componentName} ${serializeAttributes(attrs)} />`;
}

function sanitizeProps(tool: ToolNode) {
  if (tool.type !== "custom") {
    return { ...(tool.props as Record<string, unknown>) };
  }

  const data = tool.props.data;

  return data && typeof data === "object" && !Array.isArray(data)
    ? { ...(data as Record<string, unknown>) }
    : {};
}

function withLayoutClasses(tool: ToolNode, props: Record<string, unknown>) {
  const layoutClasses = serializeLayoutClasses(tool);
  const rootSlot = rootClassNameSlots[tool.type];

  if (!rootSlot) {
    return {
      ...props,
      className: mergeClassName(
        removeLayoutClasses(props.className),
        layoutClasses,
      ),
    };
  }

  const classNames =
    props.classNames && isRecord(props.classNames)
      ? { ...props.classNames }
      : {};

  classNames[rootSlot] = mergeClassName(
    removeLayoutClasses(classNames[rootSlot]),
    layoutClasses,
  );

  return {
    ...props,
    classNames,
  };
}

function serializeLayoutClasses(tool: ToolNode) {
  return [
    serializeGridArea(tool.layout.gridArea),
    `z-${tool.layout.zIndex}`,
    tool.layout.responsive?.tablet?.gridArea
      ? serializeGridArea(tool.layout.responsive.tablet.gridArea, "md")
      : "",
    tool.layout.responsive?.tablet?.zIndex !== undefined
      ? `md:z-${tool.layout.responsive.tablet.zIndex}`
      : "",
    tool.layout.responsive?.desktop?.gridArea
      ? serializeGridArea(tool.layout.responsive.desktop.gridArea, "lg")
      : "",
    tool.layout.responsive?.desktop?.zIndex !== undefined
      ? `lg:z-${tool.layout.responsive.desktop.zIndex}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function serializeGridArea(
  gridArea: ToolNode["layout"]["gridArea"],
  breakpoint?: "md" | "lg",
) {
  const prefix = breakpoint ? `${breakpoint}:` : "";

  return [
    `${prefix}row-start-${gridArea.rowStart}`,
    `${prefix}row-end-${gridArea.rowEnd}`,
    `${prefix}col-start-${gridArea.columnStart}`,
    `${prefix}col-end-${gridArea.columnEnd}`,
  ].join(" ");
}

function mergeClassName(value: unknown, addition: string) {
  return [typeof value === "string" ? value : "", addition]
    .filter(Boolean)
    .join(" ");
}

function removeLayoutClasses(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .split(/\s+/)
    .filter((token) => token && !parseLayoutClassToken(token))
    .join(" ");
}

function parseLayoutClassToken(token: string) {
  if (!token) return undefined;

  const parts = token.split(":");
  const utility = parts.at(-1)?.replace(/^!/, "").replace(/!$/, "");
  const variants = parts.slice(0, -1);

  if (!utility?.match(/^(row-start|row-end|col-start|col-end|z)-\d+$/)) {
    return undefined;
  }

  if (variants.length === 0) return token;
  if (
    variants.includes("md") ||
    variants.includes("lg") ||
    variants.includes("xl") ||
    variants.includes("2xl") ||
    variants.includes("@md") ||
    variants.includes("@lg") ||
    variants.includes("@xl") ||
    variants.includes("@2xl")
  ) {
    return token;
  }

  return undefined;
}

function serializeAttributes(attrs: Record<string, unknown>) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => serializeAttribute(key, value))
    .join(" ");
}

function serializeAttribute(key: string, value: unknown) {
  if (typeof value === "string") {
    return `${key}=${quote(value)}`;
  }

  if (typeof value === "boolean") {
    return value ? key : `${key}={false}`;
  }

  return `${key}={${toJsExpression(value)}}`;
}

function toJsExpression(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/"([A-Za-z_$][\w$]*)":/g, "$1:")
    .replace(/\n/g, "\n");
}

function quote(value: string) {
  return JSON.stringify(value);
}

function indent(value: string, spaces: number) {
  const padding = " ".repeat(spaces);

  return value
    .split("\n")
    .map((line) => (line ? `${padding}${line}` : line))
    .join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
