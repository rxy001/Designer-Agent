import type { PageDocument, PagePatch, SectionNode, ToolNode } from "./types";

type SectionGrid = SectionNode["grid"];
type GridBreakpoint = "base" | "tablet" | "desktop";

function mergeProps(
  props: ToolNode["props"],
  changes?: Partial<ToolNode>["props"],
) {
  const currentProps = props as {
    classNames?: Record<string, string | undefined>;
  };
  const nextProps = changes as
    | {
        classNames?: Record<string, string | undefined>;
      }
    | undefined;
  const mergedProps = {
    ...props,
    ...changes,
  };

  if (!currentProps.classNames && !nextProps?.classNames) {
    return mergedProps as ToolNode["props"];
  }

  return {
    ...mergedProps,
    classNames: {
      ...currentProps.classNames,
      ...nextProps?.classNames,
    },
  } as ToolNode["props"];
}

function mergeTool(tool: ToolNode, changes: Partial<ToolNode>): ToolNode {
  return {
    ...tool,
    ...changes,
    layout: {
      ...tool.layout,
      ...changes.layout,
      gridArea: {
        ...tool.layout.gridArea,
        ...changes.layout?.gridArea,
      },
      responsive: {
        ...tool.layout.responsive,
        ...changes.layout?.responsive,
        ...(tool.layout.responsive?.tablet || changes.layout?.responsive?.tablet
          ? {
              tablet: {
                ...tool.layout.responsive?.tablet,
                ...changes.layout?.responsive?.tablet,
                ...(tool.layout.responsive?.tablet?.gridArea ||
                changes.layout?.responsive?.tablet?.gridArea
                  ? {
                      gridArea: {
                        ...tool.layout.responsive?.tablet?.gridArea,
                        ...changes.layout?.responsive?.tablet?.gridArea,
                      },
                    }
                  : {}),
              },
            }
          : {}),
        ...(tool.layout.responsive?.desktop ||
        changes.layout?.responsive?.desktop
          ? {
              desktop: {
                ...tool.layout.responsive?.desktop,
                ...changes.layout?.responsive?.desktop,
                ...(tool.layout.responsive?.desktop?.gridArea ||
                changes.layout?.responsive?.desktop?.gridArea
                  ? {
                      gridArea: {
                        ...tool.layout.responsive?.desktop?.gridArea,
                        ...changes.layout?.responsive?.desktop?.gridArea,
                      },
                    }
                  : {}),
              },
            }
          : {}),
      },
    },
    props: mergeProps(tool.props, changes.props),
  } as ToolNode;
}

function mergeSection(
  section: SectionNode,
  changes: Partial<SectionNode>,
): SectionNode {
  const nextSection = {
    ...section,
    ...changes,
    grid: {
      ...section.grid,
      ...changes.grid,
      responsive: {
        ...section.grid.responsive,
        ...changes.grid?.responsive,
        ...(section.grid.responsive?.tablet || changes.grid?.responsive?.tablet
          ? {
              tablet: {
                ...section.grid.responsive?.tablet,
                ...changes.grid?.responsive?.tablet,
              },
            }
          : {}),
        ...(section.grid.responsive?.desktop ||
        changes.grid?.responsive?.desktop
          ? {
              desktop: {
                ...section.grid.responsive?.desktop,
                ...changes.grid?.responsive?.desktop,
              },
            }
          : {}),
      },
    },
    props: {
      ...section.props,
      ...changes.props,
    },
    tools: changes.tools ?? section.tools,
  };

  return clampSectionTools(nextSection, getChangedGridBreakpoints(changes));
}

function getChangedGridBreakpoints(
  changes: Partial<SectionNode>,
): GridBreakpoint[] {
  const breakpoints: GridBreakpoint[] = [];

  if (hasGridSizeChange(changes.grid)) {
    breakpoints.push("base");
  }

  if (hasGridSizeChange(changes.grid?.responsive?.tablet)) {
    breakpoints.push("tablet");
  }

  if (hasGridSizeChange(changes.grid?.responsive?.desktop)) {
    breakpoints.push("desktop");
  }

  return breakpoints;
}

function hasGridSizeChange(
  grid: Partial<Pick<SectionGrid, "columns" | "rows">> | undefined,
) {
  return grid?.columns !== undefined || grid?.rows !== undefined;
}

function clampSectionTools(
  section: SectionNode,
  breakpoints: GridBreakpoint[],
) {
  if (breakpoints.length === 0) return section;

  return {
    ...section,
    tools: section.tools.map((tool) =>
      breakpoints.reduce(
        (nextTool, breakpoint) => clampToolForBreakpoint(nextTool, section, breakpoint),
        tool,
      ),
    ) as ToolNode[],
  };
}

