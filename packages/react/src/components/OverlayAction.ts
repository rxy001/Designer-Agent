export type ButtonAction =
  | { type: "link"; href: string; target?: string }
  | { type: "overlay"; targetId: string }
  | { type: "submit" }
  | { type: "none" };

export function runLinkAction(action: Extract<ButtonAction, { type: "link" }>) {
  if (typeof window === "undefined") return;

  if (action.target && action.target !== "_self") {
    window.open(action.href, action.target, "noopener,noreferrer");
    return;
  }

  window.location.assign(action.href);
}
