import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import { useEffect, useState, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { Button } from "./Button";
import type { ButtonAction } from "./OverlayAction";
import { useOverlayRegistry } from "./OverlayRegistry";

const BACKDROP_CLASS = "fixed inset-0 z-50 bg-black/40";
const VIEWPORT_CLASS = "fixed inset-0 z-50 pointer-events-none";
const ACTIONS_CLASS = "flex items-center justify-end gap-2";
const SWIPE_DIRECTION: Record<DrawerSide, "up" | "right" | "down" | "left"> = {
  top: "up",
  right: "right",
  bottom: "down",
  left: "left",
};
const POPUP_CLASS: Record<DrawerSide, string> = {
  top: "pointer-events-auto absolute inset-x-0 top-0 max-h-full w-full bg-white text-black shadow-xl",
  right:
    "pointer-events-auto absolute inset-y-0 right-0 h-full w-96 max-w-full bg-white text-black shadow-xl",
  bottom:
    "pointer-events-auto absolute inset-x-0 bottom-0 max-h-full w-full bg-white text-black shadow-xl",
  left: "pointer-events-auto absolute inset-y-0 left-0 h-full w-96 max-w-full bg-white text-black shadow-xl",
};

export type DrawerSide = "top" | "right" | "bottom" | "left";

export interface DrawerClassNames {
  "drawer-portal"?: string;
  "drawer-backdrop"?: string;
  "drawer-viewport"?: string;
  "drawer-popup"?: string;
  "drawer-title"?: string;
  "drawer-description"?: string;
  "drawer-content"?: string;
  "drawer-actions"?: string;
  "drawer-close"?: string;
  "drawer-action"?: string;
}

export interface DrawerProps {
  id: string;
  title?: string;
  description?: string;
  closeLabel?: string;
  actionLabel?: string;
  action?: ButtonAction;
  side?: DrawerSide;
  modal?: boolean | "trap-focus";
  dismissOnOutsidePress?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  classNames?: DrawerClassNames;
}

export function Drawer({
  id,
  title,
  description,
  closeLabel = "Close",
  actionLabel,
  action,
  side = "right",
  modal = true,
  dismissOnOutsidePress = true,
  open,
  defaultOpen,
  onOpenChange,
  children,
  classNames,
}: DrawerProps) {
  const registry = useOverlayRegistry();
  const [handle] = useState(() => BaseDrawer.createHandle<unknown>());

  useEffect(() => {
    if (!registry) return;
    return registry.registerPersistent(id, { type: "drawer", handle });
  }, [handle, id, registry]);

  return (
    <BaseDrawer.Root
      handle={handle}
      modal={modal}
      swipeDirection={SWIPE_DIRECTION[side]}
      disablePointerDismissal={!dismissOnOutsidePress}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      <BaseDrawer.Portal
        container={registry?.portalContainer ?? undefined}
        data-slot="drawer-portal"
        className={classNames?.["drawer-portal"]}
      >
        <BaseDrawer.Backdrop
          data-slot="drawer-backdrop"
          className={twMerge(BACKDROP_CLASS, classNames?.["drawer-backdrop"])}
        />
        <BaseDrawer.Viewport
          data-slot="drawer-viewport"
          className={twMerge(VIEWPORT_CLASS, classNames?.["drawer-viewport"])}
        >
          <BaseDrawer.Popup
            data-slot="drawer-popup"
            data-side={side}
            className={twMerge(POPUP_CLASS[side], classNames?.["drawer-popup"])}
          >
            <BaseDrawer.Content
              data-slot="drawer-content"
              className={classNames?.["drawer-content"]}
            >
              {title ? (
                <BaseDrawer.Title
                  data-slot="drawer-title"
                  className={classNames?.["drawer-title"]}
                >
                  {title}
                </BaseDrawer.Title>
              ) : null}
              {description ? (
                <BaseDrawer.Description
                  data-slot="drawer-description"
                  className={classNames?.["drawer-description"]}
                >
                  {description}
                </BaseDrawer.Description>
              ) : null}
              {children}
              <div
                data-slot="drawer-actions"
                className={twMerge(
                  ACTIONS_CLASS,
                  classNames?.["drawer-actions"],
                )}
              >
                <BaseDrawer.Close
                  data-slot="drawer-close"
                  className={classNames?.["drawer-close"]}
                >
                  {closeLabel}
                </BaseDrawer.Close>
                {actionLabel && action ? (
                  <Button
                    label={actionLabel}
                    action={action}
                    dataSlot="drawer-action"
                    className={classNames?.["drawer-action"]}
                    onClick={() => handle.close()}
                  />
                ) : null}
              </div>
            </BaseDrawer.Content>
          </BaseDrawer.Popup>
        </BaseDrawer.Viewport>
      </BaseDrawer.Portal>
    </BaseDrawer.Root>
  );
}
