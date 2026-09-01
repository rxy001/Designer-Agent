import { useEffect, useMemo } from "react";
import type { ButtonAction } from "./OverlayAction";
import {
  useOverlayRegistry,
  type OverlayToastTemplate,
  type OverlayToastClassNames,
  type ToastPlacement,
  type ToastTone,
} from "./OverlayRegistry";

export type ToastClassNames = OverlayToastClassNames;

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  tone?: ToastTone;
  timeout?: number;
  actionLabel?: string;
  action?: ButtonAction;
  closeLabel?: string;
  placement?: ToastPlacement;
  classNames?: ToastClassNames;
}

export function Toast({
  id,
  title,
  description,
  tone = "default",
  timeout = 5000,
  actionLabel,
  action,
  closeLabel = "Dismiss",
  placement = "bottom-right",
  classNames,
}: ToastProps) {
  const registry = useOverlayRegistry();
  const template = useMemo<OverlayToastTemplate>(
    () => ({
      title,
      description,
      tone,
      timeout,
      actionLabel,
      action,
      closeLabel,
      placement,
      classNames,
    }),
    [
      action,
      actionLabel,
      classNames,
      closeLabel,
      description,
      placement,
      timeout,
      title,
      tone,
    ],
  );

  useEffect(() => {
    if (!registry) return;
    return registry.registerToast(id, template);
  }, [id, registry, template]);

  return null;
}

export type { ToastPlacement, ToastTone } from "./OverlayRegistry";
