import type { PageDocument, SectionNode, ToolNode } from "./schema.ts";
import {
  normalizeResponsiveVariant,
  toViewportClassName,
} from "./responsiveClassNames.ts";

const componentNamesByToolType: Record<ToolNode["type"], string> = {
  accordion: "Accordion",
  avatar: "Avatar",
  badge: "Badge",
  button: "Button",
  card: "Card",
  carousel: "Carousel",
  contact: "Contact",
  custom: "Text",
  divider: "Divider",
  icon: "Icon",
  image: "Image",
  input: "Input",
  list: "List",
  navbar: "Navbar",
  newsletter: "Newsletter",
  social: "Social",
  tabs: "Tabs",
  text: "Text",
};

const rootClassNameSlots: Partial<Record<ToolNode["type"], string>> = {
  accordion: "accordion",
  avatar: "avatar",
  card: "card",
  carousel: "carousel",
  contact: "contact",
  input: "input",
  list: "list",
  navbar: "navbar",
  newsletter: "newsletter",
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
      className: toViewportClassName(page.props?.className),
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
    height: section.grid.height ?? 720,
    columnGap: section.grid.columnGap,
    rowGap: section.grid.rowGap,
    responsive: section.grid.responsive,
    className: toViewportClassName(section.props?.className),
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
  const attrs = {
    ...withLayoutClasses(tool, props),
    id: tool.id,
  };

  return `<${componentName} ${serializeAttributes(attrs)} />`;
}

function sanitizeProps(tool: ToolNode) {
  if (tool.type !== "custom") {
    return toViewportClassNames({ ...(tool.props as Record<string, unknown>) });
  }

  const data = tool.props.data;

  return data && typeof data === "object" && !Array.isArray(data)
    ? toViewportClassNames({ ...(data as Record<string, unknown>) })
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
      ? serializeGridArea(tool.layout.responsive.tablet.gridArea, "sm:max-lg")
      : "",
    tool.layout.responsive?.tablet?.zIndex !== undefined
      ? `sm:max-lg:z-${tool.layout.responsive.tablet.zIndex}`
      : "",
    tool.layout.responsive?.mobile?.gridArea
      ? serializeGridArea(tool.layout.responsive.mobile.gridArea, "max-sm")
      : "",
    tool.layout.responsive?.mobile?.zIndex !== undefined
      ? `max-sm:z-${tool.layout.responsive.mobile.zIndex}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function serializeGridArea(
  gridArea: ToolNode["layout"]["gridArea"],
  breakpoint?: "sm:max-lg" | "max-sm",
) {
  const prefix = breakpoint ? `${breakpoint}:` : "";

  return [
    `${prefix}row-start-${gridArea.rowStart}`,
    `${prefix}row-end-${gridArea.rowEnd}`,
    `${prefix}col-start-${gridArea.columnStart}`,
    `${prefix}col-end-${gridArea.columnEnd}`,
  ].join(" ");
}

function toViewportClassNames(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...props };

  if (typeof next.className === "string") {
    next.className = toViewportClassName(next.className);
  }

  if (isRecord(next.classNames)) {
    next.classNames = Object.fromEntries(
      Object.entries(next.classNames).map(([key, value]) => [
        key,
        typeof value === "string" ? toViewportClassName(value) : value,
      ]),
    );
  }

  return next;
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
  const variants = parts.slice(0, -1).map(normalizeResponsiveVariant);

  if (!utility?.match(/^(row-start|row-end|col-start|col-end|z)-(?:\d+|\[\d+\])$/)) {
    return undefined;
  }

  if (variants.length === 0) return token;
  if (
    variants.includes("md") ||
    variants.includes("lg") ||
    variants.includes("xl") ||
    variants.includes("2xl") ||
    variants.includes("max-sm") ||
    variants.includes("max-lg") ||
    variants.includes("max-md")
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
    if (value.includes("\n") || value.includes("\r")) {
      return `${key}={${quote(value)}}`;
    }

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
