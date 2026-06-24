import type { GridArea, ToolNode, Viewport } from "./types";

const rootClassNameSlots: Partial<Record<ToolNode["type"], string>> = {
  accordion: "accordion",
  card: "card",
  carousel: "carousel",
  contact: "contact",
  navbar: "navbar",
  social: "social",
  tabs: "tabs",
};

export function getActiveToolLayout(tool: ToolNode, viewport: Viewport) {
  if (viewport === "desktop") {
    return {
      gridArea:
        tool.layout.responsive?.desktop?.gridArea ??
        tool.layout.responsive?.tablet?.gridArea ??
        tool.layout.gridArea,
      zIndex:
        tool.layout.responsive?.desktop?.zIndex ??
        tool.layout.responsive?.tablet?.zIndex ??
        tool.layout.zIndex,
    };
  }

  if (viewport === "tablet") {
    return {
      gridArea: tool.layout.responsive?.tablet?.gridArea ?? tool.layout.gridArea,
      zIndex: tool.layout.responsive?.tablet?.zIndex ?? tool.layout.zIndex,
    };
  }

  return {
    gridArea: tool.layout.gridArea,
    zIndex: tool.layout.zIndex,
  };
}

export function getToolLayoutClassName(
  tool: ToolNode,
  viewport: Viewport,
  gridArea?: GridArea,
) {
  const activeLayout = getActiveToolLayout(tool, viewport);
  const area = gridArea ?? activeLayout.gridArea;

  return [
    `row-start-${area.rowStart}`,
    `row-end-${area.rowEnd}`,
    `col-start-${area.columnStart}`,
    `col-end-${area.columnEnd}`,
    `z-${activeLayout.zIndex}`,
  ].join(" ");
}

export function withToolLayoutClasses(
  tool: ToolNode,
  viewport: Viewport,
  gridArea?: GridArea,
) {
  const layoutClassName = getToolLayoutClassName(tool, viewport, gridArea);

  if (tool.type === "custom") {
    const data = isRecord(tool.props.data) ? tool.props.data : {};
    const className = removePlacementClasses(data.className);

    return {
      ...tool,
      props: {
        ...tool.props,
        data: {
          ...data,
          className: mergeClassName(className, layoutClassName),
        },
      },
    } satisfies ToolNode;
  }

  const rootSlot = rootClassNameSlots[tool.type];

  if (!rootSlot) {
    const props = tool.props as Record<string, unknown>;

    return {
      ...tool,
      props: {
        ...props,
        className: mergeClassName(
          removePlacementClasses(props.className),
          layoutClassName,
        ),
      },
    } as ToolNode;
  }

  const props = tool.props as Record<string, unknown>;
  const classNames = isRecord(props.classNames)
    ? { ...props.classNames }
    : {};
  const className = removePlacementClasses(classNames[rootSlot]);

  return {
    ...tool,
    props: {
      ...props,
      classNames: {
        ...classNames,
        [rootSlot]: mergeClassName(className, layoutClassName),
      },
    },
  } as ToolNode;
}

export function getToolPlacementClassName(
  tool: ToolNode,
  viewport: Viewport,
  gridArea?: GridArea,
) {
  return getToolLayoutClassName(tool, viewport, gridArea);
}

export function getToolLayoutChangeForViewport(
  tool: ToolNode,
  viewport: Viewport,
  gridArea: GridArea,
): Partial<ToolNode> {
  if (viewport === "mobile") {
    return {
      layout: {
        ...tool.layout,
        gridArea,
      },
    } as Partial<ToolNode>;
  }

  const key = viewport === "tablet" ? "tablet" : "desktop";

  return {
    layout: {
      ...tool.layout,
      responsive: {
        ...tool.layout.responsive,
        [key]: {
          ...tool.layout.responsive?.[key],
          gridArea,
        },
      },
    },
  } as Partial<ToolNode>;
}

function removePlacementClasses(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .split(/\s+/)
    .filter((token) => !isPlacementClassToken(token))
    .join(" ");
}

function isPlacementClassToken(value: string) {
  const base = value.split(":").pop()?.replace(/^!/, "").replace(/!$/, "");

  return Boolean(
    base &&
      (/^row-(start|end)-/.test(base) ||
        /^col-(start|end)-/.test(base) ||
        /^z-/.test(base)),
  );
}

function mergeClassName(value: unknown, addition: string) {
  return [typeof value === "string" ? value : "", addition]
    .filter(Boolean)
    .join(" ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
