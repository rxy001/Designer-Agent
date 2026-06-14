import { Input } from "../ui/Input";
import { Separator } from "../ui/Separator";
import { Switch } from "../ui/Switch";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { findSection, findTool } from "./pageDocument";
import type { PageDocument, SectionNode, ToolNode } from "./types";

type InspectorPanelProps = {
  page: PageDocument;
  selectedSectionId: string;
  selectedToolId?: string;
  onUpdateSection: (sectionId: string, changes: Partial<SectionNode>) => void;
  onUpdateTool: (toolId: string, changes: Partial<ToolNode>) => void;
  onRemoveTool: (toolId: string) => void;
};

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1 text-xs font-medium text-neutral-600">
      <span>{label}</span>
      <Input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

const rootClassNameSlots: Partial<Record<ToolNode["type"], string>> = {
  accordion: "accordion",
  card: "card",
  carousel: "carousel",
  contact: "contact",
  navbar: "navbar",
  social: "social",
  tabs: "tabs",
};

function getRootClassName(tool: ToolNode) {
  const rootSlot = rootClassNameSlots[tool.type];
  const props = tool.props as {
    className?: string;
    classNames?: Record<string, string | undefined>;
  };

  if (rootSlot) {
    return props.classNames?.[rootSlot] ?? "";
  }

  return props.className ?? "";
}

function getRootClassNameChanges(
  tool: ToolNode,
  className: string,
): Partial<ToolNode> {
  const rootSlot = rootClassNameSlots[tool.type];
  const props = tool.props as {
    className?: string;
    classNames?: Record<string, string | undefined>;
  };

  if (rootSlot) {
    return {
      props: {
        ...tool.props,
        classNames: {
          ...props.classNames,
          [rootSlot]: className,
        },
      },
    } as Partial<ToolNode>;
  }

  return {
    props: {
      ...tool.props,
      className,
    },
  } as Partial<ToolNode>;
}

