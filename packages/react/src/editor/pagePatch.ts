import type { PageDocument, PagePatch, SectionNode, ToolNode } from "./types";

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
    },
    props: mergeProps(tool.props, changes.props),
  } as ToolNode;
}

function mergeSection(
  section: SectionNode,
  changes: Partial<SectionNode>,
): SectionNode {
  return {
    ...section,
    ...changes,
    grid: {
      ...section.grid,
      ...changes.grid,
    },
    layout: {
      ...section.layout,
      ...changes.layout,
    },
    responsive: {
      ...section.responsive,
      ...changes.responsive,
    },
    tools: changes.tools ?? section.tools,
  };
}

export function applyPagePatch(page: PageDocument, patch: PagePatch) {
  return patch.reduce<PageDocument>((currentPage, operation) => {
    switch (operation.op) {
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
