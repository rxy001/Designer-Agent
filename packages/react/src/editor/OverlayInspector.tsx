import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Switch } from "../ui/Switch";
import { Textarea } from "../ui/Textarea";
import { findOverlayTriggers } from "./pageDocument";
import type { OverlayNode, PageDocument, ToolNode } from "./types";

type OverlayInspectorProps = {
  page: PageDocument;
  overlay: OverlayNode;
  onUpdate: (overlayId: string, changes: Partial<OverlayNode>) => void;
  onRemove: (overlayId: string) => ToolNode[];
  onDuplicate: (overlayId: string) => void;
  onSelectTool: (toolId: string) => void;
};

function stringValue(props: Record<string, unknown>, key: string) {
  return typeof props[key] === "string" ? props[key] : "";
}

export function OverlayInspector({
  page,
  overlay,
  onUpdate,
  onRemove,
  onDuplicate,
  onSelectTool,
}: OverlayInspectorProps) {
  const props = overlay.props;
  const triggers = findOverlayTriggers(page, overlay.id);
  const updateProps = (changes: Record<string, unknown>) =>
    onUpdate(overlay.id, { props: { ...props, ...changes } });

  return (
    <div className="x:min-h-0 x:flex-1 x:space-y-5 x:overflow-auto x:p-4">
      <Field label="Overlay name" value={overlay.name} onChange={(name) => onUpdate(overlay.id, { name })} />
      <Field label="Title" value={stringValue(props, "title")} onChange={(title) => updateProps({ title })} />
      <TextareaField label="Description" value={stringValue(props, "description")} onChange={(description) => updateProps({ description })} />
      {overlay.type === "alert-dialog" ? (
        <>
          <Field label="Cancel label" value={stringValue(props, "cancelLabel")} onChange={(cancelLabel) => updateProps({ cancelLabel })} />
          <Field label="Confirm label" value={stringValue(props, "confirmLabel")} onChange={(confirmLabel) => updateProps({ confirmLabel })} />
          <SelectField label="Tone" value={stringValue(props, "tone") || "default"} values={["default", "danger"]} onChange={(tone) => updateProps({ tone })} />
          <ActionField label="Confirm URL" action={props.confirmAction} onChange={(confirmAction) => updateProps({ confirmAction })} />
        </>
      ) : (
        <>
          <Field label="Close label" value={stringValue(props, "closeLabel")} onChange={(closeLabel) => updateProps({ closeLabel })} />
          <Field label="Action label" value={stringValue(props, "actionLabel")} onChange={(actionLabel) => updateProps({ actionLabel })} />
          <ActionField label="Action URL" action={props.action} onChange={(action) => updateProps({ action })} />
        </>
      )}
      {overlay.type === "toast" ? (
        <>
          <SelectField label="Tone" value={stringValue(props, "tone") || "default"} values={["default", "success", "warning", "danger"]} onChange={(tone) => updateProps({ tone })} />
          <SelectField label="Placement" value={stringValue(props, "placement") || "bottom-right"} values={["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"]} onChange={(placement) => updateProps({ placement })} />
          <label className="x:space-y-1 x:text-xs x:font-medium x:text-neutral-600">
            <span>Timeout (ms)</span>
            <Input type="number" min={0} value={typeof props.timeout === "number" ? props.timeout : 5000} onChange={(event) => updateProps({ timeout: Math.max(0, Number(event.target.value)) })} />
          </label>
        </>
      ) : null}
      {overlay.type === "drawer" ? (
        <SelectField label="Side" value={stringValue(props, "side") || "right"} values={["top", "right", "bottom", "left"]} onChange={(side) => updateProps({ side })} />
      ) : null}
      {overlay.type === "dialog" || overlay.type === "drawer" ? (
        <>
          <BooleanField label="Modal" checked={props.modal !== false} onChange={(modal) => updateProps({ modal })} />
          <BooleanField label="Dismiss on outside press" checked={props.dismissOnOutsidePress !== false} onChange={(dismissOnOutsidePress) => updateProps({ dismissOnOutsidePress })} />
        </>
      ) : null}
      <ClassNamesFields
        type={overlay.type}
        value={props.classNames}
        onChange={(classNames) => updateProps({ classNames })}
      />
      <div className="x:border-t x:border-neutral-200 x:pt-4">
        <div className="x:text-xs x:font-semibold x:uppercase x:text-neutral-500">Triggers</div>
        {triggers.length === 0 ? (
          <p className="x:mt-2 x:rounded-md x:bg-amber-50 x:p-3 x:text-xs x:text-amber-800">This overlay is not bound to a Button.</p>
        ) : (
          <div className="x:mt-2 x:space-y-1">
            {triggers.map((tool) => (
              <button key={tool.id} type="button" className="x:w-full x:rounded-md x:bg-neutral-50 x:px-3 x:py-2 x:text-left x:text-xs x:hover:bg-neutral-100" onClick={() => onSelectTool(tool.id)}>
                {tool.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="x:grid x:grid-cols-2 x:gap-2 x:border-t x:border-neutral-200 x:pt-4">
        <Button variant="outline" onClick={() => onDuplicate(overlay.id)}>Duplicate</Button>
        <Button
          variant="danger"
          onClick={() => {
            const message = triggers.length === 0
              ? `Delete ${overlay.name}?`
              : `Delete ${overlay.name}? This will clear ${triggers.length} Button binding(s): ${triggers.map((tool) => tool.name).join(", ")}.`;
            if (window.confirm(message)) onRemove(overlay.id);
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

const CLASS_NAME_SLOTS: Record<OverlayNode["type"], string[]> = {
  dialog: ["dialog", "dialog-backdrop", "dialog-viewport", "dialog-popup", "dialog-title", "dialog-description", "dialog-actions", "dialog-close", "dialog-action"],
  "alert-dialog": ["alert-dialog-backdrop", "alert-dialog-viewport", "alert-dialog-popup", "alert-dialog-title", "alert-dialog-description", "alert-dialog-actions", "alert-dialog-cancel", "alert-dialog-confirm"],
  toast: ["viewport", "positioner", "toast", "content", "title", "description", "action", "close"],
  drawer: ["drawer", "drawer-backdrop", "drawer-viewport", "drawer-popup", "drawer-title", "drawer-description", "drawer-content", "drawer-actions", "drawer-close", "drawer-action"],
};

function ActionField({ label, action, onChange }: { label: string; action: unknown; onChange: (action: { type: "link"; href: string } | { type: "none" }) => void }) {
  const href = action && typeof action === "object" && "type" in action && action.type === "link" && "href" in action && typeof action.href === "string" ? action.href : "";
  return <Field label={label} value={href} onChange={(value) => onChange(value ? { type: "link", href: value } : { type: "none" })} />;
}

function ClassNamesFields({ type, value, onChange }: { type: OverlayNode["type"]; value: unknown; onChange: (value: Record<string, string>) => void }) {
  const classNames = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return (
    <div className="x:space-y-3 x:border-t x:border-neutral-200 x:pt-4">
      <div className="x:text-xs x:font-semibold x:uppercase x:text-neutral-500">Class names</div>
      {CLASS_NAME_SLOTS[type].map((slot) => (
        <TextareaField key={slot} label={slot} value={typeof classNames[slot] === "string" ? classNames[slot] : ""} onChange={(nextValue) => onChange({ ...Object.fromEntries(Object.entries(classNames).filter((entry): entry is [string, string] => typeof entry[1] === "string")), [slot]: nextValue })} />
      ))}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="x:block x:space-y-1 x:text-xs x:font-medium x:text-neutral-600"><span>{label}</span><Input value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="x:block x:space-y-1 x:text-xs x:font-medium x:text-neutral-600"><span>{label}</span><Textarea value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SelectField({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <label className="x:block x:space-y-1 x:text-xs x:font-medium x:text-neutral-600"><span>{label}</span><Select value={value} onChange={(event) => onChange(event.target.value)}>{values.map((item) => <option key={item} value={item}>{item}</option>)}</Select></label>;
}

function BooleanField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="x:flex x:items-center x:justify-between x:rounded-md x:border x:border-neutral-200 x:p-3"><span className="x:text-sm x:text-neutral-700">{label}</span><Switch checked={checked} onCheckedChange={onChange} /></div>;
}
