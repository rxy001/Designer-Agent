import type { PageDocument, PagePatch, SectionNode, ToolNode } from "./schema.ts";

export function diffPageDocuments(
  previousPage: PageDocument,
  nextPage: PageDocument,
): PagePatch {
  const patch: PagePatch = [];
  const previousSectionsById = new Map(
    previousPage.sections.map((section) => [section.id, section]),
  );
  const nextSectionsById = new Map(
    nextPage.sections.map((section) => [section.id, section]),
  );

  for (const previousSection of previousPage.sections) {
    if (!nextSectionsById.has(previousSection.id)) {
      patch.push({ op: "removeSection", sectionId: previousSection.id });
    }
  }

  nextPage.sections.forEach((nextSection, sectionIndex) => {
    const previousSection = previousSectionsById.get(nextSection.id);

    if (!previousSection) {
      patch.push({
        op: "addSection",
        section: nextSection,
        afterSectionId: nextPage.sections[sectionIndex - 1]?.id,
      });
      return;
    }

    const sectionChanges = diffSection(previousSection, nextSection);

    if (Object.keys(sectionChanges).length > 0) {
      patch.push({
        op: "updateSection",
        sectionId: nextSection.id,
        changes: sectionChanges,
      });
    }

    patch.push(...diffSectionTools(previousSection, nextSection));
  });

  return patch;
}

function diffSection(previousSection: SectionNode, nextSection: SectionNode) {
  const changes: Partial<SectionNode> = {};

  if (previousSection.name !== nextSection.name) {
    changes.name = nextSection.name;
  }

  if (!deepEqual(previousSection.props, nextSection.props)) {
    changes.props = nextSection.props;
  }

  if (!deepEqual(previousSection.grid, nextSection.grid)) {
    changes.grid = nextSection.grid;
  }

  return changes;
}

function diffSectionTools(
  previousSection: SectionNode,
  nextSection: SectionNode,
): PagePatch {
  const patch: PagePatch = [];
  const previousToolsById = new Map(
    previousSection.tools.map((tool) => [tool.id, tool]),
  );
  const nextToolsById = new Map(nextSection.tools.map((tool) => [tool.id, tool]));

  for (const previousTool of previousSection.tools) {
    if (!nextToolsById.has(previousTool.id)) {
      patch.push({ op: "removeTool", toolId: previousTool.id });
    }
  }

  for (const nextTool of nextSection.tools) {
    const previousTool = previousToolsById.get(nextTool.id);

    if (!previousTool) {
      patch.push({
        op: "addTool",
        sectionId: nextSection.id,
        tool: nextTool,
      });
      continue;
    }

    const changes = diffTool(previousTool, nextTool);

    if (Object.keys(changes).length > 0) {
      patch.push({
        op: "updateTool",
        toolId: nextTool.id,
        changes,
      });
    }
  }

  return patch;
}

function diffTool(previousTool: ToolNode, nextTool: ToolNode) {
  const changes: Partial<ToolNode> = {};

  if (previousTool.name !== nextTool.name) {
    changes.name = nextTool.name;
  }

  if (previousTool.locked !== nextTool.locked) {
    changes.locked = nextTool.locked;
  }

  if (previousTool.hidden !== nextTool.hidden) {
    changes.hidden = nextTool.hidden;
  }

  if (!deepEqual(previousTool.layout, nextTool.layout)) {
    changes.layout = nextTool.layout;
  }

  if (!deepEqual(previousTool.props, nextTool.props)) {
    changes.props = nextTool.props;
  }

  return changes;
}

function deepEqual(left: unknown, right: unknown) {
  return JSON.stringify(sortValue(left)) === JSON.stringify(sortValue(right));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, item]) => [key, sortValue(item)]),
    );
  }

  return value;
}
