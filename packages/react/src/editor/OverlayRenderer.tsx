import { useEffect, useRef, useState, type MouseEvent } from "react";
import { AlertDialog } from "../components/AlertDialog";
import {
  Button as RuntimeButton,
  type ButtonAction,
} from "../components/Button";
import { Dialog } from "../components/Dialog";
import { Drawer } from "../components/Drawer";
import { Root } from "../components/Root";
import { Toast } from "../components/Toast";
import { useOverlayRegistry } from "../components/OverlayRegistry";
import { cn } from "../ui/cn";
import type { OverlayNode } from "./types";

type OverlayRendererProps = {
  overlay: OverlayNode;
  selectedSlot?: string;
  interactive?: boolean;
  onSelectSlot?: (slot: string) => void;
};

type OverlayClassNames = Record<string, string | undefined>;

const EDITOR_POSITION_CLASS_NAMES: Record<
  OverlayNode["type"],
  OverlayClassNames
> = {
  dialog: {
    "dialog-portal": "x:absolute x:inset-0 x:scale-100",
    "dialog-backdrop": "x:!absolute",
    "dialog-viewport": "x:!absolute",
  },
  "alert-dialog": {
    "alert-dialog-portal": "x:absolute x:inset-0 x:scale-100",
    "alert-dialog-backdrop": "x:!absolute",
    "alert-dialog-viewport": "x:!absolute",
  },
  drawer: {
    drawer: "x:absolute x:inset-0",
    "drawer-backdrop": "x:!absolute",
    "drawer-viewport": "x:!absolute",
  },
  toast: {
    viewport: "x:!absolute",
    positioner: "x:!absolute",
  },
};

const SELECTED_SLOT_CLASS_NAME =
  "x:outline-none x:ring-2 x:ring-blue-500 x:ring-offset-2";

export function OverlayRenderer({
  overlay,
  selectedSlot,
  interactive = false,
  onSelectSlot,
}: OverlayRendererProps) {
  const selectSlot = (event: MouseEvent<HTMLDivElement>) => {
    if (interactive) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const element = target.closest<HTMLElement>("[data-slot]");
    const slot = element?.dataset.slot;
    if (!slot) return;

    event.preventDefault();
    event.stopPropagation();
    onSelectSlot?.(normalizeSlot(overlay.type, slot));
  };

  return (
    <div className="x:absolute x:inset-0 x:z-20" onClickCapture={selectSlot}>
      <RuntimeOverlayRenderer
        overlay={overlay}
        selectedSlot={interactive ? undefined : selectedSlot}
        interactive={interactive}
      />
    </div>
  );
}

