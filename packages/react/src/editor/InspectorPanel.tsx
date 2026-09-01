import { useState, type ReactNode } from "react";
import { MIN_SECTION_HEIGHT } from "@designer-agent/site-contract";
import { Input } from "../ui/Input";
import { Separator } from "../ui/Separator";
import { Select } from "../ui/Select";
import { Switch } from "../ui/Switch";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { ICON_NAMES } from "../components/iconRegistry";
import { findSection, findTool } from "./pageDocument";
import { OverlayInspector } from "./OverlayInspector";
import {
  asEditorTool,
  type EditorToolNode,
  type PageDocument,
  type OverlayNode,
  type SectionNode,
  type ToolNode,
  type Viewport,
} from "./types";

type InspectorPanelProps = {
  page: PageDocument;
  pageBody: PageDocument;
  selectedSectionId: string;
  selectedToolId?: string;
  selectedOverlayId?: string;
  overlayBindingAllowed?: boolean;
  viewport: Viewport;
  onUpdateSection: (sectionId: string, changes: Partial<SectionNode>) => void;
  onUpdateTool: (toolId: string, changes: Partial<ToolNode>) => void;
  onRemoveTool: (toolId: string) => void;
  onRemoveSection: (sectionId: string) => void;
  onAddOverlay: (type: OverlayNode["type"], triggerToolId?: string) => string;
  onUpdateOverlay: (overlayId: string, changes: Partial<OverlayNode>) => void;
  onRemoveOverlay: (overlayId: string) => ToolNode[];
  onDuplicateOverlay: (overlayId: string) => string | undefined;
  onSelectOverlay: (overlayId: string) => void;
  onSelectTool: (toolId: string) => void;
  sectionDeleteDisabledReason?: string;
  editingDisabled?: boolean;
};

function NumberInput({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="x:space-y-1 x:text-xs x:font-medium x:text-neutral-600">
      <span>{label}</span>
      <Input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="x:space-y-1 x:text-xs x:font-medium x:text-neutral-600">
      <span>{label}</span>
      <Input
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="x:space-y-1 x:text-xs x:font-medium x:text-neutral-600">
      <span>{label}</span>
      <Textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function BooleanField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="x:flex x:items-center x:justify-between x:rounded-md x:border x:border-neutral-200 x:p-3">
      <span className="x:text-sm x:text-neutral-700">{label}</span>
      <Switch checked={Boolean(checked)} onCheckedChange={onChange} />
    </div>
  );
}

