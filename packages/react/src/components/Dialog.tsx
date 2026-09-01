import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { useEffect, useState, type ReactNode } from "react";
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

export interface DialogClassNames {
  "dialog-portal"?: string;
  "dialog-backdrop"?: string;
  "dialog-viewport"?: string;
  "dialog-popup"?: string;
  "dialog-title"?: string;
  "dialog-description"?: string;
  "dialog-actions"?: string;
  "dialog-close"?: string;
  "dialog-action"?: string;
}

export interface DialogProps {
  id: string;
  title?: string;
  description?: string;
  closeLabel?: string;
  actionLabel?: string;
  action?: ButtonAction;
  modal?: boolean | "trap-focus";
  dismissOnOutsidePress?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  classNames?: DialogClassNames;
}

export function Dialog({
  id,
  title,
  description,
  closeLabel = "Close",
  actionLabel,
  action,
  modal = true,
  dismissOnOutsidePress = true,
  open,
  defaultOpen,
  onOpenChange,
  children,
  classNames,
}: DialogProps) {
  const registry = useOverlayRegistry();
  const [handle] = useState(() => BaseDialog.createHandle<unknown>());

  useEffect(() => {
    if (!registry) return;
    return registry.registerPersistent(id, { type: "dialog", handle });
  }, [handle, id, registry]);

  return (
    <BaseDialog.Root
      handle={handle}
      modal={modal}
      disablePointerDismissal={!dismissOnOutsidePress}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      <BaseDialog.Portal
        container={registry?.portalContainer ?? undefined}
        data-slot="dialog-portal"
        className={classNames?.["dialog-portal"]}
      >
        <BaseDialog.Backdrop
          data-slot="dialog-backdrop"
          className={twMerge(BACKDROP_CLASS, classNames?.["dialog-backdrop"])}
        />
        <BaseDialog.Viewport
          data-slot="dialog-viewport"
          className={twMerge(VIEWPORT_CLASS, classNames?.["dialog-viewport"])}
        >
          <BaseDialog.Popup
            data-slot="dialog-popup"
            className={twMerge(POPUP_CLASS, classNames?.["dialog-popup"])}
          >
            {title ? (
              <BaseDialog.Title
                data-slot="dialog-title"
                className={classNames?.["dialog-title"]}
              >
                {title}
              </BaseDialog.Title>
            ) : null}
            {description ? (
              <BaseDialog.Description
                data-slot="dialog-description"
                className={classNames?.["dialog-description"]}
              >
                {description}
              </BaseDialog.Description>
            ) : null}
            {children}
            <div
              data-slot="dialog-actions"
              className={twMerge(ACTIONS_CLASS, classNames?.["dialog-actions"])}
            >
              <BaseDialog.Close
                data-slot="dialog-close"
                className={classNames?.["dialog-close"]}
              >
                {closeLabel}
              </BaseDialog.Close>
              {actionLabel && action ? (
                <Button
                  label={actionLabel}
                  action={action}
                  dataSlot="dialog-action"
                  className={classNames?.["dialog-action"]}
                  onClick={() => handle.close()}
                />
              ) : null}
            </div>
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
