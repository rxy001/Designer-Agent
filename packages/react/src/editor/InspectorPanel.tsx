import type { ReactNode } from "react";
import { Input } from "../ui/Input";
import { Separator } from "../ui/Separator";
import { Select } from "../ui/Select";
import { Switch } from "../ui/Switch";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { findSection, findTool } from "./pageDocument";
import type { PageDocument, SectionNode, ToolNode, Viewport } from "./types";

type InspectorPanelProps = {
  page: PageDocument;
  selectedSectionId: string;
  selectedToolId?: string;
  viewport: Viewport;
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
    <label className="x:space-y-1 x:text-xs x:font-medium x:text-neutral-600">
      <span>{label}</span>
      <Input
        type="number"
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
  selectedSectionId,
  selectedToolId,
  viewport,
  onUpdateSection,
  onUpdateTool,
  onRemoveTool,
}: InspectorPanelProps) {
  const tool = findTool(page, selectedToolId);
  const section = findSection(page, selectedSectionId);

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
      {!tool ? (
        <SectionEditor
          section={section}
          viewport={viewport}
          onUpdateSection={onUpdateSection}
        />
      ) : (
        <div className="x:min-h-0 x:flex-1 x:space-y-5 x:overflow-auto x:p-4">
          <div className="x:flex x:items-center x:justify-between x:rounded-md x:border x:border-neutral-200 x:p-3">
            <span className="x:text-sm x:text-neutral-700">Locked</span>
            <Switch
              checked={Boolean(tool.locked)}
              onCheckedChange={(checked) =>
                onUpdateTool(tool.id, { locked: checked } as Partial<ToolNode>)
              }
            />
          </div>
          <div className="x:flex x:items-center x:justify-between x:rounded-md x:border x:border-neutral-200 x:p-3">
            <span className="x:text-sm x:text-neutral-700">Hidden</span>
            <Switch
              checked={Boolean(tool.hidden)}
              onCheckedChange={(checked) =>
                onUpdateTool(tool.id, { hidden: checked } as Partial<ToolNode>)
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
    </aside>
  );
}

function SectionEditor({
  section,
  viewport,
  onUpdateSection,
}: {
  section?: SectionNode;
  viewport: Viewport;
  onUpdateSection: (sectionId: string, changes: Partial<SectionNode>) => void;
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
            value={activeGrid.height ?? 720}
            onChange={(height) => updateGridValue("height", height)}
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
  const updateProps = (props: ToolNode["props"]) => {
    onUpdateTool(tool.id, { props } as Partial<ToolNode>);
  };

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
            label="href"
            value={tool.props.href}
            onChange={(href) => updateProps({ ...tool.props, href })}
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
                items: [...items, { label: "Nav item", href: "#" }],
              })
            }
          >
            Add item
          </Button>
        </PropsGroup>
        <PropsGroup title="Actions">
          {iconAction("primaryAction", "primaryAction")}
          {iconAction("secondaryAction", "secondaryAction")}
        </PropsGroup>
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
