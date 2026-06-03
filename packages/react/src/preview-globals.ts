import React from "react";
import { createRoot } from "react-dom/client";
import * as Components from "./components";

export const previewWindowGlobals = {
  React,
  ReactDOM: { createRoot },
  DesignSystem: Components,
  ...Components,
};

export type PreviewWindowGlobals = typeof previewWindowGlobals;

export function installPreviewWindowGlobals(targetWindow: Window = window) {
  targetWindow.__previewWindowGlobals = previewWindowGlobals;
  Object.assign(targetWindow, previewWindowGlobals);

  const PreviewReadyEvent = (targetWindow as Window & typeof globalThis)
    .CustomEvent;

  targetWindow.dispatchEvent(
    new PreviewReadyEvent("design-system-ready", {
      detail: previewWindowGlobals,
    }),
  );
}

declare global {
  interface Window {
    Button: typeof Components.Button;
    DesignSystem: typeof Components;
    __previewWindowGlobals: PreviewWindowGlobals;
    React: typeof React;
    ReactDOM: {
      createRoot: typeof createRoot;
    };
    Text: typeof Components.Text;
  }
}