function clampToolForBreakpoint(
  tool: ToolNode,
  section: SectionNode,
  breakpoint: GridBreakpoint,
): ToolNode {
  if (breakpoint === "base") {
    const gridArea = clampGridArea(tool.layout.gridArea, section.grid);

    if (isSameGridArea(gridArea, tool.layout.gridArea)) return tool;

    return {
      ...tool,
      layout: {
        ...tool.layout,
        gridArea,
      },
    } as ToolNode;
  }

  const activeLayout = getActiveToolLayout(tool, breakpoint);
  const activeGrid = getActiveSectionGrid(section, breakpoint);
  const gridArea = clampGridArea(activeLayout.gridArea, activeGrid);

  if (isSameGridArea(gridArea, activeLayout.gridArea)) return tool;

  return {
    ...tool,
    layout: {
      ...tool.layout,
      responsive: {
        ...tool.layout.responsive,
        [breakpoint]: {
          ...tool.layout.responsive?.[breakpoint],
          gridArea,
        },
      },
    },
  } as ToolNode;
}

function getActiveToolLayout(
  tool: ToolNode,
  breakpoint: Exclude<GridBreakpoint, "base">,
) {
  if (breakpoint === "desktop") {
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

  return {
    gridArea: tool.layout.responsive?.tablet?.gridArea ?? tool.layout.gridArea,
    zIndex: tool.layout.responsive?.tablet?.zIndex ?? tool.layout.zIndex,
  };
}

function getActiveSectionGrid(
  section: SectionNode,
  breakpoint: Exclude<GridBreakpoint, "base">,
) {
  if (breakpoint === "desktop") {
    return {
      ...section.grid,
      ...section.grid.responsive?.tablet,
      ...section.grid.responsive?.desktop,
    };
  }

  return {
    ...section.grid,
    ...section.grid.responsive?.tablet,
  };
}

function clampGridArea(gridArea: ToolNode["layout"]["gridArea"], grid: SectionGrid) {
  const rowSpan = Math.min(
    Math.max(1, gridArea.rowEnd - gridArea.rowStart),
    grid.rows,
  );
  const columnSpan = Math.min(
    Math.max(1, gridArea.columnEnd - gridArea.columnStart),
    grid.columns,
  );
  const rowStart = clamp(gridArea.rowStart, 1, grid.rows - rowSpan + 1);
  const columnStart = clamp(
    gridArea.columnStart,
    1,
    grid.columns - columnSpan + 1,
  );

  return {
    rowStart,
    columnStart,
    rowEnd: rowStart + rowSpan,
    columnEnd: columnStart + columnSpan,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isSameGridArea(
  first: ToolNode["layout"]["gridArea"],
  second: ToolNode["layout"]["gridArea"],
) {
  return (
    first.rowStart === second.rowStart &&
    first.columnStart === second.columnStart &&
    first.rowEnd === second.rowEnd &&
    first.columnEnd === second.columnEnd
  );
}

export function applyPagePatch(page: PageDocument, patch: PagePatch) {
  return patch.reduce<PageDocument>((currentPage, operation) => {
    switch (operation.op) {
      case "replacePage":
        return operation.page;
      case "addTool":
        return {
          ...currentPage,
          sections: currentPage.sections.map((section) =>
            section.id === operation.sectionId
              ? { ...section, tools: [...section.tools, operation.tool] }
              : section,
          ),
        };
      case "updateTool":
        return {
          ...currentPage,
          sections: currentPage.sections.map((section) => ({
            ...section,
            tools: section.tools.map((tool) =>
              tool.id === operation.toolId
                ? mergeTool(tool, operation.changes)
                : tool,
            ),
          })),
        };
      case "removeTool":
        return {
          ...currentPage,
          sections: currentPage.sections.map((section) => ({
            ...section,
            tools: section.tools.filter((tool) => tool.id !== operation.toolId),
          })),
        };
      case "addSection": {
        const insertionIndex = operation.afterSectionId
          ? currentPage.sections.findIndex(
              (section) => section.id === operation.afterSectionId,
            ) + 1
          : currentPage.sections.length;
        const nextSections = [...currentPage.sections];

        nextSections.splice(
          insertionIndex > 0 ? insertionIndex : nextSections.length,
          0,
          operation.section,
        );

        return {
          ...currentPage,
          sections: nextSections,
        };
      }
      case "removeSection":
        return {
          ...currentPage,
          sections: currentPage.sections.filter(
            (section) => section.id !== operation.sectionId,
          ),
        };
      case "updateSection":
        return {
          ...currentPage,
          sections: currentPage.sections.map((section) =>
            section.id === operation.sectionId
              ? mergeSection(section, operation.changes)
              : section,
          ),
        };
      default:
        return currentPage;
    }
  }, page);
}
