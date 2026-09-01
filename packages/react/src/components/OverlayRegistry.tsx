import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import { Toast as BaseToast } from "@base-ui/react/toast";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { twMerge } from "tailwind-merge";
import { runLinkAction, type ButtonAction } from "./OverlayAction";

export type ToastPlacement =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type ToastTone = "default" | "success" | "warning" | "danger";

export interface OverlayToastClassNames {
  viewport?: string;
  positioner?: string;
  toast?: string;
  content?: string;
  title?: string;
  description?: string;
  action?: string;
  close?: string;
}

export interface OverlayToastTemplate {
  title?: string;
  description?: string;
  tone: ToastTone;
  timeout?: number;
  actionLabel?: string;
  action?: ButtonAction;
  closeLabel: string;
  placement: ToastPlacement;
  classNames?: OverlayToastClassNames;
}

type PersistentOverlayRegistration =
  | { type: "dialog"; handle: BaseDialog.Handle<unknown> }
  | { type: "alert-dialog"; handle: BaseAlertDialog.Handle<unknown> }
  | { type: "drawer"; handle: BaseDrawer.Handle<unknown> };

interface ToastData {
  targetId: string;
}

interface OverlayRegistryValue {
  portalContainer: HTMLElement | null;
  registerPersistent: (
    id: string,
    registration: PersistentOverlayRegistration,
  ) => () => void;
  registerToast: (id: string, template: OverlayToastTemplate) => () => void;
  triggerOverlay: (targetId: string) => boolean;
}

const OverlayRegistryContext = createContext<OverlayRegistryValue | null>(null);

const VIEWPORT_CLASS =
  "pointer-events-none fixed inset-0 z-50 overflow-hidden";
const POSITION_CLASS: Record<ToastPlacement, string> = {
  "top-left":
    "pointer-events-auto !fixed !top-4 !right-auto !bottom-auto !left-4 !transform-none",
  "top-center":
    "pointer-events-auto !fixed !top-4 !right-auto !bottom-auto !left-1/2 !-translate-x-1/2",
  "top-right":
    "pointer-events-auto !fixed !top-4 !right-4 !bottom-auto !left-auto !transform-none",
  "bottom-left":
    "pointer-events-auto !fixed !top-auto !right-auto !bottom-4 !left-4 !transform-none",
  "bottom-center":
    "pointer-events-auto !fixed !top-auto !right-auto !bottom-4 !left-1/2 !-translate-x-1/2",
  "bottom-right":
    "pointer-events-auto !fixed !top-auto !right-4 !bottom-4 !left-auto !transform-none",
};

function ToastViewport({
  templates,
}: {
  templates: Map<string, OverlayToastTemplate>;
}) {
  const manager = BaseToast.useToastManager<ToastData>();
  const registry = useOverlayRegistry();
  const firstTemplate = manager.toasts[0]?.data
    ? templates.get(manager.toasts[0].data.targetId)
    : undefined;

  return (
    <BaseToast.Portal container={registry?.portalContainer ?? undefined}>
      <BaseToast.Viewport
        data-slot="toast-viewport"
        className={twMerge(
          VIEWPORT_CLASS,
          firstTemplate?.classNames?.viewport,
        )}
      >
        {manager.toasts.map((toast) => {
          const template = toast.data
            ? templates.get(toast.data.targetId)
            : undefined;
          if (!template) return null;

          return (
            <BaseToast.Positioner
              key={toast.id}
              toast={toast}
              data-slot="toast-positioner"
              data-placement={template.placement}
              className={twMerge(
                POSITION_CLASS[template.placement],
                template.classNames?.positioner,
              )}
            >
              <BaseToast.Root
                toast={toast}
                data-slot="toast"
                data-tone={template.tone}
                className={twMerge(
                  "w-80 bg-white text-black shadow-lg",
                  template.classNames?.toast,
                )}
              >
                <BaseToast.Content
                  data-slot="toast-content"
                  className={template.classNames?.content}
                >
                  {template.title ? (
                    <BaseToast.Title
                      data-slot="toast-title"
                      className={template.classNames?.title}
                    />
                  ) : null}
                  {template.description ? (
                    <BaseToast.Description
                      data-slot="toast-description"
                      className={template.classNames?.description}
                    />
                  ) : null}
                  {template.actionLabel && template.action ? (
                    <BaseToast.Action
                      data-slot="toast-action"
                      className={template.classNames?.action}
                      onClick={() => {
                        if (template.action?.type === "link") {
                          runLinkAction(template.action);
                        } else if (template.action?.type === "overlay") {
                          registry?.triggerOverlay(template.action.targetId);
                        }
                        manager.close(toast.id);
                      }}
                    >
                      {template.actionLabel}
                    </BaseToast.Action>
                  ) : null}
                  <BaseToast.Close
                    data-slot="toast-close"
                    className={template.classNames?.close}
                  >
                    {template.closeLabel}
                  </BaseToast.Close>
                </BaseToast.Content>
              </BaseToast.Root>
            </BaseToast.Positioner>
          );
        })}
      </BaseToast.Viewport>
    </BaseToast.Portal>
  );
}

export function OverlayProvider({ children }: { children?: ReactNode }) {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [toastManager] = useState(() =>
    BaseToast.createToastManager<ToastData>(),
  );
  const [persistent] = useState(
    () => new Map<string, PersistentOverlayRegistration>(),
  );
  const [templates] = useState(
    () => new Map<string, OverlayToastTemplate>(),
  );

  const registerPersistent = useCallback(
    (id: string, registration: PersistentOverlayRegistration) => {
      if (import.meta.env.DEV && (persistent.has(id) || templates.has(id))) {
        console.warn(`Duplicate overlay id: ${id}`);
      }
      persistent.set(id, registration);
      return () => {
        if (persistent.get(id) === registration) persistent.delete(id);
      };
    },
    [persistent, templates],
  );

  const registerToast = useCallback(
    (id: string, template: OverlayToastTemplate) => {
      if (import.meta.env.DEV && (templates.has(id) || persistent.has(id))) {
        console.warn(`Duplicate overlay id: ${id}`);
      }
      templates.set(id, template);
      return () => {
        if (templates.get(id) === template) templates.delete(id);
      };
    },
    [persistent, templates],
  );

  const triggerOverlay = useCallback(
    (targetId: string) => {
      const overlay = persistent.get(targetId);
      if (overlay) {
        overlay.handle.open(null);
        return true;
      }

      const template = templates.get(targetId);
      if (!template) {
        if (import.meta.env.DEV) {
          console.warn(`Overlay target was not found: ${targetId}`);
        }
        return false;
      }
      toastManager.add({
        title: template.title,
        description: template.description,
        timeout: template.timeout,
        type: template.tone,
        data: { targetId },
      });
      return true;
    },
    [persistent, templates, toastManager],
  );

  const value = useMemo<OverlayRegistryValue>(
    () => ({
      portalContainer,
      registerPersistent,
      registerToast,
      triggerOverlay,
    }),
    [portalContainer, registerPersistent, registerToast, triggerOverlay],
  );

  return (
    <OverlayRegistryContext.Provider value={value}>
      <BaseDrawer.Provider>
        <BaseToast.Provider toastManager={toastManager}>
          {children}
          <ToastViewport templates={templates} />
          <div
            ref={setPortalContainer}
            data-slot="overlay-portal"
            className="contents"
          />
        </BaseToast.Provider>
      </BaseDrawer.Provider>
    </OverlayRegistryContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOverlayRegistry() {
  return useContext(OverlayRegistryContext);
}