export function InspectorPanel({
  page,
  selectedSectionId,
  selectedToolId,
  onUpdateSection,
  onUpdateTool,
  onRemoveTool,
}: InspectorPanelProps) {
  const tool = findTool(page, selectedToolId);
  const section = findSection(page, selectedSectionId);

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-950">Inspector</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Edit selected tool properties and grid area.
        </p>
      </div>
      {!tool ? (
        <SectionEditor section={section} onUpdateSection={onUpdateSection} />
      ) : (
        <div className="min-h-0 flex-1 space-y-5 overflow-auto p-4">
          <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3">
            <span className="text-sm text-neutral-700">Locked</span>
            <Switch
              checked={Boolean(tool.locked)}
              onCheckedChange={(checked) =>
                onUpdateTool(tool.id, { locked: checked } as Partial<ToolNode>)
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3">
            <span className="text-sm text-neutral-700">Hidden</span>
            <Switch
              checked={Boolean(tool.hidden)}
              onCheckedChange={(checked) =>
                onUpdateTool(tool.id, { hidden: checked } as Partial<ToolNode>)
              }
            />
          </div>
          <Separator />
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-normal text-neutral-500">
              Grid area
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="Row start"
                value={tool.layout.gridArea.rowStart}
                onChange={(rowStart) =>
                  onUpdateTool(tool.id, {
                    layout: {
                      ...tool.layout,
                      gridArea: { ...tool.layout.gridArea, rowStart },
                    },
                  } as Partial<ToolNode>)
                }
              />
              <NumberInput
                label="Column start"
                value={tool.layout.gridArea.columnStart}
                onChange={(columnStart) =>
                  onUpdateTool(tool.id, {
                    layout: {
                      ...tool.layout,
                      gridArea: { ...tool.layout.gridArea, columnStart },
                    },
                  } as Partial<ToolNode>)
                }
              />
              <NumberInput
                label="Row end"
                value={tool.layout.gridArea.rowEnd}
                onChange={(rowEnd) =>
                  onUpdateTool(tool.id, {
                    layout: {
                      ...tool.layout,
                      gridArea: { ...tool.layout.gridArea, rowEnd },
                    },
                  } as Partial<ToolNode>)
                }
              />
              <NumberInput
                label="Column end"
                value={tool.layout.gridArea.columnEnd}
                onChange={(columnEnd) =>
                  onUpdateTool(tool.id, {
                    layout: {
                      ...tool.layout,
                      gridArea: { ...tool.layout.gridArea, columnEnd },
                    },
                  } as Partial<ToolNode>)
                }
              />
              <NumberInput
                label="Z index"
                value={tool.layout.zIndex}
                onChange={(zIndex) =>
                  onUpdateTool(tool.id, {
                    layout: { ...tool.layout, zIndex },
                  } as Partial<ToolNode>)
                }
              />
            </div>
          </div>
          <label className="space-y-1 text-xs font-medium text-neutral-600">
            <span>Class name</span>
            <Textarea
              value={getRootClassName(tool)}
              onChange={(event) =>
                onUpdateTool(
                  tool.id,
                  getRootClassNameChanges(tool, event.target.value),
                )
              }
            />
          </label>
          <Separator />
          <ToolPropsEditor tool={tool} onUpdateTool={onUpdateTool} />
          <Separator />
          <Button
            variant="danger"
            className="w-full"
            disabled={tool.locked}
            onClick={() => onRemoveTool(tool.id)}
          >
            Delete tool
          </Button>
          {tool.locked && (
            <p className="text-xs leading-5 text-neutral-500">
              Unlock this tool before deleting it.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

function SectionEditor({
  section,
  onUpdateSection,
}: {
  section?: SectionNode;
  onUpdateSection: (sectionId: string, changes: Partial<SectionNode>) => void;
}) {
  if (!section) {
    return (
      <div className="p-4 text-sm text-neutral-500">
        Select a section or tool to edit its settings.
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-auto p-4">
      <label className="space-y-1 text-xs font-medium text-neutral-600">
        <span>Section name</span>
        <Input
          value={section.name}
          onChange={(event) =>
            onUpdateSection(section.id, { name: event.target.value })
          }
        />
      </label>
      <Separator />
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-normal text-neutral-500">
          Grid
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Columns"
            value={section.grid.columns}
            onChange={(columns) =>
              onUpdateSection(section.id, {
                grid: { ...section.grid, columns },
              })
            }
          />
          <NumberInput
            label="Rows"
            value={section.grid.rows}
            onChange={(rows) =>
              onUpdateSection(section.id, {
                grid: { ...section.grid, rows },
              })
            }
          />
          <NumberInput
            label="Column gap"
            value={section.grid.columnGap}
            onChange={(columnGap) =>
              onUpdateSection(section.id, {
                grid: { ...section.grid, columnGap },
              })
            }
          />
          <NumberInput
            label="Row gap"
            value={section.grid.rowGap}
            onChange={(rowGap) =>
              onUpdateSection(section.id, {
                grid: { ...section.grid, rowGap },
              })
            }
          />
          <NumberInput
            label="Height"
            value={section.layout?.height ?? 680}
            onChange={(height) =>
              onUpdateSection(section.id, {
                layout: { ...section.layout, height },
              })
            }
          />
        </div>
      </div>
      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs leading-5 text-neutral-500">
        Mobile uses auto-stack for this MVP. Desktop and tablet share this grid.
      </div>
    </div>
  );
}

function ToolPropsEditor({
  tool,
  onUpdateTool,
}: {
  tool: ToolNode;
  onUpdateTool: (toolId: string, changes: Partial<ToolNode>) => void;
}) {
  if (tool.type === "text") {
    return (
      <label className="space-y-1 text-xs font-medium text-neutral-600">
        <span>Content</span>
        <Textarea
          value={tool.props.content}
          onChange={(event) =>
            onUpdateTool(tool.id, {
              props: { ...tool.props, content: event.target.value },
            } as Partial<ToolNode>)
          }
        />
      </label>
    );
  }

  if (tool.type === "button") {
    return (
      <label className="space-y-1 text-xs font-medium text-neutral-600">
        <span>Label</span>
        <Input
          value={tool.props.label}
          onChange={(event) =>
            onUpdateTool(tool.id, {
              props: { ...tool.props, label: event.target.value },
            } as Partial<ToolNode>)
          }
        />
      </label>
    );
  }

  if (tool.type === "image") {
    return (
      <div className="space-y-3">
        <label className="space-y-1 text-xs font-medium text-neutral-600">
          <span>Source</span>
          <Input
            value={tool.props.src}
            onChange={(event) =>
              onUpdateTool(tool.id, {
                props: { ...tool.props, src: event.target.value },
              } as Partial<ToolNode>)
            }
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-neutral-600">
          <span>Alt</span>
          <Input
            value={tool.props.alt ?? ""}
            onChange={(event) =>
              onUpdateTool(tool.id, {
                props: { ...tool.props, alt: event.target.value },
              } as Partial<ToolNode>)
            }
          />
        </label>
      </div>
    );
  }

  if (tool.type === "card") {
    return (
      <div className="space-y-3">
        <label className="space-y-1 text-xs font-medium text-neutral-600">
          <span>Title</span>
          <Input
            value={tool.props.title ?? ""}
            onChange={(event) =>
              onUpdateTool(tool.id, {
                props: { ...tool.props, title: event.target.value },
              } as Partial<ToolNode>)
            }
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-neutral-600">
          <span>Description</span>
          <Textarea
            value={tool.props.description ?? ""}
            onChange={(event) =>
              onUpdateTool(tool.id, {
                props: { ...tool.props, description: event.target.value },
              } as Partial<ToolNode>)
            }
          />
        </label>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-500">
      This tool type has no custom MVP inspector fields yet.
    </div>
  );
}
