import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { Button } from "./Button";
import type { ButtonAction } from "./OverlayAction";
import { useOverlayRegistry } from "./OverlayRegistry";

const BACKDROP_CLASS = "fixed inset-0 z-50 bg-black/40";
const VIEWPORT_CLASS =
  "fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none";
const POPUP_CLASS =
  "pointer-events-auto max-h-full w-full max-w-lg overflow-auto bg-white text-black shadow-xl";
const ACTIONS_CLASS = "flex items-center justify-end gap-2";

export type AlertDialogTone = "default" | "danger";
export type AlertDialogInitialFocus = "cancel" | "confirm" | "first";

export interface AlertDialogClassNames {
  "alert-dialog-portal"?: string;
  "alert-dialog-backdrop"?: string;
  "alert-dialog-viewport"?: string;
  "alert-dialog-popup"?: string;
  "alert-dialog-title"?: string;
  "alert-dialog-description"?: string;
  "alert-dialog-actions"?: string;
  "alert-dialog-cancel"?: string;
  "alert-dialog-confirm"?: string;
}

export interface AlertDialogProps {
  id: string;
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmAction?: ButtonAction;
  tone?: AlertDialogTone;
  initialFocus?: AlertDialogInitialFocus;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  classNames?: AlertDialogClassNames;
}

export function AlertDialog({
  id,
  title,
  description,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  confirmAction,
  tone = "default",
  initialFocus = tone === "danger" ? "cancel" : "first",
  open,
  defaultOpen,
  onOpenChange,
  classNames,
}: AlertDialogProps) {
  const registry = useOverlayRegistry();
  const [handle] = useState(() => BaseAlertDialog.createHandle<unknown>());
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!registry) return;
    return registry.registerPersistent(id, { type: "alert-dialog", handle });
  }, [handle, id, registry]);

  const focusTarget =
    initialFocus === "cancel"
      ? cancelRef
      : initialFocus === "confirm"
        ? confirmRef
        : true;

  return (
    <BaseAlertDialog.Root
      handle={handle}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      <BaseAlertDialog.Portal
        data-slot="alert-dialog-portal"
        container={registry?.portalContainer ?? undefined}
        className={classNames?.["alert-dialog-portal"]}
      >
        <BaseAlertDialog.Backdrop
          data-slot="alert-dialog-backdrop"
          className={twMerge(
            BACKDROP_CLASS,
            classNames?.["alert-dialog-backdrop"],
          )}
        />
        <BaseAlertDialog.Viewport
          data-slot="alert-dialog-viewport"
          className={twMerge(
            VIEWPORT_CLASS,
            classNames?.["alert-dialog-viewport"],
          )}
        >
          <BaseAlertDialog.Popup
            data-slot="alert-dialog-popup"
            data-tone={tone}
            initialFocus={focusTarget}
            className={twMerge(POPUP_CLASS, classNames?.["alert-dialog-popup"])}
          >
            {title ? (
              <BaseAlertDialog.Title
                data-slot="alert-dialog-title"
                className={classNames?.["alert-dialog-title"]}
              >
                {title}
              </BaseAlertDialog.Title>
            ) : null}
            {description ? (
              <BaseAlertDialog.Description
                data-slot="alert-dialog-description"
                className={classNames?.["alert-dialog-description"]}
              >
                {description}
              </BaseAlertDialog.Description>
            ) : null}
            <div
              data-slot="alert-dialog-actions"
              className={twMerge(
                ACTIONS_CLASS,
                classNames?.["alert-dialog-actions"],
              )}
            >
              <BaseAlertDialog.Close
                ref={cancelRef}
                data-slot="alert-dialog-cancel"
                className={classNames?.["alert-dialog-cancel"]}
              >
                {cancelLabel}
              </BaseAlertDialog.Close>
              <Button
                ref={confirmRef}
                label={confirmLabel}
                action={confirmAction}
                dataSlot="alert-dialog-confirm"
                className={classNames?.["alert-dialog-confirm"]}
                onClick={() => handle.close()}
              />
            </div>
          </BaseAlertDialog.Popup>
        </BaseAlertDialog.Viewport>
      </BaseAlertDialog.Portal>
    </BaseAlertDialog.Root>
  );
}