function RuntimeOverlayRenderer({
  overlay,
  selectedSlot,
  interactive,
}: {
  overlay: OverlayNode;
  selectedSlot?: string;
  interactive: boolean;
}) {
  const [open, setOpen] = useState(true);
  const props = overlay.props;
  const classNames = getEditorClassNames(overlay, selectedSlot);
  const common = {
    id: overlay.id,
    title: optionalString(props.title),
    description: optionalString(props.description),
  };
  const reopen =
    interactive && overlay.type !== "toast" && !open ? (
      <RuntimeButton
        label={`Open ${overlay.name}`}
        className="x:absolute x:left-1/2 x:top-1/2 x:z-30 x:-translate-x-1/2 x:-translate-y-1/2 x:rounded-md x:bg-neutral-950 x:px-4 x:py-2 x:text-white"
        onClick={() => setOpen(true)}
      />
    ) : null;

  return (
    <Root id={`editor-preview-${overlay.id}`} className="x:absolute x:inset-0">
      {reopen}
      {overlay.type === "dialog" ? (
        <Dialog
          {...common}
          closeLabel={optionalString(props.closeLabel)}
          actionLabel={optionalString(props.actionLabel)}
          action={buttonAction(props.action)}
          modal={booleanValue(props.modal, true)}
          dismissOnOutsidePress={booleanValue(
            props.dismissOnOutsidePress,
            true,
          )}
          open={open}
          onOpenChange={interactive ? setOpen : undefined}
          classNames={classNames}
        />
      ) : overlay.type === "alert-dialog" ? (
        <AlertDialog
          {...common}
          cancelLabel={optionalString(props.cancelLabel)}
          confirmLabel={optionalString(props.confirmLabel)}
          confirmAction={buttonAction(props.confirmAction)}
          tone={props.tone === "danger" ? "danger" : "default"}
          initialFocus={
            props.initialFocus === "confirm" || props.initialFocus === "cancel"
              ? props.initialFocus
              : "first"
          }
          open={open}
          onOpenChange={interactive ? setOpen : undefined}
          classNames={classNames}
        />
      ) : overlay.type === "drawer" ? (
        <Drawer
          {...common}
          closeLabel={optionalString(props.closeLabel)}
          actionLabel={optionalString(props.actionLabel)}
          action={buttonAction(props.action)}
          side={
            props.side === "top" ||
            props.side === "bottom" ||
            props.side === "left"
              ? props.side
              : "right"
          }
          modal={booleanValue(props.modal, true)}
          dismissOnOutsidePress={booleanValue(
            props.dismissOnOutsidePress,
            true,
          )}
          open={open}
          onOpenChange={interactive ? setOpen : undefined}
          classNames={classNames}
        />
      ) : (
        <>
          <Toast
            {...common}
            tone={
              props.tone === "success" ||
              props.tone === "warning" ||
              props.tone === "danger"
                ? props.tone
                : "default"
            }
            timeout={
              interactive && typeof props.timeout === "number"
                ? props.timeout
                : 0
            }
            actionLabel={optionalString(props.actionLabel)}
            action={buttonAction(props.action)}
            closeLabel={optionalString(props.closeLabel)}
            placement={toastPlacement(props.placement)}
            classNames={classNames}
          />
          {interactive ? (
            <RuntimeButton
              label="Show toast"
              action={{ type: "overlay", targetId: overlay.id }}
              className="x:absolute x:left-1/2 x:top-1/2 x:z-30 x:-translate-x-1/2 x:-translate-y-1/2 x:rounded-md x:bg-neutral-950 x:px-4 x:py-2 x:text-white"
            />
          ) : (
            <OpenToastOnce overlayId={overlay.id} />
          )}
        </>
      )}
    </Root>
  );
}

function OpenToastOnce({ overlayId }: { overlayId: string }) {
  const registry = useOverlayRegistry();
  const openedRef = useRef(false);

  useEffect(() => {
    if (!registry || openedRef.current) return;
    openedRef.current = registry.triggerOverlay(overlayId);
  }, [overlayId, registry]);

  return null;
}

function getEditorClassNames(
  overlay: OverlayNode,
  selectedSlot?: string,
): OverlayClassNames {
  const classNames = stringRecord(overlay.props.classNames);
  const overrides = EDITOR_POSITION_CLASS_NAMES[overlay.type];
  const slots = new Set([
    ...Object.keys(classNames),
    ...Object.keys(overrides),
  ]);

  console.log(slots);
  if (selectedSlot) slots.add(selectedSlot);

  return Object.fromEntries(
    Array.from(slots, (slot) => [
      slot,
      cn(
        classNames[slot],
        overrides[slot],
        selectedSlot === slot ? SELECTED_SLOT_CLASS_NAME : undefined,
      ),
    ]),
  );
}

function stringRecord(value: unknown): OverlayClassNames {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function normalizeSlot(type: OverlayNode["type"], slot: string) {
  return type === "toast" && slot.startsWith("toast-")
    ? slot.slice("toast-".length)
    : slot;
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function buttonAction(value: unknown) {
  return value && typeof value === "object" && "type" in value
    ? (value as ButtonAction)
    : undefined;
}

function toastPlacement(value: unknown) {
  return value === "top-left" ||
    value === "top-center" ||
    value === "top-right" ||
    value === "bottom-left" ||
    value === "bottom-center"
    ? value
    : "bottom-right";
}
