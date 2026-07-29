import {
  pageDocumentSchema,
  type PageDocument,
  type PagePatch,
  type SectionNode,
  type ToolNode,
} from "./schema.ts";

type SectionGrid = SectionNode["grid"];
type GridBreakpoint = "base" | "tablet" | "mobile";

/**
 * Applies the only patch shapes emitted by the Node delivery pipeline:
 * a full-page replacement or target Tool/Section operations from selection filtering.
 * Unsupported operations fail loudly so the verified delivery projection
 * cannot silently diverge from what the editor will apply.
 */
export function applyDeliveryPatch(page: PageDocument, patch: PagePatch) {
  const deliveredPage = patch.reduce<PageDocument>((currentPage, operation) => {
    switch (operation.op) {
      case "replacePage":
        return operation.page;
      case "addTool": {
        let sectionFound = false;
        const sections = currentPage.sections.map((section) => {
          if (section.id !== operation.sectionId) {
            return section;
          }

          sectionFound = true;
          return {
            ...section,
            tools: [...section.tools, operation.tool],
          };
        });

        if (!sectionFound) {
          throw new Error(
            `Cannot add tool ${operation.tool.id}; section ${operation.sectionId} was not found.`,
          );
        }

        return { ...currentPage, sections };
      }
      case "updateTool": {
        let toolFound = false;
        const sections = currentPage.sections.map((section) => ({
          ...section,
          tools: section.tools.map((tool) => {
            if (tool.id !== operation.toolId) {
              return tool;
            }

            toolFound = true;
            return mergeTool(tool, operation.changes);
          }),
        }));

        if (!toolFound) {
          throw new Error(
            `Cannot update tool ${operation.toolId}; it was not found in the current page.`,
          );
        }

        return { ...currentPage, sections };
      }
      case "removeTool": {
        let toolFound = false;
        const sections = currentPage.sections.map((section) => ({
          ...section,
          tools: section.tools.filter((tool) => {
            if (tool.id !== operation.toolId) {
              return true;
            }

            toolFound = true;
            return false;
          }),
        }));

        if (!toolFound) {
          throw new Error(
            `Cannot remove tool ${operation.toolId}; it was not found in the current page.`,
          );
        }

        return { ...currentPage, sections };
      }
      case "updateSection": {
        let sectionFound = false;
        const sections = currentPage.sections.map((section) => {
          if (section.id !== operation.sectionId) {
            return section;
          }

          sectionFound = true;
          return mergeSection(section, operation.changes);
        });

        if (!sectionFound) {
          throw new Error(
            `Cannot update section ${operation.sectionId}; it was not found in the current page.`,
          );
        }

        return { ...currentPage, sections };
      }
      default:
        throw new Error(
          `Unsupported delivery patch operation: ${operation.op}.`,
        );
    }
  }, page);

  return pageDocumentSchema.parse(deliveredPage);
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
        ...(tool.layout.responsive?.mobile || changes.layout?.responsive?.mobile
          ? {
              mobile: {
                ...tool.layout.responsive?.mobile,
                ...changes.layout?.responsive?.mobile,
                ...(tool.layout.responsive?.mobile?.gridArea ||
                changes.layout?.responsive?.mobile?.gridArea
                  ? {
                      gridArea: {
                        ...tool.layout.responsive?.mobile?.gridArea,
                        ...changes.layout?.responsive?.mobile?.gridArea,
                      },
                    }
                  : {}),
              },
            }
          : {}),
      },
    },
    props: mergeToolProps(tool.props, changes.props),
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
        ...(section.grid.responsive?.mobile || changes.grid?.responsive?.mobile
          ? {
              mobile: {
                ...section.grid.responsive?.mobile,
                ...changes.grid?.responsive?.mobile,
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
  if (hasGridSizeChange(changes.grid)) {
    return ["base", "tablet", "mobile"];
  }

  if (hasGridSizeChange(changes.grid?.responsive?.tablet)) {
    return ["tablet", "mobile"];
  }

  if (hasGridSizeChange(changes.grid?.responsive?.mobile)) {
    return ["mobile"];
  }

  return [];
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
  if (breakpoints.length === 0) {
    return section;
  }

  return {
    ...section,
    tools: section.tools.map((tool) =>
      breakpoints.reduce(
        (nextTool, breakpoint) =>
          clampToolForBreakpoint(nextTool, section, breakpoint),
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

    if (isSameGridArea(gridArea, tool.layout.gridArea)) {
      return tool;
    }

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

  if (isSameGridArea(gridArea, activeLayout.gridArea)) {
    return tool;
  }

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
  if (breakpoint === "mobile") {
    return {
      gridArea:
        tool.layout.responsive?.mobile?.gridArea ??
        tool.layout.responsive?.tablet?.gridArea ??
        tool.layout.gridArea,
      zIndex:
        tool.layout.responsive?.mobile?.zIndex ??
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
  if (breakpoint === "mobile") {
    return {
      ...section.grid,
      ...section.grid.responsive?.tablet,
      ...section.grid.responsive?.mobile,
    };
  }

  return {
    ...section.grid,
    ...section.grid.responsive?.tablet,
  };
}

function clampGridArea(
  gridArea: ToolNode["layout"]["gridArea"],
  grid: SectionGrid,
) {
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

function mergeToolProps(
  props: ToolNode["props"],
  changes?: Partial<ToolNode>["props"],
) {
  const currentProps = props as {
    classNames?: Record<string, string | undefined>;
  };
  const nextProps = changes as
    | { classNames?: Record<string, string | undefined> }
    | undefined;
  const mergedProps = { ...props, ...changes };

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