function SelectField<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: TValue;
  options: Array<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
}) {
  return (
    <label className="x:space-y-1 x:text-xs x:font-medium x:text-neutral-600">
      <span>{label}</span>
      <Select
        value={value ?? options[0]?.value}
        onChange={(event) => onChange(event.target.value as TValue)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

function PropsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="x:space-y-3">
      <div className="x:text-xs x:font-semibold x:uppercase x:tracking-normal x:text-neutral-500">
        {title}
      </div>
      {children}
    </div>
  );
}

function ClassNamesEditor({
  classNames,
  slots,
  onChange,
}: {
  classNames?: Record<string, string | undefined>;
  slots: string[];
  onChange: (classNames: Record<string, string | undefined>) => void;
}) {
  return (
    <PropsGroup title="Class names">
      {slots.map((slot) => (
        <TextareaField
          key={slot}
          label={slot}
          value={classNames?.[slot]}
          onChange={(value) =>
            onChange({
              ...classNames,
              [slot]: value,
            })
          }
        />
      ))}
    </PropsGroup>
  );
}

export function InspectorPanel({
  page,
  pageBody,
  selectedSectionId,
  selectedToolId,
  selectedOverlayId,
  overlayBindingAllowed = false,
  viewport,
  onUpdateSection,
  onUpdateTool,
  onRemoveTool,
  onRemoveSection,
  onAddOverlay,
  onUpdateOverlay,
  onRemoveOverlay,
  onDuplicateOverlay,
  onSelectOverlay,
  onSelectTool,
  sectionDeleteDisabledReason,
  editingDisabled = false,
}: InspectorPanelProps) {
  const tool = findTool(page, selectedToolId);
  const section = findSection(page, selectedSectionId);
  const overlay = (pageBody.overlays ?? []).find((item) => item.id === selectedOverlayId);

  return (
    <aside className="x:flex x:w-80 x:shrink-0 x:flex-col x:border-l x:border-neutral-200 x:bg-white">
      <div className="x:border-b x:border-neutral-200 x:p-4">
        <h2 className="x:text-sm x:font-semibold x:text-neutral-950">
          Inspector
        </h2>
        <p className="x:mt-1 x:text-xs x:text-neutral-500">
          Edit selected tool properties.
        </p>
      </div>
      <fieldset
        disabled={editingDisabled}
        aria-label={
          editingDisabled
            ? "Properties are read-only while AI is working"
            : undefined
        }
        className="x:flex x:min-h-0 x:flex-1 x:flex-col x:border-0 x:p-0 disabled:x:opacity-60"
      >
        {overlay ? (
          <OverlayInspector
            page={pageBody}
            overlay={overlay}
            onUpdate={onUpdateOverlay}
            onRemove={onRemoveOverlay}
            onDuplicate={onDuplicateOverlay}
            onSelectTool={onSelectTool}
          />
        ) : !tool ? (
          <SectionEditor
            section={section}
            viewport={viewport}
            onUpdateSection={onUpdateSection}
            onRemoveSection={onRemoveSection}
            deleteDisabledReason={sectionDeleteDisabledReason}
          />
        ) : (
          <div className="x:min-h-0 x:flex-1 x:space-y-5 x:overflow-auto x:p-4">
            <Field
              label="Tool name"
              value={tool.name}
              onChange={(name) => onUpdateTool(tool.id, { name })}
            />
            <div className="x:flex x:items-center x:justify-between x:rounded-md x:border x:border-neutral-200 x:p-3">
              <span className="x:text-sm x:text-neutral-700">Locked</span>
              <Switch
                checked={Boolean(tool.locked)}
                onCheckedChange={(checked) =>
                  onUpdateTool(tool.id, {
                    locked: checked,
                  } as Partial<ToolNode>)
                }
              />
            </div>
            <div className="x:flex x:items-center x:justify-between x:rounded-md x:border x:border-neutral-200 x:p-3">
              <span className="x:text-sm x:text-neutral-700">Hidden</span>
              <Switch
                checked={Boolean(tool.hidden)}
                onCheckedChange={(checked) =>
                  onUpdateTool(tool.id, {
                    hidden: checked,
                  } as Partial<ToolNode>)
                }
              />
            </div>
            <Separator />
            <div>
              <div className="x:mb-2 x:text-xs x:font-semibold x:uppercase x:tracking-normal x:text-neutral-500">
                Layer
              </div>
              <div className="x:grid x:grid-cols-1 x:gap-2">
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
            {tool.type === "button" && overlayBindingAllowed ? (
              <ButtonActionEditor
                page={pageBody}
                tool={tool}
                onUpdateTool={onUpdateTool}
                onAddOverlay={onAddOverlay}
                onSelectOverlay={onSelectOverlay}
              />
            ) : null}
            <ToolPropsEditor tool={tool} onUpdateTool={onUpdateTool} />
            <Separator />
            <Button
              variant="danger"
              className="x:w-full"
              onClick={() => onRemoveTool(tool.id)}
            >
              Delete tool
            </Button>
          </div>
        )}
      </fieldset>
    </aside>
  );
}

function ButtonActionEditor({
  page,
  tool,
  onUpdateTool,
  onAddOverlay,
  onSelectOverlay,
}: {
  page: PageDocument;
  tool: ToolNode;
  onUpdateTool: (toolId: string, changes: Partial<ToolNode>) => void;
  onAddOverlay: (type: OverlayNode["type"], triggerToolId?: string) => string;
  onSelectOverlay: (overlayId: string) => void;
}) {
  const props = tool.props as Record<string, unknown>;
  const action = props.action as { type?: string; targetId?: string; href?: string; target?: string } | undefined;
  const actionType = action?.type ?? (typeof props.href === "string" && props.href ? "link" : "none");
  const targetId = action?.type === "overlay" ? action.targetId : undefined;
  const targetExists = targetId ? (page.overlays ?? []).some((overlay) => overlay.id === targetId) : true;
  const [overlayQuery, setOverlayQuery] = useState("");
  const normalizedQuery = overlayQuery.trim().toLowerCase();
  const updateAction = (nextAction: Record<string, unknown>) => {
    onUpdateTool(tool.id, {
      props: {
        ...props,
        href: undefined,
        action: nextAction,
      },
    } as Partial<ToolNode>);
  };

  return (
    <PropsGroup title="Click action">
      <SelectField
        label="Action"
        value={actionType as "none" | "link" | "overlay" | "submit"}
        options={[
          { value: "none", label: "None" },
          { value: "link", label: "Link" },
          { value: "overlay", label: "Open overlay" },
          { value: "submit", label: "Submit" },
        ]}
        onChange={(type) => {
          if (type === "link") updateAction({ type, href: action?.href ?? "" });
          else if (type === "overlay") {
            const firstOverlay = (page.overlays ?? [])[0];
            if (firstOverlay) updateAction({ type, targetId: firstOverlay.id });
            else onAddOverlay("dialog", tool.id);
          }
          else updateAction({ type });
        }}
      />
      {actionType === "link" ? (
        <>
          <Field label="Link URL" value={action?.href ?? String(props.href ?? "")} onChange={(href) => updateAction({ type: "link", href, ...(action?.target ? { target: action.target } : {}) })} />
          <SelectField
            label="Target"
            value={(action?.target ?? "") as "" | "_self" | "_blank" | "_parent" | "_top"}
            options={[
              { value: "", label: "same window" },
              { value: "_self", label: "_self" },
              { value: "_blank", label: "_blank" },
              { value: "_parent", label: "_parent" },
              { value: "_top", label: "_top" },
            ]}
            onChange={(target) => updateAction({ type: "link", href: action?.href ?? "", ...(target ? { target } : {}) })}
          />
        </>
      ) : null}
      {actionType === "overlay" ? (
        <>
          <label className="x:space-y-1 x:text-xs x:font-medium x:text-neutral-600">
            <span>Search target</span>
            <Input value={overlayQuery} placeholder="Search overlays" onChange={(event) => setOverlayQuery(event.target.value)} />
          </label>
          <label className="x:space-y-1 x:text-xs x:font-medium x:text-neutral-600">
            <span>Target overlay</span>
            <Select value={targetId ?? ""} onChange={(event) => updateAction({ type: "overlay", targetId: event.target.value })}>
              <option value="">Select an overlay</option>
              {(["dialog", "alert-dialog", "toast", "drawer"] as OverlayNode["type"][]).map((type) => {
                const overlays = (page.overlays ?? []).filter((overlay) => overlay.type === type && (!normalizedQuery || overlay.name.toLowerCase().includes(normalizedQuery)));
                return overlays.length > 0 ? (
                  <optgroup key={type} label={type.replace("-", " ")}>
                    {overlays.map((overlay) => <option key={overlay.id} value={overlay.id}>{overlay.name}</option>)}
                  </optgroup>
                ) : null;
              })}
            </Select>
          </label>
          {!targetExists || !targetId ? <p className="x:rounded-md x:bg-red-50 x:p-2 x:text-xs x:text-red-700">The target overlay does not exist.</p> : null}
          <div className="x:flex x:flex-wrap x:gap-2">
            {targetId && targetExists ? <Button size="sm" variant="outline" onClick={() => onSelectOverlay(targetId)}>Edit target</Button> : null}
            {(["dialog", "alert-dialog", "toast", "drawer"] as OverlayNode["type"][]).map((type) => (
              <Button key={type} size="sm" variant="ghost" onClick={() => onAddOverlay(type, tool.id)}>+ {type.replace("-", " ")}</Button>
            ))}
          </div>
        </>
      ) : null}
    </PropsGroup>
  );
}

function SectionEditor({
  section,
  viewport,
  onUpdateSection,
  onRemoveSection,
  deleteDisabledReason,
}: {
  section?: SectionNode;
  viewport: Viewport;
  onUpdateSection: (sectionId: string, changes: Partial<SectionNode>) => void;
  onRemoveSection: (sectionId: string) => void;
  deleteDisabledReason?: string;
}) {
  if (!section) {
    return (
      <div className="x:p-4 x:text-sm x:text-neutral-500">
        Select a section or tool to edit its settings.
      </div>
    );
  }

  const activeGrid = getActiveSectionGrid(section, viewport);
  const updateGridValue = (
    key: "columns" | "rows" | "height" | "columnGap" | "rowGap",
    value: number,
  ) => {
    onUpdateSection(
      section.id,
      getSectionGridChange(section, viewport, key, value),
    );
  };

  return (
    <div className="x:min-h-0 x:flex-1 x:space-y-5 x:overflow-auto x:p-4">
      <label className="x:space-y-1 x:text-xs x:font-medium x:text-neutral-600">
        <span>Section name</span>
        <Input
          value={section.name}
          onChange={(event) =>
            onUpdateSection(section.id, { name: event.target.value })
          }
        />
      </label>
      <Field
        label="className"
        value={section.props?.className}
        onChange={(className) =>
          onUpdateSection(section.id, {
            props: {
              ...section.props,
              className,
            },
          })
        }
      />
      <Separator />
      <div>
        <div className="x:mb-2 x:flex x:items-center x:justify-between">
          <div className="x:text-xs x:font-semibold x:uppercase x:tracking-normal x:text-neutral-500">
            Grid
          </div>
          <div className="x:rounded-full x:bg-neutral-100 x:px-2 x:py-0.5 x:text-[10px] x:font-medium x:capitalize x:text-neutral-500">
            {viewport}
          </div>
        </div>
        <div className="x:grid x:grid-cols-2 x:gap-2">
          <NumberInput
            label="Columns"
            value={activeGrid.columns}
            onChange={(columns) => updateGridValue("columns", columns)}
          />
          <NumberInput
            label="Rows"
            value={activeGrid.rows}
            onChange={(rows) => updateGridValue("rows", rows)}
          />
          <NumberInput
            label="Height"
            min={MIN_SECTION_HEIGHT}
            value={activeGrid.height ?? 720}
            onChange={(height) =>
              updateGridValue("height", Math.max(MIN_SECTION_HEIGHT, height))
            }
          />
          <NumberInput
            label="Column gap"
            value={activeGrid.columnGap}
            onChange={(columnGap) => updateGridValue("columnGap", columnGap)}
          />
          <NumberInput
            label="Row gap"
            value={activeGrid.rowGap}
            onChange={(rowGap) => updateGridValue("rowGap", rowGap)}
          />
        </div>
      </div>
      <div className="x:rounded-md x:border x:border-neutral-200 x:bg-neutral-50 x:p-3 x:text-xs x:leading-5 x:text-neutral-500">
        Grid values are saved per viewport. Desktop edits the base grid; tablet
        and mobile edits are stored as responsive overrides.
      </div>
      <Separator />
      <Button
        variant="danger"
        className="x:w-full"
        disabled={Boolean(deleteDisabledReason)}
        title={deleteDisabledReason}
        onClick={() => onRemoveSection(section.id)}
      >
        Delete section
      </Button>
      {deleteDisabledReason ? (
        <p className="x:text-xs x:leading-5 x:text-neutral-500">
          {deleteDisabledReason}
        </p>
      ) : null}
    </div>
  );
}

function getActiveSectionGrid(section: SectionNode, viewport: Viewport) {
  if (viewport === "desktop") {
    return section.grid;
  }

  if (viewport === "tablet") {
    return {
      ...section.grid,
      ...section.grid.responsive?.tablet,
    };
  }

  return {
    ...section.grid,
    ...section.grid.responsive?.tablet,
    ...section.grid.responsive?.mobile,
  };
}

function getSectionGridChange(
  section: SectionNode,
  viewport: Viewport,
  key: "columns" | "rows" | "height" | "columnGap" | "rowGap",
  value: number,
): Partial<SectionNode> {
  if (viewport === "desktop") {
    return {
      grid: {
        ...section.grid,
        [key]: value,
      },
    };
  }

  const breakpoint = viewport === "tablet" ? "tablet" : "mobile";

  return {
    grid: {
      ...section.grid,
      responsive: {
        ...section.grid.responsive,
        [breakpoint]: {
          ...section.grid.responsive?.[breakpoint],
          [key]: value,
        },
      },
    },
  };
}

function ToolPropsEditor({
  tool,
  onUpdateTool,
}: {
  tool: ToolNode;
  onUpdateTool: (toolId: string, changes: Partial<ToolNode>) => void;
}) {
  const editorTool = asEditorTool(tool);
  const updateProps = (props: ToolNode["props"]) => {
    onUpdateTool(tool.id, { props } as Partial<ToolNode>);
  };

  return renderToolPropsEditor(editorTool, updateProps);
}

function renderToolPropsEditor(
  tool: EditorToolNode,
  updateProps: (props: ToolNode["props"]) => void,
) {
  if (tool.type === "avatar") {
    return (
      <div className="x:space-y-5">
        <PropsGroup title="Avatar props">
          <Field
            label="src"
            value={tool.props.src}
            onChange={(src) => updateProps({ ...tool.props, src })}
          />
          <Field
            label="alt"
            value={tool.props.alt}
            onChange={(alt) => updateProps({ ...tool.props, alt })}
          />
          <Field
            label="fallback"
            value={tool.props.fallback}
            onChange={(fallback) => updateProps({ ...tool.props, fallback })}
          />
        </PropsGroup>
        <ClassNamesEditor
          classNames={tool.props.classNames}
          slots={["avatar", "avatar-image", "avatar-fallback"]}
          onChange={(classNames) => updateProps({ ...tool.props, classNames })}
        />
      </div>
    );
  }

  if (tool.type === "badge") {
    return (
      <div className="x:space-y-5">
        <PropsGroup title="Badge props">
          <Field
            label="label"
            value={tool.props.label}
            onChange={(label) => updateProps({ ...tool.props, label })}
          />
          <Field
            label="href"
            value={tool.props.href}
            onChange={(href) => updateProps({ ...tool.props, href })}
          />
          <TextareaField
            label="className"
            value={tool.props.className}
            onChange={(className) => updateProps({ ...tool.props, className })}
          />
        </PropsGroup>
      </div>
    );
  }

  if (tool.type === "input") {
    return (
      <div className="x:space-y-5">
        <PropsGroup title="Input props">
          <Field
            label="label"
            value={tool.props.label}
            onChange={(label) => updateProps({ ...tool.props, label })}
          />
          <Field
            label="name"
            value={tool.props.name}
            onChange={(name) => updateProps({ ...tool.props, name })}
          />
          <SelectField
            label="type"
            value={tool.props.type ?? "text"}
            options={[
              { value: "text", label: "text" },
              { value: "email", label: "email" },
              { value: "tel", label: "tel" },
              { value: "url", label: "url" },
              { value: "search", label: "search" },
              { value: "password", label: "password" },
              { value: "number", label: "number" },
            ]}
            onChange={(type) => updateProps({ ...tool.props, type })}
          />
          <BooleanField
            label="disabled"
            checked={tool.props.disabled}
            onChange={(disabled) => updateProps({ ...tool.props, disabled })}
          />
          <Field
            label="placeholder"
            value={tool.props.placeholder}
            onChange={(placeholder) =>
              updateProps({ ...tool.props, placeholder })
            }
          />
          <Field
            label="defaultValue"
            value={tool.props.defaultValue}
            onChange={(defaultValue) =>
              updateProps({ ...tool.props, defaultValue })
            }
          />
          <Field
            label="autoComplete"
            value={tool.props.autoComplete}
            onChange={(autoComplete) =>
              updateProps({ ...tool.props, autoComplete })
            }
          />
          <TextareaField
            label="description"
            value={tool.props.description}
            onChange={(description) =>
              updateProps({ ...tool.props, description })
            }
          />
          <TextareaField
            label="error"
            value={tool.props.error}
            onChange={(error) => updateProps({ ...tool.props, error })}
          />
          <BooleanField
            label="required"
            checked={tool.props.required}
            onChange={(required) => updateProps({ ...tool.props, required })}
          />
          <BooleanField
            label="disabled"
            checked={tool.props.disabled}
            onChange={(disabled) => updateProps({ ...tool.props, disabled })}
          />
        </PropsGroup>
        <ClassNamesEditor
          classNames={tool.props.classNames}
          slots={[
            "input",
            "input-label",
            "input-control",
            "input-description",
            "input-error",
          ]}
          onChange={(classNames) => updateProps({ ...tool.props, classNames })}
        />
      </div>
    );
  }

  if (tool.type === "list") {
    const items = tool.props.items ?? [];

    return (
      <div className="x:space-y-5">
        <PropsGroup title="List props">
          <BooleanField
            label="ordered"
            checked={tool.props.ordered}
            onChange={(ordered) => updateProps({ ...tool.props, ordered })}
          />
          <SelectField
            label="marker"
            value={tool.props.marker ?? "default"}
            options={[
              { value: "default", label: "default" },
              { value: "check", label: "check" },
              { value: "none", label: "none" },
            ]}
            onChange={(marker) => updateProps({ ...tool.props, marker })}
          />
        </PropsGroup>
        <PropsGroup title="Items">
          {items.map((item, index) => (
            <div
              key={`${item.key}-${index}`}
              className="x:space-y-3 x:rounded-md x:border x:border-neutral-200 x:p-3"
            >
              <Field
                label="key"
                value={item.key}
                onChange={(key) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, key };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <Field
                label="title"
                value={item.title}
                onChange={(title) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, title };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <TextareaField
                label="description"
                value={item.description}
                onChange={(description) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, description };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <Field
                label="href"
                value={item.href}
                onChange={(href) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, href };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateProps({
                    ...tool.props,
                    items: items.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                Remove item
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              updateProps({
                ...tool.props,
                items: [
                  ...items,
                  {
                    key: `item-${items.length + 1}`,
                    title: "Item title",
                    description: "Item description",
                  },
                ],
              })
            }
          >
            Add item
          </Button>
        </PropsGroup>
        <ClassNamesEditor
          classNames={tool.props.classNames}
          slots={[
            "list",
            "list-item",
            "list-marker",
            "list-content",
            "list-title",
            "list-description",
          ]}
          onChange={(classNames) => updateProps({ ...tool.props, classNames })}
        />
      </div>
    );
  }

  if (tool.type === "newsletter") {
    return (
      <div className="x:space-y-5">
        <PropsGroup title="Newsletter props">
          <Field
            label="title"
            value={tool.props.title}
            onChange={(title) => updateProps({ ...tool.props, title })}
          />
          <TextareaField
            label="description"
            value={tool.props.description}
            onChange={(description) =>
              updateProps({ ...tool.props, description })
            }
          />
          <Field
            label="emailLabel"
            value={tool.props.emailLabel}
            onChange={(emailLabel) =>
              updateProps({ ...tool.props, emailLabel })
            }
          />
          <Field
            label="emailPlaceholder"
            value={tool.props.emailPlaceholder}
            onChange={(emailPlaceholder) =>
              updateProps({ ...tool.props, emailPlaceholder })
            }
          />
          <Field
            label="buttonLabel"
            value={tool.props.buttonLabel}
            onChange={(buttonLabel) =>
              updateProps({ ...tool.props, buttonLabel })
            }
          />
          <TextareaField
            label="privacyText"
            value={tool.props.privacyText}
            onChange={(privacyText) =>
              updateProps({ ...tool.props, privacyText })
            }
          />
          <Field
            label="action"
            value={tool.props.action}
            onChange={(action) => updateProps({ ...tool.props, action })}
          />
          <SelectField
            label="method"
            value={tool.props.method ?? "post"}
            options={[
              { value: "get", label: "get" },
              { value: "post", label: "post" },
            ]}
            onChange={(method) => updateProps({ ...tool.props, method })}
          />
        </PropsGroup>
        <ClassNamesEditor
          classNames={tool.props.classNames}
          slots={[
            "newsletter",
            "newsletter-title",
            "newsletter-description",
            "newsletter-form",
            "newsletter-field",
            "newsletter-label",
            "newsletter-input",
            "newsletter-button",
            "newsletter-privacy",
          ]}
          onChange={(classNames) => updateProps({ ...tool.props, classNames })}
        />
      </div>
    );
  }

  if (tool.type === "text") {
    return (
      <div className="x:space-y-5">
        <PropsGroup title="Text props">
          <TextareaField
            label="content"
            value={tool.props.content}
            onChange={(content) => updateProps({ ...tool.props, content })}
          />
          <TextareaField
            label="className"
            value={tool.props.className}
            onChange={(className) => updateProps({ ...tool.props, className })}
          />
        </PropsGroup>
      </div>
    );
  }

  if (tool.type === "image") {
    return (
      <div className="x:space-y-5">
        <PropsGroup title="Image props">
          <Field
            label="src"
            value={tool.props.src}
            onChange={(src) => updateProps({ ...tool.props, src })}
          />
          <Field
            label="alt"
            value={tool.props.alt}
            onChange={(alt) => updateProps({ ...tool.props, alt })}
          />
          <TextareaField
            label="className"
            value={tool.props.className}
            onChange={(className) => updateProps({ ...tool.props, className })}
          />
        </PropsGroup>
      </div>
    );
  }

  if (tool.type === "button") {
    return (
      <div className="x:space-y-5">
        <PropsGroup title="Button props">
          <Field
            label="label"
            value={tool.props.label}
            onChange={(label) => updateProps({ ...tool.props, label })}
          />
          <Field
            label="rel"
            value={tool.props.rel}
            onChange={(rel) => updateProps({ ...tool.props, rel })}
          />
          <Field
            label="download (true or filename)"
            value={
              typeof tool.props.download === "string"
                ? tool.props.download
                : tool.props.download
                  ? "true"
                  : ""
            }
            onChange={(download) =>
              updateProps({
                ...tool.props,
                download: download === "true" ? true : download || undefined,
              })
            }
          />
          <SelectField
            label="type"
            value={tool.props.type ?? "button"}
            options={[
              { value: "button", label: "button" },
              { value: "submit", label: "submit" },
              { value: "reset", label: "reset" },
            ]}
            onChange={(type) => updateProps({ ...tool.props, type })}
          />
          <BooleanField
            label="disabled"
            checked={tool.props.disabled}
            onChange={(disabled) => updateProps({ ...tool.props, disabled })}
          />
          <Field
            label="ariaLabel"
            value={tool.props.ariaLabel}
            onChange={(ariaLabel) => updateProps({ ...tool.props, ariaLabel })}
          />
          <SelectField
            label="startIcon"
            value={tool.props.startIcon ?? ""}
            options={[
              { value: "", label: "none" },
              ...ICON_NAMES.map((name) => ({ value: name, label: name })),
            ]}
            onChange={(startIcon) =>
              updateProps({
                ...tool.props,
                startIcon: startIcon || undefined,
              })
            }
          />
          <SelectField
            label="endIcon"
            value={tool.props.endIcon ?? ""}
            options={[
              { value: "", label: "none" },
              ...ICON_NAMES.map((name) => ({ value: name, label: name })),
            ]}
            onChange={(endIcon) =>
              updateProps({
                ...tool.props,
                endIcon: endIcon || undefined,
              })
            }
          />
          <TextareaField
            label="start-icon className"
            value={tool.props.classNames?.["start-icon"]}
            onChange={(className) =>
              updateProps({
                ...tool.props,
                classNames: {
                  ...tool.props.classNames,
                  "start-icon": className,
                },
              })
            }
          />
          <TextareaField
            label="end-icon className"
            value={tool.props.classNames?.["end-icon"]}
            onChange={(className) =>
              updateProps({
                ...tool.props,
                classNames: {
                  ...tool.props.classNames,
                  "end-icon": className,
                },
              })
            }
          />
          <TextareaField
            label="className"
            value={tool.props.className}
            onChange={(className) => updateProps({ ...tool.props, className })}
          />
        </PropsGroup>
      </div>
    );
  }

  if (tool.type === "icon") {
    return (
      <div className="x:space-y-5">
        <PropsGroup title="Icon props">
          <SelectField
            label="name"
            value={tool.props.name}
            options={ICON_NAMES.map((name) => ({ value: name, label: name }))}
            onChange={(name) => updateProps({ ...tool.props, name })}
          />
          <NumberInput
            label="size"
            value={typeof tool.props.size === "number" ? tool.props.size : 24}
            onChange={(size) => updateProps({ ...tool.props, size })}
          />
          <NumberInput
            label="strokeWidth"
            value={tool.props.strokeWidth ?? 2}
            onChange={(strokeWidth) =>
              updateProps({ ...tool.props, strokeWidth })
            }
          />
          <Field
            label="ariaLabel"
            value={tool.props.ariaLabel}
            onChange={(ariaLabel) => updateProps({ ...tool.props, ariaLabel })}
          />
          <TextareaField
            label="className"
            value={tool.props.className}
            onChange={(className) => updateProps({ ...tool.props, className })}
          />
        </PropsGroup>
      </div>
    );
  }

  if (tool.type === "divider") {
    return (
      <div className="x:space-y-5">
        <PropsGroup title="Divider props">
          <SelectField
            label="orientation"
            value={tool.props.orientation ?? "horizontal"}
            options={[
              { value: "horizontal", label: "horizontal" },
              { value: "vertical", label: "vertical" },
            ]}
            onChange={(orientation) =>
              updateProps({ ...tool.props, orientation })
            }
          />
          <TextareaField
            label="className"
            value={tool.props.className}
            onChange={(className) => updateProps({ ...tool.props, className })}
          />
        </PropsGroup>
      </div>
    );
  }

  if (tool.type === "card") {
    return (
      <div className="x:space-y-5">
        <PropsGroup title="Card props">
          <Field
            label="imgSrc"
            value={tool.props.imgSrc}
            onChange={(imgSrc) => updateProps({ ...tool.props, imgSrc })}
          />
          <Field
            label="imgAlt"
            value={tool.props.imgAlt}
            onChange={(imgAlt) => updateProps({ ...tool.props, imgAlt })}
          />
          <Field
            label="title"
            value={tool.props.title}
            onChange={(title) => updateProps({ ...tool.props, title })}
          />
          <TextareaField
            label="description"
            value={tool.props.description}
            onChange={(description) =>
              updateProps({ ...tool.props, description })
            }
          />
          <TextareaField
            label="content"
            value={tool.props.content}
            onChange={(content) => updateProps({ ...tool.props, content })}
          />
          <Field
            label="buttonLabel"
            value={tool.props.buttonLabel}
            onChange={(buttonLabel) =>
              updateProps({ ...tool.props, buttonLabel })
            }
          />
          <Field
            label="buttonHref"
            value={tool.props.buttonHref}
            onChange={(buttonHref) =>
              updateProps({ ...tool.props, buttonHref })
            }
          />
        </PropsGroup>
        <ClassNamesEditor
          classNames={tool.props.classNames}
          slots={[
            "card",
            "card-img",
            "card-header",
            "card-title",
            "card-description",
            "card-content",
            "card-footer",
            "card-action",
          ]}
          onChange={(classNames) => updateProps({ ...tool.props, classNames })}
        />
      </div>
    );
  }

  if (tool.type === "accordion") {
    const items = tool.props.items ?? [];

    return (
      <div className="x:space-y-5">
        <PropsGroup title="Accordion props">
          <BooleanField
            label="disabled"
            checked={tool.props.disabled}
            onChange={(disabled) => updateProps({ ...tool.props, disabled })}
          />
          <BooleanField
            label="hiddenUntilFound"
            checked={tool.props.hiddenUntilFound}
            onChange={(hiddenUntilFound) =>
              updateProps({ ...tool.props, hiddenUntilFound })
            }
          />
          <BooleanField
            label="keepMounted"
            checked={tool.props.keepMounted}
            onChange={(keepMounted) =>
              updateProps({ ...tool.props, keepMounted })
            }
          />
          <BooleanField
            label="multiple"
            checked={tool.props.multiple}
            onChange={(multiple) => updateProps({ ...tool.props, multiple })}
          />
        </PropsGroup>
        <PropsGroup title="Items">
          {items.map((item, index) => (
            <div
              key={`${item.key}-${index}`}
              className="x:space-y-3 x:rounded-md x:border x:border-neutral-200 x:p-3"
            >
              <Field
                label="key"
                value={item.key}
                onChange={(key) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, key };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <Field
                label="title"
                value={item.title}
                onChange={(title) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, title };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <TextareaField
                label="content"
                value={item.content}
                onChange={(content) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, content };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateProps({
                    ...tool.props,
                    items: items.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                Remove item
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              updateProps({
                ...tool.props,
                items: [
                  ...items,
                  {
                    key: `item-${items.length + 1}`,
                    title: "Item title",
                    content: "Item content",
                  },
                ],
              })
            }
          >
            Add item
          </Button>
        </PropsGroup>
        <ClassNamesEditor
          classNames={tool.props.classNames}
          slots={[
            "accordion",
            "accordion-item",
            "accordion-trigger",
            "accordion-panel",
            "accordion-content",
            "accordion-indicator",
          ]}
          onChange={(classNames) => updateProps({ ...tool.props, classNames })}
        />
      </div>
    );
  }

  if (tool.type === "carousel") {
    const items = tool.props.items ?? [];

    return (
      <div className="x:space-y-5">
        <PropsGroup title="Items">
          {items.map((item, index) => (
            <div
              key={`${item.imgSrc}-${index}`}
              className="x:space-y-3 x:rounded-md x:border x:border-neutral-200 x:p-3"
            >
              <Field
                label="imgSrc"
                value={item.imgSrc}
                onChange={(imgSrc) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, imgSrc };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <Field
                label="imgAlt"
                value={item.imgAlt}
                onChange={(imgAlt) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, imgAlt };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <Field
                label="title"
                value={item.title}
                onChange={(title) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, title };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <TextareaField
                label="description"
                value={item.description}
                onChange={(description) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, description };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateProps({
                    ...tool.props,
                    items: items.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                Remove item
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              updateProps({
                ...tool.props,
                items: [
                  ...items,
                  {
                    imgSrc: "",
                    imgAlt: "",
                    title: "Slide title",
                    description: "Slide description",
                  },
                ],
              })
            }
          >
            Add item
          </Button>
        </PropsGroup>
        <ClassNamesEditor
          classNames={tool.props.classNames}
          slots={[
            "carousel",
            "carousel-content",
            "carousel-previous",
            "carousel-next",
            "carousel-item",
            "carousel-item-img",
            "carousel-item-title",
            "carousel-item-description",
          ]}
          onChange={(classNames) => updateProps({ ...tool.props, classNames })}
        />
      </div>
    );
  }

  if (tool.type === "contact") {
    return (
      <div className="x:space-y-5">
        <PropsGroup title="Labels">
          <Field
            label="name"
            value={tool.props.labels?.name}
            onChange={(name) =>
              updateProps({
                ...tool.props,
                labels: { ...tool.props.labels, name },
              })
            }
          />
          <Field
            label="email"
            value={tool.props.labels?.email}
            onChange={(email) =>
              updateProps({
                ...tool.props,
                labels: { ...tool.props.labels, email },
              })
            }
          />
          <Field
            label="message"
            value={tool.props.labels?.message}
            onChange={(message) =>
              updateProps({
                ...tool.props,
                labels: { ...tool.props.labels, message },
              })
            }
          />
        </PropsGroup>
        <PropsGroup title="Placeholders">
          <Field
            label="name"
            value={tool.props.placeholders?.name}
            onChange={(name) =>
              updateProps({
                ...tool.props,
                placeholders: { ...tool.props.placeholders, name },
              })
            }
          />
          <Field
            label="email"
            value={tool.props.placeholders?.email}
            onChange={(email) =>
              updateProps({
                ...tool.props,
                placeholders: { ...tool.props.placeholders, email },
              })
            }
          />
          <Field
            label="message"
            value={tool.props.placeholders?.message}
            onChange={(message) =>
              updateProps({
                ...tool.props,
                placeholders: { ...tool.props.placeholders, message },
              })
            }
          />
        </PropsGroup>
        <PropsGroup title="Contact props">
          <Field
            label="buttonLabel"
            value={tool.props.buttonLabel}
            onChange={(buttonLabel) =>
              updateProps({ ...tool.props, buttonLabel })
            }
          />
        </PropsGroup>
        <ClassNamesEditor
          classNames={tool.props.classNames}
          slots={[
            "contact",
            "contact-field",
            "contact-input",
            "contact-textarea",
            "contact-button",
            "contact-field-group",
            "contact-field-label",
          ]}
          onChange={(classNames) => updateProps({ ...tool.props, classNames })}
        />
      </div>
    );
  }

  if (tool.type === "navbar") {
    const siteBound = tool.siteBinding?.kind === "site-navigation";
    const items = tool.props.items ?? [];
    const iconAction = (
      key: "primaryAction" | "secondaryAction",
      label: string,
    ) => (
      <div className="x:space-y-3 x:rounded-md x:border x:border-neutral-200 x:p-3">
        <div className="x:text-xs x:font-medium x:text-neutral-500">
          {label}
        </div>
        <Field
          label="label"
          value={tool.props[key]?.label}
          onChange={(actionLabel) =>
            updateProps({
              ...tool.props,
              [key]: { ...tool.props[key], label: actionLabel },
            })
          }
        />
        <Field
          label="href"
          value={tool.props[key]?.href}
          onChange={(href) =>
            updateProps({
              ...tool.props,
              [key]: { ...tool.props[key], href },
            })
          }
        />
      </div>
    );

    return (
      <div className="x:space-y-5">
        <PropsGroup title="Navbar props">
          <Field
            label="brand"
            value={tool.props.brand}
            onChange={(brand) => updateProps({ ...tool.props, brand })}
          />
          <Field
            label="logoSrc"
            value={tool.props.logoSrc}
            onChange={(logoSrc) => updateProps({ ...tool.props, logoSrc })}
          />
          <Field
            label="logoAlt"
            value={tool.props.logoAlt}
            onChange={(logoAlt) => updateProps({ ...tool.props, logoAlt })}
          />
          <BooleanField
            label="x:sticky"
            checked={tool.props.sticky}
            onChange={(sticky) => updateProps({ ...tool.props, sticky })}
          />
          <BooleanField
            label="showMobileMenu"
            checked={tool.props.showMobileMenu}
            onChange={(showMobileMenu) =>
              updateProps({ ...tool.props, showMobileMenu })
            }
          />
        </PropsGroup>
        {siteBound ? (
          <p className="x:rounded-md x:bg-blue-50 x:p-3 x:text-xs x:leading-5 x:text-blue-700">
            Navigation items, links, active state, and actions are managed
            globally by Site Navigation.
          </p>
        ) : (
          <PropsGroup title="Items">
            {items.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="x:space-y-3 x:rounded-md x:border x:border-neutral-200 x:p-3"
              >
                <Field
                  label="label"
                  value={item.label}
                  onChange={(label) => {
                    const nextItems = [...items];
                    nextItems[index] = { ...item, label };
                    updateProps({ ...tool.props, items: nextItems });
                  }}
                />
                <Field
                  label="href"
                  value={item.href}
                  onChange={(href) => {
                    const nextItems = [...items];
                    nextItems[index] = { ...item, href };
                    updateProps({ ...tool.props, items: nextItems });
                  }}
                />
                <BooleanField
                  label="active"
                  checked={item.active}
                  onChange={(active) => {
                    const nextItems = [...items];
                    nextItems[index] = { ...item, active };
                    updateProps({ ...tool.props, items: nextItems });
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateProps({
                      ...tool.props,
                      items: items.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  Remove item
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateProps({
                  ...tool.props,
                  items: [...items, { label: "Nav item", href: "#" }],
                })
              }
            >
              Add item
            </Button>
          </PropsGroup>
        )}
        {!siteBound ? (
          <PropsGroup title="Actions">
            {iconAction("primaryAction", "primaryAction")}
            {iconAction("secondaryAction", "secondaryAction")}
          </PropsGroup>
        ) : null}
        <ClassNamesEditor
          classNames={tool.props.classNames}
          slots={[
            "navbar",
            "navbar-inner",
            "navbar-logo",
            "navbar-brand",
            "navbar-nav-list",
            "navbar-nav-item",
            "navbar-active-nav-item",
            "navbar-actions",
            "navbar-primary-action",
            "navbar-secondary-action",
            "navbar-mobile-toggle",
            "navbar-mobile-panel",
          ]}
          onChange={(classNames) => updateProps({ ...tool.props, classNames })}
        />
      </div>
    );
  }

  if (tool.type === "social") {
    const items = tool.props.items ?? [];
    const iconOptions = [
      "facebook",
      "twitter",
      "linkedin",
      "github",
      "instagram",
      "x",
    ] as const;

    return (
      <div className="x:space-y-5">
        <PropsGroup title="Items">
          {items.map((item, index) => (
            <div
              key={`${item.icon}-${index}`}
              className="x:space-y-3 x:rounded-md x:border x:border-neutral-200 x:p-3"
            >
              <Field
                label="href"
                value={item.href}
                onChange={(href) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, href };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <SelectField
                label="icon"
                value={item.icon}
                options={iconOptions.map((icon) => ({
                  value: icon,
                  label: icon,
                }))}
                onChange={(icon) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, icon };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateProps({
                    ...tool.props,
                    items: items.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                Remove item
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              updateProps({
                ...tool.props,
                items: [...items, { icon: "github", href: "#" }],
              })
            }
          >
            Add item
          </Button>
        </PropsGroup>
        <ClassNamesEditor
          classNames={tool.props.classNames}
          slots={["social", "social-item"]}
          onChange={(classNames) => updateProps({ ...tool.props, classNames })}
        />
      </div>
    );
  }

  if (tool.type === "tabs") {
    const items = tool.props.items ?? [];

    return (
      <div className="x:space-y-5">
        <PropsGroup title="Tabs props">
          <SelectField
            label="orientation"
            value={tool.props.orientation ?? "horizontal"}
            options={[
              { value: "horizontal", label: "horizontal" },
              { value: "vertical", label: "vertical" },
            ]}
            onChange={(orientation) =>
              updateProps({ ...tool.props, orientation })
            }
          />
        </PropsGroup>
        <PropsGroup title="Items">
          {items.map((item, index) => (
            <div
              key={`${item.key}-${index}`}
              className="x:space-y-3 x:rounded-md x:border x:border-neutral-200 x:p-3"
            >
              <Field
                label="key"
                value={item.key}
                onChange={(key) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, key };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <Field
                label="title"
                value={item.title}
                onChange={(title) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, title };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <TextareaField
                label="content"
                value={item.content}
                onChange={(content) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...item, content };
                  updateProps({ ...tool.props, items: nextItems });
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateProps({
                    ...tool.props,
                    items: items.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                Remove item
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              updateProps({
                ...tool.props,
                items: [
                  ...items,
                  {
                    key: `tab-${items.length + 1}`,
                    title: "Tab title",
                    content: "Tab content",
                  },
                ],
              })
            }
          >
            Add item
          </Button>
        </PropsGroup>
        <ClassNamesEditor
          classNames={tool.props.classNames}
          slots={["tabs", "tabs-list", "tabs-tab", "tabs-content"]}
          onChange={(classNames) => updateProps({ ...tool.props, classNames })}
        />
      </div>
    );
  }

  if (tool.type === "custom") {
    return (
      <div className="x:space-y-5">
        <PropsGroup title="Custom props">
          <Field
            label="componentName"
            value={tool.props.componentName}
            onChange={(componentName) =>
              updateProps({ ...tool.props, componentName })
            }
          />
          <TextareaField
            label="data (JSON)"
            value={JSON.stringify(tool.props.data, null, 2)}
            onChange={(value) => {
              try {
                updateProps({ ...tool.props, data: JSON.parse(value) });
              } catch {
                // Keep the last valid data object while the user is typing JSON.
              }
            }}
          />
        </PropsGroup>
      </div>
    );
  }

  return (
    <div className="x:rounded-md x:bg-neutral-50 x:p-3 x:text-xs x:text-neutral-500">
      This tool type has no inspector fields yet.
    </div>
  );
}
